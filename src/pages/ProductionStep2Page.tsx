import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AutoComplete } from 'primereact/autocomplete'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import {
  fetchProductionOrderDetail,
  fetchProductOutputs,
  upsertProductionOrderLines,
  updateProductionOrderStatus,
  advanceProductionStep,
  type ProductOutput,
  type ProductionOrderDetail,
  type ProductionOrderLine,
  type ProductionOrderLog,
} from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceCard {
  code: string
  warehouseName: string
  itemName: string
  availableQty: number
  availableUnit: string
  exportQty: number | null
  isEditable: boolean
  isDestination?: boolean
}

interface BomLine {
  id: number
  // BTP group (shared by all NVL rows in the same group)
  outputProductId: string | null
  btpCode: string          // BTP code — used as DataTable groupRowsBy key
  btpName: string          // BTP name
  // NVL input per row (stored as productCode / productName in DB)
  inputCode: string
  inputName: string
  lotSrc: string
  plannedQty: number | null
  actualQty: number | null
  wasteQty: number
  unit: string
  locationName: string
  notes: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtQty(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

// ─── Source Card ──────────────────────────────────────────────────────────────

function SourceCardItem({ card }: { card: SourceCard }) {
  const [qty, setQty] = useState<number | null>(card.exportQty)

  if (card.isDestination) {
    return (
      <div className="prod-source-card prod-source-card--destination">
        <div className="prod-source-card__code-row">
          <span className="prod-source-card__code">{card.code}</span>
          <span className="prod-source-card__warehouse"><i className="pi pi-building" /> {card.warehouseName}</span>
        </div>
        <p className="prod-source-card__name">{card.itemName}</p>
        <div className="prod-source-card__stat">
          <span className="prod-source-card__stat-label">SL Thực nhập</span>
          <span className="prod-source-card__stat-value">{fmtQty(card.availableQty)} {card.availableUnit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="prod-source-card">
      <div className="prod-source-card__code-row">
        <span className="prod-source-card__code">{card.code}</span>
        <span className="prod-source-card__warehouse"><i className="pi pi-building" /> {card.warehouseName}</span>
      </div>
      <p className="prod-source-card__name">{card.itemName}</p>
      <div className="prod-source-card__stats">
        <div className="prod-source-card__stat">
          <span className="prod-source-card__stat-label">Sẵn có</span>
          <span className="prod-source-card__stat-value">{fmtQty(card.availableQty)} {card.availableUnit}</span>
        </div>
        <div className="prod-source-card__stat">
          <span className="prod-source-card__stat-label">Xuất</span>
          {card.isEditable
            ? (
              <InputNumber
                value={qty}
                onValueChange={(e) => setQty(e.value ?? null)}
                locale="vi-VN"
                maxFractionDigits={3}
                inputStyle={{ width: 64, textAlign: 'right', padding: '4px 6px', fontSize: 13 }}
              />
            )
            : <span className="prod-source-card__stat-value">{fmtQty(qty)}</span>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function mapApiLineToBom(line: ProductionOrderLine, idx: number): BomLine {
  return {
    id: idx + 1,
    outputProductId: line.outputProductId,
    btpCode: line.outputProduct?.code ?? '',
    btpName: line.outputProduct?.name ?? '',
    inputCode: line.productCode,
    inputName: line.productName,
    lotSrc: line.lotNo ?? '',
    plannedQty: Number(line.plannedQty),
    actualQty:  Number(line.actualQty),
    wasteQty:   Number(line.plannedQty) - Number(line.actualQty),
    unit: line.unit,
    locationName: line.location?.name ?? '',
    notes: line.notes ?? '',
  }
}

// ─── BomGroupBtpSelector ─────────────────────────────────────────────────────
// AutoComplete in the group header to select / change the BTP for the entire group.

interface BomGroupBtpSelectorProps {
  btpCode: string
  btpName: string
  options: ProductOutput[]
  onConfirm: (item: ProductOutput) => void
  onClear: () => void
}

function BomGroupBtpSelector({ btpCode, btpName, options, onConfirm, onClear }: BomGroupBtpSelectorProps) {
  function toLabel(o: ProductOutput) { return `${o.code} — ${o.name}` }

  const [inputValue, setInputValue] = useState(btpCode ? `${btpCode} — ${btpName}` : '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const didSelectRef = useRef(false)

  useEffect(() => {
    setInputValue(btpCode ? `${btpCode} — ${btpName}` : '')
  }, [btpCode, btpName])

  function handleComplete(query: string) {
    const q = query.trim().toLowerCase()
    const filtered = !q
      ? options
      : options.filter(o => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q))
    setSuggestions(filtered.map(toLabel))
  }

  function handleBlur() {
    if (!didSelectRef.current) setInputValue(btpCode ? `${btpCode} — ${btpName}` : '')
    didSelectRef.current = false
  }

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <AutoComplete
        value={inputValue}
        suggestions={suggestions}
        completeMethod={(e) => handleComplete(e.query ?? '')}
        itemTemplate={(label: string) => {
          const sep = label.indexOf(' — ')
          const code = sep >= 0 ? label.slice(0, sep) : label
          const name = sep >= 0 ? label.slice(sep + 3) : ''
          return <span><strong>{code}</strong>{name ? ` — ${name}` : ''}</span>
        }}
        onChange={(e) => {
          const val = String(e.value ?? '')
          setInputValue(val)
          if (!val.trim()) onClear()
        }}
        onSelect={(e) => {
          const label = String(e.value ?? '')
          const found = options.find(o => toLabel(o) === label)
          if (found) {
            didSelectRef.current = true
            setSuggestions([])
            onConfirm(found)
          }
        }}
        onBlur={handleBlur}
        dropdown
        appendTo={document.body}
        emptyMessage=""
        placeholder="Chọn bán thành phẩm..."
        className="prod-bom-group-btp-ac"
        inputClassName="prod-bom-group-btp-ac-input"
      />
    </div>
  )
}

// ─── NVL AutoComplete cell ────────────────────────────────────────────────────

// NVL options derived from step 1 exported lines
interface NvlOption {
  code: string
  name: string
  lotNo: string
  unit: string
  qty: number
}



function mapApiLineToSourceCard(line: ProductionOrderLine): SourceCard {
  return {
    code: line.productCode,
    warehouseName: line.location?.name ?? 'Kho NVL',
    itemName: line.productName,
    availableQty: Number(line.actualQty),
    availableUnit: line.unit,
    exportQty: Number(line.actualQty),
    isEditable: false,
  }
}

export function ProductionStep2Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [sourceCards, setSourceCards] = useState<SourceCard[]>([])
  const [bomLines, setBomLines] = useState<BomLine[]>([])
  const [logs, setLogs] = useState<ProductionOrderLog[]>([])
  const [semiFinishedOutputs, setSemiFinishedOutputs] = useState<ProductOutput[]>([])
  const [step1Nvl, setStep1Nvl] = useState<NvlOption[]>([])
  const [nvlSuggestions, setNvlSuggestions] = useState<Record<number, string[]>>({})
  const [btpOutputMap, setBtpOutputMap] = useState<Record<string, { planned: number | null; actual: number | null; unit: string; lotNo: string | null }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processedAt, setProcessedAt] = useState<Date | null>(null)

  // Flow diagram modal
  const [showFlowModal, setShowFlowModal] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        const step1Lines = data.lines.filter(l => l.step === 1 && l.direction === 'out')
        const step2Lines = data.lines.filter(l => l.step === 2 && l.direction === 'in')
        setSourceCards(step1Lines.map(mapApiLineToSourceCard))
        setBomLines(step2Lines.map(mapApiLineToBom))
        // Load BTP output quantities (direction='out' lines in step 2)
        const step2OutLines = data.lines.filter(l => l.step === 2 && l.direction === 'out')
        const btpMap: Record<string, { planned: number | null; actual: number | null; unit: string; lotNo: string | null }> = {}
        for (const l of step2OutLines) {
          const key = l.outputProductId ?? l.productCode
          btpMap[key] = { planned: Number(l.plannedQty) || null, actual: Number(l.actualQty) || null, unit: l.unit, lotNo: l.lotNo ?? null }
        }
        setBtpOutputMap(btpMap)
        setStep1Nvl(step1Lines.map(l => ({
          code: l.productCode,
          name: l.productName,
          lotNo: l.lotNo ?? '',
          unit: l.unit,
          qty: Number(l.actualQty),
        })))
        setLogs(data.logs ?? [])
        setProcessedAt(data.step2ProcessedAt ? new Date(data.step2ProcessedAt) : null)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    fetchProductOutputs({ outputType: 'semi_finished' })
      .then(setSemiFinishedOutputs)
      .catch(() => setSemiFinishedOutputs([]))
  }, [])

  function updateGroupBtp(oldBtpCode: string, oldBtpId: string | null, item: ProductOutput) {
    setBomLines(prev => prev.map(l =>
      (l.btpCode === oldBtpCode && l.outputProductId === oldBtpId)
        ? { ...l, outputProductId: item.id, btpCode: item.code, btpName: item.name }
        : l,
    ))
    // Re-key btpOutputMap from old key to new key
    const oldKey = oldBtpId ?? oldBtpCode
    const newKey = item.id
    setBtpOutputMap(prev => {
      const existing = prev[oldKey]
      if (!existing) return { ...prev, [newKey]: { planned: null, actual: null, unit: item.unit ?? '', lotNo: null } }
      const next = { ...prev, [newKey]: { ...existing, unit: item.unit ?? '' } }
      delete next[oldKey]
      return next
    })
  }

  function clearGroupBtp(oldBtpCode: string, oldBtpId: string | null) {
    setBomLines(prev => prev.map(l =>
      (l.btpCode === oldBtpCode && l.outputProductId === oldBtpId)
        ? { ...l, outputProductId: null, btpCode: '', btpName: '' }
        : l,
    ))
  }

  function addBtpGroup() {
    const newId = Math.max(0, ...bomLines.map(l => l.id)) + 1
    setBomLines(prev => [...prev, {
      id: newId, outputProductId: null, btpCode: '', btpName: '',
      inputCode: '', inputName: '',
      lotSrc: '', plannedQty: null, actualQty: null, wasteQty: 0, unit: '', locationName: '', notes: '',
    }])
  }

  function addLineToGroup(btpCode: string, btpName: string, btpId: string | null) {
    const newId = Math.max(0, ...bomLines.map(l => l.id)) + 1
    setBomLines(prev => [...prev, {
      id: newId, outputProductId: btpId, btpCode, btpName,
      inputCode: '', inputName: '',
      lotSrc: '', plannedQty: null, actualQty: null, wasteQty: 0, unit: '', locationName: '', notes: '',
    }])
  }

  function deleteLine(id: number) {
    setBomLines(prev => prev.filter(l => l.id !== id))
  }

  function deleteGroup(btpCode: string, btpId: string | null) {
    setBomLines(prev => prev.filter(l => !(l.btpCode === btpCode && l.outputProductId === btpId)))
  }

  function handleFieldChange<K extends keyof BomLine>(id: number, field: K, value: BomLine[K]) {
    setBomLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      // Auto-calc wasteQty = plannedQty - actualQty whenever either changes
      if (field === 'plannedQty' || field === 'actualQty') {
        const planned = field === 'plannedQty' ? (value as number | null) : l.plannedQty
        const actual  = field === 'actualQty'  ? (value as number | null) : l.actualQty
        updated.wasteQty = (planned ?? 0) - (actual ?? 0)
      }
      return updated
    }))
  }

  function handleCancel() {
    if (!orderId) return
    showDangerConfirm({
      header: 'Hủy phiếu sản xuất',
      message: `Bạn có chắc muốn hủy phiếu ${order?.orderRef ?? orderId}? Hành động này không thể hoàn tác.`,
      acceptLabel: 'Xác nhận hủy',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setCancelling(true)
        try {
          await updateProductionOrderStatus(orderId, 'cancelled')
          navigate('/production')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Không thể hủy phiếu')
        } finally {
          setCancelling(false)
        }
      },
    })
  }

  // ─── NVL body templates (Cách thức B) ──────────────────────────────
  // Per-row suggestions to avoid cellMemo issue (guide item 6)
  function handleNvlComplete(rowId: number, field: 'inputCode' | 'inputName', query: string) {
    const q = query.trim().toLowerCase()
    const filtered = !q
      ? step1Nvl
      : step1Nvl.filter(o =>
          o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
        )
    const labels = Array.from(new Set(
      field === 'inputCode' ? filtered.map(o => o.code) : filtered.map(o => o.name)
    ))
    setNvlSuggestions(prev => ({ ...prev, [rowId]: labels }))
  }

  function nvlCodeBody(row: BomLine) {
    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <AutoComplete
          value={row.inputCode}
          suggestions={nvlSuggestions[row.id] ?? []}
          completeMethod={(e) => handleNvlComplete(row.id, 'inputCode', e.query ?? '')}
          onChange={(e) => handleFieldChange(row.id, 'inputCode', String(e.value ?? ''))}
          onSelect={(e) => {
            const label = String(e.value ?? '')
            const found = step1Nvl.find(o => o.code === label)
            if (found) {
              setNvlSuggestions(prev => ({ ...prev, [row.id]: [] }))
              setBomLines(prev => prev.map(l =>
                l.id === row.id
                  ? { ...l, inputCode: found.code, inputName: found.name, lotSrc: found.lotNo, unit: l.unit || found.unit, plannedQty: found.qty, wasteQty: found.qty - (l.actualQty ?? 0) }
                  : l
              ))
            }
          }}
          dropdown
          appendTo={document.body}
          emptyMessage=""
          placeholder="Mã NVL..."
          className="prod-bom-input prod-bom-nvl-ac"
          inputClassName="prod-bom-input"
        />
      </div>
    )
  }

  function nvlNameBody(row: BomLine) {
    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <AutoComplete
          value={row.inputName}
          suggestions={nvlSuggestions[row.id] ?? []}
          completeMethod={(e) => handleNvlComplete(row.id, 'inputName', e.query ?? '')}
          onChange={(e) => handleFieldChange(row.id, 'inputName', String(e.value ?? ''))}
          onSelect={(e) => {
            const label = String(e.value ?? '')
            const found = step1Nvl.find(o => o.name === label)
            if (found) {
              setNvlSuggestions(prev => ({ ...prev, [row.id]: [] }))
              setBomLines(prev => prev.map(l =>
                l.id === row.id
                  ? { ...l, inputCode: found.code, inputName: found.name, lotSrc: found.lotNo, unit: l.unit || found.unit, plannedQty: found.qty, wasteQty: found.qty - (l.actualQty ?? 0) }
                  : l
              ))
            }
          }}
          dropdown
          appendTo={document.body}
          emptyMessage=""
          placeholder="Tên nguyên vật liệu..."
          className="prod-bom-input prod-bom-nvl-ac"
          inputClassName="prod-bom-input"
        />
      </div>
    )
  }

  function nvlLotBody(row: BomLine) {
    // Suggest lotNo values matching the selected NVL code, or all if no code selected
    const lotOptions = Array.from(new Set(
      step1Nvl
        .filter(o => !row.inputCode || o.code === row.inputCode)
        .map(o => o.lotNo)
        .filter(Boolean)
    ))
    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <AutoComplete
          value={row.lotSrc}
          suggestions={nvlSuggestions[-(row.id)] ?? []}
          completeMethod={(e) => {
            const q = (e.query ?? '').trim().toLowerCase()
            const filtered = !q ? lotOptions : lotOptions.filter(l => l.toLowerCase().includes(q))
            setNvlSuggestions(prev => ({ ...prev, [-(row.id)]: filtered }))
          }}
          disabled={!row.inputCode}
          onChange={(e) => handleFieldChange(row.id, 'lotSrc', String(e.value ?? ''))}
          onSelect={(e) => {
            setNvlSuggestions(prev => ({ ...prev, [-(row.id)]: [] }))
            handleFieldChange(row.id, 'lotSrc', String(e.value ?? ''))
          }}
          dropdown
          appendTo={document.body}
          emptyMessage=""
          placeholder="Số lô..."
          className="prod-bom-input prod-bom-nvl-ac"
          inputClassName="prod-bom-input"
        />
      </div>
    )
  }

  function updateBtpOutput(key: string, field: 'planned' | 'actual', value: number | null): void
  function updateBtpOutput(key: string, field: 'lotNo', value: string | null): void
  function updateBtpOutput(key: string, field: 'planned' | 'actual' | 'lotNo', value: number | string | null) {
    setBtpOutputMap(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { planned: null, actual: null, unit: '', lotNo: null }), [field]: value },
    }))
  }

  async function handleSave() {
    if (!orderId) return
    setSaving(true)
    setError(null)
    try {
      // NVL input lines (direction='in')
      const nvlLines = bomLines.map(l => ({
        outputProductId: l.outputProductId,
        productCode: l.inputCode,
        productName: l.inputName,
        lotNo: l.lotSrc || null,
        plannedQty: l.plannedQty ?? 0,
        actualQty:  l.actualQty  ?? 0,
        wasteQty:   l.wasteQty,
        unit:       l.unit,
        direction:  'in' as const,
        notes:      l.notes || null,
      }))
      // BTP output lines (direction='out') — one per BTP group
      const btpGroups = Array.from(
        new Map(bomLines.filter(l => l.btpCode).map(l => [l.outputProductId ?? l.btpCode, l])).entries()
      )
      const btpOutLines = btpGroups
        .filter(([, rep]) => rep.btpCode)
        .map(([key, rep]) => ({
          outputProductId: rep.outputProductId,
          productCode: rep.btpCode,
          productName: rep.btpName,
          lotNo: btpOutputMap[key]?.lotNo ?? null,
          plannedQty: btpOutputMap[key]?.planned ?? 0,
          actualQty:  btpOutputMap[key]?.actual  ?? 0,
          wasteQty:   Math.max(0, (btpOutputMap[key]?.planned ?? 0) - (btpOutputMap[key]?.actual ?? 0)),
          unit:       btpOutputMap[key]?.unit ?? semiFinishedOutputs.find(p => p.id === rep.outputProductId || p.code === rep.btpCode)?.unit ?? '',
          direction:  'out' as const,
          notes:      null,
        }))
      await upsertProductionOrderLines(orderId, 2, [...nvlLines, ...btpOutLines], processedAt?.toISOString() ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const logTypeTag = (type: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      system:  { label: 'system',  bg: '#e2e8f0', color: '#475569' },
      update:  { label: 'update',  bg: '#dbeafe', color: '#1d4ed8' },
      process: { label: 'process', bg: '#dcfce7', color: '#15803d' },
    }
    const s = map[type] ?? map.system
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' as const }}>
        {s.label}
      </span>
    )
  }

  // Sorted view — rows of same BTP contiguous, unassigned groups last
  const sortedBomLines = [...bomLines].sort((a, b) => {
    if (!a.btpCode && b.btpCode) return 1
    if (a.btpCode && !b.btpCode) return -1
    if (a.btpCode !== b.btpCode) return a.btpCode.localeCompare(b.btpCode)
    return a.id - b.id
  })

  function autoFillGroupFromStep1(btpCode: string, btpId: string | null) {
    const grp = bomLines.filter(l => l.btpCode === btpCode && l.outputProductId === btpId)
    // NVL codes already in THIS group
    const usedInGroup = new Set(grp.map(l => l.inputCode).filter(Boolean))
    // NVL codes already in OTHER groups
    const usedInOthers = new Set(
      bomLines
        .filter(l => !(l.btpCode === btpCode && l.outputProductId === btpId))
        .map(l => l.inputCode)
        .filter(Boolean)
    )
    // only fill NVL not yet in this group and not used in any other group
    const missing = step1Nvl.filter(o => !usedInGroup.has(o.code) && !usedInOthers.has(o.code))
    if (missing.length === 0) return

    // Fill empty rows first, then add new rows for remaining
    let remaining = [...missing]
    let maxId = Math.max(0, ...bomLines.map(l => l.id))

    setBomLines(prev => {
      const next = [...prev]
      // Fill empty rows in this group
      for (let i = 0; i < next.length && remaining.length > 0; i++) {
        const l = next[i]
        if (l.btpCode === btpCode && l.outputProductId === btpId && !l.inputCode) {
          const nvl = remaining.shift()!
          next[i] = { ...l, inputCode: nvl.code, inputName: nvl.name, lotSrc: nvl.lotNo, unit: nvl.unit, plannedQty: nvl.qty, wasteQty: nvl.qty - (l.actualQty ?? 0) }
        }
      }
      // Add new rows for still-remaining
      for (const nvl of remaining) {
        maxId++
        next.push({
          id: maxId, outputProductId: btpId, btpCode, btpName: grp[0]?.btpName ?? '',
          inputCode: nvl.code, inputName: nvl.name,
          lotSrc: nvl.lotNo, plannedQty: nvl.qty, actualQty: null, wasteQty: nvl.qty,
          unit: nvl.unit, locationName: '', notes: '',
        })
      }
      return next
    })
  }

  function groupHeaderTemplate(row: BomLine) {
    const grp = bomLines.filter(l => l.btpCode === row.btpCode && l.outputProductId === row.outputProductId)
    const totalWaste   = grp.reduce((s, l) => s + l.wasteQty, 0)
    const usedCodes = new Set(grp.map(l => l.inputCode).filter(Boolean))
    const usedInOtherGroups = new Set(
      bomLines
        .filter(l => !(l.btpCode === row.btpCode && l.outputProductId === row.outputProductId))
        .map(l => l.inputCode)
        .filter(Boolean)
    )
    const hasMissing = step1Nvl.some(o => !usedCodes.has(o.code) && !usedInOtherGroups.has(o.code))
    const groupKey = row.outputProductId ?? row.btpCode
    const btpOut = btpOutputMap[groupKey] ?? { planned: null, actual: null, unit: '' }
    const btpUnit = btpOut.unit || (semiFinishedOutputs.find(p => p.id === row.outputProductId || p.code === row.btpCode)?.unit ?? '')
    return (
      <div className="prod-bom-group-hdr" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0 }}>
        {/* Info area: covers STT(48)+MãNVL(210)+TênNVL(350) columns minus group-header TD left-padding(10) = 598px */}
        <div style={{ width: 598, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <span className="prod-bom-group-hdr__badge">BTP</span>
          <BomGroupBtpSelector
            btpCode={row.btpCode}
            btpName={row.btpName}
            options={semiFinishedOutputs}
            onConfirm={(item) => updateGroupBtp(row.btpCode, row.outputProductId, item)}
            onClear={() => clearGroupBtp(row.btpCode, row.outputProductId)}
          />
          <div className="prod-bom-group-hdr__stats" style={{ flex: 1, minWidth: 0 }}>
            {totalWaste  !== 0 && <span className={totalWaste > 0 ? 'prod-bom-waste--pos' : ''}>HH NVL: <b>{fmtQty(totalWaste)}</b></span>}
          </div>
        </div>
        {/* Lô BTP — 130px, paddingLeft/Right 8px mirrors actual data-cell padding → input at cell content area */}
        <div
          style={{ width: 130, flexShrink: 0, paddingLeft: 8, paddingRight: 8 }}
          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        >
          <InputText
            value={btpOut.lotNo ?? ''}
            onChange={(e) => updateBtpOutput(groupKey, 'lotNo', e.target.value || null)}
            disabled={isLocked}
            placeholder="Lô BTP..."
            style={{ width: '100%', fontSize: 12, padding: '4px 6px', height: 30 }}
          />
        </div>
        {/* SL KH — 130px, paddingRight 8 → mirrors actual data-cell right padding, right-aligned */}
        <div
          style={{ width: 130, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', paddingRight: 8 }}
          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        >
          <InputNumber
            value={btpOut.planned}
            onValueChange={(e) => updateBtpOutput(groupKey, 'planned', e.value ?? null)}
            locale="vi-VN"
            maxFractionDigits={3}
            disabled={isLocked}
            placeholder="KH..."
            suffix={btpUnit ? ` ${btpUnit}` : undefined}
            inputStyle={{ width: 114, fontSize: 12 }}
          />
        </div>
        {/* SL TN — 130px, paddingRight 8 → mirrors actual data-cell right padding, right-aligned */}
        <div
          style={{ width: 130, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', paddingRight: 8 }}
          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        >
          <InputNumber
            value={btpOut.actual}
            onValueChange={(e) => updateBtpOutput(groupKey, 'actual', e.value ?? null)}
            locale="vi-VN"
            maxFractionDigits={3}
            disabled={isLocked}
            placeholder="Thực nhập..."
            suffix={btpUnit ? ` ${btpUnit}` : undefined}
            inputStyle={{ width: 114, fontSize: 12 }}
          />
        </div>
        {/* Right: action buttons spanning remaining columns */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          {hasMissing && (
            <Button
              label="↓ Fill từ Bước 1"
              icon="pi pi-download"
              className="p-button-text p-button-sm"
              style={{ color: '#0284c7', fontSize: 12 }}
              tooltip="Tự động thêm các NVL từ bước 1 chưa có trong nhóm này"
              tooltipOptions={{ position: 'top' }}
              onClick={() => autoFillGroupFromStep1(row.btpCode, row.outputProductId)}
            />
          )}
          <Button
            label="+ Thêm NVL"
            className="p-button-text p-button-sm prod-bom-group-hdr__add-nvl"
            onClick={() => addLineToGroup(row.btpCode, row.btpName, row.outputProductId)}
          />
          <Button
            icon="pi pi-trash"
            className="p-button-text p-button-sm p-button-danger prod-bom-group-hdr__del"
            tooltip="Xóa nhóm BTP"
            tooltipOptions={{ position: 'top' }}
            onClick={() => deleteGroup(row.btpCode, row.outputProductId)}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="prod-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: '#5269e0' }} />
      </div>
    )
  }

  const isLocked = order?.status === 'completed' || order?.status === 'cancelled'

  return (
    <div className="prod-page">
      {/* Header */}
      <div className="prod-header">
        <div className="prod-header__left">
          <h1 className="prod-header__title">Phiếu sản xuất</h1>
          <span className="prod-header__badge">PRODUCTION TICKET</span>
          <span className="prod-header__order-no">#{order?.orderRef ?? '---'}</span>
        </div>
        <div className="prod-header__right">
          <span className="prod-step-badge prod-step-badge--active">
            Bước 2 / 4 — Nhập BTP
          </span>
        </div>
      </div>

      <p className="prod-subtitle">Ghi nhận bán thành phẩm đầu ra từ giai đoạn phối trộn nguyên liệu</p>

      <ProductionStepBar
        activeStep={2}
        orderId={orderId}
        maxReachedStep={Math.max(order?.currentStep ?? 2, ...(order?.lines?.map(l => l.step) ?? [2]))}
        onNavigate={(s) => { if (orderId) navigate(`/production/${orderId}/buoc-${s}`) }}
      />

      {error && (
        <div style={{ margin: '12px 24px 0', padding: '10px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
          <i className="pi pi-exclamation-circle" style={{ marginRight: 8 }} />{error}
        </div>
      )}

      {isLocked && (
        <div style={{ margin: '8px 24px 0', padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
          <i className="pi pi-lock" style={{ color: '#64748b' }} />
          <span>Phiếu đã <strong>{order?.status === 'completed' ? 'hoàn tất' : 'bị hủy'}</strong> — chỉ xem, không thể chỉnh sửa.</span>
        </div>
      )}

      <div className="prod-body" style={{ gridTemplateColumns: '1fr' }}>
        <div className="prod-main">

          {/* Ngày xử lý */}
          <div className="prod-card" style={{ padding: '14px 20px' }}>
            <div className="prod-form-field" style={{ maxWidth: 260 }}>
              <label>NGÀY XỬ LÝ (BƯỚC 2)</label>
              <Calendar
                value={processedAt}
                onChange={(e) => setProcessedAt(e.value as Date | null)}
                dateFormat="dd/mm/yy"
                placeholder="Chọn ngày xử lý"
                showIcon
                disabled={isLocked}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Nguồn cấp & Đích đến */}
          <div className="prod-card">
            <div className="prod-card__title-row">
              <div className="prod-card__title-left">
                <i className="pi pi-box" style={{ color: '#64748b' }} />
                <span className="prod-card__title">Sơ đồ luồng vật tư</span>
              </div>
              
            </div>

{/* Per-BTP source rows */}
            <div className="prod-sources-btp">
              {(() => {
                const btpGroups = Array.from(
                  new Map(bomLines.filter(l => l.btpCode).map(l => [l.outputProductId ?? l.btpCode, l])).values()
                )
                if (btpGroups.length === 0) {
                  return (
                    <div className="prod-sources">
                      {sourceCards.length > 0
                        ? sourceCards.map(card => <SourceCardItem key={card.code} card={card} />)
                        : <p style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu Bước 1</p>}
                      <div className="prod-sources__arrow">
                        <div className="prod-sources__arrow-circle">
                          <i className="pi pi-arrow-right" style={{ fontSize: 18, color: '#1d4ed8' }} />
                        </div>
                        <span className="prod-sources__arrow-label">PHỐI TRỘN</span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: 13, alignSelf: 'center' }}>Chưa có BTP</p>
                    </div>
                  )
                }
                return btpGroups.map(btpRep => {
                  const groupLines = bomLines.filter(l =>
                    l.btpCode === btpRep.btpCode && l.outputProductId === btpRep.outputProductId
                  )
                  const btpKey = btpRep.outputProductId ?? btpRep.btpCode
                  const btpActual = btpOutputMap[btpKey]?.actual ?? null
                  const groupUnit = (btpOutputMap[btpKey]?.unit || groupLines.find(l => l.unit)?.unit) ?? ''
                  const nvlCards = groupLines.filter(l => l.inputCode || l.inputName)
                  return (
                    <div key={btpRep.outputProductId ?? btpRep.btpCode} className="prod-sources-btp__row">
                      <div className="prod-sources-btp__label">
                        <span className="prod-bom-group-hdr__badge" style={{ fontSize: 9 }}>BTP</span>
                        <span>{btpRep.btpCode}{btpRep.btpName ? ` — ${btpRep.btpName}` : ''}</span>
                      </div>
                      <div className="prod-sources">
                        {nvlCards.length > 0
                          ? nvlCards.map(l => (
                              <SourceCardItem key={l.id} card={{
                                code: l.inputCode || '—',
                                warehouseName: l.locationName || 'Kho NVL',
                                itemName: l.inputName || '—',
                                availableQty: l.plannedQty ?? 0,
                                availableUnit: l.unit,
                                exportQty: l.actualQty,
                                isEditable: false,
                              }} />
                            ))
                          : <p style={{ color: '#94a3b8', fontSize: 13, alignSelf: 'center' }}>Chưa có NVL</p>
                        }
                        <div className="prod-sources__arrow">
                          <div className="prod-sources__arrow-circle">
                            <i className="pi pi-arrow-right" style={{ fontSize: 18, color: '#1d4ed8' }} />
                          </div>
                          <span className="prod-sources__arrow-label">SẢN XUẤT</span>
                        </div>
                        <SourceCardItem card={{
                          code: btpRep.btpCode || '—',
                          warehouseName: btpRep.locationName || 'Kho BTP',
                          itemName: btpRep.btpName || '(Chưa chọn BTP)',
                          availableQty: btpActual ?? 0,
                          availableUnit: groupUnit,
                          exportQty: null,
                          isEditable: false,
                          isDestination: true,
                        }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Chi tiết dòng nghiệp vụ */}
          <div className="prod-card">
            <div className="prod-card__title-row">
              <div className="prod-card__title-left">
                <span className="prod-card__title">Chi tiết nhập bán thành phẩm</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  label="THÊM NHÓM BTP"
                  icon="pi pi-plus"
                  className="p-button-outlined p-button-sm"
                  style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', borderColor: '#1d4ed8' }}
                  onClick={addBtpGroup}
                />
              </div>
            </div>
            <p className="prod-card__subtitle">Mỗi nhóm bán thành phẩm (BTP) chứa các dòng NVL đầu vào tương ứng</p>

            <DataTable
              value={sortedBomLines}
              dataKey="id"
              scrollable
              scrollHeight="400px"
              className="prod-bom-table prime-catalog-table"
              cellMemo={false}
              rowHover
              rowGroupMode="subheader"
              groupRowsBy="btpCode"
              rowGroupHeaderTemplate={groupHeaderTemplate}
              emptyMessage="Nhấn 'Thêm nhóm BTP' để bắt đầu nhập dữ liệu."
            >
                  <Column
                    header="STT"
                    body={(_: BomLine, opts: { rowIndex: number }) => (
                      <span>{opts.rowIndex + 1}</span>
                    )}
                    style={{ width: 48, minWidth: 48 }}
                  />
                  <Column
                    header="Mã NVL"
                    body={nvlCodeBody}
                    style={{ width: '210px', minWidth: '210px' }}
                  />
                  <Column
                    header="Tên NVL"
                    body={nvlNameBody}
                    style={{ width: '350px', minWidth: '350px' }}
                  />
                  <Column
                    header="Lô NVL"
                    body={nvlLotBody}
                    style={{ width: '130px', minWidth: '130px' }}
                  />
                  <Column
                    header="SL Kế hoạch"
                    align="right"
                    body={(row: BomLine) => (
                      <InputNumber
                        value={row.plannedQty}
                        onValueChange={(e) => handleFieldChange(row.id, 'plannedQty', e.value ?? null)}
                        locale="vi-VN"
                        maxFractionDigits={3}
                        disabled={isLocked}
                        inputClassName="prod-bom-input prod-bom-input--num"
                      />
                    )}
                    style={{ width: '130px', minWidth: '130px' }}
                  />
                  <Column
                    header="SL Thực nhập"
                    align="right"
                    body={(row: BomLine) => (
                      <InputNumber
                        value={row.actualQty}
                        onValueChange={(e) => handleFieldChange(row.id, 'actualQty', e.value ?? null)}
                        locale="vi-VN"
                        maxFractionDigits={3}
                        disabled={isLocked}
                        inputClassName="prod-bom-input prod-bom-input--num"
                      />
                    )}
                    style={{ width: '130px', minWidth: '130px' }}
                  />
                  <Column
                    header="Hao hụt"
                    align="right"
                    body={(row: BomLine) => (
                      <span className={`num-r${row.wasteQty > 0 ? ' prod-bom-waste--pos' : ''}`}>
                        {fmtQty(row.wasteQty)}
                      </span>
                    )}
                    style={{ width: '100px', minWidth: '100px' }}
                  />
                  <Column header="ĐVT" field="unit" style={{ width: '70px', minWidth: '70px' }} />
                  <Column
                    header="Ghi chú"
                    body={(row: BomLine) => (
                      <InputText
                        value={row.notes}
                        onChange={(e) => handleFieldChange(row.id, 'notes', e.target.value)}
                        placeholder="..."
                        className="prod-bom-input"
                      />
                    )}
                    style={{ width: '140px', minWidth: '140px' }}
                  />
                  <Column
                    header=""
                    body={(row: BomLine) => (
                      <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-sm p-button-danger"
                        style={{ color: '#94a3b8' }}
                        onClick={() => deleteLine(row.id)}
                        tooltip="Xóa dòng NVL"
                        tooltipOptions={{ position: 'top' }}
                      />
                    )}
                    style={{ width: 48, minWidth: 48 }}
                  />
                </DataTable>
          </div>

          {/* Nhật ký giao dịch */}
          <div className="prod-card">
            <div className="prod-card__title-row">
              <div className="prod-card__title-left">
                <i className="pi pi-history" style={{ color: '#64748b' }} />
                <span className="prod-card__title">Nhật ký giao dịch</span>
              </div>
            </div>

            <div className="prod-txlog">
              {logs.map(log => (
                <div key={log.id} className="prod-txlog__row">
                  <div className="prod-txlog__avatar">
                    <i className="pi pi-user" />
                  </div>
                  <div className="prod-txlog__content">
                    <div className="prod-txlog__user-row">
                      <span className="prod-txlog__user">{log.userName ?? log.user?.fullName ?? 'Hệ thống'}</span>
                      {logTypeTag(log.logType)}
                    </div>
                    <p className="prod-txlog__action">{log.action}</p>
                  </div>
                  <span className="prod-txlog__time">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
              <div className="prod-txlog__more">
                <button type="button">Xem thêm nhật ký cũ hơn...</button>
              </div>
            </div>
          </div>

        </div>

        {/* Right panel – tạm ẩn ReconciliationPanel */}
        {/* <div className="prod-right">
          <ReconciliationPanel lines={bomLines} />
        </div> */}
      </div>

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} disabled={isLocked} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={handleCancel} />
          {orderId && order?.status === 'completed' && (
            <Button
              label="VÔ HIỆU"
              icon="pi pi-ban"
              loading={voiding}
              className="p-button-text p-button-danger"
              style={{ fontSize: 12, fontWeight: 700 }}
              onClick={() => {
                showDangerConfirm({
                  header: 'Vô hiệu phiếu sản xuất',
                  message: `Vô hiệu phiếu ${order?.orderRef ?? orderId}? NVL xuất kho sẽ được hoàn trả tồn kho và TP nhập kho sẽ bị hủy. Hành động này không thể hoàn tác.`,
                  acceptLabel: 'Xác nhận vô hiệu',
                  rejectLabel: 'Quay lại',
                  onAccept: async () => {
                    setVoiding(true)
                    try {
                      await updateProductionOrderStatus(orderId, 'cancelled')
                      navigate('/production')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Không thể vô hiệu phiếu.')
                    } finally {
                      setVoiding(false)
                    }
                  },
                })
              }}
            />
          )}
        </div>
        <div className="prod-footer-bar__right">
          <Button
            label="Xem lưu đồ NVL"
            icon="pi pi-sitemap"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => setShowFlowModal(true)}
          />
          <Button
            label="← Bước 1: Xuất NVL"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-1`)}
          />
          <Button label="LƯU NHÁP"   icon="pi pi-save"  loading={saving}    disabled={isLocked} className="p-button-outlined"
            style={{ fontSize: 12, fontWeight: 700, borderColor: '#5269e0', color: '#5269e0' }}
            onClick={handleSave}
          />
          <Button
            label="Tiếp theo: Xuất BTP"
            icon="pi pi-arrow-right"
            iconPos="right"
            disabled={isLocked}
            className="p-button-primary"
            style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
            onClick={async () => {
              if (orderId && order && order.currentStep < 3) {
                try { await advanceProductionStep(orderId) } catch { /* ignore */ }
              }
              navigate(`/production/${orderId}/buoc-3`)
            }}
          />
        </div>
      </div>

      {/* Flow diagram modal */}
      <ProductionFlowModal
        visible={showFlowModal}
        orderId={orderId ?? null}
        onHide={() => setShowFlowModal(false)}
      />
    </div>
  )
}
