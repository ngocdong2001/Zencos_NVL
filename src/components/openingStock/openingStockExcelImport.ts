import * as XLSX from 'xlsx'

export type ImportDocType = 'MSDS' | 'COA' | 'Invoice' | 'Other'

export type OpeningStockImportRow = {
  rowNumber: number
  code: string
  excelTradeName: string
  excelInciName: string
  excelPriceUnit: string
  lookupTradeName?: string
  lookupInciName?: string
  lot: string
  openingDate: string
  invoiceNo: string
  invoiceDate: string
  supplierText: string
  importedQuantity: number
  resolvedSupplierCode?: string
  resolvedSupplierName?: string
  convertedQuantityBase?: number
  quantityBase: number
  unitPriceValue: number
  lookupUnitPriceUnitId?: string
  lookupUnitPriceUnitCode?: string
  lookupUnitPriceConversionToBase?: number
  calculatedLineAmount?: number
  expiryDate: string
  manufactureDate: string
  docsByType: Record<ImportDocType, string[]>
  hasAnyDocument?: boolean
  warnings: string[]
}

export type OpeningStockImportParseResult = {
  headers: string[]
  rows: OpeningStockImportRow[]
}

const EXPECTED_HEADERS = [
  'ma nvl',
  'ten thuong mai',
  'ten inci',
  'so lo',
  'ngay td',
  'so hoa don',
  'ngay hoa don',
  'nha cung cap',
  'sl (gr/ml)',
  'don gia',
  'don vi sl',
  'don vi gia',
  'thanh tien',
  'han sd',
  'ngay sx',
  'chung tu',
  'file msds',
  'file coa',
  'file hoa don',
  'file khac',
] as const

type ExpectedHeader = (typeof EXPECTED_HEADERS)[number]

const HEADER_SYNONYMS: Record<ExpectedHeader, string[]> = {
  'ma nvl': ['mã nvl', 'ma nguyen lieu', 'mã nguyên liệu', 'code'],
  'ten thuong mai': ['tên thương mại', 'trade name', 'ten hang', 'ten nguyen lieu', 'tên nguyên liệu'],
  'ten inci': ['tên inci', 'inci name', 'inci'],
  'so lo': ['số lô', 'lot', 'lot no', 'lot_no'],
  'ngay td': ['ngày td', 'ngay ton dau', 'ngay ton dau ky', 'opening date'],
  'so hoa don': ['số hóa đơn', 'invoice no', 'invoice number'],
  'ngay hoa don': ['ngày hóa đơn', 'invoice date'],
  'nha cung cap': ['nhà cung cấp', 'supplier', 'supplier code', 'supplier name', 'ten ncc', 'tên ncc', 'ncc'],
  'sl (gr/ml)': ['sl', 'so luong', 'số lượng', 'quantity', 'quantity base', 'ton dau ky (gr)', 'tồn đầu kỳ (gr)', 'ton dau ky', 'sl ton dau'],
  'don gia': ['đơn giá', 'don gia/kg', 'unit price', 'unit_price'],
  'don vi sl': ['đơn vị sl', 'don vi sl', 'don vi ton dau', 'đơn vị tồn đầu', 'unit of qty', 'don vi luong'],
  'don vi gia': ['đơn vị giá', 'don vi don gia', 'price unit', 'dv don gia', 'đv đơn giá'],
  'thanh tien': ['thành tiền', 'line amount', 'amount', 'gia tri ton', 'giá trị tồn'],
  'han sd': ['hạn sd', 'expiry', 'expiry date', 'hsd', 'han su dung'],
  'ngay sx': ['ngày sx', 'manufacture date', 'mfg date', 'nsx'],
  'chung tu': ['chứng từ', 'chung tu dinh kem', 'tai lieu', 'document'],
  'file msds': ['msds', 'msds file', 'ten file msds'],
  'file coa': ['coa', 'coa file', 'ten file coa'],
  'file hoa don': ['hoa don file', 'invoice file', 'file invoice', 'ten file hoa don', 'hoa don dinh kem', 'hóa đơn đính kèm'],
  'file khac': ['khac', 'other file', 'file other', 'ten file khac'],
}

