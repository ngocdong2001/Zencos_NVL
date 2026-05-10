import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { OutboundMaterialPanel, type MaterialLine, type AllocationRow } from '../components/outbound/OutboundMaterialPanel'
import { fetchProductionOrderDetail, createProductionOrder, updateProductionOrderStatus, upsertProductionOrderLines, fetchProductOutputs, type ProductionOrderDetail, type ProductOutput } from '../lib/productionApi'
import { showDangerConfirm } from '../lib/confirm'
import { formatQuantity } from '../components/purchaseOrder/format'

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductionStep1Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLines, setSavingLines] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Track current lines from OutboundMaterialPanel
  const currentLinesRef = useRef<MaterialLine[]>([])
  const [initialPanelLines, setInitialPanelLines] = useState<MaterialLine[] | undefined>(undefined)

  // Editable header fields (used when creating new order)
  const [orderRef, setOrderRef] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [outputProductId, setOutputProductId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // Product outputs catalog
  const [productOutputs, setProductOutputs] = useState<ProductOutput[]>([])

  // Load product outputs for dropdown
  useEffect(() => {
    fetchProductOutputs().then(setProductOutputs).catch(() => {/* silent */})
  }, [])

  // Load order from API if orderId present
  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchProductionOrderDetail(orderId)
      .then((data) => {
        setOrder(data)
        setOrderRef(data.orderRef ?? '')
        setIssueDate(data.issuedAt ? new Date(data.issuedAt).toISOString().slice(0, 10) : '')
        setOutputProductId(data.outputProductId ?? null)
        setNotes(data.notes ?? '')

        // Reconstruct panel lines from saved step-1 out lines
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
            const allocationRows: AllocationRow[] = groupLines.map(l => ({
              batchId: '',
              lotNo: l.lotNo ?? '',
              expiryDate: l.expiryDate,
              availableQty: l.actualQty,
              exportQty: l.actualQty,
              inputValue: formatQuantity(l.actualQty),
              manufacturerName: null,
            }))
            restored.push({
              key: crypto.randomUUID(),
              materialId: first.productId ?? '',
              materialCode: first.productCode ?? '',
              materialName: first.productName ?? '',
              materialUnit: first.unit ?? '',
              requestedQtyValue: first.plannedQty,
              requestedQtyInput: formatQuantity(first.plannedQty),
              requestedQtyFocused: false,
              allocationRows,
              shortageAcknowledged: false,
              stockRows: [],
              fefoSuggestions: [],
              stockLoading: false,
            })
          }
          setInitialPanelLines(restored)
          currentLinesRef.current = restored
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const created = await createProductionOrder({
        orderRef: orderRef || null,
        issuedAt: issueDate || undefined,
        outputProductId: outputProductId || null,
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

  async function handleSaveLines() {
    if (!orderId) return
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
          plannedQty: line.requestedQtyValue,
          actualQty: r.exportQty,
          wasteQty: 0,
          unit: line.materialUnit || 'g',
          direction: 'out' as const,
        }))
    )
    if (payloads.length === 0) {
      setError('Chưa có dữ liệu lot NVL để lưu. Vui lòng chọn NVL và nhập số lượng.')
      return
    }
    setSavingLines(true)
    setError(null)
    setSaveSuccess(false)
    try {
      await upsertProductionOrderLines(orderId, 1, payloads)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu xuất NVL thất bại')
    } finally {
      setSavingLines(false)
    }
  }

  const displayOrderRef = order?.orderRef ?? orderRef ?? '---'
  const displayCreator = order?.creator?.fullName ?? '---'

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

      <div style={{ margin: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
            <div className="prod-form-field" style={{ gridColumn: 'span 2' }}>
              <label>SẢN PHẨM ĐẦU RA</label>
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
                  style={{ width: '100%' }}
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
                <span className="prod-card__title">Chi tiết nguyên vật liệu xuất kho</span>
              </div>
            </div>
            <OutboundMaterialPanel
              initialLines={initialPanelLines}
              onLinesChange={(lines) => { currentLinesRef.current = lines }}
            />
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="Quay lại" icon="pi pi-arrow-left" className="p-button-text p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} onClick={() => navigate('/production')} />
          {orderId && (
            <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={handleCancel} />
          )}
        </div>
        <div className="prod-footer-bar__right">
          {saveSuccess && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />Đã lưu xuất NVL
            </span>
          )}
          {orderId ? (
            <>
              <Button
                label="Lưu xuất NVL"
                icon="pi pi-save"
                loading={savingLines}
                className="p-button-outlined p-button-success"
                style={{ fontSize: 12, fontWeight: 700 }}
                onClick={handleSaveLines}
              />
              <Button label="IN PHIẾU"   icon="pi pi-print"      className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
              <Button label="XUẤT EXCEL" icon="pi pi-file-excel" className="p-button-outlined p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} />
              <Button
                label="Tiếp theo: Nhập BTP"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="p-button-primary"
                style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
                onClick={() => navigate(`/production/${orderId}/buoc-2`)}
              />
            </>
          ) : (
            <Button
              label="Tạo phiếu & Tiếp tục"
              icon="pi pi-arrow-right"
              iconPos="right"
              loading={saving}
              className="p-button-primary"
              style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
              onClick={handleCreate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
