import { useMemo, useRef, useState } from 'react'
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { fetchMaterials } from '../../lib/catalogApi'
import { HistoryTimeline } from '../shared/HistoryTimeline'
import { formatCurrency, formatQuantity, parseDecimalInput, toEditableNumberString } from './format'
import type { MaterialRow } from '../catalog/types'
import type { PurchaseDraftLine, SupplierOption } from './types'
import type { PurchaseRequestHistoryEvent } from '../../lib/purchaseShortageApi'

const NEW_LINE_ID = '__new_po_line__'
const NEW_ROW_TAB_INDEX = {
  materialCode: 101,
  materialName: 102,
  quantity: 103,
  unitPrice: 104,
  save: 105,
  reset: 106,
} as const

type ProductSuggestion = MaterialRow & { displayLabel: string }

type Props = {
  detailDraftRef: string
  detailSaving: boolean
  detailSubmitting: boolean
  detailRecalling: boolean
  detailDeleting: boolean
  detailStatusLabel: string
  detailCanRecallToDraft: boolean
  detailCanDelete: boolean
  detailEditable: boolean
  onBack: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  onRecallToDraft: () => void
  onDelete: () => void
  onCancel: () => void
  onDetailDraftRefChange: (value: string) => void
  detailSubmitError: string | null
  detailSubmitSuccess: string | null
  detailLoading: boolean
  quickSupplierId: string
  quickSupplierOptions: SupplierOption[]
  onQuickSupplierIdChange: (value: string) => void
  receivingWarehouseId: string
  receivingWarehouseOptions: SupplierOption[]
  receivingWarehouseLoading: boolean
  receivingWarehouseError: string | null
  onReceivingWarehouseIdChange: (value: string) => void
  quickNeedDate: Date | null
  onQuickNeedDateChange: (value: Date | null) => void
  quickNote: string
  onQuickNoteChange: (value: string) => void
  detailLines: PurchaseDraftLine[]
  onUpdateDetailLine: (lineId: string, patch: Partial<PurchaseDraftLine>) => void
  onAppendDetailLine: (line: Omit<PurchaseDraftLine, 'id'>) => void
  onRemoveDetailLine: (lineId: string) => void
  detailSubtotal: number
  detailHistoryEvents: PurchaseRequestHistoryEvent[]
  detailHistoryLoading: boolean
  detailHistoryError: string | null
}

