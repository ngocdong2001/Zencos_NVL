import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { CatalogDataGridHandle } from '../components/catalog/CatalogDataGrid'
import { CatalogDataGrid } from '../components/catalog/CatalogDataGrid'
import { CatalogGridFooter } from '../components/catalog/CatalogGridFooter'
import { CatalogToolbar } from '../components/catalog/CatalogToolbar'
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

function parseApiError(error: unknown): ParsedApiError {
  if (!(error instanceof Error)) {
    return { message: 'Lưu nguyên liệu thất bại' }
  }

  const raw = error.message?.trim() ?? ''
  if (!raw.startsWith('{')) {
    return { message: raw || 'Lưu nguyên liệu thất bại' }
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string; suggestedCode?: string }
    return {
      message: parsed.message || parsed.error || 'Lưu nguyên liệu thất bại',
      suggestedCode: parsed.suggestedCode,
    }
  } catch {
    return { message: raw }
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
  const importInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<CatalogDataGridHandle>(null)
  const pageSize = 5

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
  }, [activeTab, search, onlyActive])

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
      const searchable = [row.code, row.name, row.note, row.status].join(' ')
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
    return [1, 2, 3, totalPages]
      .filter((v, i, self) => self.indexOf(v) === i)
      .sort((a, b) => a - b)
  }, [totalPages])

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

  // ── Save handlers (upsert: insert if new id, update if existing) ─────
  const handleSaveMaterial = async (row: MaterialRow): Promise<boolean> => {
    const payload = {
      code: row.code,
      name: row.materialName,
      inciName: row.inciName,
      productType: row.category === 'packaging' ? 'packaging' : 'raw_material',
      baseUnit: row.unit,
      minStockLevel: 0,
      hasExpiry: row.category !== 'packaging',
      useFefo: row.category !== 'packaging',
      notes: '',
    } as const

    try {
      if (isNumericId(row.id)) {
        await updateMaterial(row.id, payload)
      } else {
        await createMaterial(payload)
      }
      await refreshMaterials()
      return true
    } catch (error) {
      console.error('Lưu nguyên liệu thất bại:', error)
      const parsed = parseApiError(error)
      if (parsed.suggestedCode) {
        setNextMatCode(parsed.suggestedCode)
      }
      const hint = parsed.suggestedCode ? `\nMã gợi ý: ${parsed.suggestedCode}` : ''
      window.alert(`${parsed.message}${hint}`)
      return false
    }
  }

  const handleSaveBasic = async (row: BasicRow): Promise<boolean> => {
    if (activeTab === 'materials') return false
    const tab = activeTab as BasicTabId

    try {
      if (isNumericId(row.id)) {
        await updateBasic(tab, row.id, { code: row.code, name: row.name, note: row.note })
      } else {
        await createBasic(tab, { code: row.code, name: row.name, note: row.note })
      }
      await refreshBasicTab(tab)
      return true
    } catch (error) {
      console.error('Lưu danh mục thất bại:', error)
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
        ...filteredMaterials.map((r) => toCsvRow([r.code, r.inciName, r.materialName, r.category, r.unit, r.status])),
      ]
      downloadTextFile(rows.join('\n'), 'catalog-nguyen-lieu.csv', 'text/csv;charset=utf-8;')
      return
    }
    const rows = [
      toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Trạng thái']),
      ...filteredBasics.map((r) => toCsvRow([r.code, r.name, r.note, r.status])),
    ]
    downloadTextFile(rows.join('\n'), `catalog-${activeTab}.csv`, 'text/csv;charset=utf-8;')
  }

  const downloadTemplate = () => {
    const content =
      activeTab === 'materials'
        ? toCsvRow(['MÃ NVL', 'INCI NAME', 'Tên Nguyên liệu', 'Phân loại', 'Đơn vị', 'Trạng thái'])
        : toCsvRow(['Mã', 'Tên', 'Ghi chú', 'Trạng thái'])
    downloadTextFile(content, `template-${activeTab}.csv`, 'text/csv;charset=utf-8;')
  }

  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      if (lines.length <= 1) {
        event.target.value = ''
        return
      }
      const dataLines = lines.slice(1)
      if (activeTab === 'materials') {
        const imported: MaterialRow[] = dataLines.map((line, i) => {
          const cells = line.replaceAll('"', '').split(',').map((c) => c.trim())
          return {
            id: `import-mat-${Date.now()}-${i}`,
            code: cells[0] || `NVL-${String(materials.length + i + 1).padStart(3, '0')}`,
            inciName: cells[1] || '',
            materialName: cells[2] || '',
            category: cells[3] || '',
            unit: cells[4] || '',
            status: cells[5] || 'Active',
          }
        })
        setMaterials((prev) => [...prev, ...imported.filter((r) => r.inciName && r.materialName)])
      } else {
        const imported: BasicRow[] = dataLines.map((line, i) => {
          const cells = line.replaceAll('"', '').split(',').map((c) => c.trim())
          return {
            id: `import-basic-${Date.now()}-${i}`,
            code: cells[0] || `${activeTab.toUpperCase().slice(0, 3)}-${catalogs[activeTab].length + i + 1}`,
            name: cells[1] || '',
            note: cells[2] || '',
            status: cells[3] || 'Active',
          }
        })
        setCatalogs((prev) => ({
          ...prev,
          [activeTab]: [...prev[activeTab], ...imported.filter((r) => r.name)],
        }))
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <section className="catalog-page-shell">
      <div className="catalog-page-top">
        <CatalogToolbar
          activeTab={activeTab}
          tabItems={tabItems}
          selectedCount={selectedCount}
          importInputRef={importInputRef}
          onExport={exportCurrent}
          onFocusQuickAdd={() => {
            gridRef.current?.focusNewRow()
          }}
          onDownloadTemplate={downloadTemplate}
          onTabChange={setActiveTab}
          onToggleOnlyActive={() => setOnlyActive((prev) => !prev)}
          onImportCsv={importCsv}
        />
        {loading ? <p style={{ margin: '8px 0 12px', opacity: 0.7 }}>Đang tải dữ liệu catalog...</p> : null}
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
          onPageChange={setPage}
        />
      </div>
    </section>
  )
}
