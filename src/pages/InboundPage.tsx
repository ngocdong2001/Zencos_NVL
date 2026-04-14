import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Dialog } from 'primereact/dialog'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import type { InboundWizardState } from '../components/inbound/types'
import {
  fetchInboundReceiptDetail,
  fetchInboundReceiptHistory,
  fetchInboundReceipts,
  type InboundReceiptDetailResponse,
  type InboundReceiptHistoryRowResponse,
  type InboundReceiptRowResponse,
  type InboundReceiptStatusApi,
} from '../lib/inboundApi'

type OutletContext = { search: string }

type InboundStatus = 'done' | 'waiting_qc' | 'processing' | 'draft' | 'cancelled'

type InboundRow = {
  id: string
  code: string
  receivedDate: string
  createdAt: string
  qcCheckedAt: string | null
  postedAt: string | null
  supplier: string
  lotCount: number
  quantityGram: number
  totalValue: number
  status: InboundStatus
  assignee: string
}

const INBOUND_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const INBOUND_STATUS_OPTIONS: Array<{ label: string; value: 'all' | InboundStatus }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Hoàn thành', value: 'done' },
  { label: 'Chờ QC', value: 'waiting_qc' },
  { label: 'Đang xử lý', value: 'processing' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Đã hủy', value: 'cancelled' },
]

const INBOUND_STATUS_LABELS: Record<InboundStatus, string> = {
  done: 'Hoàn thành',
  waiting_qc: 'Chờ QC',
  processing: 'Đang xử lý',
  draft: 'Nháp',
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

function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part))
  return new Date(year, month - 1, day)
}

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatDisplayDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '---'
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHistoryData(data: Record<string, unknown> | null): string {
  if (!data) return '---'
  const pairs = Object.entries(data)
  if (pairs.length === 0) return '---'
  return pairs
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ')
}

function formatDateRangeLabel(range: Date[] | null): string {
  if (!range || !range[0] || !range[1]) return 'Chọn khoảng ngày'
  const format = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = String(date.getFullYear())
    return `${dd}/${mm}/${yyyy}`
  }
  return `${format(range[0])} - ${format(range[1])}`
}

function getDefaultMonthDateRange(): Date[] {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [firstDay, lastDay]
}

function mapApiStatusToUiStatus(status: InboundReceiptStatusApi): InboundStatus {
  if (status === 'posted') return 'done'
  if (status === 'pending_qc') return 'waiting_qc'
  if (status === 'draft') return 'draft'
  if (status === 'cancelled') return 'cancelled'
  return 'processing'
}

function mapInboundRowFromApi(row: InboundReceiptRowResponse): InboundRow {
  const fallbackDate = row.expectedDate ?? row.createdAt.slice(0, 10)
  const receivedDate = row.receivedAt ? row.receivedAt.slice(0, 10) : fallbackDate

  return {
    id: row.id,
    code: row.receiptRef,
    receivedDate,
    createdAt: row.createdAt,
    qcCheckedAt: row.qcCheckedAt,
    postedAt: row.receivedAt,
    supplier: row.supplierName,
    lotCount: Number.isFinite(row.lotCount) ? row.lotCount : 0,
    quantityGram: Number.isFinite(row.quantityBaseTotal) ? row.quantityBaseTotal : 0,
    totalValue: Number.isFinite(row.totalValue) ? row.totalValue : 0,
    status: mapApiStatusToUiStatus(row.status),
    assignee: row.assigneeName?.trim() ? row.assigneeName : '---',
  }
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)
}

function isEditLocked(row: InboundRow): boolean {
  return row.status === 'done' || row.status === 'cancelled'
}

function getEditRouteByStep(step: number | undefined): '/inbound/new/step2' | '/inbound/new/step3' | '/inbound/new/step4' {
  if (step === 3) return '/inbound/new/step3'
  if (step === 4) return '/inbound/new/step4'
  return '/inbound/new/step2'
}