function normalizeText(input: unknown): string {
  return String(input ?? '')
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getWorksheetCellText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return ''
  if (typeof cell.w === 'string' && cell.w.trim()) return cell.w.trim()
  if (cell.v === null || cell.v === undefined) return ''
  if (typeof cell.v === 'number') return Number.isFinite(cell.v) ? String(cell.v) : ''
  if (typeof cell.v === 'boolean') return cell.v ? '1' : '0'
  return String(cell.v).trim()
}

function readWorksheetRows(worksheet: XLSX.WorkSheet): string[][] {
  const ref = worksheet['!ref']
  if (!ref) return []

  const range = XLSX.utils.decode_range(ref)
  const rows: string[][] = []

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: string[] = []
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
      row.push(getWorksheetCellText(worksheet[address]))
    }
    rows.push(row)
  }

  return rows
}

function mapHeader(rawHeader: string): ExpectedHeader | null {
  const normalized = normalizeText(rawHeader)
  if (!normalized) return null

  for (const header of EXPECTED_HEADERS) {
    if (normalized === header) return header
    const synonyms = HEADER_SYNONYMS[header] ?? []
    if (synonyms.some((item) => normalizeText(item) === normalized)) return header
  }

  return null
}

function parseNumber(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}

function toIsoDate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      const date = new Date(Date.UTC(year, month - 1, day))
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    }
  }

  const parsedByDate = new Date(trimmed)
  if (!Number.isNaN(parsedByDate.getTime())) {
    return new Date(Date.UTC(
      parsedByDate.getFullYear(),
      parsedByDate.getMonth(),
      parsedByDate.getDate(),
    )).toISOString().slice(0, 10)
  }

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && numeric > 59) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const millis = numeric * 24 * 60 * 60 * 1000
    const parsedExcelDate = new Date(excelEpoch.getTime() + millis)
    if (!Number.isNaN(parsedExcelDate.getTime())) return parsedExcelDate.toISOString().slice(0, 10)
  }

  return ''
}

