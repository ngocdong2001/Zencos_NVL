import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import { fetchCustomerMaterialInboundReceipts } from '../lib/customerMaterialInboundApi'
import { formatQuantity } from '../components/purchaseOrder/format'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

type OutletContext = { search: string }

type ReceiptStatus = 'draft' | 'pending_qc' | 'posted' | 'cancelled'

type CustomerInboundRow = {
  id: string
  code: string
  receivedDate: string
  createdAt: string
  customerId: string | null
  customerName: string
  customerCode: string | null
  receivingLocation: string | null
  itemCount: number
  totalQtyBase: number
  materialName: string
  status: ReceiptStatus
  assignee: string
}

const STATUS_OPTIONS: Array<{ label: string; value: ReceiptStatus | 'all' }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Chờ QC', value: 'pending_qc' },
  { label: 'Hoàn thành', value: 'posted' },
  { label: 'Đã hủy', value: 'cancelled' },
]

const STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: 'Nháp',
  pending_qc: 'Chờ QC',
  posted: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const STATUS_CSS: Record<ReceiptStatus, string> = {
  draft: 'draft',
  pending_qc: 'waiting_qc',
  posted: 'done',
  cancelled: 'cancelled',
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
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  ]
}

function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateVi(value: string | null): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function formatDateTimeVi(value: string | null): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN')
}

