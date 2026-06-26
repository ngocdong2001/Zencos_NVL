import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { ProductionMaterialPanel, type MaterialLine, type AllocationRow } from '../components/outbound/ProductionMaterialPanel'
import { fetchProductionOrderDetail, createProductionOrder, updateProductionOrderHeader, updateProductionOrderStatus, deleteProductionOrder, upsertProductionOrderLines, fetchProductOutputs, advanceProductionStep, confirmNvlExport, retractNvlExport, fetchProductionOrderLogs, type ProductionOrderDetail, type ProductOutput, type ProductionOrderLog } from '../lib/productionApi'
import { exportNvlRequestDoc } from '../lib/productionNvlRequestExport'
import { fetchBasics } from '../lib/catalogApi'
import type { BasicRow } from '../components/catalog/types'
import { createProductionBom, fetchNextBomCode, fetchProductionBoms, fetchProductionBom } from '../lib/productionBomApi'
import { showDangerConfirm } from '../lib/confirm'
import { formatQuantity } from '../components/purchaseOrder/format'
import { safeRandomId } from '../lib/uuid'
import { type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'

// ─── Main Component ───────────────────────────────────────────────────────────

type AutoBomPreviewLineType = 'nvl' | 'btp' | 'tp'

type AutoBomPreviewRow = {
  key: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  sourceQty: number
  qtyPerBase: number
  previewLineType: AutoBomPreviewLineType
}

const autoBomLineTypeLabel: Record<AutoBomPreviewLineType, string> = {
  nvl: 'NVL',
  btp: 'BTP',
  tp: 'TP',
}

const buttonBaseStyle = {
  height: 36,
  minHeight: 36,
  display: 'inline-flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  whiteSpace: 'nowrap' as const,
  lineHeight: '1',
}

const buttonSecondaryStyle = {
  ...buttonBaseStyle,
  fontSize: 12,
  fontWeight: 700,
}

const buttonBlueOutlinedStyle = {
  ...buttonBaseStyle,
  fontSize: 12,
  fontWeight: 700,
  borderColor: '#5269e0',
  color: '#5269e0',
}

const buttonPrimaryStyle = {
  ...buttonBaseStyle,
  background: '#5269e0',
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  padding: '0 20px',
}

export function ProductionStep1Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLines, setSavingLines] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSuccess, setDraftSuccess] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [retracting, setRetracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [retractSuccess, setRetractSuccess] = useState(false)
  const [nvlExported, setNvlExported] = useState(false)

  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [classifications, setClassifications] = useState<BasicRow[]>([])
  const [classLoading, setClassLoading] = useState(false)
  const [selectedClassCode, setSelectedClassCode] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Track current lines from ProductionMaterialPanel
  const currentLinesRef = useRef<MaterialLine[]>([])
  const [initialPanelLines, setInitialPanelLines] = useState<MaterialLine[] | undefined>(undefined)

  // Warehouse locations for per-line NVL export dropdown
  const [locations, setLocations] = useState<BasicRow[]>([])

  // BOM (định mức sản xuất) selection
  const [boms, setBoms] = useState<{ id: string; bomCode: string | null; bomName: string; baseQty: number; outputProductId: string | null }[]>([])
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)
  const [bomApplying, setBomApplying] = useState(false)
  const [plannedQty, setPlannedQty] = useState<number>(1)
  // Ref to the raw BOM NVL lines (qtyPerBase), used for re-scaling when plannedQty changes
  const bomNvlLinesRef = useRef<Array<{ productId: string; productCode: string; productName: string; unit: string; qtyPerBase: number }> | null>(null)

  // History
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Flow diagram modal
  const [showFlowModal, setShowFlowModal] = useState(false)

  // Auto BOM dialog
  const [showAutoBomDialog, setShowAutoBomDialog] = useState(false)
  const [autoBomSaving, setAutoBomSaving] = useState(false)
  const [autoBomCode, setAutoBomCode] = useState('')
  const [autoBomName, setAutoBomName] = useState('')
  const [autoBomBaseQty, setAutoBomBaseQty] = useState<number>(1)
  const [autoBomNotes, setAutoBomNotes] = useState('')
  const [autoBomRows, setAutoBomRows] = useState<AutoBomPreviewRow[]>([])
  const [autoBomSuccess, setAutoBomSuccess] = useState<{ id: string; bomCode: string | null; bomName: string } | null>(null)

  const loadHistory = async (id: string) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows: ProductionOrderLog[] = await fetchProductionOrderLogs(id, 1)
      setHistoryEvents(rows.map((r) => ({
        id: r.id,
        actionType: r.logType,
        action: r.action,
        actorName: r.user?.fullName ?? r.userName ?? 'Hệ thống',
        at: r.createdAt,
      })))
    } catch (err) {
      setHistoryEvents([])
      setHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử thao tác.')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Editable header fields (used when creating new order)
  const [orderRef, setOrderRef] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [processedAt, setProcessedAt] = useState<Date | null>(null)
  const [outputProductId, setOutputProductId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // Product outputs catalog
  const [productOutputs, setProductOutputs] = useState<ProductOutput[]>([])

  // Load product outputs for dropdown
  useEffect(() => {
    fetchProductOutputs().then(setProductOutputs).catch(() => {/* silent */})
  }, [])

  // Load warehouse locations for NVL source dropdown
  useEffect(() => {
    fetchBasics('locations')
      .then(rows => setLocations(rows.filter(r => r.status !== 'inactive')))
      .catch(() => {})
  }, [])

  // Load approved BOMs:
  //  - new order: all approved BOMs (user picks BOM first → product auto-filled)
  //  - existing order: filtered by outputProductId
  useEffect(() => {
    if (!orderId) {
      fetchProductionBoms({ status: 'approved', limit: 200 })
        .then(res => setBoms(res.data))
        .catch(() => setBoms([]))
      return
    }
    const productId = order?.outputProductId ?? null
    if (!productId) { setBoms([]); return }
    fetchProductionBoms({ status: 'approved', limit: 200 })
      .then(res => setBoms(res.data.filter(b => b.outputProductId === productId)))
      .catch(() => setBoms([]))
  }, [orderId, order?.outputProductId])

  // Load order from API if orderId present
  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        setOrderRef(data.orderRef ?? '')
        setIssueDate(data.issuedAt ? new Date(data.issuedAt).toISOString().slice(0, 10) : '')
        setProcessedAt(data.step1ProcessedAt ? new Date(data.step1ProcessedAt) : null)
        setOutputProductId(data.outputProductId ?? null)
        setNotes(data.notes ?? '')
        setNvlExported(!!data.nvlExportedAt)
        // Restore selected BOM (Definition mức sản xuất)
        if (data.productionBomId) setSelectedBomId(data.productionBomId)
        // Restore planned quantity
        if (data.plannedQty != null) setPlannedQty(data.plannedQty)

        // Reconstruct panel lines from saved step-1 out lines
        // Group by product to combine multiple lots into one MaterialLine, but preserve per-lot locationId in allocationRows
        const step1Lines = data.lines.filter(l => l.step === 1 && l.direction === 'out')
        if (step1Lines.length > 0) {
          const grouped = new Map<string, typeof step1Lines>()
          for (const l of step1Lines) {
            const key = l.productId ?? l.productCode
            if (!grouped.has(key)) grouped.set(key, [])
            grouped.get(key)!.push(l)
          }
          const restored: MaterialLine[] = []
          for (const [, groupLines] of grouped) {
            const first = groupLines[0]
            // Build allocation rows from all lines with actualQty > 0, preserving each lot's locationId
            const allocationRows: AllocationRow[] = groupLines
              .filter(l => l.actualQty > 0)
              .map(l => ({
                batchId: safeRandomId(),
                lotNo: l.lotNo ?? '',
                expiryDate: l.expiryDate,
                availableQty: l.actualQty,
                exportQty: l.actualQty,
                inputValue: formatQuantity(l.actualQty),
                manufacturerName: null,
                locationId: l.locationId ?? null,
                locationCode: l.location?.code ?? null,
                locationName: l.location?.name ?? null,
                exportDate: l.exportDate ? new Date(l.exportDate) : null,
              }))
            restored.push({
              key: safeRandomId(),
              materialType: 'nvl',  // ← NEW: Default to NVL for backward compatibility
              materialId: first.productId ?? '',
              materialCode: first.productCode ?? '',
              materialName: first.productName ?? '',
              materialUnit: first.unit ?? '',
              locationId: first.locationId ?? undefined,
              requestedQtyValue: first.plannedQty,
              requestedQtyInput: formatQuantity(first.plannedQty),
              requestedQtyFocused: false,
              allocationRows,
              shortageAcknowledged: false,
              stockRows: [],
              fefoSuggestions: [],
              stockLoading: false,
              stockFetchError: null,
            })
          }
          setInitialPanelLines(restored)
          currentLinesRef.current = restored
        }
        // Remove old global sourceLocationId restore — location is now per-line
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (!orderId) { setHistoryEvents([]); return }
    void loadHistory(orderId)
  }, [orderId])

  // Re-scale BOM NVL lines when plannedQty changes (only when BOM cached + NVL not yet exported)
  useEffect(() => {
    if (!selectedBomId || !bomNvlLinesRef.current || nvlExported) return
    const qty = plannedQty > 0 ? plannedQty : 1
    const rescaled: MaterialLine[] = bomNvlLinesRef.current.map(l => ({
      key: safeRandomId(),
      materialType: 'nvl',  // ← NEW
      materialId: l.productId,
      materialCode: l.productCode,
      materialName: l.productName,
      materialUnit: l.unit,
      requestedQtyValue: l.qtyPerBase * qty,
      requestedQtyInput: formatQuantity(l.qtyPerBase * qty),
      requestedQtyFocused: false,
      allocationRows: [],
      shortageAcknowledged: false,
      stockRows: [],
      fefoSuggestions: [],
      stockLoading: false,
      stockFetchError: null,
    }))
    setInitialPanelLines(rescaled)
    currentLinesRef.current = rescaled
  }, [plannedQty]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveDraft() {
    if (!orderId) return
    setSavingDraft(true)
    setError(null)
    setDraftSuccess(false)
    try {
      // Always persist the selected BOM on the order header
      await updateProductionOrderHeader(orderId, { productionBomId: selectedBomId ?? null, plannedQty: plannedQty > 0 ? plannedQty : null })

      // Only update lines when NVL has not yet been confirmed-exported
      // (calling upsertProductionOrderLines after export would wipe the confirmed lines)
      if (!nvlExported) {
        const lines = currentLinesRef.current
        const payloads = lines.flatMap((line) => {
          if (!line.materialId) return []
          const allocatedRows = line.allocationRows.filter((r) => r.exportQty > 0)
          if (allocatedRows.length > 0) {
            // Lines that already have lot allocations
            return allocatedRows.map((r) => ({
              productId: line.materialId || null,
              productCode: line.materialCode || line.materialId,
              productName: line.materialName || line.materialId,
              lotNo: r.lotNo || null,
              expiryDate: r.expiryDate || null,
              exportDate: r.exportDate ? r.exportDate.toISOString() : null,
              plannedQty: line.requestedQtyValue,
              actualQty: r.exportQty,
              wasteQty: 0,
              unit: line.materialUnit || 'g',
              direction: 'out' as const,
              locationId: r.locationId || line.locationId || null,
            }))
          } else {
            // Draft-only: persist material intent + locationId + plannedQty with actualQty=0
            return [{
              productId: line.materialId || null,
              productCode: line.materialCode || line.materialId,
              productName: line.materialName || line.materialId,
              lotNo: null,
              expiryDate: null,
              exportDate: null,
              plannedQty: line.requestedQtyValue,
              actualQty: 0,
              wasteQty: 0,
              unit: line.materialUnit || 'g',
              direction: 'out' as const,
              locationId: line.locationId || null,
            }]
          }
        })
        await upsertProductionOrderLines(orderId, 1, payloads, processedAt?.toISOString() ?? null)
      }
      setDraftSuccess(true)
      setTimeout(() => setDraftSuccess(false), 3000)
      void loadHistory(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu nháp thất bại')
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleApplyBom(bomId: string | null) {
    setSelectedBomId(bomId)
    if (!bomId) {
      // Clear auto-filled output product when BOM is cleared (new order mode only)
      if (!orderId) setOutputProductId(null)
      bomNvlLinesRef.current = null
      setInitialPanelLines([])
      currentLinesRef.current = []
      return
    }
    setBomApplying(true)
    setError(null)
    try {
      const bom = await fetchProductionBom(bomId)
      // In new order mode: auto-fill output product from BOM
      if (!orderId && bom.outputProductId) {
        setOutputProductId(bom.outputProductId)
      }
      const nvlLines = bom.lines.filter(l => l.lineType === 'nvl')
      // Cache raw BOM lines for re-scaling when plannedQty changes
      bomNvlLinesRef.current = nvlLines.map(l => ({
        productId:   l.productId ?? '',
        productCode: l.productCode ?? '',
        productName: l.productName ?? '',
        unit:        l.unit ?? '',
        qtyPerBase:  l.qtyPerBase,
      }))
      const qty = plannedQty > 0 ? plannedQty : 1
      const newLines: MaterialLine[] = nvlLines.map(l => ({
        key: safeRandomId(),
        materialType: 'nvl',  // ← NEW
        materialId: l.productId ?? '',
        materialCode: l.productCode ?? '',
        materialName: l.productName ?? '',
        materialUnit: l.unit ?? '',
        requestedQtyValue: l.qtyPerBase * qty,
        requestedQtyInput: formatQuantity(l.qtyPerBase * qty),
        requestedQtyFocused: false,
        allocationRows: [],
        shortageAcknowledged: false,
        stockRows: [],
        fefoSuggestions: [],
        stockLoading: false,
        stockFetchError: null,
      }))
      setInitialPanelLines(newLines)
      currentLinesRef.current = newLines
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải định mức sản xuất.')
    } finally {
      setBomApplying(false)
    }
  }

  function resolveAutoBomPreviewLineType(line: MaterialLine): AutoBomPreviewLineType {
    if (line.materialType === 'nvl') return 'nvl'
    const output = productOutputs.find((p) => p.id === line.materialId)
    if (output?.outputType === 'finished') return 'tp'
    if (output?.outputType === 'semi_finished') return 'btp'
    if (line.materialCode.toUpperCase().startsWith('TP-')) return 'tp'
    return 'btp'
  }

  async function handleOpenAutoBomDialog() {
    const sourceLines = currentLinesRef.current.filter(
      (line) => line.materialId && line.requestedQtyValue > 0,
    )
    if (sourceLines.length === 0) {
      setError('Chưa có dữ liệu xuất ở bước 1 để tạo định mức tự động.')
      return
    }

    const baseQty = plannedQty > 0 ? plannedQty : 1
    const rows: AutoBomPreviewRow[] = sourceLines.map((line) => ({
      key: line.key,
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      materialUnit: line.materialUnit,
      sourceQty: line.requestedQtyValue,
      qtyPerBase: line.requestedQtyValue / baseQty,
      previewLineType: resolveAutoBomPreviewLineType(line),
    }))

    setAutoBomRows(rows)
    setAutoBomBaseQty(baseQty)
    setAutoBomName(`Định mức tự động${order?.orderRef ? ` - ${order.orderRef}` : ''}`)
    setAutoBomNotes(order?.notes ?? '')
    setAutoBomCode('')
    setShowAutoBomDialog(true)

    try {
      const nextCode = await fetchNextBomCode()
      setAutoBomCode(nextCode)
    } catch {
      setAutoBomCode('')
    }
  }

  function updateAutoBomRowQtyPerBase(key: string, qtyPerBase: number | null) {
    setAutoBomRows((prev) => prev.map((row) => (
      row.key === key
        ? { ...row, qtyPerBase: qtyPerBase ?? 0 }
        : row
    )))
  }

  async function handleCreateAutoBom() {
    const bomName = autoBomName.trim()
    const resolvedOutputProductId = order?.outputProductId ?? outputProductId ?? null
    if (!bomName) {
      setError('Vui lòng nhập tên định mức trước khi lưu.')
      return
    }
    if (!resolvedOutputProductId) {
      setError('Vui lòng chọn Sản phẩm đầu ra trước khi lưu định mức tự động.')
      return
    }
    if (!(autoBomBaseQty > 0)) {
      setError('Số lượng / mẻ phải lớn hơn 0.')
      return
    }
    if (autoBomRows.length === 0) {
      setError('Không có dòng vật tư để tạo định mức.')
      return
    }
    if (autoBomRows.some((row) => !(row.qtyPerBase > 0))) {
      setError('Tất cả dòng trong định mức phải có số lượng / mẻ lớn hơn 0.')
      return
    }

    setAutoBomSaving(true)
    setError(null)
    setAutoBomSuccess(null)
    try {
      const created = await createProductionBom({
        bomCode: autoBomCode.trim() || undefined,
        bomName,
        outputProductId: Number(resolvedOutputProductId),
        baseQty: autoBomBaseQty,
        notes: autoBomNotes.trim() || null,
        lines: autoBomRows.map((row, idx) => {
          const parsedProductId = Number(row.materialId)
          return {
            sortOrder: idx,
            lineType: row.previewLineType === 'nvl' ? 'nvl' : 'btp',
            productId: Number.isFinite(parsedProductId) && parsedProductId > 0 ? parsedProductId : null,
            productCode: row.materialCode,
            productName: row.materialName,
            qtyPerBase: row.qtyPerBase,
            wasteQty: 0,
            unit: row.materialUnit,
            notes: row.previewLineType === 'tp' ? 'Auto map TP sang nhóm BTP/TP trong định mức.' : null,
          }
        }),
      })

      if (orderId) {
        const updated = await updateProductionOrderHeader(orderId, {
          productionBomId: created.id,
        })
        setOrder(updated)
        setSelectedBomId(created.id)
      }

      setBoms((prev) => {
        if (prev.some((b) => b.id === created.id)) return prev
        return [
          {
            id: created.id,
            bomCode: created.bomCode,
            bomName: created.bomName,
            baseQty: created.baseQty,
            outputProductId: created.outputProductId,
          },
          ...prev,
        ]
      })

      setAutoBomSuccess({ id: created.id, bomCode: created.bomCode, bomName: created.bomName })
      setShowAutoBomDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo định mức tự động.')
    } finally {
      setAutoBomSaving(false)
    }
  }

  async function handleCreate() {
    if (!outputProductId) {
      setError('Vui lòng chọn Sản phẩm đầu ra trước khi tạo phiếu.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createProductionOrder({
        orderRef: orderRef || null,
        issuedAt: issueDate || undefined,
        outputProductId: outputProductId || null,
        productionBomId: selectedBomId || null,
        plannedQty: plannedQty > 0 ? plannedQty : null,
        notes: notes || null,
      })
      navigate(`/production/${created.id}/buoc-1`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo phiếu thất bại')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (!orderId) return
    const isDraft = order?.status === 'draft'
    showDangerConfirm({
      header: isDraft ? 'Xóa phiếu sản xuất' : 'Hủy phiếu sản xuất',
      message: isDraft 
        ? `Bạn có chắc muốn xóa phiếu ${order?.orderRef ?? orderId}? Hành động này không thể hoàn tác.`
        : `Bạn có chắc muốn hủy phiếu ${order?.orderRef ?? orderId}? Hành động này không thể hoàn tác.`,
      acceptLabel: isDraft ? 'Xác nhận xóa' : 'Xác nhận hủy',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setCancelling(true)
        try {
          if (isDraft) {
            await deleteProductionOrder(orderId)
          } else {
            await updateProductionOrderStatus(orderId, 'cancelled')
            void loadHistory(orderId)
          }
          navigate('/production')
        } catch (err) {
          setError(err instanceof Error ? err.message : isDraft ? 'Không thể xóa phiếu' : 'Không thể hủy phiếu')
        } finally {
          setCancelling(false)
        }
      },
    })
  }

  async function handleSaveLines() {
    if (!orderId) return

    if (!processedAt) {
      setError('Vui lòng chọn Ngày xử lý (Bước 1) trước khi lưu.')
      return
    }

    const lines = currentLinesRef.current
    const payloads = lines.flatMap((line) =>
      line.allocationRows
        .filter((r) => r.exportQty > 0)
        .map((r) => ({
          productId: line.materialId || null,
          productCode: line.materialCode || line.materialId,
          productName: line.materialName || line.materialId,
          lotNo: r.lotNo || null,
          expiryDate: r.expiryDate || null,
          exportDate: r.exportDate ? r.exportDate.toISOString() : null,
          plannedQty: line.requestedQtyValue,
          actualQty: r.exportQty,
          wasteQty: 0,
          unit: line.materialUnit || 'g',
          direction: 'out' as const,
          locationId: r.locationId || line.locationId || null,
        }))
    )
    if (payloads.length === 0) {
      setError('Chưa có dữ liệu lot NVL để lưu. Vui lòng chọn NVL và nhập số lượng.')
      return
    }
    const missingDate = payloads.filter((p) => !p.exportDate)
    if (missingDate.length > 0) {
      setError(`${missingDate.length} dòng NVL chưa có ngày xuất kho. Vui lòng chọn ngày xuất cho tất cả các dòng.`)
      return
    }
    setSavingLines(true)
    setError(null)
    setSaveSuccess(false)
    try {
      await upsertProductionOrderLines(orderId, 1, payloads, processedAt?.toISOString() ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu xuất NVL thất bại')
      setSavingLines(false)
      return
    }
    setSavingLines(false)

    // Show confirmation dialog to actually deduct inventory
    showDangerConfirm({
      header: nvlExported ? 'Xác nhận xuất thêm NVL' : 'Xác nhận xuất kho NVL',
      message: nvlExported
        ? `Xác nhận xuất thêm NVL mới vào lệnh ${order?.orderRef ?? orderId}? Chỉ các dòng chưa xuất kho sẽ bị trừ tồn.`
        : `Xác nhận xuất ${payloads.length} dòng NVL khỏi kho cho lệnh ${order?.orderRef ?? orderId}? Tồn kho sẽ bị trừ ngay sau khi xác nhận.`,
      acceptLabel: nvlExported ? 'Xác nhận xuất thêm' : 'Xác nhận xuất kho',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setSavingLines(true)
        setError(null)
        try {
          const updated = await confirmNvlExport(orderId)
          setOrder(updated)
          setNvlExported(true)
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 4000)
          void loadHistory(orderId)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Xuất kho NVL thất bại')
        } finally {
          setSavingLines(false)
        }
      },
    })
  }

  async function handleRetractNvl() {
    if (!orderId) return
    showDangerConfirm({
      header: 'Thu hồi NVL đã xuất',
      message: `Thu hồi NVL đã xuất cho lệnh ${order?.orderRef ?? orderId}? Bạn sẽ có thể chỉnh sửa và xuất lại. Hành động này sẽ hoàn trả tồn kho.`,
      acceptLabel: 'Xác nhận thu hồi',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setRetracting(true)
        setError(null)
        setRetractSuccess(false)
        try {
          const updated = await retractNvlExport(orderId)
          setOrder(updated)
          setNvlExported(false)
          // Reconstruct panel lines from step 1 lines (now unlocked for re-editing)
          const step1Lines = updated.lines.filter(l => l.step === 1 && l.direction === 'out')
          if (step1Lines.length > 0) {
            const grouped = new Map<string, typeof step1Lines>()
            for (const l of step1Lines) {
              const key = l.productId ?? l.productCode
              if (!grouped.has(key)) grouped.set(key, [])
              grouped.get(key)!.push(l)
            }
            const restored: MaterialLine[] = []
            for (const [, groupLines] of grouped) {
              const first = groupLines[0]
              const allocationRows: AllocationRow[] = groupLines
                .filter(l => l.actualQty > 0)
                .map(l => ({
                  batchId: safeRandomId(),
                  lotNo: l.lotNo ?? '',
                  expiryDate: l.expiryDate,
                  availableQty: l.actualQty,
                  exportQty: l.actualQty,
                  inputValue: formatQuantity(l.actualQty),
                  manufacturerName: null,
                  locationId: l.locationId ?? null,
                  locationCode: l.location?.code ?? null,
                  locationName: l.location?.name ?? null,
                  exportDate: l.exportDate ? new Date(l.exportDate) : null,
                }))
              restored.push({
                key: safeRandomId(),
                materialType: 'nvl',
                materialId: first.productId ?? '',
                materialCode: first.productCode ?? '',
                materialName: first.productName ?? '',
                materialUnit: first.unit ?? '',
                locationId: first.locationId ?? undefined,
                requestedQtyValue: first.plannedQty,
                requestedQtyInput: formatQuantity(first.plannedQty),
                requestedQtyFocused: false,
                allocationRows,
                shortageAcknowledged: false,
                stockRows: [],
                fefoSuggestions: [],
                stockLoading: false,
                stockFetchError: null,
              })
            }
            setInitialPanelLines(restored)
            currentLinesRef.current = restored
          }
          setRetractSuccess(true)
          setTimeout(() => setRetractSuccess(false), 3000)
          void loadHistory(orderId)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Thu hồi NVL thất bại')
        } finally {
          setRetracting(false)
        }
      },
    })
  }

  const displayOrderRef = order?.orderRef ?? orderRef ?? '---'
  const displayCreator = order?.creator?.fullName ?? '---'
  const isLocked = order?.status === 'completed' || order?.status === 'cancelled'
  const autoBomOutputProduct = order?.outputProduct ?? (outputProductId
    ? productOutputs.find((p) => p.id === outputProductId) ?? null
    : null)
  const autoBomOutputUnitLabel = autoBomOutputProduct?.unit?.trim() || 'đơn vị SP đầu ra'

  if (loading) {
    return (
      <div className="prod-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: '#5269e0' }} />
      </div>
    )
  }

  return (
    <div className="prod-page">
      {/* Header */}
      <div className="prod-header">
        <div className="prod-header__left">
          <h1 className="prod-header__title">Phiếu sản xuất</h1>
          <span className="prod-header__badge">PRODUCTION TICKET</span>
          {orderId && <span className="prod-header__order-no">#{displayOrderRef}</span>}
        </div>
        <div className="prod-header__right">
          <span className="prod-step-badge prod-step-badge--active">
            Bước 1 / 4 — Xuất NVL
          </span>
        </div>
      </div>

      <p className="prod-subtitle">Xuất nguyên vật liệu từ kho nguyên liệu vào quy trình sản xuất</p>

      {/* Step navigation bar */}
      <ProductionStepBar
        activeStep={1}
        orderId={orderId}
        maxReachedStep={Math.max(order?.currentStep ?? 1, ...(order?.lines?.map(l => l.step) ?? [1]))}
        onNavigate={(s) => { if (orderId) navigate(`/production/${orderId}/buoc-${s}`) }}
      />

      {error && (
        <div className="catalog-inline-notice error" style={{ margin: '8px 24px 0' }}>
          <span>{error}</span>
          <button type="button" className="catalog-inline-notice-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {autoBomSuccess && (
        <div className="catalog-inline-notice success" style={{ margin: '8px 24px 0', borderColor: '#86efac', background: '#f0fdf4', color: '#166534' }}>
          <span>
            Đã tạo định mức mới: <strong>{autoBomSuccess.bomCode ?? '(chưa có mã)'} - {autoBomSuccess.bomName}</strong>
          </span>
          <Button
            label="Mở định mức"
            icon="pi pi-external-link"
            className="p-button-text"
            style={{ ...buttonBaseStyle, color: '#166534', padding: '0 6px', marginLeft: 8 }}
            onClick={() => navigate(`/production-bom/${autoBomSuccess.id}`)}
          />
          <button type="button" className="catalog-inline-notice-close" onClick={() => setAutoBomSuccess(null)}>×</button>
        </div>
      )}

      {isLocked && (
        <div style={{ margin: '8px 24px 0', padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
          <i className="pi pi-lock" style={{ color: '#64748b' }} />
          <span>Phiếu đã <strong>{order?.status === 'completed' ? 'hoàn tất' : 'bị hủy'}</strong> — chỉ xem, không thể chỉnh sửa.</span>
        </div>
      )}

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Main content column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

        {/* Thông tin chung Phiếu */}
        <div className="prod-card">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <i className="pi pi-info-circle" style={{ color: '#64748b' }} />
              <span className="prod-card__title">Thông tin chung Phiếu</span>
            </div>
          </div>
          <p className="prod-card__subtitle">Các tham chiếu nghiệp vụ và thông tin hành chính</p>

          <div className="prod-form-grid">
            <div className="prod-form-field">
              <label>SỐ PHIẾU</label>
              {orderId ? (
                <InputText value={displayOrderRef} readOnly style={{ background: '#f8fafc', fontWeight: 600 }} />
              ) : (
                <InputText value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="Để trống để tự sinh số" />
              )}
            </div>
            <div className="prod-form-field">
              <label>NGÀY LẬP</label>
              <InputText value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="YYYY-MM-DD" readOnly={!!orderId} />
            </div>
            <div className="prod-form-field">
              <label>NGÀY XỬ LÝ (BƯỚC 1)</label>
              <Calendar
                value={processedAt}
                onChange={(e) => setProcessedAt(e.value as Date | null)}
                dateFormat="dd/mm/yy"
                placeholder="Chọn ngày xử lý"
                showIcon
                disabled={!orderId || isLocked}
                style={{ width: '100%' }}
              />
            </div>
            {/* ── ĐỊNH MỨC SẢN XUẤT + SỐ LƯỢNG KẾ HOẠCH ── */}
            {!isLocked && (
              <>
                <div className="prod-form-field" style={{ gridColumn: 'span 3' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    ĐỊNH MỨC SẢN XUẤT
                    {boms.length === 0 && <span style={{ fontWeight: 400, color: '#94a3b8' }}>(không có định mức đã duyệt)</span>}
                    {selectedBomId && !bomApplying && (
                      <span style={{ fontWeight: 400, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="pi pi-check-circle" />Đã áp dụng
                      </span>
                    )}
                    {bomApplying && <i className="pi pi-spin pi-spinner" style={{ color: '#5269e0', fontSize: 13 }} />}
                  </label>
                  <Dropdown
                    value={selectedBomId}
                    options={boms.map(b => ({
                      label: `[${b.bomCode ?? '---'}] ${b.bomName}`,
                      value: b.id,
                    }))}
                    onChange={(e) => { void handleApplyBom(e.value as string | null) }}
                    placeholder="Chọn định mức để tự động điền NVL..."
                    filter
                    showClear
                    disabled={(orderId ? nvlExported : false) || bomApplying}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="prod-form-field">
                  <label>
                    SỐ LƯỢNG KẾ HOẠCH
                    {selectedBomId && <span style={{ fontWeight: 400, color: '#5269e0' }}> (nhân ĐM)</span>}
                  </label>
                  <InputNumber
                    value={plannedQty}
                    onValueChange={(e) => setPlannedQty(e.value ?? 1)}
                    min={0.001}
                    minFractionDigits={0}
                    maxFractionDigits={3}
                    locale="vi-VN"
                    disabled={isLocked || nvlExported}
                    style={{ width: '100%' }}
                    inputStyle={{ width: '100%' }}
                  />
                </div>
              </>
            )}
            <div className="prod-form-field" style={{ gridColumn: 'span 4' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                SẢN PHẨM ĐẦU RA
                {!orderId && selectedBomId && (
                  <span style={{ fontWeight: 400, fontSize: 11, color: '#5269e0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="pi pi-lock" />Khóa theo định mức
                  </span>
                )}
              </label>
              {orderId ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {order?.outputProduct ? (
                    <>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#5269e0' }}>{order.outputProduct.code}</span>
                      <span style={{ fontSize: 13, color: '#475569' }}>— {order.outputProduct.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                        background: order.outputProduct.outputType === 'finished' ? '#dcfce7' : '#fef9c3',
                        color:      order.outputProduct.outputType === 'finished' ? '#15803d'  : '#a16207',
                      }}>
                        {order.outputProduct.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Chưa chọn</span>
                  )}
                </div>
              ) : (
                <Dropdown
                  value={outputProductId}
                  options={productOutputs.map(p => ({
                    label: `[${p.outputType === 'finished' ? 'TP' : 'BTP'}] ${p.code} — ${p.name}`,
                    value: p.id,
                  }))}
                  onChange={(e) => setOutputProductId(e.value)}
                  placeholder="Chọn sản phẩm đầu ra (TP / BTP)..."
                  filter
                  showClear
                  disabled={!!selectedBomId}
                  style={{ width: '100%', background: selectedBomId ? '#f8fafc' : undefined }}
                />
              )}
            </div>
          </div>

          <div className="prod-form-grid" style={{ marginTop: 16 }}>
            {orderId && (
              <div className="prod-form-field">
                <label>NGƯỜI LẬP PHIẾU</label>
                <div className="prod-user-field">
                  <i className="pi pi-user" style={{ color: '#64748b' }} />
                  <span>{displayCreator}</span>
                </div>
              </div>
            )}
            <div className="prod-form-field prod-form-field--wide">
              <label>DIỄN GIẢI CHUNG</label>
              <InputText
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú quy trình sản xuất đợt này..."
                style={{ width: '100%' }}
                readOnly={!!orderId}
              />
            </div>
          </div>
        </div>

        {/* Chi tiết nguyên vật liệu — OutboundPage */}
        {orderId && (
          <div className="prod-card prod-card--step-done">
            <div className="prod-card__title-row">
              <div className="prod-card__title-left">
                <span className="prod-step-badge prod-step-badge--active">
                  <i className="pi pi-arrow-right" /> Bước 1
                </span>
                <span className="prod-card__title">Chi tiết vật liệu xuất kho (NVL, BTP, TP)</span>
              </div>
            </div>
            <ProductionMaterialPanel
              initialLines={initialPanelLines}
              onLinesChange={(lines) => { currentLinesRef.current = lines }}
              disabled={isLocked}
              lockExistingLines={nvlExported && !isLocked}
              showMaterialCodeDropdown
              locations={locations.map(l => ({ label: `[${l.code}] ${l.name}`, value: l.id }))}
              asOfDate={processedAt ? (() => {
                // Compute VN date (UTC+7) from the stored UTC timestamp, independent of browser timezone
                const vnDate = new Date(processedAt.getTime() + 7 * 3600000)
                return `${vnDate.getUTCFullYear()}-${String(vnDate.getUTCMonth() + 1).padStart(2, '0')}-${String(vnDate.getUTCDate()).padStart(2, '0')}`
              })() : undefined}
            />
          </div>
        )}

        {/* Nhật ký giao dịch */}
        {orderId && (
          <div className="prod-card">
            <div className="prod-card__title-row">
              <div className="prod-card__title-left">
                <i className="pi pi-history" style={{ color: '#64748b' }} />
                <span className="prod-card__title">Nhật ký giao dịch</span>
              </div>
            </div>
            <div className="prod-txlog">
              {historyLoading && (
                <div style={{ padding: '12px 0', color: '#94a3b8', fontSize: 13 }}>
                  <i className="pi pi-spin pi-spinner" /> Đang tải...
                </div>
              )}
              {historyError && (
                <div style={{ padding: '8px 0', color: '#ef4444', fontSize: 13 }}>{historyError}</div>
              )}
              {!historyLoading && historyEvents.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Chưa có lịch sử thao tác cho phiếu sản xuất này.</p>
              )}
              {historyEvents.map(evt => (
                <div key={evt.id} className="prod-txlog__row">
                  <div className="prod-txlog__avatar">
                    <i className="pi pi-user" />
                  </div>
                  <div className="prod-txlog__content">
                    <div className="prod-txlog__user-row">
                      <span className="prod-txlog__user">{evt.actorName}</span>
                    </div>
                    <p className="prod-txlog__action">{evt.action}</p>
                  </div>
                  <span className="prod-txlog__time">
                    {new Date(evt.at).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>{/* end main content column */}

      </div>{/* end row */}

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="Quay lại" icon="pi pi-arrow-left" className="p-button-text p-button-secondary" style={buttonSecondaryStyle} onClick={() => navigate('/production')} />
              {orderId && !isLocked && (
            <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={buttonSecondaryStyle} onClick={handleCancel} />
          )}
          {orderId && order?.status === 'completed' && (
            <Button
              label="VÔ HIỆU"
              icon="pi pi-ban"
              loading={voiding}
              className="p-button-text p-button-danger"
              style={buttonSecondaryStyle}
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
          {draftSuccess && (
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />Đã lưu nháp
            </span>
          )}
          {saveSuccess && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />{nvlExported ? 'Đã xuất thêm NVL thành công' : 'Đã xuất kho NVL thành công'}
            </span>
          )}
          {retractSuccess && (
            <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />Thu hồi NVL thành công
            </span>
          )}
          {!saveSuccess && !retractSuccess && nvlExported && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />NVL đã xuất kho
            </span>
          )}
          <Button
            label="Xem lưu đồ NVL"
            icon="pi pi-sitemap"
            className="p-button-outlined p-button-secondary"
            style={buttonSecondaryStyle}
            disabled={!orderId}
            onClick={() => setShowFlowModal(true)}
          />
          {orderId ? (
            <>
              <Button
                label="Lưu nháp"
                icon="pi pi-pencil"
                loading={savingDraft}
                disabled={isLocked}
                className="p-button-outlined"
                style={buttonBlueOutlinedStyle}
                onClick={handleSaveDraft}
              />
              <Button
                label="Tạo định mức tự động"
                icon="pi pi-bolt"
                className="p-button-outlined p-button-secondary"
                style={buttonSecondaryStyle}
                disabled={isLocked}
                onClick={() => { void handleOpenAutoBomDialog() }}
              />
              <Button
                label={nvlExported ? 'Xuất thêm NVL' : 'Lưu xuất NVL'}
                icon={nvlExported ? 'pi pi-plus' : 'pi pi-save'}
                loading={savingLines}
                disabled={isLocked}
                className="p-button-outlined"
                style={buttonBlueOutlinedStyle}
                onClick={handleSaveLines}
              />
              <Button
                label="XUẤT YÊU CẦU NVL"
                icon="pi pi-file-word"
                disabled={!order}
                className="p-button-outlined p-button-secondary"
                style={buttonSecondaryStyle}
                onClick={async () => {
                  if (!order) return
                  setSelectedClassCode(new Set())
                  setShowExportDialog(true)
                  setClassLoading(true)
                  try {
                    const rows = await fetchBasics('classifications')
                    setClassifications(rows.filter((r) => r.status !== 'inactive'))
                  } catch {
                    setClassifications([])
                  } finally {
                    setClassLoading(false)
                  }
                }}
              />
              {nvlExported && !isLocked && (
                <Button
                  label="Thu hồi NVL"
                  icon="pi pi-undo"
                  loading={retracting}
                  className="p-button-outlined p-button-warning"
                  style={buttonSecondaryStyle}
                  onClick={handleRetractNvl}
                />
              )}
              <Button
                label="Tiếp theo: Nhập BTP"
                icon="pi pi-arrow-right"
                iconPos="right"
                disabled={isLocked}
                className="p-button-primary"
                style={buttonPrimaryStyle}
                onClick={async () => {
                  if (orderId && order && order.currentStep < 2) {
                    try { await advanceProductionStep(orderId) } catch { /* ignore */ }
                  }
                  navigate(`/production/${orderId}/buoc-2`)
                }}
              />
            </>
          ) : (
            <Button
              label="Tạo phiếu & Tiếp tục"
              icon="pi pi-arrow-right"
              iconPos="right"
              loading={saving}
              className="p-button-primary"
              style={buttonPrimaryStyle}
              onClick={handleCreate}
            />
          )}
        </div>
      </div>

      {/* ── Export classification dialog ─────────────────────────────── */}
      <Dialog
        header="Tạo định mức tự động từ Bước 1"
        visible={showAutoBomDialog}
        style={{ width: 'min(1100px, 96vw)' }}
        onHide={() => { if (!autoBomSaving) setShowAutoBomDialog(false) }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Quy mô mẻ dùng để quy đổi các dòng vật tư theo 1 đơn vị sản phẩm đầu ra.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                label="Hủy"
                icon="pi pi-times"
                className="p-button-outlined p-button-secondary"
                disabled={autoBomSaving}
                style={buttonSecondaryStyle}
                onClick={() => setShowAutoBomDialog(false)}
              />
              <Button
                label={autoBomSaving ? 'Đang lưu...' : 'Lưu định mức'}
                icon="pi pi-save"
                loading={autoBomSaving}
                disabled={!autoBomOutputProduct}
                className="p-button-primary"
                style={buttonPrimaryStyle}
                onClick={() => { void handleCreateAutoBom() }}
              />
            </div>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>TÊN ĐỊNH MỨC</label>
            <InputText
              value={autoBomName}
              onChange={(e) => setAutoBomName(e.target.value)}
              placeholder="Nhập tên định mức"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>MÃ ĐỊNH MỨC</label>
            <InputText
              value={autoBomCode}
              onChange={(e) => setAutoBomCode(e.target.value)}
              placeholder="Để trống để tự sinh"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>QUY MÔ MẺ</label>
            <InputNumber
              value={autoBomBaseQty}
              onValueChange={(e) => setAutoBomBaseQty(e.value ?? 1)}
              min={0.001}
              maxFractionDigits={3}
              locale="vi-VN"
              style={{ width: '100%' }}
              inputStyle={{ width: '100%' }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
              Dùng làm mẫu số để tính số lượng vật tư cho 1 {autoBomOutputUnitLabel}.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${autoBomOutputProduct ? '#bfdbfe' : '#fecaca'}`, background: autoBomOutputProduct ? '#eff6ff' : '#fef2f2' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#334155' }}>SẢN PHẨM ĐẦU RA</div>
          {autoBomOutputProduct ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{autoBomOutputProduct.code}</span>
              <span style={{ color: '#334155' }}>{autoBomOutputProduct.name}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: autoBomOutputProduct.outputType === 'finished' ? '#dcfce7' : '#fef9c3',
                color: autoBomOutputProduct.outputType === 'finished' ? '#15803d' : '#a16207',
              }}>
                {autoBomOutputProduct.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#b91c1c' }}>
              Chưa chọn sản phẩm đầu ra. Định mức sẽ lưu không gắn sản phẩm đầu ra.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>GHI CHÚ</label>
          <InputTextarea
            value={autoBomNotes}
            onChange={(e) => setAutoBomNotes(e.target.value)}
            rows={2}
            autoResize
            style={{ width: '100%' }}
            placeholder="Ghi chú cho định mức mới"
          />
        </div>

        <DataTable
          value={autoBomRows}
          dataKey="key"
          responsiveLayout="scroll"
          size="small"
          emptyMessage="Không có dòng NVL/BTP/TP để tạo định mức"
        >
          <Column
            header="Nhóm"
            body={(row: AutoBomPreviewRow) => (
              <span style={{ fontWeight: 700, color: row.previewLineType === 'nvl' ? '#2563eb' : row.previewLineType === 'btp' ? '#0f766e' : '#9333ea' }}>
                {autoBomLineTypeLabel[row.previewLineType]}
              </span>
            )}
            style={{ width: 90 }}
          />
          <Column field="materialCode" header="Mã" style={{ width: 140 }} />
          <Column field="materialName" header="Tên NVL/BTP/TP" />
          <Column field="materialUnit" header="ĐVT" style={{ width: 90 }} />
          <Column
            header="SL kế hoạch"
            body={(row: AutoBomPreviewRow) => formatQuantity(row.sourceQty)}
            style={{ width: 130, textAlign: 'right' }}
          />
          <Column
            header={`SL / ${autoBomOutputUnitLabel}`}
            body={(row: AutoBomPreviewRow) => (
              <InputNumber
                value={row.qtyPerBase}
                onValueChange={(e) => updateAutoBomRowQtyPerBase(row.key, e.value ?? null)}
                min={0}
                maxFractionDigits={3}
                locale="vi-VN"
                style={{ width: '100%' }}
                inputStyle={{ width: '100%' }}
              />
            )}
            style={{ width: 160 }}
          />
        </DataTable>
      </Dialog>

      <Dialog
        header="Xuất Phiếu Yêu Cầu NVL"
        visible={showExportDialog}
        style={{ width: 420 }}
        onHide={() => { if (!exporting) setShowExportDialog(false) }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              label="Hủy"
              icon="pi pi-times"
              className="p-button-outlined p-button-secondary"
              disabled={exporting}
              style={buttonSecondaryStyle}
              onClick={() => setShowExportDialog(false)}
            />
            <Button
              label={exporting ? 'Đang xuất...' : 'Xuất file'}
              icon="pi pi-file-word"
              loading={exporting}
              disabled={selectedClassCode.size === 0}
              className="p-button-primary"
              style={buttonPrimaryStyle}
              onClick={async () => {
                if (!order || selectedClassCode.size === 0) return
                const codes = [...selectedClassCode]
                const names = codes
                  .map((c) => classifications.find((cl) => cl.code === c)?.name ?? c)
                  .join(', ')
                setExporting(true)
                try {
                  await exportNvlRequestDoc(order, codes, names)
                  setShowExportDialog(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Không thể xuất phiếu yêu cầu NVL.')
                } finally {
                  setExporting(false)
                }
              }}
            />
          </div>
        }
      >
        {classLoading ? (
          <p style={{ margin: 0, color: '#888' }}>Đang tải danh mục phân loại...</p>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
              Chọn phân loại vật liệu muốn xuất phiếu:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classifications.map((cls) => (
                <label
                  key={cls.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${selectedClassCode.has(cls.code) ? '#5269e0' : '#ddd'}`,
                    background: selectedClassCode.has(cls.code) ? '#f0f3ff' : '#fff',
                    fontWeight: selectedClassCode.has(cls.code) ? 600 : 400,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    value={cls.code}
                    checked={selectedClassCode.has(cls.code)}
                    onChange={(e) => {
                      const next = new Set(selectedClassCode)
                      if (e.target.checked) next.add(cls.code)
                      else next.delete(cls.code)
                      setSelectedClassCode(next)
                    }}
                    style={{ accentColor: '#5269e0', width: 15, height: 15 }}
                  />
                  <span>{cls.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999' }}>{cls.code}</span>
                </label>
              ))}
              {classifications.length === 0 && (
                <p style={{ margin: 0, color: '#aaa', fontSize: 13 }}>Không có phân loại nào.</p>
              )}
            </div>
          </>
        )}
      </Dialog>

      {/* Flow diagram modal */}
      <ProductionFlowModal
        visible={showFlowModal}
        orderId={orderId ?? null}
        onHide={() => setShowFlowModal(false)}
      />
    </div>
  )
}
