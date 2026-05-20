/**
 * OutboundMaterialPanel
 * Reusable FEFO-based material export panel.
 * Extracted from OutboundPage – used in both OutboundPage and ProductionStep1Page.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Checkbox, type CheckboxChangeEvent } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Tag } from 'primereact/tag'
import { fetchMaterials } from '../../lib/catalogApi'
import type { MaterialRow } from '../catalog/types'
import {
  fetchFefoSuggestions,
  fetchInventoryStock,
  type InventoryStockBatch,
} from '../../lib/outboundApi'
import { formatQuantity, parseDecimalInput, toEditableNumberString } from '../purchaseOrder/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectOption = { label: string; value: string }

export type AllocationRow = {
  batchId: string
  lotNo: string
  expiryDate: string | null
  availableQty: number
  exportQty: number
  inputValue: string
  manufacturerName: string | null
  locationCode: string | null
  locationName: string | null
  exportDate: Date | null
}

export type MaterialLine = {
  key: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  requestedQtyValue: number
  requestedQtyInput: string
  requestedQtyFocused: boolean
  allocationRows: AllocationRow[]
  shortageAcknowledged: boolean
  stockRows: InventoryStockBatch[]
  fefoSuggestions: InventoryStockBatch[]
  stockLoading: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEmptyLine(): MaterialLine {
  return {
    key: crypto.randomUUID(),
    materialId: '',
    materialCode: '',
    materialName: '',
    materialUnit: '',
    requestedQtyValue: 0,
    requestedQtyInput: '',
    requestedQtyFocused: false,
    allocationRows: [],
    shortageAcknowledged: false,
    stockRows: [],
    fefoSuggestions: [],
    stockLoading: false,
  }
}

function formatDateVi(value: string | null): string {
  if (!value) return 'Chưa khai báo'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function toNumeric(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function calculateExpTag(expiryDate: string | null): { label: string; severity: 'danger' | 'warning' | 'success' } {
  if (!expiryDate) return { label: 'Không có hạn', severity: 'success' }
  const target = new Date(expiryDate)
  if (Number.isNaN(target.getTime())) return { label: 'Không rõ hạn', severity: 'warning' }
  const now = new Date()
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 30) return { label: 'Hết hạn gấp', severity: 'danger' }
  if (diffDays <= 90) return { label: 'Sắp hết hạn', severity: 'warning' }
  return { label: 'Ổn định', severity: 'success' }
}

function getLineDerived(line: MaterialLine) {
  const lots = line.stockRows
    .filter((r) => toNumeric(r.currentQtyBase) > 0)
    .sort((a, b) => {
      const aDate = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER
      const bDate = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER
      if (aDate !== bDate) return aDate - bDate
      return String(a.lotNo).localeCompare(String(b.lotNo))
    })
  const totalStockQty = lots.reduce((s, l) => s + toNumeric(l.currentQtyBase), 0)
  const allocatedQty = line.allocationRows.reduce((s, r) => s + r.exportQty, 0)
  const shortageQty = Math.max(line.requestedQtyValue - totalStockQty, 0)
  const hasShortage = shortageQty > 0 && line.requestedQtyValue > 0
  const remainingQty = Math.max(line.requestedQtyValue - allocatedQty, 0)
  const suggestedLots = line.fefoSuggestions.filter(
    (lot) => !line.allocationRows.some((r) => r.batchId === lot.id),
  )
  return { lots, totalStockQty, allocatedQty, shortageQty, hasShortage, remainingQty, suggestedLots }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  /** Disable all editing (view-only mode) */
  disabled?: boolean
  /** Lock existing lines (from initialLines) but still allow adding new lines */
  lockExistingLines?: boolean
  /** Called whenever the lines array changes */
  onLinesChange?: (lines: MaterialLine[]) => void
  /** Pre-populate lines (e.g. from saved data) – applied once on mount */
  initialLines?: MaterialLine[]
  /** Filter stock/FEFO by warehouse location */
  locationId?: string
  /** Report stock as-of this date (ISO string); used in production to match processedAt */
  asOfDate?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutboundMaterialPanel({ disabled = false, lockExistingLines = false, onLinesChange, initialLines, locationId, asOfDate }: Props) {
  const fefoWrapRef = useRef<HTMLDivElement>(null)
  const fefoPanelRef = useRef<HTMLElement>(null)
  const linesRef = useRef<MaterialLine[]>([])

  const [materialOptions, setMaterialOptions] = useState<SelectOption[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [lines, setLines] = useState<MaterialLine[]>(() => initialLines && initialLines.length > 0 ? initialLines : [createEmptyLine()])
  const [activeLineIdx, setActiveLineIdx] = useState(0)
  // Track which line keys were present at initial load — those are locked when lockExistingLines=true
  const lockedLineKeysRef = useRef<Set<string>>(new Set(initialLines?.map(l => l.key) ?? []))
  const [loading, setLoading] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  // Apply initialLines if provided after mount (e.g. async load)
  const initialLinesRef = useRef(initialLines)
  useEffect(() => {
    if (initialLines && initialLines.length > 0 && initialLinesRef.current !== initialLines) {
      initialLinesRef.current = initialLines
      setLines(initialLines)
      setActiveLineIdx(0)
      // Refresh locked keys when initial lines are set (e.g. after async load)
      lockedLineKeysRef.current = new Set(initialLines.map(l => l.key))

      // Load stock for each pre-populated line that has a materialId but no stock data yet
      initialLines.forEach((line) => {
        if (!line.materialId || line.stockRows.length > 0) return
        setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockLoading: true } : l))
        Promise.all([
          fetchInventoryStock(line.materialId, locationId, asOfDate),
          fetchFefoSuggestions(line.materialId, 6, locationId, asOfDate),
        ])
          .then(([stock, fefo]) => {
            setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false } : l))
          })
          .catch(() => {
            setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockLoading: false } : l))
          })
      })
    }
  }, [initialLines])

  // Keep ref in sync with latest lines (used by location/date-change reload effect)
  useEffect(() => { linesRef.current = lines }, [lines])

  // Reload stock when locationId or asOfDate changes
  const prevLocationIdRef = useRef<string | undefined>(undefined)
  const prevAsOfDateRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prevLoc = prevLocationIdRef.current
    const prevDate = prevAsOfDateRef.current
    prevLocationIdRef.current = locationId
    prevAsOfDateRef.current = asOfDate
    // Skip initial mount (both undefined → same as initial)
    if (prevLoc === undefined && prevDate === undefined) return
    if (prevLoc === locationId && prevDate === asOfDate) return
    const currentLines = linesRef.current
    currentLines.forEach((line, idx) => {
      if (!line.materialId) return
      setLines((prev) => prev.map((l, i) => i === idx ? { ...l, stockLoading: true } : l))
      void Promise.all([
        fetchInventoryStock(line.materialId, locationId, asOfDate),
        fetchFefoSuggestions(line.materialId, 6, locationId, asOfDate),
      ]).then(([stock, fefo]) => {
        setLines((prev) => prev.map((l, i) => i === idx ? { ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false } : l))
      }).catch(() => {
        setLines((prev) => prev.map((l, i) => i === idx ? { ...l, stockLoading: false } : l))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, asOfDate])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMaterials()
      .then((rows) => {
        if (cancelled) return
        setMaterials(rows)
        setMaterialOptions(rows.map((r) => ({ value: r.id, label: `${r.materialName} (${r.code})` })))
      })
      .catch(() => {
        if (!cancelled) setPanelError('Không thể tải danh sách nguyên liệu.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── JS-based sticky for FEFO panel ──
  useEffect(() => {
    const wrap = fefoWrapRef.current
    const panel = fefoPanelRef.current
    if (!wrap || !panel) return
    const OFFSET_TOP = 16
    const updatePosition = () => {
      const wrapRect = wrap.getBoundingClientRect()
      const maxTranslate = Math.max(0, wrap.offsetHeight - panel.offsetHeight)
      const rawTranslate = Math.max(0, OFFSET_TOP - wrapRect.top)
      const translate = Math.min(rawTranslate, maxTranslate)
      panel.style.transform = translate > 0 ? `translateY(${translate}px)` : ''
    }
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
    updatePosition()
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  // ── Notify parent when lines change ──
  useEffect(() => {
    onLinesChange?.(lines)
  }, [lines, onLinesChange])

  // ── Derived ──
  const activeLine = lines[activeLineIdx] ?? lines[0] ?? null
  const activeLineMaterial = useMemo(
    () => (activeLine ? materials.find((m) => m.id === activeLine.materialId) ?? null : null),
    [activeLine, materials],
  )
  const activeLineDerived = useMemo(
    () => (activeLine ? getLineDerived(activeLine) : null),
    [activeLine],
  )
  const anyStockLoading = lines.some((l) => l.stockLoading)

  // ── Line management ──
  const updateLine = (idx: number, updater: (line: MaterialLine) => MaterialLine) => {
    if (disabled) return
    setLines((prev) => prev.map((l, i) => (i === idx ? updater(l) : l)))
  }

  const addLine = () => {
    if (disabled) return
    setLines((prev) => [...prev, createEmptyLine()])
    setActiveLineIdx(lines.length)
  }

  const removeLine = (idx: number) => {
    if (disabled || lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== idx))
    setActiveLineIdx((prev) => {
      if (prev >= lines.length - 1) return Math.max(0, lines.length - 2)
      if (prev > idx) return prev - 1
      if (prev === idx) return Math.min(idx, lines.length - 2)
      return prev
    })
  }

  const handleLineMaterialChange = async (idx: number, newMaterialId: string) => {
    if (disabled) return
    const mat = materials.find((m) => m.id === newMaterialId)
    updateLine(idx, (l) => ({
      ...l,
      materialId: newMaterialId,
      materialCode: mat?.code ?? '',
      materialName: mat?.materialName ?? '',
      materialUnit: mat?.unit ?? '',
      requestedQtyValue: 0,
      requestedQtyInput: '',
      requestedQtyFocused: false,
      allocationRows: [],
      shortageAcknowledged: false,
      stockRows: [],
      fefoSuggestions: [],
      stockLoading: Boolean(newMaterialId),
    }))
    setActiveLineIdx(idx)
    if (!newMaterialId) return
    try {
      const [stock, fefo] = await Promise.all([
        fetchInventoryStock(newMaterialId, locationId, asOfDate),
        fetchFefoSuggestions(newMaterialId, 6, locationId, asOfDate),
      ])
      updateLine(idx, (l) => ({ ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false }))
    } catch {
      updateLine(idx, (l) => ({ ...l, stockLoading: false }))
    }
  }

  const handleLineQtyChange = (idx: number, raw: string) => {
    if (disabled) return
    updateLine(idx, (l) => ({ ...l, requestedQtyInput: raw }))
  }

  const handleLineQtyFocus = (idx: number) => {
    if (disabled) return
    setActiveLineIdx(idx)
    updateLine(idx, (l) => ({
      ...l,
      requestedQtyFocused: true,
      requestedQtyInput: toEditableNumberString(l.requestedQtyValue),
    }))
  }

  const handleLineQtyBlur = (idx: number) => {
    if (disabled) return
    const line = lines[idx]
    if (!line) return
    const raw = line.requestedQtyInput.trim()
    if (!raw) {
      updateLine(idx, (l) => ({ ...l, requestedQtyFocused: false, requestedQtyValue: 0, requestedQtyInput: '' }))
      return
    }
    const parsed = parseDecimalInput(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPanelError('Số lượng yêu cầu không hợp lệ. Vui lòng nhập lại.')
      updateLine(idx, (l) => ({ ...l, requestedQtyFocused: false }))
      return
    }
    updateLine(idx, (l) => ({
      ...l,
      requestedQtyFocused: false,
      requestedQtyValue: parsed,
      requestedQtyInput: formatQuantity(parsed),
      shortageAcknowledged: false,
    }))
    setPanelError(null)
  }

  const applyFefoAutoAllocation = (idx: number) => {
    if (disabled) return
    const line = lines[idx]
    if (!line || line.requestedQtyValue <= 0) {
      setPanelError('Vui lòng nhập số lượng yêu cầu trước khi phân bổ FEFO.')
      return
    }
    const d = getLineDerived(line)
    let remain = line.requestedQtyValue
    const nextRows: AllocationRow[] = []
    for (const lot of d.lots) {
      if (remain <= 0) break
      const lotAvailable = toNumeric(lot.currentQtyBase)
      const exportQty = Math.min(remain, lotAvailable)
      if (exportQty <= 0) continue
      nextRows.push({
        batchId: lot.id,
        lotNo: lot.lotNo,
        expiryDate: lot.expiryDate,
        availableQty: lotAvailable,
        exportQty,
        inputValue: formatQuantity(exportQty),
        manufacturerName: lot.manufacturerName ?? null,
        locationCode: lot.location?.code ?? null,
        locationName: lot.location?.name ?? null,
        exportDate: null,
      })
      remain -= exportQty
    }
    updateLine(idx, (l) => ({ ...l, allocationRows: nextRows }))
    setPanelError(remain > 0 ? 'Tồn kho hiện tại không đủ để đáp ứng toàn bộ số lượng yêu cầu.' : null)
  }

  const addLotToLine = (idx: number, lot: InventoryStockBatch) => {
    if (disabled) return
    updateLine(idx, (l) => {
      if (l.allocationRows.some((r) => r.batchId === lot.id)) return l
      const prevAllocated = l.allocationRows.reduce((s, r) => s + r.exportQty, 0)
      const maxAssignable = Math.max(l.requestedQtyValue - prevAllocated, 0)
      const availableQty = toNumeric(lot.currentQtyBase)
      const defaultQty = maxAssignable > 0 ? Math.min(maxAssignable, availableQty) : 0
      return {
        ...l,
        allocationRows: [
          ...l.allocationRows,
          {
            batchId: lot.id,
            lotNo: lot.lotNo,
            expiryDate: lot.expiryDate,
            availableQty,
            exportQty: defaultQty,
            inputValue: defaultQty > 0 ? formatQuantity(defaultQty) : '',
            manufacturerName: lot.manufacturerName ?? null,
            locationCode: lot.location?.code ?? null,
            locationName: lot.location?.name ?? null,
            exportDate: null,
          },
        ],
      }
    })
  }

  const removeAllocationRow = (lineIdx: number, batchId: string) => {
    if (disabled) return
    updateLine(lineIdx, (l) => ({ ...l, allocationRows: l.allocationRows.filter((r) => r.batchId !== batchId) }))
  }

  const updateAllocationInput = (lineIdx: number, batchId: string, raw: string) => {
    if (disabled) return
    updateLine(lineIdx, (l) => ({
      ...l,
      allocationRows: l.allocationRows.map((r) => (r.batchId === batchId ? { ...r, inputValue: raw } : r)),
    }))
  }

  const commitAllocationInput = (lineIdx: number, batchId: string) => {
    if (disabled) return
    updateLine(lineIdx, (l) => ({
      ...l,
      allocationRows: l.allocationRows.map((r) => {
        if (r.batchId !== batchId) return r
        if (!r.inputValue.trim()) return { ...r, exportQty: 0, inputValue: '' }
        const parsed = parseDecimalInput(r.inputValue)
        if (!Number.isFinite(parsed) || parsed < 0) {
          setPanelError(`Số lượng xuất của lô ${r.lotNo} không hợp lệ.`)
          return r
        }
        const normalized = Math.min(parsed, r.availableQty)
        return { ...r, exportQty: normalized, inputValue: normalized > 0 ? formatQuantity(normalized) : '' }
      }),
    }))
  }

  const updateAllocationDate = (lineIdx: number, batchId: string, date: Date | null) => {
    if (disabled) return
    updateLine(lineIdx, (l) => ({
      ...l,
      allocationRows: l.allocationRows.map((r) => (r.batchId === batchId ? { ...r, exportDate: date } : r)),
    }))
  }

  // ── Render ──
  // Per-line disabled state: full disabled, OR lockExistingLines for locked keys
  const isLineDisabled = (lineKey: string) =>
    disabled || (lockExistingLines && lockedLineKeysRef.current.has(lineKey))

  return (
    <div>
      {panelError && (
        <div className="catalog-inline-notice error" style={{ margin: '0 0 12px' }}>
          <span>{panelError}</span>
          <button
            type="button"
            className="catalog-inline-notice-close"
            onClick={() => setPanelError(null)}
            aria-label="Đóng thông báo"
          >×</button>
        </div>
      )}

      <div className="outbound-layout">
        {/* ── Drill-down flow: one node per material line ── */}
        <div className="ob-drill-flow">
          {lines.map((line, idx) => {
            const lineMat = materials.find((m) => m.id === line.materialId)
            const d = getLineDerived(line)
            const isActive = idx === activeLineIdx
            const isExpanded = Boolean(line.materialId)
            const allocPercent = line.requestedQtyValue > 0
              ? Math.min(100, Math.round((d.allocatedQty / line.requestedQtyValue) * 100))
              : 0
            const statusLabel = allocPercent >= 100 ? 'Đủ' : (allocPercent > 0 ? 'Một phần' : 'Chưa phân bổ')

            return (
              <div key={line.key} className={`ob-drill-node${isExpanded ? ' expanded' : ''}${isActive ? ' active-node' : ''}`}>
                {/* LEFT: Material card */}
                <div
                  className={`po-drill-node-card${isActive ? ' active' : ''}`}
                  onClick={() => setActiveLineIdx(idx)}
                >
                  <div className="po-drill-node-icon" aria-hidden>
                    <i className="pi pi-box" />
                  </div>

                  <div className="po-drill-node-main">
                    <div className="ob-drill-mat-select">
                      <Dropdown
                        value={line.materialId}
                        options={materialOptions}
                        onChange={(e) => { void handleLineMaterialChange(idx, String(e.value ?? '')) }}
                        placeholder="Chọn nguyên liệu..."
                        className="ob-drill-dropdown"
                        filter
                        showClear
                        disabled={loading || isLineDisabled(line.key)}
                      />
                    </div>

                    {lineMat && (
                      <div className="ob-drill-mat-meta">
                        <span>{lineMat.code}</span>
                        <span className={`po-drill-node-chip ${statusLabel === 'Đủ' ? 'done' : statusLabel === 'Một phần' ? 'partial' : 'none'}`}>{statusLabel}</span>
                      </div>
                    )}

                    {lineMat && (
                      <div className="ob-drill-qty-row">
                        <div className="ob-drill-qty-input-wrap">
                          <small>SL yêu cầu ({lineMat.unit})</small>
                          <InputText
                            value={line.requestedQtyInput}
                            onChange={(e) => handleLineQtyChange(idx, e.target.value)}
                            onFocus={() => handleLineQtyFocus(idx)}
                            onBlur={() => handleLineQtyBlur(idx)}
                            placeholder="Nhập SL"
                            className="ob-drill-qty-input"
                            disabled={isLineDisabled(line.key)}
                          />
                        </div>
                        <div className="ob-drill-stock-info">
                          <small>Tồn kho</small>
                          <strong>{formatQuantity(d.totalStockQty)} {lineMat.unit}</strong>
                        </div>
                        <Button
                          icon="pi pi-bolt"
                          className="ob-fefo-icon-btn"
                          outlined
                          rounded
                          size="small"
                          onClick={() => applyFefoAutoAllocation(idx)}
                          disabled={isLineDisabled(line.key) || !line.materialId || line.requestedQtyValue <= 0 || d.lots.length === 0}
                          tooltip="Tự phân bổ FEFO"
                          tooltipOptions={{ position: 'top' }}
                        />
                      </div>
                    )}

                    {lineMat && d.suggestedLots.length > 0 && (
                      <div className="ob-drill-fefo-hints">
                        <small>Gợi ý FEFO:</small>
                        {d.suggestedLots.slice(0, 3).map((lot) => {
                          const expTag = calculateExpTag(lot.expiryDate)
                          return (
                            <button
                              key={lot.id}
                              type="button"
                              className="ob-drill-fefo-hint-btn"
                              onClick={() => addLotToLine(idx, lot)}
                              disabled={isLineDisabled(line.key)}
                              title={`${lot.lotNo} – Tồn: ${formatQuantity(toNumeric(lot.currentQtyBase))} – HSD: ${formatDateVi(lot.expiryDate)}${lot.location ? ` – Kho: ${lot.location.name}` : ''}`}
                            >
                              <Tag value={lot.lotNo} severity={expTag.severity === 'danger' ? 'danger' : expTag.severity === 'warning' ? 'warning' : 'success'} />
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {lineMat && line.requestedQtyValue > 0 && (
                      <div className="po-drill-node-progress-wrap">
                        <div className="po-drill-node-progress-head">
                          <span>Phân bổ: <strong>{formatQuantity(d.allocatedQty)} / {formatQuantity(line.requestedQtyValue)} {lineMat.unit}</strong></span>
                          <strong className="po-drill-node-progress-percent">{allocPercent}%</strong>
                        </div>
                        <div className="po-drill-node-progress-track">
                          <div className="po-drill-node-progress-bar" style={{ width: `${allocPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {d.hasShortage && (
                      <div className="ob-drill-shortage">
                        <div className="ob-drill-shortage-head">
                          <i className="pi pi-exclamation-triangle" aria-hidden />
                          <strong>Thiếu {formatQuantity(d.shortageQty)} {lineMat?.unit ?? ''}</strong>
                        </div>
                        <label className="outbound-shortage-confirm">
                          <Checkbox
                            checked={line.shortageAcknowledged}
                            onChange={(e: CheckboxChangeEvent) => updateLine(idx, (l) => ({ ...l, shortageAcknowledged: Boolean(e.checked) }))}
                            disabled={isLineDisabled(line.key)}
                          />
                          <span>Xác nhận xuất thiếu</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="ob-drill-node-actions">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className="po-drill-node-toggle"
                        onClick={(e) => { e.stopPropagation(); removeLine(idx) }}
                        aria-label={`Xóa dòng ${idx + 1}`}
                        title="Xóa dòng"
                        disabled={isLineDisabled(line.key)}
                      >
                        <i className="pi pi-trash" style={{ color: '#ef4444', fontSize: '0.85rem' }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT: Allocation lot branch */}
                {isExpanded && (
                  <div className="po-drill-branch-list">
                    {line.allocationRows.length === 0 && (
                      <p className="purchase-side-note">Chưa có lô nào được phân bổ. Nhấn "Tự phân bổ FEFO" hoặc chọn lô từ gợi ý.</p>
                    )}

                    {line.allocationRows.map((row) => {
                      const expTag = calculateExpTag(row.expiryDate)
                      const lineMaterial = materials.find((m) => m.id === line.materialId)
                      return (
                        <div key={row.batchId} className="po-drill-branch-item">
                          <div className="ob-drill-branch-lot-row">
                            <strong>{row.lotNo}</strong>
                            <Tag value={expTag.label} severity={expTag.severity} />
                            <span className="ob-drill-branch-exp">
                              <i className="pi pi-clock" aria-hidden /> HSD: {formatDateVi(row.expiryDate)}
                            </span>
                            {row.manufacturerName ? <span style={{ fontSize: 12, color: '#6b7280' }}><i className="pi pi-building" aria-hidden /> {row.manufacturerName}</span> : null}
                            {row.locationName ? <span style={{ fontSize: 12, color: '#6b7280' }}><i className="pi pi-map-marker" aria-hidden /> {row.locationName}</span> : null}
                          </div>

                          <div className="ob-drill-branch-fields">
                            <div className="ob-drill-branch-qty-col">
                              <span>TỒN KHO</span>
                              <strong>{formatQuantity(row.availableQty)} {lineMaterial?.unit ?? ''}</strong>
                            </div>
                            <div className="ob-drill-branch-export-col">
                              <span>SỐ LƯỢNG XUẤT</span>
                              <InputText
                                value={row.inputValue}
                                onChange={(e) => updateAllocationInput(idx, row.batchId, e.target.value)}
                                onFocus={() => {
                                  setActiveLineIdx(idx)
                                  updateAllocationInput(idx, row.batchId, toEditableNumberString(row.exportQty))
                                }}
                                onBlur={() => commitAllocationInput(idx, row.batchId)}
                                placeholder="0"
                                className="ob-drill-branch-input"
                                disabled={isLineDisabled(line.key)}
                              />
                            </div>
                            <div className="ob-drill-branch-date-col">
                              <span>NGÀY XUẤT KHO</span>
                              <Calendar
                                value={row.exportDate}
                                onChange={(e) => updateAllocationDate(idx, row.batchId, e.value as Date | null)}
                                dateFormat="dd/mm/yy"
                                placeholder="Chọn ngày"
                                showIcon
                                disabled={isLineDisabled(line.key)}
                                className="ob-drill-branch-date-input"
                              />
                            </div>
                            <div className="ob-drill-branch-action-col">
                              <button
                                type="button"
                                className="po-drill-node-toggle"
                                onClick={() => removeAllocationRow(idx, row.batchId)}
                                aria-label={`Xóa lô ${row.lotNo}`}
                                title="Xóa lô"
                                disabled={isLineDisabled(line.key)}
                              >
                                <i className="pi pi-times" style={{ color: '#ef4444', fontSize: '0.8rem' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── FEFO sidebar ── */}
        <div ref={fefoWrapRef} className="outbound-fefo-wrap">
          <aside ref={fefoPanelRef} className="outbound-fefo-panel">
            <header>
              <div className="outbound-fefo-title">
                <i className="pi pi-exclamation-triangle" aria-hidden />
                <h3>Gợi ý FEFO</h3>
              </div>
              {activeLineMaterial && (
                <Tag value={activeLineMaterial.materialName} severity="info" rounded />
              )}
              <Tag value="Ưu tiên Exp Date" severity="warning" rounded />
              <p className="outbound-fefo-desc">
                Danh sách lô có hạn dùng gần nhất cho nguyên liệu đang chọn.
              </p>
            </header>

            <div className="outbound-fefo-list">
              {activeLineDerived?.suggestedLots.map((lot) => {
                const expTag = calculateExpTag(lot.expiryDate)
                const shouldShowUrgentTag = expTag.severity === 'danger'
                const severityClass = `outbound-fefo-item--${expTag.severity}`
                return (
                  <article key={lot.id} className={`outbound-fefo-item ${severityClass}`}>
                    <div className="outbound-fefo-item-copy">
                      <div className="outbound-fefo-item-top">
                        <strong className="outbound-fefo-lot">{lot.lotNo}</strong>
                        {shouldShowUrgentTag ? <Tag value={expTag.label} severity={expTag.severity} /> : null}
                      </div>
                      <div className="outbound-fefo-item-meta">
                        <span className="outbound-fefo-expiry"><i className="pi pi-clock" aria-hidden />HSD: {formatDateVi(lot.expiryDate)}</span>
                        <small>Tồn: {formatQuantity(toNumeric(lot.currentQtyBase))} {activeLineMaterial?.unit ?? ''}</small>
                        {lot.manufacturerName ? <small><i className="pi pi-building" aria-hidden /> {lot.manufacturerName}</small> : null}
                        {lot.location ? <small><i className="pi pi-map-marker" aria-hidden /> {lot.location.name}</small> : null}
                      </div>
                    </div>
                    <span className="outbound-fefo-divider" aria-hidden />
                    <button
                      type="button"
                      className="outbound-fefo-add"
                      onClick={() => addLotToLine(activeLineIdx, lot)}
                      aria-label={`Thêm lô ${lot.lotNo}`}
                      title="Thêm vào phân bổ"
                      disabled={isLineDisabled(lines[activeLineIdx]?.key ?? '')}
                    >
                      <i className="pi pi-arrow-right" aria-hidden />
                    </button>
                  </article>
                )
              })}

              {(!activeLineDerived || activeLineDerived.suggestedLots.length === 0) && (
                <p className="outbound-empty">Chưa có lô gợi ý. Hãy chọn nguyên liệu.</p>
              )}
            </div>

            <footer className="outbound-fefo-rules">
              <strong>Nguyên tắc xuất FEFO</strong>
              <div className="outbound-fefo-rule-flow" aria-label="Quy tắc xuất FEFO">
                <span>HSD gần nhất</span>
                <i className="pi pi-angle-right" aria-hidden />
                <span>Ưu tiên xuất trước</span>
                <i className="pi pi-angle-right" aria-hidden />
                <span>Giảm tồn quá hạn</span>
              </div>
              <p className="outbound-fefo-remain">
                Còn thiếu: {formatQuantity(activeLineDerived?.remainingQty ?? 0)} {activeLineMaterial?.unit ?? ''}
              </p>
            </footer>
          </aside>
        </div>
      </div>

      {/* ── Add line button ── */}
      <div className="outbound-bottom-actions" style={{ paddingBottom: 0 }}>
        <Button
          label="Thêm nguyên liệu"
          icon="pi pi-plus"
          outlined
          className="outbound-add-line-btn"
          onClick={addLine}
          disabled={loading || disabled || anyStockLoading}
        />
      </div>
    </div>
  )
}