export function CustomerMaterialInboundListPage() {
  const { search } = useOutletContext<OutletContext>()
  const location = useLocation()
  const navigate = useNavigate()
  const creationState = location.state as { createdReceiptId?: string } | null

  const [rows, setRows] = useState<CustomerInboundRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const defaultDateRange = getDefaultMonthDateRange()
  const [fromDate, setFromDate] = useState<Date | null>(defaultDateRange[0])
  const [toDate, setToDate] = useState<Date | null>(defaultDateRange[1])

  const refreshList = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchCustomerMaterialInboundReceipts({ page: 1, limit: 500 })
      setRows(
        response.data.map((row) => ({
          id: row.id,
          code: row.receiptRef,
          receivedDate: row.receivedAt ? row.receivedAt.slice(0, 10) : row.createdAt.slice(0, 10),
          createdAt: row.createdAt,
          customerId: row.customerId,
          customerName: row.customerName,
          customerCode: row.customerCode,
          receivingLocation: row.receivingLocationName,
          itemCount: row.itemCount,
          totalQtyBase: row.totalQtyBase,
          materialName: row.materialName,
          status: row.status as ReceiptStatus,
          assignee: row.assigneeName,
        })),
      )
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phiếu nhận.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refreshList() }, [])

  useEffect(() => { setPage(1) }, [pageSize, statusFilter, search, fromDate, toDate])

  useEffect(() => {
    if (!creationState?.createdReceiptId) return
    setStatusFilter('all')
    setPage(1)
    setHighlightedId(creationState.createdReceiptId)
    navigate('/customer-material-inbound', { replace: true, state: null })
  }, [creationState?.createdReceiptId, navigate])

  useEffect(() => {
    if (!highlightedId) return
    const timer = window.setTimeout(() => setHighlightedId(null), 7000)
    return () => window.clearTimeout(timer)
  }, [highlightedId])

  const filteredRows = useMemo(() => {
    const globalQuery = normalizeLookup(search)
    const from = fromDate
    const to = toDate

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false

      const rowDate = parseYmd(row.receivedDate)
      if (from && rowDate < from) return false
      if (to && rowDate > to) return false

      const searchable = normalizeLookup(
        [row.code, row.customerName, row.customerCode ?? '', row.materialName, row.assignee].join(' '),
      )
      if (globalQuery && !searchable.includes(globalQuery)) return false
      return true
    })
  }, [fromDate, rows, search, statusFilter, toDate])

  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthRows = rows.filter((r) => {
      const d = parseYmd(r.receivedDate)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    return {
      monthTotal: monthRows.length,
      postedCount: rows.filter((r) => r.status === 'posted').length,
      draftCount: rows.filter((r) => r.status === 'draft').length,
    }
  }, [rows])

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(start, start + pageSize)
  const rangeStart = total === 0 ? 0 : start + 1
  const rangeEnd = total === 0 ? 0 : Math.min(total, start + pageSize)

  return (
    <section className="inbound-shell outbound-list-shell">
      <div className="title-bar inbound-title-row">
        <div>
          <h2>Danh sách phiếu nhận NVL từ khách</h2>
          <p>Tra cứu và quản lý các phiếu nhận nguyên vật liệu do khách hàng gửi gia công.</p>
        </div>
        <div className="title-actions">
          <Button
            type="button"
            className="btn btn-primary"
            icon="pi pi-plus"
            label="Tạo phiếu nhận mới"
            onClick={() => navigate('/customer-material-inbound/new')}
          />
        </div>
      </div>

      <section className="inbound-stats-grid">
        <article className="inbound-stat-card tone-primary">
          <div>
            <p>Tổng phiếu nhận (Tháng)</p>
            <strong>{formatQuantity(stats.monthTotal)}</strong>
          </div>
          <div className="inbound-stat-icon">
            <i className="pi pi-inbox" />
          </div>
        </article>

        <article className="inbound-stat-card">
          <div>
            <p>Đã hoàn thành</p>
            <strong>{formatQuantity(stats.postedCount)}</strong>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-check-circle" />
          </div>
        </article>

        <article className="inbound-stat-card">
          <div>
            <p>Phiếu nháp</p>
            <strong>{formatQuantity(stats.draftCount)}</strong>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-pencil" />
          </div>
        </article>
      </section>

      <section className="inbound-table-card">
        <div className="app-table-toolbar">
          <label className="app-filter-control">
            <i className="pi pi-filter" aria-hidden />
            <Dropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                setStatusFilter((e.value ?? 'all') as ReceiptStatus | 'all')
                setPage(1)
              }}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <div className="app-filter-control app-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Từ ngày</span>
            <Calendar
              value={fromDate}
              onChange={(e) => { setFromDate((e.value as Date | null) ?? null); setPage(1) }}
              dateFormat="dd/mm/yy"
              readOnlyInput
              showIcon
              aria-label="Từ ngày"
            />
          </div>

          <div className="app-filter-control app-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Đến ngày</span>
            <Calendar
              value={toDate}
              onChange={(e) => { setToDate((e.value as Date | null) ?? null); setPage(1) }}
              dateFormat="dd/mm/yy"
              readOnlyInput
              showIcon
              aria-label="Đến ngày"
            />
          </div>
        </div>

        {error && (
          <div className="catalog-inline-notice error">
            <span>{error}</span>
            <button
              type="button"
              className="catalog-inline-notice-close"
              onClick={() => setError(null)}
              aria-label="Đóng thông báo"
            >×</button>
          </div>
        )}

        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable
            value={visibleRows}
            loading={loading}
            className="inbound-table prime-catalog-table outbound-history-table"
            stripedRows
            emptyMessage="Chưa có phiếu nhận NVL từ khách nào."
            rowClassName={(row: CustomerInboundRow) =>
              row.id === highlightedId ? 'outbound-history-row-highlight' : ''
            }
          >
            <Column
              header="Mã phiếu"
              field="code"
              sortable
              style={{ width: '11rem' }}
              body={(row: CustomerInboundRow) => (
                <button
                  type="button"
                  className="inbound-code-btn"
                  onClick={() => navigate(`/customer-material-inbound/${row.id}`)}
                >
                  {row.code}
                </button>
              )}
            />
            <Column
              field="receivedDate"
              header="Ngày nhận"
              sortable
              style={{ width: '9rem' }}
              body={(row: CustomerInboundRow) => formatDateVi(row.receivedDate)}
            />
            <Column
              field="customerName"
              header="Khách hàng nguồn"
              sortable
              style={{ width: '14rem' }}
              body={(row: CustomerInboundRow) => (
                <span>
                  {row.customerName}
                  {row.customerCode
                    ? <small style={{ color: 'var(--text-color-secondary)', marginLeft: 4 }}>({row.customerCode})</small>
                    : null}
                </span>
              )}
            />
            <Column
              field="receivingLocation"
              header="Kho nhận"
              style={{ width: '11rem' }}
              body={(row: CustomerInboundRow) => row.receivingLocation ?? '---'}
            />
            <Column
              field="materialName"
              header="NVL đầu tiên"
              style={{ minWidth: '10rem' }}
            />
            <Column
              field="itemCount"
              header="Số dòng"
              sortable
              style={{ width: '7rem' }}
              body={(row: CustomerInboundRow) => <span className="inbound-number">{row.itemCount}</span>}
            />
            <Column
              field="totalQtyBase"
              header="Tổng SL nhận"
              sortable
              style={{ width: '10rem' }}
              body={(row: CustomerInboundRow) => <span className="inbound-number">{formatQuantity(row.totalQtyBase)}</span>}
            />
            <Column
              field="status"
              header="Trạng thái"
              sortable
              style={{ width: '9rem' }}
              body={(row: CustomerInboundRow) => (
                <span className={`app-status-badge ${STATUS_CSS[row.status]}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              )}
            />
            <Column field="assignee" header="Người tạo" style={{ width: '10rem' }} />
            <Column
              field="createdAt"
              header="Ngày tạo"
              sortable
              style={{ width: '11rem' }}
              body={(row: CustomerInboundRow) => formatDateTimeVi(row.createdAt)}
            />
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
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </section>
    </section>
  )
}
