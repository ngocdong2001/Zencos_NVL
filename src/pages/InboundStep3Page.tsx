import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { Toast } from 'primereact/toast'
import { InputText } from 'primereact/inputtext'
import { WizardStepBar } from '../components/inbound/WizardStepBar'
import { getInboundStatusMeta } from '../components/inbound/statusMeta'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import type { AttachedFileInfo, InboundStep3State, InboundWizardState } from '../components/inbound/types'
import {
  deleteInboundDraftDocument,
  fetchInboundDraftDocuments,
  getInboundDraftDocumentFileUrl,
  updateInboundDraftDocument,
  uploadInboundDraftDocument,
  type InboundDraftDoc,
  type InboundDraftDocType,
  type InboundDraftUploadContext,
} from '../lib/inboundDraftDocApi'
import {
  createDraftReceipt,
  deleteDraftReceipt,
  fetchInboundReceiptHistory,
  type InboundReceiptHistoryRowResponse,
  updateDraftReceipt,
  validateInboundReceiptRefFormat,
  validateInboundReceiptRefUniqueness,
} from '../lib/inboundApi'

const DOC_TYPE_OPTIONS = [
  { label: 'Bản phân tích (COA)', value: 'COA' },
  { label: 'Hóa đơn (Invoice)', value: 'Invoice' },
  { label: 'MSDS', value: 'MSDS' },
  { label: 'Khác', value: 'Other' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toAttachedFileInfo(doc: InboundDraftDoc): AttachedFileInfo {
  return {
    id: doc.id,
    name: doc.originalName,
    size: doc.fileSize,
    docType: doc.docType,
    mimeType: doc.mimeType,
    createdAt: doc.createdAt,
  }
}

export function InboundStep3Page() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useRef<InstanceType<typeof Toast>>(null)
  const wizState = (location.state as InboundWizardState | null) ?? {
    step1: { draftCode: '', supplierKeyword: '', poNumber: '', expectedDate: '', receivingWarehouseId: '', receivingWarehouseName: '', transportType: 'road' as const },
    step2: { lotNo: '', unitPrice: null, quantity: null, invoiceNumber: '', invoiceDate: '', mfgDate: '', expDate: '' },
    maxReachedStep: 3,
  }
  const isPosted = wizState.receiptStatus === 'posted'
  const currentStatus = wizState.receiptStatus ?? 'draft'
  const statusMeta = getInboundStatusMeta(currentStatus)
  const { step1, step2 } = wizState
  const [editDraftCode, setEditDraftCode] = useState(step1.draftCode)
  const [savedDraftCode, setSavedDraftCode] = useState(step1.draftCode.trim())

  const [files, setFiles] = useState<AttachedFileInfo[]>(wizState.step3?.files ?? [])
  const [isDragOver, setIsDragOver] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsBusy, setDocsBusy] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [docsValidationError, setDocsValidationError] = useState<string | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [draftCodeError, setDraftCodeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      toast.current?.show({
        severity: 'error',
        summary: 'Không thể hủy phiếu',
        detail: err instanceof Error ? err.message : 'Không thể hủy phiếu. Vui lòng thử lại.',
        life: 4000,
      })
    } finally {
      setCancelBusy(false)
    }
  }

  const { quantity } = step2
  const quantityUnitLabel = (step2.selectedUnitDisplay || 'g').trim() || 'g'
  const priceUnitLabel = (step2.selectedPriceUnit || quantityUnitLabel).trim() || 'đơn vị tính giá'
  const priceUnitEquivalent = 
    quantity != null && quantity > 0 && quantityUnitLabel !== priceUnitLabel
      ? (quantity * (step2.selectedUnitConversionToBase ?? 1) / (step2.selectedPriceUnitConversionToBase ?? 1)).toFixed(3)
      : null
  const selectedConversionToBaseRaw = step2.selectedUnitConversionToBase ?? 1
  const selectedConversionToBase = Number.isFinite(selectedConversionToBaseRaw) && selectedConversionToBaseRaw > 0
    ? selectedConversionToBaseRaw
    : 1

  function buildCurrentWiz(): InboundWizardState {
    return {
      ...wizState,
      step1: { ...wizState.step1, draftCode: editDraftCode },
      step3: { files },
    }
  }

  const maxReachedStep = wizState.maxReachedStep

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
        currentStep: 3 as const,
        item: step2.selectedMaterialId && step2.lotNo.trim() && step2.quantity !== null && step2.quantity >= 0
          ? {
              productId: step2.selectedMaterialId,
              lotNo: step2.lotNo.trim(),
              quantityBase: Number((step2.quantity * selectedConversionToBase).toFixed(4)),
              quantityDisplay: step2.quantity,
              unitUsed: step2.selectedUnitDisplay || 'kg',
              unitPricePerKg: step2.unitPrice ?? 0,
              lineAmount: step2.unitPrice && step2.quantity 
                ? Math.round((step2.quantity * (step2.selectedUnitConversionToBase ?? 1) / (step2.selectedPriceUnitConversionToBase ?? 1)) * step2.unitPrice)
                : 0,
              invoiceNumber: step2.invoiceNumber || undefined,
              invoiceDate: step2.invoiceDate || undefined,
              manufactureDate: step2.mfgDate || undefined,
              expiryDate: step2.expDate || undefined,
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
      setSavedDraftCode(result.receiptRef)
      toast.current?.show({
        severity: 'success',
        summary: 'Lưu bản nháp thành công',
        detail: 'Tài liệu đính kèm và thông tin phiếu đã được lưu.',
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

  async function handleNextWithSave() {
    const validationError = validateBeforeNext()
    setDocsValidationError(validationError)
    if (validationError) return

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
        currentStep: 4 as const,
        item: step2.selectedMaterialId && step2.lotNo.trim() && step2.quantity !== null && step2.quantity >= 0
          ? {
              productId: step2.selectedMaterialId,
              lotNo: step2.lotNo.trim(),
              quantityBase: Number((step2.quantity * selectedConversionToBase).toFixed(4)),
              quantityDisplay: step2.quantity,
              unitUsed: step2.selectedUnitDisplay || 'kg',
              unitPricePerKg: step2.unitPrice ?? 0,
              lineAmount: step2.unitPrice && step2.quantity
                ? Math.round((step2.quantity * (step2.selectedUnitConversionToBase ?? 1) / (step2.selectedPriceUnitConversionToBase ?? 1)) * step2.unitPrice)
                : 0,
              invoiceNumber: step2.invoiceNumber || undefined,
              invoiceDate: step2.invoiceDate || undefined,
              manufactureDate: step2.mfgDate || undefined,
              expiryDate: step2.expDate || undefined,
            }
          : undefined,
      }
      const result = wizState.receiptId
        ? await updateDraftReceipt(wizState.receiptId, payload)
        : await createDraftReceipt(payload)

      const step3: InboundStep3State = { files }
      setEditDraftCode(result.receiptRef)
      setSavedDraftCode(result.receiptRef)
      navigate('/inbound/new/step4', {
        state: { ...currentWiz, receiptId: result.id, currentStep: 4, step1: { ...currentWiz.step1, draftCode: result.receiptRef }, step3, maxReachedStep: Math.max(4, maxReachedStep ?? 0) },
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Không thể lưu bản nháp',
        detail: err instanceof Error ? err.message : 'Lỗi khi lưu trước khi chuyển bước.',
        life: 4000,
      })
    } finally {
      setDraftSaving(false)
    }
  }

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
    setEditDraftCode(step1.draftCode)
    setSavedDraftCode(step1.draftCode.trim())
  }, [step1.draftCode])

  useEffect(() => {
    if (!savedDraftCode) return

    let cancelled = false

    const loadDocuments = async () => {
      setDocsLoading(true)
      setDocsError(null)
      try {
        const rows = await fetchInboundDraftDocuments(savedDraftCode)
        if (cancelled) return
        setFiles(rows.map(toAttachedFileInfo))
      } catch (error) {
        if (cancelled) return
        setDocsError(error instanceof Error ? error.message : 'Không thể tải tài liệu đã lưu.')
      } finally {
        if (!cancelled) setDocsLoading(false)
      }
    }

    void loadDocuments()

    return () => {
      cancelled = true
    }
  }, [savedDraftCode])

  async function addFiles(incoming: FileList | null) {
    if (!incoming) return

    const selectedFiles = Array.from(incoming)
    const valid = selectedFiles.filter(
      (file) => file.size <= 5 * 1024 * 1024 && /\.(pdf|png|jpg|jpeg)$/i.test(file.name),
    )
    const rejectedCount = selectedFiles.length - valid.length

    if (rejectedCount > 0) {
      setDocsError('Một số tệp bị từ chối. Chỉ hỗ trợ PDF, PNG, JPG và tối đa 5MB mỗi tệp.')
    } else {
      setDocsError(null)
    }
    setDocsValidationError(null)

    if (!savedDraftCode) {
      setDocsError('Chưa có mã phiếu nháp để tải chứng từ.')
      return
    }

    if (valid.length === 0) return

    setDocsBusy(true)
    try {
      const uploadContext: InboundDraftUploadContext = {
        purchaseRequestRef: step1.poNumber || undefined,
        productId: step2.selectedMaterialId || undefined,
        lotNo: step2.lotNo || undefined,
        expectedDate: step1.expectedDate || undefined,
        supplierName: step1.supplierKeyword || undefined,
        quantityBase: quantity != null ? String(quantity) : undefined,
        quantityDisplay: quantity != null ? String(quantity) : undefined,
        unitUsed: step2.selectedUnitDisplay || 'g',
      }

      for (const file of valid) {
        const uploaded = await uploadInboundDraftDocument(savedDraftCode, file, 'COA', uploadContext)
        setFiles((prev) => [...prev, toAttachedFileInfo(uploaded)])
      }
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : 'Không thể tải tệp lên.')
    } finally {
      setDocsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeFile(index: number) {
    const target = files[index]
    if (!target?.id || !savedDraftCode) {
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setDocsValidationError(null)
      return
    }

    setDocsBusy(true)
    setDocsError(null)
    try {
      await deleteInboundDraftDocument(savedDraftCode, target.id)
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setDocsValidationError(null)
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : 'Không thể xóa tài liệu.')
    } finally {
      setDocsBusy(false)
    }
  }

  async function setDocType(index: number, docType: string) {
    const current = files[index]
    if (!current || current.docType === docType) return

    setFiles((prev) => prev.map((item, i) => (i === index ? { ...item, docType } : item)))

    if (!current.id || !savedDraftCode) return

    try {
      await updateInboundDraftDocument(savedDraftCode, current.id, docType as InboundDraftDocType)
    } catch (error) {
      setFiles((prev) => prev.map((item, i) => (i === index ? { ...item, docType: current.docType } : item)))
      setDocsError(error instanceof Error ? error.message : 'Không thể cập nhật loại tài liệu.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function getFileIcon(filename: string) {
    if (/\.pdf$/i.test(filename)) return 'pi pi-file-pdf'
    if (/\.(jpg|jpeg|png)$/i.test(filename)) return 'pi pi-image'
    return 'pi pi-file'
  }

  function getFileType(filename: string) {
    if (/\.pdf$/i.test(filename)) return 'PDF'
    if (/\.(jpg|jpeg)$/i.test(filename)) return 'Image'
    if (/\.png$/i.test(filename)) return 'Image'
    return 'File'
  }

  function validateBeforeNext(): string | null {
    if (files.length === 0) {
      return 'Vui lòng tải lên ít nhất 1 tài liệu trước khi sang bước tiếp theo.'
    }

    const docTypes = new Set(files.map((file) => file.docType))
    if (!docTypes.has('COA')) return 'Thiếu tài liệu COA. Vui lòng bổ sung trước khi tiếp tục.'
    if (!docTypes.has('MSDS')) return 'Thiếu tài liệu MSDS. Vui lòng bổ sung trước khi tiếp tục.'
    return null
  }

  return (
    <section className="inbound-create-shell">
      <Toast ref={toast} position="top-right" />
      <div className="inbound-create-title-row">
        <div>
          <div className="inbound-step4-title-row">
            <h2>Nhập kho nguyên liệu mới</h2>
            <span className={`purchase-detail-draft-tag inbound-title-status-tag ${statusMeta.tone}`}>{statusMeta.label}</span>
          </div>
          <p>Vui lòng hoàn tất thông tin số lượng và đính kèm các chứng từ kỹ thuật bắt buộc.</p>
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
          activeStep={3}
          maxReachedStep={maxReachedStep}
          navigationLocked={isPosted}
          onNavigate={(s) => {
            const wiz = buildCurrentWiz()
            if (s === 1) navigate('/inbound/new', { state: wiz })
            if (s === 2) navigate('/inbound/new/step2', { state: wiz })
            if (s === 4) navigate('/inbound/new/step4', { state: { ...wiz, maxReachedStep: Math.max(4, maxReachedStep ?? 0) } })
          }}
        />

        <div className="inbound-step-layout-with-history">
          <div className="inbound-step-main">
            <div className="inbound-step3-body">
              {/* LEFT COLUMN */}
              <div className="inbound-step3-main">
            {/* File Upload Card */}
            <div className="inbound-step3-card">
              <div className="inbound-step3-card-header">
                <h3>Tài liệu đính kèm</h3>
                <p className="inbound-step3-card-subtitle">Yêu cầu ít nhất COA và MSDS cho lô hàng mới</p>
              </div>

              {/* Dropzone */}
              <div
                className={`inbound-step3-dropzone${isDragOver ? ' drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { void handleDrop(e) }}
                onClick={() => !docsBusy && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload tài liệu"
                onKeyDown={(e) => e.key === 'Enter' && !docsBusy && fileInputRef.current?.click()}
              >
                <div className="inbound-step3-dropzone-icon">
                  <i className="pi pi-upload" />
                </div>
                <p className="inbound-step3-dropzone-title">Nhấp để tải lên hoặc kéo thả tệp</p>
                <p className="inbound-step3-dropzone-hint">PDF, PNG, JPG (Tối đa 5MB/tệp)</p>
                <button
                  type="button"
                  className="inbound-step3-choose-btn"
                  disabled={docsBusy}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  {docsBusy ? 'Đang tải lên...' : 'Chọn tệp từ máy tính'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => { void addFiles(e.target.files) }}
                />
              </div>

              {docsLoading ? <p className="inbound-step2-info-sub">Đang tải tài liệu đã lưu...</p> : null}
              {docsError ? <p className="inbound-step2-info-sub">{docsError}</p> : null}
              {docsValidationError ? <p className="inbound-create-field-error">{docsValidationError}</p> : null}

              {/* File list */}
              {files.length > 0 && (
                <div className="inbound-step3-file-list">
                  <div className="inbound-step3-file-list-header">
                    <span className="inbound-step3-file-list-count">
                      DANH SÁCH TỆP ({files.length})
                    </span>
                    <span className="inbound-step3-file-safe">
                      <i className="pi pi-check-circle" /> Đã quét virus an toàn
                    </span>
                  </div>
                  {files.map((item, idx) => (
                    <div key={idx} className="inbound-step3-file-row">
                      <div className="inbound-step3-file-info">
                        <i className={`${getFileIcon(item.name)} inbound-step3-file-icon`} />
                        <div className="inbound-step3-file-text">
                          <p className="inbound-step3-file-name">{item.name}</p>
                          <p className="inbound-step3-file-meta">
                            {formatFileSize(item.size)} • {getFileType(item.name)}
                          </p>
                        </div>
                      </div>
                      <Dropdown
                        value={item.docType}
                        options={DOC_TYPE_OPTIONS}
                        onChange={(e) => setDocType(idx, e.value)}
                        className="inbound-step3-doctype-dropdown"
                        placeholder="Loại tài liệu"
                      />
                      <div className="inbound-step3-file-actions">
                        <button
                          type="button"
                          className="inbound-step3-icon-btn"
                          aria-label="Xem tệp"
                          disabled={!item.id}
                          onClick={() => {
                            if (!item.id) return
                            window.open(getInboundDraftDocumentFileUrl(savedDraftCode, item.id), '_blank', 'noopener,noreferrer')
                          }}
                        >
                          <i className="pi pi-eye" />
                        </button>
                        <button
                          type="button"
                          className="inbound-step3-icon-btn danger"
                          aria-label="Xóa tệp"
                          onClick={() => removeFile(idx)}
                        >
                          <i className="pi pi-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note Box */}
            <div className="inbound-step3-note-box">
              <div className="inbound-step3-note-title">
                <i className="pi pi-info-circle" />
                <strong>Lưu ý quan trọng:</strong>
              </div>
              <ul className="inbound-step3-note-list">
                <li>Chứng từ COA phải có chữ ký xác nhận của bộ phận QC nhà cung cấp.</li>
                <li>MSDS phải được cập nhật không quá 2 năm kể từ ngày sản xuất.</li>
                <li>
                  Mọi sai sót về tài liệu sẽ dẫn đến việc từ chối nhập kho tại bước kiểm tra cuối cùng.
                </li>
              </ul>
            </div>
          </div>

              {/* RIGHT SIDEBAR */}
              <div className="inbound-step3-sidebar">
            {/* Quantity Summary Card (read-only, entered in step 2) */}
            <div className="inbound-step3-card">
              <h3 className="inbound-step3-sidebar-card-title">Thông số số lượng</h3>
              <div className="inbound-step3-qty-readonly">
                <span className="inbound-step3-qty-readonly-value">
                  {quantity != null ? `${quantity.toLocaleString('vi-VN')} ${quantityUnitLabel}` : '—'}
                </span>
                {priceUnitEquivalent && (
                  <p className="inbound-step3-qty-equiv">Tương đương: {priceUnitEquivalent} {priceUnitLabel}</p>
                )}
              </div>

              <div className="inbound-step3-order-divider" />
              <p className="inbound-step3-order-section-label">THÔNG TIN ĐƠN HÀNG</p>
              <div className="inbound-step3-order-grid">
                <span className="inbound-step3-order-key">Số Lô (LOT)</span>
                <span className="inbound-step3-order-value">{step2.lotNo || '—'}</span>
                <span className="inbound-step3-order-key">Đơn giá</span>
                <span className="inbound-step3-order-value">
                  {step2.unitPrice != null ? step2.unitPrice.toLocaleString('vi-VN') + ' ₫' : '—'}
                </span>
                <span className="inbound-step3-order-key">Ngày SX</span>
                <span className="inbound-step3-order-value">{step2.mfgDate || '—'}</span>
                <span className="inbound-step3-order-key">Hạn dùng</span>
                <span className="inbound-step3-order-value">{step2.expDate || '—'}</span>
              </div>
            </div>

            {/* Expiry Check Card */}
            <div className="inbound-step3-card inbound-step3-expiry-card">
              <div className="inbound-step3-expiry-header">
                <i className="pi pi-exclamation-triangle inbound-step3-expiry-icon" />
                <strong>Kiểm tra hạn dùng</strong>
              </div>
              <p className="inbound-step3-expiry-text">
                Vui lòng đối chiếu Hạn sử dụng (Expiry Date) trên bao bì với thông tin trong COA
                trước khi tiếp tục.
              </p>
            </div>
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
              label="Quay lại"
              onClick={() => navigate('/inbound/new/step2', { state: buildCurrentWiz() })}
            />
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Button
                type="button"
                className="btn btn-ghost inbound-step3-draft-btn"
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
              label="Tiếp tục: Kiểm tra dữ liệu"
              disabled={draftSaving}
              onClick={() => { void handleNextWithSave() }}
            />
          </div>
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
