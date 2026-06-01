import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import {
  fetchProductionBoms,
  type ProductionBom,
  type ProductionBomStatus,
} from '../lib/productionBomApi'

type OutletContext = { search: string }

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const STATUS_OPTIONS: Array<{ label: string; value: ProductionBomStatus | 'all' }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Bản nháp',         value: 'draft' },
  { label: 'Chờ duyệt',        value: 'submitted' },
  { label: 'Đã duyệt',         value: 'approved' },
  { label: 'Ngưng hiệu lực',   value: 'inactive' },
  { label: 'Lưu trữ',          value: 'archived' },
]

const STATUS_LABELS: Record<ProductionBomStatus, string> = {
  draft:     'Bản nháp',
  submitted: 'Chờ duyệt',
  approved:  'Đã duyệt',
  inactive:  'Ngưng hiệu lực',
  archived:  'Lưu trữ',
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatDateVi(iso?: string | null) {
  if (!iso) return '---'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN')
}

export default function ProductionBomListPage() {
  const navigate = useNavigate()
  const { search } = useOutletContext<OutletContext>()

  const [allBoms, setAllBoms] = useState<ProductionBom[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<ProductionBomStatus | 'all'>('all')

  const loadAll = () => {
    setLoading(true)
    setError(null)
    fetchProductionBoms({ limit: 500 })
      .then((res) => setAllBoms(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Không thể tải danh sách định mức.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { setPage(1) }, [statusFilter, search])

  const filteredRows = useMemo(() => {
    const q = normalizeLookup(search)
    return allBoms.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (q) {
        const searchable = normalizeLookup([
          row.bomCode ?? '',
          row.bomName,
          row.outputProduct?.name ?? '',
          row.outputProduct?.code ?? '',
          STATUS_LABELS[row.status],
        ].join(' '))
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [allBoms, statusFilter, search])

  const stats = useMemo(() => ({
    total:     allBoms.length,
    pending:   allBoms.filter((r) => r.status === 'submitted').length,
    approved:  allBoms.filter((r) => r.status === 'approved').length,
  }), [allBoms])

  const total      = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage   = Math.min(page, totalPages)
  const start      = total === 0 ? 0 : (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(start, start + pageSize)
  const rangeStart = total === 0 ? 0 : start + 1
  const rangeEnd   = total === 0 ? 0 : Math.min(total, start + pageSize)

  return (
    <section className="inbound-shell outbound-list-shell">
      {/* Title bar */}
      <div className="title-bar inbound-title-row">
        <div>
          <h2>Phiếu định mức sản xuất</h2>
          <p>Quản lý các phiếu định mức NVL/BTP theo từng loại sản phẩm đầu ra.</p>
        </div>
        <div className="title-actions">
          <Button
            type="button"
            className="btn btn-primary"
            icon="pi pi-plus"
            label="Tạo định mức mới"
            onClick={() => navigate('/production-bom/new')}
          />
        </div>
      </div>

      {/* Stats */}
      <section className="inbound-stats-grid">
        <article className="inbound-stat-card tone-primary">
          <div>
            <p>Tổng định mức</p>
            <strong>{stats.total}</strong>
          </div>
          <div className="inbound-stat-icon">
            <i className="pi pi-list-check" />
          </div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Chờ duyệt</p>
            <strong>{stats.pending}</strong>
          </div>
          <div className="inbound-stat-icon muted">
            <i className="pi pi-clock" />
          </div>
        </article>
        <article className="inbound-stat-card">
          <div>
            <p>Đã duyệt</p>
            <strong>{stats.approved}</strong>
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
              onChange={(e) => setStatusFilter((e.value ?? 'all') as ProductionBomStatus | 'all')}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>
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
            className="inbound-table prime-catalog-table"
            stripedRows
            emptyMessage={loading ? 'Đang tải...' : 'Không có phiếu định mức phù hợp bộ lọc.'}
          >
            <Column
              header="Mã định mức"
              field="bomCode"
              sortable
              style={{ width: '11rem' }}
              body={(row: ProductionBom) => (
                <button type="button" className="inbound-code-btn" onClick={() => navigate(`/production-bom/${row.id}`)}>
                  {row.bomCode ?? '---'}
                </button>
              )}
            />
            <Column
              header="Tên định mức"
              field="bomName"
              sortable
              style={{ minWidth: '200px' }}
            />
            <Column
              header="Sản phẩm đầu ra"
              style={{ minWidth: '200px' }}
              body={(row: ProductionBom) =>
                row.outputProduct
                  ? <span><strong>{row.outputProduct.code}</strong> – {row.outputProduct.name}</span>
                  : <span className="text-color-secondary">---</span>
              }
            />
            <Column
              header="Quy mô mẻ"
              style={{ width: '120px' }}
              body={(row: ProductionBom) => (
                <span className="inbound-number">
                  {Number(row.baseQty).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                  {row.outputProduct?.unit ? ` ${row.outputProduct.unit}` : ''}
                </span>
              )}
            />
            <Column
              header="Số dòng"
              style={{ width: '80px' }}
              body={(row: ProductionBom) => (
                <span className="inbound-number">{row.lines?.length ?? 0}</span>
              )}
            />
            <Column
              header="Trạng thái"
              field="status"
              sortable
              style={{ width: '130px' }}
              body={(row: ProductionBom) => (
                <span className={`app-status-badge ${row.status}`}>{STATUS_LABELS[row.status]}</span>
              )}
            />
            <Column
              header="Hiệu lực từ"
              style={{ width: '110px' }}
              body={(row: ProductionBom) => formatDateVi(row.effectiveFrom)}
            />
            <Column
              header="Người tạo"
              style={{ width: '130px' }}
              body={(row: ProductionBom) => row.creator?.fullName ?? '---'}
            />
            <Column
              header="Thao tác"
              style={{ width: '90px' }}
              body={(row: ProductionBom) => (
                <span className="inbound-actions-cell">
                  <Button
                    type="button"
                    icon="pi pi-eye"
                    text
                    className="icon-btn"
                    tooltip="Xem chi tiết"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => navigate(`/production-bom/${row.id}`)}
                  />
                  <Button
                    type="button"
                    icon="pi pi-pencil"
                    text
                    className="icon-btn"
                    tooltip="Chỉnh sửa"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => navigate(`/production-bom/${row.id}/edit`)}
                    disabled={row.status !== 'draft'}
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
