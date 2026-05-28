import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import {
  fetchProductionBoms,
  type ProductionBom,
  type ProductionBomStatus,
} from '../lib/productionBomApi'

type OutletContext = { search: string }

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const STATUS_OPTIONS: Array<{ label: string; value: ProductionBomStatus | 'all' }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Bản nháp',       value: 'draft' },
  { label: 'Chờ duyệt',      value: 'submitted' },
  { label: 'Đã duyệt',       value: 'approved' },
  { label: 'Ngưng hiệu lực', value: 'inactive' },
  { label: 'Lưu trữ',        value: 'archived' },
]

const STATUS_LABELS: Record<ProductionBomStatus, string> = {
  draft:     'Bản nháp',
  submitted: 'Chờ duyệt',
  approved:  'Đã duyệt',
  inactive:  'Ngưng hiệu lực',
  archived:  'Lưu trữ',
}

const STATUS_SEVERITY: Record<ProductionBomStatus, string> = {
  draft:     'secondary',
  submitted: 'warning',
  approved:  'success',
  inactive:  'danger',
  archived:  'secondary',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN')
}

function StatusBadge({ status }: { status: ProductionBomStatus }) {
  const severity = STATUS_SEVERITY[status] ?? 'secondary'
  const label    = STATUS_LABELS[status]  ?? status
  return (
    <span className={`p-tag p-tag-${severity}`} style={{ whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function ProductionBomListPage() {
  const navigate = useNavigate()
  const { search } = useOutletContext<OutletContext>()

  const [boms, setBoms]       = useState<ProductionBom[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage]       = useState(1)
  const [limit, setLimit]     = useState(20)
  const [status, setStatus]   = useState<ProductionBomStatus | 'all'>('all')

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProductionBoms({ status, q: search || undefined, page, limit })
      .then((res) => { if (!cancelled) { setBoms(res.data); setTotal(res.total) } })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [status, search, page, limit])

  const columns = [
    {
      field: 'bomCode',
      header: 'Mã định mức',
      body: (row: ProductionBom) => (
        <span
          className="p-link font-medium"
          style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
          onClick={() => navigate(`/production-bom/${row.id}`)}
        >
          {row.bomCode ?? '—'}
        </span>
      ),
      style: { minWidth: '140px' },
    },
    {
      field: 'bomName',
      header: 'Tên định mức',
      body: (row: ProductionBom) => row.bomName,
      style: { minWidth: '200px' },
    },
    {
      field: 'outputProduct',
      header: 'Sản phẩm đầu ra',
      body: (row: ProductionBom) =>
        row.outputProduct ? `${row.outputProduct.code} – ${row.outputProduct.name}` : '—',
      style: { minWidth: '220px' },
    },
    {
      field: 'baseQty',
      header: 'Quy mô mẻ',
      body: (row: ProductionBom) =>
        `${Number(row.baseQty).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} ${row.outputProduct?.unit ?? ''}`,
      style: { minWidth: '110px', textAlign: 'right' as const },
    },
    {
      field: 'version',
      header: 'Phiên bản',
      body: (row: ProductionBom) => `v${row.version}`,
      style: { minWidth: '90px', textAlign: 'center' as const },
    },
    {
      field: 'status',
      header: 'Trạng thái',
      body: (row: ProductionBom) => <StatusBadge status={row.status} />,
      style: { minWidth: '130px' },
    },
    {
      field: 'effectiveFrom',
      header: 'Hiệu lực từ',
      body: (row: ProductionBom) => formatDate(row.effectiveFrom),
      style: { minWidth: '110px' },
    },
    {
      field: 'creator',
      header: 'Người tạo',
      body: (row: ProductionBom) => row.creator?.fullName ?? '—',
      style: { minWidth: '130px' },
    },
    {
      field: '_actions',
      header: '',
      body: (row: ProductionBom) => (
        <Button
          icon="pi pi-pencil"
          text
          rounded
          size="small"
          tooltip="Chỉnh sửa"
          tooltipOptions={{ position: 'left' }}
          onClick={() => navigate(`/production-bom/${row.id}/edit`)}
          disabled={!['draft'].includes(row.status)}
        />
      ),
      style: { width: '56px', textAlign: 'center' as const },
    },
  ]

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex align-items-center gap-2 mb-3 flex-wrap">
        <Dropdown
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.value)}
          style={{ minWidth: '180px' }}
        />
        <Button
          label="Tạo định mức mới"
          icon="pi pi-plus"
          onClick={() => navigate('/production-bom/new')}
        />
        <span className="ml-auto text-sm text-color-secondary">
          {total > 0 ? `${total} phiếu` : ''}
        </span>
      </div>

      {/* Table */}
      <DataTable
        value={boms}
        loading={loading}
        scrollable
        scrollHeight="calc(100vh - 220px)"
        emptyMessage="Chưa có phiếu định mức nào."
        className="p-datatable-sm"
        rowHover
      >
        {columns.map((col) => (
          <Column
            key={col.field}
            field={col.field}
            header={col.header}
            body={col.body}
            style={col.style}
          />
        ))}
      </DataTable>

      {/* Pagination */}
      <div className="flex align-items-center gap-2 mt-2 justify-content-end">
        <Dropdown
          value={limit}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ label: `${n} / trang`, value: n }))}
          onChange={(e) => { setLimit(e.value as number); setPage(1) }}
          style={{ width: '130px' }}
        />
        <Button icon="pi pi-chevron-left"  text disabled={page <= 1}                         onClick={() => setPage((p) => p - 1)} />
        <span className="text-sm">{page} / {Math.max(1, Math.ceil(total / limit))}</span>
        <Button icon="pi pi-chevron-right" text disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} />
      </div>
    </div>
  )
}
