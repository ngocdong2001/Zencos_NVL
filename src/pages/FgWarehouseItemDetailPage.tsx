import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Calendar } from 'primereact/calendar'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fetchFgInventoryItemDetail } from '../lib/fgWarehouseApi'
import type { FgInventoryItemDetail, FgLotDetail, FgItemTransaction } from '../lib/fgWarehouseApi'
import './FgWarehouseItemDetailPage.css'

// ── Formatters ────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatQty(qty: number, unit: string): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(qty)} ${unit}`
}

// ── Lot status badge ──────────────────────────────────────────────────

function LotStatusBadge({ lot }: { lot: FgLotDetail }) {
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

// ── Transaction type label ────────────────────────────────────────────

function TxTypeBadge({ type }: { type: string }) {
  if (type === 'import_from_production') {
    return <span className="idb-tx-badge idb-tx-import">Nhập từ SX</span>
  }
  if (type === 'export_to_sale') {
    return <span className="idb-tx-badge idb-tx-export">Xuất bán</span>
  }
  return <span className="idb-tx-badge idb-tx-adjustment">Điều chỉnh</span>
}

// ── Chart data builders ───────────────────────────────────────────────

function buildTrendData(monthlyStats: FgInventoryItemDetail['monthlyStats'], currentStock: number) {
  const now = new Date()
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const statsMap = new Map(monthlyStats.map((s) => [s.month, s]))
  let balance = currentStock
  const result: { label: string; stock: number }[] = []
  const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i]
    const monthNum = parseInt(m.slice(5)) - 1
    result.unshift({ label: abbr[monthNum], stock: Math.max(0, balance) })
    const s = statsMap.get(m)
    if (s) balance = balance + s.exportQty - s.importQty
  }
  return result
}

function buildConsumptionData(monthlyStats: FgInventoryItemDetail['monthlyStats']) {
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
    return { label: abbr[monthNum], export: statsMap.get(m)?.exportQty ?? 0 }
  })
}

// ── Main page ─────────────────────────────────────────────────────────

