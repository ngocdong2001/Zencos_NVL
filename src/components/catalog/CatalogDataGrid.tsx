import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import type { DataTableRowEditCompleteEvent } from 'primereact/datatable'
import type { DataTableEditingRows, DataTableRowEditEvent } from 'primereact/datatable'
import type { DataTableRowClickEvent } from 'primereact/datatable'
import type { BasicRow, MaterialRow, TabId } from './types'

const NEW_ID = '__new__'

const materialTypeOptions = [
  { value: 'raw_material', label: 'Nguyên liệu' },
  { value: 'packaging', label: 'Bao bì' },
]
const materialTypeLabelByValue = new Map(materialTypeOptions.map((item) => [item.value, item.label]))

export interface CatalogDataGridHandle {
  focusNewRow: () => void
}

type Props = {
  activeTab: TabId
  selectedIds: string[]
  allVisibleSelected: boolean
  pagedMaterials: MaterialRow[]
  pagedBasics: BasicRow[]
  units: BasicRow[]
  onToggleSelectAll: (checked: boolean) => void
  onToggleSelectRow: (id: string, checked: boolean) => void
  onSaveMaterial: (row: MaterialRow) => void
  onSaveBasic: (row: BasicRow) => void
  onDelete: (id: string) => void
  nextMatCode: string
  nextBasicCode: string
}

