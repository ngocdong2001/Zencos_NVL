import { useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { RadioButton } from 'primereact/radiobutton'
import { formatQuantity } from './format'
import type { PurchaseRequestInboundDrilldownResponse } from '../../lib/purchaseShortageApi'
import { recalculatePurchaseRequestReceived } from '../../lib/purchaseShortageApi'
import { STATUS_LABELS, type PoStatus } from './types'
import {
  fetchInboundReceiptDetail,
  fetchInboundReceiptHistory,
  type InboundReceiptDetailResponse,
  type InboundReceiptHistoryRowResponse,
} from '../../lib/inboundApi'
import { HistoryTimeline, type HistoryTimelineEvent } from '../shared/HistoryTimeline'

type Props = {
  data: PurchaseRequestInboundDrilldownResponse | null
  loading: boolean
  error: string | null
  onBack: () => void
  onRecalculated?: () => void
}

type QcStatus = 'pending' | 'passed' | 'failed'

const QC_STATUS_OPTIONS: Array<{ label: string; value: QcStatus }> = [
  { label: 'Chờ QC', value: 'pending' },
  { label: 'Đạt', value: 'passed' },
  { label: 'Không đạt', value: 'failed' },
]

function formatDateTime(value?: string | null): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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

function toPoBadgeStatus(value: string): PoStatus {
  if (value === 'draft' || value === 'submitted' || value === 'approved' || value === 'ordered' || value === 'partially_received' || value === 'received' || value === 'cancelled') {
    return value
  }
  return 'draft'
}

function toInboundStatusLabel(status: string): string {
  if (status === 'posted') return 'Đã posted'
  if (status === 'pending_qc') return 'Chờ QC'
  if (status === 'cancelled') return 'Đã hủy'
  return 'Nháp'
}

export function PurchaseOrderInboundDrilldownScreen({ data, loading, error, onBack, onRecalculated }: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)
  const [receiptDialogVisible, setReceiptDialogVisible] = useState(false)
  const [selectedReceiptCode, setSelectedReceiptCode] = useState<string | null>(null)
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<InboundReceiptDetailResponse | null>(null)
  const [selectedReceiptHistory, setSelectedReceiptHistory] = useState<HistoryTimelineEvent[]>([])
  const [receiptDetailLoading, setReceiptDetailLoading] = useState(false)
  const [receiptDetailError, setReceiptDetailError] = useState<string | null>(null)
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false)
  const [receiptHistoryError, setReceiptHistoryError] = useState<string | null>(null)

  const mapHistoryRows = (rows: InboundReceiptHistoryRowResponse[]): HistoryTimelineEvent[] => {
    return rows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      action: row.actionLabel,
      actorName: row.actorName,
      at: row.createdAt,
    }))
  }

  const openReceiptDialog = async (receiptId: string, receiptRef: string) => {
    setReceiptDialogVisible(true)
    setSelectedReceiptCode(receiptRef)
    setSelectedReceiptDetail(null)
    setSelectedReceiptHistory([])
    setReceiptDetailError(null)
    setReceiptHistoryError(null)
    setReceiptDetailLoading(true)
    setReceiptHistoryLoading(true)

    try {
      const detail = await fetchInboundReceiptDetail(receiptId)
      setSelectedReceiptDetail(detail)
    } catch (fetchError) {
      setReceiptDetailError(fetchError instanceof Error ? fetchError.message : 'Không thể tải chi tiết phiếu nhập.')
    } finally {
      setReceiptDetailLoading(false)
    }

    try {
      const historyRows = await fetchInboundReceiptHistory(receiptId)
      setSelectedReceiptHistory(mapHistoryRows(historyRows))
    } catch (fetchError) {
      setReceiptHistoryError(fetchError instanceof Error ? fetchError.message : 'Không thể tải lịch sử phiếu nhập.')
      setSelectedReceiptHistory([])
    } finally {
      setReceiptHistoryLoading(false)
    }
  }

  const receiptDetailsByPoItemId = useMemo(() => {
    if (!data) return new Map<string, Array<{
      receiptId: string
      receiptRef: string
      receiptStatus: string
      isSuperseded: boolean
      createdAt: string
      receivedAt?: string | null
      lotNo: string
      quantityBase: number
      quantityDisplay: number
      unitUsed: string
      unitPricePerKg: number
      lineAmount: number
      invoiceNumber?: string | null
      qcStatus: 'pending' | 'passed' | 'failed'
    }>>()

    const nextMap = new Map<string, Array<{
      receiptId: string
      receiptRef: string
      receiptStatus: string
      isSuperseded: boolean
      createdAt: string
      receivedAt?: string | null
      lotNo: string
      quantityBase: number
      quantityDisplay: number
      unitUsed: string
      unitPricePerKg: number
      lineAmount: number
      invoiceNumber?: string | null
      qcStatus: 'pending' | 'passed' | 'failed'
    }>>()

    for (const receipt of data.receipts) {
      for (const item of receipt.items) {
        if (!item.purchaseRequestItemId) continue
        const current = nextMap.get(item.purchaseRequestItemId) ?? []
        current.push({
          receiptId: receipt.id,
          receiptRef: receipt.receiptRef,
          receiptStatus: receipt.status,
          isSuperseded: !!receipt.adjustedByReceipt,
          createdAt: receipt.createdAt,
          receivedAt: receipt.receivedAt,
          lotNo: item.lotNo,
          quantityBase: item.quantityBase,
          quantityDisplay: item.quantityDisplay,
          unitUsed: item.unitUsed,
          unitPricePerKg: item.unitPricePerKg,
          lineAmount: item.lineAmount,
          invoiceNumber: item.invoiceNumber,
          qcStatus: item.qcStatus,
        })
        nextMap.set(item.purchaseRequestItemId, current)
      }
    }

    return nextMap
  }, [data])

  const materialRollups = useMemo(() => {
    if (!data) return []

    return data.poItems.map((poItem) => {
      const relatedReceiptItems = data.receipts
        .filter((receipt) => receipt.status !== 'cancelled' && !receipt.adjustedByReceipt)
        .flatMap((receipt) =>
          receipt.items.filter((item) => item.purchaseRequestItemId === poItem.id),
        )

      const receiptIds = new Set(relatedReceiptItems.map((item) => item.id))
      const distinctLotCount = new Set(relatedReceiptItems.map((item) => item.lotNo)).size
      const importedQtyBase = relatedReceiptItems.reduce((sum, item) => sum + item.quantityBase, 0)
      const remainingQtyBase = Math.max(0, poItem.quantityNeededBase - poItem.receivedQtyBase)

      return {
        id: poItem.id,
        productCode: poItem.product.code,
        productName: poItem.product.name,
        orderedQtyBase: poItem.quantityNeededBase,
        receivedQtyBase: poItem.receivedQtyBase,
        importedQtyBase,
        remainingQtyBase,
        receiptCount: receiptIds.size,
        lotCount: distinctLotCount,
      }
    })
  }, [data])

  const renderPoItemSubDetails = (row: PurchaseRequestInboundDrilldownResponse['poItems'][number]) => {
    const details = receiptDetailsByPoItemId.get(row.id) ?? []

    if (details.length === 0) {
      return <p className="purchase-side-note">Dòng PO này chưa phát sinh phiếu nhập nào.</p>
    }

    return (
      <div className="po-drilldown-subdetails">
        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable value={details} stripedRows className="inbound-table prime-catalog-table" emptyMessage="Chưa có chi tiết phiếu nhập.">
            <Column
              field="receiptRef"
              header="Phiếu nhập"
              style={{ width: '150px' }}
              body={(detail) => (
                <button
                  type="button"
                  className="inbound-code-btn"
                  onClick={() => {
                    void openReceiptDialog(detail.receiptId, detail.receiptRef)
                  }}
                >
                  {detail.receiptRef}
                </button>
              )}
            />
            <Column
              header="Trạng thái"
              body={(detail) => (
                detail.isSuperseded
                  ? <span className="inbound-status-badge cancelled">Đã điều chỉnh</span>
                  : <span className={`inbound-status-badge ${detail.receiptStatus === 'posted' ? 'done' : detail.receiptStatus === 'pending_qc' ? 'waiting_qc' : detail.receiptStatus}`}>
                      {toInboundStatusLabel(detail.receiptStatus)}
                    </span>
              )}
              style={{ width: '130px' }}
            />
            <Column header="Ngày tạo" body={(detail) => formatDateTime(detail.createdAt)} style={{ width: '150px' }} />
            <Column header="Ngày posted" body={(detail) => formatDateTime(detail.receivedAt)} style={{ width: '150px' }} />
            <Column field="lotNo" header="Số lô" style={{ width: '150px' }} />
            <Column header="SL" body={(detail) => formatQuantity(detail.quantityBase)} style={{ width: '120px' }} />
            <Column header="Đơn giá" body={(detail) => formatCurrency(detail.unitPricePerKg)} style={{ width: '120px' }} />
            <Column header="Thành tiền" body={(detail) => formatCurrency(detail.lineAmount)} style={{ width: '130px' }} />
            <Column header="QC" body={(detail) => detail.qcStatus === 'passed' ? 'Đạt' : detail.qcStatus === 'failed' ? 'Không đạt' : 'Chờ QC'} style={{ width: '100px' }} />
            <Column header="Hóa đơn" body={(detail) => detail.invoiceNumber || '---'} style={{ width: '140px' }} />
          </DataTable>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="purchase-detail-shell po-drilldown-shell">
        <header className="purchase-detail-header po-drilldown-header">
        <div className="purchase-detail-title-wrap">
          <Button
            type="button"
            className="purchase-detail-back-btn"
            icon="pi pi-angle-left"
            text
            onClick={onBack}
            aria-label="Quay lại Yêu cầu mua hàng"
          />
          <div>
            <div className="purchase-detail-title-row">
              <h2>Drill Down Phiếu Nhập Theo PO</h2>
              {data ? <span className={`purchase-detail-draft-tag po-status-badge ${toPoBadgeStatus(data.status)}`}>{STATUS_LABELS[toPoBadgeStatus(data.status)]}</span> : null}
            </div>
              {data ? (
                <div className="purchase-detail-actions" style={{ marginTop: '6px' }}>
                  <Button
                    type="button"
                    className="purchase-detail-action-btn"
                    icon={recalcLoading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
                    label="Tái tính SL nhận"
                    severity="warning"
                    size="small"
                    disabled={recalcLoading}
                    onClick={async () => {
                      setRecalcLoading(true)
                      setRecalcMsg(null)
                      try {
                        await recalculatePurchaseRequestReceived(data.id)
                        setRecalcMsg('Đã tái tính thành công.')
                        onRecalculated?.()
                      } catch {
                        setRecalcMsg('Tái tính thất bại.')
                      } finally {
                        setRecalcLoading(false)
                      }
                    }}
                  />
                  {recalcMsg ? <span className="purchase-side-note" style={{ marginLeft: '8px' }}>{recalcMsg}</span> : null}
                </div>
              ) : null}
            <p className="purchase-side-note">
              {data ? `Theo dõi chi tiết các phiếu nhập kho phát sinh từ PO ${data.requestRef}.` : 'Đang tải dữ liệu drill-down theo phiếu PO.'}
            </p>
          </div>
        </div>
      </header>

      {loading ? <p className="po-field-success">Đang tải dữ liệu phiếu nhập theo PO...</p> : null}
      {error ? <p className="po-field-error">{error}</p> : null}

        {data ? (
          <div className="po-drilldown-grid">
          <section className="purchase-detail-card po-drilldown-card">
            <h3><i className="pi pi-file" aria-hidden /> Thông tin PO</h3>
            <div className="po-drilldown-meta-grid">
              <p><strong>Mã PO:</strong> {data.requestRef}</p>
              <p><strong>Nhà cung cấp:</strong> {data.supplier?.name ?? '---'}</p>
              <p><strong>Kho nhận:</strong> {data.receivingLocation?.name ?? '---'}</p>
              <p><strong>Người tạo:</strong> {data.requester?.fullName ?? '---'}</p>
              <p><strong>Ngày cần hàng:</strong> {formatDateOnly(data.expectedDate)}</p>
              <p><strong>Ngày nhận đủ:</strong> {formatDateOnly(data.receivedAt)}</p>
            </div>
          </section>

          <section className="purchase-detail-card po-drilldown-card">
            <h3><i className="pi pi-chart-bar" aria-hidden /> Tổng quan nhận hàng</h3>
            <div className="po-drilldown-summary-grid">
              <article className="po-drilldown-summary-card">
                <span>Tổng số phiếu nhập</span>
                <strong>{data.summary.receiptCount}</strong>
              </article>
              <article className="po-drilldown-summary-card">
                <span>Tổng số dòng PO</span>
                <strong>{data.summary.lineCount}</strong>
              </article>
              <article className="po-drilldown-summary-card">
                <span>SL đặt mua</span>
                <strong>{formatQuantity(data.summary.orderedQtyBaseTotal)}</strong>
              </article>
              <article className="po-drilldown-summary-card">
                <span>SL đã nhận</span>
                <strong>{formatQuantity(data.summary.receivedQtyBaseTotal)}</strong>
              </article>
              <article className="po-drilldown-summary-card warning">
                <span>SL còn lại</span>
                <strong>{formatQuantity(data.summary.remainingQtyBaseTotal)}</strong>
              </article>
            </div>
          </section>

          <section className="purchase-detail-card po-drilldown-card">
            <h3><i className="pi pi-list" aria-hidden /> Tổng hợp theo dòng PO</h3>
            <div className="po-table-wrap">
              <DataTable
                value={data.poItems}
                dataKey="id"
                expandedRows={expandedRows}
                onRowToggle={(event) => setExpandedRows((event.data ?? {}) as Record<string, boolean>)}
                rowExpansionTemplate={renderPoItemSubDetails}
                stripedRows
                className="po-table prime-catalog-table"
                emptyMessage="PO chưa có dòng vật tư."
              >
                <Column expander style={{ width: '52px' }} />
                <Column field="product.code" header="Mã NVL" style={{ width: '160px' }} />
                <Column field="product.name" header="Tên nguyên vật liệu" />
                <Column header="SL đặt" body={(row) => `${formatQuantity(row.quantityDisplay)} ${row.unitDisplay || ''}`} style={{ width: '140px' }} />
                <Column header="SL base đặt" body={(row) => formatQuantity(row.quantityNeededBase)} style={{ width: '140px' }} />
                <Column header="SL base đã nhận" body={(row) => formatQuantity(row.receivedQtyBase)} style={{ width: '160px' }} />
                <Column
                  header="Phát sinh nhận hàng"
                  style={{ width: '180px' }}
                  body={(row) => {
                    const details = receiptDetailsByPoItemId.get(row.id) ?? []
                    const activeDetails = details.filter((d) => d.receiptStatus !== 'cancelled' && !d.isSuperseded)
                    const receiptCount = new Set(activeDetails.map((detail) => detail.receiptId)).size
                    const lotCount = new Set(activeDetails.map((detail) => detail.lotNo)).size
                    return (
                      <div className="po-drilldown-audit-cell">
                        <strong>{receiptCount} phiếu / {lotCount} lô</strong>
                        <span>Mở rộng để xem chi tiết từng phiếu nhập</span>
                      </div>
                    )
                  }}
                />
                <Column
                  header="Còn lại"
                  body={(row) => formatQuantity(Math.max(0, row.quantityNeededBase - row.receivedQtyBase))}
                  style={{ width: '140px' }}
                />
              </DataTable>
            </div>
          </section>

          <section className="purchase-detail-card po-drilldown-card">
            <h3><i className="pi pi-box" aria-hidden /> Gom nhóm theo nguyên vật liệu</h3>
            <div className="po-table-wrap">
              <DataTable value={materialRollups} stripedRows className="po-table prime-catalog-table" emptyMessage="Chưa có dữ liệu tổng hợp theo nguyên vật liệu.">
                <Column field="productCode" header="Mã NVL" style={{ width: '140px' }} />
                <Column field="productName" header="Tên nguyên vật liệu" style={{ width: '260px' }} />
                <Column header="Số phiếu nhập" body={(row) => row.receiptCount} style={{ width: '120px' }} />
                <Column header="Số lô" body={(row) => row.lotCount} style={{ width: '100px' }} />
                <Column header="Kế hoạch PO" body={(row) => formatQuantity(row.orderedQtyBase)} style={{ width: '130px' }} />
                <Column header="Tổng đã nhận" body={(row) => formatQuantity(row.receivedQtyBase)} style={{ width: '140px' }} />
                <Column header="Tổng SL từ phiếu nhập" body={(row) => formatQuantity(row.importedQtyBase)} style={{ width: '170px' }} />
                <Column
                  header="Còn lại"
                  body={(row) => (
                    <span className={row.remainingQtyBase > 0 ? 'po-drilldown-remaining warning' : 'po-drilldown-remaining'}>
                      {formatQuantity(row.remainingQtyBase)}
                    </span>
                  )}
                  style={{ width: '120px' }}
                />
              </DataTable>
            </div>
          </section>

          </div>
        ) : null}
      </section>

      <Dialog
        visible={receiptDialogVisible}
        onHide={() => setReceiptDialogVisible(false)}
        header={selectedReceiptCode ? `Chi tiết phiếu nhập ${selectedReceiptCode}` : 'Chi tiết phiếu nhập'}
        style={{ width: '92vw', maxWidth: '1320px' }}
        modal
        draggable={false}
        resizable={false}
        className="inbound-step4-preview-dialog"
      >
        {receiptDetailLoading ? <p className="po-field-success">Đang tải chi tiết phiếu nhập...</p> : null}
        {receiptDetailError ? <p className="po-field-error">{receiptDetailError}</p> : null}

        {selectedReceiptDetail ? (
          <section className="inbound-create-card inbound-step4-review-card inbound-readonly-card">
            <div className="inbound-step4-layout">
              <aside className="inbound-step4-history-panel">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-history" />
                  <span>LỊCH SỬ THAO TÁC</span>
                </div>
                <HistoryTimeline
                  events={selectedReceiptHistory}
                  loading={receiptHistoryLoading}
                  error={receiptHistoryError}
                  emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
                />
              </aside>

              <div className="inbound-step4-main">
                {selectedReceiptDetail.adjustedByReceipt ? <div className="inbound-step4-adjustment-watermark">Hủy do điều chỉnh</div> : null}
                <div className="inbound-step4-body">
                  <div className="inbound-step4-banner">
                    <div className="inbound-step4-banner-left">
                      <div className="inbound-step4-title-row">
                        <h3 className="inbound-step4-banner-title">Xác nhận Nhập kho</h3>
                        <span className={`inbound-step4-status-tag ${selectedReceiptDetail.status}`}>{toInboundStatusLabel(selectedReceiptDetail.status)}</span>
                      </div>
                      <p className="inbound-step4-banner-docid">
                        <InputText value={selectedReceiptDetail.receiptRef} readOnly className="inbound-step4-ref-input" />
                      </p>
                    </div>
                    <div className="inbound-step4-banner-right">
                      <span className="inbound-step4-lot-label">LOT NUMBER</span>
                      <span className="inbound-step4-lot-pill">{selectedReceiptDetail.items[0]?.lotNo ?? '—'}</span>
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
                        <p className="inbound-step4-info-value">{selectedReceiptDetail.supplier?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="inbound-step4-info-label">Kho lưu trữ</p>
                        <p className="inbound-step4-info-value">{selectedReceiptDetail.receivingLocation?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="inbound-step4-info-label">Tên nguyên liệu</p>
                        <p className="inbound-step4-info-value">{selectedReceiptDetail.items[0]?.product.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="inbound-step4-info-label">Mã nguyên liệu</p>
                        <p className="inbound-step4-info-value">{selectedReceiptDetail.items[0]?.product.code ?? '—'}</p>
                      </div>
                      <div>
                        <p className="inbound-step4-info-label">Ngày nhận hàng</p>
                        <p className="inbound-step4-info-value">{formatDateOnly(selectedReceiptDetail.expectedDate)}</p>
                      </div>
                      <div>
                        <p className="inbound-step4-info-label">Trạng thái kiểm tra</p>
                        <span className="inbound-step4-qc-badge">{getQcStatusLabel(selectedReceiptDetail.items[0]?.qcStatus ?? 'pending')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-verified" />
                      <span>KIỂM TRA QC THEO TỪNG DÒNG</span>
                    </div>
                    {selectedReceiptDetail.items.length === 0 ? (
                      <p className="inbound-step4-no-files">Chưa có dòng nhập kho để QC.</p>
                    ) : (
                      <div className="inbound-step4-files-grid inbound-step4-qc-grid">
                        {selectedReceiptDetail.items.map((item) => (
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
                                      inputId={`po-drilldown-qc-${item.id}-${option.value}`}
                                      name={`po-drilldown-qc-${item.id}`}
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
                          {formatQuantity(selectedReceiptDetail.items.reduce((sum, item) => sum + Number(item.quantityDisplay), 0))}
                        </p>
                        <p className="inbound-step4-stat-sub">Tổng theo đơn vị nhập của từng dòng</p>
                      </div>
                      <div className="inbound-step4-stat-card">
                        <p className="inbound-step4-stat-label">Đơn giá trung bình (VND/kg)</p>
                        <p className="inbound-step4-stat-value">
                          {selectedReceiptDetail.items.length > 0
                            ? formatCurrency(Math.round(selectedReceiptDetail.items.reduce((sum, item) => sum + Number(item.unitPricePerKg), 0) / selectedReceiptDetail.items.length)) + ' VND'
                            : '—'}
                        </p>
                        <p className="inbound-step4-stat-sub">Giá trung bình các dòng trong phiếu</p>
                      </div>
                    </div>

                    <div className="inbound-step4-total-bar">
                      <div>
                        <p className="inbound-step4-total-label">TỔNG GIÁ TRỊ THANH TOÁN</p>
                        <p className="inbound-step4-total-sub">Tổng cộng toàn bộ dòng chi tiết trong phiếu nhập</p>
                      </div>
                      <p className="inbound-step4-total-amount">
                        {formatCurrency(Math.round(selectedReceiptDetail.items.reduce((sum, item) => sum + Number(item.lineAmount), 0)))} <span>VND</span>
                      </p>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-file-edit" />
                      <span>HỒ SƠ TÀI LIỆU ĐÍNH KÈM (STEP 3)</span>
                    </div>
                    {selectedReceiptDetail.items.flatMap((item) => item.documents).length === 0 ? (
                      <p className="inbound-step4-no-files">Không có tài liệu đính kèm.</p>
                    ) : (
                      <div className="inbound-step4-files-grid">
                        {selectedReceiptDetail.items.flatMap((item) => item.documents).map((doc) => (
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
                      Đây là màn hình tra cứu read-only theo nội dung step 4 của phiếu nhập.
                      Dữ liệu không thể chỉnh sửa từ drill-down PO.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </Dialog>
    </>
  )
}