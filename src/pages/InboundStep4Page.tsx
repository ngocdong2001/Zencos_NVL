import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { confirmDialog } from 'primereact/confirmdialog'
import { Dialog } from 'primereact/dialog'
import { RadioButton } from 'primereact/radiobutton'
import { Toast } from 'primereact/toast'
import { InputText } from 'primereact/inputtext'
import { WizardStepBar } from '../components/inbound/WizardStepBar'
import { PurchaseOrderLineSummarySection } from '../components/purchaseOrder/PurchaseOrderLineSummarySection'
import { getInboundStatusMeta } from '../components/inbound/statusMeta'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import type { InboundWizardState } from '../components/inbound/types'
import { getInboundDraftDocumentFileUrl } from '../lib/inboundDraftDocApi'
import {
  fetchPurchaseRequestInboundDrilldown,
  type PurchaseRequestInboundDrilldownResponse,
} from '../lib/purchaseShortageApi'
import {
  createInboundVoidRereceive,
  createDraftReceipt,
  deleteDraftReceipt,
  fetchInboundReceiptDetail,
  fetchInboundReceiptHistory,
  postInboundReceipt,
  submitInboundReceiptQc,
  type InboundReceiptDetailResponse,
  type InboundReceiptHistoryRowResponse,
  updateDraftReceipt,
  validateInboundReceiptRefFormat,
  validateInboundReceiptRefUniqueness,
} from '../lib/inboundApi'

type QcStatus = 'pending' | 'passed' | 'failed'

const QC_STATUS_OPTIONS: Array<{ label: string; value: QcStatus }> = [
  { label: 'Chờ QC', value: 'pending' },
  { label: 'Đạt', value: 'passed' },
  { label: 'Không đạt', value: 'failed' },
]

