import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import type { ColumnEvent } from 'primereact/column'
import type { BasicRow, MaterialRow, TabId } from './types'

const NEW_ID = '__new__'

export interface CatalogDataGridHandle {
  focusNewRow: () => void
}

type Props = {
  activeTab: TabId
  selectedIds: string[]
  allVisibleSelected: boolean
  pagedMaterials: MaterialRow[]
  pagedBasics: BasicRow[]
  classifications: BasicRow[]
  units: BasicRow[]
  onToggleSelectAll: (checked: boolean) => void
  onToggleSelectRow: (id: string, checked: boolean) => void
  onSaveMaterial: (row: MaterialRow) => Promise<boolean>
  onSaveBasic: (row: BasicRow) => Promise<boolean>
  onDelete: (id: string) => void
  nextMatCode: string
  nextBasicCode: string
}

export const CatalogDataGrid = forwardRef<CatalogDataGridHandle, Props>(
  function CatalogDataGrid(
    { activeTab, selectedIds, allVisibleSelected, pagedMaterials, pagedBasics,
      classifications,
      units,
      onToggleSelectAll, onToggleSelectRow, onSaveMaterial, onSaveBasic, onDelete,
      nextMatCode, nextBasicCode },
    ref,
  ) {
    const [pendingNewMat, setPendingNewMat] = useState<Partial<MaterialRow>>({})
    const [pendingNewBasic, setPendingNewBasic] = useState<Partial<BasicRow>>({})
    const [savingNewRow, setSavingNewRow] = useState(false)
    const newMaterialCodeRef = useRef<HTMLInputElement>(null)
    const newBasicCodeRef = useRef<HTMLInputElement>(null)
    const isMat = activeTab === 'materials'

    const unitNameByCode = useMemo(
      () => new Map(units.map((item) => [item.code, item.name])),
      [units],
    )

    const unitById = useMemo(
      () => new Map(units.map((item) => [item.id, item])),
      [units],
    )

    const unitParentOptions = useMemo(
      () => [
        { value: '', label: '-- Không có --' },
        ...units.map((item) => ({
          value: item.id,
          label: `${item.code} - ${item.name}`,
        })),
      ],
      [units],
    )

    const classificationOptions = useMemo(
      () => classifications.map((item) => ({ value: item.id, label: item.name, code: item.code })),
      [classifications],
    )

    const classificationById = useMemo(
      () => new Map(classifications.map((item) => [item.id, item])),
      [classifications],
    )

    const classificationByCode = useMemo(
      () => new Map(classifications.map((item) => [item.code.toLowerCase(), item])),
      [classifications],
    )

    const numberFormatter = useMemo(
      () => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }),
      [],
    )

    function resolveCategoryLabel(categoryValue: string) {
      if (!categoryValue) return ''
      const byId = classificationById.get(categoryValue)
      if (byId) return byId.name

      const byCode = classificationByCode.get(categoryValue.toLowerCase())
      if (byCode) return byCode.name

      return categoryValue
    }

    const materialRows = useMemo<MaterialRow[]>(() => {
      const newRow: MaterialRow = {
        id: NEW_ID,
        code: pendingNewMat.code ?? '',
        inciName: pendingNewMat.inciName ?? '',
        materialName: pendingNewMat.materialName ?? '',
        category: pendingNewMat.category ?? '',
        unit: pendingNewMat.unit ?? '',
        status: pendingNewMat.status ?? '',
      }
      return [...pagedMaterials, newRow]
    }, [pagedMaterials, pendingNewMat])

    const basicRows = useMemo<BasicRow[]>(() => {
      const newRow: BasicRow = {
        id: NEW_ID,
        code: pendingNewBasic.code ?? '',
        name: pendingNewBasic.name ?? '',
        contactInfo: pendingNewBasic.contactInfo ?? '',
        phone: pendingNewBasic.phone ?? '',
        email: pendingNewBasic.email ?? '',
        address: pendingNewBasic.address ?? '',
        note: pendingNewBasic.note ?? '',
        parentUnitId: pendingNewBasic.parentUnitId ?? '',
        conversionToBase: pendingNewBasic.conversionToBase ?? 1,
        isPurchaseUnit: pendingNewBasic.isPurchaseUnit ?? false,
        isDefaultDisplay: pendingNewBasic.isDefaultDisplay ?? false,
        status: pendingNewBasic.status ?? '',
      }
      return [...pagedBasics, newRow]
    }, [pagedBasics, pendingNewBasic])

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
        if (isMat) newMaterialCodeRef.current?.focus()
        else newBasicCodeRef.current?.focus()
      },
    }), [isMat])

    function handleMaterialCellEditComplete(e: ColumnEvent) {
      const { rowData, newValue, field, originalEvent: event } = e
      if (!field) return
      if (rowData.id === NEW_ID) {
        return
      }

      const updatedRow: MaterialRow = { ...rowData, [field]: newValue }
      if (!updatedRow.inciName?.trim() || !updatedRow.materialName?.trim() || !updatedRow.category?.trim() || !updatedRow.unit?.trim()) {
        event.preventDefault()
        return
      }
      rowData[field] = newValue // mutate để DataTable cập nhật display ngay
      void onSaveMaterial(updatedRow)
    }

    function preventEditOnNewRow(e: ColumnEvent) {
      if (e.rowData?.id === NEW_ID) {
        e.originalEvent.preventDefault()
      }
    }

    function handleNewRowKeyDown(event: React.KeyboardEvent<HTMLElement>) {
      // Prevent DataTable keyboard handlers from switching the new row into cell-edit mode.
      event.stopPropagation()
    }

    function handleBasicCellEditComplete(e: ColumnEvent) {
      const { rowData, newValue, field, originalEvent: event } = e
      if (!field) return
      if (rowData.id === NEW_ID) {
        return
      }

      const updatedRow: BasicRow = { ...rowData, [field]: newValue }
      if (!updatedRow.name?.trim()) {
        event.preventDefault()
        return
      }
      if (activeTab === 'units' && field === 'conversionToBase') {
        const n = Number(newValue)
        if (!Number.isFinite(n) || n <= 0) {
          event.preventDefault()
          return
        }
        updatedRow.conversionToBase = n
      }
      if (activeTab === 'units' && field === 'parentUnitId') {
        const parentId = (newValue ?? '').toString().trim()
        if (parentId === rowData.id) {
          event.preventDefault()
          return
        }
        updatedRow.parentUnitId = parentId
        rowData[field] = parentId // mutate để DataTable cập nhật display ngay
      } else {
        rowData[field] = newValue // mutate để DataTable cập nhật display ngay
      }
      void onSaveBasic(updatedRow)
    }

    function getParentUnitOptions(excludeUnitId?: string) {
      if (!excludeUnitId) return unitParentOptions
      return unitParentOptions.filter((item) => item.value !== excludeUnitId)
    }

    function setNewMaterialField(field: keyof MaterialRow, value: string) {
      setPendingNewMat((prev) => ({ ...prev, [field]: value }))
    }

    function setNewBasicField(field: keyof BasicRow, value: string | number | boolean) {
      setPendingNewBasic((prev) => ({ ...prev, [field]: value as never }))
    }

    const canSaveNewMaterial = Boolean(
      pendingNewMat.inciName?.trim()
      && pendingNewMat.materialName?.trim()
      && pendingNewMat.category?.trim()
      && pendingNewMat.unit?.trim(),
    )

    const canSaveNewBasic = Boolean(
      pendingNewBasic.name?.trim()
      && (activeTab !== 'units' || ((pendingNewBasic.conversionToBase ?? 1) > 0)),
    )

    async function saveNewMaterialRow() {
      if (!canSaveNewMaterial || savingNewRow) return
      setSavingNewRow(true)
      try {
        const candidate: MaterialRow = {
          id: `nvl-${Date.now()}`,
          code: pendingNewMat.code?.trim() || nextMatCode,
          inciName: pendingNewMat.inciName!.trim(),
          materialName: pendingNewMat.materialName!.trim(),
          category: pendingNewMat.category!.trim(),
          unit: pendingNewMat.unit!.trim(),
          status: pendingNewMat.status?.trim() || 'Active',
        }
        const saved = await onSaveMaterial(candidate)
        if (saved) {
          setPendingNewMat({})
        }
      } finally {
        setSavingNewRow(false)
      }
    }

    async function saveNewBasicRow() {
      if (!canSaveNewBasic || savingNewRow) return
      setSavingNewRow(true)
      try {
        const candidate: BasicRow = {
          id: `${activeTab}-${Date.now()}`,
          code: pendingNewBasic.code?.trim() || nextBasicCode,
          name: pendingNewBasic.name!.trim(),
          contactInfo: pendingNewBasic.contactInfo?.trim() || '',
          phone: pendingNewBasic.phone?.trim() || '',
          email: pendingNewBasic.email?.trim() || '',
          address: pendingNewBasic.address?.trim() || '',
          note: pendingNewBasic.note?.trim() || '',
          parentUnitId: pendingNewBasic.parentUnitId?.toString().trim() || '',
          conversionToBase: Number(pendingNewBasic.conversionToBase ?? 1),
          isPurchaseUnit: Boolean(pendingNewBasic.isPurchaseUnit),
          isDefaultDisplay: Boolean(pendingNewBasic.isDefaultDisplay),
          status: pendingNewBasic.status?.trim() || 'Active',
        }
        const saved = await onSaveBasic(candidate)
        if (saved) {
          setPendingNewBasic({})
        }
      } finally {
        setSavingNewRow(false)
      }
    }

    function clearNewMaterialRow() {
      if (savingNewRow) return
      setPendingNewMat({})
    }

    function clearNewBasicRow() {
      if (savingNewRow) return
      setPendingNewBasic({})
    }

    // ── Material Editor Templates ─────────────────────────────────────

    function materialCodeEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
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
          options={classificationOptions}
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
          <InputText
            ref={newMaterialCodeRef}
            value={pendingNewMat.code ?? nextMatCode}
            onChange={(e) => setNewMaterialField('code', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Mã *"
          />
        )
      }
      return rowData.code
    }

    function materialInciBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewMat.inciName ?? ''}
            onChange={(e) => setNewMaterialField('inciName', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="INCI name *"
          />
        )
      }
      return rowData.inciName
    }

    function materialNameBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewMat.materialName ?? ''}
            onChange={(e) => setNewMaterialField('materialName', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Tên nguyên liệu *"
          />
        )
      }
      return rowData.materialName
    }

    function materialCategoryBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <Dropdown
            value={pendingNewMat.category ?? ''}
            onChange={(e) => setNewMaterialField('category', e.value)}
            onKeyDown={handleNewRowKeyDown}
            options={classificationOptions}
            optionLabel="label"
            optionValue="value"
            placeholder="-- Chọn --"
          />
        )
      }
      return resolveCategoryLabel(rowData.category)
    }

    function materialUnitBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <Dropdown
            value={pendingNewMat.unit ?? ''}
            onChange={(e) => setNewMaterialField('unit', e.value)}
            onKeyDown={handleNewRowKeyDown}
            options={units}
            optionLabel="name"
            optionValue="code"
            placeholder="-- Chọn --"
          />
        )
      }
      return unitNameByCode.get(rowData.unit) ?? rowData.unit
    }

    function materialStatusBody(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewMat.status ?? 'Active'}
            onChange={(e) => setNewMaterialField('status', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
          />
        )
      }
      return <span className="status-pill">{rowData.status}</span>
    }

    function materialDeleteButton(rowData: MaterialRow) {
      if (rowData.id === NEW_ID) {
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="icon-btn save-btn" title="Lưu" onClick={() => void saveNewMaterialRow()} disabled={!canSaveNewMaterial || savingNewRow}>
              <i className="pi pi-save" />
            </button>
            <button type="button" className="icon-btn" title="Xóa nháp" onClick={clearNewMaterialRow} disabled={savingNewRow}>
              ×
            </button>
          </div>
        )
      }
      return (
        <button type="button" className="icon-btn danger" title="Xóa" onClick={() => onDelete(rowData.id)}>
          <i className="pi pi-trash" />
        </button>
      )
    }



    // ── Basic Editor Templates ────────────────────────────────────────

    function basicCodeEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
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

    function basicContactInfoEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Liên hệ"
        />
      )
    }

    function basicPhoneEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Số điện thoại"
        />
      )
    }

    function basicEmailEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Email"
        />
      )
    }

    function basicAddressEditor(options: any) {
      return (
        <InputText
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="Địa chỉ"
        />
      )
    }

    function basicParentUnitIdEditor(options: any) {
      const excludeUnitId = options?.rowData?.id && options.rowData.id !== NEW_ID
        ? options.rowData.id
        : undefined
      return (
        <Dropdown
          value={options.value || ''}
          onChange={(e) => options.editorCallback?.(e.value ?? '')}
          options={getParentUnitOptions(excludeUnitId)}
          optionLabel="label"
          optionValue="value"
          placeholder="-- Chọn --"
        />
      )
    }

    function basicConversionEditor(options: any) {
      return (
        <InputText
          className="unit-conversion-input"
          value={String(options.value ?? 1)}
          onChange={(e) => options.editorCallback?.(e.target.value)}
          placeholder="1"
        />
      )
    }

    function basicBoolEditor(options: any) {
      const checked = Boolean(options.value)
      return (
        <span className="unit-flag-cell">
          <input
            className="unit-flag-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e: ChangeEvent<HTMLInputElement>) => options.editorCallback?.(e.target.checked)}
          />
        </span>
      )
    }

    // ── Basic Body Templates ──────────────────────────────────────────

    function basicCodeBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            ref={newBasicCodeRef}
            value={pendingNewBasic.code ?? nextBasicCode}
            onChange={(e) => setNewBasicField('code', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Mã *"
          />
        )
      }
      return rowData.code
    }

    function basicNameBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.name ?? ''}
            onChange={(e) => setNewBasicField('name', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Tên *"
          />
        )
      }
      return rowData.name
    }

    function basicNoteBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.note ?? ''}
            onChange={(e) => setNewBasicField('note', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
          />
        )
      }
      return rowData.note
    }

    function basicContactInfoBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.contactInfo ?? ''}
            onChange={(e) => setNewBasicField('contactInfo', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Liên hệ"
          />
        )
      }
      return rowData.contactInfo || ''
    }

    function basicPhoneBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.phone ?? ''}
            onChange={(e) => setNewBasicField('phone', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Số điện thoại"
          />
        )
      }
      return rowData.phone || ''
    }

    function basicEmailBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.email ?? ''}
            onChange={(e) => setNewBasicField('email', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Email"
          />
        )
      }
      return rowData.email || ''
    }

    function basicAddressBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.address ?? ''}
            onChange={(e) => setNewBasicField('address', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="Địa chỉ"
          />
        )
      }
      return rowData.address || ''
    }

    function basicStatusBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            value={pendingNewBasic.status ?? 'Active'}
            onChange={(e) => setNewBasicField('status', e.target.value)}
            onKeyDown={handleNewRowKeyDown}
          />
        )
      }
      return <span className="status-pill">{rowData.status}</span>
    }

    function basicParentUnitIdBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <Dropdown
            value={pendingNewBasic.parentUnitId ?? ''}
            onChange={(e) => setNewBasicField('parentUnitId', e.value ?? '')}
            onKeyDown={handleNewRowKeyDown}
            options={getParentUnitOptions()}
            optionLabel="label"
            optionValue="value"
            placeholder="-- Chọn --"
          />
        )
      }
      const parentUnit = rowData.parentUnitId ? unitById.get(rowData.parentUnitId) : undefined
      if (parentUnit) {
        return `${parentUnit.code} - ${parentUnit.name}`
      }
      return rowData.parentUnitId || ''
    }

    function basicConversionBody(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <InputText
            className="unit-conversion-input"
            value={String(pendingNewBasic.conversionToBase ?? 1)}
            onChange={(e) => setNewBasicField('conversionToBase', Number(e.target.value) || 0)}
            onKeyDown={handleNewRowKeyDown}
            placeholder="1"
          />
        )
      }
      return <span className="unit-conversion-value">{numberFormatter.format(Number(rowData.conversionToBase ?? 1))}</span>
    }

    function basicBoolBody(rowData: BasicRow, field: 'isPurchaseUnit' | 'isDefaultDisplay') {
      if (rowData.id === NEW_ID) {
        const checked = Boolean(pendingNewBasic[field])
        return (
          <span className="unit-flag-cell">
            <input
              className="unit-flag-checkbox"
              type="checkbox"
              checked={checked}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewBasicField(field, e.target.checked)}
            />
          </span>
        )
      }
      return (
        <span className="unit-flag-cell">
          <input
            className="unit-flag-checkbox"
            type="checkbox"
            checked={Boolean(rowData[field])}
            readOnly
            disabled
            tabIndex={-1}
          />
        </span>
      )
    }

    function basicDeleteButton(rowData: BasicRow) {
      if (rowData.id === NEW_ID) {
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="icon-btn save-btn" title="Lưu" onClick={() => void saveNewBasicRow()} disabled={!canSaveNewBasic || savingNewRow}>
              <i className="pi pi-save" />
            </button>
            <button type="button" className="icon-btn" title="Xóa nháp" onClick={clearNewBasicRow} disabled={savingNewRow}>
              ×
            </button>
          </div>
        )
      }
      return (
        <button type="button" className="icon-btn danger" title="Xóa" onClick={() => onDelete(rowData.id)}>
          <i className="pi pi-trash" />
        </button>
      )
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
              editMode="cell"
              selectAll={allVisibleSelected}
              onSelectAllChange={(event) => onToggleSelectAll(Boolean(event.checked))}
              isDataSelectable={(event) => event.data?.id !== NEW_ID}
              stripedRows
              className="catalog-table prime-catalog-table"
              rowClassName={(row) => (row.id === NEW_ID ? 'new-row' : '')}
            >
              <Column selectionMode="multiple" headerStyle={{ width: '42px' }} />
              <Column field="code" header="MÃ NVL" body={materialCodeBody} editor={(options) => materialCodeEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column field="inciName" header="INCI NAME" body={materialInciBody} editor={(options) => materialInciEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column field="materialName" header="Tên Nguyên liệu" body={materialNameBody} editor={(options) => materialNameEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column field="category" header="Phân loại" body={materialCategoryBody} editor={(options) => materialCategoryEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column field="unit" header="Đơn vị" body={materialUnitBody} editor={(options) => materialUnitEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column field="status" header="Trạng thái" body={materialStatusBody} editor={(options) => materialStatusEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleMaterialCellEditComplete} sortable />
              <Column header="Xử lý" body={materialDeleteButton} style={{ width: '88px' }} />
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
              editMode="cell"
              selectAll={allVisibleSelected}
              onSelectAllChange={(event) => onToggleSelectAll(Boolean(event.checked))}
              isDataSelectable={(event) => event.data?.id !== NEW_ID}
              stripedRows
              className="catalog-table prime-catalog-table basic-table"
              rowClassName={(row) => (row.id === NEW_ID ? 'new-row' : '')}
            >
              <Column selectionMode="multiple" headerStyle={{ width: '42px' }} />
              <Column field="code" header="Mã" body={basicCodeBody} editor={(options) => basicCodeEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable />
              <Column field="name" header="Tên" body={basicNameBody} editor={(options) => basicNameEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable />
              {activeTab === 'suppliers' ? <Column field="phone" header="SĐT" body={basicPhoneBody} editor={(options) => basicPhoneEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'suppliers' ? <Column field="contactInfo" header="Liên hệ" body={basicContactInfoBody} editor={(options) => basicContactInfoEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'customers' ? <Column field="phone" header="SĐT" body={basicPhoneBody} editor={(options) => basicPhoneEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'customers' ? <Column field="email" header="Email" body={basicEmailBody} editor={(options) => basicEmailEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {(activeTab === 'suppliers' || activeTab === 'customers') ? <Column field="address" header="Địa chỉ" body={basicAddressBody} editor={(options) => basicAddressEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              <Column field="note" header="Ghi chú" body={basicNoteBody} editor={(options) => basicNoteEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable />
              {activeTab === 'units' ? <Column field="parentUnitId" header="Đơn vị cấp dưới" body={basicParentUnitIdBody} editor={(options) => basicParentUnitIdEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'units' ? <Column field="conversionToBase" header="Quy đổi" bodyClassName="unit-conversion-col" body={basicConversionBody} editor={(options) => basicConversionEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'units' ? <Column field="isPurchaseUnit" header="ĐV mua" bodyClassName="unit-flag-col" body={(row) => basicBoolBody(row, 'isPurchaseUnit')} editor={(options) => basicBoolEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              {activeTab === 'units' ? <Column field="isDefaultDisplay" header="Mặc định" bodyClassName="unit-flag-col" body={(row) => basicBoolBody(row, 'isDefaultDisplay')} editor={(options) => basicBoolEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable /> : null}
              <Column field="status" header="Trạng thái" body={basicStatusBody} editor={(options) => basicStatusEditor(options)} onBeforeCellEditShow={preventEditOnNewRow} onCellEditComplete={handleBasicCellEditComplete} sortable />
              <Column header="Xử lý" body={basicDeleteButton} style={{ width: '88px' }} />
            </DataTable>
          </>
        )}
      </section>
    )
  },
)