export function FgWarehouseItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<FgInventoryItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [txDateRange, setTxDateRange] = useState<[Date | null, Date | null] | null>(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from && !to) return null
    return [from ? new Date(from) : null, to ? new Date(to) : null]
  })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchFgInventoryItemDetail(id)
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
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2.5rem', color: '#0f766e' }} />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="idb-state-center">
        <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc2626' }} />
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>{error ?? 'Không tìm thấy thành phẩm'}</p>
        <button className="idb-text-btn" onClick={() => navigate(-1)}>← Quay lại danh sách</button>
      </div>
    )
  }

  const unit = detail.unit

  // ── Transaction ordering ─────────────────────────────────────────────
  const orderedTransactions = [...detail.transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
  )

  function txInQty(tx: FgItemTransaction) {
    if (tx.type === 'import_from_production') return tx.quantityBase
    if (tx.type === 'adjustment' && tx.quantityBase >= 0) return tx.quantityBase
    return 0
  }
  function txOutQty(tx: FgItemTransaction) {
    if (tx.type === 'export_to_sale') return tx.quantityBase
    if (tx.type === 'adjustment' && tx.quantityBase < 0) return Math.abs(tx.quantityBase)
    return 0
  }

  const totalInQty = orderedTransactions.reduce((sum, tx) => sum + txInQty(tx), 0)
  const totalOutQty = orderedTransactions.reduce((sum, tx) => sum + txOutQty(tx), 0)
  const openingBalance = detail.stockQuantity - totalInQty + totalOutQty

  // ── Date-range filtering ─────────────────────────────────────────────
  const txFilterFrom = txDateRange?.[0]
    ? (() => { const d = new Date(txDateRange[0]!); d.setHours(0, 0, 0, 0); return d })()
    : null
  const txFilterTo = txDateRange?.[1]
    ? (() => { const d = new Date(txDateRange[1]!); d.setHours(23, 59, 59, 999); return d })()
    : null

  const txBeforeRange = txFilterFrom
    ? orderedTransactions.filter((tx) => new Date(tx.transactionDate) < txFilterFrom)
    : []

  const txInRange = orderedTransactions.filter((tx) => {
    const d = new Date(tx.transactionDate)
    if (txFilterFrom && d < txFilterFrom) return false
    if (txFilterTo && d > txFilterTo) return false
    return true
  })

  const openingBalanceForDisplay = openingBalance + txBeforeRange.reduce(
    (sum, tx) => sum + txInQty(tx) - txOutQty(tx),
    0,
  )

  const displayTxList = txFilterFrom || txFilterTo ? txInRange : orderedTransactions
  const displayOpeningBalance = txFilterFrom || txFilterTo ? openingBalanceForDisplay : openingBalance
  const displayTotalIn = displayTxList.reduce((sum, tx) => sum + txInQty(tx), 0)
  const displayTotalOut = displayTxList.reduce((sum, tx) => sum + txOutQty(tx), 0)
  const displayFinalBalance = displayOpeningBalance + displayTotalIn - displayTotalOut

  type LedgerRow = {
    kind: 'opening' | 'tx' | 'total'
    tx?: FgItemTransaction
    inQty: number
    outQty: number
    balance: number
  }

  const ledgerRows: LedgerRow[] = (() => {
    const rows: LedgerRow[] = [
      { kind: 'opening', inQty: 0, outQty: 0, balance: displayOpeningBalance },
    ]
    let runningBalance = displayOpeningBalance
    for (const tx of displayTxList) {
      const inQty = txInQty(tx)
      const outQty = txOutQty(tx)
      runningBalance += inQty - outQty
      rows.push({ kind: 'tx', tx, inQty, outQty, balance: runningBalance })
    }
    rows.push({ kind: 'total', inQty: displayTotalIn, outQty: displayTotalOut, balance: displayFinalBalance })
    return rows
  })()

  return (
    <div className="idb-page fg-idb-page">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="idb-page-hdr">
        <div className="idb-page-hdr-left">
          <button className="idb-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <i className="pi pi-arrow-left" />
          </button>
          <div>
            <div className="idb-page-title">
              Chi tiết Thành phẩm: <strong>{detail.name}</strong>
            </div>
            <div className="idb-page-subtitle">
              Loại: {detail.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'} · Đơn vị: {unit}
            </div>
          </div>
        </div>
        <div className="idb-code-badge fg-code-badge">MÃ THÀNH PHẨM: {detail.code}</div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="idb-charts-grid">
        <div className="idb-chart-card">
          <div className="idb-chart-title">Xu hướng tồn kho (6 tháng)</div>
          <div className="idb-chart-sub">Biến động tồn kho thành phẩm theo tháng</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(v))}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v) => [formatQty(Number(v ?? 0), unit), 'Tồn kho']}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone" dataKey="stock" stroke="#0f766e" strokeWidth={2}
                dot={{ r: 4, fill: '#0f766e', strokeWidth: 0 }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="idb-chart-legend">
            <span className="idb-legend-dot" style={{ background: '#0f766e' }} />
            Tồn kho
          </div>
        </div>

        <div className="idb-chart-card">
          <div className="idb-chart-title">Mức độ xuất kho</div>
          <div className="idb-chart-sub">Sản lượng xuất bán theo tháng</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={consumptionData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(v))}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v) => [formatQty(Number(v ?? 0), unit), 'Xuất kho']}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="export" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="idb-chart-legend">
            <span className="idb-legend-dot" style={{ background: '#0d9488' }} />
            Xuất kho
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="idb-body-grid">
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
              emptyMessage="Không có lô hàng nào đang tồn kho"
              size="small"
              tableStyle={{ width: '100%', tableLayout: 'fixed' }}
            >
              <Column
                style={{ width: '36px', padding: '0 0 0 8px' }}
                body={() => <i className="pi pi-chevron-right" style={{ color: '#9ca3af', fontSize: 12 }} />}
              />
              <Column
                header="Mã Lô"
                style={{ width: '25%' }}
                body={(row: FgLotDetail) => (
                  <span className="idb-lot-link" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.lotNo}</span>
                )}
              />
              <Column
                header="Lệnh SX"
                style={{ width: '18%' }}
                body={(row: FgLotDetail) => row.orderRef
                  ? <span style={{ color: '#0f766e', fontWeight: 500 }}>{row.orderRef}</span>
                  : <span style={{ color: '#9ca3af' }}>—</span>
                }
              />
              <Column
                header="Ngày hết hạn"
                style={{ width: '16%' }}
                body={(row: FgLotDetail) => {
                  const isNear = row.status === 'near_expiration'
                  return (
                    <span style={{ color: isNear ? '#dc2626' : undefined, fontWeight: isNear ? 500 : undefined }}>
                      {formatDate(row.expiryDate)}
                    </span>
                  )
                }}
              />
              <Column
                header="Ngày nhập kho"
                style={{ width: '16%' }}
                body={(row: FgLotDetail) => formatDate(row.receivedAt)}
              />
              <Column
                header="Số lượng"
                style={{ width: '16%' }}
                body={(row: FgLotDetail) => formatQty(row.quantityBase, unit)}
              />
              <Column
                header="Trạng thái"
                style={{ width: '13%' }}
                body={(row: FgLotDetail) => <LotStatusBadge lot={row} />}
              />
            </DataTable>
          </div>

          {/* Transaction ledger */}
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <i className="pi pi-history idb-section-icon" />
                <span className="idb-section-title">Lịch sử Giao dịch</span>
              </div>
              <div className="idb-tx-filter-bar">
                <div className="idb-tx-date-picker">
                  <i className="pi pi-calendar idb-tx-date-icon"></i>
                  <Calendar
                    value={txDateRange ?? null}
                    onChange={(e) => setTxDateRange(e.value as [Date | null, Date | null] | null)}
                    selectionMode="range"
                    readOnlyInput
                    placeholder="Từ ngày - Đến ngày"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    className="idb-tx-calendar"
                    panelClassName="date-range-panel"
                  />
                  {txDateRange?.[0] && (
                    <button
                      className="idb-tx-date-clear"
                      onClick={() => setTxDateRange(null)}
                      title="Xóa bộ lọc ngày"
                    >
                      <i className="pi pi-times"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <DataTable
              value={ledgerRows}
              className="prime-catalog-table idb-datatable idb-datatable--tx"
              emptyMessage="Chưa có giao dịch nào"
              size="small"
              tableStyle={{ width: '100%', tableLayout: 'fixed' }}
            >
              <Column
                header="Thời gian"
                style={{ width: '15%' }}
                body={(row: LedgerRow) => (
                  row.kind === 'tx' && row.tx
                    ? <span style={{ color: '#374151', fontSize: 12 }}>{formatDateTime(row.tx.transactionDate)}</span>
                    : <span style={{ color: '#9ca3af' }}>—</span>
                )}
              />
              <Column
                header="Loại"
                style={{ width: '13%' }}
                body={(row: LedgerRow) => {
                  if (row.kind !== 'tx' || !row.tx) return <span style={{ color: '#9ca3af' }}>—</span>
                  return <TxTypeBadge type={row.tx.type} />
                }}
              />
              <Column
                header="Mã lô / Ghi chú"
                style={{ width: '24%' }}
                body={(row: LedgerRow) => {
                  if (row.kind === 'opening') {
                    return <span style={{ color: '#111827', fontWeight: 700 }}>* TỒN KHO ĐẦU KỲ *</span>
                  }
                  if (row.kind === 'total') {
                    return <span style={{ color: '#111827', fontWeight: 700 }}>TỔNG CỘNG</span>
                  }
                  return (
                    <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {row.tx?.orderRef || row.tx?.lotNo || row.tx?.notes}
                    </span>
                  )
                }}
              />
              <Column
                header="Nhập"
                style={{ width: '12%' }}
                body={(row: LedgerRow) => (
                  row.inQty <= 0
                    ? <span style={{ color: '#9ca3af' }}>—</span>
                    : <span className="idb-qty-pos">{formatQty(row.inQty, unit)}</span>
                )}
              />
              <Column
                header="Xuất"
                style={{ width: '12%' }}
                body={(row: LedgerRow) => (
                  row.outQty <= 0
                    ? <span style={{ color: '#9ca3af' }}>—</span>
                    : <span className="idb-qty-neg">{formatQty(row.outQty, unit)}</span>
                )}
              />
              <Column
                header="Tồn"
                style={{ width: '12%' }}
                body={(row: LedgerRow) => (
                  <span style={{ color: '#111827', fontWeight: row.kind === 'opening' || row.kind === 'total' ? 700 : 600 }}>
                    {formatQty(row.balance, unit)}
                  </span>
                )}
              />
              <Column
                header="Người thực hiện"
                style={{ width: '12%' }}
                body={(row: LedgerRow) => {
                  if (row.kind !== 'tx' || !row.tx) return <span style={{ color: '#9ca3af' }}>—</span>
                  return (
                    <div className="idb-person">
                      <div className="idb-avatar">{row.tx.userName.charAt(0).toUpperCase()}</div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.tx.userName}</span>
                    </div>
                  )
                }}
              />
            </DataTable>
          </div>

        </div>

        {/* ── Sidebar ── */}
        <div className="idb-body-side">
          <div className="idb-section">
            <div className="idb-section-hdr">
              <div className="idb-section-hdr-left">
                <span className="idb-section-title">Thông tin tồn kho</span>
              </div>
            </div>
            <div className="fg-info-grid">
              <div className="fg-info-row">
                <span className="fg-info-label">Mã thành phẩm</span>
                <span className="fg-info-value">{detail.code}</span>
              </div>
              <div className="fg-info-row">
                <span className="fg-info-label">Tên thành phẩm</span>
                <span className="fg-info-value">{detail.name}</span>
              </div>
              <div className="fg-info-row">
                <span className="fg-info-label">Loại</span>
                <span className="fg-info-value">{detail.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'}</span>
              </div>
              <div className="fg-info-row">
                <span className="fg-info-label">Đơn vị</span>
                <span className="fg-info-value">{unit}</span>
              </div>
              <div className="fg-info-row fg-info-row--highlight">
                <span className="fg-info-label">Tổng tồn kho</span>
                <span className="fg-info-value fg-info-value--big">{formatQty(detail.stockQuantity, unit)}</span>
              </div>
              <div className="fg-info-row">
                <span className="fg-info-label">Số lô đang tồn</span>
                <span className="fg-info-value">{detail.lots.length} lô</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
