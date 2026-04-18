import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDashboard, type DashboardData } from '../lib/dashboardApi'
import type { ExpiryAlert, LowStockAlert } from '../lib/dashboardApi'
import { PagedTableFooter } from '../components/layout/PagedTableFooter'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { RadioButton } from 'primereact/radiobutton'
import { fetchInboundReceiptDetail, fetchInboundReceiptHistory, type InboundReceiptDetailResponse, type InboundReceiptHistoryRowResponse } from '../lib/inboundApi'
import { OutboundDetailDialog } from '../components/outbound/OutboundDetailDialog'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import { fetchPurchaseRequestDetail, type PurchaseRequestDetailResponse } from '../lib/purchaseShortageApi'
import { formatQuantity } from '../components/purchaseOrder/format'
import { STATUS_LABELS as PO_STATUS_LABELS, type PoStatus } from '../components/purchaseOrder/types'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
}

function alertStyle(severity: string): { lineColor: string; bg: string } {
  if (severity === 'critical') return { lineColor: '#e83030', bg: 'rgba(232,48,48,0.05)' }
  return { lineColor: '#e0e1e5', bg: 'transparent' }
}

type TxRecord = { dbId: string; id: string; type: string; material: string; quantity: string; time: string; status: string }

type TxDetailType = 'Nhập' | 'Xuất' | 'Mua hàng'

function fmtDateVi(value: string | null | undefined): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function fmtDateTimeVi(value: string | null | undefined): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN')
}

function toPoStatus(s: string): PoStatus {
  const valid: PoStatus[] = ['draft','submitted','approved','ordered','partially_received','received','cancelled']
  return valid.includes(s as PoStatus) ? (s as PoStatus) : 'draft'
}

type QcStatus = 'pending' | 'passed' | 'failed'
const QC_STATUS_OPTIONS: Array<{ label: string; value: QcStatus }> = [
  { label: 'Chờ QC', value: 'pending' },
  { label: 'Đạt', value: 'passed' },
  { label: 'Không đạt', value: 'failed' },
]

