import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { CatalogDataGridHandle } from '../components/catalog/CatalogDataGrid'
import { CatalogDataGrid } from '../components/catalog/CatalogDataGrid'
import { CatalogGridFooter } from '../components/catalog/CatalogGridFooter'
import { CatalogToolbar } from '../components/catalog/CatalogToolbar'
import {
  initialBasicRows,
  initialMaterialRows,
  tabItems,
} from '../components/catalog/data'
import type { BasicRow, BasicTabId, MaterialRow, TabId } from '../components/catalog/types'
import { containsInsensitive, downloadTextFile, toCsvRow } from '../components/catalog/utils'

type OutletContext = { search: string }

export function CatalogPage() {
  const { search } = useOutletContext<OutletContext>()

  const [activeTab, setActiveTab] = useState<TabId>('materials')
  const [onlyActive, setOnlyActive] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>(initialMaterialRows)
  const [catalogs, setCatalogs] = useState(initialBasicRows)
  const importInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<CatalogDataGridHandle>(null)
  const pageSize = 5

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

  // Suggested codes for new rows
  const nextMatCode = `NVL-${String(materials.length + 1).padStart(3, '0')}`
  const nextBasicCode =
    activeTab !== 'materials'
      ? `${activeTab.toUpperCase().slice(0, 3)}-${catalogs[activeTab as BasicTabId].length + 1}`
      : ''

  // ── Save handlers (upsert: insert if new id, update if existing) ─────
  const handleSaveMaterial = (row: MaterialRow) => {
    setMaterials((prev) => {
      const exists = prev.some((r) => r.id === row.id)
      return exists ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row]
    })
  }

  const handleSaveBasic = (row: BasicRow) => {
    if (activeTab === 'materials') return
    const tab = activeTab as BasicTabId
    setCatalogs((prev) => {
      const exists = prev[tab].some((r) => r.id === row.id)
      return {
        ...prev,
        [tab]: exists ? prev[tab].map((r) => (r.id === row.id ? row : r)) : [...prev[tab], row],
      }
    })
  }

  const deleteRow = (id: string) => {
    if (activeTab === 'materials') {
      setMaterials((prev) => prev.filter((r) => r.id !== id))
    } else {
      setCatalogs((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((r) => r.id !== id) }))
    }
    setSelectedIds((prev) => prev.filter((s) => s !== id))
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
    <>
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
        onSaveMaterial={handleSaveMaterial}
        onSaveBasic={handleSaveBasic}
        onDelete={deleteRow}
        nextMatCode={nextMatCode}
        nextBasicCode={nextBasicCode}
      />
      <CatalogGridFooter
        currentRangeStart={currentRangeStart}
        currentRangeEnd={currentRangeEnd}
        totalRows={totalRows}
        safePage={safePage}
        totalPages={totalPages}
        pageButtons={pageButtons}
        onPageChange={setPage}
      />
    </>
  )
}
