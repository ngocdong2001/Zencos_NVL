import { useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { formatQuantity } from './format'
import type { PurchaseRequestInboundDrilldownResponse } from '../../lib/purchaseShortageApi'
import { recalculatePurchaseRequestReceived } from '../../lib/purchaseShortageApi'
import { PurchaseOrderLineSummarySection } from './PurchaseOrderLineSummarySection'
import { STATUS_LABELS, type PoStatus } from './types'
import {
  fetchInboundReceiptDetail,
  fetchInboundReceiptHistory,
  type InboundReceiptDetailResponse,
  type InboundReceiptHistoryRowResponse,
} from '../../lib/inboundApi'
import { type HistoryTimelineEvent } from '../shared/HistoryTimeline'
import { InboundReceiptDetailDialog } from '../inbound/InboundReceiptDetailDialog'

type Props = {
  data: PurchaseRequestInboundDrilldownResponse | null
  loading: boolean
  error: string | null
  onBack: () => void
  onRecalculated?: () => void
}

function formatDateOnly(value?: string | null): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function toPoBadgeStatus(value: string): PoStatus {
  if (value === 'draft' || value === 'submitted' || value === 'approved' || value === 'ordered' || value === 'partially_received' || value === 'received' || value === 'cancelled') {
    return value
  }
  return 'draft'
}

export function PurchaseOrderInboundDrilldownScreen({ data, loading, error, onBack, onRecalculated }: Props) {
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
              {data ? <span className={`purchase-detail-draft-tag app-status-badge ${toPoBadgeStatus(data.status)}`}>{STATUS_LABELS[toPoBadgeStatus(data.status)]}</span> : null}
            </div>
              {data ? (
                <div hidden className="purchase-detail-actions" style={{ marginTop: '6px' }}>
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
              <p><strong>Tổng số phiếu nhập:</strong> {data.summary.receiptCount}</p>
              <p><strong>Tổng số dòng PO:</strong> {data.summary.lineCount}</p>
              <p><strong>SL đặt mua:</strong> {formatQuantity(data.summary.orderedQtyBaseTotal)}</p>
              <p><strong>SL đã nhận:</strong> {formatQuantity(data.summary.receivedQtyBaseTotal)}</p>
              <p><strong>SL còn lại:</strong> <span className={data.summary.remainingQtyBaseTotal > 0 ? 'po-drilldown-remaining warning' : 'po-drilldown-remaining'}>{formatQuantity(data.summary.remainingQtyBaseTotal)}</span></p>
            </div>
          </section>

          <PurchaseOrderLineSummarySection data={data} onOpenReceipt={openReceiptDialog} />

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

      <InboundReceiptDetailDialog
        visible={receiptDialogVisible}
        onHide={() => setReceiptDialogVisible(false)}
        receiptRef={selectedReceiptCode}
        detail={selectedReceiptDetail}
        detailLoading={receiptDetailLoading}
        detailError={receiptDetailError}
        history={selectedReceiptHistory}
        historyLoading={receiptHistoryLoading}
        historyError={receiptHistoryError}
      />
    </>
  )
}