export function PurchaseOrderDetailScreen({
  detailDraftRef,
  detailSaving,
  detailSubmitting,
  detailRecalling,
  detailDeleting,
  detailStatusLabel,
  detailCanRecallToDraft,
  detailCanDelete,
  detailEditable,
  onBack,
  onSaveDraft,
  onSubmit,
  onRecallToDraft,
  onDelete,
  onCancel,
  onDetailDraftRefChange,
  detailSubmitError,
  detailSubmitSuccess,
  detailLoading,
  quickSupplierId,
  quickSupplierOptions,
  onQuickSupplierIdChange,
  receivingWarehouseId,
  receivingWarehouseOptions,
  receivingWarehouseLoading,
  receivingWarehouseError,
  onReceivingWarehouseIdChange,
  quickNeedDate,
  onQuickNeedDateChange,
  quickNote,
  onQuickNoteChange,
  detailLines,
  onUpdateDetailLine,
  onAppendDetailLine,
  onRemoveDetailLine,
  detailSubtotal,
  detailHistoryEvents,
  detailHistoryLoading,
  detailHistoryError,
}: Props) {
  const newCodeInputRef = useRef<HTMLInputElement | null>(null)
  const [newLineDraft, setNewLineDraft] = useState<Omit<PurchaseDraftLine, 'id'>>({
    productId: '',
    materialCode: '',
    materialName: '',
    quantity: 0,
    unit: '',
    unitPrice: 0,
  })
  const [newQuantityInput, setNewQuantityInput] = useState('')
  const [newUnitPriceInput, setNewUnitPriceInput] = useState('')
  const [newQuantityFocused, setNewQuantityFocused] = useState(false)
  const [newUnitPriceFocused, setNewUnitPriceFocused] = useState(false)
  const [newProductLookupValue, setNewProductLookupValue] = useState<ProductSuggestion | string>('')
  const [newProductSuggestions, setNewProductSuggestions] = useState<ProductSuggestion[]>([])
  const [newProductNameLookupValue, setNewProductNameLookupValue] = useState<ProductSuggestion | string>('')
  const [newProductNameSuggestions, setNewProductNameSuggestions] = useState<ProductSuggestion[]>([])
  const [rowProductLookupValues, setRowProductLookupValues] = useState<Record<string, ProductSuggestion | string>>({})
  const [rowProductNameLookupValues, setRowProductNameLookupValues] = useState<Record<string, ProductSuggestion | string>>({})
  const [rowProductSuggestions, setRowProductSuggestions] = useState<Record<string, ProductSuggestion[]>>({})
  const [newLineError, setNewLineError] = useState<string | null>(null)
  const productSearchRequestRef = useRef(0)
  const productNameSearchRequestRef = useRef(0)
  const rowProductSearchRequestRef = useRef<Record<string, number>>({})

  const displayRows = useMemo(
    () => [...detailLines, { ...newLineDraft, id: NEW_LINE_ID }],
    [detailLines, newLineDraft],
  )

  const parsePositiveQuantity = (raw: string) => {
    const parsed = parseDecimalInput(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN
  }

  const parseNonNegativeAmount = (raw: string) => {
    const parsed = parseDecimalInput(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
  }

  const focusNewRowControlByTabIndex = (tabIndex: number) => {
    const target = document.querySelector(`[tabindex="${tabIndex}"]`) as HTMLElement | null
    target?.focus()
  }

  const resetNewLineDraft = () => {
    setNewLineDraft({
      productId: '',
      materialCode: '',
      materialName: '',
      quantity: 0,
      unit: '',
      unitPrice: 0,
    })
    setNewQuantityInput('')
    setNewUnitPriceInput('')
    setNewQuantityFocused(false)
    setNewUnitPriceFocused(false)
    setNewProductLookupValue('')
    setNewProductSuggestions([])
    setNewProductNameLookupValue('')
    setNewProductNameSuggestions([])
    setNewLineError(null)
  }

  const mapProductSuggestion = (row: MaterialRow): ProductSuggestion => ({
    ...row,
    displayLabel: `${row.code} - ${row.materialName}`,
  })

  const handleCompleteProduct = async (event: AutoCompleteCompleteEvent) => {
    const query = String(event.query ?? '').trim()
    const requestId = productSearchRequestRef.current + 1
    productSearchRequestRef.current = requestId

    try {
      const rows = await fetchMaterials(query || undefined)
      if (requestId !== productSearchRequestRef.current) return
      setNewProductSuggestions(rows.map(mapProductSuggestion))
    } catch {
      if (requestId !== productSearchRequestRef.current) return
      setNewProductSuggestions([])
    }
  }

  const handleCompleteProductForNewName = async (event: AutoCompleteCompleteEvent) => {
    const query = String(event.query ?? '').trim()
    const requestId = productNameSearchRequestRef.current + 1
    productNameSearchRequestRef.current = requestId

    try {
      const rows = await fetchMaterials(query || undefined)
      if (requestId !== productNameSearchRequestRef.current) return
      setNewProductNameSuggestions(rows.map(mapProductSuggestion))
    } catch {
      if (requestId !== productNameSearchRequestRef.current) return
      setNewProductNameSuggestions([])
    }
  }

  const handleCompleteProductForRow = async (lineId: string, event: AutoCompleteCompleteEvent) => {
    const query = String(event.query ?? '').trim()
    if (!lineId) return

    const nextRequestId = (rowProductSearchRequestRef.current[lineId] ?? 0) + 1
    rowProductSearchRequestRef.current[lineId] = nextRequestId

    try {
      const rows = await fetchMaterials(query || undefined)
      if (nextRequestId !== rowProductSearchRequestRef.current[lineId]) return
      setRowProductSuggestions((prev) => ({ ...prev, [lineId]: rows.map(mapProductSuggestion) }))
    } catch {
      if (nextRequestId !== rowProductSearchRequestRef.current[lineId]) return
      setRowProductSuggestions((prev) => ({ ...prev, [lineId]: [] }))
    }
  }

  const applyProductToExistingRow = (lineId: string, line: PurchaseDraftLine, product: ProductSuggestion) => {
    rowProductSearchRequestRef.current[lineId] = (rowProductSearchRequestRef.current[lineId] ?? 0) + 1
    setRowProductSuggestions((prev) => ({ ...prev, [lineId]: [] }))
    setRowProductLookupValues((prev) => ({ ...prev, [lineId]: product.code }))
    setRowProductNameLookupValues((prev) => ({ ...prev, [lineId]: product.materialName }))
    onUpdateDetailLine(lineId, {
      productId: product.id,
      materialCode: product.code,
      materialName: product.materialName,
      unit: product.unit || line.unit,
    })
  }

  const applyProductToDraft = (product: ProductSuggestion) => {
    setNewLineDraft((prev) => ({
      ...prev,
      productId: product.id,
      materialCode: product.code,
      materialName: product.materialName,
      unit: product.unit || prev.unit,
    }))
  }

  const handleAppendNewLine = () => {
    if (!detailEditable) {
      return
    }

    const productId = newLineDraft.productId.trim()
    const materialCode = newLineDraft.materialCode.trim()
    const materialName = newLineDraft.materialName.trim()
    const unit = newLineDraft.unit.trim()
    const quantity = parsePositiveQuantity(newQuantityInput)
    const unitPrice = parseNonNegativeAmount(newUnitPriceInput || '0')

    if (!productId) {
      setNewLineError('Vui lòng chọn product từ gợi ý autocomplete để thêm dòng.')
      return
    }

    if (!materialCode || !materialName || !unit || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      setNewLineError('Vui lòng nhập đủ mã, tên, ĐVT và số liệu hợp lệ trước khi thêm dòng.')
      return
    }

    onAppendDetailLine({
      productId,
      materialCode,
      materialName,
      quantity,
      unit,
      unitPrice,
    })
    resetNewLineDraft()
  }

  const handleCellEditComplete = (event: any) => {
    if (!detailEditable) {
      event.originalEvent?.preventDefault?.()
      return
    }

    const rowData = event.rowData as PurchaseDraftLine
    const field = String(event.field ?? '') as keyof PurchaseDraftLine
    if (!field || rowData.id === NEW_LINE_ID) {
      event.originalEvent?.preventDefault?.()
      return
    }

    const nextRaw = event.newValue

    if (field === 'quantity') {
      const parsed = parsePositiveQuantity(String(nextRaw ?? ''))
      if (!Number.isFinite(parsed)) {
        event.originalEvent?.preventDefault?.()
        return
      }
      onUpdateDetailLine(rowData.id, { quantity: parsed })
      return
    }

    if (field === 'unitPrice') {
      const parsed = parseNonNegativeAmount(String(nextRaw ?? ''))
      if (!Number.isFinite(parsed)) {
        event.originalEvent?.preventDefault?.()
        return
      }
      onUpdateDetailLine(rowData.id, { unitPrice: parsed })
      return
    }

    const nextText = String(nextRaw ?? '').trim()
    if (!nextText) {
      event.originalEvent?.preventDefault?.()
      return
    }

    onUpdateDetailLine(rowData.id, { [field]: nextText })
  }

  const preventEditOnNewRow = (event: any) => detailEditable && event.rowData?.id !== NEW_LINE_ID

  const renderExistingRowCodeLookup = (line: PurchaseDraftLine) => (
    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <AutoComplete
        className="po-inline-lookup"
        inputClassName="po-inline-lookup-input"
        value={rowProductLookupValues[line.id] ?? line.materialCode}
        suggestions={rowProductSuggestions[line.id] ?? []}
        completeMethod={(event) => {
          void handleCompleteProductForRow(line.id, event)
        }}
        field="displayLabel"
        appendTo={document.body}
        panelClassName="po-autocomplete-panel"
        disabled={!detailEditable}
        onChange={(event) => {
          const nextValue = typeof event.value === 'string' ? event.value : String(event.value?.code ?? '')
          setRowProductLookupValues((prev) => ({ ...prev, [line.id]: nextValue }))
          onUpdateDetailLine(line.id, { materialCode: nextValue, productId: '', unit: '' })
        }}
        onSelect={(event) => {
          applyProductToExistingRow(line.id, line, event.value as ProductSuggestion)
        }}
        placeholder="Tìm mã nguyên liệu"
        itemTemplate={(item) => (
          <div className="po-product-suggestion-item">
            <strong>{item.code}</strong>
            <span>{item.materialName}</span>
          </div>
        )}
      />
    </div>
  )

  const renderExistingRowNameLookup = (line: PurchaseDraftLine) => (
    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <AutoComplete
        className="po-inline-lookup"
        inputClassName="po-inline-lookup-input"
        value={rowProductNameLookupValues[line.id] ?? line.materialName}
        suggestions={rowProductSuggestions[line.id] ?? []}
        completeMethod={(event) => {
          void handleCompleteProductForRow(line.id, event)
        }}
        field="displayLabel"
        appendTo={document.body}
        panelClassName="po-autocomplete-panel"
        disabled={!detailEditable}
        onChange={(event) => {
          const nextValue = typeof event.value === 'string' ? event.value : String(event.value?.materialName ?? '')
          setRowProductNameLookupValues((prev) => ({ ...prev, [line.id]: nextValue }))
          onUpdateDetailLine(line.id, { materialName: nextValue, productId: '', unit: '' })
        }}
        onSelect={(event) => {
          applyProductToExistingRow(line.id, line, event.value as ProductSuggestion)
        }}
        placeholder="Tìm tên nguyên liệu"
        itemTemplate={(item) => (
          <div className="po-product-suggestion-item">
            <strong>{item.code}</strong>
            <span>{item.materialName}</span>
          </div>
        )}
      />
    </div>
  )

  const quantityEditor = (options: any) => (
    <InputText
      value={toEditableNumberString(Number(options.value ?? 0))}
      onChange={(e) => options.editorCallback?.(e.target.value)}
      inputMode="decimal"
      className="num-editor"
    />
  )

  const amountEditor = (options: any) => (
    <InputText
      value={toEditableNumberString(Number(options.value ?? 0))}
      onChange={(e) => options.editorCallback?.(e.target.value)}
      inputMode="decimal"
      className="num-editor"
    />
  )

  return (
    <section className="purchase-detail-shell">
      <header className="purchase-detail-header">
        <div className="purchase-detail-title-wrap">
          <Button
            type="button"
            className="purchase-detail-back-btn"
            icon="pi pi-angle-left"
            text
            onClick={onBack}
            aria-label="Quay lại danh sách"
          />
          <div>
            <div className="purchase-detail-title-row">
              <h2>Soạn thảo Đơn mua hàng</h2>
              <span className="purchase-detail-draft-tag">{detailStatusLabel.toUpperCase()}</span>
            </div>
            <label className="purchase-detail-ref-field">
              <span>Mã tham chiếu</span>
              <InputText
                value={detailDraftRef}
                onChange={(event) => onDetailDraftRefChange(event.target.value)}
                placeholder="Nhập mã tham chiếu PO"
                disabled={!detailEditable || detailLoading || detailSaving || detailSubmitting || detailRecalling || detailDeleting}
              />
            </label>
          </div>
        </div>

        <div className="purchase-detail-header-actions">
          {detailCanRecallToDraft ? (
            <Button
              type="button"
              className="btn btn-ghost"
              icon="pi pi-undo"
              label={detailRecalling ? 'Đang thu hồi...' : 'Thu hồi về nháp'}
              disabled={detailRecalling || detailLoading || detailSaving || detailSubmitting || detailDeleting}
              onClick={onRecallToDraft}
            />
          ) : null}
          {detailCanDelete ? (
            <Button
              type="button"
              className="btn btn-ghost purchase-detail-delete-btn"
              icon="pi pi-trash"
              label={detailDeleting ? 'Đang xóa...' : 'Xóa phiếu'}
              disabled={detailDeleting || detailRecalling || detailLoading || detailSaving || detailSubmitting}
              onClick={onDelete}
            />
          ) : null}
          <Button
            type="button"
            className="btn btn-ghost"
            icon="pi pi-save"
            label={detailSaving ? 'Đang lưu...' : 'Lưu bản nháp'}
            disabled={!detailEditable || detailDeleting || detailRecalling || detailSaving || detailSubmitting}
            onClick={onSaveDraft}
          />
          <Button
            type="button"
            className="btn btn-ghost"
            icon="pi pi-times"
            label="Hủy bỏ"
            onClick={onCancel}
          />
          <Button
            type="button"
            className="btn btn-primary"
            icon="pi pi-send"
            label={detailSubmitting ? 'Đang gửi...' : 'Gửi cho thu mua'}
            disabled={!detailEditable || detailDeleting || detailRecalling || detailSaving || detailSubmitting || detailLoading}
            onClick={onSubmit}
          />
        </div>
      </header>

      {detailSubmitError ? <p className="po-field-error">{detailSubmitError}</p> : null}
      {detailSubmitSuccess ? <p className="po-field-success">{detailSubmitSuccess}</p> : null}
      {detailLoading ? <p className="po-field-success">Đang tải dữ liệu phiếu PO...</p> : null}

      <div className="purchase-detail-content-grid">
        <div className="purchase-detail-main">
          <section className="purchase-detail-card">
            <h3><i className="pi pi-file" aria-hidden /> Thông tin chung</h3>
            <div className="purchase-general-grid">
              <article className="purchase-general-item">
                <div className="purchase-general-icon" aria-hidden>
                  <i className="pi pi-building" />
                </div>
                <div className="purchase-general-meta">
                  <span className="purchase-general-label">Nhà cung cấp</span>
                  <Dropdown
                    className="purchase-general-control-dropdown"
                    value={quickSupplierId}
                    options={quickSupplierOptions}
                    onChange={(event) => onQuickSupplierIdChange((event.value as string) ?? '')}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Chọn nhà cung cấp"
                    filter
                    showClear
                  />
                </div>
              </article>
              <article className="purchase-general-item">
                <div className="purchase-general-icon" aria-hidden>
                  <i className="pi pi-truck" />
                </div>
                <div className="purchase-general-meta">
                  <span className="purchase-general-label">Kho nhận hàng</span>
                  <Dropdown
                    className="purchase-general-control-dropdown"
                    value={receivingWarehouseId}
                    options={receivingWarehouseOptions}
                    onChange={(event) => onReceivingWarehouseIdChange((event.value as string) ?? '')}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={receivingWarehouseLoading ? 'Đang tải kho...' : 'Chọn kho nhận hàng'}
                    filter
                    showClear
                    disabled={receivingWarehouseLoading}
                  />
                  {receivingWarehouseError ? <small className="po-field-error">{receivingWarehouseError}</small> : null}
                </div>
              </article>
              <article className="purchase-general-item">
                <div className="purchase-general-icon" aria-hidden>
                  <i className="pi pi-calendar" />
                </div>
                <div className="purchase-general-meta">
                  <span className="purchase-general-label">Ngày dự kiến nhận</span>
                  <Calendar
                    className="purchase-general-control-calendar"
                    value={quickNeedDate}
                    onChange={(event) => onQuickNeedDateChange(event.value ?? null)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="Chọn ngày nhận dự kiến"
                    inputClassName="purchase-general-calendar-input"
                  />
                </div>
              </article>
            </div>

            <label className="purchase-terms-field">
              Ghi chú điều khoản (Terms & Conditions)
              <InputTextarea
                rows={3}
                value={quickNote}
                onChange={(event) => onQuickNoteChange(event.target.value)}
              />
            </label>
          </section>

          <section className="purchase-detail-card">
            <div className="purchase-material-head">
              <h3><i className="pi pi-box" aria-hidden /> Danh mục nguyên liệu</h3>
              <Button
                type="button"
                className="btn btn-ghost btn-compact-material"
                icon="pi pi-plus"
                label="Thêm dòng hàng"
                disabled={!detailEditable}
                onClick={() => newCodeInputRef.current?.focus()}
              />
            </div>

            {newLineError ? <p className="po-field-error">{newLineError}</p> : null}

            <div className="purchase-material-table-wrap">
              <DataTable
                value={displayRows}
                dataKey="id"
                editMode="cell"
                cellMemo={false}
                stripedRows
                scrollable
                className="purchase-material-table prime-catalog-table"
                rowClassName={(row) => (row.id === NEW_LINE_ID ? 'new-row' : '')}
                emptyMessage="Chưa có dòng nguyên liệu trong phiếu PO."
              >
                <Column
                  header="STT"
                  style={{ width: '64px' }}
                  body={(rowData: PurchaseDraftLine) => (
                    <span>
                      {rowData.id === NEW_LINE_ID
                        ? detailLines.length + 1
                        : detailLines.findIndex((line) => line.id === rowData.id) + 1}
                    </span>
                  )}
                />
                <Column
                  field="materialCode"
                  header="Mã NVL"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                        <AutoComplete
                          inputRef={newCodeInputRef}
                          value={newProductLookupValue}
                          suggestions={newProductSuggestions}
                          completeMethod={handleCompleteProduct}
                          field="displayLabel"
                          appendTo={document.body}
                          panelClassName="po-autocomplete-panel"
                          dropdownMode="current"
                          tabIndex={NEW_ROW_TAB_INDEX.materialCode}
                          disabled={!detailEditable}
                          onChange={(event) => {
                            setNewProductLookupValue(event.value)
                            if (typeof event.value === 'string') {
                              setNewLineDraft((prev) => ({
                                ...prev,
                                productId: '',
                                materialCode: String(event.value ?? ''),
                                unit: '',
                              }))
                            }
                          }}
                          onSelect={(event) => {
                            const selected = event.value as ProductSuggestion
                            productSearchRequestRef.current += 1
                            setNewProductSuggestions([])
                            setNewProductLookupValue(selected)
                            applyProductToDraft(selected)
                          }}
                          placeholder="Tìm mã/tên nguyên liệu"
                          itemTemplate={(item) => (
                            <div className="po-product-suggestion-item">
                              <strong>{item.code}</strong>
                              <span>{item.materialName}</span>
                            </div>
                          )}
                        />
                      </div>
                    ) : renderExistingRowCodeLookup(line)
                  )}
                  style={{ width: '150px' }}
                />
                <Column
                  field="materialName"
                  header="Tên nguyên liệu"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                        <AutoComplete
                          value={newProductNameLookupValue || newLineDraft.materialName}
                          suggestions={newProductNameSuggestions}
                          completeMethod={handleCompleteProductForNewName}
                          field="displayLabel"
                          appendTo={document.body}
                          panelClassName="po-autocomplete-panel"
                          tabIndex={NEW_ROW_TAB_INDEX.materialName}
                          disabled={!detailEditable}
                          onChange={(event) => {
                            const nextValue = typeof event.value === 'string' ? event.value : String(event.value?.materialName ?? '')
                            setNewProductNameLookupValue(nextValue)
                            setNewLineDraft((prev) => ({ ...prev, productId: '', materialName: nextValue, unit: '' }))
                          }}
                          onSelect={(event) => {
                            const selected = event.value as ProductSuggestion
                            productNameSearchRequestRef.current += 1
                            setNewProductNameSuggestions([])
                            setNewProductNameLookupValue(selected.materialName)
                            setNewProductLookupValue(selected)
                            applyProductToDraft(selected)
                          }}
                          placeholder="Tìm tên nguyên liệu"
                          itemTemplate={(item) => (
                            <div className="po-product-suggestion-item">
                              <strong>{item.code}</strong>
                              <span>{item.materialName}</span>
                            </div>
                          )}
                        />
                      </div>
                    ) : renderExistingRowNameLookup(line)
                  )}
                />
                <Column
                  field="quantity"
                  header="Số lượng"
                  align="right"
                  bodyClassName="cell-number"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <InputText
                        value={newQuantityFocused
                          ? newQuantityInput
                          : (newQuantityInput.trim() ? formatQuantity(parsePositiveQuantity(newQuantityInput)) : '')}
                        onChange={(event) => setNewQuantityInput(event.target.value)}
                        onFocus={() => {
                          setNewQuantityFocused(true)
                          const parsed = parseDecimalInput(newQuantityInput)
                          if (Number.isFinite(parsed)) setNewQuantityInput(toEditableNumberString(parsed))
                        }}
                        onBlur={() => {
                          setNewQuantityFocused(false)
                          const parsed = parsePositiveQuantity(newQuantityInput)
                          if (Number.isFinite(parsed)) setNewQuantityInput(formatQuantity(parsed))
                        }}
                        inputMode="decimal"
                        className="num-editor"
                        placeholder="0"
                        tabIndex={NEW_ROW_TAB_INDEX.quantity}
                        disabled={!detailEditable}
                        onKeyDown={(event) => {
                          if (event.key !== 'Tab') return
                          event.preventDefault()
                          focusNewRowControlByTabIndex(
                            event.shiftKey ? NEW_ROW_TAB_INDEX.materialName : NEW_ROW_TAB_INDEX.unitPrice,
                          )
                        }}
                      />
                    ) : (
                      <span className="num-r">{formatQuantity(line.quantity)}</span>
                    )
                  )}
                  editor={quantityEditor}
                  onBeforeCellEditShow={preventEditOnNewRow}
                  onCellEditComplete={handleCellEditComplete}
                  style={{ width: '120px' }}
                />
                <Column
                  field="unit"
                  header="ĐVT"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID
                      ? <span tabIndex={-1}>{newLineDraft.unit || '---'}</span>
                      : <span>{line.unit || '---'}</span>
                  )}
                  style={{ width: '90px' }}
                />
                <Column
                  field="unitPrice"
                  header="Đơn giá (VND)"
                  align="right"
                  bodyClassName="cell-number"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <InputText
                        value={newUnitPriceFocused
                          ? newUnitPriceInput
                          : (newUnitPriceInput.trim() ? formatCurrency(parseNonNegativeAmount(newUnitPriceInput)) : '')}
                        onChange={(event) => setNewUnitPriceInput(event.target.value)}
                        onFocus={() => {
                          setNewUnitPriceFocused(true)
                          const parsed = parseDecimalInput(newUnitPriceInput)
                          if (Number.isFinite(parsed)) setNewUnitPriceInput(toEditableNumberString(parsed))
                        }}
                        onBlur={() => {
                          setNewUnitPriceFocused(false)
                          const parsed = parseNonNegativeAmount(newUnitPriceInput || '0')
                          if (Number.isFinite(parsed)) setNewUnitPriceInput(formatCurrency(parsed))
                        }}
                        inputMode="decimal"
                        className="num-editor"
                        placeholder="0"
                        tabIndex={NEW_ROW_TAB_INDEX.unitPrice}
                        disabled={!detailEditable}
                        onKeyDown={(event) => {
                          if (event.key !== 'Tab') return
                          event.preventDefault()
                          focusNewRowControlByTabIndex(
                            event.shiftKey ? NEW_ROW_TAB_INDEX.quantity : NEW_ROW_TAB_INDEX.save,
                          )
                        }}
                      />
                    ) : (
                      <span className="num-r">{formatCurrency(line.unitPrice)}</span>
                    )
                  )}
                  editor={amountEditor}
                  onBeforeCellEditShow={preventEditOnNewRow}
                  onCellEditComplete={handleCellEditComplete}
                  style={{ width: '160px' }}
                />
                <Column
                  header="Thành tiền"
                  align="right"
                  bodyClassName="cell-number"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID
                      ? <span className="num-r">---</span>
                      : <span className="num-r purchase-line-total">{formatCurrency(line.quantity * line.unitPrice)}</span>
                  )}
                  style={{ width: '160px' }}
                />
                <Column
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <div className="purchase-row-actions">
                        <button
                          type="button"
                          className="icon-btn save-btn"
                          title="Thêm dòng"
                          onClick={handleAppendNewLine}
                          aria-label="Thêm dòng mới"
                          tabIndex={NEW_ROW_TAB_INDEX.save}
                          disabled={!detailEditable}
                        >
                          <i className="pi pi-save" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Xóa nháp dòng mới"
                          onClick={resetNewLineDraft}
                          aria-label="Xóa nháp dòng mới"
                          tabIndex={NEW_ROW_TAB_INDEX.reset}
                          disabled={!detailEditable}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn danger"
                        title={`Xóa ${line.materialCode}`}
                        aria-label={`Xóa ${line.materialCode}`}
                        disabled={!detailEditable}
                        onClick={() => onRemoveDetailLine(line.id)}
                      >
                        <i className="pi pi-trash" />
                      </button>
                    )
                  )}
                  style={{ width: '72px' }}
                />
              </DataTable>
            </div>
          </section>
        </div>

        <aside className="purchase-detail-side">
          <section className="purchase-side-card purchase-side-card-summary">
            <h4>Tổng kết đơn hàng</h4>
            <div className="purchase-side-row"><span>Tổng số NVL:</span><strong>{detailLines.length}</strong></div>
            <div className="purchase-side-row"><span>Tiền hàng:</span><strong className="purchase-side-amount-accent">{formatCurrency(detailSubtotal)} đ</strong></div>
            <p className="purchase-side-note">Giá trên chưa bao gồm phí vận chuyển (nếu có).</p>
          </section>

          <section className="purchase-side-card purchase-side-card-history">
            <h4>Lịch sử thao tác</h4>
            <HistoryTimeline
              events={detailHistoryEvents}
              loading={detailHistoryLoading}
              error={detailHistoryError}
            />
          </section>
        </aside>
      </div>
    </section>
  )
}