function splitFileNames(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(/[;,\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseTypedDocEntries(raw: string): Record<ImportDocType, string[]> {
  const result: Record<ImportDocType, string[]> = {
    MSDS: [],
    COA: [],
    Invoice: [],
    Other: [],
  }

  const entries = splitFileNames(raw)
  for (const entry of entries) {
    const parts = entry.split(':')
    if (parts.length >= 2) {
      const rawType = normalizeText(parts[0])
      const fileName = parts.slice(1).join(':').trim()
      if (!fileName) continue

      if (rawType === 'msds') {
        result.MSDS.push(fileName)
        continue
      }
      if (rawType === 'coa') {
        result.COA.push(fileName)
        continue
      }
      if (rawType === 'invoice' || rawType === 'hoa don') {
        result.Invoice.push(fileName)
        continue
      }
      result.Other.push(fileName)
      continue
    }

    result.Other.push(entry)
  }

  return result
}

function getValue(rawRow: string[], headerMap: Map<number, ExpectedHeader>, target: ExpectedHeader): string {
  for (const [index, header] of headerMap.entries()) {
    if (header === target) return String(rawRow[index] ?? '').trim()
  }
  return ''
}

export async function parseOpeningStockExcel(file: File): Promise<OpeningStockImportParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('File Excel không có sheet dữ liệu.')

  const worksheet = workbook.Sheets[firstSheet]
  const rows = readWorksheetRows(worksheet)
  if (rows.length < 2) throw new Error('File cần có tối thiểu 1 dòng header và 1 dòng dữ liệu.')

  const rawHeaders = rows[0].map((cell) => String(cell ?? '').trim())
  const headerMap = new Map<number, ExpectedHeader>()
  rawHeaders.forEach((header, index) => {
    const mapped = mapHeader(header)
    if (mapped) headerMap.set(index, mapped)
  })

  if (![...headerMap.values()].includes('ma nvl')) {
    throw new Error('Thiếu cột bắt buộc: MÃ NVL.')
  }
  if (![...headerMap.values()].includes('sl (gr/ml)')) {
    throw new Error('Thiếu cột bắt buộc: SL (gr/ml).')
  }
  if (![...headerMap.values()].includes('don gia')) {
    throw new Error('Thiếu cột bắt buộc: ĐƠN GIÁ.')
  }

  const parsedRows: OpeningStockImportRow[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (let i = 1; i < rows.length; i += 1) {
    const rawRow = rows[i]
    const rowNumber = i + 1

    const code = getValue(rawRow, headerMap, 'ma nvl').trim().toUpperCase()
    const excelTradeName = getValue(rawRow, headerMap, 'ten thuong mai')
    const excelInciName = getValue(rawRow, headerMap, 'ten inci')
    const excelPriceUnit = getValue(rawRow, headerMap, 'don vi gia').trim()
    const lot = getValue(rawRow, headerMap, 'so lo')
    const openingDate = toIsoDate(getValue(rawRow, headerMap, 'ngay td')) || today
    const invoiceNo = getValue(rawRow, headerMap, 'so hoa don')
    const invoiceDate = toIsoDate(getValue(rawRow, headerMap, 'ngay hoa don'))
    const supplierText = getValue(rawRow, headerMap, 'nha cung cap')
    const quantityRaw = getValue(rawRow, headerMap, 'sl (gr/ml)')
    const unitPriceRaw = getValue(rawRow, headerMap, 'don gia')
    const expiryDate = toIsoDate(getValue(rawRow, headerMap, 'han sd'))
    const manufactureDate = toIsoDate(getValue(rawRow, headerMap, 'ngay sx'))

    const hasAnyContent = [
      code,
      lot,
      invoiceNo,
      supplierText,
      quantityRaw,
      unitPriceRaw,
      expiryDate,
      manufactureDate,
      getValue(rawRow, headerMap, 'file msds'),
      getValue(rawRow, headerMap, 'file coa'),
      getValue(rawRow, headerMap, 'file hoa don'),
      getValue(rawRow, headerMap, 'file khac'),
      getValue(rawRow, headerMap, 'chung tu'),
    ].some((value) => value.trim().length > 0)

    if (!hasAnyContent) continue

    const quantityBase = parseNumber(quantityRaw)
    const unitPriceValue = parseNumber(unitPriceRaw)

    const warnings: string[] = []
    if (!code) warnings.push('Thiếu Mã NVL.')
    if (!Number.isFinite(quantityBase) || quantityBase < 0) warnings.push('SL (gr/ml) không hợp lệ (phải >= 0).')
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) warnings.push('Đơn giá không hợp lệ (phải >= 0).')

    const typedDocs = parseTypedDocEntries(getValue(rawRow, headerMap, 'chung tu'))

    parsedRows.push({
      rowNumber,
      code,
      excelTradeName,
      excelInciName,
      excelPriceUnit,
      lot,
      openingDate,
      invoiceNo,
      invoiceDate,
      supplierText,
      importedQuantity: Number.isFinite(quantityBase) ? quantityBase : 0,
      quantityBase: Number.isFinite(quantityBase) ? quantityBase : 0,
      unitPriceValue: Number.isFinite(unitPriceValue) ? unitPriceValue : 0,
      expiryDate,
      manufactureDate,
      docsByType: {
        MSDS: [...typedDocs.MSDS, ...splitFileNames(getValue(rawRow, headerMap, 'file msds'))],
        COA: [...typedDocs.COA, ...splitFileNames(getValue(rawRow, headerMap, 'file coa'))],
        Invoice: [...typedDocs.Invoice, ...splitFileNames(getValue(rawRow, headerMap, 'file hoa don'))],
        Other: [...typedDocs.Other, ...splitFileNames(getValue(rawRow, headerMap, 'file khac'))],
      },
      warnings,
    })
  }

  return {
    headers: rawHeaders,
    rows: parsedRows,
  }
}
