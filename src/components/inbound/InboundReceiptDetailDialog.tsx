import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { RadioButton } from 'primereact/radiobutton'
import type { InboundReceiptDetailResponse } from '../../lib/inboundApi'
import { formatQuantity } from '../purchaseOrder/format'
import { HistoryTimeline, type HistoryTimelineEvent } from '../shared/HistoryTimeline'

type QcStatus = 'pending' | 'passed' | 'failed'

const QC_STATUS_OPTIONS: Array<{ label: string; value: QcStatus }> = [
  { label: 'Chờ QC', value: 'pending' },
  { label: 'Đạt', value: 'passed' },
  { label: 'Không đạt', value: 'failed' },
]

type Props = {
  visible: boolean
  onHide: () => void
  receiptRef?: string | null
  detail: InboundReceiptDetailResponse | null
  detailLoading: boolean
  detailError: string | null
  history: HistoryTimelineEvent[]
  historyLoading: boolean
  historyError: string | null
  warningMessage?: string
}

function formatDateOnly(value?: string | null): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDocTypeLabelShort(docType: string): string {
  switch (docType) {
    case 'COA': return 'COA'
    case 'Invoice': return 'Invoice'
    case 'MSDS': return 'MSDS'
    default: return 'Others'
  }
}

function getQcStatusLabel(status: QcStatus): string {
  if (status === 'passed') return 'Đạt'
  if (status === 'failed') return 'Không đạt'
  return 'Chờ QC'
}

function toInboundStatusLabel(status: string): string {
  if (status === 'posted') return 'Đã posted'
  if (status === 'pending_qc') return 'Chờ QC'
  if (status === 'cancelled') return 'Đã hủy'
  return 'Nháp'
}