function getQcStatusLabel(status: QcStatus): string {
  if (status === 'passed') return 'Đạt'
  if (status === 'failed') return 'Không đạt'
  return 'Chờ QC'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatVnd(value: number): string {
  return value.toLocaleString('vi-VN')
}

function formatQty(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function getEditRouteByStep(step: number | undefined): '/inbound/new/step2' | '/inbound/new/step3' | '/inbound/new/step4' {
  if (step === 3) return '/inbound/new/step3'
  if (step === 4) return '/inbound/new/step4'
  return '/inbound/new/step2'
}

export function InboundStep4Page() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useRef<InstanceType<typeof Toast>>(null)
  const wizState = (location.state as InboundWizardState | null) ?? {
    step1: { draftCode: '', supplierKeyword: '', poNumber: '', expectedDate: '', receivingWarehouseId: '', receivingWarehouseName: '', transportType: 'road' as const },
    step2: { lotNo: '', unitPrice: null, quantity: null, invoiceNumber: '', invoiceDate: '', mfgDate: '', expDate: '' },
    step3: { files: [] },
    maxReachedStep: 4,
  }

  const { step1, step2, step3 } = wizState
  const [dbDetail, setDbDetail] = useState<InboundReceiptDetailResponse | null>(null)
  const [editDraftCode, setEditDraftCode] = useState(step1.draftCode)
  const [detailLoading, setDetailLoading] = useState(false)
  const [qcStatuses, setQcStatuses] = useState<Record<string, QcStatus>>({})
  const [qcSaving, setQcSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [draftCodeError, setDraftCodeError] = useState<string | null>(null)
  const [adjustBusy, setAdjustBusy] = useState(false)
  const [poDrilldownVisible, setPoDrilldownVisible] = useState(false)
  const [poDrilldownLoading, setPoDrilldownLoading] = useState(false)
  const [poDrilldownError, setPoDrilldownError] = useState<string | null>(null)
  const [poDrilldownData, setPoDrilldownData] = useState<PurchaseRequestInboundDrilldownResponse | null>(null)

  const mapHistoryRows = (rows: InboundReceiptHistoryRowResponse[]): HistoryTimelineEvent[] => {
    return rows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      action: row.actionLabel,
      actorName: row.actorName,
      at: row.createdAt,
    }))
  }

  const loadHistory = async (receiptId: string) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows = await fetchInboundReceiptHistory(receiptId)
      setHistoryEvents(mapHistoryRows(rows))
    } catch (error) {
      setHistoryEvents([])
      setHistoryError(error instanceof Error ? error.message : 'Không thể tải lịch sử thao tác phiếu nhập kho.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!wizState.receiptId) {
      setDbDetail(null)
      return
    }

    let cancelled = false

    const loadDetail = async () => {
      setDetailLoading(true)
      try {
        const detail = await fetchInboundReceiptDetail(wizState.receiptId as string)
        if (cancelled) return
        setDbDetail(detail)
      } catch {
        if (cancelled) return
        setDbDetail(null)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [wizState.receiptId])

  useEffect(() => {
    if (!wizState.receiptId) {
      setHistoryEvents([])
      setHistoryError(null)
      return
    }

    void loadHistory(wizState.receiptId)
  }, [wizState.receiptId])

  useEffect(() => {
    setEditDraftCode(step1.draftCode)
  }, [step1.draftCode])

  const dbFirstItem = dbDetail?.items[0] ?? null
  const dbItems = dbDetail?.items ?? []
  const currentStatus = dbDetail?.status ?? wizState.receiptStatus ?? 'draft'
  const isPosted = currentStatus === 'posted'
  const isCancelledByAdjustment = Boolean(dbDetail?.adjustedByReceipt)
  const canCreateAdjustment = Boolean(wizState.receiptId) && isPosted && !isCancelledByAdjustment
  const statusMeta = getInboundStatusMeta(currentStatus)
  const quantity = dbFirstItem ? Number(dbFirstItem.quantityDisplay) : (step2.quantity ?? null)
  const quantityBase = dbFirstItem ? Number(dbFirstItem.quantityBase) : null
  const orderUnitConversionToBaseRaw = dbFirstItem && quantity != null && quantity > 0
    ? quantityBase != null ? quantityBase / quantity : 1
    : (step2.selectedUnitConversionToBase ?? 1)
  const orderUnitConversionToBase = Number.isFinite(orderUnitConversionToBaseRaw) && orderUnitConversionToBaseRaw > 0
    ? orderUnitConversionToBaseRaw
    : 1
  const priceUnitConversionToBaseRaw = dbFirstItem?.product?.orderUnitRef?.conversionToBase ?? step2.selectedPriceUnitConversionToBase ?? 1
  const priceUnitConversionToBase = Number.isFinite(priceUnitConversionToBaseRaw) && priceUnitConversionToBaseRaw > 0
    ? priceUnitConversionToBaseRaw
    : 1
  const quantityUnitLabel = (dbFirstItem?.unitUsed ?? step2.selectedUnitDisplay ?? 'g').trim() || 'g'
  const priceUnitLabel = (dbFirstItem?.product?.orderUnitRef?.unitName ?? quantityUnitLabel).trim() || 'đơn vị tính đơn giá'
  const priceUnitEquivalent = 
    quantity != null && quantityUnitLabel !== priceUnitLabel
      ? quantity * orderUnitConversionToBase / priceUnitConversionToBase
      : null
  const unitPrice = dbFirstItem?.unitPricePerKg ?? step2.unitPrice ?? null
  const supplierDisplay = (dbDetail?.supplier?.name ?? step1.supplierKeyword) || '—'
  const poRefDisplay = (dbDetail?.purchaseRequest?.requestRef ?? step1.poNumber) || '—'
  const warehouseDisplay = (dbDetail?.receivingLocation?.name ?? step1.receivingWarehouseName ?? step1.receivingWarehouseId) || '—'
  const materialNameDisplay = (dbFirstItem?.product?.name ?? step2.selectedMaterialName) || '—'
  const materialCodeDisplay = (dbFirstItem?.product?.code ?? step2.selectedMaterialCode) || '—'
  const lotDisplay = (dbFirstItem?.lotNo ?? step2.lotNo) || '—'
  const expectedDateDisplay = (dbDetail?.expectedDate ?? step1.expectedDate) || '—'
  const attachedFiles = dbDetail
    ? dbDetail.items.flatMap((item) =>
      item.documents.map((doc) => ({
        id: doc.id,
        name: doc.originalName,
        size: doc.fileSize,
        docType: doc.docType,
      })))
    : (step3?.files ?? [])
  const previewDraftCode = (dbDetail?.receiptRef ?? step1.draftCode).trim()

  const totalAmount = dbDetail
    ? Math.round(dbDetail.items.reduce((sum, item) => sum + Number(item.lineAmount), 0))
    : (quantity != null && unitPrice != null 
        ? Math.round((quantity * orderUnitConversionToBase / priceUnitConversionToBase) * unitPrice)
        : null)

  const [confirmed, setConfirmed] = useState(false)
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)

  useEffect(() => {
    if (!dbDetail) return
    const next: Record<string, QcStatus> = {}
    for (const item of dbDetail.items) {
      next[item.id] = item.qcStatus
    }
    setQcStatuses(next)
  }, [dbDetail])

  async function handleSaveDraft() {
    if (isPosted) return

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
      const payload = {
        receiptRef: editDraftCode,
        purchaseRequestRef: step1.poNumber || undefined,
        supplierName: step1.supplierKeyword || undefined,
        receivingLocationId: step1.receivingWarehouseId || undefined,
        expectedDate: step1.expectedDate || undefined,
        currentStep: 4 as const,
        item: step2.selectedMaterialId && step2.lotNo.trim() && step2.quantity !== null && step2.quantity >= 0
          ? {
              productId: step2.selectedMaterialId,
              lotNo: step2.lotNo.trim(),
              quantityBase: Number((step2.quantity * orderUnitConversionToBase).toFixed(4)),
              quantityDisplay: step2.quantity,
              unitUsed: step2.selectedUnitDisplay || 'kg',
              unitPricePerKg: step2.unitPrice ?? 0,
              lineAmount: step2.unitPrice && step2.quantity 
                ? Math.round((step2.quantity * orderUnitConversionToBase / priceUnitConversionToBase) * step2.unitPrice)
                : 0,
              invoiceNumber: step2.invoiceNumber || undefined,
              invoiceDate: step2.invoiceDate || undefined,
              manufactureDate: step2.mfgDate || undefined,
              expiryDate: step2.expDate || undefined,
              manufacturerId: step2.selectedManufacturerId || undefined,
            }
          : undefined,
      }

      const result = wizState.receiptId
        ? await updateDraftReceipt(wizState.receiptId, payload)
        : await createDraftReceipt(payload)

      await loadHistory(result.id)

      const nextWizState = {
        ...wizState,
        step1: {
          ...wizState.step1,
          draftCode: result.receiptRef,
        },
      }
      setEditDraftCode(result.receiptRef)

      navigate(location.pathname, {
        replace: true,
        state: { ...nextWizState, receiptId: result.id, currentStep: result.currentStep, maxReachedStep: 4 },
      })

      toast.current?.show({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã lưu bản nháp ở bước 4.',
        life: 2500,
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Lỗi',
        detail: err instanceof Error ? err.message : 'Lỗi khi lưu bản nháp.',
        life: 4000,
      })
    } finally {
      setDraftSaving(false)
    }
  }

  async function handleCancelReceipt() {
    if (isPosted) {
      toast.current?.show({ severity: 'warn', summary: 'Không thể hủy', detail: 'Phiếu đã posted, không thể hủy.', life: 3000 })
      return
    }
    setCancelBusy(true)
    try {
      if (wizState.receiptId) await deleteDraftReceipt(wizState.receiptId)
      navigate('/inbound')
    } catch (err) {
      setCancelDialogVisible(false)
      setCancelBusy(false)
      toast.current?.show({
        severity: 'error',
        summary: 'Lỗi',
        detail: err instanceof Error ? err.message : 'Không thể hủy phiếu. Vui lòng thử lại.',
        life: 4000,
      })
    } finally {
      setCancelBusy(false)
    }
  }

  async function handleSaveQc() {
    if (isPosted) return
    if (!wizState.receiptId || !dbDetail) {
      toast.current?.show({
        severity: 'error',
        summary: 'Thiếu dữ liệu',
        detail: 'Không xác định được phiếu nhập kho để cập nhật QC.',
        life: 3500,
      })
      return
    }

    setQcSaving(true)
    try {
      await submitInboundReceiptQc(wizState.receiptId, {
        items: dbDetail.items.map((item) => ({
          itemId: item.id,
          qcStatus: qcStatuses[item.id] ?? 'pending',
        })),
      })
      const refreshed = await fetchInboundReceiptDetail(wizState.receiptId)
      setDbDetail(refreshed)
      await loadHistory(wizState.receiptId)
      toast.current?.show({
        severity: 'success',
        summary: 'Đã lưu QC',
        detail: 'Kết quả QC đã được cập nhật cho phiếu nhập kho.',
        life: 2500,
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Lỗi QC',
        detail: err instanceof Error ? err.message : 'Không thể cập nhật kết quả QC.',
        life: 4000,
      })
    } finally {
      setQcSaving(false)
    }
  }

  async function handleCreateAdjustment() {
    if (!canCreateAdjustment || !wizState.receiptId || adjustBusy) return

    setAdjustBusy(true)
    try {
      const created = await createInboundVoidRereceive(wizState.receiptId)
      const detail = await fetchInboundReceiptDetail(created.id)
      const firstItem = detail.items[0]

      const nextWizardState: InboundWizardState = {
        receiptId: detail.id,
        receiptStatus: detail.status,
        currentStep: detail.currentStep,
        step1: {
          draftCode: detail.receiptRef,
          supplierKeyword: detail.supplier?.name ?? step1.supplierKeyword,
          poNumber: detail.purchaseRequest?.requestRef ?? step1.poNumber,
          expectedDate: detail.expectedDate ?? step1.expectedDate,
          receivingWarehouseId: detail.receivingLocation?.id ?? step1.receivingWarehouseId,
          receivingWarehouseName: detail.receivingLocation?.name ?? step1.receivingWarehouseName,
          transportType: step1.transportType,
        },
        step2: {
          lotNo: firstItem?.lotNo ?? '',
          unitPrice: firstItem?.unitPricePerKg ?? null,
          quantity: firstItem ? Number(firstItem.quantityDisplay) : null,
          invoiceNumber: firstItem?.invoiceNumber ?? '',
          invoiceDate: firstItem?.invoiceDate ?? '',
          mfgDate: firstItem?.manufactureDate ?? '',
          expDate: firstItem?.expiryDate ?? '',
          selectedMaterialId: firstItem?.product.id ?? '',
          selectedMaterialCode: firstItem?.product.code ?? '',
          selectedMaterialName: firstItem?.product.name ?? '',
          selectedUnitDisplay: firstItem?.unitUsed ?? '',
          selectedPriceUnit: firstItem?.product?.orderUnitRef?.unitName ?? '',
          selectedUnitConversionToBase: firstItem && Number(firstItem.quantityDisplay) > 0
            ? Number(firstItem.quantityBase) / Number(firstItem.quantityDisplay)
            : 1,
          selectedPriceUnitConversionToBase: firstItem?.product?.orderUnitRef?.conversionToBase ?? 1,
        },
        step3: {
          files: detail.items.flatMap((item) =>
            item.documents.map((doc) => ({
              id: doc.id,
              name: doc.originalName,
              size: doc.fileSize,
              docType: doc.docType,
              mimeType: doc.mimeType,
              createdAt: doc.createdAt,
            })),
          ),
        },
        maxReachedStep: detail.currentStep,
      }

      toast.current?.show({
        severity: 'success',
        summary: 'Đã tạo phiếu điều chỉnh',
        detail: `Đã tạo phiếu ${detail.receiptRef} theo hướng Hủy & tạo phiếu điều chỉnh.`,
        life: 3200,
      })

      navigate(getEditRouteByStep(detail.currentStep), {
        state: { ...nextWizardState, maxReachedStep: detail.currentStep },
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Không thể tạo phiếu điều chỉnh',
        detail: err instanceof Error ? err.message : 'Lỗi khi tạo phiếu điều chỉnh từ phiếu posted.',
        life: 4500,
      })
    } finally {
      setAdjustBusy(false)
    }
  }

  async function handleOpenPoDrilldown() {
    const purchaseId = dbDetail?.purchaseRequest?.id
    if (!purchaseId) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Không có dữ liệu PO',
        detail: 'Phiếu nhập kho này chưa liên kết được tới phiếu PO để xem drilldown.',
        life: 3000,
      })
      return
    }

    setPoDrilldownVisible(true)
    setPoDrilldownLoading(true)
    setPoDrilldownError(null)
    setPoDrilldownData(null)

    try {
      const data = await fetchPurchaseRequestInboundDrilldown(purchaseId)
      setPoDrilldownData(data)
    } catch (error) {
      setPoDrilldownError(error instanceof Error ? error.message : 'Không thể tải drilldown phiếu PO.')
    } finally {
      setPoDrilldownLoading(false)
    }
  }

  function handleConfirm() {
    if (isPosted) return
    if (!wizState.receiptId || !dbDetail) {
      toast.current?.show({
        severity: 'error',
        summary: 'Thiếu dữ liệu',
        detail: 'Không xác định được phiếu nhập kho để posted.',
        life: 3500,
      })
      return
    }

    const missingDocs = dbItems.filter((item) => !item.hasDocument || item.documents.length === 0)
    if (missingDocs.length > 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Thiếu chứng từ',
        detail: 'Một số dòng chưa có chứng từ bắt buộc. Vui lòng bổ sung trước khi xác nhận nhập kho.',
        life: 4500,
      })
      return
    }

    const notPassed = dbItems.filter((item) => (qcStatuses[item.id] ?? 'pending') !== 'passed')
    if (notPassed.length > 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'QC chưa đạt',
        detail: 'Tất cả dòng phải có trạng thái QC = Đạt trước khi posted phiếu nhập kho.',
        life: 4500,
      })
      return
    }

    confirmDialog({
      message: 'Sau khi xác nhận, dữ liệu sẽ được khóa và đồng bộ với hệ thống kế toán. Bạn có chắc chắn muốn tiếp tục không?',
      header: 'Xác nhận Nhập kho',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Xác nhận Nhập kho',
      rejectLabel: 'Hủy',
      acceptClassName: 'btn btn-primary',
      accept: () => {
        void (async () => {
          setPosting(true)
          try {
            await submitInboundReceiptQc(wizState.receiptId as string, {
              items: dbItems.map((item) => ({
                itemId: item.id,
                qcStatus: qcStatuses[item.id] ?? 'pending',
              })),
            })
            await postInboundReceipt(wizState.receiptId as string)
            setConfirmed(true)
            toast.current?.show({
              severity: 'success',
              summary: 'Nhập kho thành công',
              detail: `Phiếu ${editDraftCode || 'mới'} đã được QC và posted vào kho.`,
              life: 3500,
            })
            navigate('/inbound', { replace: true })
          } catch (err) {
            toast.current?.show({
              severity: 'error',
              summary: 'Không thể xác nhận nhập kho',
              detail: err instanceof Error ? err.message : 'Lỗi khi posted phiếu nhập kho.',
              life: 4500,
            })
          } finally {
            setPosting(false)
          }
        })()
      },
    })
  }

  function getDocTypeLabelShort(docType: string): string {
    switch (docType) {
      case 'COA': return 'COA'
      case 'Invoice': return 'Invoice'
      case 'MSDS': return 'MSDS'
      default: return 'Others'
    }
  }

  function handlePreviewAttachment(docId?: string) {
    if (!docId || !previewDraftCode) return
    window.open(getInboundDraftDocumentFileUrl(previewDraftCode, docId), '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="inbound-create-shell inbound-step4-shell">
      <Toast ref={toast} />

      <div className="inbound-create-title-row">
        <div>
          <div className="inbound-step4-title-row">
            <h2>Kiểm tra thông tin phiếu nhập</h2>
            <span className={`purchase-detail-draft-tag inbound-title-status-tag ${statusMeta.tone}`}>{statusMeta.label}</span>
          </div>
          <p>
            {detailLoading
              ? 'Đang đồng bộ dữ liệu mới nhất từ hệ thống...'
              : 'Vui lòng rà soát kỹ các thông số định lượng và tài liệu đính kèm trước khi xác nhận lưu kho.'}
          </p>
          {isPosted ? <p className="inbound-readonly-note">Phiếu đã posted, chỉ được xem, không thể chỉnh sửa.</p> : null}
        </div>
      </div>

      <section className="inbound-step4-nav-shell">
        <WizardStepBar
          activeStep={4}
          maxReachedStep={wizState.maxReachedStep}
          navigationLocked={isPosted}
          onNavigate={(s) => {
            if (s === 1) navigate('/inbound/new', { state: wizState })
            if (s === 2) navigate('/inbound/new/step2', { state: wizState })
            if (s === 3) navigate('/inbound/new/step3', { state: wizState })
          }}
        />
      </section>

      <section className="inbound-create-card inbound-step4-review-card">
        <div className="inbound-step4-layout">
          <aside className="inbound-step4-history-panel">
            <div className="inbound-step4-section-header">
              <i className="pi pi-history" />
              <span>LỊCH SỬ THAO TÁC</span>
            </div>
            <HistoryTimeline
              events={historyEvents}
              loading={historyLoading}
              error={historyError}
              emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
            />
          </aside>

          <div className="inbound-step4-main">
            {isCancelledByAdjustment
              ? <div className="inbound-step4-adjustment-watermark">Hủy do điều chỉnh</div>
              : isPosted
                ? <div className="inbound-step4-adjustment-watermark inbound-step4-posted-watermark">Đã hoàn thành</div>
                : null}
            <div className="inbound-step4-body">
              {/* ── Header Banner ── */}
              <div className="inbound-step4-banner">
                <div className="inbound-step4-banner-left">
                  <h3 className="inbound-step4-banner-title">Xác nhận Nhập kho</h3>
                  <p className="inbound-step4-banner-docid">
                    <InputText
                      value={editDraftCode}
                      onChange={(e) => {
                        setEditDraftCode(e.target.value)
                        setDraftCodeError(null)
                      }}
                      disabled={isPosted}
                      placeholder="Mã tham chiếu"
                      className={`inbound-step4-ref-input${draftCodeError ? ' p-invalid' : ''}`}
                    />
                    {draftCodeError ? <small className="inbound-create-field-error">{draftCodeError}</small> : null}
                  </p>
                </div>
                <div className="inbound-step4-banner-right">
                  <span className="inbound-step4-lot-label">LOT NUMBER</span>
                  <span className="inbound-step4-lot-pill">{lotDisplay}</span>
                </div>
              </div>

              {/* ── Section 1: Material & Partner ── */}
              <div className="inbound-step4-section">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-info-circle" />
                  <span>THÔNG TIN NGUYÊN LIỆU &amp; ĐỐI TÁC</span>
                </div>
                <div className="inbound-step4-info-grid">
                  <div>
                    <p className="inbound-step4-info-label">Nhà cung cấp</p>
                    <p className="inbound-step4-info-value">{supplierDisplay}</p>
                  </div>
                  <div>
                    <p className="inbound-step4-info-label">Phiếu PO</p>
                    {dbDetail?.purchaseRequest?.id ? (
                      <p className="inbound-step4-info-value">
                        <button type="button" className="inbound-code-btn" onClick={() => { void handleOpenPoDrilldown() }}>
                          {poRefDisplay}
                        </button>
                      </p>
                    ) : (
                      <p className="inbound-step4-info-value">{poRefDisplay}</p>
                    )}
                  </div>
                  <div>
                    <p className="inbound-step4-info-label">Kho lưu trữ</p>
                    <p className="inbound-step4-info-value">{warehouseDisplay}</p>
                  </div>
                  <div>
                    <p className="inbound-step4-info-label">Tên nguyên liệu</p>
                    <p className="inbound-step4-info-value">{materialNameDisplay}</p>
                  </div>
                  <div>
                    <p className="inbound-step4-info-label">Mã nguyên liệu</p>
                    <p className="inbound-step4-info-value">{materialCodeDisplay}</p>
                  </div>
                  {(dbFirstItem?.manufacturer?.name ?? step2.selectedManufacturerName) ? (
                    <div>
                      <p className="inbound-step4-info-label">Nhà sản xuất</p>
                      <p className="inbound-step4-info-value">{dbFirstItem?.manufacturer?.name ?? step2.selectedManufacturerName}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="inbound-step4-info-label">Ngày nhận hàng</p>
                    <p className="inbound-step4-info-value">{expectedDateDisplay}</p>
                  </div>
                  <div>
                    <p className="inbound-step4-info-label">Trạng thái kiểm tra</p>
                    <span className="inbound-step4-qc-badge">{getQcStatusLabel(qcStatuses[dbFirstItem?.id ?? ''] ?? 'pending')}</span>
                  </div>
                </div>
              </div>

              <div className="inbound-step4-section">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-verified" />
                  <span>KIỂM TRA QC THEO TỪNG DÒNG</span>
                </div>
                {dbItems.length === 0 ? (
                  <p className="inbound-step4-no-files">Chưa có dòng nhập kho để QC.</p>
                ) : (
                  <div className="inbound-step4-files-grid inbound-step4-qc-grid">
                    {dbItems.map((item) => (
                      <div key={item.id} className="inbound-step4-file-card">
                        <div className="inbound-step4-file-info" style={{ width: '100%' }}>
                          <p className="inbound-step4-file-name">{item.product.code} - {item.product.name}</p>
                          <div className="inbound-step4-file-meta" style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span>LOT: {item.lotNo}</span>
                            <span>SL: {formatQty(item.quantityDisplay)} {item.unitUsed}</span>
                            <span>{item.documents.length > 0 ? 'Có chứng từ' : 'Thiếu chứng từ'}</span>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <div className="inbound-step4-qc-radio-group">
                              {QC_STATUS_OPTIONS.map((option) => {
                                const isChecked = (qcStatuses[item.id] ?? item.qcStatus) === option.value
                                return (
                                <div
                                  key={option.value}
                                  className={`inbound-step4-qc-radio-item inbound-step4-qc-${option.value}${isChecked ? ' is-selected' : ''}`}
                                >
                                  <RadioButton
                                    className="inbound-step4-qc-radio-native"
                                    inputId={`qc-${item.id}-${option.value}`}
                                    name={`qc-${item.id}`}
                                    value={option.value}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setQcStatuses((prev) => ({ ...prev, [item.id]: e.value as QcStatus }))
                                    }}
                                    disabled={isPosted}
                                  />
                                  <label htmlFor={`qc-${item.id}-${option.value}`} className="inbound-step4-qc-option-label">
                                    <span className={`inbound-step4-qc-tickbox${isChecked ? ' is-checked' : ''}`} aria-hidden="true">
                                      <i className="pi pi-check" />
                                    </span>
                                    <span>{option.label}</span>
                                  </label>
                                </div>
                              )})}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Section 2: Quantity & Finance ── */}
              <div className="inbound-step4-section">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-check-circle" />
                  <span>CHI TIẾT ĐỊNH LƯỢNG &amp; TÀI CHÍNH</span>
                </div>
                <div className="inbound-step4-stat-row">
                  <div className="inbound-step4-stat-card">
                    <p className="inbound-step4-stat-label">Số lượng thực nhập</p>
                    <p className="inbound-step4-stat-value">
                      {quantity != null ? `${formatQty(quantity)} ${quantityUnitLabel}` : '—'}
                    </p>
                    {priceUnitEquivalent != null && (
                      <p className="inbound-step4-stat-sub">Tương đương: {formatQty(priceUnitEquivalent)} {priceUnitLabel}</p>
                    )}
                  </div>
                  <div className="inbound-step4-stat-card">
                    <p className="inbound-step4-stat-label">Đơn giá (VND/{priceUnitLabel})</p>
                    <p className="inbound-step4-stat-value">
                      {unitPrice != null ? formatVnd(unitPrice) + ' VND' : '—'}
                    </p>
                    <p className="inbound-step4-stat-sub">Đơn giá theo đơn vị tính giá: {priceUnitLabel}</p>
                  </div>
                </div>

                <div className="inbound-step4-total-bar">
                  <div>
                    <p className="inbound-step4-total-label">TỔNG GIÁ TRỊ THANH TOÁN</p>
                    <p className="inbound-step4-total-sub">
                      {quantityUnitLabel === priceUnitLabel
                        ? `Số lượng (${quantityUnitLabel}) × Đơn giá (VND/${priceUnitLabel})`
                        : `(Số lượng (${quantityUnitLabel}) quy đổi sang ${priceUnitLabel}) × Đơn giá (VND/${priceUnitLabel})`
                      }
                    </p>
                  </div>
                  <p className="inbound-step4-total-amount">
                    {totalAmount != null ? <>{formatVnd(totalAmount)} <span>VND</span></> : '—'}
                  </p>
                </div>
              </div>

              {/* ── Section 3: Attachments ── */}
              <div className="inbound-step4-section">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-file-edit" />
                  <span>HỒ SƠ TÀI LIỆU ĐÍNH KÈM (STEP 3)</span>
                </div>
                {attachedFiles.length === 0 ? (
                  <p className="inbound-step4-no-files">Không có tài liệu đính kèm.</p>
                ) : (
                  <div className="inbound-step4-files-grid">
                    {attachedFiles.map((f, idx) => (
                      <button
                        key={`${f.id ?? 'local'}-${idx}`}
                        type="button"
                        className="inbound-step4-file-card"
                        onClick={() => handlePreviewAttachment(f.id)}
                        disabled={!f.id || !previewDraftCode}
                        title={f.id ? 'Nhấn để xem preview tài liệu' : 'Tài liệu chưa sẵn sàng để preview'}
                      >
                        <div className="inbound-step4-file-icon-wrap">
                          <i className="pi pi-file-edit" />
                        </div>
                        <div className="inbound-step4-file-info">
                          <p className="inbound-step4-file-name">{f.name}</p>
                          <div className="inbound-step4-file-meta">
                            <span className={`doc-type-badge doc-type-${String(f.docType).toLowerCase()}`}>{getDocTypeLabelShort(f.docType)}</span>
                            <span className="inbound-step4-file-size">{formatFileSize(f.size)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Warning Notice ── */}
              <div className="inbound-step4-warning">
                <i className="pi pi-exclamation-circle inbound-step4-warning-icon" />
                <p>
                  <strong>LƯU Ý QUAN TRỌNG:</strong>{' '}
                  Sau khi nhấn "Xác nhận Nhập kho", dữ liệu sẽ được khóa và đồng bộ với hệ thống kế toán.
                  Mọi thay đổi sau đó cần phải thực hiện thông qua quy trình điều chỉnh kho chuyên biệt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="inbound-create-footer inbound-step4-footer">
        <p className="inbound-create-autosave-hint">
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
            label="Quay lại bước 3"
            disabled={isPosted}
            onClick={() => navigate('/inbound/new/step3', { state: wizState })}
          />
          <Button
            type="button"
            className="btn btn-ghost inbound-step3-draft-btn"
            icon={draftSaving ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
            label="Lưu bản nháp"
            disabled={isPosted || draftSaving}
            onClick={() => { void handleSaveDraft() }}
          />
          <Button
            type="button"
            className="btn btn-ghost inbound-step3-draft-btn"
            icon={qcSaving ? 'pi pi-spin pi-spinner' : 'pi pi-verified'}
            label="Lưu kết quả QC"
            disabled={isPosted || qcSaving || posting || confirmed}
            onClick={() => { void handleSaveQc() }}
          />
          <Button
            type="button"
            className="btn btn-ghost inbound-step3-draft-btn"
            icon={adjustBusy ? 'pi pi-spin pi-spinner' : 'pi pi-replay'}
            label={adjustBusy ? 'Đang tạo phiếu điều chỉnh...' : 'Hủy & tạo phiếu điều chỉnh'}
            disabled={!canCreateAdjustment || adjustBusy || posting || qcSaving}
            onClick={() => {
              confirmDialog({
                message: 'Hệ thống sẽ tạo một phiếu điều chỉnh mới theo hướng Hủy & tạo phiếu điều chỉnh. Tiếp tục?',
                header: 'Xác nhận Hủy & tạo phiếu điều chỉnh',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Tạo phiếu điều chỉnh',
                rejectLabel: 'Hủy',
                acceptClassName: 'btn btn-primary',
                accept: () => {
                  void handleCreateAdjustment()
                },
              })
            }}
          />
          <Button
            type="button"
            className="btn btn-primary inbound-next-btn"
            iconPos="right"
            icon={posting ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'}
            label={posting ? 'Đang xác nhận...' : 'Xác nhận Nhập kho'}
            disabled={isPosted || confirmed || posting}
            onClick={handleConfirm}
          />
        </div>
      </footer>

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

      <Dialog
        header={poRefDisplay !== '—' ? `Chi tiết dòng PO - ${poRefDisplay}` : 'Chi tiết dòng PO'}
        visible={poDrilldownVisible}
        onHide={() => setPoDrilldownVisible(false)}
        style={{ width: 'min(1200px, 96vw)' }}
        modal
      >
        {poDrilldownLoading ? <p className="po-field-success">Đang tải chi tiết dòng PO...</p> : null}
        {poDrilldownError ? <p className="po-field-error">{poDrilldownError}</p> : null}
        {poDrilldownData ? (
          <PurchaseOrderLineSummarySection
            data={poDrilldownData}
            onOpenReceipt={() => undefined}
            activeReceiptId={dbDetail?.id ?? wizState.receiptId ?? null}
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
