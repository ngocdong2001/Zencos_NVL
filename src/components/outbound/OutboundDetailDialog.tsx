import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import {
  cancelExportOrder,
  createExportVoidRerelease,
  fetchExportOrderDetail,
  fulfilExportOrder,
  type ExportOrderDetail,
} from '../../lib/outboundApi'
import { formatQuantity } from '../purchaseOrder/format'
import { showConfirmAction, showDangerConfirm } from '../../lib/confirm'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  fulfilled: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const PR_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã gửi',
  approved: 'Đã duyệt',
  ordered: 'Đã đặt',
  partially_received: 'Nhận một phần',
  received: 'Đã nhận',
  cancelled: 'Đã hủy',
}

function formatDateVi(value: string | null | undefined): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function formatDateTimeVi(value: string | null | undefined): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

function toNumeric(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type Props = {
  visible: boolean
  onHide: () => void
  /** DB id of the export order to display. Pass null to clear. */
  orderId: string | null
  /** When true, action buttons (Hoàn thành / Hủy / Void) are hidden. Default false. */
  readOnly?: boolean
  /** Called after a successful action so the parent list can refresh. */
  onListRefresh?: () => void
}

export function OutboundDetailDialog({ visible, onHide, orderId, readOnly = false, onListRefresh }: Props) {
  const navigate = useNavigate()
  const [data, setData] = useState<ExportOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const lotItems = useMemo(
    () => (data ? data.items.filter((item) => Boolean(item.batch)) : []),
    [data],
  )

  const reload = async (id: string) => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const detail = await fetchExportOrderDetail(id)
      setData(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết lệnh xuất.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visible && orderId) {
      setActionError(null)
      void reload(orderId)
    }
  }, [visible, orderId])

  const handleFulfil = () => {
    if (!data) return
    const code = data.orderRef ?? `XK-${data.id}`
    showConfirmAction({
      header: 'Xác nhận hoàn thành lệnh xuất',
      message: `Đánh dấu lệnh ${code} là hoàn thành?`,
      acceptLabel: 'Hoàn thành',
      onAccept: () => {
        void (async () => {
          setProcessingId(data.id)
          setActionError(null)
          try {
            await fulfilExportOrder(data.id)
            onListRefresh?.()
            await reload(data.id)
          } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
          } finally {
            setProcessingId(null)
          }
        })()
      },
    })
  }

  const handleCancel = () => {
    if (!data) return
    const code = data.orderRef ?? `XK-${data.id}`
    showDangerConfirm({
      header: 'Xác nhận hủy lệnh xuất',
      message: `Bạn có chắc muốn hủy lệnh ${code}?`,
      acceptLabel: 'Hủy lệnh',
      onAccept: () => {
        void (async () => {
          setProcessingId(data.id)
          setActionError(null)
          try {
            await cancelExportOrder(data.id)
            onListRefresh?.()
            await reload(data.id)
          } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Không thể hủy lệnh xuất.')
          } finally {
            setProcessingId(null)
          }
        })()
      },
    })
  }

  const handleCreateAdjustment = () => {
    if (!data) return
    const code = data.orderRef ?? `XK-${data.id}`
    showConfirmAction({
      header: 'Xác nhận Void & điều chỉnh',
      message: `Tạo phiếu điều chỉnh từ lệnh ${code}? Hệ thống sẽ void phiếu gốc khi bạn hoàn thành phiếu điều chỉnh mới.`,
      acceptLabel: 'Tạo phiếu điều chỉnh',
      onAccept: () => {
        void (async () => {
          setProcessingId(data.id)
          setActionError(null)
          try {
            const created = await createExportVoidRerelease(data.id)
            onListRefresh?.()
            navigate(`/outbound/${created.id}/edit`)
          } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Không thể tạo phiếu điều chỉnh.')
            setProcessingId(null)
          }
        })()
      },
    })
  }

  return (
    <Dialog
      header="Chi tiết lệnh xuất"
      visible={visible}
      onHide={onHide}
      style={{ width: 'min(960px, 96vw)' }}
      modal
    >
      {loading && <p>Đang tải chi tiết...</p>}
      {error && <p className="outbound-detail-error">{error}</p>}
      {actionError && <p className="outbound-detail-error">{actionError}</p>}

      {!loading && !error && data && (
        <div className="outbound-detail-wrap">
          <div className="outbound-detail-meta">
            <div>
              <small>Mã lệnh</small>
              <strong>{data.orderRef ?? `XK-${data.id}`}</strong>
            </div>
            <div>
              <small>Trạng thái</small>
              <span className={`app-status-badge ${data.status}`}>{STATUS_LABELS[data.status] ?? data.status}</span>
            </div>
            <div>
              <small>Khách hàng</small>
              <strong>{data.customer?.name ?? '---'}</strong>
            </div>
            <div>
              <small>Người tạo</small>
              <strong>{data.creator.fullName}</strong>
            </div>
            <div>
              <small>Ngày xuất</small>
              <strong>{formatDateTimeVi(data.exportedAt)}</strong>
            </div>
            <div>
              <small>Ngày tạo</small>
              <strong>{formatDateTimeVi(data.createdAt)}</strong>
            </div>
          </div>

          {data.sourceOrder && (
            <p className="purchase-side-note">
              Phiếu điều chỉnh từ:{' '}
              <strong>{data.sourceOrder.orderRef ?? `#${data.sourceOrder.id}`}</strong>
            </p>
          )}
          {data.adjustedByOrder && (
            <p className="purchase-side-note">
              Đã có phiếu điều chỉnh:{' '}
              <strong>{data.adjustedByOrder.orderRef ?? `#${data.adjustedByOrder.id}`}</strong>
            </p>
          )}

          {!readOnly && data.status === 'pending' && (
            <div className="outbound-status-actions outbound-status-actions-detail">
              <Button
                type="button"
                label="Đánh dấu hoàn thành"
                onClick={handleFulfil}
                loading={processingId === data.id}
                disabled={processingId === data.id}
              />
              <Button
                type="button"
                label="Hủy lệnh"
                severity="danger"
                outlined
                onClick={handleCancel}
                disabled={processingId === data.id}
              />
            </div>
          )}
          {!readOnly && data.status === 'fulfilled' && !data.adjustedByOrder && !data.sourceOrder && (
            <div className="outbound-status-actions outbound-status-actions-detail">
              <Button
                type="button"
                label="Void & Tạo phiếu điều chỉnh"
                icon="pi pi-history"
                outlined
                onClick={handleCreateAdjustment}
                loading={processingId === data.id}
                disabled={processingId === data.id}
              />
            </div>
          )}

          <DataTable value={lotItems} emptyMessage="Không có dòng lô nào.">
            <Column
              header="Nguyên liệu"
              body={(row: ExportOrderDetail['items'][number]) =>
                `${row.product.code} - ${row.product.name}`
              }
            />
            <Column
              header="LOT"
              body={(row: ExportOrderDetail['items'][number]) => row.batch?.lotNo ?? '---'}
            />
            <Column
              header="Hạn dùng"
              body={(row: ExportOrderDetail['items'][number]) =>
                formatDateVi(row.batch?.expiryDate ?? null)
              }
            />
            <Column
              header="SL xuất"
              body={(row: ExportOrderDetail['items'][number]) =>
                `${formatQuantity(toNumeric(row.quantityBase))} ${row.unitUsed}`
              }
            />
          </DataTable>

          {data.purchaseRequests && data.purchaseRequests.length > 0 && (
            <div className="outbound-detail-shortage">
              <h3>Yêu cầu mua hàng liên quan</h3>
              {data.purchaseRequests.map((pr) => (
                <div key={pr.id} className="outbound-detail-pr-card">
                  <div className="outbound-detail-pr-header">
                    <strong>{pr.requestRef}</strong>
                    <span className={`app-status-badge ${pr.status}`}>
                      {PR_STATUS_LABELS[pr.status] ?? pr.status}
                    </span>
                  </div>
                  <div className="outbound-detail-pr-meta">
                    <div>
                      <small>Nhà cung cấp</small>
                      <span>{pr.supplier?.name ?? '---'}</span>
                    </div>
                    <div>
                      <small>Ngày giao dự kiến</small>
                      <span>{pr.expectedDate ? formatDateVi(pr.expectedDate) : '---'}</span>
                    </div>
                    <div>
                      <small>Ngày gửi</small>
                      <span>{pr.submittedAt ? formatDateVi(pr.submittedAt) : '---'}</span>
                    </div>
                    <div>
                      <small>Ngày duyệt</small>
                      <span>{pr.approvedAt ? formatDateVi(pr.approvedAt) : '---'}</span>
                    </div>
                  </div>
                  <DataTable value={pr.items} emptyMessage="Không có dòng hàng.">
                    <Column
                      header="Nguyên liệu"
                      body={(row: ExportOrderDetail['purchaseRequests'][number]['items'][number]) =>
                        `${row.product.code} - ${row.product.name}`
                      }
                    />
                    <Column
                      header="SL cần mua"
                      body={(row: ExportOrderDetail['purchaseRequests'][number]['items'][number]) =>
                        `${formatQuantity(toNumeric(row.quantityNeededBase))} ${row.unitDisplay}`
                      }
                    />
                    <Column
                      header="SL đã nhận"
                      body={(row: ExportOrderDetail['purchaseRequests'][number]['items'][number]) =>
                        `${formatQuantity(toNumeric(row.receivedQtyBase))} ${row.unitDisplay}`
                      }
                    />
                    <Column
                      header="Đơn giá"
                      body={(row: ExportOrderDetail['purchaseRequests'][number]['items'][number]) =>
                        formatQuantity(toNumeric(row.unitPrice))
                      }
                    />
                  </DataTable>
                  {pr.notes?.trim() && (
                    <p className="outbound-detail-pr-notes">
                      <small>Ghi chú PO:</small> {pr.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="outbound-detail-note">
            <small>Ghi chú</small>
            <p>{data.notes?.trim() ? data.notes : 'Không có ghi chú.'}</p>
          </div>
        </div>
      )}
    </Dialog>
  )
}