function mapDetailToWizardState(detail: InboundReceiptDetailResponse): InboundWizardState {
  const firstItem = detail.items[0]

  return {
    receiptId: detail.id,
    receiptStatus: detail.status,
    currentStep: detail.currentStep,
    step1: {
      draftCode: detail.receiptRef,
      supplierKeyword: detail.supplier?.name ?? '',
      poNumber: detail.purchaseRequest?.requestRef ?? '',
      expectedDate: detail.expectedDate ?? '',
      receivingWarehouseId: detail.receivingLocation?.id ?? '',
      receivingWarehouseName: detail.receivingLocation?.name ?? '',
      transportType: 'road',
    },
    step2: {
      lotNo: firstItem?.lotNo ?? '',
      unitPrice: firstItem?.unitPricePerKg ?? null,
      quantity: firstItem ? Number(firstItem.quantityBase) : null,
      invoiceNumber: firstItem?.invoiceNumber ?? '',
      invoiceDate: firstItem?.invoiceDate ?? '',
      mfgDate: firstItem?.manufactureDate ?? '',
      expDate: firstItem?.expiryDate ?? '',
      selectedMaterialId: firstItem?.product.id ?? '',
      selectedMaterialCode: firstItem?.product.code ?? '',
      selectedMaterialName: firstItem?.product.name ?? '',
      selectedUnitDisplay: firstItem?.unitUsed ?? '',
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
}

export function InboundPage() {
  const navigate = useNavigate()
  const { search } = useOutletContext<OutletContext>()
  const [quickSearch, setQuickSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InboundStatus>('all')
  const [rows, setRows] = useState<InboundRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [lockedMessage, setLockedMessage] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<InboundRow[]>([])
  const [historyVisible, setHistoryVisible] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyRows, setHistoryRows] = useState<InboundReceiptHistoryRowResponse[]>([])
  const [historyReceiptCode, setHistoryReceiptCode] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dateRange, setDateRange] = useState<Date[] | null>(getDefaultMonthDateRange())

  useEffect(() => {
    let cancelled = false

    const loadInboundRows = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchInboundReceipts({ page: 1, limit: 500 })
        if (cancelled) return
        setRows(response.data.map(mapInboundRowFromApi))
      } catch (apiError) {
        if (cancelled) return
        setRows([])
        setError(apiError instanceof Error ? apiError.message : 'Không thể tải danh sách phiếu nhập kho.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInboundRows()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    const globalQuery = normalizeLookup(search)
    const localQuery = normalizeLookup(quickSearch)
    const from = dateRange?.[0] ?? null
    const to = dateRange?.[1] ?? null

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false

      const rowDate = parseYmd(row.receivedDate)
      if (from && rowDate < from) return false
      if (to && rowDate > to) return false

      const searchable = normalizeLookup(
        [
          row.code,
          row.supplier,
          row.assignee,
          INBOUND_STATUS_LABELS[row.status],
          String(row.lotCount),
          String(row.quantityGram),
          String(row.totalValue),
        ].join(' '),
      )

      if (globalQuery && !searchable.includes(globalQuery)) return false
      if (localQuery && !searchable.includes(localQuery)) return false
      return true
    })
  }, [dateRange, quickSearch, rows, search, statusFilter])

  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthRows = rows.filter((row) => {
      const rowDate = parseYmd(row.receivedDate)
      return rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear
    })

    const pendingQcCount = rows.filter((row) => row.status === 'waiting_qc').length
    const draftCount = rows.filter((row) => row.status === 'draft').length

    return {
      monthTotal: monthRows.length,
      pendingQcCount,
      draftCount,
    }
  }, [rows])

  const totalRows = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = totalRows === 0 ? 0 : (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(start, start + pageSize)
  const rangeStart = totalRows === 0 ? 0 : start + 1
  const rangeEnd = totalRows === 0 ? 0 : Math.min(totalRows, start + pageSize)
  const selectedIdSet = new Set(selectedRows.map((row) => row.id))
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIdSet.has(row.id))

  const selectedCount = selectedRows.length

  const openInboundAction = async (_event: React.MouseEvent<HTMLElement>, row: InboundRow, mode: 'view' | 'edit') => {
    if (mode === 'edit' && isEditLocked(row)) {
      const reason = row.status === 'cancelled'
        ? 'Phiếu nhập kho đã hủy, không thể chỉnh sửa.'
        : 'Phiếu nhập kho đã posted/hoàn thành, không thể chỉnh sửa.'
      setLockedMessage(reason)
      return
    }

    setActionBusyId(row.id)
    setError(null)
    try {
      const detail = await fetchInboundReceiptDetail(row.id)
      const wizardState = mapDetailToWizardState(detail)
      const routeByStep = getEditRouteByStep(detail.currentStep)
      if (mode === 'view') {
        navigate(routeByStep, {
          state: { ...wizardState, currentStep: detail.currentStep, maxReachedStep: detail.currentStep },
        })
      } else {
        navigate(routeByStep, {
          state: { ...wizardState, currentStep: detail.currentStep, maxReachedStep: detail.currentStep },
        })
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Không thể mở chi tiết phiếu nhập kho.')
    } finally {
      setActionBusyId(null)
    }
  }

  const openHistoryDialog = async (row: InboundRow) => {
    setHistoryVisible(true)
    setHistoryLoading(true)
    setHistoryError(null)
    setHistoryRows([])
    setHistoryReceiptCode(row.code)

    try {
      const response = await fetchInboundReceiptHistory(row.id)
      setHistoryRows(response)
    } catch (apiError) {
      setHistoryError(apiError instanceof Error ? apiError.message : 'Không thể tải lịch sử thao tác phiếu nhập.')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <section className="inbound-shell">
      <Dialog
        visible={lockedMessage !== null}
        onHide={() => setLockedMessage(null)}
        header="Không thể chỉnh sửa"
        footer={
          <Button
            label="Đóng"
            icon="pi pi-times"
            className="p-button-danger"
            onClick={() => setLockedMessage(null)}
          />
        }
        style={{ width: '360px' }}
      >
        <div className="flex align-items-center gap-3">
          <i className="pi pi-exclamation-triangle" style={{ fontSize: '1.4rem', color: 'var(--orange-500)' }} />
          <span>{lockedMessage}</span>
        </div>
      </Dialog>
      <Dialog
        visible={historyVisible}
        onHide={() => setHistoryVisible(false)}
        header={`Lịch sử thao tác - ${historyReceiptCode || 'Phiếu nhập kho'}`}
        style={{ width: '860px' }}
      >
        <DataTable
          value={historyRows}
          dataKey="id"
          loading={historyLoading}
          emptyMessage={historyError ? `Không thể tải dữ liệu: ${historyError}` : 'Chưa có lịch sử thao tác cho phiếu này.'}
        >
          <Column
            field="createdAt"
            header="Thời điểm"
            body={(row: InboundReceiptHistoryRowResponse) => formatDisplayDateTime(row.createdAt)}
          />
          <Column field="actionLabel" header="Hành động" />
          <Column field="actorName" header="Người thực hiện" />
          <Column
            field="data"
            header="Chi tiết"
            body={(row: InboundReceiptHistoryRowResponse) => formatHistoryData(row.data)}
          />
        </DataTable>
      </Dialog>
      <div className="title-bar inbound-title-row">
        <div>
          <h2>Danh sách Phiếu Nhập kho</h2>
          <p>Quản lý, theo dõi và phê duyệt các yêu cầu nhập kho nguyên vật liệu.</p>
        </div>
        <div className="title-actions">
          <Button type="button" className="btn btn-ghost" icon="pi pi-download" label="Xuất Excel" />
          <Button
            type="button"
            className="btn btn-primary"
            icon="pi pi-plus"
            label="Tạo phiếu mới"
            onClick={() => navigate('/inbound/new')}
          />
        </div>
      </div>

      <section className="inbound-stats-grid">
        <article className="inbound-stat-card tone-primary">
          <div>
            <p>Tổng phiếu nhập (Tháng)</p>
            <strong>{formatQuantity(stats.monthTotal)}</strong>
            <span>Theo dữ liệu hiện tại</span>
          </div>
          <div className="inbound-stat-icon">
            <i className="pi pi-truck" />
          </div>
        </article>

        <article className="inbound-stat-card">
          <div>
            <p>Phiếu chờ QC Kiểm định</p>
            <strong>{formatQuantity(stats.pendingQcCount)}</strong>
            <span>Cần xử lý kiểm định</span>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-verified" />
          </div>
        </article>

        <article className="inbound-stat-card">
          <div>
            <p>Phiếu Nháp / Chỉnh sửa</p>
            <strong>{formatQuantity(stats.draftCount)}</strong>
            <span>Đang chờ hoàn tất chứng từ</span>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-pencil" />
          </div>
        </article>
      </section>

      <section className="inbound-table-card">
        <div className="inbound-toolbar">
          <span className="inbound-search-wrap">
            <i className="pi pi-search" />
            <InputText
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Tìm kiếm nhanh..."
            />
          </span>

          <Dropdown
            value={statusFilter}
            options={INBOUND_STATUS_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => setStatusFilter(event.value as 'all' | InboundStatus)}
            className="inbound-status-filter"
          />

          <Button type="button" className="btn btn-ghost btn-advanced" icon="pi pi-filter" label="Bộ lọc nâng cao" />

          <Calendar
            value={dateRange}
            selectionMode="range"
            onChange={(event) => {
              setDateRange((event.value as Date[] | null) ?? null)
              setPage(1)
            }}
            dateFormat="dd/mm/yy"
            hideOnRangeSelection
            readOnlyInput
            showIcon
            placeholder="Chọn khoảng ngày"
            inputClassName="inbound-date-input"
            className="inbound-date-picker"
          />
        </div>

        <div className="inbound-selection-bar">
          <span>Đã chọn {selectedCount} mục</span>
          <Button type="button" text icon="pi pi-pencil" label="Chỉnh sửa" disabled={selectedCount === 0} />
          <Button type="button" text icon="pi pi-trash" label="Xóa" disabled={selectedCount === 0} />
          <span className="inbound-selection-time">
            <i className="pi pi-clock" />
            {loading
              ? 'Đang tải dữ liệu...'
              : actionBusyId
                ? 'Đang tải chi tiết phiếu nhập kho...'
                : error
                  ? `Lỗi tải dữ liệu: ${error}`
                  : 'Dữ liệu đã đồng bộ API'}
          </span>
        </div>

        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable
            value={visibleRows}
            dataKey="id"
            className="inbound-table prime-catalog-table"
            loading={loading}
            selectionMode="checkbox"
            selection={selectedRows}
            onSelectionChange={(event) => setSelectedRows((event.value ?? []) as InboundRow[])}
            selectAll={allVisibleSelected}
            onSelectAllChange={(event) => {
              const checked = Boolean(event.checked)
              if (!checked) {
                setSelectedRows((prev) => prev.filter((row) => !visibleRows.some((item) => item.id === row.id)))
                return
              }
              setSelectedRows((prev) => {
                const map = new Map(prev.map((row) => [row.id, row]))
                for (const row of visibleRows) map.set(row.id, row)
                return Array.from(map.values())
              })
            }}
            emptyMessage={error ? `Không thể tải dữ liệu: ${error}` : 'Không có phiếu nhập phù hợp bộ lọc hiện tại.'}
          >
            <Column selectionMode="multiple" style={{ width: '42px' }} />
            <Column
              field="code"
              header="Mã phiếu nhập"
              body={(row: InboundRow) => (
                <button
                  type="button"
                  className="inbound-code-btn"
                  disabled={actionBusyId === row.id}
                  onClick={(event) => {
                    void openInboundAction(event, row, 'view')
                  }}
                >
                  {row.code}
                </button>
              )}
            />
            <Column
              field="receivedDate"
              header="Ngày nhập"
              body={(row: InboundRow) => formatDisplayDate(row.receivedDate)}
            />
            <Column field="supplier" header="Nhà cung cấp" />
            <Column field="lotCount" header="Số lô" />
            <Column
              field="quantityGram"
              header="Số lượng (g)"
              body={(row: InboundRow) => <span className="inbound-number">{formatQuantity(row.quantityGram)}</span>}
            />
            <Column
              field="totalValue"
              header="Tổng giá trị (đ)"
              body={(row: InboundRow) => <span className="inbound-number">{formatCurrency(row.totalValue)}</span>}
            />
            <Column
              field="status"
              header="Trạng thái"
              body={(row: InboundRow) => (
                <span className={`inbound-status-badge ${row.status}`}>{INBOUND_STATUS_LABELS[row.status]}</span>
              )}
            />
            <Column
              header="Lịch sử QC / Posted"
              body={(row: InboundRow) => (
                <div style={{ display: 'grid', gap: 2, minWidth: 190 }}>
                  <span>Tạo phiếu: {formatDisplayDateTime(row.createdAt)}</span>
                  <span>QC: {row.qcCheckedAt ? formatDisplayDateTime(row.qcCheckedAt) : '---'}</span>
                  <span>Posted: {row.postedAt ? formatDisplayDateTime(row.postedAt) : '---'}</span>
                </div>
              )}
            />
            <Column
              field="assignee"
              header="Người thực hiện"
              body={(row: InboundRow) => {
                const initials = row.assignee
                  .split(' ')
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .slice(-1)[0]?.[0] ?? 'A'
                return (
                  <span className="inbound-assignee">
                    <span className="inbound-avatar">{initials.toUpperCase()}</span>
                    <span>{row.assignee}</span>
                  </span>
                )
              }}
            />
            <Column
              header="Thao tác"
              body={(row: InboundRow) => (
                <span className="inbound-actions-cell">
                  <Button
                    type="button"
                    icon="pi pi-eye"
                    text
                    className="icon-btn"
                    disabled={actionBusyId === row.id}
                    onClick={(event) => {
                      void openInboundAction(event, row, 'view')
                    }}
                  />
                  <Button
                    type="button"
                    icon="pi pi-pencil"
                    text
                    className="icon-btn"
                    disabled={actionBusyId === row.id}
                    onClick={(event) => {
                      void openInboundAction(event, row, 'edit')
                    }}
                  />
                  <Button
                    type="button"
                    icon="pi pi-history"
                    text
                    className="icon-btn"
                    disabled={actionBusyId === row.id}
                    onClick={() => {
                      void openHistoryDialog(row)
                    }}
                  />
                </span>
              )}
            />
          </DataTable>
        </div>

        <PagedTableFooter
          rootClassName="inbound-footer-row"
          prefix="catalog"
          currentRangeStart={rangeStart}
          currentRangeEnd={rangeEnd}
          totalRows={totalRows}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={INBOUND_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </section>

      <p className="inbound-date-label-helper">{formatDateRangeLabel(dateRange)}</p>
    </section>
  )
}
