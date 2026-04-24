import { useMemo, useRef, useState } from 'react'
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { fetchInciSuggestions, fetchManufacturerSuggestions, fetchMaterials, type InciSuggestion, type ManufacturerSuggestion } from '../../lib/catalogApi'
import { HistoryTimeline, type HistoryTimelineEvent } from '../shared/HistoryTimeline'
import { formatCurrency, formatQuantity, parseDecimalInput, toEditableNumberString } from './format'
import type { MaterialRow } from '../catalog/types'
import type { PurchaseDraftLine, SupplierOption } from './types'

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
  detailCanOpenInboundDrilldown: boolean
  detailEditable: boolean
  onBack: () => void
  onOpenInboundDrilldown: () => void
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
  detailHistoryEvents: HistoryTimelineEvent[]
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
  detailCanOpenInboundDrilldown,
  detailEditable,
  onBack,
  onOpenInboundDrilldown,
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
    inciName: '',
    manufacturerName: '',
    quantity: 0,
    unit: '',
    orderUnit: '',
    orderUnitConversionToBase: 1,
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
  const [newInciSuggestions, setNewInciSuggestions] = useState<InciSuggestion[]>([])
  const [rowInciValues, setRowInciValues] = useState<Record<string, string>>({})
  const [rowInciSuggestions, setRowInciSuggestions] = useState<Record<string, InciSuggestion[]>>({})
  const inciSearchRequestRef = useRef(0)
  const rowInciSearchRequestRef = useRef<Record<string, number>>({})
  const [newMfrSuggestions, setNewMfrSuggestions] = useState<ManufacturerSuggestion[]>([])
  const [rowMfrSuggestions, setRowMfrSuggestions] = useState<Record<string, ManufacturerSuggestion[]>>({})
  const mfrSearchRequestRef = useRef(0)
  const rowMfrSearchRequestRef = useRef<Record<string, number>>({})

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

  const resolveOrderUnitConversion = (line: PurchaseDraftLine) => {
    const conversion = Number(line.orderUnitConversionToBase)
    return Number.isFinite(conversion) && conversion > 0 ? conversion : 1
  }

  const calculateLineAmount = (line: Pick<PurchaseDraftLine, 'quantity' | 'unitPrice' | 'orderUnitConversionToBase'>) => {
    const quantityBase = Number(line.quantity)
    const unitPrice = Number(line.unitPrice)
    const conversion = Number(line.orderUnitConversionToBase)
    if (!Number.isFinite(quantityBase) || !Number.isFinite(unitPrice)) return 0
    const safeConversion = Number.isFinite(conversion) && conversion > 0 ? conversion : 1
    return (quantityBase / safeConversion) * unitPrice
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
      inciName: '',
      manufacturerName: '',
      quantity: 0,
      unit: '',
      orderUnit: '',
      orderUnitConversionToBase: 1,
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
    setNewInciSuggestions([])
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
      inciName: product.inciName ?? '',
      manufacturerName: '',
      unit: product.unit || line.unit,
      orderUnit: product.orderUnit || line.orderUnit || product.unit || line.unit,
      orderUnitConversionToBase: Number(product.orderUnitConversionToBase) > 0
        ? Number(product.orderUnitConversionToBase)
        : resolveOrderUnitConversion(line),
    })
  }

  const applyProductToDraft = (product: ProductSuggestion) => {
    setNewLineDraft((prev) => ({
      ...prev,
      productId: product.id,
      materialCode: product.code,
      materialName: product.materialName,
      inciName: product.inciName ?? '',
      manufacturerName: '',
      unit: product.unit || prev.unit,
      orderUnit: product.orderUnit || prev.orderUnit || product.unit || prev.unit,
      orderUnitConversionToBase: Number(product.orderUnitConversionToBase) > 0
        ? Number(product.orderUnitConversionToBase)
        : (prev.orderUnitConversionToBase > 0 ? prev.orderUnitConversionToBase : 1),
    }))
  }

  const handleCompleteInci = async (event: AutoCompleteCompleteEvent) => {
    const query = String(event.query ?? '').trim()
    const requestId = inciSearchRequestRef.current + 1
    inciSearchRequestRef.current = requestId
    try {
      const rows = await fetchInciSuggestions(query || undefined)
      if (requestId !== inciSearchRequestRef.current) return
      setNewInciSuggestions(rows)
    } catch {
      if (requestId !== inciSearchRequestRef.current) return
      setNewInciSuggestions([])
    }
  }

  const handleCompleteInciForRow = async (lineId: string, event: AutoCompleteCompleteEvent) => {
    const query = String(event.query ?? '').trim()
    if (!lineId) return
    const nextId = (rowInciSearchRequestRef.current[lineId] ?? 0) + 1
    rowInciSearchRequestRef.current[lineId] = nextId
    try {
      const rows = await fetchInciSuggestions(query || undefined)
      if (nextId !== rowInciSearchRequestRef.current[lineId]) return
      setRowInciSuggestions((prev) => ({ ...prev, [lineId]: rows }))
    } catch {
      if (nextId !== rowInciSearchRequestRef.current[lineId]) return
      setRowInciSuggestions((prev) => ({ ...prev, [lineId]: [] }))
    }
  }

  const renderInciSuggestionItem = (item: InciSuggestion) => (
    <div className="po-inci-suggestion-item">
      <span className="po-inci-name">{item.inciName}</span>
      <span className="po-inci-product">{item.productCode} – {item.productName}</span>
      {(item.manufacturerNames || item.supplierNames || item.poHistoryCount > 0) && (
        <div className="po-inci-meta">
          {item.manufacturerNames ? <span>NSX: {item.manufacturerNames}</span> : null}
          {item.supplierNames ? <span>NCC: {item.supplierNames}</span> : null}
          {item.poHistoryCount > 0 ? <span className="po-inci-po-badge">{item.poHistoryCount} PO</span> : null}
        </div>
      )}
      {item.latestPoRef && (
        <div className="po-inci-latest-po">
          <span className="po-inci-latest-po-header">Phiếu PO gần nhất</span>
          <div className="po-inci-latest-po-grid">
            <span className="po-inci-latest-po-ref">{item.latestPoRef}</span>
            {item.latestPoDate ? (
              <span>{new Date(item.latestPoDate).toLocaleDateString('vi-VN')}</span>
            ) : null}
            {item.latestPoQty != null && item.latestPoUnit ? (
              <span>SL: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(item.latestPoQty)} {item.latestPoUnit}</span>
            ) : null}
            {item.latestPoUnitPrice != null && item.latestPoUnitPrice > 0 ? (
              <span>Đơn giá: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(item.latestPoUnitPrice)} đ</span>
            ) : null}
            {item.latestPoSupplier ? <span>NCC: {item.latestPoSupplier}</span> : null}
            {item.latestPoManufacturer ? <span>NSX: {item.latestPoManufacturer}</span> : null}
          </div>
        </div>
      )}
    </div>
  )

  const handleAppendNewLine = () => {
    if (!detailEditable) {
      return
    }

    const productId = newLineDraft.productId.trim()
    const materialCode = newLineDraft.materialCode.trim()
    const materialName = newLineDraft.materialName.trim()
    const unit = newLineDraft.unit.trim()
    const orderUnit = (newLineDraft.orderUnit || newLineDraft.unit).trim()
    const orderUnitConversionToBase = Number(newLineDraft.orderUnitConversionToBase)
    const quantity = parsePositiveQuantity(newQuantityInput)
    const unitPrice = parseNonNegativeAmount(newUnitPriceInput || '0')

    if (!productId) {
      setNewLineError('Vui lòng chọn product từ gợi ý autocomplete để thêm dòng.')
      return
    }

    if (!materialCode || !materialName || !unit || !orderUnit || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      setNewLineError('Vui lòng nhập đủ mã, tên, ĐVT và số liệu hợp lệ trước khi thêm dòng.')
      return
    }

    if (!Number.isFinite(orderUnitConversionToBase) || orderUnitConversionToBase <= 0) {
      setNewLineError('Đơn vị đặt hàng chưa có tỷ lệ quy đổi hợp lệ. Vui lòng kiểm tra lại danh mục đơn vị.')
      return
    }

    onAppendDetailLine({
      productId,
      materialCode,
      materialName,
      inciName: newLineDraft.inciName,
      manufacturerName: newLineDraft.manufacturerName,
      quantity,
      unit,
      orderUnit,
      orderUnitConversionToBase,
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
          onUpdateDetailLine(line.id, {
            materialCode: nextValue,
            productId: '',
            unit: '',
            orderUnit: '',
            orderUnitConversionToBase: 1,
          })
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
          onUpdateDetailLine(line.id, {
            materialName: nextValue,
            productId: '',
            unit: '',
            orderUnit: '',
            orderUnitConversionToBase: 1,
          })
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
    <InputNumber
      value={Number(options.value ?? 0) || null}
      onValueChange={(e) => options.editorCallback?.(e.value ?? 0)}
      locale="vi-VN"
      minFractionDigits={0}
      maxFractionDigits={3}
      min={0}
      className="num-editor"
      autoFocus
    />
  )

  const amountEditor = (options: any) => (
    <InputNumber
      value={Number(options.value ?? 0) || null}
      onValueChange={(e) => options.editorCallback?.(e.value ?? 0)}
      locale="vi-VN"
      minFractionDigits={0}
      maxFractionDigits={0}
      min={0}
      className="num-editor"
      autoFocus
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
          {detailCanOpenInboundDrilldown ? (
            <Button
              type="button"
              className="btn btn-ghost"
              icon="pi pi-sitemap"
              label="Tra phiếu nhập"
              disabled={detailLoading || detailSaving || detailSubmitting || detailRecalling || detailDeleting}
              onClick={onOpenInboundDrilldown}
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
                                orderUnit: '',
                                orderUnitConversionToBase: 1,
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
                  style={{ width: '280px' }}
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
                            setNewLineDraft((prev) => ({
                              ...prev,
                              productId: '',
                              materialName: nextValue,
                              unit: '',
                              orderUnit: '',
                              orderUnitConversionToBase: 1,
                            }))
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
                  field="inciName"
                  header="INCI Name"
                  body={(line: PurchaseDraftLine) => {
                    if (line.id === NEW_LINE_ID) {
                      return (
                        <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                          <AutoComplete
                            className="po-inline-lookup"
                            inputClassName="po-inline-lookup-input"
                            value={newLineDraft.inciName}
                            suggestions={newInciSuggestions}
                            completeMethod={handleCompleteInci}
                            field="inciName"
                            appendTo={document.body}
                            panelClassName="po-inci-panel"
                            disabled={!detailEditable}
                            onChange={(event) => {
                              const val = typeof event.value === 'string' ? event.value : String((event.value as InciSuggestion)?.inciName ?? '')
                              setNewLineDraft((prev) => ({ ...prev, inciName: val }))
                            }}
                            onSelect={(event) => {
                              const selected = event.value as InciSuggestion
                              inciSearchRequestRef.current += 1
                              setNewInciSuggestions([])
                              const resolvedUnit = selected.baseUnit || selected.orderUnit || 'base'
                              const resolvedOrderUnit = selected.orderUnit || selected.baseUnit || 'base'
                              const resolvedConversion = selected.orderUnitConversionToBase > 0 ? selected.orderUnitConversionToBase : 1
                              const resolvedUnitPrice = selected.latestPoUnitPrice != null && selected.latestPoUnitPrice > 0
                                ? selected.latestPoUnitPrice : 0
                              const resolvedManufacturer = selected.latestPoManufacturer || selected.manufacturerNames || ''
                              // sync code & name lookup display
                              setNewProductLookupValue(selected.productCode)
                              setNewProductNameLookupValue(selected.productName)
                              // seed mfr suggestions so forceSelection blur check passes
                              if (resolvedManufacturer) {
                                setNewMfrSuggestions([{ name: resolvedManufacturer, country: null, productId: selected.productId, productCode: selected.productCode, productName: selected.productName }])
                              }
                              setNewLineDraft((prev) => ({
                                ...prev,
                                productId: selected.productId,
                                materialCode: selected.productCode,
                                materialName: selected.productName,
                                inciName: selected.inciName,
                                manufacturerName: resolvedManufacturer,
                                unit: resolvedUnit,
                                orderUnit: resolvedOrderUnit,
                                orderUnitConversionToBase: resolvedConversion,
                                unitPrice: resolvedUnitPrice,
                              }))
                              if (resolvedUnitPrice > 0) {
                                setNewUnitPriceInput(String(resolvedUnitPrice))
                              }
                            }}
                            itemTemplate={renderInciSuggestionItem}
                            placeholder="Tìm INCI Name…"
                          />
                        </div>
                      )
                    }
                    if (!detailEditable) {
                      return <span className="po-inci-cell">{line.inciName || '---'}</span>
                    }
                    return (
                      <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                        <AutoComplete
                          className="po-inline-lookup"
                          inputClassName="po-inline-lookup-input"
                          value={rowInciValues[line.id] ?? line.inciName}
                          suggestions={rowInciSuggestions[line.id] ?? []}
                          completeMethod={(event) => { void handleCompleteInciForRow(line.id, event) }}
                          field="inciName"
                          appendTo={document.body}
                          panelClassName="po-inci-panel"
                          disabled={!detailEditable}
                          onChange={(event) => {
                            const val = typeof event.value === 'string' ? event.value : String((event.value as InciSuggestion)?.inciName ?? '')
                            setRowInciValues((prev) => ({ ...prev, [line.id]: val }))
                            onUpdateDetailLine(line.id, { inciName: val })
                          }}
                          onSelect={(event) => {
                            const selected = event.value as InciSuggestion
                            rowInciSearchRequestRef.current[line.id] = (rowInciSearchRequestRef.current[line.id] ?? 0) + 1
                            setRowInciSuggestions((prev) => ({ ...prev, [line.id]: [] }))
                            setRowInciValues((prev) => ({ ...prev, [line.id]: selected.inciName }))
                            const resolvedUnit = selected.baseUnit || selected.orderUnit || line.unit || 'base'
                            const resolvedOrderUnit = selected.orderUnit || selected.baseUnit || line.orderUnit || 'base'
                            const resolvedConversion = selected.orderUnitConversionToBase > 0 ? selected.orderUnitConversionToBase : line.orderUnitConversionToBase
                            const resolvedUnitPrice = selected.latestPoUnitPrice != null && selected.latestPoUnitPrice > 0
                              ? selected.latestPoUnitPrice : line.unitPrice
                            const resolvedManufacturer = selected.latestPoManufacturer || selected.manufacturerNames || line.manufacturerName
                            // sync code & name lookup display for this row
                            setRowProductLookupValues((prev) => ({ ...prev, [line.id]: selected.productCode }))
                            setRowProductNameLookupValues((prev) => ({ ...prev, [line.id]: selected.productName }))
                            // seed mfr suggestions so forceSelection blur check passes
                            if (resolvedManufacturer) {
                              setRowMfrSuggestions((prev) => ({ ...prev, [line.id]: [{ name: resolvedManufacturer, country: null, productId: selected.productId, productCode: selected.productCode, productName: selected.productName }] }))
                            }
                            onUpdateDetailLine(line.id, {
                              productId: selected.productId,
                              materialCode: selected.productCode,
                              materialName: selected.productName,
                              inciName: selected.inciName,
                              manufacturerName: resolvedManufacturer,
                              unit: resolvedUnit,
                              orderUnit: resolvedOrderUnit,
                              orderUnitConversionToBase: resolvedConversion,
                              unitPrice: resolvedUnitPrice,
                            })
                          }}
                          itemTemplate={renderInciSuggestionItem}
                          placeholder="Tìm INCI Name…"
                        />
                      </div>
                    )
                  }}
                  style={{ width: '240px' }}
                />
                <Column
                  field="manufacturerName"
                  header="Nhà sản xuất"
                  body={(line: PurchaseDraftLine) => {
                    const isNew = line.id === NEW_LINE_ID
                    const currentValue = isNew ? newLineDraft.manufacturerName : (line.manufacturerName || '')
                    const currentProductId = isNew ? newLineDraft.productId : line.productId
                    const suggestions = isNew ? newMfrSuggestions : (rowMfrSuggestions[line.id] ?? [])

                    const handleComplete = async (e: { query: string }) => {
                      const reqId = isNew
                        ? (++mfrSearchRequestRef.current)
                        : ((rowMfrSearchRequestRef.current[line.id] = (rowMfrSearchRequestRef.current[line.id] ?? 0) + 1), rowMfrSearchRequestRef.current[line.id])
                      const results = await fetchManufacturerSuggestions(e.query, currentProductId || undefined)
                      if (isNew) {
                        if (reqId === mfrSearchRequestRef.current) setNewMfrSuggestions(results)
                      } else {
                        if (reqId === rowMfrSearchRequestRef.current[line.id]) setRowMfrSuggestions((prev) => ({ ...prev, [line.id]: results }))
                      }
                    }

                    return (
                      <AutoComplete
                        value={currentValue}
                        suggestions={suggestions}
                        field="name"
                        completeMethod={handleComplete}
                        itemTemplate={(item: ManufacturerSuggestion) => (
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            {item.country && <div style={{ fontSize: '0.8em', color: '#888' }}>{item.country}</div>}
                            {!currentProductId && <div style={{ fontSize: '0.78em', color: '#aaa' }}>{item.productCode} – {item.productName}</div>}
                          </div>
                        )}
                        onChange={(e) => {
                          const val = typeof e.value === 'string' ? e.value : (e.value as ManufacturerSuggestion)?.name ?? ''
                          if (isNew) {
                            setNewLineDraft((prev) => ({ ...prev, manufacturerName: val }))
                          } else {
                            onUpdateDetailLine(line.id, { manufacturerName: val })
                          }
                        }}
                        onSelect={(e) => {
                          const selected = e.value as ManufacturerSuggestion
                          if (isNew) {
                            mfrSearchRequestRef.current++
                            // keep selected in list so forceSelection blur check passes
                            setNewMfrSuggestions([selected])
                            setNewLineDraft((prev) => ({ ...prev, manufacturerName: selected.name }))
                          } else {
                            rowMfrSearchRequestRef.current[line.id] = (rowMfrSearchRequestRef.current[line.id] ?? 0) + 1
                            setRowMfrSuggestions((prev) => ({ ...prev, [line.id]: [selected] }))
                            onUpdateDetailLine(line.id, { manufacturerName: selected.name })
                          }
                        }}
                        forceSelection={true}
                        dropdown={false}
                        placeholder="Nhà sản xuất..."
                        style={{ width: '100%' }}
                        inputStyle={{ width: '100%' }}
                      />
                    )
                  }}
                  style={{ width: '180px' }}
                />
                <Column
                  field="quantity"
                  header="Số lượng"
                  align="right"
                  bodyClassName="cell-number"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <InputNumber
                        value={newLineDraft.quantity || null}
                        onValueChange={(e) => {
                          const val = e.value ?? 0
                          setNewQuantityInput(String(val))
                          setNewLineDraft((prev) => ({ ...prev, quantity: val }))
                        }}
                        locale="vi-VN"
                        minFractionDigits={0}
                        maxFractionDigits={3}
                        min={0}
                        placeholder="0"
                        className="num-editor"
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
                  header="ĐVT cơ sở"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID
                      ? <span tabIndex={-1}>{newLineDraft.unit || '---'}</span>
                      : <span>{line.unit || '---'}</span>
                  )}
                  style={{ width: '90px' }}
                />
                <Column
                  field="unitPrice"
                  header="Đơn giá / ĐVĐH (VND)"
                  align="right"
                  bodyClassName="cell-number"
                  body={(line: PurchaseDraftLine) => (
                    line.id === NEW_LINE_ID ? (
                      <InputNumber
                        value={newLineDraft.unitPrice || null}
                        onValueChange={(e) => {
                          const val = e.value ?? 0
                          setNewUnitPriceInput(String(val))
                          setNewLineDraft((prev) => ({ ...prev, unitPrice: val }))
                        }}
                        locale="vi-VN"
                        minFractionDigits={0}
                        maxFractionDigits={0}
                        min={0}
                        placeholder="0"
                        className="num-editor"
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
                  body={(line: PurchaseDraftLine) => {
                    if (line.id === NEW_LINE_ID) {
                      const amt = calculateLineAmount({ ...newLineDraft })
                      return <span className="num-r">{amt > 0 ? formatCurrency(amt) : '---'}</span>
                    }
                    return <span className="num-r purchase-line-total">{formatCurrency(calculateLineAmount(line))}</span>
                  }}
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
