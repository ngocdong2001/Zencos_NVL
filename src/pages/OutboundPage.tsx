import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Tag } from 'primereact/tag'
import { Checkbox, type CheckboxChangeEvent } from 'primereact/checkbox'
import { fetchBasics, fetchMaterials } from '../lib/catalogApi'
import type { BasicRow, MaterialRow } from '../components/catalog/types'
import {
  cancelExportOrder,
  createExportOrder,
  createExportVoidRerelease,
  fetchExportOrderDetail,
  fetchExportOrderHistory,
  fetchFefoSuggestions,
  fetchInventoryStock,
  fulfilExportOrder,
  updateExportOrder,
  type ExportOrderStatus,
  type InventoryStockBatch,
} from '../lib/outboundApi'
import { formatQuantity, parseDecimalInput, toEditableNumberString } from '../components/purchaseOrder/format'
import { showConfirmAction, showDangerConfirm } from '../lib/confirm'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'

type SelectOption = { label: string; value: string }

type AllocationRow = {
  batchId: string
  lotNo: string
  expiryDate: string | null
  availableQty: number
  exportQty: number
  inputValue: string
}

type MaterialLine = {
  key: string
  materialId: string
  requestedQtyValue: number
  requestedQtyInput: string
  requestedQtyFocused: boolean
  allocationRows: AllocationRow[]
  shortageAcknowledged: boolean
  stockRows: InventoryStockBatch[]
  fefoSuggestions: InventoryStockBatch[]
  stockLoading: boolean
}

