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
  type LinePayload,
  type ProductionOrderDetail,
  type ProductionOrderLine,
} from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'

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

interface Step3BtpSummary {
  key: string
  locationName: string
  btpCode: string
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
  const [exportingStockCard, setExportingStockCard] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  function handleLineChange<K extends keyof TpReceiptLine>(id: string, field: K, value: TpReceiptLine[K]) {
    setReceiptLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)))
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

    await upsertProductionOrderLines(orderId, 4, payload)

    const refreshed = await fetchProductionOrderDetail(orderId)
    setOrder(refreshed)
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
    if (!orderId) return
    try {
      setCompleting(true)
      setError(null)
      await saveStep4Lines()
      await completeProductionOrder(orderId)
      navigate('/production')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hoàn tất phiếu')
    } finally {
      setCompleting(false)
    }
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

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                Giai đoạn 3: Hoàn tất
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
                  <label>Số lượng thực nhập</label>
                  <InputNumber
                    value={primaryLine.quantity}
                    onValueChange={(e) => handleLineChange(primaryLine.id, 'quantity', e.value ?? 0)}
                    mode="decimal"
                    min={0}
                    maxFractionDigits={3}
                    locale="vi-VN"
                    suffix={primaryLine.unit ? ` ${primaryLine.unit}` : undefined}
                    inputStyle={{ width: '100%', textAlign: 'left' }}
                  />
                </div>
                <div className="prod-step4-field">
                  <label>Lô nhập mới</label>
                  <InputText
                    value={primaryLine.lotNo}
                    onChange={(e) => handleLineChange(primaryLine.id, 'lotNo', e.target.value)}
                    placeholder="Nhập số lô"
                  />
                </div>
                <div className="prod-step4-field">
                  <label>Hạn sử dụng</label>
                  <Calendar
                    value={primaryLine.expiryDate ? new Date(primaryLine.expiryDate) : null}
                    onChange={(e) => {
                      const date = e.value instanceof Date ? e.value : null
                      handleLineChange(primaryLine.id, 'expiryDate', date ? toDateOnlyString(date) : null)
                    }}
                    dateFormat="dd/mm/yy"
                    showIcon
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
          <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={handleCancel} />
        </div>
        <div className="prod-footer-bar__right">
          <Button
            label="← Bước 3: Xuất BTP"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-3`)}
          />
          <Button label="IN PHIẾU" icon="pi pi-print" className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
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
            className="p-button-outlined"
            style={{ fontSize: 12, fontWeight: 700, borderColor: '#5269e0', color: '#5269e0' }}
            onClick={handleSaveDraft}
          />
          <Button
            label="XÁC NHẬN HOÀN TẤT"
            icon="pi pi-check-circle"
            loading={completing}
            className="p-button-primary"
            style={{ background: '#10b981', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
            onClick={handleComplete}
          />
        </div>
      </div>
    </div>
  )
}
