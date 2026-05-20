import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Tag } from 'primereact/tag'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import {
  fetchProductionOrderDetail,
  upsertProductionOrderLines,
  updateProductionOrderStatus,
  advanceProductionStep,
  type LinePayload,
  type ProductionOrderDetail,
  type ProductionOrderLine,
} from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BtpExportLine {
  id: string
  btpCode: string
  btpName: string
  lotNo: string
  expiryDate: string | null
  requestedQty: number
  actualQty: number
  unit: string
  status: 'ok' | 'short' | 'over'
}

interface Step2BtpSummary {
  key: string
  btpCode: string
  lotNo: string
  actualQty: number
  unit: string
  locationName: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_NO = 'PSX-20240515-0089'

function fmtQty(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function mapLineToExportLine(line: ProductionOrderLine, requestedOverride?: number): BtpExportLine {
  const planned = requestedOverride ?? Number(line.plannedQty)
  const actual  = Number(line.actualQty)
  const status: BtpExportLine['status'] = actual < planned ? 'short' : actual > planned ? 'over' : 'ok'
  return {
    id: String(line.id),
    btpCode:      line.productCode,
    btpName:      line.productName,
    lotNo:        line.lotNo ?? '',
    expiryDate:   line.expiryDate ?? null,
    requestedQty: planned,
    actualQty:    actual,
    unit:         line.unit,
    status,
  }
}

function mapStep2LineToStep3Payload(line: ProductionOrderLine): LinePayload {
  const plannedQty = Number(line.plannedQty)
  const actualQty = Number(line.actualQty)
  return {
    // For step-2 BTP out lines, productCode IS the BTP code; use outputProductId as productId if productId is null
    productId: line.productId ?? line.outputProductId,
    outputProductId: line.outputProductId,
    productCode: line.productCode,
    productName: line.productName,
    lotNo: line.lotNo,
    expiryDate: line.expiryDate,
    plannedQty,
    actualQty,
    wasteQty: 0,
    unit: line.unit,
    locationId: line.locationId,
    qualityStatus: line.qualityStatus,
    direction: 'out',
    notes: line.notes,
  }
}

function buildStep2PlannedMap(lines: ProductionOrderLine[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const line of lines) {
    const key = `${line.outputProductId ?? ''}|${line.productCode}|${line.lotNo ?? ''}`
    result.set(key, Number(line.plannedQty))
  }
  return result
}

function buildStep2BtpSummaries(lines: ProductionOrderLine[]): Step2BtpSummary[] {
  const grouped = new Map<string, Step2BtpSummary>()

  for (const line of lines) {
    // For direction='out' BTP lines: productCode = BTP code, actualQty = SL Thực nhập from step-2 group header
    const key = line.outputProductId ?? `line-${line.id}`
    const current = grouped.get(key)
    const qty = Number(line.actualQty)

    if (!current) {
      grouped.set(key, {
        key,
        btpCode: line.productCode ?? '---',
        lotNo: line.lotNo ?? '---',
        actualQty: qty,
        unit: line.unit ?? '',
        locationName: line.location?.name ?? 'Kho Bán thành phẩm',
      })
      continue
    }

    current.actualQty += qty
    if (current.lotNo === '---' && line.lotNo) current.lotNo = line.lotNo
    if (!current.locationName && line.location?.name) current.locationName = line.location.name
  }

  return Array.from(grouped.values())
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductionStep3Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [step3ApiLines, setStep3ApiLines] = useState<ProductionOrderLine[]>([])
  const [exportLines, setExportLines] = useState<BtpExportLine[]>([])
  const [step2Summaries, setStep2Summaries] = useState<Step2BtpSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingAndNext, setSavingAndNext] = useState(false)
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
        // BTP output lines from step 2 (quantities entered in group-header inputs)
        const step2Lines = data.lines.filter(l => l.step === 2 && l.direction === 'out')
        const step3Lines = data.lines.filter(l => l.step === 3 && l.direction === 'out')
        const step2PlannedMap = buildStep2PlannedMap(step2Lines)
        setStep2Summaries(buildStep2BtpSummaries(step2Lines))
        setStep3ApiLines(step3Lines)
        // Always build export lines from step-2 BTP output lines (ignore stale step-3 DB entries
        // which may contain NVL codes from an older version of the save logic)
        setExportLines(
          step2Lines.map((line) => {
            const key = `${line.outputProductId ?? ''}|${line.productCode}|${line.lotNo ?? ''}`
            const planned = step2PlannedMap.get(key)
            return mapLineToExportLine(line, planned)
          })
        )
        setProcessedAt(data.step3ProcessedAt ? new Date(data.step3ProcessedAt) : null)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function saveStep3Lines() {
    if (!orderId) return
    const step2Lines = (order?.lines ?? []).filter((line) => line.step === 2 && line.direction === 'out')

    // Always rebuild step-3 lines from step-2 BTP output lines to ensure correct product codes
    const payload: LinePayload[] = step2Lines.map(mapStep2LineToStep3Payload)

    if (payload.length === 0) return
    await upsertProductionOrderLines(orderId, 3, payload, processedAt?.toISOString() ?? null)
  }

  async function handleSaveDraft() {
    if (!orderId) return
    setSaving(true)
    setError(null)
    try {
      await saveStep3Lines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleNextStep() {
    if (!orderId) return
    setSavingAndNext(true)
    setError(null)
    try {
      await saveStep3Lines()
      if (order && order.currentStep < 4) {
        try { await advanceProductionStep(orderId) } catch { /* ignore */ }
      }
      navigate(`/production/${orderId}/buoc-4`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu dữ liệu bước 3')
    } finally {
      setSavingAndNext(false)
    }
  }

  const hasShortage = exportLines.some(l => l.status === 'short')

  const statusBody = (row: BtpExportLine) => {
    const map: Record<BtpExportLine['status'], { label: string; bg: string; color: string }> = {
      ok:    { label: 'Đủ',    bg: '#dcfce7', color: '#15803d' },
      short: { label: 'Thiếu', bg: '#fee2e2', color: '#dc2626' },
      over:  { label: 'Dư',    bg: '#fef9c3', color: '#a16207' },
    }
    const s = map[row.status]
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
        {s.label}
      </span>
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
          <span className="prod-header__order-no">#{order?.orderRef ?? ORDER_NO}</span>
        </div>
        <div className="prod-header__right">
          <span className="prod-step-badge prod-step-badge--active">
            Bước 3 / 4 — Xuất BTP
          </span>
        </div>
      </div>

      <p className="prod-subtitle">Xuất bán thành phẩm từ kho BTP sang dây chuyền đóng gói thành phẩm</p>

      <ProductionStepBar
        activeStep={3}
        orderId={orderId}
        maxReachedStep={Math.max(order?.currentStep ?? 3, ...(order?.lines?.map(l => l.step) ?? [3]))}
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

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Ngày xử lý */}
        <div className="prod-card" style={{ padding: '14px 20px' }}>
          <div className="prod-form-field" style={{ maxWidth: 260 }}>
            <label>NGÀY XỬ LÝ (BƯỚC 3)</label>
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

        {/* Tóm tắt BTP từ Bước 2 */}
        <div className="prod-card prod-card--step-done">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--done">
                <i className="pi pi-check" /> Bước 2 hoàn tất
              </span>
              <span className="prod-card__title">Kết quả Nhập BTP</span>
            </div>
          </div>
          {step2Summaries.length === 0 ? (
            <div className="prod-xk-meta">
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">MÃ BTP</span>
                <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>---</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">LÔ BTP</span>
                <span className="prod-xk-meta__val">---</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">SẢN LƯỢNG NHẬP</span>
                <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>0</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">KHO LƯU</span>
                <span className="prod-xk-meta__val">Kho Bán thành phẩm</span>
              </div>
            </div>
          ) : step2Summaries.map((summary, idx) => (
            <div className="prod-xk-meta" key={summary.key} style={{ marginTop: idx > 0 ? 8 : 0 }}>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">MÃ BTP</span>
                <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>{summary.btpCode}</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">LÔ BTP</span>
                <span className="prod-xk-meta__val">{summary.lotNo}</span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">SẢN LƯỢNG NHẬP</span>
                <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>
                  {fmtQty(summary.actualQty)} {summary.unit}
                </span>
              </div>
              <div className="prod-xk-meta__item">
                <span className="prod-xk-meta__lbl">KHO LƯU</span>
                <span className="prod-xk-meta__val">{summary.locationName}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Phiếu xuất kho BTP */}
        <div className="prod-card">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--active">
                <i className="pi pi-arrow-right" /> Bước 3
              </span>
              <span className="prod-card__title">Phiếu xuất kho BTP</span>
            </div>

          </div>

          <div className="prod-xk-meta">
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">KHO XUẤT</span>
              <span className="prod-xk-meta__val">Kho Bán thành phẩm</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">ĐIỂM ĐẾN</span>
              <span className="prod-xk-meta__val">Xưởng đóng gói</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">LỆNH SX</span>
              <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>LSX-2024-001</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">MỤC ĐÍCH</span>
              <span className="prod-xk-meta__val">Đóng gói thành phẩm cuối cùng</span>
            </div>
          </div>

          <DataTable
            value={exportLines}
            className="prod-xk-table"
            dataKey="id"
            scrollable
            scrollHeight="200px"
            style={{ marginTop: 12 }}
            rowHover
            emptyMessage="Chưa có dòng xuất BTP ở bước 3."
          >
            <Column
              header="STT"
              body={(_: BtpExportLine, opts: { rowIndex: number }) => (
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{opts.rowIndex + 1}</span>
              )}
              style={{ width: 44, minWidth: 44 }}
            />
            <Column
              header="Mã / Tên BTP"
              body={(row: BtpExportLine) => (
                <div>
                  <span className="prod-source-card__code">{row.btpCode}</span>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{row.btpName}</div>
                </div>
              )}
              style={{ minWidth: 200 }}
            />
            <Column
              header="Lô BTP"
              body={(row: BtpExportLine) => (
                <Tag value={row.lotNo} style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 600, fontSize: 11 }} />
              )}
              style={{ minWidth: 120 }}
            />
            <Column
              header="SL Yêu cầu"
              body={(row: BtpExportLine) => (
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmtQty(row.requestedQty)}</span>
              )}
              headerStyle={{ textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              style={{ minWidth: 100 }}
            />
            <Column
              header="SL Thực xuất"
              body={(row: BtpExportLine) => (
                <span style={{
                  fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700,
                  color: row.status === 'short' ? '#dc2626' : '#0f172a',
                }}>
                  {fmtQty(row.actualQty)}
                </span>
              )}
              headerStyle={{ textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              style={{ minWidth: 110 }}
            />
            <Column header="ĐVT" field="unit" style={{ minWidth: 60 }} bodyStyle={{ fontSize: 12, color: '#64748b' }} />
            <Column header="Trạng thái" body={statusBody} style={{ minWidth: 80 }} />
          </DataTable>

          <div className="prod-xk-summary">
            <span><strong>{exportLines.length}</strong> mặt hàng BTP</span>
            <span className="prod-xk-summary__sep" />
            {hasShortage
              ? <span style={{ color: '#dc2626' }}><i className="pi pi-exclamation-circle" style={{ marginRight: 4 }} />Có vật tư thiếu số lượng</span>
              : <span style={{ color: '#15803d' }}><i className="pi pi-check-circle" style={{ marginRight: 4 }} />BTP sẵn sàng cho đóng gói</span>
            }
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} disabled={isLocked} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={() => {
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
          }} />
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
            label="← Bước 2: Nhập BTP"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-2`)}
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
            label="Tiếp theo: Nhập TP"
            icon="pi pi-arrow-right"
            iconPos="right"
            loading={savingAndNext}
            disabled={isLocked}
            className="p-button-primary"
            style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
            onClick={handleNextStep}
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
