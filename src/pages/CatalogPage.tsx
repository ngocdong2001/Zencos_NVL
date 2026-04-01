import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { CatalogDataGridHandle } from '../components/catalog/CatalogDataGrid'
import { CatalogDataGrid } from '../components/catalog/CatalogDataGrid'
import { CatalogGridFooter } from '../components/catalog/CatalogGridFooter'
import { CatalogImportModal } from '../components/catalog/CatalogImportModal'
import { CatalogToolbar } from '../components/catalog/CatalogToolbar'
import type { ParsedImportResult, ParsedImportRow } from '../components/catalog/excelImport'
import { parseCatalogExcel } from '../components/catalog/excelImport'
import {
  initialBasicRows,
  tabItems,
} from '../components/catalog/data'
import type { BasicRow, BasicTabId, MaterialRow, TabId } from '../components/catalog/types'
import { containsInsensitive, downloadTextFile, toCsvRow } from '../components/catalog/utils'
import {
  createBasic,
  createMaterial,
  deleteBasic,
  deleteMaterial,
  fetchBasics,
  fetchMaterials,
  fetchNextMaterialCode,
  updateBasic,
  updateMaterial,
} from '../lib/catalogApi'

type OutletContext = { search: string }

type ParsedApiError = {
  message: string
  suggestedCode?: string
}

type CatalogNotice = {
  tone: 'error' | 'success'
  message: string
}

function parseApiError(error: unknown, fallbackMessage = 'Lưu dữ liệu thất bại'): ParsedApiError {
  if (!(error instanceof Error)) {
    return { message: fallbackMessage }
  }

  const raw = error.message?.trim() ?? ''
  if (!raw.startsWith('{')) {
    return { message: raw || fallbackMessage }
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string; suggestedCode?: string }
    return {
      message: parsed.message || parsed.error || fallbackMessage,
      suggestedCode: parsed.suggestedCode,
    }
  } catch {
    return { message: raw || fallbackMessage }
  }
}

function getNextCode(codes: string[], prefix: string, pad = 3): string {
  const used = new Set<number>()

  for (const raw of codes) {
    const code = raw.trim().toUpperCase()
    if (!code.startsWith(`${prefix}-`)) continue
    const suffix = code.slice(prefix.length + 1)
    const n = Number.parseInt(suffix, 10)
    if (Number.isFinite(n) && n > 0) used.add(n)
  }

  let next = 1
  while (used.has(next)) next += 1
  return `${prefix}-${String(next).padStart(pad, '0')}`
}

function normalizeCatalogCode(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeLookupKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toBooleanFlag(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase()
  return ['1', 'true', 'yes', 'co', 'x'].includes(normalized)
}

function toNumberOrDefault(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'Import thất bại.'
  }
  return 'Import thất bại.'
}

