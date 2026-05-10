import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Tag } from 'primereact/tag'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { fetchProductionOrderDetail, updateProductionOrderStatus, type ProductionOrderDetail, type ProductionOrderLine } from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_NO = 'PSX-20240515-0089'

const BTP_EXPORT_LINES: BtpExportLine[] = [
  { id: '1', btpCode: 'MELASMA30-BTP', btpName: 'Bán thành phẩm Melasma Cream', lotNo: 'BTP-2405-001', expiryDate: '2026-11-15', requestedQty: 19850, actualQty: 19850, unit: 'g',   status: 'ok' },
  { id: '2', btpCode: 'PKG-KIT-30G',   btpName: 'Bộ kit đóng gói Melasma 30g',  lotNo: 'KIT-0992',     expiryDate: null,          requestedQty: 660,   actualQty: 660,   unit: 'bộ',  status: 'ok' },
]

function fmtQty(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function mapLineToExportLine(line: ProductionOrderLine): BtpExportLine {
  const planned = Number(line.plannedQty)
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductionStep3Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [exportLines, setExportLines] = useState<BtpExportLine[]>([])
  const [step2Summary, setStep2Summary] = useState<ProductionOrderLine | null>(null)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        const step2Lines = data.lines.filter(l => l.step === 2 && l.direction === 'in')
        const step3Lines = data.lines.filter(l => l.step === 3 && l.direction === 'out')
        setStep2Summary(step2Lines[0] ?? null)
        setExportLines(step3Lines.map(mapLineToExportLine))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  const hasShortage = exportLines.some(l => l.status === 'short')

  const expiryBody = (row: BtpExportLine) => {
    if (!row.expiryDate) return <span style={{ color: '#94a3b8', fontSize: 12 }}>Không có</span>
    const date = new Date(row.expiryDate)
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const color = diffDays <= 30 ? '#dc2626' : diffDays <= 90 ? '#d97706' : '#16a34a'
    return <span style={{ fontSize: 12, fontWeight: 600, color }}>{date.toLocaleDateString('vi-VN')}</span>
  }

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

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
          <div className="prod-xk-meta">
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">MÃ BTP</span>
              <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>{step2Summary?.productCode ?? '---'}</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">LÔ BTP</span>
              <span className="prod-xk-meta__val">{step2Summary?.lotNo ?? '---'}</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">SẢN LƯỢNG NHẬP</span>
              <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>
                {fmtQty(step2Summary ? Number(step2Summary.actualQty) : null)} {step2Summary?.unit ?? ''}
              </span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">KHO LƯU</span>
              <span className="prod-xk-meta__val">{step2Summary?.location?.name ?? 'Kho Bán thành phẩm'}</span>
            </div>
          </div>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="prod-xk-status" style={{ background: '#fef9c3', color: '#a16207', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                CHỜ XỬ LÝ
              </span>
              <Button
                label="Tạo phiếu xuất"
                icon="pi pi-plus"
                className="p-button-outlined p-button-sm"
                style={{ fontSize: 12, color: '#5269e0', borderColor: '#5269e0', padding: '4px 12px' }}
              />
            </div>
          </div>

          <div className="prod-xk-ref">
            <i className="pi pi-file-export" style={{ color: '#5269e0', fontSize: 13 }} />
            <span className="prod-xk-ref__no">XK-BTP-20240515-001</span>
            <span className="prod-xk-ref__sep">·</span>
            <span className="prod-xk-ref__date">Dự kiến: 15/05/2024 16:00</span>
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
            value={exportLines.length > 0 ? exportLines : BTP_EXPORT_LINES}
            className="prod-xk-table"
            dataKey="id"
            scrollable
            scrollHeight="200px"
            style={{ marginTop: 12 }}
            rowHover
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
            <Column header="HSD" body={expiryBody} style={{ minWidth: 100 }} />
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
            <span><strong>{exportLines.length || BTP_EXPORT_LINES.length}</strong> mặt hàng BTP</span>
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
          <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={() => {
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
        </div>
        <div className="prod-footer-bar__right">
          <Button
            label="← Bước 2: Nhập BTP"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-2`)}
          />
          <Button label="IN PHIẾU"   icon="pi pi-print"      className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
          <Button label="XUẤT EXCEL" icon="pi pi-file-excel" className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
          <Button label="LƯU NHÁP"   icon="pi pi-save"       className="p-button-outlined"
            style={{ fontSize: 12, fontWeight: 700, borderColor: '#5269e0', color: '#5269e0' }} />
          <Button
            label="Tiếp theo: Nhập TP"
            icon="pi pi-arrow-right"
            iconPos="right"
            className="p-button-primary"
            style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
            onClick={() => navigate(`/production/${orderId}/buoc-4`)}
          />
        </div>
      </div>
    </div>
  )
}