export function InboundReceiptDetailDialog({
  visible,
  onHide,
  receiptRef,
  detail,
  detailLoading,
  detailError,
  history,
  historyLoading,
  historyError,
  warningMessage,
}: Props) {
  const receiptFirstItem = detail?.items[0] ?? null
  const quantity = receiptFirstItem ? Number(receiptFirstItem.quantityDisplay) : null
  const quantityBase = receiptFirstItem ? Number(receiptFirstItem.quantityBase) : null
  const quantityUnitLabel = (receiptFirstItem?.unitUsed ?? 'g').trim() || 'g'
  const priceUnitLabel = (receiptFirstItem?.product?.orderUnitRef?.unitName ?? quantityUnitLabel).trim() || 'đơn vị tính đơn giá'
  const orderUnitConversionToBaseRaw =
    receiptFirstItem && quantity != null && quantity > 0 && quantityBase != null
      ? quantityBase / quantity
      : 1
  const orderUnitConversionToBase = Number.isFinite(orderUnitConversionToBaseRaw) && orderUnitConversionToBaseRaw > 0
    ? orderUnitConversionToBaseRaw
    : 1
  const priceUnitConversionToBaseRaw = receiptFirstItem?.product?.orderUnitRef?.conversionToBase ?? 1
  const priceUnitConversionToBase = Number.isFinite(priceUnitConversionToBaseRaw) && priceUnitConversionToBaseRaw > 0
    ? priceUnitConversionToBaseRaw
    : 1
  const priceUnitEquivalent =
    quantity != null && quantityUnitLabel !== priceUnitLabel
      ? (quantity * orderUnitConversionToBase) / priceUnitConversionToBase
      : null
  const unitPrice = receiptFirstItem?.unitPricePerKg ?? null
  const inciNameDisplay = (receiptFirstItem?.product?.inciName ?? '').trim()
  const totalAmount = detail
    ? Math.round(detail.items.reduce((sum, item) => sum + Number(item.lineAmount), 0))
    : null
  const finalWarningMessage = warningMessage ?? 'Sau khi nhấn "Xác nhận Nhập kho", dữ liệu sẽ được khóa và đồng bộ với hệ thống kế toán. Mọi thay đổi sau đó cần phải thực hiện thông qua quy trình điều chỉnh kho chuyên biệt.'

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={receiptRef ? `Chi tiết phiếu nhập ${receiptRef}` : 'Chi tiết phiếu nhập'}
      style={{ width: '92vw', maxWidth: '1320px' }}
      modal
      draggable={false}
      resizable={false}
      className="inbound-step4-preview-dialog"
    >
      {detailLoading ? <p className="po-field-success">Đang tải chi tiết phiếu nhập...</p> : null}
      {detailError ? <p className="po-field-error">{detailError}</p> : null}

      {detail ? (
        <section className="inbound-create-card inbound-step4-review-card inbound-readonly-card">
          <div className="inbound-step4-layout">
            <aside className="inbound-step4-history-panel">
              <div className="inbound-step4-section-header">
                <i className="pi pi-history" />
                <span>LỊCH SỬ THAO TÁC</span>
              </div>
              <HistoryTimeline
                events={history}
                loading={historyLoading}
                error={historyError}
                emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
              />
            </aside>

            <div className="inbound-step4-main">
              {detail.adjustedByReceipt ? <div className="inbound-step4-adjustment-watermark">Hủy do điều chỉnh</div> : null}
              <div className="inbound-step4-body">
                <div className="inbound-step4-banner">
                  <div className="inbound-step4-banner-left">
                    <div className="inbound-step4-title-row">
                      <h3 className="inbound-step4-banner-title">Xác nhận Nhập kho</h3>
                      <span className={`inbound-step4-status-tag ${detail.status}`}>{toInboundStatusLabel(detail.status)}</span>
                    </div>
                    <p className="inbound-step4-banner-docid">
                      <InputText value={detail.receiptRef} readOnly className="inbound-step4-ref-input" />
                    </p>
                  </div>
                  <div className="inbound-step4-banner-right">
                    <span className="inbound-step4-lot-label">LOT NUMBER</span>
                    <span className="inbound-step4-lot-pill">{detail.items[0]?.lotNo ?? '—'}</span>
                  </div>
                </div>

                <div className="inbound-step4-section">
                  <div className="inbound-step4-section-header">
                    <i className="pi pi-info-circle" />
                    <span>THÔNG TIN NGUYÊN LIỆU &amp; ĐỐI TÁC</span>
                  </div>
                  <div className="inbound-step4-info-grid">
                    <div>
                      <p className="inbound-step4-info-label">Nhà cung cấp</p>
                      <p className="inbound-step4-info-value">{detail.supplier?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">Phiếu PO</p>
                      <p className="inbound-step4-info-value">{detail.purchaseRequest?.requestRef ?? '—'}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">Kho lưu trữ</p>
                      <p className="inbound-step4-info-value">{detail.receivingLocation?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">Tên nguyên liệu</p>
                      <p className="inbound-step4-info-value">{detail.items[0]?.product.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">Mã nguyên liệu</p>
                      <p className="inbound-step4-info-value">{detail.items[0]?.product.code ?? '—'}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">INCI Name</p>
                      <p className="inbound-step4-info-value">{inciNameDisplay || '—'}</p>
                    </div>
                    {detail.items[0]?.manufacturer?.name ? (
                      <div>
                        <p className="inbound-step4-info-label">Nhà sản xuất</p>
                        <p className="inbound-step4-info-value">{detail.items[0].manufacturer.name}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="inbound-step4-info-label">Ngày nhận hàng</p>
                      <p className="inbound-step4-info-value">{formatDateOnly(detail.expectedDate)}</p>
                    </div>
                    <div>
                      <p className="inbound-step4-info-label">Trạng thái kiểm tra</p>
                      <span className="inbound-step4-qc-badge">{getQcStatusLabel(detail.items[0]?.qcStatus ?? 'pending')}</span>
                    </div>
                  </div>
                </div>

                <div className="inbound-step4-section">
                  <div className="inbound-step4-section-header">
                    <i className="pi pi-verified" />
                    <span>KIỂM TRA QC THEO TỪNG DÒNG</span>
                  </div>
                  {detail.items.length === 0 ? (
                    <p className="inbound-step4-no-files">Chưa có dòng nhập kho để QC.</p>
                  ) : (
                    <div className="inbound-step4-files-grid inbound-step4-qc-grid">
                      {detail.items.map((item) => (
                        <div key={item.id} className="inbound-step4-file-card">
                          <div className="inbound-step4-file-info" style={{ width: '100%' }}>
                            <p className="inbound-step4-file-name">{item.product.code} - {item.product.name}</p>
                            <div className="inbound-step4-file-meta" style={{ width: '100%', justifyContent: 'space-between' }}>
                              <span>LOT: {item.lotNo}</span>
                              <span>SL: {formatQuantity(item.quantityDisplay)} {item.unitUsed}</span>
                              <span>{item.documents.length > 0 ? 'Có chứng từ' : 'Thiếu chứng từ'}</span>
                            </div>
                            <div className="inbound-step4-qc-radio-group" style={{ marginTop: 10 }}>
                              {QC_STATUS_OPTIONS.map((option) => (
                                <div key={option.value} className="inbound-step4-qc-radio-item">
                                  <RadioButton
                                    inputId={`inbound-shared-qc-${item.id}-${option.value}`}
                                    name={`inbound-shared-qc-${item.id}`}
                                    value={option.value}
                                    checked={item.qcStatus === option.value}
                                    disabled
                                  />
                                  <label>{option.label}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="inbound-step4-section">
                  <div className="inbound-step4-section-header">
                    <i className="pi pi-check-circle" />
                    <span>CHI TIẾT ĐỊNH LƯỢNG &amp; TÀI CHÍNH</span>
                  </div>
                  <div className="inbound-step4-stat-row">
                    <div className="inbound-step4-stat-card">
                      <p className="inbound-step4-stat-label">Số lượng thực nhập</p>
                      <p className="inbound-step4-stat-value">
                        {quantity != null ? `${formatQuantity(quantity)} ${quantityUnitLabel}` : '—'}
                      </p>
                      {priceUnitEquivalent != null ? (
                        <p className="inbound-step4-stat-sub">Tương đương: {formatQuantity(priceUnitEquivalent)} {priceUnitLabel}</p>
                      ) : null}
                    </div>
                    <div className="inbound-step4-stat-card">
                      <p className="inbound-step4-stat-label">Đơn giá (VND/{priceUnitLabel})</p>
                      <p className="inbound-step4-stat-value">
                        {unitPrice != null ? formatCurrency(unitPrice) + ' VND' : '—'}
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
                      {totalAmount != null ? <>{formatCurrency(totalAmount)} <span>VND</span></> : '—'}
                    </p>
                  </div>
                </div>

                <div className="inbound-step4-section">
                  <div className="inbound-step4-section-header">
                    <i className="pi pi-file-edit" />
                    <span>HỒ SƠ TÀI LIỆU ĐÍNH KÈM (STEP 3)</span>
                  </div>
                  {detail.items.flatMap((item) => item.documents).length === 0 ? (
                    <p className="inbound-step4-no-files">Không có tài liệu đính kèm.</p>
                  ) : (
                    <div className="inbound-step4-files-grid">
                      {detail.items.flatMap((item) => item.documents).map((doc) => (
                        <div key={doc.id} className="inbound-step4-file-card">
                          <div className="inbound-step4-file-icon-wrap">
                            <i className="pi pi-file-edit" />
                          </div>
                          <div className="inbound-step4-file-info">
                            <p className="inbound-step4-file-name">{doc.originalName}</p>
                            <div className="inbound-step4-file-meta">
                              <span className={`doc-type-badge doc-type-${String(doc.docType).toLowerCase()}`}>{getDocTypeLabelShort(doc.docType)}</span>
                              <span className="inbound-step4-file-size">{formatFileSize(doc.fileSize)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="inbound-step4-warning">
                  <i className="pi pi-exclamation-circle inbound-step4-warning-icon" />
                  <p>
                    <strong>LƯU Ý QUAN TRỌNG:</strong>{' '}
                    {finalWarningMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </Dialog>
  )
}