export function CatalogPage() {
  const { search } = useOutletContext<OutletContext>()

  const [activeTab, setActiveTab] = useState<TabId>('materials')
  const [onlyActive, setOnlyActive] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [catalogs, setCatalogs] = useState(initialBasicRows)
  const [nextMatCode, setNextMatCode] = useState('NVL-001')
  const [loading, setLoading] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importParsing, setImportParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importParseError, setImportParseError] = useState<string | null>(null)
  const [selectedImportFileName, setSelectedImportFileName] = useState('')
  const [parsedImportResult, setParsedImportResult] = useState<ParsedImportResult | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [catalogNotice, setCatalogNotice] = useState<CatalogNotice | null>(null)
  const gridRef = useRef<CatalogDataGridHandle>(null)

  const isNumericId = (id: string) => /^\d+$/.test(id)

  const refreshMaterials = async () => {
    const [rows, nextCode] = await Promise.all([fetchMaterials(), fetchNextMaterialCode()])
    setMaterials(rows)
    setNextMatCode(nextCode)
  }

  const refreshBasicTab = async (tab: BasicTabId) => {
    const rows = await fetchBasics(tab)
    setCatalogs((prev) => ({ ...prev, [tab]: rows }))
  }

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      try {
        setLoading(true)
        const [materialsData, nextMaterialCode, suppliersData, customersData, classificationsData, unitsData, locationsData] =
          await Promise.all([
            fetchMaterials(),
            fetchNextMaterialCode(),
            fetchBasics('suppliers'),
            fetchBasics('customers'),
            fetchBasics('classifications'),
            fetchBasics('units'),
            fetchBasics('locations'),
          ])

        if (cancelled) return
        setMaterials(materialsData)
        setNextMatCode(nextMaterialCode)
        setCatalogs((prev) => ({
          ...prev,
          suppliers: suppliersData,
          customers: customersData,
          classifications: classificationsData,
          units: unitsData,
          locations: locationsData,
        }))
      } catch (error) {
        console.error('Không tải được dữ liệu catalog:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
    setCatalogNotice(null)
  }, [activeTab, search, onlyActive, pageSize])

  useEffect(() => {
    setParsedImportResult(null)
    setImportParseError(null)
    setImportSummary(null)
    setSelectedImportFileName('')
  }, [activeTab])

  const filteredMaterials = useMemo(() => {
    const q = search.trim()
    return materials.filter((row) => {
      const searchable = [row.code, row.inciName, row.materialName, row.category, row.unit, row.status].join(' ')
      const passesSearch = !q || containsInsensitive(searchable, q)
      const passesStatus = !onlyActive || row.status.toLocaleLowerCase() === 'active'
      return passesSearch && passesStatus
    })
  }, [materials, onlyActive, search])

  const filteredBasics = useMemo(() => {
    if (activeTab === 'materials') return []
    const q = search.trim()
    return catalogs[activeTab].filter((row) => {
      const searchable = [row.code, row.name, row.contactInfo, row.phone, row.email, row.address, row.note, row.status].join(' ')
      const passesSearch = !q || containsInsensitive(searchable, q)
      const passesStatus = !onlyActive || row.status.toLocaleLowerCase() === 'active'
      return passesSearch && passesStatus
    })
  }, [activeTab, catalogs, onlyActive, search])

  const totalRows = activeTab === 'materials' ? filteredMaterials.length : filteredBasics.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)

  const pagedMaterials = useMemo(
    () => filteredMaterials.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredMaterials, safePage],
  )

  const pagedBasics = useMemo(
    () => filteredBasics.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredBasics, safePage],
  )

  const visibleIds = useMemo(
    () => (activeTab === 'materials' ? pagedMaterials.map((r) => r.id) : pagedBasics.map((r) => r.id)),
    [activeTab, pagedBasics, pagedMaterials],
  )

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const selectedCount = selectedIds.length
  const currentRangeStart = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const currentRangeEnd = Math.min(totalRows, safePage * pageSize)

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = new Set([1, totalPages])
    for (let i = Math.max(1, safePage - 2); i <= Math.min(totalPages, safePage + 2); i++) {
      pages.add(i)
    }
    return [...pages].sort((a, b) => a - b)
  }, [totalPages, safePage])

  const nextBasicCode = useMemo(() => {
    if (activeTab === 'materials') return ''
    const tab = activeTab as BasicTabId
    const prefixMap: Record<BasicTabId, string> = {
      classifications: 'CLA',
      suppliers: 'SUP',
      customers: 'CUS',
      locations: 'LOC',
      units: 'UNI',
    }
    return getNextCode(catalogs[tab].map((row) => row.code), prefixMap[tab], 3)
  }, [activeTab, catalogs])

  const classificationById = useMemo(
    () => new Map(catalogs.classifications.map((item) => [item.id, item])),
    [catalogs.classifications],
  )

  const classificationByCodeLookup = useMemo(
    () => new Map(catalogs.classifications.map((item) => [item.code.toLowerCase(), item])),
    [catalogs.classifications],
  )

  const classificationByNameLookup = useMemo(
    () => new Map(catalogs.classifications.map((item) => [normalizeLookupKey(item.name), item])),
    [catalogs.classifications],
  )

  const basicTabLabels: Record<BasicTabId, string> = {
    classifications: 'phân loại',
    suppliers: 'nhà cung cấp',
    customers: 'khách hàng',
    locations: 'vị trí kho',
    units: 'đơn vị',
  }

  // ── Save handlers (upsert: insert if new id, update if existing) ─────
  const handleSaveMaterial = async (row: MaterialRow): Promise<boolean> => {
    const normalizedCode = normalizeCatalogCode(row.code)
    const duplicatedMaterial = materials.some((item) => item.id !== row.id && normalizeCatalogCode(item.code) === normalizedCode)
    if (normalizedCode && duplicatedMaterial) {
      setCatalogNotice({ tone: 'error', message: 'Mã nguyên liệu đã tồn tại trong danh mục hiện tại.' })
      return false
    }

    const rawCategory = row.category.trim()
    const classificationByNumericId = isNumericId(rawCategory) ? classificationById.get(rawCategory) : undefined
    const classificationByCode = classificationByCodeLookup.get(rawCategory.toLowerCase())
    const selectedClassification = classificationByNumericId ?? classificationByCode
    const resolvedProductType = classificationByNumericId ? Number(rawCategory) : (selectedClassification?.id ? Number(selectedClassification.id) : rawCategory)
    const selectedCode = (selectedClassification?.code ?? rawCategory).toLowerCase()
    const isPackaging = selectedCode === 'packaging'

    const payload = {
      code: row.code,
      name: row.materialName,
      inciName: row.inciName,
      productType: resolvedProductType,
      baseUnit: row.unit,
      minStockLevel: 0,
      hasExpiry: !isPackaging,
      useFefo: !isPackaging,
      notes: '',
    } as const

    try {
      if (isNumericId(row.id)) {
        await updateMaterial(row.id, payload)
      } else {
        await createMaterial(payload)
      }
      await refreshMaterials()
      setCatalogNotice(null)
      return true
    } catch (error) {
      console.error('Lưu nguyên liệu thất bại:', error)
      const parsed = parseApiError(error, 'Lưu nguyên liệu thất bại')
      if (parsed.suggestedCode) {
        setNextMatCode(parsed.suggestedCode)
      }
      const hint = parsed.suggestedCode ? ` Mã gợi ý: ${parsed.suggestedCode}` : ''
      setCatalogNotice({ tone: 'error', message: `${parsed.message}${hint}` })
      return false
    }
  }

  const handleSaveBasic = async (row: BasicRow): Promise<boolean> => {
    if (activeTab === 'materials') return false
    const tab = activeTab as BasicTabId
    const normalizedCode = normalizeCatalogCode(row.code)
    const duplicatedBasic = catalogs[tab].some((item) => item.id !== row.id && normalizeCatalogCode(item.code) === normalizedCode)
    if (normalizedCode && duplicatedBasic) {
      setCatalogNotice({ tone: 'error', message: `Mã ${basicTabLabels[tab]} đã tồn tại trong danh mục hiện tại.` })
      return false
    }

    try {
      if (isNumericId(row.id)) {
        await updateBasic(tab, row.id, {
          code: row.code,
          name: row.name,
          contactInfo: row.contactInfo,
          phone: row.phone,
          email: row.email,
          address: row.address,
          note: row.note,
          parentUnitId: row.parentUnitId,
          conversionToBase: row.conversionToBase,
          isPurchaseUnit: row.isPurchaseUnit,
          isDefaultDisplay: row.isDefaultDisplay,
        })
      } else {
        await createBasic(tab, {
          code: row.code,
          name: row.name,
          contactInfo: row.contactInfo,
          phone: row.phone,
          email: row.email,
          address: row.address,
          note: row.note,
          parentUnitId: row.parentUnitId,
          conversionToBase: row.conversionToBase,
          isPurchaseUnit: row.isPurchaseUnit,
          isDefaultDisplay: row.isDefaultDisplay,
        })
      }
      await refreshBasicTab(tab)
      setCatalogNotice(null)
      return true
    } catch (error) {
      console.error('Lưu danh mục thất bại:', error)
      const parsed = parseApiError(error, 'Lưu danh mục thất bại')
      setCatalogNotice({ tone: 'error', message: parsed.message })
      return false
    }
  }

  const deleteRow = (id: string) => {
    if (activeTab === 'materials') {
      void (async () => {
        try {
          if (isNumericId(id)) await deleteMaterial(id)
          await refreshMaterials()
          setSelectedIds((prev) => prev.filter((s) => s !== id))
        } catch (error) {
          console.error('Xóa nguyên liệu thất bại:', error)
        }
      })()
    } else {
      const tab = activeTab as BasicTabId
      void (async () => {
        try {
          if (isNumericId(id)) await deleteBasic(tab, id)
          await refreshBasicTab(tab)
          setSelectedIds((prev) => prev.filter((s) => s !== id))
        } catch (error) {
          console.error('Xóa danh mục thất bại:', error)
        }
      })()
    }
  }

  const exportCurrent = () => {
    if (activeTab === 'materials') {
      const rows = [
        toCsvRow(['MÃ NVL', 'INCI NAME', 'Tên Nguyên liệu', 'Phân loại', 'Đơn vị', 'Trạng thái']),
        ...filteredMaterials.map((r) => {
          const byId = classificationById.get(r.category)
          const byCode = classificationByCodeLookup.get(r.category.toLowerCase())
          const categoryLabel = byId?.name ?? byCode?.name ?? r.category
          return toCsvRow([r.code, r.inciName, r.materialName, categoryLabel, r.unit, r.status])
        }),
      ]
      downloadTextFile(rows.join('\n'), 'catalog-nguyen-lieu.csv', 'text/csv;charset=utf-8;')
      return
    }
    const rows = activeTab === 'units'
      ? [
          toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Parent Unit ID', 'Tỷ lệ quy đổi', 'ĐV mua hàng', 'Hiển thị mặc định', 'Trạng thái']),
          ...filteredBasics.map((r) => toCsvRow([
            r.code,
            r.name,
            r.note,
            r.parentUnitId ?? '',
            String(r.conversionToBase ?? 1),
            r.isPurchaseUnit ? '1' : '0',
            r.isDefaultDisplay ? '1' : '0',
            r.status,
          ])),
        ]
      : activeTab === 'suppliers'
        ? [
            toCsvRow(['Mã', 'Tên', 'SĐT', 'Liên hệ', 'Địa chỉ', 'Ghi chú', 'Trạng thái']),
            ...filteredBasics.map((r) => toCsvRow([r.code, r.name, r.phone ?? '', r.contactInfo ?? '', r.address ?? '', r.note, r.status])),
          ]
        : activeTab === 'customers'
          ? [
              toCsvRow(['Mã', 'Tên', 'SĐT', 'Email', 'Địa chỉ', 'Ghi chú', 'Trạng thái']),
              ...filteredBasics.map((r) => toCsvRow([r.code, r.name, r.phone ?? '', r.email ?? '', r.address ?? '', r.note, r.status])),
            ]
      : [
          toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Trạng thái']),
          ...filteredBasics.map((r) => toCsvRow([r.code, r.name, r.note, r.status])),
        ]
    downloadTextFile(rows.join('\n'), `catalog-${activeTab}.csv`, 'text/csv;charset=utf-8;')
  }

  const downloadTemplate = () => {
    const content =
      activeTab === 'materials'
        ? toCsvRow(['MÃ NVL', 'INCI NAME', 'Tên Nguyên liệu', 'Phân loại', 'Đơn vị', 'Trạng thái'])
        : activeTab === 'units'
          ? toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Parent Unit ID', 'Tỷ lệ quy đổi', 'ĐV mua hàng', 'Hiển thị mặc định', 'Trạng thái'])
          : activeTab === 'suppliers'
            ? toCsvRow(['Mã', 'Tên', 'SĐT', 'Liên hệ', 'Địa chỉ', 'Ghi chú', 'Trạng thái'])
            : activeTab === 'customers'
              ? toCsvRow(['Mã', 'Tên', 'SĐT', 'Email', 'Địa chỉ', 'Ghi chú', 'Trạng thái'])
          : toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Trạng thái'])
    downloadTextFile(content, `template-${activeTab}.csv`, 'text/csv;charset=utf-8;')
  }

  const handleOpenImportModal = () => {
    setImportModalOpen(true)
    setImportSummary(null)
  }

  const resetImportState = () => {
    setImportParseError(null)
    setImportSummary(null)
    setSelectedImportFileName('')
    setParsedImportResult(null)
  }

  const handleCloseImportModal = () => {
    if (importing) return
    setImportModalOpen(false)
    resetImportState()
  }

  const handlePickImportFile = async (file: File) => {
    try {
      setImportParsing(true)
      setImportParseError(null)
      setImportSummary(null)
      setSelectedImportFileName(file.name)
      const parsed = await parseCatalogExcel(file, activeTab)
      setParsedImportResult(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đọc file import.'
      setImportParseError(message)
      setParsedImportResult(null)
    } finally {
      setImportParsing(false)
    }
  }

  const importMaterialRows = async (rows: ParsedImportRow[]) => {
    let successCount = 0
    const failedRows: ParsedImportRow[] = []

    for (const row of rows) {
      const values = row.values
      const rawProductType = (values['phan loai'] ?? '').trim()
      const normalizedProductType = normalizeLookupKey(rawProductType)
      const matchedClassification =
        (isNumericId(rawProductType) ? classificationById.get(rawProductType) : undefined) ??
        classificationByCodeLookup.get(rawProductType.toLowerCase()) ??
        classificationByNameLookup.get(normalizedProductType)

      const resolvedProductType =
        isNumericId(rawProductType)
          ? Number(rawProductType)
          : matchedClassification?.id
            ? Number(matchedClassification.id)
            : rawProductType

      const payload = {
        code: values['ma nvl'],
        name: values['ten nguyen lieu'],
        inciName: values['inci name'],
        productType: resolvedProductType,
        baseUnit: values['don vi'],
        minStockLevel: 0,
        hasExpiry: true,
        useFefo: true,
        notes: '',
      } as const

      try {
        await createMaterial(payload)
        successCount += 1
      } catch (error) {
        const parsed = parseApiError(error)
        const message = parsed.suggestedCode
          ? `${parsed.message}. Mã gợi ý: ${parsed.suggestedCode}`
          : parsed.message

        failedRows.push({
          ...row,
          issues: [
            ...row.issues,
            {
              field: 'import',
              message,
              severity: 'error',
            },
          ],
        })
      }
    }

    return { successCount, failedRows }
  }

  const importBasicRows = async (rows: ParsedImportRow[]) => {
    const tab = activeTab as BasicTabId
    let successCount = 0
    const failedRows: ParsedImportRow[] = []

    for (const row of rows) {
      const values = row.values

      try {
        await createBasic(tab, {
          code: values.ma,
          name: values.ten,
          note: values['ghi chu'] ?? '',
          phone: tab === 'suppliers' || tab === 'customers' ? values.sdt : undefined,
          contactInfo: tab === 'suppliers' ? values['lien he'] : undefined,
          email: tab === 'customers' ? values.email : undefined,
          address: tab === 'suppliers' || tab === 'customers' ? values['dia chi'] : undefined,
          parentUnitId: tab === 'units' ? values['parent unit id'] : undefined,
          conversionToBase: tab === 'units' ? toNumberOrDefault(values['ty le quy doi'], 1) : undefined,
          isPurchaseUnit: tab === 'units' ? toBooleanFlag(values['dv mua hang']) : undefined,
          isDefaultDisplay: tab === 'units' ? toBooleanFlag(values['hien thi mac dinh']) : undefined,
        })
        successCount += 1
      } catch (error) {
        const parsed = parseApiError(error, 'Import thất bại.')
        failedRows.push({
          ...row,
          issues: [
            ...row.issues,
            {
              field: 'import',
              message: parsed.message,
              severity: 'error',
            },
          ],
        })
      }
    }

    return { successCount, failedRows }
  }

  const handleConfirmImport = async (rows: ParsedImportRow[]) => {
    if (rows.length === 0) {
      setImportSummary('Không có dòng hợp lệ để import.')
      return
    }

    try {
      setImporting(true)
      setImportParseError(null)

      const result = activeTab === 'materials'
        ? await importMaterialRows(rows)
        : await importBasicRows(rows)

      if (activeTab === 'materials') {
        await refreshMaterials()
      } else {
        await refreshBasicTab(activeTab as BasicTabId)
      }

      if (result.failedRows.length === 0) {
        setImportModalOpen(false)
        resetImportState()
        return
      }

      setParsedImportResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          rows: result.failedRows,
        }
      })
      setImportSummary(`Đã import thành công ${result.successCount}/${rows.length} dòng. ${result.failedRows.length} dòng lỗi cần xử lý.`)
      setImportParseError('Import chưa hoàn tất. Kiểm tra các dòng lỗi trong bảng preview bên dưới.')
    } catch (error) {
      setImportParseError(getErrorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="catalog-page-shell">
      <div className="catalog-page-top">
        <CatalogToolbar
          activeTab={activeTab}
          tabItems={tabItems}
          selectedCount={selectedCount}
          onExport={exportCurrent}
          onFocusQuickAdd={() => {
            gridRef.current?.focusNewRow()
          }}
          onDownloadTemplate={downloadTemplate}
          onTabChange={setActiveTab}
          onToggleOnlyActive={() => setOnlyActive((prev) => !prev)}
          onOpenImport={handleOpenImportModal}
        />
        {loading ? <p style={{ margin: '8px 0 12px', opacity: 0.7 }}>Đang tải dữ liệu catalog...</p> : null}
        {catalogNotice ? (
          <div className={`catalog-inline-notice ${catalogNotice.tone}`} role="alert">
            <span>{catalogNotice.message}</span>
            <button type="button" className="catalog-inline-notice-close" onClick={() => setCatalogNotice(null)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        ) : null}
      </div>

      <div className="catalog-page-table">
        <CatalogDataGrid
          ref={gridRef}
          activeTab={activeTab}
          selectedIds={selectedIds}
          allVisibleSelected={allVisibleSelected}
          pagedMaterials={pagedMaterials}
          pagedBasics={pagedBasics}
          onToggleSelectAll={(checked) => {
            if (checked) {
              setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
            } else {
              setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
            }
          }}
          onToggleSelectRow={(id, checked) =>
            setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)))
          }
          classifications={catalogs.classifications}
          units={catalogs.units}
          onSaveMaterial={handleSaveMaterial}
          onSaveBasic={handleSaveBasic}
          onDelete={deleteRow}
          nextMatCode={nextMatCode}
          nextBasicCode={nextBasicCode}
        />
      </div>

      <div className="catalog-page-bottom">
        <CatalogGridFooter
          currentRangeStart={currentRangeStart}
          currentRangeEnd={currentRangeEnd}
          totalRows={totalRows}
          safePage={safePage}
          totalPages={totalPages}
          pageButtons={pageButtons}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>

      <CatalogImportModal
        visible={importModalOpen}
        activeTab={activeTab}
        parsing={importParsing}
        importing={importing}
        parseError={importParseError}
        parsedResult={parsedImportResult}
        selectedFileName={selectedImportFileName}
        importSummary={importSummary}
        onClose={handleCloseImportModal}
        onPickFile={handlePickImportFile}
        onImport={handleConfirmImport}
      />
    </section>
  )
}
