import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { AutoComplete } from 'primereact/autocomplete'
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import type { ColumnEvent } from 'primereact/column'
import { CatalogGridFooter } from '../components/catalog/CatalogGridFooter'
import { ProductCreateForm } from '../components/catalog/ProductCreateForm'
import { containsInsensitive, downloadTextFile, toCsvRow } from '../components/catalog/utils'
import {
  createOpeningStockRow,
  deleteOpeningStockRow,
  fetchOpeningStockPriceUnits,
  fetchOpeningStockRows,
  updateOpeningStockRow,
} from '../lib/openingStockApi'
import type { OpeningStockRow } from '../lib/openingStockApi'
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
})

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
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
  const [productModalOpen, setProductModalOpen] = useState(false)
  const codeSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeSearchRequestRef = useRef(0)
  const priceUnitRequestRef = useRef(0)
  const lotInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

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
    return Boolean(
      selectedMaterial
      && selectedMaterial.code === code
      && draft.unitPriceUnitId
      && Number.isFinite(draftQuantityBase)
      && draftQuantityBase >= 0
      && Number.isFinite(draftUnitPriceValue)
      && draftUnitPriceValue >= 0
      && Number.isFinite(draftConversionToBase)
      && draftConversionToBase > 0,
    )
  }, [draft.code, draft.unitPriceUnitId, draftConversionToBase, draftQuantityBase, draftUnitPriceValue, selectedMaterial])

  const totalRows = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = new Set([1, totalPages])
    for (let i = Math.max(1, safePage - 2); i <= Math.min(totalPages, safePage + 2); i += 1) {
      pages.add(i)
    }
    return [...pages].sort((a, b) => a - b)
  }, [totalPages, safePage])

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
      await deleteOpeningStockRow(id)
      setRows((prev) => prev.filter((row) => row.id !== id))
      setSelectedIds((prev) => prev.filter((item) => item !== id))
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
    const field = String(event.field ?? '') as 'lot' | 'openingDate' | 'invoiceNo' | 'invoiceDate' | 'supplierId' | 'quantityGram' | 'unitPriceValue' | 'expiryDate'
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
    } = {}

    if (field === 'lot') {
      next.lot = String(raw ?? '').trim()
    }

    if (field === 'openingDate') {
      const value = String(raw ?? '').trim()
      next.openingDate = value || null
    }

    if (field === 'invoiceNo') {
      next.invoiceNo = String(raw ?? '').trim()
    }

    if (field === 'invoiceDate') {
      const value = String(raw ?? '').trim()
      next.invoiceDate = value || null
    }

    if (field === 'supplierId') {
      const value = String(raw ?? '').trim()
      next.supplierId = value || null
    }

    if (field === 'expiryDate') {
      const value = String(raw ?? '').trim()
      next.expiryDate = value || null
    }

    if (field === 'quantityGram') {
      const value = Number.parseFloat(String(raw ?? '0'))
      if (!Number.isFinite(value) || value < 0) {
        event.originalEvent.preventDefault()
        showNotice('SL (GRAM) phải là số hợp lệ >= 0.', 'error')
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
      } catch (error) {
        showNotice(parseApiErrorMessage(error, 'Không thể cập nhật dòng tồn kho đầu kỳ.'), 'error')
      }
    })()
  }

  const handleExportAll = () => {
    const header = [
      'MA NVL',
      'TEN THUONG MAI',
      'TEN INCI',
      'SO LO',
      'NGAY TD',
      'SO HOA DON',
      'NGAY HOA DON',
      'NHA CUNG CAP',
      'SL (GRAM)',
      'DON GIA',
      'DON VI GIA',
      'THANH TIEN',
      'HAN SD',
      'CHUNG TU',
    ]

    const body = rows.map((row) => [
      row.code,
      row.tradeName,
      row.inciName,
      row.lot,
      row.openingDate,
      row.invoiceNo,
      row.invoiceDate,
      row.supplierName || row.supplierCode,
      String(row.quantityGram),
      String(row.unitPriceValue),
      row.unitPriceUnitCode,
      String(row.lineAmount),
      row.expiryDate,
      row.hasCertificate ? 'CO' : 'KHONG',
    ])

    const csv = [toCsvRow(header), ...body.map((line) => toCsvRow(line))].join('\n')
    downloadTextFile(csv, 'khai-bao-ton-kho-dau-ky.csv', 'text/csv;charset=utf-8;')
  }

  const handleDownloadTemplate = () => {
    const template = [
      'MA NVL,TEN THUONG MAI,TEN INCI,SO LO,NGAY TD,SO HOA DON,NGAY HOA DON,NHA CUNG CAP,SL (GRAM),DON GIA,DON VI GIA,THANH TIEN,HAN SD,CHUNG TU',
      'RAW-NEW-001,Ten thuong mai,INCI Name,LOT-001,2026-01-01,HD-001,2026-01-02,SUP-01 - Nha cung cap A,1000,25000,kg,25000,2028-12-31,CO',
    ].join('\n')

    downloadTextFile(template, 'mau-khai-bao-ton-kho-dau-ky.csv', 'text/csv;charset=utf-8;')
  }

  const handleOpenUpload = () => {
    uploadInputRef.current?.click()
  }

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    showNotice(`Đã nhận file ${file.name}. Chức năng import chi tiết sẽ được kết nối API ở bước tiếp theo.`, 'success')
    event.target.value = ''
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

    if (!code) {
      showNotice('Cần nhập Mã NVL.', 'error')
      return
    }

    if (!selectedMaterial || selectedMaterial.code !== code) {
      showNotice('Vui lòng chọn Mã NVL từ danh sách gợi ý.', 'error')
      return
    }

    const normalizedLot = draft.lot.trim()

    const quantityBase = Number.parseFloat(draft.quantityGram || '0')
    const unitPriceValue = Number.parseFloat(draft.unitPriceValue || '0')

    if (!Number.isFinite(quantityBase) || quantityBase < 0 || !Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      showNotice('SL (GRAM) và Đơn giá phải là số hợp lệ >= 0.', 'error')
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

  return (
    <div className="catalog-page-shell opening-stock-shell">
      <div className="catalog-page-top">
        <section className="title-bar">
          <div>
            <h2>Khai báo tồn kho đầu kỳ</h2>
            <p>Quản trị dữ liệu gốc cho toàn bộ hệ thống ZencosMS.</p>
          </div>
          <div className="title-actions">
            <button type="button" className="btn btn-ghost" onClick={handleExportAll}>
              <i className="pi pi-download" /> Xuất Tất Cả (Excel)
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setProductModalOpen(true)}
            >
              <i className="pi pi-plus-circle" /> Tạo mã NVL mới
            </button>
            <button type="button" className="btn btn-primary" onClick={handleOpenUpload}>
              <i className="pi pi-upload" /> Tải lên dữ liệu (Excel)
            </button>
            <input
              ref={uploadInputRef}
              className="hidden-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadChange}
            />
          </div>
        </section>

        <section className="mapping-card opening-stock-mapping-card">
          <div className="mapping-icon"><i className="pi pi-file-excel" /></div>
          <div className="mapping-content">
            <strong>Quy tắc Mapping Excel (Bắt buộc)</strong>
            <p>
              Hệ thống tự động nhận diện dữ liệu dựa trên tiêu đề cột. Đảm bảo file Excel của bạn chứa các cột chính xác sau:
              <span> MÃ NVL</span>
              <span> TÊN THƯƠNG MẠI</span>
              <span> TÊN INCI</span>
              <span> SỐ LÔ</span>
              <span> NGÀY TD</span>
              <span> SL (GRAM)</span>
              <span> ĐƠN GIÁ/KG</span>
              <span> HẠN SD</span>
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
                if (rowData.id !== NEW_ROW_ID) return <span className="opening-stock-code">{rowData.code}</span>
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
              field="openingDate"
              header="NGÀY TD"
              style={{ width: '120px' }}
              onBeforeCellEditShow={preventEditOnNewRow}
              onCellEditComplete={handleCellEditComplete}
              editor={(options) => (
                <input
                  type="date"
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  aria-label="Ngày tồn đầu"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.openingDate ? <span className="status-pill">{formatDate(rowData.openingDate)}</span> : '---')
                  : (
                    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                      <input
                        type="date"
                        value={draft.openingDate}
                        onChange={(event) => handleDraftChange('openingDate', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        aria-label="Ngày tồn đầu"
                      />
                    </div>
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
                <input
                  type="date"
                  value={String(options.value ?? '')}
                  onChange={(e) => options.editorCallback?.(e.target.value)}
                  aria-label="Ngày hóa đơn"
                />
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.invoiceDate ? <span className="status-pill">{formatDate(rowData.invoiceDate)}</span> : '---')
                  : (
                    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                      <input
                        type="date"
                        value={draft.invoiceDate}
                        onChange={(event) => handleDraftChange('invoiceDate', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
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
              header="SL (GRAM)"
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
                  ? <span className="num-r">{formatNumber(rowData.lineAmount)}</span>
                  : <input className="opening-stock-readonly-input" value={formatNumber(draftLineAmount)} readOnly aria-label="Thành tiền" />
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
                  <input
                    type="date"
                    value={String(options.value ?? '')}
                    onChange={(e) => options.editorCallback?.(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="Hạn sử dụng"
                  />
                </div>
              )}
              body={(rowData: OpeningStockRow) => (
                rowData.id !== NEW_ROW_ID
                  ? (rowData.expiryDate ? <span className="status-pill">{formatDate(rowData.expiryDate)}</span> : '---')
                  : (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <input
                        type="date"
                        value={draft.expiryDate}
                        onChange={(event) => handleDraftChange('expiryDate', event.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
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
                <button
                  type="button"
                  className={`icon-btn${rowData.hasCertificate ? ' is-linked' : ''}`}
                  aria-label={rowData.id === NEW_ROW_ID ? 'Đính kèm cho dòng mới' : 'Đính kèm chứng từ'}
                >
                  <i className="pi pi-paperclip" />
                </button>
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
                      onClick={() => void handleAddRow()}
                      disabled={!canSaveDraftRow}
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
        <CatalogGridFooter
          currentRangeStart={currentRangeStart}
          currentRangeEnd={currentRangeEnd}
          totalRows={totalRows}
          safePage={safePage}
          totalPages={totalPages}
          pageButtons={pageButtons}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </section>

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
