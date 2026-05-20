import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'
import { fetchProductionOrders,
  fetchProductionOrdersForExport,
  updateProductionOrderStatus,
  type ProductionOrderStatus,
  type ProductionOrderListItem,
  type ProductOutputType,
} from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductionStatus = ProductionOrderStatus

type ProductionOrderRow = {
  id: string
  orderRef: string
  issuedDate: string
  skuCode: string
  skuName: string
  productType: string
  outputProduct: { id: string; code: string; name: string; outputType: ProductOutputType } | null
  currentStep: number
  status: ProductionStatus
  plannedQty: number | null
  actualQty: number | null
  unit: string | null
  lotNo: string | null
  expiryDate: string | null
}

type OutletContext = { search: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const STATUS_OPTIONS: Array<{ label: string; value: ProductionStatus | 'all' }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Bản nháp', value: 'draft' },
  { label: 'Đang sản xuất', value: 'in_progress' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
]

const STATUS_LABELS: Record<ProductionStatus, string> = {
  draft: 'Bản nháp',
  in_progress: 'Đang sản xuất',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const STEP_LABELS: Record<number, string> = {
  1: 'Bước 1 – Xuất NVL',
  2: 'Bước 2 – Nhập BTP',
  3: 'Bước 3 – Xuất BTP',
  4: 'Bước 4 – Nhập TP',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatDateVi(value: string | null): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function mapApiRow(row: ProductionOrderListItem): ProductionOrderRow {
  const outLine = row.lines?.[0] ?? null
  return {
    id: String(row.id),
    orderRef: row.orderRef ?? `PSX-${row.id}`,
    issuedDate: row.issuedAt,
    skuCode: row.outputProduct?.code ?? row.skuCode ?? row.skuProduct?.code ?? '---',
    skuName: row.outputProduct?.name ?? row.skuName ?? row.skuProduct?.name ?? '---',
    productType: row.productType ?? '---',
    outputProduct: row.outputProduct ?? null,
    currentStep: row.currentStep,
    status: row.status,
    plannedQty: outLine ? Number(outLine.plannedQty) : null,
    actualQty: outLine ? Number(outLine.actualQty) : null,
    unit: outLine?.unit ?? null,
    lotNo: outLine?.lotNo ?? null,
    expiryDate: outLine?.expiryDate ?? null,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductionListPage() {
  const { search } = useOutletContext<OutletContext>()
  const location = useLocation()
  const navigate = useNavigate()

  const highlightedId = (location.state as { createdOrderId?: string } | null)?.createdOrderId ?? null

  const [rows, setRows] = useState<ProductionOrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return [firstDay, lastDay]
  })
  const [highlightId, setHighlightId] = useState<string | null>(highlightedId)
  const [showFlowModal, setShowFlowModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProductionOrders({ limit: 500, sortBy: 'createdAt', sortDir: 'desc' })
      setRows(res.data.map(mapApiRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lệnh sản xuất.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(null), 7000)
    return () => window.clearTimeout(t)
  }, [highlightId])

  useEffect(() => { void refresh() }, [location.key])

  const handleCancelOrder = (row: ProductionOrderRow) => {
    showDangerConfirm({
      header: 'Hủy phiếu sản xuất',
      message: `Bạn có chắc muốn hủy phiếu ${row.orderRef}?${row.status === 'completed' ? ' Phiếu đã hoàn thành — NVL xuất kho sẽ được hoàn trả tồn kho tự động.' : ''} Hành động này không thể hoàn tác.`,
      acceptLabel: 'Xác nhận hủy',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setCancellingId(row.id)
        try {
          await updateProductionOrderStatus(row.id, 'cancelled')
          await refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Không thể hủy phiếu.')
        } finally {
          setCancellingId(null)
        }
      },
    })
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const dateFrom = dateRange?.[0] ? dateRange[0].toISOString().split('T')[0] : undefined
      const dateTo   = dateRange?.[1] ? dateRange[1].toISOString().split('T')[0] : undefined

      // Fetch data from server
      const data = await fetchProductionOrdersForExport({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFrom,
        dateTo,
      })

      // Load template from public folder
      const templateRes = await fetch('/templates/theo-doi-ngay-qtsx.xlsx')
      if (!templateRes.ok) throw new Error('Không thể tải template Excel.')
      const templateBuffer = await templateRes.arrayBuffer()

      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(templateBuffer)
      const ws = wb.worksheets[0]

      // Remove existing sample data rows (row 3 onwards)
      const lastRowNum = ws.lastRow?.number ?? 2
      for (let r = lastRowNum; r >= 3; r--) {
        ws.spliceRows(r, 1)
      }

      // Fill data rows
      const TOTAL_COLS = 12
      const thinBlack: ExcelJS.BorderStyle = 'thin'
      const border: Partial<ExcelJS.Borders> = {
        top:    { style: thinBlack, color: { argb: 'FF000000' } },
        bottom: { style: thinBlack, color: { argb: 'FF000000' } },
        left:   { style: thinBlack, color: { argb: 'FF000000' } },
        right:  { style: thinBlack, color: { argb: 'FF000000' } },
      }

      const fmtDate = (iso: string | null) => iso ? new Date(iso) : null

      // Parse nvlExportDates string: "matName||date;;matName2||date2" → "nhận matName: date\nnhận matName2: date2"
      const fmtNvlDates = (raw: string | null): string => {
        if (!raw) return ''
        return raw.split(';;')
          .map(part => {
            const sep = part.indexOf('||')
            if (sep === -1) return `nhận ${part}`
            const name = part.slice(0, sep).trim()
            const date = part.slice(sep + 2).trim()
            return date ? `nhận ${name}: ${date}` : `nhận ${name}`
          })
          .join('\n')
      }

      data.forEach((item) => {
        const nvlText = fmtNvlDates(item.nvlExportDates)
        const row = ws.addRow([
          item.stt,
          item.customerName,
          item.productName,
          item.plannedQty,
          item.actualQty,
          item.lotNo,
          fmtDate(item.issuedAt),
          nvlText || null,          // col 8: Thời gian NKNVL – chi tiết từng NVL
          fmtDate(item.step2ProcessedAt),
          fmtDate(item.step3ProcessedAt),
          fmtDate(item.step4ProcessedAt),
          fmtDate(item.deliveredAt),
        ])
        for (let c = 1; c <= TOTAL_COLS; c++) {
          const cell = row.getCell(c)
          cell.border = border
          if (c >= 9 && c <= 12 && cell.value) cell.numFmt = 'dd/mm/yyyy'
        }
        // Col 8: wrap text, align top-left for multi-line NVL list
        const nvlCell = row.getCell(8)
        nvlCell.alignment = { wrapText: true, vertical: 'top' }
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `theo-doi-ngay-qtsx-${dateStr}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất Excel thất bại.')
    } finally {
      setExportLoading(false)
    }
  }

  useEffect(() => { setPage(1) }, [pageSize, statusFilter, search, dateRange])

  const filteredRows = useMemo(() => {
    const q = normalizeLookup(search)
    const dateFrom = dateRange?.[0] ? new Date(dateRange[0]).setHours(0, 0, 0, 0) : null
    const dateTo = dateRange?.[1] ? new Date(dateRange[1]).setHours(23, 59, 59, 999) : null
    
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      
      // Date range filter
      if (dateFrom || dateTo) {
        const rowDate = new Date(row.issuedDate).getTime()
        if (dateFrom && rowDate < dateFrom) return false
        if (dateTo && rowDate > dateTo) return false
      }
      
      if (!q) return true
      const searchable = normalizeLookup(
        [row.orderRef, row.skuCode, row.skuName, row.productType, STATUS_LABELS[row.status]].join(' '),
      )
      return searchable.includes(q)
    })
  }, [rows, search, statusFilter, dateRange])

  const stats = useMemo(() => ({
    total: rows.length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    completed: rows.filter((r) => r.status === 'completed').length,
  }), [rows])

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(start, start + pageSize)
  const rangeStart = total === 0 ? 0 : start + 1
  const rangeEnd = total === 0 ? 0 : Math.min(total, start + pageSize)

  return (
    <section className="inbound-shell outbound-list-shell">
      {/* Title bar */}
      <div className="title-bar inbound-title-row">
        <div>
          <h2>Danh sách lệnh sản xuất</h2>
          <p>Quản lý và tra cứu các phiếu sản xuất theo từng lệnh.</p>
        </div>
        <div className="title-actions">
          <Button type="button" className="btn btn-ghost" icon="pi pi-download" label="Xuất bảng hệ thống TGSX (Excel)" loading={exportLoading} onClick={() => { void handleExport() }} />
          <Button
            type="button"
            className="btn btn-primary"
            icon="pi pi-plus"
            label="Tạo lệnh mới"
            onClick={() => navigate('/production/new')}
          />
        </div>
      </div>

      {/* Stats */}
      <section className="inbound-stats-grid">
        <article className="inbound-stat-card tone-primary">
          <div>
            <p>Tổng lệnh sản xuất</p>
            <strong>{stats.total}</strong>
          </div>
          <div className="inbound-stat-icon">
            <i className="pi pi-cog" />
          </div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Đang sản xuất</p>
            <strong>{stats.inProgress}</strong>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-spinner" />
          </div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Đã hoàn thành</p>
            <strong>{stats.completed}</strong>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-check-circle" />
          </div>
        </article>
      </section>

      {/* Table card */}
      <section className="inbound-table-card">
        <div className="app-table-toolbar">
          <label className="app-filter-control">
            <i className="pi pi-filter" aria-hidden />
            <Dropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setStatusFilter((e.value ?? 'all') as ProductionStatus | 'all')}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <label className="app-filter-control">
            <i className="pi pi-calendar" aria-hidden />
            <Calendar
              value={dateRange ?? null}
              onChange={(e) => setDateRange(e.value as [Date | null, Date | null] | null)}
              selectionMode="range"
              readOnlyInput
              placeholder="Từ ngày - Đến ngày"
              dateFormat="dd/mm/yy"
              showButtonBar
            />
            {dateRange?.[0] && (
              <button
                type="button"
                className="app-filter-clear-btn"
                onClick={() => setDateRange(null)}
                title="Xóa bộ lọc ngày"
                aria-label="Xóa bộ lọc ngày"
              >
                <i className="pi pi-times" />
              </button>
            )}
          </label>
        </div>

        {error && (
          <div className="catalog-inline-notice error">
            <span>{error}</span>
            <button type="button" className="catalog-inline-notice-close" onClick={() => setError(null)} aria-label="Đóng thông báo">×</button>
          </div>
        )}

        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable
            value={visibleRows}
            loading={loading}
            className="inbound-table prime-catalog-table outbound-history-table"
            stripedRows
            emptyMessage="Không có lệnh sản xuất phù hợp bộ lọc hiện tại."
            rowClassName={(row: ProductionOrderRow) => (row.id === highlightId ? 'outbound-history-row-highlight' : '')}
          >
            <Column
              header="Mã lệnh SX"
              field="orderRef"
              sortable
              style={{ width: '13rem' }}
              body={(row: ProductionOrderRow) => (
                <button
                  type="button"
                  className="inbound-code-btn"
                  onClick={() => navigate(`/production/${row.id}/buoc-${row.currentStep}`)}
                >
                  {row.orderRef}
                </button>
              )}
            />
            <Column
              field="issuedDate"
              header="Ngày lập"
              sortable
              style={{ width: '8.5rem' }}
              body={(row: ProductionOrderRow) => formatDateVi(row.issuedDate)}
            />
            <Column
              header="Sản phẩm đầu ra"
              sortable
              style={{ width: '17rem' }}
              body={(row: ProductionOrderRow) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#5269e0' }}>{row.skuCode}</span>
                    {row.outputProduct && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                        background: row.outputProduct.outputType === 'finished' ? '#dcfce7' : '#fef9c3',
                        color:      row.outputProduct.outputType === 'finished' ? '#15803d'  : '#a16207',
                      }}>
                        {row.outputProduct.outputType === 'finished' ? 'TP' : 'BTP'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{row.skuName}</div>
                </div>
              )}
            />
            <Column field="productType" header="Loại sản phẩm" sortable style={{ width: '12rem' }}
              body={(row: ProductionOrderRow) => (
                row.outputProduct ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                    background: row.outputProduct.outputType === 'finished' ? '#dcfce7' : '#fef9c3',
                    color:      row.outputProduct.outputType === 'finished' ? '#15803d'  : '#a16207',
                  }}>
                    {row.outputProduct.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'}
                  </span>
                ) : <span style={{ fontSize: 12, color: '#94a3b8' }}>{row.productType}</span>
              )}
            />
            <Column
              header="Số lượng KH"
              style={{ width: '9rem', textAlign: 'right' }}
              body={(row: ProductionOrderRow) => (
                row.plannedQty != null
                  ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.plannedQty.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                      {row.unit ? <span style={{ marginLeft: 4, color: '#94a3b8', fontSize: 11 }}>{row.unit}</span> : null}
                    </span>
                  : <span style={{ color: '#94a3b8' }}>---</span>
              )}
            />
            <Column
              header="SL thực nhập"
              style={{ width: '9rem', textAlign: 'right' }}
              body={(row: ProductionOrderRow) => (
                row.actualQty != null
                  ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.actualQty.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                      {row.unit ? <span style={{ marginLeft: 4, color: '#94a3b8', fontSize: 11 }}>{row.unit}</span> : null}
                    </span>
                  : <span style={{ color: '#94a3b8' }}>---</span>
              )}
            />
            <Column
              header="Số lô"
              style={{ width: '9rem' }}
              body={(row: ProductionOrderRow) => (
                row.lotNo
                  ? <span>{row.lotNo}</span>
                  : <span style={{ color: '#94a3b8' }}>---</span>
              )}
            />
            <Column
              header="Hạn sử dụng"
              style={{ width: '9rem' }}
              body={(row: ProductionOrderRow) => (
                row.expiryDate
                  ? formatDateVi(row.expiryDate)
                  : <span style={{ color: '#94a3b8' }}>---</span>
              )}
            />
            <Column
              header="Công đoạn"
              style={{ width: '11rem' }}
              body={(row: ProductionOrderRow) => (
                row.status === 'completed' || row.status === 'cancelled' ? null :
                <span style={{ fontSize: 12, color: '#5269e0', fontWeight: 600 }}>
                  {STEP_LABELS[row.currentStep] ?? `Bước ${row.currentStep}`}
                </span>
              )}
            />
            <Column
              field="status"
              header="Trạng thái"
              sortable
              style={{ width: '10rem' }}
              body={(row: ProductionOrderRow) => (
                <span className={`app-status-badge ${row.status === 'in_progress' ? 'pending' : row.status}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              )}
            />
            <Column
              header="Thao tác"
              style={{ width: '8rem' }}
              body={(row: ProductionOrderRow) => (
                <span className="inbound-actions-cell">
                  <Button
                    type="button"
                    icon="pi pi-eye"
                    text
                    className="icon-btn"
                    aria-label="Xem chi tiết"
                    tooltip="Xem chi tiết"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => navigate(`/production/${row.id}/buoc-${row.currentStep}`)}
                  />
                  {row.status !== 'completed' && row.status !== 'cancelled' && (
                    <Button
                      type="button"
                      icon="pi pi-pencil"
                      text
                      className="icon-btn"
                      aria-label="Tiếp tục sản xuất"
                      tooltip="Tiếp tục sản xuất"
                      tooltipOptions={{ position: 'top' }}
                      onClick={() => navigate(`/production/${row.id}/buoc-${row.currentStep}`)}
                    />
                  )}
                  <Button
                    type="button"
                    icon="pi pi-sitemap"
                    text
                    className="icon-btn"
                    aria-label="Lưu đồ NVL"
                    tooltip="Lưu đồ NVL"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => { setSelectedOrderId(row.id); setShowFlowModal(true) }}
                  />
                  {row.status !== 'cancelled' && (
                    <Button
                      type="button"
                      icon="pi pi-ban"
                      text
                      className="icon-btn"
                      aria-label="Vô hiệu"
                      tooltip="Vô hiệu"
                      tooltipOptions={{ position: 'top' }}
                      loading={cancellingId === row.id}
                      onClick={() => handleCancelOrder(row)}
                      style={{ color: '#ef4444' }}
                    />
                  )}
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
          totalRows={total}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </section>

      {/* Flow diagram modal */}
      <ProductionFlowModal
        visible={showFlowModal}
        orderId={selectedOrderId}
        onHide={() => setShowFlowModal(false)}
      />
    </section>
  )
}