function formatDateOnly(value?: string | null): string {
  if (!value) return '---'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function formatCurrencyVnd(value: number): string {
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

function toInboundStatusLabel(status: string): string {
  if (status === 'posted') return 'Đã posted'
  if (status === 'pending_qc') return 'Chờ QC'
  if (status === 'cancelled') return 'Đã hủy'
  return 'Nháp'
}

function mapInboundHistoryRows(rows: InboundReceiptHistoryRowResponse[]): HistoryTimelineEvent[] {
  return rows.map((row) => ({
    id: row.id,
    actionType: row.actionType,
    action: row.actionLabel,
    actorName: row.actorName,
    at: row.createdAt,
  }))
}

// ── Type badge ────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { border: string; color: string }> = {
  'Nhập':       { border: '#e0e1e5', color: '#191a1f' },
  'Xuất':       { border: '#1f68f9', color: '#1f68f9' },
  'Điều chỉnh': { border: '#5a5c68', color: '#5a5c68' },
}

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_BADGE[type] ?? { border: '#e0e1e5', color: '#191a1f' }
  return (
    <span style={{
      fontSize: 12, fontWeight: 400,
      border: `1px solid ${style.border}`,
      borderRadius: 11, padding: '1px 10px',
      color: style.color, whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  )
}

// ── Status cell ───────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#191a1f' }}>
      {status === 'Đang xử lý' && (
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#1f68f9', flexShrink: 0 }} />
      )}
      {status}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  bg: string; icon: string; iconColor: string
  tag: string; label: string; value: string
}

function KpiCard({ bg, icon, iconColor, tag, label, value }: KpiCardProps) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 0,
      background: bg, borderRadius: 10, height: 120,
      padding: '16px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
    }}>
      {/* icon + tag row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, background: '#fff', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          <i className={icon} style={{ fontSize: 15, color: iconColor }} />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 500,
          border: '1px solid #e0e1e5', borderRadius: 11,
          padding: '1px 10px', color: '#191a1f', whiteSpace: 'nowrap',
        }}>
          {tag}
        </span>
      </div>
      {/* label */}
      <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 500, color: '#5a5c68', lineHeight: '18px' }}>
        {label}
      </p>
      {/* value */}
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191a1f', letterSpacing: '-0.5px', lineHeight: '28px' }}>
        {value}
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [txPage, setTxPage] = useState(1)
  const [txPageSize, setTxPageSize] = useState(20)

  // Quick-view dialog state (Mua hàng only)
  const [txDetailVisible, setTxDetailVisible] = useState(false)
  const [txDetailLoading, setTxDetailLoading] = useState(false)
  const [txDetailError, setTxDetailError] = useState<string | null>(null)
  const [txDetailRef, setTxDetailRef] = useState('')
  const [purchaseDetail, setPurchaseDetail] = useState<PurchaseRequestDetailResponse | null>(null)

  // Outbound detail dialog
  const [outboundDialogId, setOutboundDialogId] = useState<string | null>(null)

  // Inbound receipt dialog (full step4 preview)
  const [inboundDialogVisible, setInboundDialogVisible] = useState(false)
  const [inboundDialogRef, setInboundDialogRef] = useState('')
  const [inboundDetail, setInboundDetail] = useState<InboundReceiptDetailResponse | null>(null)
  const [inboundDetailLoading, setInboundDetailLoading] = useState(false)
  const [inboundDetailError, setInboundDetailError] = useState<string | null>(null)
  const [inboundHistory, setInboundHistory] = useState<HistoryTimelineEvent[]>([])
  const [inboundHistoryLoading, setInboundHistoryLoading] = useState(false)
  const [inboundHistoryError, setInboundHistoryError] = useState<string | null>(null)

  const openInboundDialog = async (dbId: string, ref: string) => {
    setInboundDialogVisible(true)
    setInboundDialogRef(ref)
    setInboundDetail(null)
    setInboundHistory([])
    setInboundDetailError(null)
    setInboundHistoryError(null)
    setInboundDetailLoading(true)
    setInboundHistoryLoading(true)
    try {
      const d = await fetchInboundReceiptDetail(dbId)
      setInboundDetail(d)
    } catch (err) {
      setInboundDetailError(err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu nhập.')
    } finally {
      setInboundDetailLoading(false)
    }
    try {
      const rows = await fetchInboundReceiptHistory(dbId)
      setInboundHistory(mapInboundHistoryRows(rows))
    } catch (err) {
      setInboundHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử phiếu nhập.')
    } finally {
      setInboundHistoryLoading(false)
    }
  }

  const openTxDetail = async (row: TxRecord) => {
    if (row.type === 'Nhập') {
      void openInboundDialog(row.dbId, row.id)
      return
    }
    if (row.type === 'Xuất') {
      setOutboundDialogId(row.dbId)
      return
    }
    setTxDetailVisible(true)
    setTxDetailLoading(true)
    setTxDetailError(null)
    setTxDetailRef(row.id)
    setPurchaseDetail(null)
    try {
      const d = await fetchPurchaseRequestDetail(row.dbId)
      setPurchaseDetail(d)
    } catch (err) {
      setTxDetailError(err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu.')
    } finally {
      setTxDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const allTx = data?.recentTransactions ?? []
  const txTotal = allTx.length
  const txTotalPages = Math.max(1, Math.ceil(txTotal / txPageSize))
  const txSafePage = Math.min(txPage, txTotalPages)
  const txStart = (txSafePage - 1) * txPageSize
  const txRows = allTx.slice(txStart, txStart + txPageSize)
  const txRangeStart = txTotal === 0 ? 0 : txStart + 1
  const txRangeEnd = Math.min(txStart + txPageSize, txTotal)

  const fefoRows = data ? [
    { label: 'Lô an toàn',      pct: data.fefo.safePct,       valueColor: '#191a1f', barColor: '#2626d9' },
    { label: 'Lô sắp hết hạn', pct: data.fefo.nearExpiryPct, valueColor: '#191a1f', barColor: '#f59e0b' },
    { label: 'Lô quá hạn',     pct: data.fefo.expiredPct,    valueColor: '#e83030', barColor: '#e83030' },
  ] : []

  return (
    <>
    {/* negative margin cancels catalog-main's padding so we control spacing exactly */}
    <div style={{
      margin: '-24px -32px -20px',
      background: '#fff',
      minHeight: '100%',
    }}>
      <div style={{ padding: '40px 40px 48px' }}>

        {/* ── Section 1: Title + Date picker ─────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 30, fontWeight: 700, color: '#191a1f',
              letterSpacing: '-0.75px', lineHeight: '36px', fontFamily: 'Inter, sans-serif',
            }}>
              Tổng quan hệ thống
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 400, color: '#5a5c68', lineHeight: '24px' }}>
              Chào mừng trở lại, Warehouse Manager. Dưới đây là tình hình kho hôm nay.
            </p>
          </div>

          {/* Current month badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #e0e1e5', borderRadius: 10,
            background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
            height: 40, padding: '0 14px', flexShrink: 0,
          }}>
            <i className="pi pi-calendar" style={{ fontSize: 14, color: '#5a5c68' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#5a5c68', whiteSpace: 'nowrap' }}>
              {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* ── Section 2: Quick Actions ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <button onClick={() => navigate('/inbound/new')} style={btnPrimary}>
            <i className="pi pi-plus" style={{ fontSize: 14 }} /> Tạo Phiếu Nhập
          </button>
          <button onClick={() => navigate('/outbound/new')} style={btnPrimary}>
            <i className="pi pi-minus" style={{ fontSize: 14 }} /> Lập Lệnh Xuất
          </button>
          <button onClick={() => navigate('/catalog')} style={btnOutline}>
            <i className="pi pi-file" style={{ fontSize: 14 }} /> Quản lý Danh mục
          </button>
          <button onClick={() => navigate('/warehouse')} style={btnOutline}>
            <i className="pi pi-arrow-right" style={{ fontSize: 14 }} /> Xem Tồn Kho (FEFO)
          </button>
        </div>

        {/* ── Section 3: KPI Cards ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <KpiCard bg="#f2f2fd" icon="pi pi-box"                  iconColor="#2626d9" tag="Giá trị tồn kho"          label="Tổng Giá Trị Tồn Kho"     value={loading ? '—' : fmtVnd(data?.kpi.totalStockValue ?? 0)} />
          <KpiCard bg="#fff7ed" icon="pi pi-exclamation-triangle" iconColor="#f59e0b" tag="30 ngày tới"              label="Lô Sắp Hết Hạn (30 ngày)" value={loading ? '—' : `${data?.kpi.expiringBatchCount ?? 0} Lô`}  />
          <KpiCard bg="#ecfdf5" icon="pi pi-arrow-circle-up"      iconColor="#059669" tag="Chờ xử lý"              label="Yêu Cầu Nhập Kho Chờ"      value={loading ? '—' : `${data?.kpi.pendingInboundCount ?? 0} Đơn`} />
          <KpiCard bg="#f0f5ff" icon="pi pi-arrow-circle-down"    iconColor="#5269e0" tag="Chờ xuất"               label="Lệnh Xuất Kho Chờ"         value={loading ? '—' : `${data?.kpi.pendingOutboundCount ?? 0} Đơn`} />
        </div>

        {/* ── Section 4: Chart + Alerts ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 38, alignItems: 'stretch', height: 640 }}>

          {/* Inbound/Outbound by Unit Chart */}
          <div style={{
            flex: '1 1 0', minWidth: 0,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
            padding: 24,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#191a1f', letterSpacing: '-0.45px', lineHeight: '28px' }}>
                Nhập / Xuất theo Đơn vị (7 ngày)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#5a5c68', lineHeight: '20px' }}>
                Số lượng thực tế phân theo từng loại đơn vị đo lường
              </p>
            </div>
            {!loading && (data?.weeklyFlow ?? []).length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a5c68', fontSize: 14 }}>
                Không có dữ liệu trong 7 ngày gần nhất
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.weeklyFlow ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#5a5c68', fontFamily: 'Inter,sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString('vi-VN')}
                  />
                  <YAxis
                    type="category"
                    dataKey="unit"
                    tick={{ fontSize: 13, fill: '#191a1f', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e0e1e5', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    formatter={(value: number, name: string, props: { payload?: { unit?: string } }) => {
                      const unit = props.payload?.unit ?? ''
                      const label = name === 'nhap' ? 'Nhập kho' : 'Xuất kho'
                      return [`${value.toLocaleString('vi-VN')} ${unit}`, label]
                    }}
                  />
                  <Legend
                    formatter={(v) => (v === 'nhap' ? 'Nhập kho' : 'Xuất kho')}
                    wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
                  />
                  <Bar dataKey="nhap" name="nhap" fill="#2626d9" radius={[0, 4, 4, 0]}>
                    {(data?.weeklyFlow ?? []).map((_, i) => (
                      <Cell key={i} fill="#2626d9" />
                    ))}
                  </Bar>
                  <Bar dataKey="xuat" name="xuat" fill="#5ba4f5" radius={[0, 4, 4, 0]}>
                    {(data?.weeklyFlow ?? []).map((_, i) => (
                      <Cell key={i} fill="#5ba4f5" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* System Alerts + FEFO */}
          <div style={{
            width: 352, flexShrink: 0,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
            padding: 24,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#171a1f', letterSpacing: '-0.5px', lineHeight: '28px' }}>
                Cảnh báo Quan trọng
              </p>
              {(data?.expiryAlerts ?? []).some((a) => a.daysLeft <= 7) && (
                <span style={{
                  background: '#e05252', color: '#fff',
                  borderRadius: 11, fontSize: 12, fontWeight: 600,
                  padding: '1px 10px', lineHeight: '20px', whiteSpace: 'nowrap',
                }}>GẤP</span>
              )}
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#565d6d', lineHeight: '20px' }}>
              Các mục cần xử lý ngay lập tức theo FEFO
            </p>

            {/* Scrollable alert list */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 4, paddingRight: 2, minHeight: 0 }}>

            {/* Expiry section */}
            {(data?.expiryAlerts ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <i className="pi pi-calendar" style={{ fontSize: 12, color: '#565d6d' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#565d6d', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Hạn sử dụng (≤ 60 ngày)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(data?.expiryAlerts ?? []).map((a: ExpiryAlert) => (
                    <div key={a.id} style={{
                      background: '#fff', border: '1px solid #dee1e6',
                      borderRadius: 10, display: 'flex', alignItems: 'center',
                      gap: 12, padding: '12px', minHeight: 62,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 16,
                        background: 'rgba(224,82,82,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className="pi pi-exclamation-triangle" style={{ fontSize: 14, color: '#e05252' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#171a1f', lineHeight: '20px' }}>
                          {a.productName}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#565d6d', lineHeight: '16px' }}>
                          {a.lotNo} • Exp: {a.expiryDateDisplay}
                        </p>
                      </div>
                      <span style={{
                        background: '#e05252', color: '#fff',
                        borderRadius: 11, fontSize: 10, fontWeight: 600,
                        padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '16px',
                      }}>
                        Còn {a.daysLeft} ngày
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low stock section */}
            {(data?.lowStockAlerts ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <i className="pi pi-box" style={{ fontSize: 12, color: '#565d6d' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#565d6d', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Tồn kho thấp (Dưới định mức)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(data?.lowStockAlerts ?? []).map((a: LowStockAlert) => (
                    <div key={a.id} style={{
                      background: '#fff', border: '1px solid #dee1e6',
                      borderRadius: 10, display: 'flex', alignItems: 'center',
                      gap: 12, padding: '12px 12px 12px 20px', minHeight: 62,
                    }}>
                      <i className="pi pi-exclamation-triangle" style={{ fontSize: 16, color: '#565d6d', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#171a1f', lineHeight: '20px' }}>
                          {a.productName}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#565d6d', lineHeight: '16px' }}>
                          Tồn: {a.currentQty.toLocaleString('vi-VN')} {a.unitName} • Định mức: {a.minStock.toLocaleString('vi-VN')} {a.unitName}
                        </p>
                      </div>
                      <span style={{
                        border: '1px solid #dee1e6', color: '#171a1f',
                        borderRadius: 11, fontSize: 10, fontWeight: 600,
                        padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '16px',
                      }}>
                        {a.deficitPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No alerts */}
            {(data?.expiryAlerts ?? []).length === 0 && (data?.lowStockAlerts ?? []).length === 0 && (
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#565d6d' }}>
                Không có cảnh báo nào cần xử lý hôm nay.
              </p>
            )}

            </div>{/* end scrollable */}

            {/* View all link */}
            <button
              onClick={() => navigate('/purchase')}
              style={{
                background: 'none', border: 'none', padding: '8px 0',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#5269e0',
                display: 'flex', alignItems: 'center', gap: 4,
                width: '100%', justifyContent: 'center', marginBottom: 16,
              }}
            >
              Xem tất cả yêu cầu mua hàng&nbsp;<i className="pi pi-arrow-right" style={{ fontSize: 12 }} />
            </button>

            {/* FEFO status bars */}
            <div style={{ paddingTop: 16, borderTop: '1px solid #e0e1e5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#191a1f' }}>Tình trạng kho (FEFO)</span>
                <span style={{ fontSize: 12, color: '#5a5c68' }}>Cập nhật: 5 phút trước</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fefoRows.map((row) => (
                  <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#191a1f' }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: row.valueColor }}>{row.pct}%</span>
                    </div>
                    <div style={{ background: '#f4f4f6', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: 6, width: `${row.pct}%`, background: row.barColor, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Recent Transactions ─────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191a1f', letterSpacing: '-0.5px', lineHeight: '28px' }}>
              Giao dịch gần đây
            </h2>
            <button
              onClick={() => navigate('/inbound')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, color: '#2626d9', padding: 0,
              }}
            >
              Xem tất cả lịch sử
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <DataTable
              value={txRows}
              dataKey="id"
              className="prime-catalog-table"
              stripedRows
              pt={{ table: { style: { minWidth: 600, tableLayout: 'auto' } } }}
            >
              <Column
                field="id" header="Mã Giao Dịch"
                style={{ width: 120 }}
                body={(r: TxRecord) => (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#2626d9', fontWeight: 500, fontSize: 'inherit' }}
                    onClick={() => { void openTxDetail(r) }}
                  >
                    {r.id}
                  </button>
                )}
              />
              <Column
                field="type" header="Loại"
                style={{ width: 110 }}
                body={(r: TxRecord) => <TypeBadge type={r.type} />}
              />
              <Column
                field="material" header="Vật Tư / Nguyên Liệu"
                body={(r: TxRecord) => <span style={{ fontWeight: 500, color: '#191a1f' }}>{r.material}</span>}
              />
              <Column
                field="quantity" header="Số Lượng"
                style={{ width: 110 }}
              />
              <Column
                field="time" header="Thời Gian"
                style={{ width: 130 }}
                body={(r: TxRecord) => <span style={{ color: '#5a5c68' }}>{r.time}</span>}
              />
              <Column
                field="status" header="Trạng Thái"
                style={{ width: 170 }}
                body={(r: TxRecord) => <StatusCell status={r.status} />}
              />
            </DataTable>
          </div>
          <section className="catalog-page-bottom" style={{ padding: '12px 16px' }}>
            <PagedTableFooter
              rootClassName="grid-footer"
              prefix="catalog"
              currentRangeStart={txRangeStart}
              currentRangeEnd={txRangeEnd}
              totalRows={txTotal}
              safePage={txSafePage}
              totalPages={txTotalPages}
              pageSize={txPageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={(p) => setTxPage(p)}
              onPageSizeChange={(s) => { setTxPageSize(s); setTxPage(1) }}
            />
          </section>
        </div>

      </div>
    </div>

      {/* ── Transaction Quick-View Dialog ─────────────────────────────────── */}
      <Dialog
        header={txDetailRef ? `Chi tiết phiếu Mua hàng: ${txDetailRef}` : 'Chi tiết giao dịch'}
        visible={txDetailVisible}
        style={{ width: 'min(960px, 96vw)' }}
        modal
        onHide={() => setTxDetailVisible(false)}
      >
        {txDetailLoading && <p style={{ padding: 8, color: '#5a5c68' }}>Đang tải chi tiết...</p>}
        {txDetailError && <p style={{ padding: 8, color: '#e05252' }}>{txDetailError}</p>}

        {/* Purchase request quick-view */}
        {!txDetailLoading && !txDetailError && purchaseDetail && (
          <div className="po-quick-view-content">
            <div className="po-quick-view-grid">
              <p><strong>Trạng thái:</strong> {PO_STATUS_LABELS[toPoStatus(purchaseDetail.status)]}</p>
              <p><strong>Nhà cung cấp:</strong> {purchaseDetail.supplier?.name ?? '---'}</p>
              <p><strong>Kho nhận:</strong> {purchaseDetail.receivingLocation?.name ?? '---'}</p>
              <p><strong>Người tạo:</strong> {purchaseDetail.requester?.fullName ?? '---'}</p>
              <p><strong>Ngày cần hàng:</strong> {fmtDateVi(purchaseDetail.expectedDate)}</p>
              <p><strong>Tổng tiền:</strong> {new Intl.NumberFormat('vi-VN').format(Number(purchaseDetail.totalAmount ?? 0))} đ</p>
            </div>
            <div className="po-quick-view-table-wrap">
              <DataTable value={purchaseDetail.items} stripedRows className="prime-catalog-table">
                <Column field="product.code" header="Mã NVL" style={{ width: '180px' }} />
                <Column field="product.name" header="Tên nguyên liệu" />
                <Column header="Số lượng" body={(item) => `${formatQuantity(Number(item.quantityDisplay))} ${item.unitDisplay ?? ''}`} />
                <Column header="Đơn giá" body={(item) => `${new Intl.NumberFormat('vi-VN').format(Number(item.unitPrice ?? 0))} đ`} />
              </DataTable>
            </div>
            {purchaseDetail.notes?.trim() ? (
              <div className="po-quick-view-note">
                <strong>Ghi chú:</strong>
                <p>{purchaseDetail.notes}</p>
              </div>
            ) : null}
          </div>
        )}

      </Dialog>

      {/* ── Outbound Detail Dialog (shared component) ────────────────────── */}
      <OutboundDetailDialog
        visible={outboundDialogId !== null}
        onHide={() => setOutboundDialogId(null)}
        orderId={outboundDialogId}
        readOnly
      />

      {/* ── Inbound Receipt Full Preview Dialog ─────────────────────────── */}
      <Dialog
        visible={inboundDialogVisible}
        onHide={() => setInboundDialogVisible(false)}
        header={inboundDialogRef ? `Chi tiết phiếu nhập ${inboundDialogRef}` : 'Chi tiết phiếu nhập'}
        style={{ width: '92vw', maxWidth: '1320px' }}
        modal
        draggable={false}
        resizable={false}
        className="inbound-step4-preview-dialog"
      >
        {inboundDetailLoading ? <p className="po-field-success">Đang tải chi tiết phiếu nhập...</p> : null}
        {inboundDetailError ? <p className="po-field-error">{inboundDetailError}</p> : null}

        {inboundDetail ? (
          <section className="inbound-create-card inbound-step4-review-card inbound-readonly-card">
            <div className="inbound-step4-layout">
              <aside className="inbound-step4-history-panel">
                <div className="inbound-step4-section-header">
                  <i className="pi pi-history" />
                  <span>LỊCH SỬ THAO TÁC</span>
                </div>
                <HistoryTimeline
                  events={inboundHistory}
                  loading={inboundHistoryLoading}
                  error={inboundHistoryError}
                  emptyMessage="Chưa có lịch sử thao tác cho phiếu nhập kho này."
                />
              </aside>

              <div className="inbound-step4-main">
                {inboundDetail.adjustedByReceipt ? <div className="inbound-step4-adjustment-watermark">Hủy do điều chỉnh</div> : null}
                <div className="inbound-step4-body">
                  <div className="inbound-step4-banner">
                    <div className="inbound-step4-banner-left">
                      <div className="inbound-step4-title-row">
                        <h3 className="inbound-step4-banner-title">Xác nhận Nhập kho</h3>
                        <span className={`inbound-step4-status-tag ${inboundDetail.status}`}>{toInboundStatusLabel(inboundDetail.status)}</span>
                      </div>
                      <p className="inbound-step4-banner-docid">
                        <InputText value={inboundDetail.receiptRef} readOnly className="inbound-step4-ref-input" />
                      </p>
                    </div>
                    <div className="inbound-step4-banner-right">
                      <span className="inbound-step4-lot-label">LOT NUMBER</span>
                      <span className="inbound-step4-lot-pill">{inboundDetail.items[0]?.lotNo ?? '—'}</span>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-info-circle" />
                      <span>THÔNG TIN NGUYÊN LIỆU &amp; ĐỐI TÁC</span>
                    </div>
                    <div className="inbound-step4-info-grid">
                      <div><p className="inbound-step4-info-label">Nhà cung cấp</p><p className="inbound-step4-info-value">{inboundDetail.supplier?.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Kho lưu trữ</p><p className="inbound-step4-info-value">{inboundDetail.receivingLocation?.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Tên nguyên liệu</p><p className="inbound-step4-info-value">{inboundDetail.items[0]?.product.name ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Mã nguyên liệu</p><p className="inbound-step4-info-value">{inboundDetail.items[0]?.product.code ?? '—'}</p></div>
                      <div><p className="inbound-step4-info-label">Ngày nhận hàng</p><p className="inbound-step4-info-value">{formatDateOnly(inboundDetail.expectedDate)}</p></div>
                      <div><p className="inbound-step4-info-label">Trạng thái kiểm tra</p><span className="inbound-step4-qc-badge">{getQcStatusLabel(inboundDetail.items[0]?.qcStatus ?? 'pending')}</span></div>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-verified" />
                      <span>KIỂM TRA QC THEO TỪNG DÒNG</span>
                    </div>
                    {inboundDetail.items.length === 0 ? (
                      <p className="inbound-step4-no-files">Chưa có dòng nhập kho để QC.</p>
                    ) : (
                      <div className="inbound-step4-files-grid inbound-step4-qc-grid">
                        {inboundDetail.items.map((item) => (
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
                                      inputId={`dash-qc-${item.id}-${option.value}`}
                                      name={`dash-qc-${item.id}`}
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
                        <p className="inbound-step4-stat-value">{formatQuantity(inboundDetail.items.reduce((s, i) => s + Number(i.quantityDisplay), 0))}</p>
                        <p className="inbound-step4-stat-sub">Tổng theo đơn vị nhập của từng dòng</p>
                      </div>
                      <div className="inbound-step4-stat-card">
                        <p className="inbound-step4-stat-label">Đơn giá trung bình (VND/kg)</p>
                        <p className="inbound-step4-stat-value">
                          {inboundDetail.items.length > 0
                            ? formatCurrencyVnd(Math.round(inboundDetail.items.reduce((s, i) => s + Number(i.unitPricePerKg), 0) / inboundDetail.items.length)) + ' VND'
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
                        {formatCurrencyVnd(Math.round(inboundDetail.items.reduce((s, i) => s + Number(i.lineAmount), 0)))} <span>VND</span>
                      </p>
                    </div>
                  </div>

                  <div className="inbound-step4-section">
                    <div className="inbound-step4-section-header">
                      <i className="pi pi-file-edit" />
                      <span>HỒ SƠ TÀI LIỆU ĐÍNH KÈM (STEP 3)</span>
                    </div>
                    {inboundDetail.items.flatMap((i) => i.documents).length === 0 ? (
                      <p className="inbound-step4-no-files">Không có tài liệu đính kèm.</p>
                    ) : (
                      <div className="inbound-step4-files-grid">
                        {inboundDetail.items.flatMap((i) => i.documents).map((doc) => (
                          <div key={doc.id} className="inbound-step4-file-card">
                            <div className="inbound-step4-file-icon-wrap"><i className="pi pi-file-edit" /></div>
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
                    <p><strong>LƯU Ý QUAN TRỌNG:</strong>{' '}Đây là màn hình tra cứu read-only. Dữ liệu không thể chỉnh sửa từ đây.</p>
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

// ── Shared button styles ──────────────────────────────────────────────────────

const btnPrimary: CSSProperties = {
  height: 44, display: 'inline-flex', alignItems: 'center', gap: 8,
  background: '#2626d9', color: '#fff',
  border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  padding: '0 24px', whiteSpace: 'nowrap',
}

const btnOutline: CSSProperties = {
  height: 44, display: 'inline-flex', alignItems: 'center', gap: 8,
  background: '#fff', color: '#191a1f',
  border: '1px solid #e0e1e5', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  padding: '0 24px', whiteSpace: 'nowrap',
}
