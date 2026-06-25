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
import { safeRandomId } from '../../lib/uuid'
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
  locationId: string | null
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
  locationId?: string
  requestedQtyValue: number
  requestedQtyInput: string
  requestedQtyFocused: boolean
  allocationRows: AllocationRow[]
  shortageAcknowledged: boolean
  stockRows: InventoryStockBatch[]
  fefoSuggestions: InventoryStockBatch[]
  stockLoading: boolean
  stockFetchError: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEmptyLine(): MaterialLine {
  return {
    key: safeRandomId(),
    materialId: '',
    materialCode: '',
    materialName: '',
    materialUnit: '',
    locationId: undefined,
    requestedQtyValue: 0,
    requestedQtyInput: '',
    requestedQtyFocused: false,
    allocationRows: [],
    shortageAcknowledged: false,
    stockRows: [],
    fefoSuggestions: [],
    stockLoading: false,
    stockFetchError: null,
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
  const stockLoaded = line.stockRows.length > 0
  const allocatedQty = line.allocationRows.reduce((s, r) => s + r.exportQty, 0)
  const shortageQty = Math.max(line.requestedQtyValue - totalStockQty, 0)
  // Only show shortage when stock data is actually loaded — prevents false "Thiếu" before/after fetch
  const hasShortage = shortageQty > 0 && line.requestedQtyValue > 0 && !line.stockLoading && stockLoaded
  const remainingQty = Math.max(line.requestedQtyValue - allocatedQty, 0)
  const suggestedLots = line.fefoSuggestions.filter(
    (lot) => !line.allocationRows.some((r) => r.batchId === lot.id),
  )
  return { lots, totalStockQty, stockLoaded, allocatedQty, shortageQty, hasShortage, remainingQty, suggestedLots }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  /** Disable all editing (view-only mode) */
  disabled?: boolean
  /** Lock existing lines (from initialLines) but still allow adding new lines */
  lockExistingLines?: boolean
  /** Show a separate material-code dropdown next to the material-name dropdown */
  showMaterialCodeDropdown?: boolean
  /** Called whenever the lines array changes */
  onLinesChange?: (lines: MaterialLine[]) => void
  /** Pre-populate lines (e.g. from saved data) – applied once on mount */
  initialLines?: MaterialLine[]
  /** Global fallback location for stock queries (used when per-line location not set) */
  locationId?: string
  /** List of warehouse locations for per-line selection */
  locations?: { label: string; value: string }[]
  /** Report stock as-of this date (ISO string); used in production to match processedAt */
  asOfDate?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutboundMaterialPanel({ disabled = false, lockExistingLines = false, showMaterialCodeDropdown = false, onLinesChange, initialLines, locationId, locations, asOfDate }: Props) {
  const fefoWrapRef = useRef<HTMLDivElement>(null)
  const fefoPanelRef = useRef<HTMLElement>(null)
  const linesRef = useRef<MaterialLine[]>([])

  const [materialOptions, setMaterialOptions] = useState<SelectOption[]>([])
  const [materialCodeOptions, setMaterialCodeOptions] = useState<SelectOption[]>([])
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
    const sameRef = initialLinesRef.current === initialLines
    console.log('[OutboundPanel] initialLines effect triggered', {
      hasLines: !!initialLines,
      count: initialLines?.length ?? 0,
      sameRef,
      asOfDate,
    })
    if (initialLines && initialLines.length > 0 && !sameRef) {
      initialLinesRef.current = initialLines
      setLines(initialLines)
      setActiveLineIdx(0)
      // Refresh locked keys when initial lines are set (e.g. after async load)
      lockedLineKeysRef.current = new Set(initialLines.map(l => l.key))

      // Load stock for each pre-populated line that has a materialId AND locationId but no stock data yet
      initialLines.forEach((line) => {
        if (!line.materialId || line.stockRows.length > 0) return
        const lineLocId = line.locationId ?? locationId
        if (!lineLocId) {
          console.log('[OutboundPanel] skip stock fetch — no locationId for line', line.materialId)
          return
        }
        console.log('[OutboundPanel] fetching stock for', line.materialId, 'loc', lineLocId, 'asOfDate', asOfDate)
        setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockLoading: true } : l))
        Promise.all([
          fetchInventoryStock(line.materialId, lineLocId, asOfDate),
          fetchFefoSuggestions(line.materialId, 6, lineLocId, asOfDate),
        ])
          .then(([stock, fefo]) => {
            console.log('[OutboundPanel] stock result for', line.materialId, '→', stock.length, 'rows')
            setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false, stockFetchError: null } : l))
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[OutboundPanel] stock fetch failed for', line.materialId, ':', msg)
            setLines((prev) => prev.map((l) => l.key === line.key ? { ...l, stockLoading: false, stockFetchError: msg } : l))
          })
      })
    }
  }, [initialLines])

  // Keep ref in sync with latest lines (used by location/date-change reload effect)
  useEffect(() => { linesRef.current = lines }, [lines])

  // Reload stock when global locationId or asOfDate changes (for lines without per-line location)
  const prevLocationIdRef = useRef<string | undefined>(undefined)
  const prevAsOfDateRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prevLoc = prevLocationIdRef.current
    const prevDate = prevAsOfDateRef.current
    prevLocationIdRef.current = locationId
    prevAsOfDateRef.current = asOfDate
    if (prevLoc === undefined && prevDate === undefined) return
    if (prevLoc === locationId && prevDate === asOfDate) return
    const currentLines = linesRef.current
    currentLines.forEach((line, idx) => {
      if (!line.materialId) return
      // Only reload lines that haven't set their own per-line location
      if (line.locationId) return
      // MUST have a fallback location to reload
      if (!locationId) return
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
        setMaterialOptions(rows.map((r) => ({ value: r.id, label: r.materialName })))
        setMaterialCodeOptions(rows.map((r) => ({ value: r.id, label: r.code })))
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
    const lineLocId = lines[idx]?.locationId ?? locationId
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
      stockLoading: Boolean(newMaterialId && lineLocId),
    }))
    setActiveLineIdx(idx)
    if (!newMaterialId || !lineLocId) return // MUST have location before loading stock
    try {
      const [stock, fefo] = await Promise.all([
        fetchInventoryStock(newMaterialId, lineLocId, asOfDate),
        fetchFefoSuggestions(newMaterialId, 6, lineLocId, asOfDate),
      ])
      updateLine(idx, (l) => ({ ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false, stockFetchError: null }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err)
      console.error('[OutboundPanel] stock fetch (material change) failed:', msg)
      updateLine(idx, (l) => ({ ...l, stockLoading: false, stockFetchError: msg }))
    }
  }

  const handleLineLocationChange = async (idx: number, newLocationId: string | null) => {
    if (disabled) return
    const line = lines[idx]
    if (!line) return
    updateLine(idx, (l) => ({
      ...l,
      locationId: newLocationId ?? undefined,
      stockRows: [],
      fefoSuggestions: [],
      stockLoading: Boolean(l.materialId && newLocationId),
    }))
    if (!line.materialId || !newLocationId) return // MUST have location before loading stock
    try {
      const [stock, fefo] = await Promise.all([
        fetchInventoryStock(line.materialId, newLocationId, asOfDate),
        fetchFefoSuggestions(line.materialId, 6, newLocationId, asOfDate),
      ])
      updateLine(idx, (l) => ({ ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false, stockFetchError: null }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err)
      console.error('[OutboundPanel] stock fetch (location change) failed:', msg)
      updateLine(idx, (l) => ({ ...l, stockLoading: false, stockFetchError: msg }))
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
    const lineLocId = line.locationId ?? locationId
    if (!lineLocId) {
      setPanelError('Vui lòng chọn kho xuất trước khi phân bổ FEFO.')
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
        locationId: lot.location?.id ?? null,
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
            locationId: lot.location?.id ?? null,
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
                    <div className={`ob-drill-mat-row${showMaterialCodeDropdown ? ' ob-drill-mat-row--three' : ''}`}>
                      {showMaterialCodeDropdown && (
                        <div className="ob-drill-mat-select">
                          <Dropdown
                            value={line.materialId}
                            options={materialCodeOptions}
                            onChange={(e) => { void handleLineMaterialChange(idx, String(e.value ?? '')) }}
                            placeholder="Chọn mã..."
                            className="ob-drill-dropdown"
                            filter
                            showClear
                            disabled={loading || isLineDisabled(line.key)}
                          />
                        </div>
                      )}

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

                      {locations && locations.length > 0 && (
                        <div className="ob-drill-mat-select">
                          <Dropdown
                            value={line.locationId ?? null}
                            options={locations}
                            onChange={(e) => { void handleLineLocationChange(idx, e.value as string | null) }}
                            placeholder="Kho xuất..."
                            className="ob-drill-dropdown"
                            filter
                            showClear
                            disabled={isLineDisabled(line.key)}
                          />
                          {!line.locationId && line.materialId && (
                            <small style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, fontSize: 10, fontWeight: 600 }}>
                              <i className="pi pi-times-circle" />Phải chọn kho để xem tồn
                            </small>
                          )}
                        </div>
                      )}
                    </div>

                    {lineMat && (

                      <div className="ob-drill-qty-combined-row">
                        <div className="ob-drill-qty-input-wrap">
                          <small>Yêu cầu ({lineMat.unit})</small>
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
                          {line.stockLoading
                            ? <strong style={{ color: '#94a3b8', fontStyle: 'italic' }}><i className="pi pi-spin pi-spinner" style={{ fontSize: 11, marginRight: 4 }} />Đang tải</strong>
                            : d.stockLoaded
                              ? <strong>{formatQuantity(d.totalStockQty)} {lineMat.unit}</strong>
                              : <strong style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  —
                                  {line.materialId && line.locationId && (
                                    <button
                                      type="button"
                                      title="Tải lại tồn kho"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5269e0', padding: 0, lineHeight: 1 }}
                                      onClick={() => handleLineLocationChange(idx, line.locationId ?? null)}
                                    >
                                      <i className="pi pi-refresh" style={{ fontSize: 11 }} />
                                    </button>
                                  )}
                                  {line.stockFetchError && (
                                    <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 400, maxWidth: 180, whiteSpace: 'normal', lineHeight: 1.3 }}
                                      title={line.stockFetchError}>
                                      {line.stockFetchError.length > 60 ? line.stockFetchError.slice(0, 57) + '…' : line.stockFetchError}
                                    </span>
                                  )}
                                </strong>
                          }
                        </div>
                        {line.requestedQtyValue > 0 && (
                          <div className="ob-drill-progress-inline">
                            <div className="ob-drill-progress-track">
                              <div
                                className="ob-drill-progress-bar"
                                style={{
                                  width: `${allocPercent}%`,
                                  background: allocPercent >= 100
                                    ? (d.hasShortage ? '#ef4444' : '#16a34a')
                                    : allocPercent > 0 ? '#f59e0b' : '#5269e0',
                                }}
                              />
                            </div>
                            <span
                              className="ob-drill-progress-pct"
                              style={{
                                color: allocPercent >= 100
                                  ? (d.hasShortage ? '#ef4444' : '#16a34a')
                                  : allocPercent > 0 ? '#f59e0b' : '#5269e0',
                              }}
                            >{allocPercent}%</span>
                          </div>
                        )}
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
