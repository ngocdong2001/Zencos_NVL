import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import {
  cancelTpExportOrder,
  createTpVoidRerelease,
  fetchTpExportOrders,
  fulfilTpExportOrder,
  type TpExportOrderListRow,
  type TpExportOrderStatus,
} from '../lib/tpOutboundApi'
import { formatQuantity } from '../components/purchaseOrder/format'
import { showConfirmAction, showDangerConfirm } from '../lib/confirm'

const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 50]

type OutletContext = { search: string }

type TpRow = {
  id: string
  code: string
  exportedDate: string
  createdAt: string
  customer: string
  itemCount: number
  totalQty: number
  status: TpExportOrderStatus
  sourceOrderId: string | null
  adjustedByOrderId: string | null
  dienGiai: string | null
}

const HISTORY_STATUS_OPTIONS: Array<{ label: string; value: TpExportOrderStatus | 'all' }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Hoàn thành', value: 'fulfilled' },
  { label: 'Đã hủy', value: 'cancelled' },
]

const STATUS_LABELS: Record<TpExportOrderStatus, string> = {
  pending: 'Chờ xử lý',
  fulfilled: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getDefaultMonthDateRange(): Date[] {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [from, to]
}

function parseYmd(value: string): Date {
  if (!value) return new Date(0)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function formatDateVi(value: string | null): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function formatDateTimeVi(value: string | null): string {
  if (!value) return '---'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function toNumeric(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapTpRow(row: TpExportOrderListRow): TpRow {
  const totalQty = row.items.reduce((s, i) => s + toNumeric(i.quantityBase), 0)
  return {
    id: String(row.id),
    code: row.orderRef ?? `#${row.id}`,
    exportedDate: row.exportedAt ?? row.createdAt,
    createdAt: row.createdAt,
    customer: row.customer?.name ?? '---',
    itemCount: row.items.length,
    totalQty,
    status: row.status,
    sourceOrderId: row.sourceOrderId ?? null,
    adjustedByOrderId: row.adjustedByOrderId ?? null,
    dienGiai: row.dienGiai ?? null,
  }
}

function canCreateAdjustment(row: TpRow): boolean {
  return row.status === 'fulfilled' && !row.adjustedByOrderId && !row.sourceOrderId
}

export function TpOutboundListPage() {
  const { search } = useOutletContext<OutletContext>()
  const location = useLocation()
  const navigate = useNavigate()
  const creationState = location.state as { createdOrderId?: string } | null
  const [rows, setRows] = useState<TpRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<TpExportOrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null)
  const defaultDateRange = getDefaultMonthDateRange()
  const [fromDate, setFromDate] = useState<Date | null>(defaultDateRange[0])
  const [toDate, setToDate] = useState<Date | null>(defaultDateRange[1])

  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

  const refreshList = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchTpExportOrders({ page: 1, limit: 500, status: 'all', sortBy: 'createdAt', sortDir: 'desc' })
      setRows(response.data.map(mapTpRow))
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lệnh xuất thành phẩm.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refreshList() }, [])

  useEffect(() => { setPage(1) }, [pageSize, statusFilter, search, fromDate, toDate])

  useEffect(() => {
    if (!creationState?.createdOrderId) return
    setStatusFilter('all')
    setPage(1)
    setHighlightedOrderId(creationState.createdOrderId)
    navigate('/tp-outbound', { replace: true, state: null })
  }, [creationState?.createdOrderId, navigate])

  useEffect(() => {
    if (!highlightedOrderId) return
    const timer = window.setTimeout(() => setHighlightedOrderId(null), 7000)
    return () => window.clearTimeout(timer)
  }, [highlightedOrderId])

  const filteredRows = useMemo(() => {
    const globalQuery = normalizeLookup(search)
    const from = fromDate
    const to = toDate
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      const rowDate = parseYmd(row.exportedDate)
      if (from && rowDate < from) return false
      if (to && rowDate > to) return false
      const searchable = normalizeLookup([row.code, row.customer, STATUS_LABELS[row.status], String(row.itemCount)].join(' '))
      if (globalQuery && !searchable.includes(globalQuery)) return false
      return true
    })
  }, [fromDate, rows, search, statusFilter, toDate])

  const stats = useMemo(() => {
    const now = new Date()
    const m = now.getMonth()
    const y = now.getFullYear()
    const monthRows = rows.filter((r) => {
      const d = parseYmd(r.exportedDate)
      return d.getMonth() === m && d.getFullYear() === y
    })
    return {
      monthTotal: monthRows.length,
      pendingCount: rows.filter((r) => r.status === 'pending').length,
      cancelledCount: rows.filter((r) => r.status === 'cancelled').length,
    }
  }, [rows])

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(start, start + pageSize)
  const rangeStart = total === 0 ? 0 : start + 1
  const rangeEnd = total === 0 ? 0 : Math.min(total, start + pageSize)

  const processStatus = async (orderId: string, action: 'fulfil' | 'cancel') => {
    setProcessingOrderId(orderId)
    setError(null)
    try {
      if (action === 'fulfil') await fulfilTpExportOrder(orderId)
      else await cancelTpExportOrder(orderId)
      await refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const processCreateAdjustment = async (orderId: string) => {
    setProcessingOrderId(orderId)
    setError(null)
    try {
      const created = await createTpVoidRerelease(orderId)
      await refreshList()
      navigate(`/tp-outbound/${created.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo phiếu điều chỉnh.')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const confirmFulfilOrder = (row: TpRow) => {
    showConfirmAction({
      header: 'Xác nhận hoàn thành',
      message: `Đánh dấu lệnh ${row.code} là hoàn thành?`,
      acceptLabel: 'Hoàn thành',
      onAccept: () => { void processStatus(row.id, 'fulfil') },
    })
  }

  const confirmCancelOrder = (row: TpRow) => {
    showDangerConfirm({
      header: 'Xác nhận hủy lệnh xuất',
      message: `Bạn có chắc muốn hủy lệnh ${row.code}?`,
      acceptLabel: 'Hủy lệnh',
      onAccept: () => { void processStatus(row.id, 'cancel') },
    })
  }

  const confirmCreateAdjustment = (row: TpRow) => {
    showConfirmAction({
      header: 'Xác nhận Void & điều chỉnh',
      message: `Tạo phiếu điều chỉnh từ lệnh ${row.code}? Hệ thống sẽ void phiếu gốc khi bạn hoàn thành phiếu điều chỉnh mới.`,
      acceptLabel: 'Tạo phiếu điều chỉnh',
      onAccept: () => { void processCreateAdjustment(row.id) },
    })
  }

  return (
    <section className="inbound-shell outbound-list-shell">
      <div className="title-bar inbound-title-row">
        <div>
          <h2>Danh sách lệnh xuất thành phẩm</h2>
          <p>Quản lý và tra cứu các lệnh xuất hàng thành phẩm (TP/BTP).</p>
        </div>
        <div className="title-actions">
          <Button type="button" className="btn btn-primary" icon="pi pi-plus" label="Tạo lệnh mới" onClick={() => navigate('/tp-outbound/new')} />
        </div>
      </div>

      <section className="inbound-stats-grid">
        <article className="inbound-stat-card tone-primary">
          <div>
            <p>Tổng phiếu xuất (Tháng)</p>
            <strong>{formatQuantity(stats.monthTotal)}</strong>
          </div>
          <div className="inbound-stat-icon"><i className="pi pi-send" /></div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Lệnh chờ xử lý</p>
            <strong>{formatQuantity(stats.pendingCount)}</strong>
          </div>
          <div className="inbound-stat-icon muted"><i className="pi pi-clock" /></div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Lệnh đã hủy</p>
            <strong>{formatQuantity(stats.cancelledCount)}</strong>
          </div>
          <div className="inbound-stat-icon muted"><i className="pi pi-times-circle" /></div>
        </article>
      </section>

      <section className="inbound-table-card">
        <div className="app-table-toolbar">
          <label className="app-filter-control">
            <i className="pi pi-filter" aria-hidden />
            <Dropdown
              value={statusFilter}
              options={HISTORY_STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setStatusFilter((e.value ?? 'all') as TpExportOrderStatus | 'all')}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <div className="app-filter-control app-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Từ ngày</span>
            <Calendar value={fromDate} onChange={(e) => { setFromDate((e.value as Date | null) ?? null); setPage(1) }} dateFormat="dd/mm/yy" readOnlyInput showIcon />
          </div>

          <div className="app-filter-control app-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Đến ngày</span>
            <Calendar value={toDate} onChange={(e) => { setToDate((e.value as Date | null) ?? null); setPage(1) }} dateFormat="dd/mm/yy" readOnlyInput showIcon />
          </div>
        </div>

        {error && (
          <div className="catalog-inline-notice error">
            <span>{error}</span>
            <button type="button" className="catalog-inline-notice-close" onClick={() => setError(null)} aria-label="Đóng">×</button>
          </div>
        )}

        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable
            value={visibleRows}
            loading={loading}
            className="inbound-table prime-catalog-table outbound-history-table"
            stripedRows
            emptyMessage="Không có lệnh xuất thành phẩm phù hợp bộ lọc."
            rowClassName={(row: TpRow) => (row.id === highlightedOrderId ? 'outbound-history-row-highlight' : '')}
          >
            <Column
              header="Mã lệnh"
              field="code"
              sortable
              style={{ width: '11rem' }}
              body={(row: TpRow) => (
                <button type="button" className="inbound-code-btn" onClick={() => navigate(`/tp-outbound/${row.id}/edit`)}>{row.code}</button>
              )}
            />
            <Column field="exportedDate" header="Ngày xuất" sortable style={{ width: '8.5rem' }} body={(row: TpRow) => formatDateVi(row.exportedDate)} />
            <Column field="customer" header="Khách hàng" sortable style={{ width: '14rem' }} />
            <Column field="dienGiai" header="Diễn giải" style={{ minWidth: '12rem' }} body={(row: TpRow) => row.dienGiai ?? '---'} />
            <Column field="itemCount" header="Số mặt hàng" sortable style={{ width: '8rem' }} body={(row: TpRow) => <span className="inbound-number">{row.itemCount}</span>} />
            <Column
              field="totalQty"
              header="Tổng SL xuất"
              sortable
              style={{ width: '10rem' }}
              body={(row: TpRow) => <span className="inbound-number">{formatQuantity(row.totalQty)}</span>}
            />
            <Column
              field="status"
              header="Trạng thái"
              sortable
              style={{ width: '9rem' }}
              body={(row: TpRow) => <span className={`app-status-badge ${row.status}`}>{STATUS_LABELS[row.status]}</span>}
            />
            <Column
              header="Thao tác"
              style={{ width: '11rem' }}
              body={(row: TpRow) => {
                const isProcessing = processingOrderId === row.id
                return (
                  <span className="inbound-actions-cell">
                    <Button
                      type="button" icon="pi pi-pencil" text className="icon-btn"
                      aria-label="Chỉnh sửa" tooltip="Chỉnh sửa" tooltipOptions={{ position: 'top' }}
                      onClick={() => navigate(`/tp-outbound/${row.id}/edit`)}
                    />
                    {row.status === 'pending' ? (
                      <>
                        <Button
                          type="button" icon="pi pi-check" text className="icon-btn"
                          aria-label="Đánh dấu hoàn thành" tooltip="Đánh dấu hoàn thành" tooltipOptions={{ position: 'top' }}
                          onClick={() => confirmFulfilOrder(row)}
                          loading={isProcessing} disabled={isProcessing}
                        />
                        <Button
                          type="button" icon="pi pi-times" text severity="danger" className="icon-btn"
                          aria-label="Hủy lệnh" tooltip="Hủy lệnh" tooltipOptions={{ position: 'top' }}
                          onClick={() => confirmCancelOrder(row)} disabled={isProcessing}
                        />
                      </>
                    ) : null}
                    {canCreateAdjustment(row) ? (
                      <Button
                        type="button" icon="pi pi-history" text className="icon-btn"
                        aria-label="Tạo phiếu điều chỉnh" tooltip="Void & tạo phiếu điều chỉnh" tooltipOptions={{ position: 'top' }}
                        onClick={() => confirmCreateAdjustment(row)} disabled={isProcessing}
                      />
                    ) : null}
                  </span>
                )
              }}
            />
            <Column field="createdAt" header="Ngày tạo" sortable style={{ width: '11rem' }} body={(row: TpRow) => formatDateTimeVi(row.createdAt)} />
          </DataTable>
        </div>

        <PagedTableFooter
          rootClassName="inbound-footer-row"
          prefix="catalog"
          currentRangeStart={rangeStart}
          currentRangeEnd={rangeEnd}
          totalRows={total}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </section>
    </section>
  )
}
