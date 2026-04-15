import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'
import { WizardStepBar } from '../components/inbound/WizardStepBar'
import { getInboundStatusMeta } from '../components/inbound/statusMeta'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import type { InboundWizardState } from '../components/inbound/types'
import { fetchPurchaseRequestDetail, fetchPurchaseRequests } from '../lib/purchaseShortageApi'
import { formatDateValue, formatQuantity, parseDateValue } from '../components/purchaseOrder/format'
import {
  createDraftReceipt,
  deleteDraftReceipt,
  fetchInboundReceiptHistory,
  type InboundReceiptHistoryRowResponse,
  updateDraftReceipt,
  validateInboundReceiptRefFormat,
  validateInboundReceiptRefUniqueness,
} from '../lib/inboundApi'

type PoSummarySnapshot = {
  supplierName: string
  supplierCode: string
  totalItems: number
}

type PoMaterialOption = {
  label: string
  value: string
  code: string
  name: string
  unitDisplay: string
  orderUnit: string
  priceUnit: string
  conversionToBase: number
  priceUnitConversionToBase: number
}

function buildLotSuggestion(materialCode: string, expectedDate?: string): string {
  const code = materialCode.trim().toUpperCase()
  if (!code) return ''

  const rawDate = (expectedDate ?? '').trim()
  const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10)
  const yymmdd = `${baseDate.slice(2, 4)}${baseDate.slice(5, 7)}${baseDate.slice(8, 10)}`

  return `LOT-${code}-${yymmdd}`
}

