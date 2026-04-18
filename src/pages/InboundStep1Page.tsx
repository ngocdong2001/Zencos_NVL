import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import { WizardStepBar } from '../components/inbound/WizardStepBar'
import { getInboundStatusMeta } from '../components/inbound/statusMeta'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import type { InboundStep1State, InboundWizardState } from '../components/inbound/types'
import { fetchBasics } from '../lib/catalogApi'
import {
  fetchPurchaseRequestDetail,
  fetchPurchaseRequestInboundDrilldown,
  fetchPurchaseRequests,
  type PurchaseRequestInboundDrilldownResponse,
} from '../lib/purchaseShortageApi'
import { formatDateValue, parseDateValue } from '../components/purchaseOrder/format'
import { PurchaseOrderLineSummarySection } from '../components/purchaseOrder/PurchaseOrderLineSummarySection'
import {
  createDraftReceipt,
  deleteDraftReceipt,
  fetchInboundReceiptHistory,
  type InboundReceiptHistoryRowResponse,
  updateDraftReceipt,
  validateInboundReceiptRefFormat,
  validateInboundReceiptRefUniqueness,
} from '../lib/inboundApi'

type SelectOption = {
  label: string
  value: string
  purchaseId?: string
  poStatus?: string
  poConditionLabel?: 'New' | 'Nhận 1 phần hàng'
  supplierName?: string
  warehouseId?: string
  warehouseName?: string
  expectedDate?: string
}

const INBOUND_ELIGIBLE_PO_STATUSES = new Set(['submitted', 'approved', 'ordered', 'partially_received'])

function normalizeApiDate(value?: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function buildDraftCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 9999)).padStart(4, '0')
  return `NK-${year}${month}${day}-${seq}`
}

