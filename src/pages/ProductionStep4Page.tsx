import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Tag } from 'primereact/tag'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { fetchProductionOrderDetail, completeProductionOrder, updateProductionOrderStatus, type ProductionOrderDetail, type ProductionOrderLine } from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TpReceiptLine {
  id: string
  tpCode: string
  tpName: string
  lotNo: string
  mfgDate: string | null
  expiryDate: string | null
  quantity: number
  unit: string
  qualityStatus: 'pass' | 'fail' | 'pending'
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtQty(v: number | null | undefined): string {
  if (v == null) return 'â€”'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function mapLineToReceiptLine(line: ProductionOrderLine): TpReceiptLine {
  return {
    id:            String(line.id),
    tpCode:        line.productCode,
    tpName:        line.productName,
    lotNo:         line.lotNo ?? '',
    mfgDate:       null,
    expiryDate:    line.expiryDate ?? null,
    quantity:      Number(line.actualQty) || Number(line.plannedQty),
    unit:          line.unit,
    qualityStatus: 'pending',
  }
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ProductionStep4Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [receiptLines, setReceiptLines] = useState<TpReceiptLine[]>([])
  const [step3Summary, setStep3Summary] = useState<ProductionOrderLine | null>(null)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        const step3Lines = data.lines.filter(l => l.step === 3 && l.direction === 'out')
        const step4Lines = data.lines.filter(l => l.step === 4 && l.direction === 'in')
        setStep3Summary(step3Lines[0] ?? null)
        setReceiptLines(step4Lines.map(mapLineToReceiptLine))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u'))
      .finally(() => setLoading(false))
  }, [orderId])

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
      await completeProductionOrder(orderId)
      navigate('/production')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ hoÃ n táº¥t phiáº¿u')
    } finally {
      setCompleting(false)
    }
  }

  const qualityBody = (row: TpReceiptLine) => {
    const map: Record<TpReceiptLine['qualityStatus'], { label: string; bg: string; color: string; icon: string }> = {
      pass:    { label: 'Äáº¡t QC',    bg: '#dcfce7', color: '#15803d', icon: 'pi-check-circle'     },
      fail:    { label: 'KhÃ´ng Ä‘áº¡t', bg: '#fee2e2', color: '#dc2626', icon: 'pi-times-circle'     },
      pending: { label: 'Chá» KT',    bg: '#fef9c3', color: '#a16207', icon: 'pi-clock'            },
    }
    const s = map[row.qualityStatus]
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <i className={`pi ${s.icon}`} style={{ fontSize: 10 }} /> {s.label}
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
          <h1 className="prod-header__title">Phiáº¿u sáº£n xuáº¥t</h1>
          <span className="prod-header__badge">PRODUCTION TICKET</span>
          <span className="prod-header__order-no">#{order?.orderRef ?? '---'}</span>
        </div>
        <div className="prod-header__right">
          <span className="prod-step-badge prod-step-badge--active">
            BÆ°á»›c 4 / 4 â€” Nháº­p TP
          </span>
        </div>
      </div>

      <p className="prod-subtitle">Nháº­p thÃ nh pháº©m hoÃ n chá»‰nh vÃ o kho thÃ nh pháº©m vÃ  hoÃ n táº¥t quy trÃ¬nh sáº£n xuáº¥t</p>

      <ProductionStepBar
        activeStep={4}
        orderId={orderId}
        maxReachedStep={Math.max(order?.currentStep ?? 4, ...(order?.lines?.map(l => l.step) ?? [4]))}
        onNavigate={(s) => { if (orderId) navigate(`/production/${orderId}/buoc-${s}`) }}
      />

      {error && (
        <div style={{ margin: '12px 24px 0', padding: '10px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
          <i className="pi pi-exclamation-circle" style={{ marginRight: 8 }} />{error}
        </div>
      )}

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* TÃ³m táº¯t BTP tá»« BÆ°á»›c 3 */}
        <div className="prod-card prod-card--step-done">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--done">
                <i className="pi pi-check" /> BÆ°á»›c 3 hoÃ n táº¥t
              </span>
              <span className="prod-card__title">Káº¿t quáº£ Xuáº¥t BTP cho Ä‘Ã³ng gÃ³i</span>
            </div>
          </div>
          <div className="prod-xk-meta">
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">KHO XUáº¤T</span>
              <span className="prod-xk-meta__val">{step3Summary?.location?.name ?? 'Kho BÃ¡n thÃ nh pháº©m'}</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">MÃƒ BTP</span>
              <span className="prod-xk-meta__val" style={{ color: '#5269e0', fontWeight: 700 }}>{step3Summary?.productCode ?? '---'}</span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">Sáº¢N LÆ¯á»¢NG XUáº¤T</span>
              <span className="prod-xk-meta__val" style={{ fontWeight: 700, color: '#15803d' }}>
                {fmtQty(step3Summary ? Number(step3Summary.actualQty) : null)} {step3Summary?.unit ?? ''}
              </span>
            </div>
            <div className="prod-xk-meta__item">
              <span className="prod-xk-meta__lbl">TRáº NG THÃI</span>
              <span className="prod-xk-status prod-xk-status--fulfilled">ÄÃƒ GHI NHáº¬N</span>
            </div>
          </div>
        </div>

        {/* Phiáº¿u nháº­p kho TP */}
        <div className="prod-card">
          <div className="prod-card__title-row">
            <div className="prod-card__title-left">
              <span className="prod-step-badge prod-step-badge--active">
                <i className="pi pi-arrow-right" /> BÆ°á»›c 4
              </span>
              <span className="prod-card__title">Phiáº¿u nháº­p kho ThÃ nh pháº©m</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="prod-xk-status prod-xk-status--fulfilled">ÄÃƒ GHI NHáº¬N</span>
            </div>
          </div>

          <DataTable
            value={receiptLines}
            className="prod-xk-table"
            dataKey="id"
            scrollable
            scrollHeight="200px"
            style={{ marginTop: 12 }}
            rowHover
            emptyMessage="ChÆ°a cÃ³ dá»¯ liá»‡u nháº­p TP"
          >
            <Column
              header="STT"
              body={(_: TpReceiptLine, opts: { rowIndex: number }) => (
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{opts.rowIndex + 1}</span>
              )}
              style={{ width: 44, minWidth: 44 }}
            />
            <Column
              header="MÃ£ / TÃªn ThÃ nh pháº©m"
              body={(row: TpReceiptLine) => (
                <div>
                  <span className="prod-source-card__code">{row.tpCode}</span>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{row.tpName}</div>
                </div>
              )}
              style={{ minWidth: 220 }}
            />
            <Column
              header="LÃ´ TP"
              body={(row: TpReceiptLine) => (
                row.lotNo
                  ? <Tag value={row.lotNo} style={{ background: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: 11 }} />
                  : <span style={{ color: '#94a3b8' }}>â€”</span>
              )}
              style={{ minWidth: 120 }}
            />
            <Column
              header="HSD"
              body={(row: TpReceiptLine) => (
                row.expiryDate
                  ? <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{new Date(row.expiryDate).toLocaleDateString('vi-VN')}</span>
                  : <span style={{ color: '#94a3b8', fontSize: 12 }}>â€”</span>
              )}
              style={{ minWidth: 100 }}
            />
            <Column
              header="Sá»‘ lÆ°á»£ng"
              body={(row: TpReceiptLine) => (
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {fmtQty(row.quantity)} {row.unit}
                </span>
              )}
              headerStyle={{ textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              style={{ minWidth: 110 }}
            />
            <Column header="KT Cháº¥t lÆ°á»£ng" body={qualityBody} style={{ minWidth: 110 }} />
          </DataTable>

          <div className="prod-xk-summary">
            <span><strong>{receiptLines.length}</strong> máº·t hÃ ng thÃ nh pháº©m</span>
            {receiptLines.length === 0 && (
              <>
                <span className="prod-xk-summary__sep" />
                <span style={{ color: '#94a3b8' }}>ChÆ°a cÃ³ dá»¯ liá»‡u bÆ°á»›c 4</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={handleCancel} />
        </div>
        <div className="prod-footer-bar__right">
          <Button
            label="â† BÆ°á»›c 3: Xuáº¥t BTP"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            onClick={() => navigate(`/production/${orderId}/buoc-3`)}
          />
          <Button label="IN PHIáº¾U"   icon="pi pi-print"      className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
          <Button label="XUáº¤T EXCEL" icon="pi pi-file-excel" className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
          <Button
            label="XÃC NHáº¬N HOÃ€N Táº¤T"
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