export function InboundStep2Page() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useRef<InstanceType<typeof Toast>>(null)
  const wizState = (location.state as InboundWizardState | null) ?? {
    step1: { draftCode: '', supplierKeyword: '', poNumber: '', expectedDate: '', receivingWarehouseId: '', receivingWarehouseName: '', transportType: 'road' as const },
    step2: { lotNo: '', unitPrice: null, quantity: null, invoiceNumber: '', invoiceDate: '', mfgDate: '', expDate: '' },
    maxReachedStep: 2,
  }
  const isPosted = wizState.receiptStatus === 'posted'
  const currentStatus = wizState.receiptStatus ?? 'draft'
  const statusMeta = getInboundStatusMeta(currentStatus)
  const step1 = wizState.step1
  const [editDraftCode, setEditDraftCode] = useState(step1.draftCode)

  const [lotNo, setLotNo] = useState(wizState.step2.lotNo)
  const [unitPrice, setUnitPrice] = useState<number | null>(wizState.step2.unitPrice)
  const [quantity, setQuantity] = useState<number | null>(wizState.step2.quantity)
  const [invoiceNumber, setInvoiceNumber] = useState(wizState.step2.invoiceNumber)
  const [invoiceDate, setInvoiceDate] = useState(wizState.step2.invoiceDate)
  const [mfgDate, setMfgDate] = useState(wizState.step2.mfgDate)
  const [expDate, setExpDate] = useState(wizState.step2.expDate)
  const [selectedMaterialId, setSelectedMaterialId] = useState(wizState.step2.selectedMaterialId ?? '')
  const [materialOptions, setMaterialOptions] = useState<PoMaterialOption[]>([])
  const [poSummary, setPoSummary] = useState<PoSummarySnapshot | null>(null)
  const [poSummaryLoading, setPoSummaryLoading] = useState(false)
  const [poSummaryError, setPoSummaryError] = useState<string | null>(null)
  const [lastAutoLotSuggestion, setLastAutoLotSuggestion] = useState('')
  const [draftSaving, setDraftSaving] = useState(false)
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'selectedMaterialId' | 'lotNo' | 'invoiceNumber' | 'invoiceDate' | 'unitPrice' | 'quantity' | 'mfgDate' | 'expDate', string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [draftCodeError, setDraftCodeError] = useState<string | null>(null)

  const mapHistoryRows = (rows: InboundReceiptHistoryRowResponse[]): HistoryTimelineEvent[] => {
    return rows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      action: row.actionLabel,
      actorName: row.actorName,
      at: row.createdAt,
    }))
  }

  async function handleCancelReceipt() {
    setCancelBusy(true)
    try {
      if (wizState.receiptId) await deleteDraftReceipt(wizState.receiptId)
      navigate('/inbound')
    } catch (err) {
      setCancelDialogVisible(false)
      setCancelBusy(false)
      setFormError(err instanceof Error ? err.message : 'Không thể hủy phiếu. Vui lòng thử lại.')
    } finally {
      setCancelBusy(false)
    }
  }

  const selectedMaterial = useMemo(() => {
    if (selectedMaterialId) {
      const found = materialOptions.find((item) => item.value === selectedMaterialId)
      if (found) return found
    }
    return materialOptions[0] ?? null
  }, [materialOptions, selectedMaterialId])

  function buildCurrentWiz(): InboundWizardState {
    return {
      ...wizState,
      step1: { ...wizState.step1, draftCode: editDraftCode },
      step2: {
        lotNo,
        unitPrice,
        quantity,
        invoiceNumber,
        invoiceDate,
        mfgDate,
        expDate,
        selectedMaterialId: selectedMaterial?.value ?? '',
        selectedMaterialCode: selectedMaterial?.code ?? '',
        selectedMaterialName: selectedMaterial?.name ?? '',
        selectedUnitDisplay: selectedMaterial?.unitDisplay ?? '',
        selectedPriceUnit: selectedMaterial?.priceUnit ?? '',
        selectedUnitConversionToBase: selectedMaterial?.conversionToBase ?? 1,
        selectedPriceUnitConversionToBase: selectedMaterial?.priceUnitConversionToBase ?? 1,
      },
    }
  }

  const maxReachedStep = wizState.maxReachedStep

  const isShortExpiry = useMemo(() => {
    if (!expDate) return false
    const parsed = parseDateValue(expDate)
    if (!parsed) return false
    const sixMonths = new Date()
    sixMonths.setMonth(sixMonths.getMonth() + 6)
    return parsed < sixMonths
  }, [expDate])

  const completion = useMemo(() => {
    let filled = 0
    if (selectedMaterial) filled++
    if (lotNo.trim()) filled++
    if (invoiceNumber.trim()) filled++
    if (invoiceDate.trim()) filled++
    if (unitPrice !== null && unitPrice >= 0) filled++
    if (quantity !== null && quantity >= 0) filled++
    if (mfgDate) filled++
    if (expDate) filled++
    return Math.round((filled / 8) * 100)
  }, [selectedMaterial, lotNo, invoiceNumber, invoiceDate, unitPrice, quantity, mfgDate, expDate])

  const lineAmount = useMemo(() => {
    if (unitPrice === null || unitPrice < 0 || quantity === null || quantity < 0) return null
    const orderUnitConv = selectedMaterial?.conversionToBase ?? 1
    const priceUnitConv = selectedMaterial?.priceUnitConversionToBase ?? 1
    // Công thức: lineAmount = (quantity × orderUnitConversionToBase / priceUnitConversionToBase) × unitPrice
    const result = (quantity * orderUnitConv / priceUnitConv) * unitPrice
    return Math.round(result)
  }, [quantity, unitPrice, selectedMaterial?.conversionToBase, selectedMaterial?.priceUnitConversionToBase])

  useEffect(() => {
    const suggested = buildLotSuggestion(selectedMaterial?.code ?? '', step1.expectedDate)
    if (!suggested) return

    const currentLot = lotNo.trim()
    if (!currentLot || currentLot === lastAutoLotSuggestion) {
      setLotNo(suggested)
      setLastAutoLotSuggestion(suggested)
      return
    }

    setLastAutoLotSuggestion(suggested)
  }, [selectedMaterial?.code, step1.expectedDate])

  useEffect(() => {
    if (!wizState.receiptId) {
      setHistoryEvents([])
      setHistoryError(null)
      setHistoryLoading(false)
      return
    }

    let cancelled = false

    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const rows = await fetchInboundReceiptHistory(wizState.receiptId as string)
        if (cancelled) return
        setHistoryEvents(mapHistoryRows(rows))
      } catch (error) {
        if (cancelled) return
        setHistoryEvents([])
        setHistoryError(error instanceof Error ? error.message : 'Không thể tải lịch sử thao tác phiếu nhập kho.')
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [wizState.receiptId])

  useEffect(() => {
    const poRef = step1.poNumber.trim()
    if (!poRef) {
      setPoSummary(null)
      setMaterialOptions([])
      setPoSummaryError(null)
      setPoSummaryLoading(false)
      return
    }

    let cancelled = false

    const loadPoSummary = async () => {
      setPoSummaryLoading(true)
      setPoSummaryError(null)
      try {
        const list = await fetchPurchaseRequests({ page: 1, limit: 200 })
        if (cancelled) return
        const matched = list.data.find((row) => row.requestRef === poRef)
        if (!matched) {
          setPoSummary(null)
          setMaterialOptions([])
          setPoSummaryError('Không tìm thấy dữ liệu PO cho mã đã chọn.')
          return
        }

        const detail = await fetchPurchaseRequestDetail(matched.id)
        if (cancelled) return
        const options: PoMaterialOption[] = detail.items.map((item) => {
          // quantityNeededBase là đơn vị cơ sở, nên số lượng thực nhập ở Step 2 dùng đơn vị cơ sở.
          const baseUnit = item.product.baseUnitRef?.unitCodeName || item.product.baseUnitRef?.unitName || item.unitDisplay || ''
          const orderUnitFromPo = item.unitDisplay || item.product.orderUnitRef?.unitCodeName || item.product.orderUnitRef?.unitName || baseUnit
          const orderUnit = item.product.orderUnitRef
          const priceUnitName = orderUnit?.unitCodeName || orderUnit?.unitName || 'đơn vị'
          // Vì quantity nhập theo đơn vị cơ sở nên hệ số quy đổi của quantity về base là 1.
          const conversionFactor = 1
          // Bắt buộc dùng hệ số quy đổi từ orderUnitRef.
          const orderUnitPriceConversion = Number(orderUnit?.conversionToBase ?? 1)
          const priceUnitConversionFactor = Number.isFinite(orderUnitPriceConversion) && orderUnitPriceConversion > 0
            ? orderUnitPriceConversion
            : 1
          
          return {
            conversionToBase: conversionFactor,
            value: String(item.product.id),
            code: item.product.code,
            name: item.product.name,
            unitDisplay: baseUnit,
            orderUnit: orderUnitFromPo,
            priceUnit: priceUnitName, // Đơn vị đơn giá từ DB
            priceUnitConversionToBase: priceUnitConversionFactor,
            label: `${item.product.code} - ${item.product.name}`,
          }
        })
        setMaterialOptions(options)
        setSelectedMaterialId((prev) => {
          if (prev && options.some((item) => item.value === prev)) return prev
          return options[0]?.value ?? ''
        })

        setPoSummary({
          supplierName: detail.supplier?.name ?? step1.supplierKeyword,
          supplierCode: detail.supplier?.code ?? '',
          totalItems: detail.items.length,
        })
      } catch (error) {
        if (cancelled) return
        setPoSummary(null)
        setMaterialOptions([])
        setPoSummaryError(error instanceof Error ? error.message : 'Không thể tải dữ liệu PO cho bước 2.')
      } finally {
        if (!cancelled) setPoSummaryLoading(false)
      }
    }

    void loadPoSummary()

    return () => {
      cancelled = true
    }
  }, [step1.poNumber, step1.supplierKeyword])

  const supplierNameDisplay = poSummary?.supplierName || step1.supplierKeyword || '—'
  const supplierCodeDisplay = poSummary?.supplierCode || '—'
  const selectedConversionToBaseRaw = selectedMaterial?.conversionToBase ?? wizState.step2.selectedUnitConversionToBase ?? 1
  const selectedConversionToBase = Number.isFinite(selectedConversionToBaseRaw) && selectedConversionToBaseRaw > 0
    ? selectedConversionToBaseRaw
    : 1
  const selectedUnitLabel = (selectedMaterial?.unitDisplay || wizState.step2.selectedUnitDisplay || '').trim()
  const quantityUnitLabel = selectedUnitLabel || 'đơn vị cơ sở'
  const orderUnitLabel = (selectedMaterial?.orderUnit || '').trim() || 'đơn vị đặt hàng'
  const priceUnitLabel = (selectedMaterial?.priceUnit || wizState.step2.selectedPriceUnit || '').trim() || 'đơn vị tính đơn giá'

  async function handleSaveDraft() {
    const receiptRefFormatError = validateInboundReceiptRefFormat(editDraftCode)
    if (receiptRefFormatError) {
      setDraftCodeError(receiptRefFormatError)
      return
    }

    const receiptRefDuplicateError = await validateInboundReceiptRefUniqueness(editDraftCode, wizState.receiptId)
    if (receiptRefDuplicateError) {
      setDraftCodeError(receiptRefDuplicateError)
      return
    }

    setDraftCodeError(null)
    setDraftSaving(true)
    try {
      const currentWiz = buildCurrentWiz()
      const payload = {
        receiptRef: editDraftCode,
        purchaseRequestRef: step1.poNumber || undefined,
        supplierName: step1.supplierKeyword || undefined,
        receivingLocationId: step1.receivingWarehouseId || undefined,
        expectedDate: step1.expectedDate || undefined,
        currentStep: 2 as const,
        item: selectedMaterial && lotNo.trim() && quantity !== null && quantity >= 0
          ? {
              productId: selectedMaterial.value,
              lotNo: lotNo.trim(),
              quantityBase: Number((quantity * selectedConversionToBase).toFixed(4)),
              quantityDisplay: quantity,
              unitUsed: selectedMaterial.unitDisplay || 'kg',
              unitPricePerKg: unitPrice ?? 0,
              lineAmount: lineAmount ?? 0,
              invoiceNumber: invoiceNumber || undefined,
              invoiceDate: invoiceDate || undefined,
              manufactureDate: mfgDate || undefined,
              expiryDate: expDate || undefined,
            }
          : undefined,
      }
      const result = wizState.receiptId
        ? await updateDraftReceipt(wizState.receiptId, payload)
        : await createDraftReceipt(payload)

      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const rows = await fetchInboundReceiptHistory(result.id)
        setHistoryEvents(mapHistoryRows(rows))
      } catch (error) {
        setHistoryEvents([])
        setHistoryError(error instanceof Error ? error.message : 'Không thể tải lịch sử thao tác phiếu nhập kho.')
      } finally {
        setHistoryLoading(false)
      }

      navigate(location.pathname, {
        replace: true,
        state: { ...currentWiz, receiptId: result.id, currentStep: result.currentStep, step1: { ...currentWiz.step1, draftCode: result.receiptRef } },
      })
      setEditDraftCode(result.receiptRef)
      toast.current?.show({
        severity: 'success',
        summary: 'Lưu bản nháp thành công',
        detail: 'Dữ liệu đã được cập nhật vào phiếu nháp.',
        life: 3000,
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Không thể lưu bản nháp',
        detail: err instanceof Error ? err.message : 'Lỗi khi lưu bản nháp.',
        life: 4000,
      })
    } finally {
      setDraftSaving(false)
    }
  }

  function validateBeforeNext(): boolean {
    const errors: Partial<Record<'selectedMaterialId' | 'lotNo' | 'invoiceNumber' | 'invoiceDate' | 'unitPrice' | 'quantity' | 'mfgDate' | 'expDate', string>> = {}

    if (!lotNo.trim()) errors.lotNo = 'Vui lòng nhập LOT NO.'
    if (!invoiceNumber.trim()) errors.invoiceNumber = 'Vui lòng nhập số hóa đơn.'
    if (!invoiceDate.trim()) errors.invoiceDate = 'Vui lòng chọn ngày hóa đơn.'
    if (unitPrice == null || unitPrice < 0) errors.unitPrice = 'Vui lòng nhập đơn giá hợp lệ (không âm).'
    if (quantity == null || quantity < 0) errors.quantity = 'Vui lòng nhập số lượng thực nhập hợp lệ (không âm).'
    if (!mfgDate.trim()) errors.mfgDate = 'Vui lòng chọn ngày sản xuất (MFG).'
    if (!expDate.trim()) errors.expDate = 'Vui lòng chọn hạn sử dụng (EXP).'

    const mfg = parseDateValue(mfgDate)
    const exp = parseDateValue(expDate)
    if (mfg && exp && exp < mfg) {
      errors.expDate = 'Hạn sử dụng (EXP) phải lớn hơn hoặc bằng ngày sản xuất (MFG).'
    }

    if (materialOptions.length > 0 && !selectedMaterial) {
      errors.selectedMaterialId = 'Vui lòng chọn mã nguyên vật liệu từ PO.'
    }

    setFieldErrors(errors)
    setFormError(null)
    return Object.keys(errors).length === 0
  }

  return (
    <section className="inbound-create-shell">
      <Toast ref={toast} position="top-right" />
      <div className="inbound-create-title-row">
        <div>
          <div className="inbound-step4-title-row">
            <h2>Chi tiết Lô hàng Nhập kho</h2>
            <span className={`purchase-detail-draft-tag inbound-title-status-tag ${statusMeta.tone}`}>{statusMeta.label}</span>
          </div>
          <p>Nhập thông tin định danh lô hàng và các mốc thời gian FEFO quan trọng.</p>
          {isPosted ? <p className="inbound-readonly-note">Phiếu đã posted, chỉ được xem, không thể chỉnh sửa.</p> : null}
        </div>
        <span className="inbound-create-code-tag inbound-create-code-editable">
          <InputText
            value={editDraftCode}
            onChange={(e) => {
              setEditDraftCode(e.target.value)
              setDraftCodeError(null)
            }}
            disabled={isPosted}
            placeholder="Mã tham chiếu"
            className={`inbound-create-code-input${draftCodeError ? ' p-invalid' : ''}`}
          />
          {draftCodeError ? <small className="inbound-create-field-error">{draftCodeError}</small> : null}
        </span>
      </div>

      <section className={`inbound-create-card${isPosted ? ' inbound-readonly-card' : ''}`}>
        <WizardStepBar
          activeStep={2}
          maxReachedStep={maxReachedStep}
          navigationLocked={isPosted}
          onNavigate={(s) => {
            const wiz = buildCurrentWiz()
            if (s === 1) navigate('/inbound/new', { state: wiz })
            if (s === 3) navigate('/inbound/new/step3', { state: { ...wiz, maxReachedStep: Math.max(3, maxReachedStep ?? 0) } })
            if (s === 4) navigate('/inbound/new/step4', { state: { ...wiz, maxReachedStep: Math.max(4, maxReachedStep ?? 0) } })
          }}
        />

        <div className="inbound-step-layout-with-history">
          <div className="inbound-step-main">
            <div className="inbound-step2-body">
              <div className="inbound-step2-summary-banner">
            <div className="inbound-step2-material-info">
              <div className="inbound-step2-info-icon-wrap material">
                <i className="pi pi-tag" />
              </div>
              <div>
                <p className="inbound-step2-info-label">Nguyên vật liệu đã chọn</p>
                <Dropdown
                  value={selectedMaterial?.value ?? ''}
                  options={materialOptions}
                  onChange={(e) => {
                    setSelectedMaterialId(String(e.value ?? ''))
                    setFieldErrors((prev) => ({ ...prev, selectedMaterialId: undefined }))
                  }}
                  optionLabel="label"
                  optionValue="value"
                  placeholder={poSummaryLoading ? 'Đang tải mã NVL từ PO...' : 'Chọn mã NVL từ PO'}
                  disabled={poSummaryLoading || materialOptions.length === 0}
                  className="inbound-step2-material-picker"
                  filter
                  showClear={false}
                />
                {fieldErrors.selectedMaterialId ? <small className="inbound-create-field-error">{fieldErrors.selectedMaterialId}</small> : null}
              </div>
            </div>
            <div className="inbound-step2-summary-divider" aria-hidden />
            <div className="inbound-step2-supplier-info">
              <div className="inbound-step2-info-icon-wrap supplier">
                <i className="pi pi-file" />
              </div>
              <div>
                <p className="inbound-step2-info-label">Nhà cung cấp</p>
                <p className="inbound-step2-info-name">{supplierNameDisplay}</p>
                <p className="inbound-step2-info-sub">Mã NCC: {supplierCodeDisplay}</p>
              </div>
            </div>
            <div className="inbound-step2-dvt-tag">ĐV cơ sở: {quantityUnitLabel} · ĐV đặt hàng: {orderUnitLabel} · ĐV đơn giá: {priceUnitLabel}</div>
          </div>
          {poSummaryLoading ? <p className="inbound-step2-info-sub">Đang tải dữ liệu PO...</p> : null}
          {poSummaryError ? <p className="inbound-step2-info-sub">{poSummaryError}</p> : null}

              <div className="inbound-step2-columns">
            <div className="inbound-step2-forms">
              <div className="inbound-step2-section-card">
                <div className="inbound-step2-section-header">
                  <i className="pi pi-file" />
                  <h3>Thông tin Lô &amp; Chứng từ</h3>
                </div>
                <p className="inbound-step2-section-sub">Mã LOT phải trùng khớp với nhãn trên bao bì nguyên liệu.</p>
                <div className="inbound-step2-form-grid">
                  <label className="inbound-step2-field">
                    <span>LOT NO <span className="inbound-field-required">*</span></span>
                    <InputText
                      value={lotNo}
                      onChange={(e) => {
                        setLotNo(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, lotNo: undefined }))
                      }}
                      placeholder="VD: LOT-ARBT-240512"
                    />
                    {fieldErrors.lotNo ? <small className="inbound-create-field-error">{fieldErrors.lotNo}</small> : null}
                    {lastAutoLotSuggestion ? (
                      <button
                        type="button"
                        className="inbound-step2-qty-equiv"
                        style={{ textDecoration: 'underline', background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => {
                          setLotNo(lastAutoLotSuggestion)
                          setFieldErrors((prev) => ({ ...prev, lotNo: undefined }))
                        }}
                      >
                        Gợi ý LOT: {lastAutoLotSuggestion}
                      </button>
                    ) : null}
                  </label>
                  <label className="inbound-step2-field">
                    <span>Đơn giá / 1 {priceUnitLabel} (VNĐ) <span className="inbound-field-required">*</span></span>
                    <InputNumber
                      value={unitPrice}
                      onValueChange={(e) => {
                        setUnitPrice(e.value ?? null)
                        setFieldErrors((prev) => ({ ...prev, unitPrice: undefined }))
                      }}
                      placeholder="VD: 4.500.000"
                      prefix="₫ "
                      locale="vi-VN"
                      minFractionDigits={0}
                      maxFractionDigits={0}
                      min={0}
                    />
                    {fieldErrors.unitPrice ? <small className="inbound-create-field-error">{fieldErrors.unitPrice}</small> : null}
                  </label>
                  <label className="inbound-step2-field">
                    <span>Số lượng thực nhập ({quantityUnitLabel}) <span className="inbound-field-required">*</span></span>
                    <div className="inbound-step2-qty-wrap">
                      <InputNumber
                        value={quantity}
                        onValueChange={(e) => {
                          setQuantity(e.value ?? null)
                          setFieldErrors((prev) => ({ ...prev, quantity: undefined }))
                        }}
                        placeholder="VD: 25000"
                        locale="vi-VN"
                        minFractionDigits={0}
                        maxFractionDigits={3}
                        min={0}
                      />
                      <span className="inbound-step2-qty-unit">{quantityUnitLabel}</span>
                    </div>
                    {fieldErrors.quantity ? <small className="inbound-create-field-error">{fieldErrors.quantity}</small> : null}
                    {quantity != null && quantity > 0 && quantityUnitLabel !== priceUnitLabel && (
                      <p className="inbound-step2-qty-equiv">
                        Tương đương: {formatQuantity(quantity * selectedConversionToBase / (selectedMaterial?.priceUnitConversionToBase ?? 1))} {priceUnitLabel}
                      </p>
                    )}
                  </label>
                  <label className="inbound-step2-field">
                    <span>Thành tiền (VNĐ)</span>
                    <InputText
                      value={lineAmount != null ? `₫ ${lineAmount.toLocaleString('vi-VN')}` : ''}
                      readOnly
                      className="inbound-step2-readonly-input"
                      placeholder="Tự tính từ đơn giá và số lượng"
                    />
                  </label>
                  <label className="inbound-step2-field">
                    <span>Số hóa đơn <span className="inbound-field-required">*</span></span>
                    <InputText
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, invoiceNumber: undefined }))
                      }}
                      placeholder="VD: INV-2024-0582"
                    />
                    {fieldErrors.invoiceNumber ? <small className="inbound-create-field-error">{fieldErrors.invoiceNumber}</small> : null}
                  </label>
                  <label className="inbound-step2-field">
                    <span>Ngày hóa đơn <span className="inbound-field-required">*</span></span>
                    <Calendar
                      value={parseDateValue(invoiceDate)}
                      onChange={(e) => {
                        setInvoiceDate(formatDateValue(e.value ?? null) || invoiceDate)
                        setFieldErrors((prev) => ({ ...prev, invoiceDate: undefined }))
                      }}
                      dateFormat="dd/mm/yy"
                      placeholder="dd/MM/yyyy"
                    />
                    {fieldErrors.invoiceDate ? <small className="inbound-create-field-error">{fieldErrors.invoiceDate}</small> : null}
                  </label>
                </div>
              </div>

              <div className="inbound-step2-section-card">
                <div className="inbound-step2-section-header">
                  <i className="pi pi-clock" />
                  <h3>Thời hạn FEFO &amp; Lưu kho</h3>
                </div>
                <p className="inbound-step2-section-sub">
                  Kiểm soát ngày sản xuất và hạn sử dụng để hệ thống tự động tính toán xuất kho.
                </p>
                <div className="inbound-step2-form-grid">
                  <label className="inbound-step2-field">
                    <span>Ngày sản xuất (MFG) <span className="inbound-field-required">*</span></span>
                    <Calendar
                      value={parseDateValue(mfgDate)}
                      onChange={(e) => {
                        setMfgDate(formatDateValue(e.value ?? null) || mfgDate)
                        setFieldErrors((prev) => ({ ...prev, mfgDate: undefined }))
                      }}
                      dateFormat="dd/mm/yy"
                      placeholder="dd/MM/yyyy"
                    />
                    {fieldErrors.mfgDate ? <small className="inbound-create-field-error">{fieldErrors.mfgDate}</small> : null}
                  </label>
                  <div className="inbound-step2-field">
                    <span>Hạn sử dụng (EXP) <span className="inbound-field-required">*</span></span>
                    <Calendar
                      value={parseDateValue(expDate)}
                      onChange={(e) => {
                        setExpDate(formatDateValue(e.value ?? null) || expDate)
                        setFieldErrors((prev) => ({ ...prev, expDate: undefined }))
                      }}
                      dateFormat="dd/mm/yy"
                      placeholder="dd/MM/yyyy"
                    />
                    {fieldErrors.expDate ? <small className="inbound-create-field-error">{fieldErrors.expDate}</small> : null}
                    {isShortExpiry ? (
                      <div className="inbound-step2-exp-warning">
                        <i className="pi pi-exclamation-triangle" />
                        <span>Cảnh báo: Hạn dùng ngắn (dưới 6 tháng)</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="inbound-step2-fefo-note">
                  <i className="pi pi-info-circle" />
                  <p>
                    <strong>Ghi chú FEFO:</strong> Hệ thống sẽ ưu tiên đề xuất xuất các lô hàng có{' '}
                    <strong className="inbound-step2-fefo-highlight">Hạn sử dụng (EXP)</strong>{' '}
                    sớm nhất. Việc nhập sai ngày này sẽ ảnh hưởng trực tiếp đến chất lượng sản xuất mỹ phẩm.
                  </p>
                </div>
              </div>
            </div>

            <aside className="inbound-step2-sidebar">
              <div className="inbound-step2-guidance-card">
                <div className="inbound-step2-guidance-header">
                  <i className="pi pi-info-circle" />
                  <strong>Hướng dẫn nhập liệu</strong>
                </div>
                <div className="inbound-step2-guidance-item">
                  <p className="inbound-guidance-title">Quy tắc đặt LOT:</p>
                  <p className="inbound-guidance-text italic">
                    Nếu NCC không cung cấp số LOT rõ ràng, vui lòng đặt theo cú pháp: [Tên NVL viết tắt]-[Ngày nhập YYYYMMDD].
                  </p>
                </div>
                <hr className="inbound-step2-guidance-divider" />
                <div className="inbound-step2-guidance-item">
                  <p className="inbound-guidance-title">Đơn giá nhập / 1 {priceUnitLabel}:</p>
                  <p className="inbound-guidance-text">
                    Số lượng nhập được ghi nhận theo đơn vị cơ sở: {quantityUnitLabel}.
                    Đơn giá được tính theo đơn vị đơn giá: {priceUnitLabel}.
                  </p>
                </div>
                <hr className="inbound-step2-guidance-divider" />
                <div className="inbound-step2-guidance-item">
                  <p className="inbound-guidance-title">Tính Thành tiền:</p>
                  <p className="inbound-guidance-text">
                    Thành tiền được tính tự động từ công thức quy đổi: <br />
                    <strong>Thành tiền = Số lượng ({quantityUnitLabel}) / hệ số quy đổi {priceUnitLabel} → cơ sở × Đơn giá (VND/{priceUnitLabel})</strong>
                  </p>
                </div>
                <hr className="inbound-step2-guidance-divider" />
                <div className="inbound-step2-guidance-item">
                  <p className="inbound-guidance-title">Kiểm tra nhãn mác:</p>
                  <p className="inbound-guidance-text">
                    Vui lòng đối soát Ngày sản xuất trên COA (Certificate of Analysis) gửi kèm với thông tin in trên bao bì thực tế.
                  </p>
                </div>
              </div>

              <div className="inbound-step2-status-card">
                <div className="inbound-step2-status-header">
                  <span className="inbound-step2-status-dot" aria-hidden />
                  <strong>Trạng thái Form</strong>
                </div>
                <div className="inbound-step2-completion-row">
                  <span>Độ hoàn thiện</span>
                  <span className="inbound-step2-completion-value">{completion}%</span>
                </div>
                <div className="inbound-step2-progress-bar">
                  <div
                    className="inbound-step2-progress-fill"
                    style={{
                      width: `${completion}%`,
                      minWidth: completion > 0 ? '8px' : undefined,
                      background: 'linear-gradient(90deg, #0ea5e9 0%, #22c55e 100%)',
                    }}
                    role="progressbar"
                    aria-valuenow={completion}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="inbound-step2-status-quote">
                  "Hãy đảm bảo đúng đơn vị cơ sở ({quantityUnitLabel}) và đơn vị tính đơn giá ({priceUnitLabel}) trước khi sang bước tải lên chứng từ COA/MSDS."
                </p>
              </div>
            </aside>
              </div>
            </div>
          </div>
          <aside className="inbound-step-history-panel">
            <div className="inbound-step4-section-header">
              <i className="pi pi-history" />
              <span>LỊCH SỬ THAO TÁC</span>
            </div>
            {wizState.receiptId ? (
              <HistoryTimeline
                events={historyEvents}
                loading={historyLoading}
                error={historyError}
                emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
              />
            ) : (
              <p className="purchase-side-note">Lịch sử thao tác sẽ hiển thị sau khi lưu phiếu nháp lần đầu.</p>
            )}
          </aside>
        </div>

        <footer className="inbound-create-footer">
          <p>
            <i className="pi pi-clock" />
            Dữ liệu được tự động lưu nháp sau mỗi 30 giây
          </p>
          <div className="inbound-create-footer-actions">
            <Button
              type="button"
              className="btn btn-ghost inbound-cancel-btn"
              icon="pi pi-trash"
              label="Hủy phiếu"
              disabled={isPosted}
              onClick={() => setCancelDialogVisible(true)}
            />
            <Button
              type="button"
              className="btn btn-ghost"
              icon="pi pi-angle-left"
              label="Quay lại Bước 1"
              onClick={() => navigate('/inbound/new', { state: buildCurrentWiz() })}
            />
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Button
                type="button"
                className="btn btn-ghost"
                icon={draftSaving ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
                label="Lưu bản nháp"
                disabled={draftSaving}
                onClick={() => { void handleSaveDraft() }}
              />
            </span>
            <Button
              type="button"
              className="btn btn-primary inbound-next-btn"
              iconPos="right"
              icon="pi pi-angle-right"
              label="Tiếp tục Bước 3"
              onClick={() => {
                if (!validateBeforeNext()) return
                navigate('/inbound/new/step3', { state: { ...buildCurrentWiz(), maxReachedStep: Math.max(3, maxReachedStep ?? 0) } })
              }}
            />
          </div>
          {formError ? <small className="inbound-create-field-error">{formError}</small> : null}
        </footer>
      </section>

      <Dialog
        visible={cancelDialogVisible}
        onHide={() => setCancelDialogVisible(false)}
        header="Hủy phiếu nhập"
        style={{ width: '360px' }}
        footer={
          <>
            <Button
              label="Xác nhận Hủy"
              icon={cancelBusy ? 'pi pi-spin pi-spinner' : 'pi pi-trash'}
              className="p-button-danger"
              disabled={cancelBusy}
              onClick={() => { void handleCancelReceipt() }}
            />
            <Button
              label="Đóng"
              icon="pi pi-times"
              className="p-button-text"
              disabled={cancelBusy}
              onClick={() => setCancelDialogVisible(false)}
            />
          </>
        }
      >
        <p>Bạn có chắc muốn hủy phiếu này không? Tất cả dữ liệu đã nhập sẽ bị xóa.</p>
      </Dialog>
    </section>
  )
}