export function InboundStep1Page() {
  const navigate = useNavigate()
  const location = useLocation()
  const raw = location.state as InboundWizardState | InboundStep1State | null
  // Support both full InboundWizardState (from back-navigation) and bare InboundStep1State (initial entry)
  const isFullWizard = !!raw && 'step1' in (raw as object)
  const step1Init: InboundStep1State | null = isFullWizard
    ? (raw as InboundWizardState).step1
    : (raw as InboundStep1State | null)
  const wizRest: Omit<InboundWizardState, 'step1'> = isFullWizard
    ? {
      receiptId: (raw as InboundWizardState).receiptId,
      receiptStatus: (raw as InboundWizardState).receiptStatus,
      step2: (raw as InboundWizardState).step2,
      step3: (raw as InboundWizardState).step3,
      maxReachedStep: (raw as InboundWizardState).maxReachedStep,
    }
    : { step2: { lotNo: '', unitPrice: null, quantity: null, invoiceNumber: '', invoiceDate: '', mfgDate: '', expDate: '' }, maxReachedStep: 1 }
  const receiptId = wizRest.receiptId
  const currentStatus = wizRest.receiptStatus ?? 'draft'
  const isPosted = wizRest.receiptStatus === 'posted'
  const statusMeta = getInboundStatusMeta(currentStatus)

  const [draftCode, setDraftCode] = useState(() => step1Init?.draftCode ?? buildDraftCode())
  const [supplierKeyword, setSupplierKeyword] = useState(step1Init?.supplierKeyword ?? '')
  const [poNumber, setPoNumber] = useState(step1Init?.poNumber ?? '')
  const [expectedDate, setExpectedDate] = useState(step1Init?.expectedDate ?? '')
  const [receivingWarehouseId, setReceivingWarehouseId] = useState(step1Init?.receivingWarehouseId ?? '')
  const [receivingWarehouseName, setReceivingWarehouseName] = useState(step1Init?.receivingWarehouseName ?? '')
  const transportType = step1Init?.transportType ?? 'road'
  const [supplierOptions, setSupplierOptions] = useState<SelectOption[]>([])
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierError, setSupplierError] = useState<string | null>(null)
  const [warehouseOptions, setWarehouseOptions] = useState<SelectOption[]>([])
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [warehouseError, setWarehouseError] = useState<string | null>(null)
  const [poOptions, setPoOptions] = useState<SelectOption[]>([])
  const [poLoading, setPoLoading] = useState(false)
  const [poError, setPoError] = useState<string | null>(null)
  const [showPoDialog, setShowPoDialog] = useState(false)
  const [showPoDetailDialog, setShowPoDetailDialog] = useState(false)
  const [selectedPoDetailRef, setSelectedPoDetailRef] = useState('')
  const [poDetailLoading, setPoDetailLoading] = useState(false)
  const [poDetailError, setPoDetailError] = useState<string | null>(null)
  const [poDetailData, setPoDetailData] = useState<PurchaseRequestInboundDrilldownResponse | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'draftCode' | 'poNumber' | 'supplierKeyword' | 'receivingWarehouseId' | 'expectedDate', string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

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
      if (receiptId) await deleteDraftReceipt(receiptId)
      navigate('/inbound')
    } catch (err) {
      setCancelDialogVisible(false)
      setCancelBusy(false)
      setFormError(err instanceof Error ? err.message : 'Không thể hủy phiếu. Vui lòng thử lại.')
    } finally {
      setCancelBusy(false)
    }
  }

  useEffect(() => {
    if (!receiptId) {
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
        const rows = await fetchInboundReceiptHistory(receiptId)
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
  }, [receiptId])

  useEffect(() => {
    let cancelled = false

    const loadSuppliers = async () => {
      setSupplierLoading(true)
      setSupplierError(null)
      try {
        const rows = await fetchBasics('suppliers')
        if (cancelled) return
        setSupplierOptions(
          rows
            .filter((row) => row.name)
            .map((row) => ({
              value: row.name,
              label: row.code ? `${row.code} - ${row.name}` : row.name,
            })),
        )
      } catch (error) {
        if (cancelled) return
        setSupplierError(error instanceof Error ? error.message : 'Không thể tải danh sách nhà cung cấp.')
      } finally {
        if (!cancelled) setSupplierLoading(false)
      }
    }

    void loadSuppliers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadWarehouses = async () => {
      setWarehouseLoading(true)
      setWarehouseError(null)
      try {
        const rows = await fetchBasics('locations')
        if (cancelled) return
        setWarehouseOptions(
          rows
            .filter((row) => row.id && row.name)
            .map((row) => ({
              value: row.id,
              label: row.code ? `${row.code} - ${row.name}` : row.name,
              warehouseId: row.id,
              warehouseName: row.name,
            })),
        )
      } catch (error) {
        if (cancelled) return
        setWarehouseError(error instanceof Error ? error.message : 'Không thể tải danh sách kho nhận hàng.')
      } finally {
        if (!cancelled) setWarehouseLoading(false)
      }
    }

    void loadWarehouses()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPurchaseOrders = async () => {
      setPoLoading(true)
      setPoError(null)
      try {
        const response = await fetchPurchaseRequests({ page: 1, limit: 200 })
        if (cancelled) return
        setPoOptions(
          response.data.map((row) => ({
            purchaseId: row.id,
            value: row.requestRef,
            label: row.supplier?.name ? `${row.requestRef} - ${row.supplier.name}` : row.requestRef,
            poStatus: row.status,
            poConditionLabel: row.status === 'partially_received' ? 'Nhận 1 phần hàng' : 'New',
            supplierName: row.supplier?.name ?? '',
            warehouseId: row.receivingLocation?.id ?? '',
            warehouseName: row.receivingLocation?.name ?? '',
            expectedDate: normalizeApiDate(row.expectedDate),
          })),
        )
      } catch (error) {
        if (cancelled) return
        setPoError(error instanceof Error ? error.message : 'Không thể tải danh sách đơn mua hàng.')
      } finally {
        if (!cancelled) setPoLoading(false)
      }
    }

    void loadPurchaseOrders()

    return () => {
      cancelled = true
    }
  }, [])

  const supplierDropdownOptions = useMemo(() => {
    if (!supplierKeyword.trim()) return supplierOptions
    const exists = supplierOptions.some((option) => option.value === supplierKeyword)
    return exists ? supplierOptions : [{ value: supplierKeyword, label: supplierKeyword }, ...supplierOptions]
  }, [supplierKeyword, supplierOptions])

  const filteredPoOptions = useMemo(() => {
    const bySupplier = supplierKeyword.trim()
      ? poOptions.filter((option) => !option.supplierName || option.supplierName === supplierKeyword)
      : poOptions

    // Posted receipts are read-only, but still need to display linked PO regardless of current PO status.
    if (isPosted) return bySupplier

    return bySupplier.filter((option) => INBOUND_ELIGIBLE_PO_STATUSES.has(option.poStatus ?? ''))
  }, [isPosted, poOptions, supplierKeyword])

  const poDialogRows = useMemo(
    () => filteredPoOptions.map((option) => ({
      purchaseId: option.purchaseId ?? '',
      requestRef: option.value,
      supplierName: option.supplierName || '—',
      poConditionLabel: option.poConditionLabel || 'New',
    })),
    [filteredPoOptions],
  )

  const openPoDetailDialog = async (purchaseId: string, requestRef: string) => {
    if (!purchaseId) return
    setSelectedPoDetailRef(requestRef)
    setShowPoDetailDialog(true)
    setPoDetailLoading(true)
    setPoDetailError(null)
    setPoDetailData(null)

    try {
      const detail = await fetchPurchaseRequestInboundDrilldown(purchaseId)
      setPoDetailData(detail)
    } catch (error) {
      setPoDetailError(error instanceof Error ? error.message : 'Không thể tải chi tiết dòng PO.')
    } finally {
      setPoDetailLoading(false)
    }
  }

  const selectedPoOption = useMemo(
    () => poOptions.find((option) => option.value === poNumber) ?? null,
    [poNumber, poOptions],
  )

  const warehouseDropdownOptions = useMemo(() => {
    if (!receivingWarehouseId.trim()) return warehouseOptions
    const exists = warehouseOptions.some((option) => option.value === receivingWarehouseId)
    if (exists) return warehouseOptions
    return [{ value: receivingWarehouseId, label: receivingWarehouseName || receivingWarehouseId, warehouseId: receivingWarehouseId, warehouseName: receivingWarehouseName }, ...warehouseOptions]
  }, [receivingWarehouseId, receivingWarehouseName, warehouseOptions])

  useEffect(() => {
    if (!selectedPoOption) return

    if (selectedPoOption.supplierName && selectedPoOption.supplierName !== supplierKeyword) {
      setSupplierKeyword(selectedPoOption.supplierName)
    }

    if (selectedPoOption.warehouseId && selectedPoOption.warehouseId !== receivingWarehouseId) {
      setReceivingWarehouseId(selectedPoOption.warehouseId)
    }

    if (selectedPoOption.warehouseName && selectedPoOption.warehouseName !== receivingWarehouseName) {
      setReceivingWarehouseName(selectedPoOption.warehouseName)
    }

    if (selectedPoOption.expectedDate && selectedPoOption.expectedDate !== expectedDate) {
      setExpectedDate(selectedPoOption.expectedDate)
    }
  }, [expectedDate, receivingWarehouseId, receivingWarehouseName, selectedPoOption, supplierKeyword])

  useEffect(() => {
    if (!selectedPoOption?.purchaseId) return

    let cancelled = false

    const loadPurchaseOrderDetail = async () => {
      try {
        const detail = await fetchPurchaseRequestDetail(selectedPoOption.purchaseId as string)
        if (cancelled) return

        if (detail.supplier?.name && detail.supplier.name !== supplierKeyword) {
          setSupplierKeyword(detail.supplier.name)
        }

        if (detail.receivingLocation?.id) {
          const nextWarehouseId = String(detail.receivingLocation.id)
          if (nextWarehouseId !== receivingWarehouseId) setReceivingWarehouseId(nextWarehouseId)
        }

        if (detail.receivingLocation?.name && detail.receivingLocation.name !== receivingWarehouseName) {
          setReceivingWarehouseName(detail.receivingLocation.name)
        }

        const nextExpectedDate = normalizeApiDate(detail.expectedDate)
        if (nextExpectedDate && nextExpectedDate !== expectedDate) {
          setExpectedDate(nextExpectedDate)
        }
      } catch {
        // Keep list-derived values if detail fetch fails.
      }
    }

    void loadPurchaseOrderDetail()

    return () => {
      cancelled = true
    }
  }, [expectedDate, receivingWarehouseId, receivingWarehouseName, selectedPoOption, supplierKeyword])

  const isSupplierLockedByPo = !!selectedPoOption?.supplierName

  function buildCurrentWiz(): InboundWizardState {
    const s1: InboundStep1State = {
      draftCode,
      supplierKeyword,
      poNumber,
      expectedDate,
      receivingWarehouseId,
      receivingWarehouseName,
      transportType,
    }
    return { ...wizRest, step1: s1 }
  }

  async function handleNext() {
    const errors: Partial<Record<'draftCode' | 'poNumber' | 'supplierKeyword' | 'receivingWarehouseId' | 'expectedDate', string>> = {}
    const receiptRefFormatError = validateInboundReceiptRefFormat(draftCode)
    if (receiptRefFormatError) errors.draftCode = receiptRefFormatError
    if (!poNumber.trim()) errors.poNumber = 'Vui lòng chọn mã đơn mua hàng (PO Number).'
    if (!supplierKeyword.trim()) errors.supplierKeyword = 'Vui lòng chọn nhà cung cấp.'
    if (!receivingWarehouseId.trim()) errors.receivingWarehouseId = 'Vui lòng chọn kho nhận hàng.'
    if (!expectedDate.trim()) errors.expectedDate = 'Vui lòng chọn ngày nhận hàng.'

    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) {
      return
    }

    const receiptRefDuplicateError = await validateInboundReceiptRefUniqueness(draftCode, receiptId)
    if (receiptRefDuplicateError) {
      setFieldErrors((prev) => ({ ...prev, draftCode: receiptRefDuplicateError }))
      return
    }

    const wizState = buildCurrentWiz()
    try {
      const payload = {
        receiptRef: draftCode,
        purchaseRequestRef: poNumber || undefined,
        supplierName: supplierKeyword || undefined,
        receivingLocationId: receivingWarehouseId || undefined,
        expectedDate: expectedDate || undefined,
        currentStep: 2 as const,
      }

      const result = receiptId
        ? await updateDraftReceipt(receiptId, payload)
        : await createDraftReceipt(payload)

      navigate('/inbound/new/step2', {
        state: {
          ...wizState,
          receiptId: result.id,
          currentStep: result.currentStep,
          maxReachedStep: Math.max(2, wizState.maxReachedStep ?? 0),
        },
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu phiếu nháp ở Bước 1.')
    }
  }

  return (
    <section className="inbound-create-shell">
      <div className="inbound-create-title-row">
        <div>
          <div className="inbound-step4-title-row">
            <h2>Nhập Kho (Material Import)</h2>
            <span className={`purchase-detail-draft-tag inbound-title-status-tag ${statusMeta.tone}`}>{statusMeta.label}</span>
          </div>
          <p>Khởi tạo phiếu nhập kho nguyên vật liệu và cập nhật tồn kho hệ thống.</p>
          {isPosted ? <p className="inbound-readonly-note">Phiếu đã posted, chỉ được xem, không thể chỉnh sửa.</p> : null}
        </div>
        <span className="inbound-create-code-tag inbound-create-code-editable">
          <InputText
            value={draftCode}
            onChange={(e) => {
              setDraftCode(e.target.value)
              setFieldErrors((prev) => ({ ...prev, draftCode: undefined }))
            }}
            disabled={isPosted}
            placeholder="Mã tham chiếu"
            className={`inbound-create-code-input${fieldErrors.draftCode ? ' p-invalid' : ''}`}
          />
          {fieldErrors.draftCode ? <small className="inbound-create-field-error">{fieldErrors.draftCode}</small> : null}
        </span>
      </div>

      <section className={`inbound-create-card${isPosted ? ' inbound-readonly-card' : ''}`}>
        <WizardStepBar 
          activeStep={1} 
          maxReachedStep={wizRest.maxReachedStep}
          navigationLocked={isPosted}
          onNavigate={(s) => {
            const wiz = buildCurrentWiz()
            if (s === 2) navigate('/inbound/new/step2', { state: { ...wiz, maxReachedStep: Math.max(2, wiz.maxReachedStep ?? 0) } })
            if (s === 3) navigate('/inbound/new/step3', { state: { ...wiz, maxReachedStep: Math.max(3, wiz.maxReachedStep ?? 0) } })
            if (s === 4) navigate('/inbound/new/step4', { state: { ...wiz, maxReachedStep: Math.max(4, wiz.maxReachedStep ?? 0) } })
          }}
        />

        <div className="inbound-step-layout-with-history">
          <div className="inbound-step-main">
            <div className="inbound-create-body">
              <div className="inbound-create-col-left">
            <label className="inbound-create-field">
              <span className="inbound-po-label-row">
                <span>Mã đơn mua hàng (PO Number)</span>
                <Button
                  type="button"
                  className="btn btn-ghost inbound-po-list-btn"
                  label="Danh sách PO"
                  icon="pi pi-list"
                  onClick={() => setShowPoDialog(true)}
                />
              </span>
              <Dropdown
                value={poNumber}
                options={filteredPoOptions}
                onChange={(e) => {
                  const nextPoNumber = String(e.value ?? '')
                  setPoNumber(nextPoNumber)
                  setFieldErrors((prev) => ({ ...prev, poNumber: undefined }))
                  const selectedOption = filteredPoOptions.find((option) => option.value === nextPoNumber)
                  if (selectedOption?.supplierName) setSupplierKeyword(selectedOption.supplierName)
                  if (selectedOption?.warehouseId) setReceivingWarehouseId(selectedOption.warehouseId)
                  if (selectedOption?.warehouseName) setReceivingWarehouseName(selectedOption.warehouseName)
                  if (selectedOption?.expectedDate) setExpectedDate(selectedOption.expectedDate)
                }}
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn đơn mua hàng"
                filter
                showClear
                loading={poLoading}
                emptyMessage="Không có đơn mua hàng phù hợp"
                className="inbound-create-dropdown"
              />
              {fieldErrors.poNumber ? <small className="inbound-create-field-error">{fieldErrors.poNumber}</small> : null}
              {poError ? <small className="inbound-create-field-error">{poError}</small> : null}
            </label>

            <label className="inbound-create-field">
              <span>Nhà cung cấp (Supplier)</span>
              <Dropdown
                value={supplierKeyword}
                options={supplierDropdownOptions}
                onChange={(e) => {
                  setSupplierKeyword(String(e.value ?? ''))
                  setFieldErrors((prev) => ({ ...prev, supplierKeyword: undefined }))
                }}
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn nhà cung cấp"
                filter
                showClear
                editable
                loading={supplierLoading}
                disabled={supplierLoading || isSupplierLockedByPo}
                emptyMessage="Không có nhà cung cấp phù hợp"
                className="inbound-create-dropdown"
              />
              {fieldErrors.supplierKeyword ? <small className="inbound-create-field-error">{fieldErrors.supplierKeyword}</small> : null}
              {supplierError ? <small className="inbound-create-field-error">{supplierError}</small> : null}
              {isSupplierLockedByPo ? <small className="inbound-create-field-error">Nhà cung cấp được lấy tự động từ phiếu PO đã chọn.</small> : null}
            </label>
          </div>

              <div className="inbound-create-col-right">
            <label className="inbound-create-field">
              <span>
                <i className="pi pi-calendar" />
                Ngày nhận hàng
              </span>
              <Calendar
                value={parseDateValue(expectedDate)}
                onChange={(e) => {
                  setExpectedDate(formatDateValue(e.value ?? null) || expectedDate)
                  setFieldErrors((prev) => ({ ...prev, expectedDate: undefined }))
                }}
                dateFormat="dd/mm/yy"
                inputClassName="inbound-create-calendar-input"
              />
              {fieldErrors.expectedDate ? <small className="inbound-create-field-error">{fieldErrors.expectedDate}</small> : null}
            </label>

            <div className="inbound-create-field">
              <span>Kho nhận (Warehouse)</span>
              <Dropdown
                value={receivingWarehouseId}
                options={warehouseDropdownOptions}
                onChange={(e) => {
                  const nextWarehouseId = String(e.value ?? '')
                  setReceivingWarehouseId(nextWarehouseId)
                  setFieldErrors((prev) => ({ ...prev, receivingWarehouseId: undefined }))
                  const selectedOption = warehouseDropdownOptions.find((option) => option.value === nextWarehouseId)
                  setReceivingWarehouseName(selectedOption?.warehouseName ?? '')
                }}
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn kho nhận hàng"
                filter
                showClear
                loading={warehouseLoading}
                disabled={warehouseLoading}
                emptyMessage="Không có kho nhận hàng phù hợp"
                className="inbound-create-dropdown"
              />
              {fieldErrors.receivingWarehouseId ? <small className="inbound-create-field-error">{fieldErrors.receivingWarehouseId}</small> : null}
              {warehouseError ? <small className="inbound-create-field-error">{warehouseError}</small> : null}
            </div>

            <article className="inbound-create-note-box">
              <i className="pi pi-info-circle" />
              <p>
                Thông tin nhà cung cấp cần khớp với hồ sơ COA sẽ tải lên ở Bước 3 để hệ thống tự động đối soát
                thông tin lô hàng.
              </p>
            </article>
              </div>
            </div>
          </div>
          <aside className="inbound-step-history-panel">
            <div className="inbound-step4-section-header">
              <i className="pi pi-history" />
              <span>LỊCH SỬ THAO TÁC</span>
            </div>
            {receiptId ? (
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
              label="Quay lại"
              onClick={() => navigate('/inbound')}
            />
            <Button
              type="button"
              className="btn btn-primary inbound-next-btn"
              iconPos="right"
              icon="pi pi-angle-right"
              label="Tiếp tục Bước 2"
              onClick={() => { void handleNext() }}
            />
          </div>
          {formError ? <small className="inbound-create-field-error">{formError}</small> : null}

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
        </footer>
      </section>

      <Dialog
        header="Danh sách phiếu PO hợp điều kiện"
        visible={showPoDialog}
        onHide={() => setShowPoDialog(false)}
        style={{ width: 'min(900px, 95vw)' }}
        modal
      >
        <DataTable
          value={poDialogRows}
          paginator
          rows={8}
          rowsPerPageOptions={[8, 20, 50]}
          emptyMessage="Không có phiếu PO phù hợp"
          className="inbound-po-dialog-table"
          size="small"
        >
          <Column field="requestRef" header="Mã PO" sortable />
          <Column field="supplierName" header="Nhà cung cấp" sortable />
          <Column
            field="poConditionLabel"
            header="Tình trạng"
            body={(row: { poConditionLabel: 'New' | 'Nhận 1 phần hàng' }) => (
              <Tag
                value={row.poConditionLabel}
                severity={row.poConditionLabel === 'Nhận 1 phần hàng' ? 'warning' : 'success'}
              />
            )}
          />
          <Column
            header="Thao tác"
            body={(row: { purchaseId: string; requestRef: string }) => (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  label="Xem chi tiết"
                  className="btn btn-ghost"
                  onClick={() => { void openPoDetailDialog(row.purchaseId, row.requestRef) }}
                />
                <Button
                  type="button"
                  label="Chọn"
                  className="btn btn-primary"
                  onClick={() => {
                    setPoNumber(row.requestRef)
                    setShowPoDialog(false)
                  }}
                />
              </div>
            )}
          />
        </DataTable>
      </Dialog>

      <Dialog
        header={selectedPoDetailRef ? `Chi tiết dòng PO - ${selectedPoDetailRef}` : 'Chi tiết dòng PO'}
        visible={showPoDetailDialog}
        onHide={() => setShowPoDetailDialog(false)}
        style={{ width: 'min(1200px, 96vw)' }}
        modal
      >
        {poDetailLoading ? <p className="po-field-success">Đang tải chi tiết dòng PO...</p> : null}
        {poDetailError ? <p className="po-field-error">{poDetailError}</p> : null}
        {poDetailData ? (
          <PurchaseOrderLineSummarySection
            data={poDetailData}
            onOpenReceipt={() => undefined}
            showHeader={false}
            compact
            showLegend={false}
            allowOpenReceipt={false}
          />
        ) : null}
      </Dialog>
    </section>
  )
}
