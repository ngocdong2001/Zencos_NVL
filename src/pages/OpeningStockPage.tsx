import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { AutoComplete } from 'primereact/autocomplete'
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { Calendar } from 'primereact/calendar'
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import type { ColumnEvent } from 'primereact/column'
import { Toast } from 'primereact/toast'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import { ProductCreateForm } from '../components/catalog/ProductCreateForm'
import { StockItemDocModal } from '../components/openingStock/StockItemDocModal'
import { StockItemDetailModal } from '../components/openingStock/StockItemDetailModal'
import { OpeningStockImportModal } from '../components/openingStock/OpeningStockImportModal'
import { parseOpeningStockExcel } from '../components/openingStock/openingStockExcelImport'
import type { ImportDocType } from '../components/openingStock/openingStockExcelImport'
import type { OpeningStockImportParseResult } from '../components/openingStock/openingStockExcelImport'
import { containsInsensitive, downloadTextFile } from '../components/catalog/utils'
import {
  createOpeningStockRow,
  deleteOpeningStockRow,
  fetchOpeningStockPriceUnits,
  fetchOpeningStockRows,
  updateOpeningStockRow,
} from '../lib/openingStockApi'
import type { OpeningStockRow } from '../lib/openingStockApi'
import { uploadItemDocument } from '../lib/openingStockDocApi'
import { fetchBasics, fetchMaterials } from '../lib/catalogApi'
import type { BasicRow, MaterialRow } from '../components/catalog/types'

type OutletContext = { search: string }

type SupplierOption = Pick<BasicRow, 'id' | 'code' | 'name'>

function SupplierEditorCell({
  initialId,
  supplierOptions,
  onConfirm,
}: {
  initialId: string
  supplierOptions: SupplierOption[]
  onConfirm: (id: string) => void
}) {
  const initialSupplier = supplierOptions.find((s) => s.id === initialId) ?? null
  const [value, setValue] = useState<SupplierOption | string>(initialSupplier ?? '')
  const [suggestions, setSuggestions] = useState<SupplierOption[]>([])

  const search = (e: AutoCompleteCompleteEvent) => {
    const q = e.query.toLowerCase()
    setSuggestions(
      supplierOptions
        .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .slice(0, 10),
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <AutoComplete
        value={value}
        suggestions={suggestions}
        completeMethod={search}
        field="name"
        itemTemplate={(s: SupplierOption) => `${s.code} - ${s.name}`}
        onChange={(e) => setValue(e.value)}
        onSelect={(e) => {
          const s = e.value as SupplierOption
          setValue(s)
          onConfirm(s.id)
        }}
        onClear={() => onConfirm('')}
        appendTo={document.body}
        placeholder="Tìm nhà cung cấp..."
        autoFocus
      />
    </div>
  )
}

const NEW_ROW_ID = '__new__'
const CATALOG_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type DraftRow = {
  code: string
  tradeName: string
  inciName: string
  lot: string
  openingDate: string
  invoiceNo: string
  invoiceDate: string
  supplierId: string
  quantityGram: string
  unitPriceValue: string
  unitPriceUnitId: string
  unitPriceUnitCode: string
  unitPriceConversionToBase: string
  expiryDate: string
  manufactureDate: string
}

const emptyDraft = (): DraftRow => ({
  code: '',
  tradeName: '',
  inciName: '',
  lot: '',
  openingDate: new Date().toISOString().slice(0, 10),
  invoiceNo: '',
  invoiceDate: '',
  supplierId: '',
  quantityGram: '',
  unitPriceValue: '',
  unitPriceUnitId: '',
  unitPriceUnitCode: '',
  unitPriceConversionToBase: '',
  expiryDate: '',
  manufactureDate: '',
})

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function roundAmountForDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(3))
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '---'
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeImportFileName(value: string): string {
  return value
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .normalize('NFKC')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .toLocaleLowerCase()
}

function hasPathSegment(value: string): boolean {
  return /[\\/]/.test(value)
}

