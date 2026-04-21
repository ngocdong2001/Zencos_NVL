import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { RadioButton } from 'primereact/radiobutton'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fetchInventoryItemDetail } from '../lib/warehouseApi'
import type { InventoryItemDetail, LotDetail } from '../lib/warehouseApi'
import {
  fetchInboundReceiptDetail,
  fetchInboundReceiptHistory,
  type InboundReceiptDetailResponse,
  type InboundReceiptHistoryRowResponse,
} from '../lib/inboundApi'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import './WarehouseItemDetailPage.css'

// ── Formatters ────────────────────────────────────────────────────────

function formatVND(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ đ`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} triệu đ`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} nghìn đ`
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} đ`
}

function formatVNDFull(v: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatGram(gram: number, unit: string): string {
  if (unit === 'g') {
    if (gram >= 1e6) return `${(gram / 1e6).toFixed(2)} Tấn`
    if (gram >= 1e3) return `${(gram / 1e3).toFixed(2)} Kg`
    return `${gram} g`
  }
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(gram)} ${unit}`
}

function getDocTypeLabel(docType: string) {
  const m: Record<string, string> = { pdf: 'PDF', docx: 'DOCX', xlsx: 'XLSX', doc: 'DOC', xls: 'XLS' }
  return m[docType.toLowerCase()] ?? docType.toUpperCase()
}

// ── Lot status badge ──────────────────────────────────────────────────

function LotStatusBadge({ lot }: { lot: LotDetail }) {
  const daysLeft = lot.expiryDate
    ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / 86400000)
    : null

  if (lot.status === 'near_expiration') {
    return <span className="idb-status-badge idb-status-near">Cận hạn {daysLeft !== null ? `(${daysLeft}d)` : ''}</span>
  }
  if (lot.status === 'monitoring') {
    return <span className="idb-status-badge idb-status-monitor">Theo dõi</span>
  }
  return <span className="idb-status-badge idb-status-ok">In Stock</span>
}

// ── Chart data builders ───────────────────────────────────────────────

function buildTrendData(monthlyStats: InventoryItemDetail['monthlyStats'], currentStock: number) {
  const now = new Date()
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const statsMap = new Map(monthlyStats.map((s) => [s.month, s]))
  let balance = currentStock
  const result: { label: string; stock: number }[] = []
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i]
    const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthNum = parseInt(m.slice(5)) - 1
    result.unshift({ label: abbr[monthNum], stock: Math.max(0, balance) })
    const s = statsMap.get(m)
    if (s) balance = balance + s.exportGram - s.importGram
  }
  return result
}

function buildConsumptionData(monthlyStats: InventoryItemDetail['monthlyStats']) {
  const now = new Date()
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const statsMap = new Map(monthlyStats.map((s) => [s.month, s]))
  return months.map((m) => {
    const monthNum = parseInt(m.slice(5)) - 1
    return { label: abbr[monthNum], export: statsMap.get(m)?.exportGram ?? 0 }
  })
}

// ── Main page ─────────────────────────────────────────────────────────

export function WarehouseItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Inbound receipt dialog ───────────────────────────────────────────
  const [receiptDialogVisible, setReceiptDialogVisible] = useState(false)
  const [receiptDialogRef, setReceiptDialogRef] = useState('')
  const [receiptDetail, setReceiptDetail] = useState<InboundReceiptDetailResponse | null>(null)
  const [receiptDetailLoading, setReceiptDetailLoading] = useState(false)
  const [receiptDetailError, setReceiptDetailError] = useState<string | null>(null)
  const [receiptHistory, setReceiptHistory] = useState<HistoryTimelineEvent[]>([])
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false)
  const [receiptHistoryError, setReceiptHistoryError] = useState<string | null>(null)

  function mapHistoryRows(rows: InboundReceiptHistoryRowResponse[]): HistoryTimelineEvent[] {
    return rows.map((r) => ({ id: r.id, actionType: r.actionType, action: r.actionLabel, actorName: r.actorName, at: r.createdAt }))
  }

  async function openReceiptDialog(receiptId: string, receiptRef: string) {
    setReceiptDialogVisible(true)
    setReceiptDialogRef(receiptRef)
    setReceiptDetail(null)
    setReceiptHistory([])
    setReceiptDetailError(null)
    setReceiptHistoryError(null)
    setReceiptDetailLoading(true)
    setReceiptHistoryLoading(true)
    try {
      const d = await fetchInboundReceiptDetail(receiptId)
      setReceiptDetail(d)
    } catch (e) {
      setReceiptDetailError(e instanceof Error ? e.message : 'Không thể tải chi tiết phiếu nhập.')
    } finally {
      setReceiptDetailLoading(false)
    }
    try {
      const rows = await fetchInboundReceiptHistory(receiptId)
      setReceiptHistory(mapHistoryRows(rows))
    } catch (e) {
      setReceiptHistoryError(e instanceof Error ? e.message : 'Không thể tải lịch sử phiếu nhập.')
    } finally {
      setReceiptHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchInventoryItemDetail(id)
      .then(setDetail)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const trendData = useMemo(
    () => (detail ? buildTrendData(detail.monthlyStats, detail.stockQuantity) : []),
    [detail],
  )
  const consumptionData = useMemo(
    () => (detail ? buildConsumptionData(detail.monthlyStats) : []),
    [detail],
  )

  if (loading) {
    return (
      <div className="idb-state-center">
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2.5rem', color: '#2563eb' }} />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="idb-state-center">
        <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc2626' }} />
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>{error ?? 'Không tìm thấy nguyên vật liệu'}</p>
        <button className="idb-text-btn" onClick={() => navigate(-1)}>← Quay lại danh sách</button>
      </div>
    )
  }

  const unit = detail.unit
  const avgUnitPricePerKg = detail.stockQuantity > 0
    ? detail.lots.reduce((s, l) => s + l.unitPricePerKg * l.quantityGram, 0) / detail.stockQuantity
    : 0
  const nearExpLots  = detail.lots.filter((l) => l.status === 'near_expiration')
  const stockOk      = detail.stockQuantity >= detail.minStockLevel

  type Tx = InventoryItemDetail['transactions'][0]

  return (
    <>
    <div className="idb-page">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="idb-page-hdr">
        <div className="idb-page-hdr-left">
          <button className="idb-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <i className="pi pi-arrow-left" />
          </button>
          <div>
            <div className="idb-page-title">
              Chi tiết Vật tư:{' '}
              <strong>{detail.inciName || detail.tradeName}</strong>
              {detail.inciName && detail.tradeName && (
                <span className="idb-trade-name"> ({detail.tradeName})</span>
              )}
            </div>
            <div className="idb-page-subtitle">
              Phân loại: {detail.classification}
            </div>
          </div>
        </div>
        <div className="idb-code-badge">MÃ NGUYÊN VẬT LIỆU: {detail.code}</div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="idb-kpi-grid">
        {/* Card 1 */}
        <div className="idb-kpi-card">
          <div className="idb-kpi-icon idb-kpi-icon--blue">
            <i className="pi pi-th-large" />
          </div>
          <div className="idb-kpi-label">Tổng tồn khả dụng</div>
          <div className="idb-kpi-value">{formatGram(detail.stockQuantity, unit)}</div>
          <div className="idb-kpi-sub">Tương đương {detail.lots.length} lô hàng</div>
          <div className="idb-kpi-trend">
            <i className="pi pi-arrow-up" style={{ fontSize: 10 }} />
            <span>0% so với tháng trước</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="idb-kpi-card">
          <div className="idb-kpi-icon idb-kpi-icon--green">
            <i className="pi pi-chart-line" />
          </div>
          <div className="idb-kpi-label">Giá trị tồn kho</div>
          <div className="idb-kpi-value idb-kpi-value--lg">{formatVNDFull(detail.value)}</div>
          <div className="idb-kpi-sub">Đơn giá TB: {formatVND(avgUnitPricePerKg * 1000)}/Kg</div>
        </div>

        {/* Card 3 */}
        <div className="idb-kpi-card">
          <div className={`idb-kpi-icon ${stockOk ? 'idb-kpi-icon--orange' : 'idb-kpi-icon--red'}`}>
            <i className="pi pi-clock" />
          </div>
          <div className="idb-kpi-label">Mức tồn tối thiểu</div>
          <div className="idb-kpi-value">{formatGram(detail.minStockLevel, unit)}</div>
          <div className={`idb-kpi-sub ${stockOk ? '' : 'idb-kpi-sub--danger'}`}>
            {stockOk ? 'Đảm bảo tồn kho' : 'Dưới định mức tối thiểu'}
          </div>
        </div>

        {/* Card 4 */}
        <div className="idb-kpi-card">
          <div className="idb-kpi-icon idb-kpi-icon--purple">
            <i className="pi pi-share-alt" />
          </div>
          <div className="idb-kpi-label">Số lô hàng</div>
          <div className="idb-kpi-value">{detail.lots.length} lô</div>
          <div className={`idb-kpi-sub ${nearExpLots.length > 0 ? 'idb-kpi-sub--danger' : ''}`}>
            {nearExpLots.length > 0 ? `${nearExpLots.length} lô cận hạn sử dụng` : 'Không có lô cận hạn'}
          </div>
        </div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="idb-charts-grid">
        <div className="idb-chart-card">
          <div className="idb-chart-title">Xu hướng tồn kho (6 tháng)</div>
          <div className="idb-chart-sub">Theo dõi biến động mức tồn theo tháng</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => unit === 'g' ? `${(v / 1000).toFixed(0)}` : `${v}`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(v: number) => [formatGram(v, unit), 'Tồn kho']}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone" dataKey="stock" stroke="#2563eb" strokeWidth={2}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="idb-chart-legend">
            <span className="idb-legend-dot" style={{ background: '#2563eb' }} />
            Tồn kho
          </div>
        </div>

        <div className="idb-chart-card">
          <div className="idb-chart-title">Mức độ tiêu thụ</div>
          <div className="idb-chart-sub">Sản lượng xuất kho hàng tháng</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={consumptionData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => unit === 'g' ? `${(v / 1000).toFixed(0)}` : `${v}`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(v: number) => [formatGram(v, unit), 'Xuất kho']}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="export" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="idb-chart-legend">
            <span className="idb-legend-dot" style={{ background: '#3b82f6' }} />
            Tiêu thụ
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="idb-body-grid">

        {/* ── Main column ── */}
        <div className="idb-body-main">

          {/* Lot table */}
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <i className="pi pi-th-large idb-section-icon" />
                <span className="idb-section-title">Danh sách Lô hàng (FEFO)</span>
              </div>
              <span className="idb-count-pill">{detail.lots.length} Lô hàng</span>
            </div>
            <DataTable
              value={detail.lots}
              className="prime-catalog-table idb-datatable"
              emptyMessage="Không có lô hàng nào"
              size="small"
              tableStyle={{ width: '100%', tableLayout: 'fixed' }}
            >
              <Column
                style={{ width: '36px', padding: '0 0 0 8px' }}
                body={() => <i className="pi pi-chevron-right" style={{ color: '#9ca3af', fontSize: 12 }} />}
              />
              <Column
                header="Mã Lô"
                style={{ width: '28%' }}
                body={(row: LotDetail) => (
                  row.receiptId ? (
                    <button
                      className="idb-lot-link idb-lot-link--btn"
                      onClick={() => void openReceiptDialog(row.receiptId!, row.receiptRef ?? row.lotNo)}
                      title={`Xem phiếu nhập: ${row.receiptRef ?? row.lotNo}`}
                    >
                      {row.lotNo}
                    </button>
                  ) : (
                    <span className="idb-lot-link" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.lotNo}</span>
                  )
                )}
              />
              <Column
                header="Ngày hết hạn"
                style={{ width: '20%' }}
                body={(row: LotDetail) => {
                  const isNear = row.status === 'near_expiration'
                  return (
                    <span style={{ color: isNear ? '#dc2626' : undefined, fontWeight: isNear ? 500 : undefined }}>
                      {formatDate(row.expiryDate)}
                    </span>
                  )
                }}
              />
              <Column
                header="Số lượng"
                style={{ width: '18%' }}
                body={(row: LotDetail) => formatGram(row.quantityGram, unit)}
              />
              <Column
                header="Đơn giá/Kg"
                style={{ width: '18%' }}
                body={(row: LotDetail) => formatVND(row.unitPricePerKg * 1000)}
              />
              <Column
                header="Nhà sản xuất"
                style={{ width: '20%' }}
                body={(row: LotDetail) => row.manufacturerName ?? <span style={{ color: '#9ca3af' }}>—</span>}
              />
              <Column
                header="Trạng thái"
                style={{ width: '12%' }}
                body={(row: LotDetail) => <LotStatusBadge lot={row} />}
              />
              <Column
                style={{ width: '44px', textAlign: 'center' }}
                body={() => (
                  <button className="idb-icon-btn" title="Thao tác">
                    <i className="pi pi-ellipsis-v" />
                  </button>
                )}
              />
            </DataTable>
          </div>

          {/* Transaction table */}
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <i className="pi pi-history idb-section-icon" />
                <span className="idb-section-title">Lịch sử Giao dịch</span>
              </div>
              <button className="idb-text-btn">Xem tất cả</button>
            </div>
            <DataTable
              value={detail.transactions}
              className="prime-catalog-table idb-datatable"
              emptyMessage="Chưa có giao dịch nào"
              size="small"
              tableStyle={{ width: '100%', tableLayout: 'fixed' }}
            >
              <Column
                header="Thời gian"
                style={{ width: '18%' }}
                body={(row: Tx) => <span style={{ color: '#374151', fontSize: 12 }}>{formatDateTime(row.transactionDate)}</span>}
              />
              <Column
                header="Loại"
                style={{ width: '14%' }}
                body={(row: Tx) => (
                  <span className={`idb-tx-badge idb-tx-${row.type}`}>
                    {row.type === 'import' ? 'Nhập kho' : row.type === 'export' ? 'Xuất kho' : 'Điều chỉnh'}
                  </span>
                )}
              />
              <Column
                header="Mã tham chiếu"
                style={{ width: '36%' }}
                body={(row: Tx) => (
                  <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {row.notes || row.lotNo}
                  </span>
                )}
              />
              <Column
                header="Số lượng"
                style={{ width: '16%' }}
                body={(row: Tx) => (
                  <span className={row.type === 'export' ? 'idb-qty-neg' : 'idb-qty-pos'}>
                    {row.type === 'export' ? '−' : '+'}{formatGram(row.quantityBase, unit)}
                  </span>
                )}
              />
              <Column
                header="Người thực hiện"
                style={{ width: '16%' }}
                body={(row: Tx) => (
                  <div className="idb-person">
                    <div className="idb-avatar">{row.userName.charAt(0).toUpperCase()}</div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.userName}</span>
                  </div>
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="idb-body-side">

          {/* Documents */}
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <span className="idb-section-title">Tài liệu đính kèm</span>
              </div>
            </div>
            {detail.documents.length === 0 ? (
              <div className="idb-empty-state">
                <i className="pi pi-file-o" style={{ fontSize: 28, color: '#d1d5db' }} />
                <span>Chưa có tài liệu đính kèm</span>
              </div>
            ) : (
              <div className="idb-doc-list">
                {detail.documents.map((doc) => (
                  <div key={doc.id} className="idb-doc-row">
                    <div className="idb-doc-icon">
                      <i className="pi pi-file-pdf" />
                    </div>
                    <div className="idb-doc-info">
                      <div className="idb-doc-name">{doc.originalName}</div>
                      <div className="idb-doc-meta">
                        {getDocTypeLabel(doc.docType)}
                        {doc.fileSize ? ` • ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                        {` • ${formatDate(doc.createdAt)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="idb-section-footer">
              <button className="idb-upload-btn">
                <i className="pi pi-plus" />
                Tải lên tài liệu mới
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <i className="pi pi-bell idb-section-icon" />
                <span className="idb-section-title">Thông báo vật tư</span>
              </div>
            </div>
            <div className="idb-alerts-list">
              {nearExpLots.length > 0 && (
                <div className="idb-alert idb-alert--warn">
                  <div className="idb-alert-dot idb-alert-dot--warn" />
                  <div>
                    <div className="idb-alert-title">Sắp hết hạn sử dụng</div>
                    <div className="idb-alert-body">
                      {nearExpLots.length} lô sắp hết hạn trong vòng 45 ngày.
                    </div>
                  </div>
                </div>
              )}
              {!stockOk && (
                <div className="idb-alert idb-alert--danger">
                  <div className="idb-alert-dot idb-alert-dot--danger" />
                  <div>
                    <div className="idb-alert-title">Dưới định mức tối thiểu</div>
                    <div className="idb-alert-body">
                      Tồn kho hiện tại thấp hơn định mức an toàn ({formatGram(detail.minStockLevel, unit)}).
                    </div>
                  </div>
                </div>
              )}
              {nearExpLots.length === 0 && stockOk && (
                <div className="idb-alert idb-alert--ok">
                  <div className="idb-alert-dot idb-alert-dot--ok" />
                  <div>
                    <div className="idb-alert-title">Không có cảnh báo</div>
                    <div className="idb-alert-body">Vật tư đang ở trạng thái bình thường.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="idb-section-footer">
              <button className="idb-text-btn">Cấu hình cảnh báo</button>
            </div>
          </div>

          {/* Barcode print */}
          <div className="idb-barcode-card">
            <div className="idb-barcode-icon">
              <i className="pi pi-box" />
            </div>
            <div className="idb-barcode-title">In nhãn mã vạch</div>
            <div className="idb-barcode-desc">
              Tạo nhãn mã vạch cho tất cả các lô hàng có thể kiểm kê kho.
            </div>
            <button className="idb-export-btn">
              <i className="pi pi-download" />
              Xuất file in nhãn
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* -- Inbound receipt detail dialog ------------------------------- */}
      <Dialog
        visible={receiptDialogVisible}
        onHide={() => setReceiptDialogVisible(false)}
        header={receiptDialogRef ? `Chi tiết phiếu nhập ${receiptDialogRef}` : 'Chi tiết phiếu nhập'}
        style={{ width: '92vw', maxWidth: '1320px' }}
        modal
        draggable={false}
        resizable={false}
        className="inbound-step4-preview-dialog"
      >
        {receiptDetailLoading ? <p className="po-field-success">Đang tải chi tiết phiếu nhập...</p> : null}
        {receiptDetailError ? <p className="po-field-error">{receiptDetailError}</p> : null}

        {receiptDetail ? (
          <section className="inbound-create-card inbound-step4-review-card inbound-readonly-card">
            <div className="inbound-step4-layout">
              <aside className="inbound-step4-history-panel">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-history" />
                  <span>LỊCH SỬ THAO TÁC</span>
                </div>
                <HistoryTimeline
                  events={receiptHistory}
                  loading={receiptHistoryLoading}
                  error={receiptHistoryError}
                  emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
                />
              </aside>

              <div className="inbound-step4-main">
                {receiptDetail.adjustedByReceipt ? <div className="inbound-step4-adjustment-watermark">Hủy do điều chỉnh</div> : null}
                <div className="inbound-step4-body">
                  <div className="inbound-step4-banner">
                    <div className="inbound-step4-banner-left">
                      <div className="inbound-step4-title-row">
                        <h3 className="inbound-step4-banner-title">Xác nhận Nhập kho</h3>
                        <span className={`inbound-step4-status-tag ${receiptDetail.status}`}>
                          {receiptDetail.status === 'posted' ? 'Đã posted' : receiptDetail.status === 'pending_qc' ? 'Chờ QC' : receiptDetail.status === 'cancelled' ? 'Đã hủy' : 'Nháp'}
                        </span>
                      </div>
                      <p className="inbound-step4-banner-docid">
                        <InputText value={receiptDetail.receiptRef} readOnly className="inbound-step4-ref-input" />
                      </p>
                    </div>
                    <div className="inbound-step4-banner-right">
                      <span className="inbound-step4-lot-label">LOT NUMBER</span>
                      <span className="inbound-step4-lot-pill">{receiptDetail.items[0]?.lotNo ?? '—'}</span>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-info-circle" />
                      <span>THÔNG TIN NGUYÊN LIỆU &amp; ĐỐI TÁC</span>
                    </div>
                    <div className="inbound-step4-info-grid">
                      <div><p className="inbound-step4-info-label">Nhà cung cấp</p><p className="inbound-step4-info-value">{receiptDetail.supplier?.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Kho lưu trữ</p><p className="inbound-step4-info-value">{receiptDetail.receivingLocation?.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Tên nguyên liệu</p><p className="inbound-step4-info-value">{receiptDetail.items[0]?.product.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Mã nguyên liệu</p><p className="inbound-step4-info-value">{receiptDetail.items[0]?.product.code ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Ngày nhận hàng</p><p className="inbound-step4-info-value">{receiptDetail.expectedDate ? new Date(receiptDetail.expectedDate).toLocaleDateString('vi-VN') : '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Trạng thái QC</p><span className="inbound-step4-qc-badge">{receiptDetail.items[0]?.qcStatus === 'passed' ? 'Đạt' : receiptDetail.items[0]?.qcStatus === 'failed' ? 'Không đạt' : 'Chờ QC'}</span></div>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-verified" />
                      <span>KIỂM TRA QC THEO TỪNG DÒNG</span>
                    </div>
                    {receiptDetail.items.length === 0 ? (
                      <p className="inbound-step4-no-files">Chưa có dòng nhập kho để QC.</p>
                    ) : (
                      <div className="inbound-step4-files-grid inbound-step4-qc-grid">
                        {receiptDetail.items.map((item) => (
                          <div key={item.id} className="inbound-step4-file-card">
                            <div className="inbound-step4-file-info" style={{ width: '100%' }}>
                              <p className="inbound-step4-file-name">{item.product.code} - {item.product.name}</p>
                              <div className="inbound-step4-file-meta" style={{ width: '100%', justifyContent: 'space-between' }}>
                                <span>LOT: {item.lotNo}</span>
                                <span>SL: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(item.quantityDisplay))} {item.unitUsed}</span>
                                <span>{item.documents.length > 0 ? 'Có chứng từ' : 'Thiếu chứng từ'}</span>
                              </div>
                              <div className="inbound-step4-qc-radio-group" style={{ marginTop: 10 }}>
                                {(['pending', 'passed', 'failed'] as const).map((val) => (
                                  <div key={val} className="inbound-step4-qc-radio-item">
                                    <RadioButton
                                      inputId={`idb-qc-${item.id}-${val}`}
                                      name={`idb-qc-${item.id}`}
                                      value={val}
                                      checked={item.qcStatus === val}
                                      disabled
                                    />
                                    <label>{val === 'passed' ? 'Đạt' : val === 'failed' ? 'Không đạt' : 'Chờ QC'}</label>
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
                          {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(receiptDetail.items.reduce((s, i) => s + Number(i.quantityDisplay), 0))}
                        </p>
                      </div>
                      <div className="inbound-step4-stat-card">
                        <p className="inbound-step4-stat-label">Đơn giá trung bình (VND/kg)</p>
                        <p className="inbound-step4-stat-value">
                          {receiptDetail.items.length > 0
                            ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(receiptDetail.items.reduce((s, i) => s + Number(i.unitPricePerKg), 0) / receiptDetail.items.length)) + ' VND'
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="inbound-step4-total-bar">
                      <div>
                        <p className="inbound-step4-total-label">TỔNG GIÁ TRỊ THANH TOÁN</p>
                        <p className="inbound-step4-total-sub">Tổng cộng toàn bộ dòng chi tiết trong phiếu nhập</p>
                      </div>
                      <p className="inbound-step4-total-amount">
                        {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(receiptDetail.items.reduce((s, i) => s + Number(i.lineAmount), 0)))} <span>VND</span>
                      </p>
                    </div>
                  </div>

                  {receiptDetail.items.flatMap((i) => i.documents).length > 0 && (
                    <div className="inbound-step4-section">
                      <div className="inbound-step4-section-header">
                        <i className="pi pi-file-edit" />
                        <span>HỒ SƠ TÀI LIỆU ĐÍNH KÈM</span>
                      </div>
                      <div className="inbound-step4-files-grid">
                        {receiptDetail.items.flatMap((i) => i.documents).map((doc) => (
                          <div key={doc.id} className="inbound-step4-file-card">
                            <div className="inbound-step4-file-icon-wrap"><i className="pi pi-file-edit" /></div>
                            <div className="inbound-step4-file-info">
                              <p className="inbound-step4-file-name">{doc.originalName}</p>
                              <div className="inbound-step4-file-meta">
                                <span className={`doc-type-badge doc-type-${String(doc.docType).toLowerCase()}`}>{doc.docType}</span>
                                <span className="inbound-step4-file-size">{doc.fileSize < 1024 * 1024 ? `${(doc.fileSize / 1024).toFixed(0)} KB` : `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </Dialog>
    </>
  )
}
