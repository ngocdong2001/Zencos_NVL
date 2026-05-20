import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { exportFinishedGoodsStockCard } from '../lib/productionStockCardExport'
import {
  completeProductionOrder,
  fetchProductionOrderDetail,
  upsertProductionOrderLines,
  updateProductionOrderStatus,
  returnNvlToWarehouse,
  type LinePayload,
  type ProductionOrderDetail,
  type ProductionOrderLine,
} from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'

interface TpReceiptLine {
  id: string
  productId: string | null
  outputProductId: string | null
  locationId: string | null
  tpCode: string
  tpName: string
  lotNo: string
  mfgDate: string | null
  expiryDate: string | null
  plannedQty: number
  quantity: number
  unit: string
  qualityStatus: 'pass' | 'fail' | 'pending'
  notes: string
}

interface NvlReturnLine {
  id: string
  productId: string | null
  productCode: string
  productName: string
  lotNo: string | null
  unit: string
  plannedQty: number
  exportedQty: number    // step1 actualQty — đã xuất khỏi kho
  consumedQty: number    // step2 actualQty sum — thực tế tiêu hao (user nhập ở bước 2)
  diffQty: number        // exportedQty - consumedQty (+ = còn dư, - = thiếu)
  returnQty: number      // editable
}

interface Step3BtpSummary {
  key: string
  locationName: string
  btpCode: string
  btpName: string
  actualQty: number
  unit: string
}

function fmtQty(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('vi-VN')
}

function toDateOnlyString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function mapLineToReceiptLine(line: ProductionOrderLine): TpReceiptLine {
  return {
    id: String(line.id),
    productId: line.productId,
    outputProductId: line.outputProductId,
    locationId: line.locationId,
    tpCode: line.productCode,
    tpName: line.productName,
    lotNo: line.lotNo ?? '',
    mfgDate: null,
    expiryDate: line.expiryDate ?? null,
    plannedQty: Number(line.plannedQty),
    quantity: Number(line.actualQty) || Number(line.plannedQty),
    unit: line.unit,
    qualityStatus: 'pending',
    notes: line.notes ?? '',
  }
}

function mapOrderOutputToStep4Draft(order: ProductionOrderDetail, defaultQty: number): TpReceiptLine {
  const output = order.outputProduct
  return {
    id: `draft-output-${order.id}`,
    productId: null,
    outputProductId: output?.id ?? order.outputProductId,
    locationId: null,
    tpCode: output?.code ?? '',
    tpName: output?.name ?? '',
    lotNo: '',
    mfgDate: null,
    expiryDate: null,
    plannedQty: defaultQty,
    quantity: defaultQty,
    unit: output?.unit ?? '',
    qualityStatus: 'pending',
    notes: '',
  }
}

function normalizeStep4LineWithOrderOutput(line: TpReceiptLine, order: ProductionOrderDetail): TpReceiptLine {
  if (!order.outputProductId || !order.outputProduct) return line
  return {
    ...line,
    outputProductId: order.outputProductId,
    tpCode: order.outputProduct.code,
    tpName: order.outputProduct.name,
    unit: order.outputProduct.unit,
  }
}

function buildStep3BtpSummaries(lines: ProductionOrderLine[]): Step3BtpSummary[] {
  const grouped = new Map<string, Step3BtpSummary>()

  for (const line of lines) {
    const key = line.outputProductId ?? `line-${line.id}`
    const current = grouped.get(key)
    const qty = Number(line.actualQty)

    if (!current) {
      grouped.set(key, {
        key,
        locationName: line.location?.name ?? 'Kho Bán thành phẩm',
        btpCode: line.outputProduct?.code ?? line.productCode ?? '---',
        btpName: line.outputProduct?.name ?? line.productName ?? '',
        actualQty: qty,
        unit: line.outputProduct?.unit ?? line.unit ?? '',
      })
      continue
    }

    current.actualQty += qty
    if (!current.locationName && line.location?.name) current.locationName = line.location.name
  }

  return Array.from(grouped.values())
}