function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatIsoDateFromDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDateCellValue(value: unknown): string {
  if (value == null) return ''

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return formatIsoDateFromDate(value)
  }

  const raw = String(value).trim()
  if (!raw) return ''

  const isoDate = parseIsoDate(raw)
  if (isoDate) return formatIsoDateFromDate(isoDate)

  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) {
    const candidate = `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    const parsed = parseIsoDate(candidate)
    if (parsed) return formatIsoDateFromDate(parsed)
  }

  return ''
}

export function OpeningStockPage() {
  const { search } = useOutletContext<OutletContext>()
  const location = useLocation()
  const [rows, setRows] = useState<OpeningStockRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [draft, setDraft] = useState<DraftRow>(emptyDraft)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success')
  const [loading, setLoading] = useState(false)
  const [materialSuggestions, setMaterialSuggestions] = useState<MaterialRow[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null)
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [supplierSuggestions, setSupplierSuggestions] = useState<SupplierOption[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null)
  const [loadingPriceUnits, setLoadingPriceUnits] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importParsing, setImportParsing] = useState(false)
  const [importParseError, setImportParseError] = useState<string | null>(null)
  const [selectedImportFileName, setSelectedImportFileName] = useState('')
  const [parsedImportResult, setParsedImportResult] = useState<OpeningStockImportParseResult | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [importAttachmentFiles, setImportAttachmentFiles] = useState<File[]>([])
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [docModalItem, setDocModalItem] = useState<{ id: string; label: string } | null>(null)
  const [detailModalRow, setDetailModalRow] = useState<OpeningStockRow | null>(null)
  const [detailModalReturnRow, setDetailModalReturnRow] = useState<OpeningStockRow | null>(null)
  const codeSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeSearchRequestRef = useRef(0)
  const priceUnitRequestRef = useRef(0)
  const lotInputRef = useRef<HTMLInputElement>(null)
  const toastRef = useRef<Toast>(null)

  const filteredRows = useMemo(() => {
    const q = search.trim()
    return rows.filter((row) => {
      if (!q) return true
      const searchable = [
        row.code,
        row.tradeName,
        row.inciName,
        row.lot,
        row.openingDate,
        row.invoiceNo,
        row.invoiceDate,
        row.supplierCode,
        row.supplierName,
        row.expiryDate,
        row.manufactureDate,
        String(row.quantityGram),
        String(row.unitPriceValue),
        String(row.lineAmount),
        row.unitPriceUnitCode,
      ].join(' ')
      return containsInsensitive(searchable, q)
    })
  }, [rows, search])

  const draftQuantityBase = useMemo(() => Number.parseFloat(draft.quantityGram || '0'), [draft.quantityGram])
  const draftUnitPriceValue = useMemo(() => Number.parseFloat(draft.unitPriceValue || '0'), [draft.unitPriceValue])
  const draftConversionToBase = useMemo(
    () => Number.parseFloat(draft.unitPriceConversionToBase || '0'),
    [draft.unitPriceConversionToBase],
  )

  const draftLineAmount = useMemo(() => {
    if (!Number.isFinite(draftQuantityBase) || draftQuantityBase < 0) return 0
    if (!Number.isFinite(draftUnitPriceValue) || draftUnitPriceValue < 0) return 0
    if (!Number.isFinite(draftConversionToBase) || draftConversionToBase <= 0) return 0
    return (draftQuantityBase / draftConversionToBase) * draftUnitPriceValue
  }, [draftConversionToBase, draftQuantityBase, draftUnitPriceValue])

  const canSaveDraftRow = useMemo(() => {
    const code = normalizeCode(draft.code)
    const selectedCode = selectedMaterial ? normalizeCode(selectedMaterial.code) : ''
    return Boolean(
      selectedMaterial
      && selectedCode === code
      && draft.unitPriceUnitId
      && Number.isFinite(draftQuantityBase)
      && draftQuantityBase >= 0
      && Number.isFinite(draftUnitPriceValue)
      && draftUnitPriceValue >= 0
      && Number.isFinite(draftConversionToBase)
      && draftConversionToBase > 0,
    )
  }, [draft.code, draft.unitPriceUnitId, draftConversionToBase, draftQuantityBase, draftUnitPriceValue, selectedMaterial])

  const estimatedTotalAmount = useMemo(() => {
    const persistedAmount = filteredRows.reduce((sum, row) => {
      const amount = roundAmountForDisplay(row.lineAmount)
      return sum + amount
    }, 0)

    if (!canSaveDraftRow) return persistedAmount
    return persistedAmount + roundAmountForDisplay(draftLineAmount)
  }, [canSaveDraftRow, draftLineAmount, filteredRows])

  const totalRows = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, safePage, pageSize])

  const visibleIds = useMemo(() => pagedRows.map((row) => row.id), [pagedRows])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const selectedRows = useMemo(() => pagedRows.filter((row) => selectedIds.includes(row.id)), [pagedRows, selectedIds])

  const tableRows = useMemo(() => ([
    ...pagedRows,
    {
      id: NEW_ROW_ID,
      code: '',
      tradeName: '',
      inciName: '',
      lot: '',
      openingDate: '',
      invoiceNo: '',
      invoiceDate: '',
      supplierId: null,
      supplierCode: '',
      supplierName: '',
      quantityGram: 0,
      unitPricePerKg: 0,
      unitPriceValue: 0,
      unitPriceUnitId: null,
      unitPriceUnitCode: '',
      unitPriceConversionToBase: 0,
      lineAmount: 0,
      expiryDate: '',
      manufactureDate: '',
      hasCertificate: false,
    } as OpeningStockRow,
  ]), [pagedRows])

  const currentRangeStart = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const currentRangeEnd = Math.min(totalRows, safePage * pageSize)

  const clearNotice = () => setNotice(null)

  const parseApiErrorMessage = (error: unknown, fallback: string): string => {
    if (!(error instanceof Error)) return fallback
    const raw = error.message?.trim() ?? ''
    return raw || fallback
  }

  useEffect(() => {
    return () => {
      if (codeSearchTimerRef.current) clearTimeout(codeSearchTimerRef.current)
    }
  }, [])

  const clearMaterialLookup = (nextFields: Partial<DraftRow>) => {
    setSelectedMaterial(null)
    setDraft((prev) => ({
      ...prev,
      ...nextFields,
      inciName: '',
      unitPriceUnitId: '',
      unitPriceUnitCode: '',
      unitPriceConversionToBase: '',
    }))
  }

  const handleCodeSearch = (e: AutoCompleteCompleteEvent) => {
    if (codeSearchTimerRef.current) clearTimeout(codeSearchTimerRef.current)

    const q = e.query.trim()
    if (!q) {
      setMaterialSuggestions([])
      return
    }

    codeSearchTimerRef.current = setTimeout(async () => {
      const reqId = ++codeSearchRequestRef.current
      try {
        const results = await fetchMaterials(q)
        if (reqId !== codeSearchRequestRef.current) return
        setMaterialSuggestions(results.slice(0, 10))
      } catch {
        if (reqId !== codeSearchRequestRef.current) return
        setMaterialSuggestions([])
      }
    }, 250)
  }

  const handleSelectMaterial = async (mat: MaterialRow) => {
    clearNotice()
    if (codeSearchTimerRef.current) clearTimeout(codeSearchTimerRef.current)
    codeSearchRequestRef.current += 1
    setMaterialSuggestions([])
    const requestId = ++priceUnitRequestRef.current
    setSelectedMaterial(mat)
    setLoadingPriceUnits(true)
    setDraft((prev) => ({
      ...prev,
      code: mat.code,
      tradeName: mat.materialName,
      inciName: mat.inciName,
      unitPriceUnitId: '',
      unitPriceUnitCode: '',
      unitPriceConversionToBase: '',
    }))

    try {
      const units = await fetchOpeningStockPriceUnits(mat.code)
      if (requestId !== priceUnitRequestRef.current) return
      const preferredUnit = units.find((unit) => unit.isPurchaseUnit) ?? units[0] ?? null
      setDraft((prev) => ({
        ...prev,
        unitPriceUnitId: preferredUnit?.id ?? '',
        unitPriceUnitCode: preferredUnit?.code || preferredUnit?.name || '',
        unitPriceConversionToBase: preferredUnit ? String(preferredUnit.conversionToBase) : '',
      }))
    } catch (error) {
      if (requestId !== priceUnitRequestRef.current) return
      setDraft((prev) => ({
        ...prev,
        unitPriceUnitId: '',
        unitPriceUnitCode: '',
        unitPriceConversionToBase: '',
      }))
      showNotice(parseApiErrorMessage(error, 'Không tải được danh sách đơn vị đơn giá.'), 'error')
    } finally {
      if (requestId === priceUnitRequestRef.current) setLoadingPriceUnits(false)
    }

    // Shift focus to lot input for faster row entry flow.
    setTimeout(() => {
      lotInputRef.current?.focus()
    }, 0)
  }

  const handleSupplierSearch = (e: AutoCompleteCompleteEvent) => {
    const q = e.query.toLowerCase()
    setSupplierSuggestions(
      supplierOptions
        .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .slice(0, 10),
    )
  }

  const handleSelectSupplier = (s: SupplierOption) => {
    setSelectedSupplier(s)
    setDraft((prev) => ({ ...prev, supplierId: s.id }))
  }

  const loadRows = async () => {
    setLoading(true)
    try {
      const apiRows = await fetchOpeningStockRows()
      setRows(apiRows)
    } catch (error) {
      showNotice(parseApiErrorMessage(error, 'Không tải được dữ liệu tồn kho đầu kỳ.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const suppliers = await fetchBasics('suppliers')
        setSupplierOptions(suppliers.map((supplier) => ({
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
        })))
      } catch (error) {
        showNotice(parseApiErrorMessage(error, 'Không tải được danh sách nhà cung cấp.'), 'error')
      }
    })()
  }, [])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [search, pageSize])

  const showNotice = (message: string, tone: 'success' | 'error') => {
    setNotice(message)
    setNoticeTone(tone)
    toastRef.current?.show({
      severity: tone,
      summary: tone === 'success' ? 'Thành công' : 'Lỗi',
      detail: message,
      life: tone === 'success' ? 3000 : 4500,
    })
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
      return
    }

    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
  }

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev
        return [...prev, id]
      }
      return prev.filter((item) => item !== id)
    })
  }

  const syncSelectionByVisibleRows = (nextSelectedIds: string[], nextVisibleIds: string[]) => {
    const nextSet = new Set(nextSelectedIds)
    for (const id of nextVisibleIds) {
      const shouldBeChecked = nextSet.has(id)
      const isChecked = selectedIds.includes(id)
      if (shouldBeChecked !== isChecked) {
        handleToggleRow(id, shouldBeChecked)
      }
    }
  }

  const handleSelectionChange = (nextRows: OpeningStockRow[]) => {
    const nextSelectedIds = nextRows.map((row) => row.id)
    syncSelectionByVisibleRows(nextSelectedIds, visibleIds)
  }

  const handleDeleteRow = async (id: string) => {
    try {
      const deleted = await deleteOpeningStockRow(id)
      setRows((prev) => prev.filter((row) => row.id !== id))
      setSelectedIds((prev) => prev.filter((item) => item !== id))
      if (deleted.autoReversed) {
        showNotice(
          `Đã xóa dòng và tự tạo bút toán đảo chiều ${formatNumber(deleted.reversalQuantityBase ?? 0)} (đơn vị gốc).`,
          'success',
        )
      }
    } catch (error) {
      showNotice(parseApiErrorMessage(error, 'Không thể xóa dòng tồn kho đầu kỳ.'), 'error')
    }
  }

  const preventEditOnNewRow = (event: ColumnEvent) => {
    if ((event.rowData as OpeningStockRow)?.id === NEW_ROW_ID) {
      event.originalEvent.preventDefault()
    }
  }

  const handleCellEditComplete = (event: ColumnEvent) => {
    const rowData = event.rowData as OpeningStockRow
    const field = String(event.field ?? '') as 'lot' | 'openingDate' | 'invoiceNo' | 'invoiceDate' | 'supplierId' | 'quantityGram' | 'unitPriceValue' | 'expiryDate' | 'manufactureDate'
    if (!field || rowData.id === NEW_ROW_ID) return

    const raw = event.newValue
    const next: {
      lot?: string
      openingDate?: string | null
      invoiceNo?: string
      invoiceDate?: string | null
      supplierId?: string | null
      quantityBase?: number
      unitPriceValue?: number
      expiryDate?: string | null
      manufactureDate?: string | null
    } = {}

    if (field === 'lot') {
      next.lot = String(raw ?? '').trim()
    }

    if (field === 'openingDate') {
      const value = normalizeDateCellValue(raw)
      next.openingDate = value || null
    }

    if (field === 'invoiceNo') {
      next.invoiceNo = String(raw ?? '').trim()
    }

    if (field === 'invoiceDate') {
      const value = normalizeDateCellValue(raw)
      next.invoiceDate = value || null
    }

    if (field === 'supplierId') {
      const value = String(raw ?? '').trim()
      next.supplierId = value || null
    }

    if (field === 'expiryDate') {
      const value = normalizeDateCellValue(raw)
      next.expiryDate = value || null
    }

    if (field === 'manufactureDate') {
      const value = normalizeDateCellValue(raw)
      next.manufactureDate = value || null
    }

    if (field === 'quantityGram') {
      const value = Number.parseFloat(String(raw ?? '0'))
      if (!Number.isFinite(value) || value < 0) {
        event.originalEvent.preventDefault()
        showNotice('SL (GRAM/ml) phải là số hợp lệ >= 0.', 'error')
        return
      }
      next.quantityBase = value
    }

    if (field === 'unitPriceValue') {
      const value = Number.parseFloat(String(raw ?? '0'))
      if (!Number.isFinite(value) || value < 0) {
        event.originalEvent.preventDefault()
        showNotice('Đơn giá phải là số hợp lệ >= 0.', 'error')
        return
      }
      next.unitPriceValue = value
    }

    void (async () => {
      try {
        const updated = await updateOpeningStockRow(rowData.id, next)
        setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        if (updated.autoAdjusted) {
          showNotice(
            `Đã tự tạo bút toán điều chỉnh ${formatNumber(updated.adjustmentQuantityBase ?? 0)} (đơn vị gốc) cho dòng đã post.`,
            'success',
          )
        }
      } catch (error) {
        showNotice(parseApiErrorMessage(error, 'Không thể cập nhật dòng tồn kho đầu kỳ.'), 'error')
      }
    })()
  }

  const handleExportAll = async () => {
    const ExcelJS = await import('exceljs')

    const header = [
      'MA NVL',
      'TEN THUONG MAI',
      'TEN INCI',
      'SO LO',
      'SO HOA DON',
      'NGAY HOA DON',
      'NHA CUNG CAP',
      'SL (gr/ml)',
      'DON GIA',
      'DON VI GIA',
      'THANH TIEN',
      'NGAY SX',
      'NGAY TD',
      'HAN SD',
      'CHUNG TU',
    ]

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Ton dau ky', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    worksheet.addRow(header)

    const headerRow = worksheet.getRow(1)
    headerRow.height = 22
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        left: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        right: { style: 'thin', color: { argb: 'FFD0D7DE' } },
      }
    })

    for (const row of rows) {
      worksheet.addRow([
        row.code,
        row.tradeName,
        row.inciName,
        row.lot,
        row.invoiceNo,
        parseIsoDate(row.invoiceDate),
        row.supplierName || row.supplierCode,
        row.quantityGram,
        row.unitPriceValue,
        row.unitPriceUnitCode,
        row.lineAmount,
        parseIsoDate(row.manufactureDate),
        parseIsoDate(row.openingDate),
        parseIsoDate(row.expiryDate),
        row.hasCertificate ? 'CO' : 'KHONG',
      ])
    }

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: header.length },
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      worksheet.getCell(`F${rowNumber}`).numFmt = 'dd/mm/yyyy'
      worksheet.getCell(`H${rowNumber}`).numFmt = '#,##0.###'
      worksheet.getCell(`I${rowNumber}`).numFmt = '#,##0.###'
      worksheet.getCell(`K${rowNumber}`).numFmt = '#,##0.###'
      worksheet.getCell(`L${rowNumber}`).numFmt = 'dd/mm/yyyy'
      worksheet.getCell(`M${rowNumber}`).numFmt = 'dd/mm/yyyy'
      worksheet.getCell(`N${rowNumber}`).numFmt = 'dd/mm/yyyy'
    }

    worksheet.columns.forEach((column) => {
      if (!column.eachCell) return
      let maxLength = 10

      column.eachCell({ includeEmpty: true }, (cell) => {
        let cellLength = 0
        const value = cell.value

        if (value == null) {
          cellLength = 0
        } else if (value instanceof Date) {
          cellLength = 10
        } else if (typeof value === 'number') {
          cellLength = formatNumber(value).length
        } else {
          cellLength = `${value}`.length
        }

        if (cellLength > maxLength) maxLength = cellLength
      })

      column.width = Math.min(Math.max(maxLength + 2, 10), 40)
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'khai-bao-ton-kho-dau-ky.xlsx'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handleDownloadTemplate = () => {
    const template = [
      'MA NVL,SO LO,SO HOA DON,NGAY HOA DON,NHA CUNG CAP,SL (gr/ml),DON GIA,NGAY TD,NGAY SX,HAN SD,FILE MSDS,FILE COA,FILE HOA DON,FILE KHAC',
      'RAW-NEW-001,LOT-001,HD-001,2026-01-02,SUP-01 - Nha cung cap A,1000,25000,2026-01-01,2024-01-01,2028-12-31,msds-raw-new-001.pdf,coa-raw-new-001.pdf,invoice-raw-new-001.pdf,hinh-anh-lot-001.jpg',
    ].join('\n')

    downloadTextFile(template, 'mau-khai-bao-ton-kho-dau-ky.csv', 'text/csv;charset=utf-8;')
  }

  const handleOpenUpload = () => {
    if (importingExcel) return
    setImportModalOpen(true)
    setImportSummary(null)
    setImportParseError(null)
  }

  const resetImportState = () => {
    setImportParsing(false)
    setImportParseError(null)
    setSelectedImportFileName('')
    setParsedImportResult(null)
    setImportSummary(null)
    setImportAttachmentFiles([])
  }

  const handleCloseImportModal = () => {
    if (importingExcel) return
    setImportModalOpen(false)
    resetImportState()
  }

  const resolveSupplierOptionByImportValue = (rawSupplier: string): SupplierOption | null => {
    const normalized = normalizeLookup(rawSupplier)
    if (!normalized) return null

    const codeCandidate = normalizeLookup(rawSupplier.split('-')[0] ?? rawSupplier)
    const byCode = supplierOptions.find((supplier) => normalizeLookup(supplier.code) === codeCandidate)
    if (byCode) return byCode

    const byName = supplierOptions.find((supplier) => normalizeLookup(supplier.name) === normalized)
    if (byName) return byName

    const byContains = supplierOptions.find((supplier) => {
      const normalizedCode = normalizeLookup(supplier.code)
      const normalizedName = normalizeLookup(supplier.name)
      return normalized.includes(normalizedCode) || normalized.includes(normalizedName)
    })

    return byContains ?? null
  }

  const enrichImportPreviewRows = async (
    sourceRows: OpeningStockImportParseResult['rows'],
  ): Promise<OpeningStockImportParseResult['rows']> => {
    const materialCache = new Map<string, Promise<MaterialRow | null>>()
    const unitCache = new Map<string, Promise<{ id: string; code: string; conversionToBase: number } | null>>()

    const getExactMaterial = (code: string): Promise<MaterialRow | null> => {
      const normalizedCode = normalizeCode(code)
      const cached = materialCache.get(normalizedCode)
      if (cached) return cached

      const request = (async () => {
        if (!normalizedCode) return null
        const candidates = await fetchMaterials(normalizedCode)
        return candidates.find((item) => normalizeCode(item.code) === normalizedCode) ?? null
      })().catch(() => null)

      materialCache.set(normalizedCode, request)
      return request
    }

    const getPreferredUnit = (code: string): Promise<{ id: string; code: string; conversionToBase: number } | null> => {
      const normalizedCode = normalizeCode(code)
      const cached = unitCache.get(normalizedCode)
      if (cached) return cached

      const request = (async () => {
        if (!normalizedCode) return null
        const units = await fetchOpeningStockPriceUnits(normalizedCode)
        const preferred = units.find((unit) => unit.isPurchaseUnit) ?? units[0] ?? null
        if (!preferred || !Number.isFinite(preferred.conversionToBase) || preferred.conversionToBase <= 0) return null
        return {
          id: preferred.id,
          code: preferred.code || preferred.name || '',
          conversionToBase: preferred.conversionToBase,
        }
      })().catch(() => null)

      unitCache.set(normalizedCode, request)
      return request
    }

    return Promise.all(sourceRows.map(async (row) => {
      const material = await getExactMaterial(row.code)
      const preferredUnit = await getPreferredUnit(row.code)
      const supplier = resolveSupplierOptionByImportValue(row.supplierText)

      const nextWarnings = [...row.warnings]
      if (row.code && !material) {
        nextWarnings.push('Không lookup được Mã NVL để lấy Tên thương mại/Tên INCI.')
      }
      if (row.code && !preferredUnit) {
        nextWarnings.push('Không lookup được đơn vị đơn giá để tính Thành tiền.')
      }
      if (row.supplierText && !supplier) {
        nextWarnings.push('Không lookup được nhà cung cấp từ dữ liệu import.')
      }

      // Import quantity in template is already base quantity (gr/ml), keep it as base.
      const convertedQuantityBase = Number.isFinite(row.importedQuantity)
        ? (row.importedQuantity || 0)
        : (row.quantityBase || 0)

      const calculatedLineAmount = (
        preferredUnit
        && Number.isFinite(convertedQuantityBase)
        && Number.isFinite(row.unitPriceValue)
        && preferredUnit.conversionToBase > 0
      )
        ? (convertedQuantityBase / preferredUnit.conversionToBase) * row.unitPriceValue
        : 0

      const hasAnyDocument = Object.values(row.docsByType).some((items) => items.length > 0)

      return {
        ...row,
        warnings: nextWarnings,
        lookupTradeName: material?.materialName || '',
        lookupInciName: material?.inciName || '',
        resolvedSupplierCode: supplier?.code || '',
        resolvedSupplierName: supplier?.name || '',
        lookupUnitPriceUnitId: preferredUnit?.id,
        lookupUnitPriceUnitCode: preferredUnit?.code || '',
        lookupUnitPriceConversionToBase: preferredUnit?.conversionToBase,
        convertedQuantityBase,
        quantityBase: convertedQuantityBase,
        calculatedLineAmount,
        hasAnyDocument,
      }
    }))
  }

  const handlePickImportFile = async (file: File) => {
    try {
      setImportParsing(true)
      setImportParseError(null)
      setImportSummary(null)
      setSelectedImportFileName(file.name)
      const parsed = await parseOpeningStockExcel(file)
      const enrichedRows = await enrichImportPreviewRows(parsed.rows)
      setParsedImportResult({
        ...parsed,
        rows: enrichedRows,
      })
    } catch (error) {
      setImportParseError(parseApiErrorMessage(error, 'Không thể đọc file import.'))
      setParsedImportResult(null)
    } finally {
      setImportParsing(false)
    }
  }

  const handlePickAttachmentFiles = (files: File[]) => {
    setImportAttachmentFiles((prev) => {
      const nextByName = new Map<string, File>()
      for (const item of [...prev, ...files]) {
        const key = normalizeImportFileName(item.name)
        if (!key) continue
        nextByName.set(key, item)
      }
      return [...nextByName.values()]
    })
  }

  const resolveSupplierIdByImportValue = (rawSupplier: string): string | null => {
    return resolveSupplierOptionByImportValue(rawSupplier)?.id ?? null
  }

  const buildAttachmentLookup = (files: File[]) => {
    const byExactName = new Map<string, File>()

    for (const file of files) {
      const exactKey = normalizeImportFileName(file.name)
      if (!exactKey) continue
      byExactName.set(exactKey, file)
    }

    return { byExactName }
  }

  const resolveAttachmentFile = (
    requestedName: string,
    lookup: ReturnType<typeof buildAttachmentLookup>,
  ): File | null => {
    const normalizedRequested = normalizeImportFileName(requestedName)
    if (!normalizedRequested) return null
    if (hasPathSegment(normalizedRequested)) return null

    const exactMatch = lookup.byExactName.get(normalizedRequested)
    return exactMatch ?? null
  }

  const handleConfirmImport = async () => {
    if (!parsedImportResult) {
      setImportParseError('Chưa có dữ liệu preview để import.')
      return
    }

    const validRows = parsedImportResult.rows.filter((row) => row.warnings.length === 0)
    if (validRows.length === 0) {
      setImportParseError('Không có dòng hợp lệ để import.')
      return
    }

    const attachmentLookup = buildAttachmentLookup(importAttachmentFiles)

    setImportingExcel(true)
    try {
      let createdRows = 0
      let skippedRows = 0
      let uploadedDocs = 0
      const errors: string[] = []
      const missingFiles: string[] = []

      for (const row of validRows) {
        try {
          const created = await createOpeningStockRow({
            code: row.code,
            lot: row.lot,
            openingDate: row.openingDate,
            invoiceNo: row.invoiceNo || undefined,
            invoiceDate: row.invoiceDate || undefined,
            supplierId: resolveSupplierIdByImportValue(row.supplierText),
            quantityBase: row.convertedQuantityBase ?? row.quantityBase,
            unitPriceValue: row.unitPriceValue,
            unitPriceUnitId: row.lookupUnitPriceUnitId,
            expiryDate: row.expiryDate || undefined,
            manufactureDate: row.manufactureDate || undefined,
          })

          createdRows += 1

          const docTypeEntries = Object.entries(row.docsByType) as Array<[ImportDocType, string[]]>
          for (const [docType, names] of docTypeEntries) {
            for (const requestedName of names) {
              const matched = resolveAttachmentFile(requestedName, attachmentLookup)
              if (!matched) {
                missingFiles.push(`Dòng ${row.rowNumber} (${docType}): ${requestedName}`)
                continue
              }

              try {
                await uploadItemDocument(created.id, matched, docType)
                uploadedDocs += 1
              } catch (error) {
                const message = parseApiErrorMessage(error, 'Upload chứng từ thất bại.')
                errors.push(`Dòng ${row.rowNumber} (${docType} - ${requestedName}): ${message}`)
              }
            }
          }
        } catch (error) {
          skippedRows += 1
          errors.push(`Dòng ${row.rowNumber}: ${parseApiErrorMessage(error, 'Không thể import dòng dữ liệu.')}`)
        }
      }

      skippedRows += parsedImportResult.rows.length - validRows.length

      await loadRows()

      const summary = [
        `Đã import ${createdRows}/${parsedImportResult.rows.length} dòng`,
        `Upload chứng từ: ${uploadedDocs} file`,
      ]
      if (skippedRows > 0) summary.push(`Bỏ qua ${skippedRows} dòng lỗi`)
      if (missingFiles.length > 0) summary.push(`Thiếu ${missingFiles.length} file chứng từ trong thư mục`)

      setImportSummary(`${summary.join(' | ')}.`)

      if (errors.length === 0) {
        showNotice(`${summary.join(' | ')}.`, 'success')
        setImportModalOpen(false)
        resetImportState()
      } else {
        const previewErrors = errors.slice(0, 3).join(' | ')
        showNotice(`${summary.join(' | ')}. Lỗi: ${previewErrors}${errors.length > 3 ? ' ...' : ''}`, 'error')
        setImportParseError(`Import chưa hoàn tất. ${previewErrors}${errors.length > 3 ? ' ...' : ''}`)
      }
    } catch (error) {
      setImportParseError(parseApiErrorMessage(error, 'Import thất bại.'))
      showNotice(parseApiErrorMessage(error, 'Import thất bại.'), 'error')
    } finally {
      setImportingExcel(false)
    }
  }

  const handleDraftChange = (key: keyof DraftRow, value: string) => {
    clearNotice()
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const clearDraftRow = () => {
    clearNotice()
    setDraft(emptyDraft())
    setSelectedMaterial(null)
    setMaterialSuggestions([])
    setSelectedSupplier(null)
    setSupplierSuggestions([])
    setLoadingPriceUnits(false)
  }

  const handleAddRow = async () => {
    const code = normalizeCode(draft.code)
    const selectedCode = selectedMaterial ? normalizeCode(selectedMaterial.code) : ''

    if (!code) {
      showNotice('Cần nhập Mã NVL.', 'error')
      return
    }

    if (!selectedMaterial || selectedCode !== code) {
      showNotice('Vui lòng chọn Mã NVL từ danh sách gợi ý.', 'error')
      return
    }

    const normalizedLot = draft.lot.trim()

    const quantityBase = Number.parseFloat(draft.quantityGram || '0')
    const unitPriceValue = Number.parseFloat(draft.unitPriceValue || '0')

    if (!Number.isFinite(quantityBase) || quantityBase < 0 || !Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      showNotice('SL (gr/ml) và Đơn giá phải là số hợp lệ >= 0.', 'error')
      return
    }

    if (!draft.openingDate) {
      showNotice('Ngày tồn đầu không được để trống.', 'error')
      return
    }

    if (!draft.unitPriceUnitId || !Number.isFinite(draftConversionToBase) || draftConversionToBase <= 0) {
      showNotice('Không xác định được đơn vị quy đổi của Mã NVL đã chọn.', 'error')
      return
    }

    try {
      const newRow = await createOpeningStockRow({
        code,
        lot: normalizedLot,
        openingDate: draft.openingDate || undefined,
        invoiceNo: draft.invoiceNo || undefined,
        invoiceDate: draft.invoiceDate || undefined,
        supplierId: draft.supplierId || null,
        quantityBase,
        unitPriceValue,
        unitPriceUnitId: draft.unitPriceUnitId,
        expiryDate: draft.expiryDate || undefined,
        manufactureDate: draft.manufactureDate || undefined,
      })

      setRows((prev) => [...prev, newRow])
      setDraft(emptyDraft())
      setSelectedMaterial(null)
      setMaterialSuggestions([])
      setSelectedSupplier(null)
      setPage(Number.MAX_SAFE_INTEGER)
    } catch (error) {
      showNotice(parseApiErrorMessage(error, 'Không thể lưu dòng tồn kho đầu kỳ.'), 'error')
    }
  }

  const getDraftValidationIssues = (): string[] => {
    const issues: string[] = []
    const code = normalizeCode(draft.code)
    const selectedCode = selectedMaterial ? normalizeCode(selectedMaterial.code) : ''
    const quantityBase = Number.parseFloat(draft.quantityGram || '0')
    const unitPrice = Number.parseFloat(draft.unitPriceValue || '0')

    if (!code) {
      issues.push('Thiếu Mã NVL.')
    }

    if (!selectedMaterial || selectedCode !== code) {
      issues.push('Mã NVL chưa được chọn từ danh sách gợi ý.')
    }

    if (!draft.openingDate) {
      issues.push('Thiếu Ngày tồn đầu.')
    }

    if (!Number.isFinite(quantityBase) || quantityBase < 0) {
      issues.push('SL (gr/ml) phải là số hợp lệ >= 0.')
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      issues.push('Đơn giá phải là số hợp lệ >= 0.')
    }

    if (!draft.unitPriceUnitId || !Number.isFinite(draftConversionToBase) || draftConversionToBase <= 0) {
      issues.push('Chưa xác định được đơn vị đơn giá/quy đổi của Mã NVL.')
    }

    return issues
  }

  const handleClickSaveDraftRow = (event: React.MouseEvent<HTMLButtonElement>) => {
    const issues = getDraftValidationIssues()

    if (issues.length > 0) {
      confirmPopup({
        target: event.currentTarget,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Đã hiểu',
        accept: () => undefined,
        message: (
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Chưa thể lưu dòng mới</p>
            <p style={{ margin: '0 0 8px' }}>Vui lòng bổ sung các thông tin sau:</p>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ),
      })
      return
    }

    void handleAddRow()
  }

  return (
    <div className="catalog-page-shell opening-stock-shell">
      <Toast ref={toastRef} position="top-right" />
      <div className="catalog-page-top">
        <section className="title-bar">
          <div>
            <h2>Khai báo tồn kho đầu kỳ</h2>
            <p>Quản trị dữ liệu gốc cho toàn bộ hệ thống ZencosMS.</p>
          </div>
          <div className="title-actions">
            <div className="opening-stock-estimated-total" aria-live="polite">
              <p className="opening-stock-estimated-total-value">Tổng giá trị: </p> 
              <p className="opening-stock-estimated-total-value">
                <span/>
                <strong>{formatNumber(estimatedTotalAmount)}</strong>
                <span>VND</span>
              </p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => void handleExportAll()}>
              <i className="pi pi-download" /> Xuất Tất Cả (Excel)
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setProductModalOpen(true)}
            >
              <i className="pi pi-plus-circle" /> Tạo mã NVL mới
            </button>
            <button type="button" className="btn btn-primary" onClick={handleOpenUpload} disabled={importingExcel}>
              <i className={`pi ${importingExcel ? 'pi-spin pi-spinner' : 'pi-upload'}`} />
              {importingExcel ? ' Đang import...' : ' Import Excel'}
            </button>
          </div>
        </section>

        <section className="mapping-card opening-stock-mapping-card">
          <div className="mapping-icon"><i className="pi pi-file-excel" /></div>
          <div className="mapping-content">
            <strong>Quy tắc Mapping Excel (Bắt buộc)</strong>
            <p>
              Gõ tên file chứng từ vào từng cột loại tương ứng. Khi import, chọn thêm file chứng từ để hệ thống tự đối chiếu và upload:
              <span> MÃ NVL</span>
              <span> SỐ LÔ</span>
              <span> SỐ HÓA ĐƠN</span>
              <span> NGÀY HÓA ĐƠN</span>
              <span> NHÀ CUNG CẤP</span>
              <span> SL (gr/ml)</span>
              <span> ĐƠN GIÁ</span>
              <span> NGÀY TD</span>
              <span> NGÀY SX</span>
              <span> HẠN SD</span>
              <span className="doc-col-pill"> FILE MSDS</span>
              <span className="doc-col-pill"> FILE COA</span>
              <span className="doc-col-pill"> FILE HÓA ĐƠN</span>
              <span className="doc-col-pill"> FILE KHÁC</span>
            </p>
          </div>
          <button type="button" className="btn btn-ghost compact" onClick={handleDownloadTemplate}>
            <i className="pi pi-download" /> Tải mẫu Excel
          </button>
        </section>

        {notice && (
          <section className={`catalog-inline-notice ${noticeTone}`}>
            <span>{notice}</span>
            <button type="button" className="catalog-inline-notice-close" onClick={clearNotice} aria-label="Đóng thông báo">
              x
            </button>
          </section>
        )}
      </div>

      <div className="catalog-page-table">
        <div className="data-grid-wrap opening-stock-grid-wrap">
          <DataTable
            value={tableRows}
            dataKey="id"
            selectionMode="checkbox"
            selection={selectedRows}
            onSelectionChange={(event) => handleSelectionChange((event.value ?? []) as OpeningStockRow[])}
            editMode="cell"
            selectAll={allVisibleSelected}
            onSelectAllChange={(event) => handleToggleSelectAll(Boolean(event.checked))}
            isDataSelectable={(event) => event.data?.id !== NEW_ROW_ID}
            stripedRows
            loading={loading}
            cellMemo={false}
            scrollable
            scrollHeight="flex"
            emptyMessage="Chưa có dữ liệu tồn kho đầu kỳ."
            className="catalog-table opening-stock-table prime-catalog-table"
            rowClassName={(rowData) => (rowData.id === NEW_ROW_ID ? 'new-row opening-stock-add-row' : 'data-row')}
          >
            <Column
              selectionMode="multiple"
              headerStyle={{ width: '38px' }}
              style={{ width: '38px' }}
              headerClassName="opening-stock-selection-col"
              bodyClassName="opening-stock-selection-col"
              body={(rowData: OpeningStockRow) => (
              rowData.id === NEW_ROW_ID ? <span className="new-row-marker">+</span> : undefined
              )}
            />
            <Column
              field="code"
              header="MÃ NVL"
              style={{ width: '120px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              headerClassName="opening-stock-readonly-column-header"
              bodyClassName="opening-stock-readonly-column"
              body={(rowData: OpeningStockRow) => {
                if (rowData.id !== NEW_ROW_ID) return (
                  <button
                    type="button"
                    className="opening-stock-code-btn"
                    onClick={(e) => { e.stopPropagation(); setDetailModalRow(rowData) }}
                    title="Xem chi tiết"
                  >
                    {rowData.code}
                  </button>
                )
                return (
                  <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <AutoComplete
                      value={draft.code}
                      suggestions={materialSuggestions}
                      completeMethod={(e) => void handleCodeSearch(e)}
                      field="code"
                      appendTo={document.body}
                      itemTemplate={(mat: MaterialRow) => (
                        <div className="opening-stock-code-suggestion-item">
                          <span className="suggestion-code">{mat.code}</span>
                          <span className="suggestion-name">{mat.materialName}</span>
                          <span className="suggestion-inci">INCI: {mat.inciName || '---'}</span>
                        </div>
                      )}
                      onChange={(e) => {
                        if (typeof e.value === 'string') {
                          clearMaterialLookup({ code: e.value, tradeName: '' })
                          return
                        }
                        if (!e.value) clearMaterialLookup({ code: '', tradeName: '' })
                      }}
                      onSelect={(e) => void handleSelectMaterial(e.value as MaterialRow)}
                      placeholder="Mã NVL"
                      aria-label="Mã NVL"
                      className="opening-stock-autocomplete"
                      inputClassName="opening-stock-autocomplete-input"
                    />
                  </div>
                )
              }}
            />
            <Column
              field="tradeName"
              header="TÊN THƯƠNG MẠI"
              style={{ width: '250px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              headerClassName="opening-stock-readonly-column-header"
              bodyClassName="opening-stock-readonly-column"
              body={(rowData: OpeningStockRow) => {
                if (rowData.id !== NEW_ROW_ID) return rowData.tradeName
                return (
                  <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <AutoComplete
                      value={draft.tradeName}
                      suggestions={materialSuggestions}
                      completeMethod={(e) => void handleCodeSearch(e)}
                      field="materialName"
                      appendTo={document.body}
                      itemTemplate={(mat: MaterialRow) => (
                        <div className="opening-stock-code-suggestion-item">
                          <span className="suggestion-code">{mat.code}</span>
                          <span className="suggestion-name">{mat.materialName}</span>
                          <span className="suggestion-inci">INCI: {mat.inciName || '---'}</span>
                        </div>
                      )}
                      onChange={(e) => {
                        if (typeof e.value === 'string') {
                          clearMaterialLookup({ code: '', tradeName: e.value })
                          return
                        }
                        if (!e.value) clearMaterialLookup({ code: '', tradeName: '' })
                      }}
                      onSelect={(e) => void handleSelectMaterial(e.value as MaterialRow)}
                      placeholder="Tên hàng"
                      aria-label="Tên thương mại"
                      className="opening-stock-autocomplete"
                      inputClassName="opening-stock-autocomplete-input"
                    />
                  </div>
                )
              }}
            />
            <Column
              field="inciName"
              style={{ width: '220px' }}
              header="TÊN INCI *"
              headerClassName="opening-stock-readonly-column-header"
              bodyClassName="opening-stock-readonly-column"
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? <span className="opening-stock-inci">{rowData.inciName}</span>
                  : <input className="opening-stock-readonly-input" value={draft.inciName} readOnly placeholder="Tên INCI" aria-label="Tên INCI" />
              )}
            />
            <Column
              field="lot"
              header="SỐ LÔ (LOT)"
              style={{ width: '110px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <input
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  aria-label="Số lô"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? rowData.lot
                  : (
                    <input
                      ref={lotInputRef}
                      value={draft.lot}
                      onChange={(event) => handleDraftChange('lot', event.target.value)}
                      placeholder="Số lô"
                      aria-label="Số lô"
                    />
                  )
              )}
            />
            <Column
              field="invoiceNo"
              header="SỐ HÓA ĐƠN"
              style={{ width: '130px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <input
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  aria-label="Số hóa đơn"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.invoiceNo || '---')
                  : (
                    <input
                      value={draft.invoiceNo}
                      onChange={(event) => handleDraftChange('invoiceNo', event.target.value)}
                      placeholder="Số hóa đơn"
                      aria-label="Số hóa đơn"
                    />
                  )
              )}
            />
            <Column
              field="invoiceDate"
              header="NGÀY HÓA ĐƠN"
              style={{ width: '130px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                  <Calendar
                    value={parseIsoDate(String(options.value ?? ''))}
                    onChange={(event) => options.editorCallback?.(normalizeDateCellValue(event.value))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    appendTo={document.body}
                    aria-label="Ngày hóa đơn"
                  />
                </div>
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.invoiceDate ? <span className="status-pill">{formatDate(rowData.invoiceDate)}</span> : '---')
                  : (
                    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                      <Calendar
                        value={parseIsoDate(draft.invoiceDate)}
                        onChange={(event) => handleDraftChange('invoiceDate', normalizeDateCellValue(event.value))}
                        dateFormat="dd/mm/yy"
                        showIcon
                        appendTo={document.body}
                        aria-label="Ngày hóa đơn"
                      />
                    </div>
                  )
              )}
            />
            <Column
              field="supplierId"
              header="NHÀ CUNG CẤP"
              style={{ width: '220px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <SupplierEditorCell
                  initialId={String(options.value ?? '')}
                  supplierOptions={supplierOptions}
                  onConfirm={(id) => options.editorCallback?.(id)}
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.supplierName || rowData.supplierCode || '---')
                  : (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <AutoComplete
                        value={selectedSupplier ?? ''}
                        suggestions={supplierSuggestions}
                        completeMethod={handleSupplierSearch}
                        field="name"
                        itemTemplate={(s: SupplierOption) => `${s.code} - ${s.name}`}
                        onChange={(e) => {
                          if (!e.value || (typeof e.value === 'string' && e.value === '')) {
                            setSelectedSupplier(null)
                            handleDraftChange('supplierId', '')
                          }
                        }}
                        onSelect={(e) => handleSelectSupplier(e.value as SupplierOption)}
                        onClear={() => {
                          setSelectedSupplier(null)
                          handleDraftChange('supplierId', '')
                        }}
                        appendTo={document.body}
                        placeholder="Tìm nhà cung cấp..."
                      />
                    </div>
                  )
              )}
            />
            <Column
              field="quantityGram"
              header="SL (gr/ml)"
              style={{ width: '110px' }}
              align="right"
              bodyClassName="opening-stock-number-col"
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <input
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  inputMode="decimal"
                  aria-label="Số lượng gram"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? <span className="num-r">{formatNumber(rowData.quantityGram)}</span>
                  : (
                    <input
                      value={draft.quantityGram}
                      onChange={(event) => handleDraftChange('quantityGram', event.target.value)}
                      placeholder="0"
                      inputMode="decimal"
                      aria-label="Số lượng gram"
                    />
                  )
              )}
            />
            <Column
              field="unitPriceValue"
              header="ĐƠN GIÁ"
              style={{ width: '115px' }}
              align="right"
              bodyClassName="opening-stock-number-col"
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <input
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  inputMode="decimal"
                  aria-label="Đơn giá"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? <span className="num-r">{formatNumber(rowData.unitPriceValue)}</span>
                  : (
                    <input
                      value={draft.unitPriceValue}
                      onChange={(event) => handleDraftChange('unitPriceValue', event.target.value)}
                      placeholder="0"
                      inputMode="decimal"
                      aria-label="Đơn giá"
                    />
                  )
              )}
            />
            <Column
              field="unitPriceUnitCode"
              header="ĐV ĐƠN GIÁ"
              style={{ width: '130px' }}
              headerClassName="opening-stock-readonly-column-header"
              bodyClassName="opening-stock-readonly-column"
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.unitPriceUnitCode || '---')
                  : (
                    <input
                      className="opening-stock-readonly-input"
                      value={
                        loadingPriceUnits
                          ? 'Đang tải...'
                          : draft.unitPriceUnitCode
                            ? `${draft.unitPriceUnitCode} (x${formatNumber(draftConversionToBase || 0)})`
                            : '---'
                      }
                      readOnly
                      aria-label="Đơn vị đơn giá"
                    />
                  )
              )}
            />
            <Column
              field="lineAmount"
              header="THÀNH TIỀN"
              style={{ width: '120px' }}
              align="right"
              headerClassName="opening-stock-readonly-column-header"
              bodyClassName="opening-stock-number-col opening-stock-readonly-column"
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? <span className="num-r">{formatNumber(roundAmountForDisplay(rowData.lineAmount))}</span>
                  : <input className="opening-stock-readonly-input" value={formatNumber(roundAmountForDisplay(draftLineAmount))} readOnly aria-label="Thành tiền" />
              )}
            />
            <Column
              field="openingDate"
              header="NGÀY TD"
              style={{ width: '120px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                  <Calendar
                    value={parseIsoDate(String(options.value ?? ''))}
                    onChange={(event) => options.editorCallback?.(normalizeDateCellValue(event.value))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    appendTo={document.body}
                    aria-label="Ngày tồn đầu"
                  />
                </div>
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.openingDate ? <span className="status-pill">{formatDate(rowData.openingDate)}</span> : '---')
                  : (
                    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                      <Calendar
                        value={parseIsoDate(draft.openingDate)}
                        onChange={(event) => handleDraftChange('openingDate', normalizeDateCellValue(event.value))}
                        dateFormat="dd/mm/yy"
                        showIcon
                        appendTo={document.body}
                        aria-label="Ngày tồn đầu"
                      />
                    </div>
                  )
              )}
            />
            <Column
              field="manufactureDate"
              header="NGÀY SX"
              style={{ width: '120px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <Calendar
                    value={parseIsoDate(String(options.value ?? ''))}
                    onChange={(event) => options.editorCallback?.(normalizeDateCellValue(event.value))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    appendTo={document.body}
                    aria-label="Ngày sản xuất"
                  />
                </div>
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.manufactureDate ? <span className="status-pill">{formatDate(rowData.manufactureDate)}</span> : '---')
                  : (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Calendar
                        value={parseIsoDate(draft.manufactureDate)}
                        onChange={(event) => handleDraftChange('manufactureDate', normalizeDateCellValue(event.value))}
                        dateFormat="dd/mm/yy"
                        showIcon
                        appendTo={document.body}
                        aria-label="Ngày sản xuất"
                      />
                    </div>
                  )
              )}
            />
            <Column
              field="expiryDate"
              header="HẠN SD"
              style={{ width: '120px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <Calendar
                    value={parseIsoDate(String(options.value ?? ''))}
                    onChange={(event) => options.editorCallback?.(normalizeDateCellValue(event.value))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    appendTo={document.body}
                    aria-label="Hạn sử dụng"
                  />
                </div>
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.expiryDate ? <span className="status-pill">{formatDate(rowData.expiryDate)}</span> : '---')
                  : (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Calendar
                        value={parseIsoDate(draft.expiryDate)}
                        onChange={(event) => handleDraftChange('expiryDate', normalizeDateCellValue(event.value))}
                        dateFormat="dd/mm/yy"
                        showIcon
                        appendTo={document.body}
                        aria-label="Hạn sử dụng"
                      />
                    </div>
                  )
              )}
            />
            <Column
              field="hasCertificate"
              header="CHỨNG TỪ"
              style={{ width: '90px' }}
              bodyClassName="opening-stock-center-col"
              body={(rowData: OpeningStockRow) => (
                rowData.id === NEW_ROW_ID ? null : (
                  <button
                    type="button"
                    className={`icon-btn${rowData.hasCertificate ? ' is-linked' : ''}`}
                    aria-label="Đính kèm chứng từ"
                    title="Quản lý chứng từ"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDocModalItem({
                        id: rowData.id,
                        label: `${rowData.code} / ${rowData.lot || '---'}`,
                      })
                    }}
                  >
                    <i className="pi pi-paperclip" />
                    {rowData.hasCertificate && <span className="doc-badge" />}
                  </button>
                )
              )}
            />
            <Column
              header="THAO TÁC"
              frozen
              alignFrozen="right"
              headerClassName="actions opening-stock-actions-col"
              bodyClassName="actions opening-stock-actions-col"
              body={(rowData: OpeningStockRow) => {
                if (rowData.id !== NEW_ROW_ID) {
                  return (
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Xóa dòng ${rowData.code}`}
                      onClick={() => void handleDeleteRow(rowData.id)}
                    >
                      <i className="pi pi-trash" />
                    </button>
                  )
                }

                return (
                  <div className="opening-stock-action-buttons">
                    <button
                      type="button"
                      className="icon-btn save-btn"
                      aria-label="Lưu dòng mới"
                      title="Lưu"
                      onClick={handleClickSaveDraftRow}
                    >
                      <i className="pi pi-save" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Xóa nháp dòng mới"
                      title="Xóa nháp"
                      onClick={clearDraftRow}
                    >
                      x
                    </button>
                  </div>
                )
              }}
              style={{ width: '110px' }}
            />
          </DataTable>
        </div>
      </div>

      <section className="catalog-page-bottom">
        <PagedTableFooter
          rootClassName="grid-footer"
          prefix="catalog"
          currentRangeStart={currentRangeStart}
          currentRangeEnd={currentRangeEnd}
          totalRows={totalRows}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={CATALOG_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </section>

      <OpeningStockImportModal
        visible={importModalOpen}
        parsing={importParsing}
        importing={importingExcel}
        parseError={importParseError}
        parsedResult={parsedImportResult}
        selectedFileName={selectedImportFileName}
        attachmentCount={importAttachmentFiles.length}
        attachmentFileNames={importAttachmentFiles.map((file) => file.name)}
        importSummary={importSummary}
        onClose={handleCloseImportModal}
        onPickExcelFile={handlePickImportFile}
        onPickAttachments={handlePickAttachmentFiles}
        onImport={handleConfirmImport}
      />

      {detailModalRow ? (
        <StockItemDetailModal
          row={detailModalRow}
          supplierOptions={supplierOptions}
          onClose={() => setDetailModalRow(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            setDetailModalRow(updated)
            setDetailModalReturnRow((prev) => (prev?.id === updated.id ? updated : prev))
          }}
          onOpenDocs={() => {
            const r = detailModalRow
            setDetailModalReturnRow(r)
            setDetailModalRow(null)
            setDocModalItem({ id: r.id, label: `${r.code} / ${r.lot || '---'}` })
          }}
        />
      ) : null}

      {docModalItem ? (
        <StockItemDocModal
          itemId={docModalItem.id}
          itemLabel={docModalItem.label}
          onClose={() => {
            const returnRow = detailModalReturnRow
            setDocModalItem(null)
            if (returnRow?.id === docModalItem.id) {
              const latestRow = rows.find((row) => row.id === returnRow.id) ?? returnRow
              setDetailModalRow(latestRow)
              setDetailModalReturnRow(null)
            }
          }}
          onHasDocChanged={(id, hasDoc) => {
            setRows((prev) => prev.map((row) => (row.id === id ? { ...row, hasCertificate: hasDoc } : row)))
            setDetailModalReturnRow((prev) => (prev?.id === id ? { ...prev, hasCertificate: hasDoc } : prev))
          }}
        />
      ) : null}

      <ConfirmPopup />

      {productModalOpen ? (
        <div className="product-create-overlay" role="presentation" onClick={() => setProductModalOpen(false)}>
          <div className="product-create-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="product-create-modal-header">
              <h3>Tạo Product Mới</h3>
              <button type="button" className="catalog-inline-notice-close" onClick={() => setProductModalOpen(false)} aria-label="Đóng">
                x
              </button>
            </div>
            <ProductCreateForm
              returnToPath={`${location.pathname}${location.search}`}
              onCreated={async (product) => {
                try {
                  const candidates = await fetchMaterials(product.code)
                  const exact = candidates.find((item) => item.code.toUpperCase() === product.code.toUpperCase())
                  if (exact) {
                    await handleSelectMaterial(exact)
                  } else {
                    setDraft((prev) => ({
                      ...prev,
                      code: product.code,
                      tradeName: product.name,
                    }))
                  }
                  showNotice(`Đã tạo product ${product.code}. Mã đã được nạp vào dòng nhập liệu.`, 'success')
                } catch {
                  showNotice(`Đã tạo product ${product.code}. Bạn có thể tiếp tục chọn mã này trong dòng tồn đầu kỳ.`, 'success')
                } finally {
                  setProductModalOpen(false)
                  setTimeout(() => {
                    lotInputRef.current?.focus()
                  }, 0)
                }
              }}
              onCancel={() => setProductModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