function createEmptyLine(): MaterialLine {
  return {
    key: crypto.randomUUID(),
    materialId: '',
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

function buildOutboundRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `XK-${yyyy}${mm}${dd}-${hh}${min}${ss}`
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

export function OutboundPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const isEditMode = Boolean(orderId)

  const fefoWrapRef = useRef<HTMLDivElement>(null)
  const fefoPanelRef = useRef<HTMLElement>(null)

  const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([])
  const [customerRows, setCustomerRows] = useState<BasicRow[]>([])
  const [materialOptions, setMaterialOptions] = useState<SelectOption[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<MaterialLine[]>([createEmptyLine()])
  const [activeLineIdx, setActiveLineIdx] = useState(0)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [editingOrderRef, setEditingOrderRef] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<ExportOrderStatus | null>(null)
  const [canMarkFulfilled, setCanMarkFulfilled] = useState(true)
  const [fulfilBlockedReason, setFulfilBlockedReason] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<'fulfil' | 'cancel' | 'adjust' | null>(null)
  const [sourceOrderId, setSourceOrderId] = useState<string | null>(null)
  const [adjustedByOrderId, setAdjustedByOrderId] = useState<string | null>(null)

  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const isLockedEditMode = isEditMode && (editingStatus === 'fulfilled' || editingStatus === 'cancelled')
  const isFulfilledViewMode = isEditMode && editingStatus === 'fulfilled'
  const isCancelledViewMode = isEditMode && editingStatus === 'cancelled'

  const loadHistory = async (id: string) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows = await fetchExportOrderHistory(id)
      setHistoryEvents(rows.map((r) => ({
        id: r.id,
        actionType: r.actionType,
        action: r.actionLabel,
        actorName: r.actorName,
        at: r.createdAt,
      })))
    } catch (err) {
      setHistoryEvents([])
      setHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử thao tác.')
    } finally {
      setHistoryLoading(false)
    }
  }

  /* ── JS-based sticky for FEFO panel (bypass CSS overflow blocking) ── */
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

  /* ── derived values for FEFO sidebar (active line) ── */
  const activeLine = lines[activeLineIdx] ?? lines[0] ?? null
  const activeLineMaterial = useMemo(
    () => (activeLine ? materials.find((m) => m.id === activeLine.materialId) ?? null : null),
    [activeLine, materials],
  )
  const activeLineDerived = useMemo(
    () => (activeLine ? getLineDerived(activeLine) : null),
    [activeLine],
  )

  const updateLine = (idx: number, updater: (line: MaterialLine) => MaterialLine) => {
    if (isLockedEditMode) return
    setLines((prev) => prev.map((l, i) => (i === idx ? updater(l) : l)))
  }

  const usedMaterialIds = useMemo(
    () => new Set(lines.map((l) => l.materialId).filter(Boolean)),
    [lines],
  )

  const selectedCustomer = useMemo(
    () => customerRows.find((row) => row.id === customerId) ?? null,
    [customerRows, customerId],
  )

  /* ── initial data + edit load ── */
  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setFormError(null)
      try {
        const [customers, catalogMaterials] = await Promise.all([
          fetchBasics('customers'),
          fetchMaterials(),
        ])
        if (cancelled) return

        setCustomerOptions(
          customers
            .filter((r: BasicRow) => r.id && r.name)
            .map((r: BasicRow) => ({
              value: r.id,
              label: r.code ? `${r.code} - ${r.name}` : r.name,
            })),
        )
        setCustomerRows(customers.filter((r: BasicRow) => r.id && r.name))
        setMaterials(catalogMaterials)
        setMaterialOptions(
          catalogMaterials.map((r) => ({
            value: r.id,
            label: `${r.materialName} (${r.code})`,
          })),
        )

        if (isEditMode && orderId) {
          const detail = await fetchExportOrderDetail(orderId)
          if (cancelled) return

          setEditingStatus(detail.status)
          setSourceOrderId(detail.sourceOrder?.id ?? null)
          setAdjustedByOrderId(detail.adjustedByOrder?.id ?? null)
          setFormSuccess(null)
          setEditingOrderRef(detail.orderRef)
          setCustomerId(detail.customer?.id ?? '')

          const blockingPR = detail.purchaseRequests.find((pr) =>
            pr.items.some((item) => toNumeric(item.receivedQtyBase) + 0.0001 < toNumeric(item.quantityNeededBase)),
          )
          if (blockingPR) {
            setCanMarkFulfilled(false)
            setFulfilBlockedReason(`PO liên quan ${blockingPR.requestRef} chưa nhận đủ hàng theo số lượng yêu cầu.`)
          }

          /* Group items by productId → reconstruct MaterialLines */
          const itemsByProduct = new Map<string, typeof detail.items>()
          for (const item of detail.items) {
            const pid = item.product.id
            if (!itemsByProduct.has(pid)) itemsByProduct.set(pid, [])
            itemsByProduct.get(pid)!.push(item)
          }

          const hasShortageNotes = detail.notes?.startsWith('[XUẤT THIẾU]')

          const editLines: MaterialLine[] = []
          for (const [productId, productItems] of itemsByProduct) {
            const requestRecord = productItems.find((item) => !item.batch)
            const requestedQty = requestRecord
              ? toNumeric(requestRecord.quantityBase)
              : productItems.reduce((sum, item) => sum + toNumeric(item.quantityBase), 0)

            const allocationRows: AllocationRow[] = productItems
              .filter((item) => item.batch)
              .map((item) => ({
                batchId: item.batch!.id,
                lotNo: item.batch!.lotNo,
                expiryDate: item.batch!.expiryDate,
                availableQty: toNumeric(item.quantityBase),
                exportQty: toNumeric(item.quantityBase),
                inputValue: formatQuantity(toNumeric(item.quantityBase)),
              }))

            editLines.push({
              key: crypto.randomUUID(),
              materialId: productId,
              requestedQtyValue: requestedQty,
              requestedQtyInput: requestedQty > 0 ? formatQuantity(requestedQty) : '',
              requestedQtyFocused: false,
              allocationRows,
              shortageAcknowledged: Boolean(hasShortageNotes),
              stockRows: [],
              fefoSuggestions: [],
              stockLoading: true,
            })
          }

          /* Load stock for every material in parallel */
          const stockResults = await Promise.all(
            editLines.map(async (line) => {
              if (!line.materialId) return { stock: [] as InventoryStockBatch[], fefo: [] as InventoryStockBatch[] }
              try {
                const [stock, fefo] = await Promise.all([
                  fetchInventoryStock(line.materialId),
                  fetchFefoSuggestions(line.materialId, 6),
                ])
                return { stock, fefo }
              } catch {
                return { stock: [] as InventoryStockBatch[], fefo: [] as InventoryStockBatch[] }
              }
            }),
          )
          if (cancelled) return

          const finalLines = editLines.map((line, i) => {
            const { stock, fefo } = stockResults[i]
            const allocatedByBatch = new Map<string, number>()
            for (const row of line.allocationRows) {
              allocatedByBatch.set(row.batchId, (allocatedByBatch.get(row.batchId) ?? 0) + row.exportQty)
            }
            const shouldRestoreCurrentOrderAllocation = detail.status === 'fulfilled'

            // Restore current order allocation only for fulfilled orders.
            // Pending drafts no longer deduct stock, so we keep API stock as-is.
            const restoredStock = stock.map((lot) => ({
              ...lot,
              currentQtyBase: toNumeric(lot.currentQtyBase)
                + (shouldRestoreCurrentOrderAllocation ? (allocatedByBatch.get(lot.id) ?? 0) : 0),
            }))

            const restoredFefo = fefo.map((lot) => ({
              ...lot,
              currentQtyBase: toNumeric(lot.currentQtyBase)
                + (shouldRestoreCurrentOrderAllocation ? (allocatedByBatch.get(lot.id) ?? 0) : 0),
            }))

            const stockMap = new Map(restoredStock.map((lot) => [lot.id, toNumeric(lot.currentQtyBase)]))
            return {
              ...line,
              stockRows: restoredStock,
              fefoSuggestions: restoredFefo,
              stockLoading: false,
              allocationRows: line.allocationRows.map((row) => ({
                ...row,
                availableQty: stockMap.get(row.batchId) ?? row.exportQty,
              })),
            }
          })

          setLines(finalLines.length > 0 ? finalLines : [createEmptyLine()])
          setActiveLineIdx(0)
        }
      } catch (error) {
        if (cancelled) return
        setFormError(error instanceof Error ? error.message : 'Không thể tải dữ liệu xuất kho.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => { cancelled = true }
  }, [isEditMode, orderId])

  useEffect(() => {
    if (!orderId) {
      setHistoryEvents([])
      return
    }
    void loadHistory(orderId)
  }, [orderId])

  /* ── line management ── */
  const addLine = () => {
    if (isLockedEditMode) return
    setLines((prev) => [...prev, createEmptyLine()])
    setActiveLineIdx(lines.length)
  }

  const removeLine = (idx: number) => {
    if (isLockedEditMode) return
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== idx))
    setActiveLineIdx((prev) => {
      if (prev >= lines.length - 1) return Math.max(0, lines.length - 2)
      if (prev > idx) return prev - 1
      if (prev === idx) return Math.min(idx, lines.length - 2)
      return prev
    })
  }

  const handleLineMaterialChange = async (idx: number, newMaterialId: string) => {
    if (isLockedEditMode) return
    updateLine(idx, (l) => ({
      ...l,
      materialId: newMaterialId,
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
        fetchInventoryStock(newMaterialId),
        fetchFefoSuggestions(newMaterialId, 6),
      ])
      updateLine(idx, (l) => ({ ...l, stockRows: stock, fefoSuggestions: fefo, stockLoading: false }))
    } catch {
      updateLine(idx, (l) => ({ ...l, stockLoading: false }))
    }
  }

  /* ── per-line qty ── */
  const handleLineQtyChange = (idx: number, raw: string) => {
    if (isLockedEditMode) return
    updateLine(idx, (l) => ({ ...l, requestedQtyInput: raw }))
  }

  const handleLineQtyFocus = (idx: number) => {
    if (isLockedEditMode) return
    setActiveLineIdx(idx)
    updateLine(idx, (l) => ({
      ...l,
      requestedQtyFocused: true,
      requestedQtyInput: toEditableNumberString(l.requestedQtyValue),
    }))
  }

  const handleLineQtyBlur = (idx: number) => {
    if (isLockedEditMode) return
    const line = lines[idx]
    if (!line) return
    const raw = line.requestedQtyInput.trim()
    if (!raw) {
      updateLine(idx, (l) => ({ ...l, requestedQtyFocused: false, requestedQtyValue: 0, requestedQtyInput: '' }))
      return
    }
    const parsed = parseDecimalInput(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Số lượng yêu cầu không hợp lệ. Vui lòng nhập lại.')
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
    setFormError(null)
  }

  /* ── per-line allocation ── */
  const applyFefoAutoAllocation = (idx: number) => {
    if (isLockedEditMode) return
    const line = lines[idx]
    if (!line || line.requestedQtyValue <= 0) {
      setFormError('Vui lòng nhập số lượng yêu cầu trước khi phân bổ FEFO.')
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
      })
      remain -= exportQty
    }
    updateLine(idx, (l) => ({ ...l, allocationRows: nextRows }))
    setFormError(remain > 0 ? 'Tồn kho hiện tại không đủ để đáp ứng toàn bộ số lượng yêu cầu.' : null)
  }

  const addLotToLine = (idx: number, lot: InventoryStockBatch) => {
    if (isLockedEditMode) return
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
          },
        ],
      }
    })
  }

  const removeAllocationRow = (lineIdx: number, batchId: string) => {
    if (isLockedEditMode) return
    updateLine(lineIdx, (l) => ({ ...l, allocationRows: l.allocationRows.filter((r) => r.batchId !== batchId) }))
  }

  const updateAllocationInput = (lineIdx: number, batchId: string, raw: string) => {
    if (isLockedEditMode) return
    updateLine(lineIdx, (l) => ({
      ...l,
      allocationRows: l.allocationRows.map((r) => (r.batchId === batchId ? { ...r, inputValue: raw } : r)),
    }))
  }

  const commitAllocationInput = (lineIdx: number, batchId: string) => {
    if (isLockedEditMode) return
    updateLine(lineIdx, (l) => ({
      ...l,
      allocationRows: l.allocationRows.map((r) => {
        if (r.batchId !== batchId) return r
        if (!r.inputValue.trim()) return { ...r, exportQty: 0, inputValue: '' }
        const parsed = parseDecimalInput(r.inputValue)
        if (!Number.isFinite(parsed) || parsed < 0) {
          setFormError(`Số lượng xuất của lô ${r.lotNo} không hợp lệ.`)
          return r
        }
        const normalized = Math.min(parsed, r.availableQty)
        return { ...r, exportQty: normalized, inputValue: normalized > 0 ? formatQuantity(normalized) : '' }
      }),
    }))
  }

  /* ── validation ── */
  const validateBeforeSubmit = (): boolean => {
    if (!customerId) {
      setFormError('Vui lòng chọn khách hàng hoặc phòng ban nhận hàng.')
      return false
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineMat = materials.find((m) => m.id === line.materialId)
      const label = lineMat ? lineMat.materialName : `Dòng ${i + 1}`

      if (!line.materialId) { setFormError(`${label}: Vui lòng chọn nguyên liệu.`); setActiveLineIdx(i); return false }
      if (line.requestedQtyValue <= 0) { setFormError(`${label}: Số lượng yêu cầu phải lớn hơn 0.`); setActiveLineIdx(i); return false }

      const d = getLineDerived(line)
      if (line.allocationRows.length === 0 && !(d.hasShortage && d.totalStockQty <= 0)) {
        setFormError(`${label}: Vui lòng phân bổ ít nhất một lô hàng.`); setActiveLineIdx(i); return false
      }
      if (d.hasShortage) {
        if (!line.shortageAcknowledged) { setFormError(`${label}: Vui lòng xác nhận xuất thiếu hàng.`); setActiveLineIdx(i); return false }
        if (d.totalStockQty > 0 && line.allocationRows.length === 0) { setFormError(`${label}: Còn tồn kho, vui lòng phân bổ.`); setActiveLineIdx(i); return false }
        if (d.totalStockQty > 0 && Math.abs(d.allocatedQty - d.totalStockQty) > 0.0001 && d.allocatedQty < d.totalStockQty) {
          setFormError(`${label}: Khi xuất thiếu, vui lòng phân bổ hết tồn kho.`); setActiveLineIdx(i); return false
        }
      } else {
        if (Math.abs(d.allocatedQty - line.requestedQtyValue) > 0.0001) {
          setFormError(`${label}: Tổng phân bổ phải bằng đúng số lượng yêu cầu.`); setActiveLineIdx(i); return false
        }
      }
      for (const row of line.allocationRows) {
        if (row.exportQty <= 0) { setFormError(`${label}: Lô ${row.lotNo} chưa có số lượng xuất.`); setActiveLineIdx(i); return false }
        if (row.exportQty > row.availableQty) { setFormError(`${label}: Lô ${row.lotNo} vượt tồn khả dụng.`); setActiveLineIdx(i); return false }
      }
    }
    setFormError(null)
    return true
  }

  /* ── submit ── */
  const submitExport = async () => {
    if (isLockedEditMode) {
      setFormError(editingStatus === 'cancelled' ? 'Phiếu đã hủy nên không thể chỉnh sửa.' : 'Phiếu đã hoàn thành nên không thể chỉnh sửa.')
      return
    }
    if (!validateBeforeSubmit()) return
    if (isEditMode && !orderId) return

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const allItems: Array<{ productId: string; batchId?: string; quantityBase: number; unitUsed: string; quantityDisplay: number }> = []
      const shortages: Array<{ productId: string; requestedQty: number; availableQty: number; shortageQty: number; unitUsed: string }> = []

      for (const line of lines) {
        const mat = materials.find((m) => m.id === line.materialId)
        if (!mat) continue
        const d = getLineDerived(line)

        allItems.push({ productId: mat.id, quantityBase: line.requestedQtyValue, quantityDisplay: line.requestedQtyValue, unitUsed: mat.unit })

        for (const row of line.allocationRows) {
          if (row.exportQty <= 0) continue
          allItems.push({ productId: mat.id, batchId: row.batchId, quantityBase: row.exportQty, quantityDisplay: row.exportQty, unitUsed: mat.unit })
        }

        if (d.hasShortage && line.shortageAcknowledged) {
          shortages.push({ productId: mat.id, requestedQty: line.requestedQtyValue, availableQty: d.totalStockQty, shortageQty: d.shortageQty, unitUsed: mat.unit })
        }
      }

      const shortageNote = shortages.length > 0
        ? `[XUẤT THIẾU] ${shortages.map((s) => { const mat = materials.find((m) => m.id === s.productId); return `${mat?.materialName ?? s.productId}: YC ${formatQuantity(s.requestedQty)}, Tồn ${formatQuantity(s.availableQty)}, Thiếu ${formatQuantity(s.shortageQty)} ${s.unitUsed}` }).join('; ')}`
        : undefined

      const payload = {
        orderRef: isEditMode ? (editingOrderRef ?? undefined) : buildOutboundRef(),
        customerId,
        exportedAt: new Date().toISOString(),
        notes: shortageNote,
        shortages: shortages.length > 0 ? shortages : undefined,
        items: allItems,
      }

      const savedOrder = isEditMode && orderId
        ? await updateExportOrder(orderId, payload)
        : await createExportOrder(payload)

      navigate('/outbound', { state: { createdOrderId: savedOrder.id, createdOrderRef: savedOrder.orderRef } })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu lệnh xuất kho.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── fulfil / cancel ── */
  const triggerFulfilOrder = () => {
    if (!isEditMode || !orderId) return
    if (editingStatus === 'fulfilled') { setFormError('Lệnh xuất đã ở trạng thái hoàn thành.'); return }
    if (!canMarkFulfilled) { setFormError(fulfilBlockedReason ?? 'Không thể đánh dấu hoàn thành khi PO liên quan chưa nhận đủ hàng.'); return }

    showConfirmAction({
      header: 'Đánh dấu hoàn thành',
      message: `Bạn có chắc muốn đánh dấu hoàn thành lệnh ${editingOrderRef ?? `#${orderId}`}?`,
      acceptLabel: 'Hoàn thành',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('fulfil')
            setFormError(null)
            await fulfilExportOrder(orderId)
            navigate('/outbound', { state: { createdOrderId: orderId, createdOrderRef: editingOrderRef ?? undefined } })
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Không thể đánh dấu hoàn thành.')
          } finally {
            setProcessingAction(null)
          }
        })()
      },
    })
  }

  const triggerDeleteOrder = () => {
    if (!isEditMode || !orderId) return
    showDangerConfirm({
      header: 'Xóa phiếu xuất',
      message: `Bạn có chắc muốn xóa phiếu ${editingOrderRef ?? `#${orderId}`}?`,
      acceptLabel: 'Xóa phiếu',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('cancel')
            setFormError(null)
            await cancelExportOrder(orderId)
            navigate('/outbound', { state: { createdOrderId: orderId, createdOrderRef: editingOrderRef ?? undefined } })
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Không thể xóa phiếu xuất.')
          } finally {
            setProcessingAction(null)
          }
        })()
      },
    })
  }

  const triggerCreateAdjustmentOrder = () => {
    if (!isEditMode || !orderId) return
    if (!isFulfilledViewMode) {
      setFormError('Chỉ tạo điều chỉnh từ phiếu đã hoàn thành.')
      return
    }
    if (sourceOrderId || adjustedByOrderId) {
      setFormError('Phiếu này đã thuộc luồng điều chỉnh hoặc đã có phiếu điều chỉnh.')
      return
    }

    showConfirmAction({
      header: 'Xác nhận Void & điều chỉnh',
      message: `Tạo phiếu điều chỉnh từ lệnh ${editingOrderRef ?? `#${orderId}`}? Hệ thống sẽ void phiếu gốc khi bạn hoàn thành phiếu điều chỉnh mới.`,
      acceptLabel: 'Tạo phiếu điều chỉnh',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('adjust')
            setFormError(null)
            const created = await createExportVoidRerelease(orderId)
            navigate(`/outbound/${created.id}/edit`)
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Không thể tạo phiếu điều chỉnh.')
          } finally {
            setProcessingAction(null)
          }
        })()
      },
    })
  }

  /* ── render ── */
  const anyStockLoading = lines.some((l) => l.stockLoading)
  const watermarkText = isFulfilledViewMode ? 'ĐÃ HOÀN THÀNH' : (isCancelledViewMode ? 'ĐÃ HỦY' : null)
  const watermarkClass = isFulfilledViewMode ? 'fulfilled' : (isCancelledViewMode ? 'cancelled' : '')

  return (
    <section className="outbound-page">
      {watermarkText && (
        <div className={`outbound-status-watermark ${watermarkClass}`} aria-hidden>
          {watermarkText}
        </div>
      )}
      <header className="outbound-page-header">
        <div>
          <h1>{isEditMode ? (isLockedEditMode ? 'Chi tiết lệnh xuất kho' : 'Chỉnh sửa lệnh xuất kho') : 'Tạo lệnh xuất kho mới'}</h1>
          <p>{isEditMode ? (isLockedEditMode ? 'Phiếu đang ở chế độ chỉ xem, không cho phép chỉnh sửa.' : 'Cập nhật thông tin và phân bổ lô cho lệnh xuất đã tạo.') : 'Tạo phiếu xuất theo FEFO từ danh sách LOT hiện có.'}</p>
        </div>
      </header>

      {(formError || formSuccess) && (
        <div className={`catalog-inline-notice ${formError ? 'error' : 'success'}`}>
          <span>{formError ?? formSuccess}</span>
          <button
            type="button"
            className="catalog-inline-notice-close"
            onClick={() => { setFormError(null); setFormSuccess(null) }}
            aria-label="Đóng thông báo"
          >×</button>
        </div>
      )}

      {/* ── Customer card ── */}
      <article className="outbound-card">
        <h2>Thông tin chung</h2>
        <label className="outbound-field">
          <span>Khách hàng hoặc phòng ban</span>
          <Dropdown
            value={customerId}
            options={customerOptions}
            onChange={(e) => setCustomerId(String(e.value ?? ''))}
            placeholder="Chọn khách hàng..."
            className="outbound-dropdown"
            filter
            showClear
            disabled={loading || isLockedEditMode}
          />
        </label>

        {selectedCustomer && (
          <div className="outbound-customer-meta">
            <div>
              <small>Mã khách hàng</small>
              <strong>{selectedCustomer.code?.trim() ? selectedCustomer.code : '---'}</strong>
            </div>
            <div>
              <small>Số điện thoại</small>
              <strong>{selectedCustomer.phone?.trim() ? selectedCustomer.phone : '---'}</strong>
            </div>
            <div>
              <small>Email</small>
              <strong>{selectedCustomer.email?.trim() ? selectedCustomer.email : '---'}</strong>
            </div>
            <div className="outbound-customer-meta-address">
              <small>Địa chỉ</small>
              <strong>{selectedCustomer.address?.trim() ? selectedCustomer.address : '---'}</strong>
            </div>
          </div>
        )}
      </article>

      <div className="outbound-layout">
      {/* ── Drill-down flow: one node per material line ── */}
      <div className="ob-drill-flow">
        {lines.map((line, idx) => {
          const lineMat = materials.find((m) => m.id === line.materialId)
          const d = getLineDerived(line)
          const isActive = idx === activeLineIdx
          const isExpanded = Boolean(line.materialId)
          const lineMatOptions = materialOptions.filter(
            (opt) => opt.value === line.materialId || !usedMaterialIds.has(opt.value),
          )
          const allocPercent = line.requestedQtyValue > 0
            ? Math.min(100, Math.round((d.allocatedQty / line.requestedQtyValue) * 100))
            : 0
          const statusLabel = allocPercent >= 100 ? 'Đủ' : (allocPercent > 0 ? 'Một phần' : 'Chưa phân bổ')

          return (
            <div key={line.key} className={`ob-drill-node${isExpanded ? ' expanded' : ''}${isActive ? ' active-node' : ''}`}>
              {/* ── LEFT: Material card ── */}
              <div
                className={`po-drill-node-card${isActive ? ' active' : ''}`}
                onClick={() => setActiveLineIdx(idx)}
              >
                <div className="po-drill-node-icon" aria-hidden>
                  <i className="pi pi-box" />
                </div>

                <div className="po-drill-node-main">
                  {/* Material selector inline */}
                  <div className="ob-drill-mat-select">
                    <Dropdown
                      value={line.materialId}
                      options={lineMatOptions}
                      onChange={(e) => { void handleLineMaterialChange(idx, String(e.value ?? '')) }}
                      placeholder="Chọn nguyên liệu..."
                      className="ob-drill-dropdown"
                      filter
                      showClear
                      disabled={loading || isLockedEditMode}
                    />
                  </div>

                  {lineMat && (
                    <div className="ob-drill-mat-meta">
                      <span>{lineMat.code}</span>
                      <span className={`po-drill-node-chip ${statusLabel === 'Đủ' ? 'done' : statusLabel === 'Một phần' ? 'partial' : 'none'}`}>{statusLabel}</span>
                    </div>
                  )}

                  {/* Qty input + stock info */}
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
                          disabled={isLockedEditMode}
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
                        disabled={isLockedEditMode || !line.materialId || line.requestedQtyValue <= 0 || d.lots.length === 0}
                        tooltip="Tự phân bổ FEFO"
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  )}

                  {/* FEFO suggested lots */}
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
                            disabled={isLockedEditMode}
                            title={`${lot.lotNo} \u2013 T\u1ed3n: ${formatQuantity(toNumeric(lot.currentQtyBase))} \u2013 HSD: ${formatDateVi(lot.expiryDate)}`}
                          >
                            <Tag value={lot.lotNo} severity={expTag.severity === 'danger' ? 'danger' : expTag.severity === 'warning' ? 'warning' : 'success'} />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Progress bar */}
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

                  {/* Shortage inline */}
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
                          disabled={isLockedEditMode}
                        />
                        <span>Xác nhận xuất thiếu</span>
                      </label>
                    </div>
                  )}

                </div>

                {/* Remove + toggle */}
                <div className="ob-drill-node-actions">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="po-drill-node-toggle"
                      onClick={(e) => { e.stopPropagation(); removeLine(idx) }}
                      aria-label={`Xóa dòng ${idx + 1}`}
                      title="Xóa dòng"
                      disabled={isLockedEditMode}
                    >
                      <i className="pi pi-trash" style={{ color: '#ef4444', fontSize: '0.85rem' }} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Allocation lot branch ── */}
              {isExpanded && (
                <div className="po-drill-branch-list">
                  {line.allocationRows.length === 0 && (
                    <p className="purchase-side-note">Chưa có lô nào được phân bổ. Nhấn "Tự phân bổ FEFO" hoặc chọn lô từ gợi ý.</p>
                  )}

                  {line.allocationRows.map((row) => {
                    const expTag = calculateExpTag(row.expiryDate)
                    return (
                      <div key={row.batchId} className="po-drill-branch-item">
                        <div className="ob-drill-branch-lot-row">
                          <strong>{row.lotNo}</strong>
                          <Tag value={expTag.label} severity={expTag.severity} />
                          <span className="ob-drill-branch-exp">
                            <i className="pi pi-clock" aria-hidden /> HSD: {formatDateVi(row.expiryDate)}
                          </span>
                        </div>

                        <div className="ob-drill-branch-fields">
                          <div className="ob-drill-branch-qty-col">
                            <span>TỒN KHO</span>
                            <strong>{formatQuantity(row.availableQty)} {lineMat?.unit ?? ''}</strong>
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
                              disabled={isLockedEditMode}
                            />
                          </div>

                          <div className="ob-drill-branch-action-col">
                            <button
                              type="button"
                              className="po-drill-node-toggle"
                              onClick={() => removeAllocationRow(idx, row.batchId)}
                              aria-label={`Xóa lô ${row.lotNo}`}
                              title="Xóa lô"
                              disabled={isLockedEditMode}
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

      {/* ── FEFO sidebar (active line) ── */}
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
                  </div>
                </div>
                <span className="outbound-fefo-divider" aria-hidden />
                <button
                  type="button"
                  className="outbound-fefo-add"
                  onClick={() => addLotToLine(activeLineIdx, lot)}
                  aria-label={`Thêm lô ${lot.lotNo}`}
                  title="Thêm vào phân bổ"
                  disabled={isLockedEditMode}
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

      {/* ── History panel (edit mode) ── */}
      {isEditMode && (
        <aside className="outbound-history-panel">
          <div className="outbound-history-panel-header">
            <i className="pi pi-history" />
            <span>LỊCH SỬ THAO TÁC</span>
          </div>
          <HistoryTimeline
            events={historyEvents}
            loading={historyLoading}
            error={historyError}
            emptyMessage="Chưa có lịch sử thao tác cho lệnh xuất kho này."
          />
        </aside>
      )}
      </div>

      {/* ── Add line + Actions ── */}
      <div className="outbound-bottom-actions">
        <Button
          label="Thêm nguyên liệu"
          icon="pi pi-plus"
          outlined
          className="outbound-add-line-btn"
          onClick={addLine}
          disabled={loading || isLockedEditMode}
        />

        <div className="outbound-actions">
          <Button label="Quay lại" outlined onClick={() => navigate('/outbound')} />
          {isFulfilledViewMode && !sourceOrderId && !adjustedByOrderId && (
            <Button
              label="Void & Tạo phiếu điều chỉnh"
              icon="pi pi-history"
              outlined
              onClick={triggerCreateAdjustmentOrder}
              loading={processingAction === 'adjust'}
              disabled={submitting || loading || anyStockLoading || processingAction !== null}
            />
          )}
          {isEditMode && (
            <>
              <Button
                label="Đánh dấu hoàn thành"
                icon="pi pi-check"
                severity="success"
                outlined
                onClick={triggerFulfilOrder}
                loading={processingAction === 'fulfil'}
                disabled={isLockedEditMode || submitting || loading || anyStockLoading || processingAction !== null || editingStatus === 'fulfilled' || !canMarkFulfilled}
              />
              <Button
                label="Xóa phiếu"
                icon="pi pi-trash"
                severity="danger"
                outlined
                onClick={triggerDeleteOrder}
                loading={processingAction === 'cancel'}
                disabled={isLockedEditMode || submitting || loading || anyStockLoading || processingAction !== null}
              />
            </>
          )}
          <Button
            label={isEditMode ? 'Lưu cập nhật lệnh xuất' : 'Kiểm tra & Xác nhận Xuất'}
            icon="pi pi-arrow-right"
            iconPos="right"
            onClick={submitExport}
            loading={submitting}
            disabled={isLockedEditMode || submitting || loading || anyStockLoading}
          />
        </div>
      </div>
    </section>
  )
}