function sumQtyByUnit(lines: ProductionOrderLine[], unit: string | null | undefined): number {
  if (!unit) return 0
  return lines
    .filter((line) => (line.outputProduct?.unit ?? line.unit) === unit)
    .reduce((sum, line) => sum + Number(line.actualQty), 0)
}

export function ProductionStep4Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [receiptLines, setReceiptLines] = useState<TpReceiptLine[]>([])
  const [step3Summaries, setStep3Summaries] = useState<Step3BtpSummary[]>([])
  const [actualInputQty, setActualInputQty] = useState<number | null>(null)
  const [inputQtyTouched, setInputQtyTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [exportingStockCard, setExportingStockCard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processedAt, setProcessedAt] = useState<Date | null>(null)

  // NVL return state
  const [nvlReturnLines, setNvlReturnLines] = useState<NvlReturnLine[]>([])
  const [step1RawLines, setStep1RawLines] = useState<ProductionOrderLine[]>([])
  const [returnQtyErrorIds, setReturnQtyErrorIds] = useState<Set<string>>(new Set())

  // Flow diagram modal
  const [showFlowModal, setShowFlowModal] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        const step3Lines = data.lines.filter((l) => l.step === 3 && l.direction === 'out')
        const step4Lines = data.lines.filter((l) => l.step === 4 && l.direction === 'in')
        const defaultQtyByOutputUnit = sumQtyByUnit(step3Lines, data.outputProduct?.unit)
        setStep3Summaries(buildStep3BtpSummaries(step3Lines))
        if (step4Lines.length > 0) {
          setActualInputQty(Number(step4Lines[0].plannedQty))
          setInputQtyTouched(true)
          setReceiptLines(step4Lines.map((line) => normalizeStep4LineWithOrderOutput(mapLineToReceiptLine(line), data)))
        } else if (data.outputProductId && data.outputProduct) {
          setActualInputQty(defaultQtyByOutputUnit)
          setInputQtyTouched(false)
          setReceiptLines([mapOrderOutputToStep4Draft(data, defaultQtyByOutputUnit)])
        } else {
          setActualInputQty(0)
          setInputQtyTouched(false)
          setReceiptLines([])
        }
        setProcessedAt(data.step4ProcessedAt ? new Date(data.step4ProcessedAt) : null)

        // Build NVL return lines from step-1 out lines
        const step1Lines = data.lines.filter((l) => l.step === 1 && l.direction === 'out')
        setStep1RawLines(data.lines.filter((l) => l.step === 1))
        // Build consumption map from step-2 in lines (SL thực tiêu hao, user nhập ở bước 2)
        const step2InLines = data.lines.filter((l) => l.step === 2 && l.direction === 'in')
        const consumedMap = new Map<string, number>()
        for (const l of step2InLines) {
          const key = `${l.productCode}|${l.lotNo ?? ''}`
          consumedMap.set(key, (consumedMap.get(key) ?? 0) + Number(l.actualQty))
        }
        // Group step1 lines by productCode+lotNo to handle same NVL added multiple times
        type Step1Group = { firstId: string; line: typeof step1Lines[0]; planned: number; exported: number; savedWaste: number }
        const groupMap = new Map<string, Step1Group>()
        for (const l of step1Lines) {
          const key = `${l.productCode}|${l.lotNo ?? ''}`
          const existing = groupMap.get(key)
          if (existing) {
            existing.planned += Number(l.plannedQty)
            existing.exported += Number(l.actualQty)
            existing.savedWaste += Number(l.wasteQty)
          } else {
            groupMap.set(key, { firstId: String(l.id), line: l, planned: Number(l.plannedQty), exported: Number(l.actualQty), savedWaste: Number(l.wasteQty) })
          }
        }
        // Restore saved returnQty from wasteQty if step 4 has been saved before
        const hasSavedStep4 = !!data.step4ProcessedAt || data.lines.some((l) => l.step === 4)
        const returnLines: NvlReturnLine[] = []
        for (const [key, group] of groupMap) {
          const consumed = consumedMap.get(key) ?? 0
          const diff = group.exported - consumed
          const returnQty = hasSavedStep4 ? group.savedWaste : Math.max(0, diff)
          returnLines.push({
            id: group.firstId,
            productId: group.line.productId,
            productCode: group.line.productCode,
            productName: group.line.productName,
            lotNo: group.line.lotNo,
            unit: group.line.unit,
            plannedQty: group.planned,
            exportedQty: group.exported,
            consumedQty: consumed,
            diffQty: diff,
            returnQty,
          })
        }
        setNvlReturnLines(returnLines)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  function handleLineChange<K extends keyof TpReceiptLine>(id: string, field: K, value: TpReceiptLine[K]) {
    setReceiptLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)))
  }

  function handleReturnQtyChange(id: string, value: number) {
    setNvlReturnLines((prev) => {
      const updated = prev.map((line) => (line.id === id ? { ...line, returnQty: value } : line))
      // Real-time validation: update error set immediately as user types
      const changedLine = updated.find((l) => l.id === id)
      if (changedLine) {
        const maxAllowed = changedLine.consumedQty > 0
          ? Math.max(0, changedLine.diffQty)
          : changedLine.exportedQty
        setReturnQtyErrorIds((prev) => {
          const next = new Set(prev)
          if (value < 0 || value > maxAllowed + 0.0001) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
      }
      return updated
    })
  }

  async function saveStep4Lines() {
    if (!orderId) return
    const payload: LinePayload[] = receiptLines.map((line, idx) => ({
      productId: line.productId,
      outputProductId: order?.outputProductId ?? line.outputProductId ?? null,
      productCode: line.tpCode,
      productName: line.tpName,
      lotNo: line.lotNo || null,
      expiryDate: line.expiryDate,
      plannedQty: idx === 0 ? (actualInputQty ?? line.plannedQty) : line.plannedQty,
      actualQty: line.quantity,
      wasteQty: 0,
      unit: line.unit,
      locationId: line.locationId,
      qualityStatus: line.qualityStatus,
      direction: 'in',
      notes: line.notes || null,
    }))

    // Persist returnQty into step-1 lines' wasteQty so it survives page reload
    // For grouped NVL (same product+lot added multiple times), only the first line stores returnQty; others get 0
    if (step1RawLines.length > 0) {
      const seenReturnKeys = new Set<string>()
      const step1Payload: LinePayload[] = step1RawLines.map((l) => {
        const key = `${l.productCode}|${l.lotNo ?? ''}`
        const returnLine = nvlReturnLines.find((r) => r.productCode === l.productCode && (r.lotNo ?? null) === (l.lotNo ?? null))
        const isFirst = !seenReturnKeys.has(key)
        if (isFirst) seenReturnKeys.add(key)
        return {
          productId: l.productId,
          outputProductId: l.outputProductId,
          productCode: l.productCode,
          productName: l.productName,
          lotNo: l.lotNo,
          expiryDate: l.expiryDate,
          exportDate: l.exportDate,
          plannedQty: Number(l.plannedQty),
          actualQty: Number(l.actualQty),
          wasteQty: isFirst ? (returnLine?.returnQty ?? 0) : 0,
          unit: l.unit,
          locationId: l.locationId,
          qualityStatus: l.qualityStatus,
          direction: l.direction,
          notes: l.notes,
        }
      })
      await upsertProductionOrderLines(orderId, 1, step1Payload)
    }

    await upsertProductionOrderLines(orderId, 4, payload, processedAt?.toISOString() ?? null)

    const refreshed = await fetchProductionOrderDetail(orderId)
    setOrder(refreshed)
    setStep1RawLines(refreshed.lines.filter((l) => l.step === 1))
    const refreshedStep4 = refreshed.lines.filter((l) => l.step === 4 && l.direction === 'in')
    if (refreshedStep4.length > 0) {
      setActualInputQty(Number(refreshedStep4[0].plannedQty))
      setInputQtyTouched(true)
    }
    setReceiptLines(refreshedStep4.map((line) => normalizeStep4LineWithOrderOutput(mapLineToReceiptLine(line), refreshed)))
  }

  async function handleSaveDraft() {
    if (!orderId) return
    setSaving(true)
    setError(null)
    try {
      await saveStep4Lines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu bước 4')
    } finally {
      setSaving(false)
    }
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

  const handleComplete = async () => {
    if (!orderId || !primaryLine) return

    // Validate required fields: quantity, lotNo, expiryDate
    const missingFields = []
    if (!primaryLine.quantity) missingFields.push('Số lượng thực nhập')
    if (!primaryLine.lotNo?.trim()) missingFields.push('Lô nhập mới')
    if (!primaryLine.expiryDate) missingFields.push('Hạn sử dụng')

    if (missingFields.length > 0) {
      setError(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`)
      return
    }

    // Validate NVL return quantities are within allowed range
    // Rule: returnQty must not exceed the actual surplus (max(0, diffQty) when B2 is done)
    //       and must never exceed exportedQty
    const invalidReturnLines = nvlReturnLines.filter((l) => {
      if (l.returnQty < 0) return true
      if (l.returnQty > l.exportedQty) return true
      // When B2 data exists: can't return more than actual surplus
      if (l.consumedQty > 0 && l.returnQty > Math.max(0, l.diffQty) + 0.0001) return true
      return false
    })
    if (invalidReturnLines.length > 0) {
      setReturnQtyErrorIds(new Set(invalidReturnLines.map((l) => l.id)))
      const detail = invalidReturnLines.map((l) => {
        const maxAllowed = l.consumedQty > 0 ? Math.max(0, l.diffQty) : l.exportedQty
        return `${l.productCode}${l.lotNo ? ` (lô ${l.lotNo})` : ''}: nhập ${fmtQty(l.returnQty)} — tối đa ${fmtQty(maxAllowed)} ${l.unit}`
      }).join('; ')
      setError(`Số lượng hoàn nhập vượt phạm vi cho phép: ${detail}`)
      return
    }
    showDangerConfirm({
      header: 'Xác nhận hoàn tất phiếu',
      message: `Bạn chắc chắn muốn hoàn tất phiếu ${order?.orderRef ?? orderId}? Dữ liệu sẽ bị khóa lại và không thể chỉnh sửa.`,
      acceptLabel: 'Xác nhận hoàn tất',
      rejectLabel: 'Quay lại',
      onAccept: async () => {
        setCompleting(true)
        setError(null)
        try {
          // Auto-create NVL return for lines with returnQty > 0
          const linesToReturn = nvlReturnLines.filter((l) => l.returnQty > 0 && l.productId && l.lotNo)
          if (linesToReturn.length > 0) {
            await returnNvlToWarehouse(
              orderId,
              linesToReturn.map((l) => ({ productId: l.productId!, lotNo: l.lotNo!, returnQty: l.returnQty })),
            )
          }
          await saveStep4Lines()
          await completeProductionOrder(orderId)
          navigate('/production')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Không thể hoàn tất phiếu')
        } finally {
          setCompleting(false)
        }
      },
    })
  }

  const handleExportStockCard = async () => {
    if (!order || !primaryLine) return
    try {
      setExportingStockCard(true)
      setError(null)
      await exportFinishedGoodsStockCard({
        order,
        receiptLine: {
          tpCode: primaryLine.tpCode,
          tpName: primaryLine.tpName,
          quantity: primaryLine.quantity,
          plannedQty: actualInputQty ?? primaryLine.plannedQty,
          unit: primaryLine.unit,
          notes: primaryLine.notes,
        },
        step3Summaries,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xuất báo cáo thẻ kho thành phẩm')
    } finally {
      setExportingStockCard(false)
    }
  }

  const primaryLine = receiptLines[0] ?? null
  const receivingLocationName = 'Kho Thành phẩm'
  const outputUnit = primaryLine?.unit ?? order?.outputProduct?.unit ?? ''
  const suggestedInputQty = outputUnit
    ? step3Summaries.filter((row) => row.unit === outputUnit).reduce((sum, row) => sum + row.actualQty, 0)
    : 0
  const effectiveInputQty = actualInputQty ?? suggestedInputQty
  const sourceUnits = Array.from(new Set(step3Summaries.map((row) => row.unit).filter(Boolean)))
  const canAggregateSourceQty = sourceUnits.length <= 1
  const convertedQty = primaryLine?.quantity ?? 0
  const wasteQty = effectiveInputQty - convertedQty
  const wastePct = effectiveInputQty > 0 ? (wasteQty / effectiveInputQty) * 100 : null
  const isLocked = order?.status === 'completed' || order?.status === 'cancelled'

  if (loading) {
    return (
      <div className="prod-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: '#5269e0' }} />
      </div>
    )
  }

  return (
    <div className="prod-page">
      <div className="prod-header">
        <div className="prod-header__left">
          <h1 className="prod-header__title">Nhập Kho Thành Phẩm</h1>
        </div>
        <div className="prod-header__right">
          <span className="prod-step-badge prod-step-badge--active">Bước 4 / 4 — Nhập TP</span>
        </div>
      </div>

      <div className="prod-step4-meta-row">
        <span>Phiếu: #{order?.orderRef ?? '---'}</span>
        <span>•</span>
        <span>Ngày tạo: {fmtDate(order?.createdAt)}</span>
        <span>•</span>
        <span className="prod-step4-meta-row__owner">Phụ trách: {order?.creator?.fullName ?? '—'}</span>
      </div>

      <p className="prod-subtitle">Nhập thành phẩm hoàn chỉnh vào kho thành phẩm và hoàn tất quy trình sản xuất</p>

      <div className="prod-step4-info-note">
        <i className="pi pi-info-circle" />
        <div>
          <div className="prod-step4-info-note__title">Dữ liệu đã được kiểm tra chéo</div>
          <div className="prod-step4-info-note__desc">Số lượng thành phẩm nhập kho được đối soát theo dữ liệu từ các bước trước.</div>
        </div>
      </div>

      <ProductionStepBar
        activeStep={4}
        orderId={orderId}
        maxReachedStep={Math.max(order?.currentStep ?? 4, ...(order?.lines?.map((l) => l.step) ?? [4]))}
        onNavigate={(s) => {
          if (orderId) navigate(`/production/${orderId}/buoc-${s}`)
        }}
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

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Ngày xử lý */}
        <div className="prod-card" style={{ padding: '14px 20px' }}>
          <div className="prod-form-field" style={{ maxWidth: 260 }}>
            <label>NGÀY XỬ LÝ (BƯỚC 4)</label>
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

        <div className="prod-card prod-card--step-done">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--done">
                <i className="pi pi-check" /> Bước 3 hoàn tất
              </span>
              <span className="prod-card__title">Kết quả Xuất BTP cho đóng gói</span>
            </div>
          </div>
          {step3Summaries.length === 0 ? (
            <div className="prod-xk-meta">
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">KHO XUẤT</span>
                <span className="prod-xk-meta__val">Kho Bán thành phẩm</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">MÃ BTP</span>
                <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>---</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">SẢN LƯỢNG XUẤT</span>
                <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>0</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">TRẠNG THÁI</span>
                <span className="prod-xk-status prod-xk-status--fulfilled">ĐÃ GHI NHẬN</span>
              </div>
            </div>
          ) : step3Summaries.map((summary, idx) => (
            <div className="prod-xk-meta" key={summary.key} style={{ marginTop: idx > 0 ? 8 : 0 }}>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">KHO XUẤT</span>
                <span className="prod-xk-meta__val">{summary.locationName}</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">MÃ BTP</span>
                <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>{summary.btpCode}</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">SẢN LƯỢNG XUẤT</span>
                <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>
                  {fmtQty(summary.actualQty)} {summary.unit}
                </span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">TRẠNG THÁI</span>
                <span className="prod-xk-status prod-xk-status--fulfilled">ĐÃ GHI NHẬN</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── NVL Dư / Thiếu & Hoàn Nhập ── */}
        {nvlReturnLines.length > 0 && (
          <div className="prod-card" style={{ border: '1.5px solid #e0e7ff' }}>
            <div className="prod-card__title-row" style={{ marginBottom: 12 }}>
              <div className="prod-card__title-left">
                <span className="prod-step-badge" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
                  <i className="pi pi-box" /> NVL
                </span>
                <span className="prod-card__title">Kiểm tra NVL Thừa / Thiếu — Hoàn Nhập</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Số lượng hoàn nhập có thể chỉnh sửa. Chỉ hàng có lô hàng và SL &gt; 0 mới được xử lý.
              </div>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 80px 50px 80px 90px 90px 80px 110px',
              gap: 8,
              padding: '6px 10px',
              background: '#f8fafc',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 4,
            }}>
              <div>Mã NVL</div>
              <div>Tên NVL</div>
              <div>Số Lô</div>
              <div>ĐVT</div>
              <div style={{ textAlign: 'right' }}>KH Xuất</div>
              <div style={{ textAlign: 'right' }}>Xuất kho (B1)</div>
              <div style={{ textAlign: 'right', color: '#3b82f6' }}>Tiêu hao (B2)</div>
              <div style={{ textAlign: 'right' }}>Còn dư</div>
              <div style={{ textAlign: 'right' }}>SL Hoàn nhập</div>
            </div>

            {nvlReturnLines.map((line) => {
              const isExcess = line.diffQty > 0.0001
              const isShort  = line.diffQty < -0.0001
              const hasReturnError = returnQtyErrorIds.has(line.id)
              // Real-time: max allowed = surplus if B2 done, else exportedQty
              const maxAllowedReturn = line.consumedQty > 0 ? Math.max(0, line.diffQty) : line.exportedQty
              const isReturnOverLimit = line.returnQty > maxAllowedReturn + 0.0001
              const showReturnErr = hasReturnError || isReturnOverLimit
              return (
                <div key={line.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 80px 50px 80px 90px 90px 80px 110px',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  marginBottom: 3,
                  background: showReturnErr ? '#fff1f2' : isExcess ? '#f0fdf4' : isShort ? '#fff7ed' : '#fafafa',
                  border: `1.5px solid ${showReturnErr ? '#ef4444' : isExcess ? '#bbf7d0' : isShort ? '#fed7aa' : '#e2e8f0'}`,
                  boxShadow: showReturnErr ? '0 0 0 3px #fee2e220' : undefined,
                  alignItems: 'center',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, color: '#5269e0', fontSize: 12 }}>{line.productCode}</div>
                  <div style={{ color: '#1e293b', fontSize: 12 }}>{line.productName}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{line.lotNo ?? <span style={{ color: '#cbd5e1' }}>—</span>}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{line.unit}</div>
                  <div style={{ textAlign: 'right', color: '#475569' }}>{fmtQty(line.plannedQty)}</div>
                  <div style={{ textAlign: 'right', color: '#475569' }}>{fmtQty(line.exportedQty)}</div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: line.consumedQty > 0 ? '#1e293b' : '#94a3b8' }}>
                    {line.consumedQty > 0 ? fmtQty(line.consumedQty) : <span style={{ fontSize: 11 }}>Chưa có B2</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isExcess ? (
                      <span style={{ color: '#15803d', fontWeight: 700, fontSize: 12 }}>
                        +{fmtQty(line.diffQty)} <span style={{ background: '#dcfce7', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>THỪA</span>
                      </span>
                    ) : isShort ? (
                      <span style={{ color: '#c2410c', fontWeight: 700, fontSize: 12 }}>
                        {fmtQty(line.diffQty)} <span style={{ background: '#ffedd5', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>THIẾU</span>
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>0 <span style={{ background: '#f1f5f9', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>ĐÚNG KH</span></span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <InputNumber
                      value={line.returnQty}
                      onValueChange={(e) => handleReturnQtyChange(line.id, e.value ?? 0)}
                      mode="decimal"
                      min={0}
                      maxFractionDigits={3}
                      locale="vi-VN"
                      disabled={isLocked}
                      inputStyle={{ width: 100, textAlign: 'right', fontSize: 13, padding: '4px 8px',
                        background: showReturnErr ? '#fff1f2' : line.returnQty > 0 ? '#eff6ff' : undefined,
                        borderColor: showReturnErr ? '#ef4444' : undefined,
                        outline: showReturnErr ? '2px solid #fca5a5' : undefined,
                      }}
                    />
                    {showReturnErr && (
                      <span style={{ fontSize: 9, color: '#ef4444', whiteSpace: 'nowrap' }}>
                        Tối đa {fmtQty(maxAllowedReturn)} {line.unit}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Footer summary */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
              {nvlReturnLines.filter((l) => l.diffQty > 0.0001).length} dòng THỪA &nbsp;·&nbsp;
              {nvlReturnLines.filter((l) => l.diffQty < -0.0001).length} dòng THIẾU &nbsp;·&nbsp;
              Tổng SL hoàn nhập: <strong style={{ color: '#1e293b' }}>
                {fmtQty(nvlReturnLines.reduce((s, l) => s + l.returnQty, 0))}
              </strong>
              <span style={{ marginLeft: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                — Phiếu hoàn nhập sẽ được tạo tự động khi xác nhận hoàn tất.
              </span>
            </div>
          </div>
        )}

        <div className="prod-card prod-step4-receipt-card">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--active">
                <i className="pi pi-arrow-right" /> Bước 4
              </span>
              <span className="prod-card__title">Phiếu nhập kho Thành phẩm</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="prod-xk-status" style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Giai đoạn 4: Hoàn tất
              </span>
            </div>
          </div>

          {!primaryLine ? (
            <div className="prod-xk-summary" style={{ marginTop: 12 }}>
              <span style={{ color: '#94a3b8' }}>Chưa có dữ liệu nhập TP</span>
            </div>
          ) : (
            <>
              <div className="prod-step4-fields-grid">
                <div className="prod-step4-field">
                  <label>Mã Thành phẩm</label>
                  <InputText value={primaryLine.tpCode} readOnly />
                </div>
                <div className="prod-step4-field prod-step4-field--wide">
                  <label>Tên Thành phẩm</label>
                  <InputText value={primaryLine.tpName} readOnly />
                </div>
                <div className="prod-step4-field">
                  <label><span style={{ color: '#dc2626' }}>*</span> Số lượng thực nhập</label>
                  <InputNumber
                    value={primaryLine.quantity}
                    onValueChange={(e) => handleLineChange(primaryLine.id, 'quantity', e.value ?? 0)}
                    mode="decimal"
                    min={0}
                    maxFractionDigits={3}
                    locale="vi-VN"
                    disabled={isLocked}
                    suffix={primaryLine.unit ? ` ${primaryLine.unit}` : undefined}
                    inputStyle={{ width: '100%', textAlign: 'left' }}
                  />
                </div>
                <div className="prod-step4-field">
                  <label><span style={{ color: '#dc2626' }}>*</span> Lô nhập mới</label>
                  <InputText
                    value={primaryLine.lotNo}
                    onChange={(e) => handleLineChange(primaryLine.id, 'lotNo', e.target.value)}
                    placeholder="Nhập số lô"
                    readOnly={isLocked}
                  />
                </div>
                <div className="prod-step4-field">
                  <label><span style={{ color: '#dc2626' }}>*</span> Hạn sử dụng</label>
                  <Calendar
                    value={primaryLine.expiryDate ? new Date(primaryLine.expiryDate) : null}
                    onChange={(e) => {
                      const date = e.value instanceof Date ? e.value : null
                      handleLineChange(primaryLine.id, 'expiryDate', date ? toDateOnlyString(date) : null)
                    }}
                    dateFormat="dd/mm/yy"
                    showIcon
                    disabled={isLocked}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="prod-step4-field">
                  <label>Kho nhập</label>
                  <InputText value={receivingLocationName} readOnly />
                </div>
              </div>

              <div className="prod-step4-waste-card">
                <div className="prod-step4-waste-card__title"><i className="pi pi-sliders-h" /> Ghi nhận Hao hụt & Chênh lệch</div>
                <div className="prod-step4-waste-grid">
                  <div className="prod-step4-waste-metrics">
                    <div><span>Khối lượng quy đổi (theo SL thực nhập):</span><strong>{fmtQty(convertedQty)} {primaryLine.unit}</strong></div>
                    <div>
                      <span>Tổng số lượng kế hoạch:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <InputNumber
                          value={effectiveInputQty}
                          onValueChange={(e) => {
                            setActualInputQty(e.value ?? 0)
                            setInputQtyTouched(true)
                          }}
                          mode="decimal"
                          min={0}
                          maxFractionDigits={3}
                          locale="vi-VN"
                          disabled={isLocked}
                          suffix={outputUnit ? ` ${outputUnit}` : undefined}
                          inputStyle={{ width: 190, textAlign: 'right', fontWeight: 600 }}
                        />
                        <em style={{ color: '#64748b', fontSize: 12 }}>
                          {inputQtyTouched ? 'Đang dùng số bạn đã nhập.' : `Gợi ý: ${fmtQty(suggestedInputQty)} ${outputUnit || ''}`}
                          {canAggregateSourceQty ? '' : ' (nguồn có nhiều đơn vị, chỉ gợi ý cùng đơn vị đầu ra)'}
                        </em>
                      </div>
                    </div>
                    {wastePct != null ? (
                      <div className="prod-step4-waste-highlight">
                        <span>Hao hụt thực tế:</span>
                        <strong>{fmtQty(wasteQty)} {outputUnit || primaryLine.unit}</strong>
                        <em>({wastePct >= 0 ? '-' : '+'} {Math.abs(wastePct).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%)</em>
                      </div>
                    ) : (
                      <div className="prod-step4-waste-highlight" style={{ borderTopColor: '#fca5a5' }}>
                        <span>Hao hụt thực tế:</span>
                        <strong style={{ color: '#b91c1c', fontSize: 14 }}>Không thể tính do thiếu tổng đầu vào thực tế.</strong>
                        <em style={{ color: '#b91c1c' }}>Vui lòng nhập tổng đầu vào để hệ thống tính hao hụt.</em>
                      </div>
                    )}
                  </div>
                  <div className="prod-step4-field prod-step4-field--note">
                    <label>Ghi chú hao hụt (nếu có)</label>
                    <InputTextarea
                      value={primaryLine.notes}
                      onChange={(e) => handleLineChange(primaryLine.id, 'notes', e.target.value)}
                      rows={5}
                      autoResize
                      disabled={isLocked}
                      placeholder="Mô tả nguyên nhân hao hụt..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        

        
      </div>

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
            label="← Bước 3: Xuất BTP"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-3`)}
          />
          <Button
            label="XUẤT THẺ KHO TP"
            icon="pi pi-file-excel"
            loading={exportingStockCard}
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={handleExportStockCard}
            disabled={!primaryLine}
          />
          <Button
            label="LƯU NHÁP"
            icon="pi pi-save"
            loading={saving}
            disabled={isLocked}
            className="p-button-outlined"
            style={{ fontSize: 12, fontWeight: 700, borderColor: '#5269e0', color: '#5269e0' }}
            onClick={handleSaveDraft}
          />
          <Button
            label="XÁC NHẬN HOÀN TẤT"
            icon="pi pi-check-circle"
            loading={completing}
            disabled={isLocked}
            className="p-button-primary"
            style={{ background: '#10b981', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
            onClick={handleComplete}
          />
        </div>
      </div>

      {/* Flow diagram modal */}
      <ProductionFlowModal
        visible={showFlowModal}
        orderId={orderId}
        onHide={() => setShowFlowModal(false)}
      />
    </div>
  )
}
