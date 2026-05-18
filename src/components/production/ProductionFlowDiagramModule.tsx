import { useEffect, useState } from 'react'
import {
  fetchProductionOrderDetail,
  fetchProductionOrderLines,
  type ProductionOrderDetail,
  type ProductionOrderLine,
} from '../../lib/productionApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType = 'nvl' | 'btp' | 'tp'

export type FlowNode = {
  id: string
  type: NodeType
  code: string
  name: string
  plannedQty: number
  actualQty: number
  unit: string
  lotNo: string | null
  qualityStatus: 'pass' | 'fail' | 'pending' | null
  stepDone: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtQty(val: number, unit: string): string {
  const n = val.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
  return unit ? `${n} ${unit}` : n
}

export function formatDDMM(iso: string | null): string {
  if (!iso) return '--/--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--/--'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getProgress(o: ProductionOrderDetail): number {
  if (o.status === 'completed') return 100
  let done = 0
  if (o.nvlExportedAt ?? o.step1ProcessedAt) done++
  if (o.step2ProcessedAt) done++
  if (o.step3ProcessedAt) done++
  if (o.step4ProcessedAt) done++
  return Math.round((done / 4) * 100)
}

export function getStepCounts(o: ProductionOrderDetail) {
  if (o.status === 'completed') return { done: 4, pending: 0, error: 0 }
  let done = 0
  if (o.nvlExportedAt ?? o.step1ProcessedAt) done++
  if (o.step2ProcessedAt) done++
  if (o.step3ProcessedAt) done++
  if (o.step4ProcessedAt) done++
  return { done, pending: 4 - done, error: o.status === 'cancelled' ? 1 : 0 }
}

export function getStepStatus(o: ProductionOrderDetail, step: number): { label: string; color: string } {
  if (o.status === 'completed') return { label: 'Hoàn tất', color: '#10b981' }
  if (o.status === 'cancelled') return { label: 'Đã hủy', color: '#ef4444' }
  const doneAt: Record<number, string | null> = {
    1: o.nvlExportedAt ?? o.step1ProcessedAt ?? null,
    2: o.step2ProcessedAt ?? null,
    3: o.step3ProcessedAt ?? null,
    4: o.step4ProcessedAt ?? null,
  }
  if (doneAt[step]) return { label: 'Hoàn tất', color: '#10b981' }
  if (o.currentStep === step) return { label: step === 4 ? 'Đang QC' : 'Đang SX', color: '#f59e0b' }
  if (o.currentStep > step) return { label: 'Hoàn tất', color: '#10b981' }
  return { label: 'Chờ', color: '#94a3b8' }
}

export function packagingLabel(nodes: FlowNode[]): string {
  if (nodes.length === 0) return 'Đóng gói'
  const total = nodes.reduce((s, n) => s + n.plannedQty, 0)
  if (total === 0) return 'Đóng gói'
  const unit = nodes[0].unit
  if (total >= 1000) {
    const k = total / 1000
    return `Đóng gói (${k % 1 === 0 ? k : k.toFixed(1)}k ${unit})`
  }
  return `Đóng gói (${total} ${unit})`
}

// ─── Timeline slider ──────────────────────────────────────────────────────

export function TimelineBar({ order }: { order: ProductionOrderDetail }) {
  const s1Date = order.nvlExportedAt ?? order.step1ProcessedAt
  const s2Date = order.step2ProcessedAt
  const s3Date = order.step3ProcessedAt
  const s4Date = order.step4ProcessedAt ?? (order.status === 'completed' ? order.updatedAt : null)

  const done1 = !!s1Date
  const done2 = !!s2Date
  const done3 = !!s3Date
  const done4 = !!order.step4ProcessedAt || order.status === 'completed'

  const fillPct = [done1, done2, done3, done4].filter(Boolean).length * 25

  const milestones = [
    { label: 'Bắt đầu SX',  date: order.issuedAt, done: true,  current: false },
    { label: 'Xuất NVL',    date: s1Date,          done: done1, current: !done1 && order.currentStep === 1 },
    { label: 'Nhập BTP',    date: s2Date,          done: done2, current: !done2 && order.currentStep === 2 },
    { label: 'Xuất BTP',    date: s3Date,          done: done3, current: !done3 && order.currentStep === 3 },
    { label: 'Khóa phiếu',  date: s4Date,          done: done4, current: !done4 && order.currentStep === 4 },
  ]

  return (
    <div style={{ flex: 1, position: 'relative', height: 54 }}>
      {/* Track */}
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0,
        height: 4, background: '#e2e8f0', borderRadius: 2,
      }}>
        <div style={{
          height: '100%', width: `${fillPct}%`,
          background: 'linear-gradient(90deg, #304fe8, #5269e0)',
          borderRadius: 2, transition: 'width 0.4s',
        }} />
      </div>

      {milestones.map((m, i) => {
        const pct = i * 25
        const dotColor  = m.done ? '#304fe8' : m.current ? '#f59e0b' : '#d1d5db'
        const textColor = m.done ? '#304fe8' : m.current ? '#d97706' : '#94a3b8'
        const tx = i === 0 ? '0%' : i === 4 ? '-100%' : '-50%'
        return (
          <div key={i}>
            {/* Date above track */}
            <div style={{
              position: 'absolute', top: 2, left: `${pct}%`,
              transform: `translateX(${tx})`,
              fontSize: 9, fontWeight: m.done ? 700 : 400, color: textColor,
              whiteSpace: 'nowrap', lineHeight: 1,
            }}>
              {m.date ? formatDDMM(m.date) : '- -'}
            </div>
            {/* Dot */}
            <div style={{
              position: 'absolute', top: 16, left: `${pct}%`,
              transform: 'translateX(-50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: dotColor, border: '2px solid #fff',
              boxShadow: `0 0 0 1.5px ${dotColor}`,
              zIndex: 1,
            }} />
            {/* Step name */}
            <div style={{
              position: 'absolute', top: 32, left: `${pct}%`,
              transform: `translateX(${tx})`,
              fontSize: 8, fontWeight: m.done ? 600 : 400, color: textColor,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              whiteSpace: 'nowrap', lineHeight: 1,
            }}>
              {m.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── NVL card (compact) ───────────────────────────────────────────────────────

export function NvlCard({ node, selected, onClick }: { node: FlowNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? '#eff6ff' : '#fff',
        border: selected ? '1.5px solid #5269e0' : '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '11px',
        width: 180,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.09)',
        transition: 'border-color 0.15s, background 0.15s',
        flexShrink: 0,
        display: 'block',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
        {node.code}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', marginBottom: 8, lineHeight: 1.4 }}>
        {node.name}
      </div>
      {node.lotNo && (
        <div style={{ fontSize: 9, color: '#7c3aed', background: '#f5f3ff', borderRadius: 6, padding: '2px 6px', marginBottom: 6, display: 'inline-block' }}>
          Lô: {node.lotNo}
        </div>
      )}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 5 }}>
        <span style={{ fontSize: 9, color: '#64748b' }}>
          Kế hoạch: {node.plannedQty > 0 ? fmtQty(node.plannedQty, node.unit) : '---'}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: node.actualQty > 0 ? '#10b981' : '#f59e0b', marginLeft: 8 }}>
          Thực tế: {node.actualQty > 0 ? fmtQty(node.actualQty, node.unit) : '---'}
        </span>
      </div>
    </button>
  )
}

// ─── BTP / TP card ────────────────────────────────────────────────────────────

export function ProductCard({
  node, selected, onClick,
  borderColor, badgeBg, badgeColor,
  statusLabel, statusColor,
}: {
  node: FlowNode; selected: boolean; onClick: () => void
  borderColor: string; badgeBg: string; badgeColor: string
  statusLabel: string; statusColor: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: '#fff',
        border: `2px solid ${selected ? '#5269e0' : borderColor}`,
        borderRadius: 14,
        padding: '16px',
        width: 141,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.10)',
        transition: 'border-color 0.15s',
        flexShrink: 0,
        display: 'block',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '1px 8px', borderRadius: 10 }}>
          {node.type === 'btp' ? 'BTP' : 'TP'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {node.code}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
        {node.name}
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>Kế hoạch:</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#334155' }}>
            {node.plannedQty > 0 ? fmtQty(node.plannedQty, node.unit) : '---'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: node.lotNo ? 6 : 0 }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>Thực tế:</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: node.actualQty > 0 ? '#304fe8' : '#f59e0b' }}>
            {node.actualQty > 0 ? fmtQty(node.actualQty, node.unit) : '---'}
          </span>
        </div>
        {node.lotNo && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>Số lô:</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#7c3aed' }}>{node.lotNo}</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Flow arrow connector ─────────────────────────────────────────────────────

export function FlowArrow({ label, arrowColor, pillBorderColor, pillTextColor }: {
  label: string; arrowColor: string; pillBorderColor: string; pillTextColor: string
}) {
  return (
    <div style={{
      width: 120, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <svg width="110" height="14" viewBox="0 0 110 14" aria-hidden>
        <line x1="0" y1="7" x2="98" y2="7" stroke={arrowColor} strokeWidth="1.5" strokeDasharray="5 3" />
        <polygon points="98,2 110,7 98,12" fill={arrowColor} />
      </svg>
      <div style={{
        background: '#fff', border: `1px solid ${pillBorderColor}`,
        borderRadius: 17, padding: '6px 11px',
        fontSize: 10, fontWeight: 700, color: pillTextColor,
        boxShadow: '0 2px 4px rgba(0,0,0,0.09)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Empty slot placeholder ───────────────────────────────────────────────────

export function EmptySlot({ label, height = 95 }: { label: string; height?: number }) {
  return (
    <div style={{
      height, border: '1.5px dashed #e2e8f0', borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: '#94a3b8', fontStyle: 'italic',
    }}>
      {label}
    </div>
  )
}

// ─── Right node detail panel ──────────────────────────────────────────────────

function PanelRow({ label, value, vc = '#1e293b' }: { label: string; value: string; vc?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: vc }}>{value}</div>
    </div>
  )
}

export function NodeDetailPanel({ node, order }: { node: FlowNode | null; order: ProductionOrderDetail | null }) {
  if (!node) {
    return (
      <aside style={{
        width: 320, minWidth: 280, flexShrink: 0,
        borderLeft: '1px solid #e2e8f0',
        background: 'rgba(255,255,255,0.5)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{
          background: '#f4f4f6', borderRadius: 32,
          width: 64, height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="pi pi-wave-pulse" style={{ fontSize: 28, color: '#9ca3af', opacity: 0.5 }} />
        </div>
        <div style={{ textAlign: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#17191c', marginBottom: 8 }}>Chưa chọn node</div>
          <div style={{ fontSize: 12, color: '#5a5f68', lineHeight: 1.6, maxWidth: 184, margin: '0 auto' }}>
            Chọn một thẻ vật tư trên biểu đồ để xem chi tiết luồng vận động.
          </div>
        </div>
      </aside>
    )
  }

  const typeLabel = node.type === 'nvl' ? 'Nguyên vật liệu' : node.type === 'btp' ? 'Bán thành phẩm' : 'Thành phẩm'
  const variance = node.actualQty - node.plannedQty
  const varPct = node.plannedQty > 0 ? (variance / node.plannedQty) * 100 : 0
  const badgeCfg = {
    nvl: { bg: '#e0e7ff', color: '#3730a3', label: 'NVL' },
    btp: { bg: '#faf5ff', color: '#9333ea', label: 'BTP' },
    tp:  { bg: '#ecfdf5', color: '#059669', label: 'TP'  },
  }[node.type]

  return (
    <aside style={{
      width: 320, minWidth: 280, flexShrink: 0,
      borderLeft: '1px solid #e2e8f0',
      background: 'rgba(255,255,255,0.5)',
      overflowY: 'auto', padding: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: badgeCfg.color, background: badgeCfg.bg, padding: '2px 9px', borderRadius: 10 }}>
          {badgeCfg.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{node.code}</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 4 }}>{node.name}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{typeLabel}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
        <PanelRow label="Kế hoạch" value={node.plannedQty > 0 ? fmtQty(node.plannedQty, node.unit) : '---'} />
        <PanelRow
          label="Thực tế"
          value={node.actualQty > 0 ? fmtQty(node.actualQty, node.unit) : '---'}
          vc={node.actualQty > 0 ? '#304fe8' : '#f59e0b'}
        />
        {node.actualQty > 0 && node.plannedQty > 0 && (
          <PanelRow
            label="Chênh lệch"
            value={`${variance >= 0 ? '+' : ''}${fmtQty(variance, node.unit)} (${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%)`}
            vc={variance >= 0 ? '#10b981' : '#dc2626'}
          />
        )}
        {node.lotNo && <PanelRow label="Số lô" value={node.lotNo} />}
        {node.qualityStatus && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Chất lượng</div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10,
              background: node.qualityStatus === 'pass' ? '#dcfce7' : node.qualityStatus === 'fail' ? '#fee2e2' : '#fef9c3',
              color: node.qualityStatus === 'pass' ? '#15803d' : node.qualityStatus === 'fail' ? '#b91c1c' : '#a16207',
            }}>
              {node.qualityStatus === 'pass' ? 'Đạt' : node.qualityStatus === 'fail' ? 'Không đạt' : 'Chờ kiểm tra'}
            </span>
          </div>
        )}
        <PanelRow label="Trạng thái" value={node.stepDone ? 'Hoàn tất' : 'Chờ xử lý'} vc={node.stepDone ? '#10b981' : '#f59e0b'} />
      </div>

      {order && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Phiếu sản xuất</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#304fe8' }}>{order.orderRef ?? `PSX-${order.id}`}</div>
        </div>
      )}
    </aside>
  )
}

// ─── Main Diagram Component (reusable) ───────────────────────────────────────

interface ProductionFlowDiagramProps {
  orderId: string
  hideHeader?: boolean
  hideBottomBar?: boolean
}

export function ProductionFlowDiagram({ orderId, hideHeader = false, hideBottomBar = false }: ProductionFlowDiagramProps) {
  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [lines, setLines] = useState<ProductionOrderLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    Promise.all([fetchProductionOrderDetail(orderId), fetchProductionOrderLines(orderId)])
      .then(([o, l]) => { setOrder(o); setLines(l) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [orderId])

  const nvlNodes: FlowNode[] = lines
    .filter((l) => l.step === 1 && l.direction === 'out')
    .map((l) => ({
      id: l.id, type: 'nvl' as const,
      code: l.productCode, name: l.productName,
      plannedQty: Number(l.plannedQty), actualQty: Number(l.actualQty),
      unit: l.unit, lotNo: l.lotNo, qualityStatus: l.qualityStatus,
      stepDone: !!order && !!(order.nvlExportedAt ?? order.step1ProcessedAt),
    }))

  const btpOutLines = lines.filter((l) => l.step === 2 && l.direction === 'out')
  const btpRaw: FlowNode[] = btpOutLines.length > 0
    ? btpOutLines.map((l) => ({
        id: l.id, type: 'btp' as const,
        code: l.outputProduct?.code ?? l.productCode,
        name: l.outputProduct?.name ?? l.productName,
        plannedQty: Number(l.plannedQty), actualQty: Number(l.actualQty),
        unit: l.outputProduct?.unit ?? l.unit,
        lotNo: l.lotNo, qualityStatus: l.qualityStatus,
        stepDone: !!order?.step2ProcessedAt,
      }))
    : (() => {
        const seen = new Map<string, FlowNode>()
        for (const l of lines.filter((ll) => ll.step === 2 && ll.direction === 'in')) {
          const code = l.outputProduct?.code ?? l.productCode
          if (!seen.has(code)) {
            seen.set(code, {
              id: `btp-${code}`,
              type: 'btp',
              code,
              name: l.outputProduct?.name ?? l.productName,
              plannedQty: Number(l.plannedQty),
              actualQty: Number(l.actualQty),
              unit: l.outputProduct?.unit ?? l.unit,
              lotNo: l.lotNo,
              qualityStatus: l.qualityStatus,
              stepDone: !!order?.step2ProcessedAt,
            })
          }
        }
        return Array.from(seen.values())
      })()

  const tpRaw: FlowNode[] = lines
    .filter((l) => l.step === 4 && l.direction === 'in')
    .map((l) => ({
      id: l.id, type: 'tp' as const,
      code: l.outputProduct?.code ?? l.productCode,
      name: l.outputProduct?.name ?? l.productName,
      plannedQty: Number(l.plannedQty), actualQty: Number(l.actualQty),
      unit: l.outputProduct?.unit ?? l.unit,
      lotNo: l.lotNo, qualityStatus: l.qualityStatus,
      stepDone: !!order?.step4ProcessedAt,
    }))

  const btpNodes: FlowNode[] = btpRaw.length > 0 ? btpRaw
    : (order?.outputProduct?.outputType === 'semi_finished' && order.outputProduct
        ? [{ id: 'btp-fb', type: 'btp' as const, code: order.outputProduct.code,
             name: order.outputProduct.name, plannedQty: 0, actualQty: 0,
             unit: order.outputProduct.unit, lotNo: null, qualityStatus: null, stepDone: false }]
        : [])

  const tpNodes: FlowNode[] = tpRaw.length > 0 ? tpRaw
    : (order?.outputProduct?.outputType === 'finished' && order.outputProduct
        ? [{ id: 'tp-fb', type: 'tp' as const, code: order.outputProduct.code,
             name: order.outputProduct.name, plannedQty: 0, actualQty: 0,
             unit: order.outputProduct.unit, lotNo: null, qualityStatus: null, stepDone: false }]
        : [])

  const nvlCodeToBtp = new Map<string, string>()
  for (const l of lines.filter((ll) => ll.step === 2 && ll.direction === 'in')) {
    if (l.outputProduct?.code && l.productCode) {
      nvlCodeToBtp.set(l.productCode, l.outputProduct.code)
    }
  }

  const btpGroups = btpNodes.map((btp) => ({
    btp,
    nvls: nvlNodes.filter((nvl) => nvlCodeToBtp.get(nvl.code) === btp.code),
  }))

  const matchedNvlIds = new Set(btpGroups.flatMap((g) => g.nvls.map((n) => n.id)))
  const ungroupedNvls = nvlNodes.filter((n) => !matchedNvlIds.has(n.id))

  const handleClick = (node: FlowNode) => setSelectedNode((p) => (p?.id === node.id ? null : node))

  const counts = order ? getStepCounts(order) : { done: 0, pending: 4, error: 0 }
  const btpStatus = order ? getStepStatus(order, 2) : { label: 'Chờ', color: '#94a3b8' }
  const tpStatus = order ? getStepStatus(order, 4) : { label: 'Chờ', color: '#94a3b8' }
  const packLabel = packagingLabel(tpNodes)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: '#fff', overflow: 'hidden',
    }}>
      {!hideHeader && (
        <div style={{
          padding: '28px 32px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                Biểu đồ luồng vật tư
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#5a5f68' }}>
                Theo dõi hành trình từ Nguyên vật liệu đến Thành phẩm cuối cùng
                {order && <> &middot; <span style={{ fontWeight: 600, color: '#304fe8' }}>{order.orderRef ?? `PSX-${order.id}`}</span></>}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
            <button type="button" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #dedfe3', borderRadius: 10,
              padding: '7px 13px', fontSize: 13, color: '#17191c', cursor: 'pointer',
            }}>
              <i className="pi pi-calendar" style={{ fontSize: 13, color: '#5a5f68' }} />
              Khoảng ngày
            </button>
            <button type="button" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #dedfe3', borderRadius: 10,
              padding: '7px 13px', fontSize: 13, color: '#17191c', cursor: 'pointer',
            }}>
              <i className="pi pi-filter" style={{ fontSize: 13, color: '#5a5f68' }} />
              Bộ lọc nâng cao
            </button>
            <button type="button" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#304fe8', border: 'none', borderRadius: 10,
              padding: '7px 16px', fontSize: 13, color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(0,0,0,0.07)',
            }}>
              <i className="pi pi-search" style={{ fontSize: 13 }} />
              Tìm mã SKU
            </button>
          </div>
        </div>
      )}

      {/* ── Timeline row ── */}
      <div style={{ padding: !hideHeader ? '14px 32px 12px' : '20px 32px 12px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{
          flex: 1, background: 'rgba(244,244,246,0.3)', border: '1px solid #dedfe3',
          borderRadius: 14, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <i className="pi pi-clock" style={{ fontSize: 16, color: '#5a5f68', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#17191c', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Dòng thời gian:
          </span>
          {order
            ? <TimelineBar order={order} />
            : <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2 }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{counts.done}</div>
            <div style={{ fontSize: 10, color: '#5a5f68', marginTop: 3 }}>Xong</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>{counts.pending}</div>
            <div style={{ fontSize: 10, color: '#5a5f68', marginTop: 3 }}>Chờ</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', lineHeight: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{counts.error}</span>
            </div>
            <div style={{ fontSize: 10, color: '#5a5f68', marginTop: 3 }}>Lỗi</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="catalog-inline-notice error" style={{ margin: '0 32px 8px' }}>
          <span>{error}</span>
          <button type="button" className="catalog-inline-notice-close" onClick={() => setError(null)} aria-label="Đóng">×</button>
        </div>
      )}

      {/* ── Diagram body ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 1, background: '#f9fafa',
          overflowX: 'auto', overflowY: 'auto',
          padding: '24px 32px 32px',
        }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: '#304fe8' }} />
            </div>
          ) : (
            <div style={{ minWidth: 736 }}>
              {/* Column headers */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 214 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5a5f68', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Nguyên Vật Liệu (NVL)
                  </span>
                </div>
                <div style={{ width: 120 }} />
                <div style={{ width: 141 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5a5f68', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Bán Thành Phẩm (BTP)
                  </span>
                </div>
                <div style={{ width: 120 }} />
                <div style={{ width: 141 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5a5f68', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Thành Phẩm (TP)
                  </span>
                </div>
              </div>

              {/* ── BTP groups ── */}
              {btpGroups.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 16, position: 'relative' }}>
                  {/* Left: NVL + Arrow rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: 334, flexShrink: 0 }}>
                    {btpGroups.map((group) => (
                      <div key={group.btp.id} style={{ display: 'flex', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
                        <div style={{
                          width: 214, flexShrink: 0,
                          border: '1.5px dashed #dedfe3', borderRadius: 14, padding: '11px 17px',
                        }}>
                          {group.nvls.length > 0 ? (
                            group.nvls.map((nvl, i) => (
                              <div key={nvl.id}>
                                <NvlCard node={nvl} selected={selectedNode?.id === nvl.id} onClick={() => handleClick(nvl)} />
                                {i < group.nvls.length - 1 && (
                                  <div style={{ textAlign: 'center', padding: '6px 0', color: '#94a3b8', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>+</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <EmptySlot label="Chưa có NVL" height={95} />
                          )}
                        </div>
                        <FlowArrow label="Kết hợp SX" arrowColor="#5269e0" pillBorderColor="#bfdbfe" pillTextColor="#1d4ed8" />
                      </div>
                    ))}
                  </div>

                  {/* BTP column: absolutely positioned */}
                  <div style={{
                    position: 'absolute', left: 334, top: 0, bottom: 0, width: 141,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'stretch',
                  }}>
                    {btpGroups.map((group, idx) => (
                      <div key={group.btp.id}>
                        {idx > 0 && (
                          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 18, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>+</div>
                        )}
                        <ProductCard node={group.btp} selected={selectedNode?.id === group.btp.id} onClick={() => handleClick(group.btp)}
                          borderColor="#f3e8ff" badgeBg="#faf5ff" badgeColor="#9333ea"
                          statusLabel={btpStatus.label} statusColor={btpStatus.color} />
                      </div>
                    ))}
                  </div>

                  {/* Width spacer */}
                  <div style={{ width: 261, flexShrink: 0 }} />

                  {/* TP section: absolutely positioned */}
                  <div style={{
                    position: 'absolute', left: 475, top: 0, bottom: 0, width: 261,
                    display: 'flex', alignItems: 'center',
                  }}>
                    <FlowArrow label={packLabel} arrowColor="#10b981" pillBorderColor="#a7f3d0" pillTextColor="#047857" />
                    <div style={{ width: 141, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tpNodes.length > 0
                        ? tpNodes.map((node) => (
                            <ProductCard key={node.id} node={node} selected={selectedNode?.id === node.id} onClick={() => handleClick(node)}
                              borderColor="#d1fae5" badgeBg="#ecfdf5" badgeColor="#059669"
                              statusLabel={tpStatus.label} statusColor={tpStatus.color} />
                          ))
                        : <EmptySlot label="Chưa có TP" height={140} />}
                    </div>
                  </div>
                </div>
              )}

              {/* ── NVLs không gắn BTP ── */}
              {ungroupedNvls.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 214, flexShrink: 0,
                    border: '1.5px dashed #e2e8f0', borderRadius: 14, padding: '11px 17px',
                    opacity: 0.7,
                  }}>
                    {ungroupedNvls.map((nvl, i) => (
                      <div key={nvl.id}>
                        <NvlCard node={nvl} selected={selectedNode?.id === nvl.id} onClick={() => handleClick(nvl)} />
                        {i < ungroupedNvls.length - 1 && (
                          <div style={{ textAlign: 'center', padding: '6px 0', color: '#94a3b8', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>+</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {btpGroups.length === 0 ? (
                    <>
                      <FlowArrow label="Kết hợp SX" arrowColor="#5269e0" pillBorderColor="#bfdbfe" pillTextColor="#1d4ed8" />
                      <div style={{ width: 141, flexShrink: 0 }}>
                        <EmptySlot label="Chưa có BTP" height={120} />
                      </div>
                      <FlowArrow label={packLabel} arrowColor="#10b981" pillBorderColor="#a7f3d0" pillTextColor="#047857" />
                      <div style={{ width: 141, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {tpNodes.length > 0
                          ? tpNodes.map((node) => (
                              <ProductCard key={node.id} node={node} selected={selectedNode?.id === node.id} onClick={() => handleClick(node)}
                                borderColor="#d1fae5" badgeBg="#ecfdf5" badgeColor="#059669"
                                statusLabel={tpStatus.label} statusColor={tpStatus.color} />
                            ))
                          : <EmptySlot label="Chưa có TP" height={120} />}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 12, fontStyle: 'italic' }}>
                      NVL chưa liên kết BTP
                    </div>
                  )}
                </div>
              )}

              {nvlNodes.length === 0 && btpNodes.length === 0 && tpNodes.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 60, color: '#94a3b8', fontSize: 13 }}>
                  Phiếu chưa có dữ liệu vật tư. Hãy thực hiện các bước sản xuất để xem luồng.
                </div>
              )}
            </div>
          )}
        </div>
        <NodeDetailPanel node={selectedNode} order={order} />
      </div>

      {!hideBottomBar && (
        <div style={{
          height: 40, borderTop: '1px solid #e2e8f0',
          background: 'rgba(244,244,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: '#5a5f68' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Hệ thống ổn định
            </div>
            <i className="pi pi-clock" style={{ fontSize: 11 }} />
            <span>Cập nhật lần cuối: vừa xong</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: '#5a5f68' }}>
            <span>Phiên bản v4.2.0-Cosme</span>
          </div>
        </div>
      )}
    </div>
  )
}
