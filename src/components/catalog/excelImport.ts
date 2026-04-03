import * as XLSX from 'xlsx'
import type { BasicTabId, TabId } from './types'

export type ImportSeverity = 'error' | 'warning'

export type ImportIssue = {
  field: string
  message: string
  severity: ImportSeverity
}

export type ParsedImportRow = {
  rowNumber: number
  values: Record<string, string>
  issues: ImportIssue[]
}

export type ParsedImportResult = {
  headers: string[]
  rows: ParsedImportRow[]
}

const TAB_HEADERS: Record<TabId, string[]> = {
  materials: ['ma nvl', 'inci name', 'ten nguyen lieu', 'phan loai', 'don vi', 'don vi dat hang', 'trang thai'],
  classifications: ['ma', 'ten', 'ghi chu', 'trang thai'],
  locations: ['ma', 'ten', 'ghi chu', 'trang thai'],
  suppliers: ['ma', 'ten', 'sdt', 'lien he', 'dia chi', 'ghi chu', 'trang thai'],
  customers: ['ma', 'ten', 'sdt', 'email', 'dia chi', 'ghi chu', 'trang thai'],
  units: ['ma', 'ten', 'ghi chu', 'parent unit id', 'ty le quy doi', 'dv mua hang', 'hien thi mac dinh', 'trang thai'],
}

const HEADER_SYNONYMS: Record<string, string[]> = {
  'ma nvl': ['mã nvl', 'ma nguyen lieu', 'mã nguyên liệu', 'code'],
  'inci name': ['inci', 'inci_name'],
  'ten nguyen lieu': ['ten', 'tên nguyên liệu', 'material name'],
  'phan loai': ['phanloai', 'classification', 'category'],
  'don vi': ['đơn vị', 'don vi tinh', 'unit'],
  'don vi dat hang': ['don vi order', 'order unit', 'purchase unit', 'don vi tinh tien'],
  'trang thai': ['status'],
  ma: ['mã', 'code'],
  ten: ['tên', 'name'],
  'ghi chu': ['ghi chú', 'note', 'notes', 'mo ta'],
  sdt: ['sdt', 'sđt', 'so dien thoai', 'số điện thoại', 'phone', 'dien thoai'],
  'lien he': ['thong tin lien he', 'liên hệ', 'contact'],
  'dia chi': ['địa chỉ', 'address'],
  email: ['e-mail'],
  'parent unit id': ['parent id', 'don vi cha'],
  'ty le quy doi': ['hệ số quy đổi', 'conversion', 'conversion to base'],
  'dv mua hang': ['dvmuahang', 'is purchase unit'],
  'hien thi mac dinh': ['default display', 'is default display'],
}

function normalizeText(input: unknown): string {
  return String(input ?? '')
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeCellValue(input: unknown): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'number') return Number.isFinite(input) ? String(input) : ''
  if (typeof input === 'boolean') return input ? '1' : '0'
  return String(input).trim()
}

function getWorksheetCellText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return ''

  // Prefer the formatted text that Excel shows to preserve phone numbers and padded values.
  if (typeof cell.w === 'string' && cell.w.trim()) {
    return cell.w.trim()
  }

  return normalizeCellValue(cell.v)
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

function isTruthyFlag(raw: string): boolean {
  const normalized = normalizeText(raw)
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'co' || normalized === 'x'
}

function normalizeStatus(raw: string): string {
  const normalized = normalizeText(raw)
  if (!normalized) return 'Active'
  if (['active', '1', 'true', 'on', 'enable'].includes(normalized)) return 'Active'
  if (['inactive', '0', 'false', 'off', 'disable'].includes(normalized)) return 'Inactive'
  return raw
}

function mapHeader(rawHeader: string, expectedHeaders: string[]): string | null {
  const normalized = normalizeText(rawHeader)
  if (!normalized) return null

  for (const key of expectedHeaders) {
    if (normalized === key) return key
    const synonyms = HEADER_SYNONYMS[key] ?? []
    if (synonyms.some((item) => normalizeText(item) === normalized)) return key
  }
  return null
}

function requiredForTab(tab: TabId): string[] {
  if (tab === 'materials') return ['inci name', 'ten nguyen lieu', 'phan loai', 'don vi']
  if (tab === 'suppliers') return ['ma', 'ten']
  if (tab === 'customers') return ['ten']
  if (tab === 'units') return ['ma', 'ten']
  return ['ma', 'ten']
}

function validateBasicTabRow(tab: BasicTabId, values: Record<string, string>, issues: ImportIssue[]) {
  if (tab !== 'units') return

  const conversion = values['ty le quy doi']
  if (conversion) {
    const parsed = Number(conversion)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      issues.push({ field: 'ty le quy doi', message: 'Tỷ lệ quy đổi phải là số > 0.', severity: 'error' })
    }
  }
}

function buildRowValues(
  rawRow: unknown[],
  headerIndexMap: Map<number, string>,
  expectedHeaders: string[],
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const key of expectedHeaders) values[key] = ''

  headerIndexMap.forEach((headerKey, index) => {
    values[headerKey] = normalizeCellValue(rawRow[index])
  })

  if ('trang thai' in values) values['trang thai'] = normalizeStatus(values['trang thai'])
  if ('dv mua hang' in values) values['dv mua hang'] = isTruthyFlag(values['dv mua hang']) ? '1' : '0'
  if ('hien thi mac dinh' in values) values['hien thi mac dinh'] = isTruthyFlag(values['hien thi mac dinh']) ? '1' : '0'

  return values
}

export async function parseCatalogExcel(file: File, tab: TabId): Promise<ParsedImportResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('File Excel không có sheet dữ liệu.')

  const worksheet = workbook.Sheets[firstSheet]
  const rows = readWorksheetRows(worksheet)

  if (rows.length < 2) throw new Error('File cần có tối thiểu 1 dòng header và 1 dòng dữ liệu.')

  const expectedHeaders = TAB_HEADERS[tab]
  const rawHeader = rows[0].map((cell) => normalizeCellValue(cell))

  const headerIndexMap = new Map<number, string>()
  rawHeader.forEach((header, index) => {
    const mapped = mapHeader(header, expectedHeaders)
    if (mapped) headerIndexMap.set(index, mapped)
  })

  const rowsResult: ParsedImportRow[] = []
  const requiredFields = requiredForTab(tab)

  for (let i = 1; i < rows.length; i += 1) {
    const rawRow = rows[i]

    const values = buildRowValues(rawRow, headerIndexMap, expectedHeaders)
    const issues: ImportIssue[] = []

    const hasContent = Object.values(values).some((value) => value.trim().length > 0)
    if (!hasContent) continue

    for (const field of requiredFields) {
      if (!values[field]?.trim()) {
        issues.push({ field, message: `Thiếu dữ liệu bắt buộc ở cột ${field}.`, severity: 'error' })
      }
    }

    if (tab !== 'materials') {
      validateBasicTabRow(tab as BasicTabId, values, issues)
    }

    rowsResult.push({
      rowNumber: i + 1,
      values,
      issues,
    })
  }

  return {
    headers: expectedHeaders,
    rows: rowsResult,
  }
}