export const CatalogDataGrid = forwardRef<CatalogDataGridHandle, Props>(
  function CatalogDataGrid(
    { activeTab, selectedIds, allVisibleSelected, pagedMaterials, pagedBasics,
      units,
      onToggleSelectAll, onToggleSelectRow, onSaveMaterial, onSaveBasic, onDelete,
      nextMatCode, nextBasicCode },
    ref,
  ) {
    const [editingRows, setEditingRows] = useState<DataTableEditingRows>({})
    const firstEditRef = useRef<HTMLInputElement>(null)
    const isMat = activeTab === 'materials'

    const unitNameByCode = useMemo(
      () => new Map(units.map((item) => [item.code, item.name])),
      [units],
    )

    const materialRows = useMemo<MaterialRow[]>(() => {
      const newRow: MaterialRow = {
        id: NEW_ID,
        code: '',
        inciName: '',
        materialName: '',
        category: '',
        unit: '',
        status: '',
      }
      return [...pagedMaterials, newRow]
    }, [pagedMaterials])

    const basicRows = useMemo<BasicRow[]>(() => {
      const newRow: BasicRow = {
        id: NEW_ID,
        code: '',
        name: '',
        note: '',
        status: '',
      }
      return [...pagedBasics, newRow]
    }, [pagedBasics])

    const materialSelectableRows = useMemo(
      () => materialRows.filter((row) => row.id !== NEW_ID),
      [materialRows],
    )

    const basicSelectableRows = useMemo(
      () => basicRows.filter((row) => row.id !== NEW_ID),
      [basicRows],
    )

    const selectedMaterialRows = useMemo(
      () => materialSelectableRows.filter((row) => selectedIds.includes(row.id)),
      [materialSelectableRows, selectedIds],
    )

    const selectedBasicRows = useMemo(
      () => basicSelectableRows.filter((row) => selectedIds.includes(row.id)),
      [basicSelectableRows, selectedIds],
    )

    useImperativeHandle(ref, () => ({
      focusNewRow() {
        setEditingRows({ [NEW_ID]: true })
      },
    }))

    function handleRowEditChange(event: DataTableRowEditEvent) {
      setEditingRows((event.data as DataTableEditingRows) ?? {})
    }

    function handleNewRowClick(event: DataTableRowClickEvent) {
      const row = event.data as MaterialRow | BasicRow
      if (row?.id !== NEW_ID) return
      if (editingRows[NEW_ID]) return
      setEditingRows({ [NEW_ID]: true })
      setTimeout(() => firstEditRef.current?.focus(), 0)
    }

    // ── Material Editor Templates ─────────────────────────────────────

    function materialCodeEditor(options: any) {
      const { value, rowData, editorCallback } = options
      const isNewRow = rowData.id === NEW_ID

      if (isNewRow && !editingRows[NEW_ID]) {
        return (
          <button type="button" className="new-row-link" onClick={() => {
            setEditingRows({ [NEW_ID]: true })
            setTimeout(() => firstEditRef.current?.focus(), 0)
          }}>
            Nhấp để thêm dòng mới...
          </button>
        )
      }

      return (
        <InputText
          ref={firstEditRef}
          value={value || ''}
          onChange={(e) => editorCallback?.(e.target.value)}
          placeholder="Mã *"
          autoFocus
        />
      )
    }

    function materialInciEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="INCI name *"
        />
      )
    }

    function materialNameEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Tên nguyên liệu *"
        />
      )
    }

    function materialCategoryEditor(options: any) {
      return (
        <Dropdown
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.value)}
          options={materialTypeOptions}
          optionLabel="label"
          optionValue="value"
          placeholder="-- Chọn --"
        />
      )
    }

    function materialUnitEditor(options: any) {
      return (
        <Dropdown
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.value)}
          options={units}
          optionLabel="name"
          optionValue="code"
          placeholder="-- Chọn --"
        />
      )
    }

    function materialStatusEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
        />
      )
    }

    // ── Material Body Templates ───────────────────────────────────────

    function materialCodeBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <button type="button" className="new-row-link" onClick={() => {
            setEditingRows({ [NEW_ID]: true })
          }}>
            Nhấp để thêm dòng mới...
          </button>
        )
      }
      return rowData.code
    }

    function materialCategoryBody(rowData: MaterialRow) {
      return materialTypeLabelByValue.get(rowData.category) ?? rowData.category
    }

    function materialUnitBody(rowData: MaterialRow) {
      return unitNameByCode.get(rowData.unit) ?? rowData.unit
    }

    function materialStatusBody(rowData: MaterialRow) {
      return <span className="status-pill">{rowData.status}</span>
    }

    function materialDeleteButton(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) return null
      return (
        <button type="button" className="icon-btn" title="Xóa" onClick={() => onDelete(rowData.id)}>
          🗑
        </button>
      )
    }

    function handleMaterialRowEditComplete(e: DataTableRowEditCompleteEvent) {
      const { newData } = e

      // Validate required fields
      if (!newData.inciName?.trim() || !newData.materialName?.trim() || !newData.category?.trim() || !newData.unit?.trim()) {
        return // Don't save if validation fails
      }

      const finalData: MaterialRow = {
        id: newData.id === NEW_ID ? `nvl-${Date.now()}` : newData.id,
        code: newData.code?.trim() || nextMatCode,
        inciName: newData.inciName.trim(),
        materialName: newData.materialName.trim(),
        category: newData.category.trim(),
        unit: newData.unit.trim(),
        status: newData.status?.trim() || 'Active',
      }

      onSaveMaterial(finalData)
    }

    function handleMaterialRowEditCancel() {
      // Reset editing state
      setEditingRows({})
    }

    // ── Basic Editor Templates ────────────────────────────────────────

    function basicCodeEditor(options: any) {
      const { value, rowData, editorCallback } = options
      const isNewRow = rowData.id === NEW_ID

      if (isNewRow && !editingRows[NEW_ID]) {
        return (
          <button type="button" className="new-row-link" onClick={() => {
            setEditingRows({ [NEW_ID]: true })
            setTimeout(() => firstEditRef.current?.focus(), 0)
          }}>
            Nhấp để thêm dòng mới...
          </button>
        )
      }

      return (
        <InputText
          ref={firstEditRef}
          value={value || ''}
          onChange={(e) => editorCallback?.(e.target.value)}
          placeholder="Mã *"
          autoFocus
        />
      )
    }

    function basicNameEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Tên *"
        />
      )
    }

    function basicNoteEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
        />
      )
    }

    function basicStatusEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
        />
      )
    }

    // ── Basic Body Templates ──────────────────────────────────────────

    function basicCodeBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <button type="button" className="new-row-link" onClick={() => {
            setEditingRows({ [NEW_ID]: true })
          }}>
            Nhấp để thêm dòng mới...
          </button>
        )
      }
      return rowData.code
    }

    function basicStatusBody(rowData: BasicRow) {
      return <span className="status-pill">{rowData.status}</span>
    }

    function basicDeleteButton(rowData: BasicRow) {
      if (rowData.id === NEW_ID) return null
      return (
        <button type="button" className="icon-btn" title="Xóa" onClick={() => onDelete(rowData.id)}>
          🗑
        </button>
      )
    }

    function handleBasicRowEditComplete(e: DataTableRowEditCompleteEvent) {
      const { newData } = e

      // Validate required fields
      if (!newData.name?.trim()) {
        return // Don't save if validation fails
      }

      const finalData: BasicRow = {
        id: newData.id === NEW_ID ? `${activeTab}-${Date.now()}` : newData.id,
        code: newData.code?.trim() || nextBasicCode,
        name: newData.name.trim(),
        note: newData.note?.trim() || '',
        status: newData.status?.trim() || 'Active',
      }

      onSaveBasic(finalData)
    }

    function handleBasicRowEditCancel() {
      // Reset editing state
      setEditingRows({})
    }

    // ── Selection ─────────────────────────────────────────────────────

    function syncSelectionByVisibleRows(nextSelectedIds: string[], visibleIds: string[]) {
      const nextSet = new Set(nextSelectedIds)

      for (const id of visibleIds) {
        const shouldBeChecked = nextSet.has(id)
        const isChecked = selectedIds.includes(id)
        if (shouldBeChecked !== isChecked) {
          onToggleSelectRow(id, shouldBeChecked)
        }
      }
    }

    function handleMaterialSelectionChange(nextRows: MaterialRow[]) {
      const visibleIds = materialSelectableRows.map((row) => row.id)
      const nextSelectedIds = nextRows.map((row) => row.id)
      syncSelectionByVisibleRows(nextSelectedIds, visibleIds)
    }

    function handleBasicSelectionChange(nextRows: BasicRow[]) {
      const visibleIds = basicSelectableRows.map((row) => row.id)
      const nextSelectedIds = nextRows.map((row) => row.id)
      syncSelectionByVisibleRows(nextSelectedIds, visibleIds)
    }

    return (
      <section className="data-grid-wrap">
        {isMat ? (
          <>
            <DataTable
              value={materialRows}
              dataKey="id"
              selectionMode="checkbox"
              selection={selectedMaterialRows}
              onSelectionChange={(event) => handleMaterialSelectionChange((event.value ?? []) as MaterialRow[])}
              onRowClick={handleNewRowClick}
              editMode="row"
              onRowEditComplete={handleMaterialRowEditComplete}
              onRowEditChange={handleRowEditChange}
              onRowEditCancel={handleMaterialRowEditCancel}
              editingRows={editingRows}
              selectAll={allVisibleSelected}
              onSelectAllChange={(event) => onToggleSelectAll(Boolean(event.checked))}
              isDataSelectable={(event) => event.data?.id !== NEW_ID}
              stripedRows
              showGridlines
              className="catalog-table prime-catalog-table"
              rowClassName={(row) => (row.id === NEW_ID ? 'new-row' : '')}
            >
              <Column selectionMode="multiple" headerStyle={{ width: '42px' }} />
              <Column field="code" header="MÃ NVL" body={materialCodeBody} editor={(options) => materialCodeEditor(options)} sortable />
              <Column field="inciName" header="INCI NAME" editor={(options) => materialInciEditor(options)} sortable />
              <Column field="materialName" header="Tên Nguyên liệu" editor={(options) => materialNameEditor(options)} sortable />
              <Column field="category" header="Phân loại" body={materialCategoryBody} editor={(options) => materialCategoryEditor(options)} sortable />
              <Column field="unit" header="Đơn vị" body={materialUnitBody} editor={(options) => materialUnitEditor(options)} sortable />
              <Column field="status" header="Trạng thái" body={materialStatusBody} editor={(options) => materialStatusEditor(options)} sortable />
              <Column rowEditor headerStyle={{ width: '10%', minWidth: '8rem' }} bodyStyle={{ textAlign: 'center' }} />
              <Column header="Xóa" body={materialDeleteButton} style={{ width: '60px' }} />
            </DataTable>
          </>
        ) : (
          <>
            <DataTable
              value={basicRows}
              dataKey="id"
              selectionMode="checkbox"
              selection={selectedBasicRows}
              onSelectionChange={(event) => handleBasicSelectionChange((event.value ?? []) as BasicRow[])}
              onRowClick={handleNewRowClick}
              editMode="row"
              onRowEditComplete={handleBasicRowEditComplete}
              onRowEditChange={handleRowEditChange}
              onRowEditCancel={handleBasicRowEditCancel}
              editingRows={editingRows}
              selectAll={allVisibleSelected}
              onSelectAllChange={(event) => onToggleSelectAll(Boolean(event.checked))}
              isDataSelectable={(event) => event.data?.id !== NEW_ID}
              stripedRows
              showGridlines
              className="catalog-table prime-catalog-table basic-table"
              rowClassName={(row) => (row.id === NEW_ID ? 'new-row' : '')}
            >
              <Column selectionMode="multiple" headerStyle={{ width: '42px' }} />
              <Column field="code" header="Mã" body={basicCodeBody} editor={(options) => basicCodeEditor(options)} sortable />
              <Column field="name" header="Tên" editor={(options) => basicNameEditor(options)} sortable />
              <Column field="note" header="Ghi chú" editor={(options) => basicNoteEditor(options)} sortable />
              <Column field="status" header="Trạng thái" body={basicStatusBody} editor={(options) => basicStatusEditor(options)} sortable />
              <Column rowEditor headerStyle={{ width: '10%', minWidth: '8rem' }} bodyStyle={{ textAlign: 'center' }} />
              <Column header="Xóa" body={basicDeleteButton} style={{ width: '60px' }} />
            </DataTable>
          </>
        )}
      </section>
    )
  },
)
