import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { ProductionStepBar } from '../components/production/ProductionStepBar'
import { OutboundMaterialPanel, type MaterialLine, type AllocationRow } from '../components/outbound/OutboundMaterialPanel'
import { fetchProductionOrderDetail, createProductionOrder, updateProductionOrderStatus, upsertProductionOrderLines, fetchProductOutputs, advanceProductionStep, confirmNvlExport, fetchProductionOrderLogs, type ProductionOrderDetail, type ProductOutput, type ProductionOrderLog } from '../lib/productionApi'
import { exportNvlRequestDoc } from '../lib/productionNvlRequestExport'
import { fetchBasics } from '../lib/catalogApi'
import type { BasicRow } from '../components/catalog/types'
import { showDangerConfirm } from '../lib/confirm'
import { formatQuantity } from '../components/purchaseOrder/format'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'
import { ProductionFlowModal } from '../components/production/ProductionFlowModal'

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductionStep1Page() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLines, setSavingLines] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [nvlExported, setNvlExported] = useState(false)

  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [classifications, setClassifications] = useState<BasicRow[]>([])
  const [classLoading, setClassLoading] = useState(false)
  const [selectedClassCode, setSelectedClassCode] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Track current lines from OutboundMaterialPanel
  const currentLinesRef = useRef<MaterialLine[]>([])
  const [initialPanelLines, setInitialPanelLines] = useState<MaterialLine[] | undefined>(undefined)

  // Warehouse location for step-1 NVL export
  const [locations, setLocations] = useState<BasicRow[]>([])
  const [sourceLocationId, setSourceLocationId] = useState<string | null>(null)

  // History
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Flow diagram modal
  const [showFlowModal, setShowFlowModal] = useState(false)

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
              locationCode: null,
              locationName: null,
              exportDate: l.exportDate ? new Date(l.exportDate) : null,
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
        // Restore source warehouse from first step-1 out line
        const savedLocationId = step1Lines[0]?.locationId ?? null
        if (savedLocationId) setSourceLocationId(savedLocationId)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (!orderId) { setHistoryEvents([]); return }
    void loadHistory(orderId)
  }, [orderId])

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
          void loadHistory(orderId)
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

    if (!processedAt) {
      setError('Vui lòng chọn Ngày xử lý (Bước 1) trước khi lưu.')
      return
    }
    if (!sourceLocationId) {
      setError('Vui lòng chọn Kho xuất NVL trước khi lưu.')
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
          locationId: sourceLocationId || null,
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

  const displayOrderRef = order?.orderRef ?? orderRef ?? '---'
  const displayCreator = order?.creator?.fullName ?? '---'
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

      {isLocked && (
        <div style={{ margin: '8px 24px 0', padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
          <i className="pi pi-lock" style={{ color: '#64748b' }} />
          <span>Phiếu đã <strong>{order?.status === 'completed' ? 'hoàn tất' : 'bị hủy'}</strong> — chỉ xem, không thể chỉnh sửa.</span>
        </div>
      )}

      <div style={{ margin: '16px 24px 0', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 16, alignItems: 'start' }}>

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
            <div className="prod-form-field">
              <label>KHO XUẤT NVL</label>
              <Dropdown
                value={sourceLocationId}
                options={locations.map(l => ({ label: `[${l.code}] ${l.name}`, value: l.id }))}
                onChange={(e) => setSourceLocationId(e.value as string | null)}
                placeholder="Chọn kho xuất NVL..."
                filter
                showClear
                disabled={isLocked}
                style={{ width: '100%' }}
              />
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
              disabled={isLocked}
              lockExistingLines={nvlExported && !isLocked}
              locationId={sourceLocationId ?? undefined}
              asOfDate={processedAt ? `${processedAt.getFullYear()}-${String(processedAt.getMonth() + 1).padStart(2, '0')}-${String(processedAt.getDate()).padStart(2, '0')}` : undefined}
            />
          </div>
        )}

        </div>{/* end main content column */}

        {/* History sidebar */}
        {orderId ? (
          <aside className="outbound-history-panel">
            <div className="outbound-history-panel-header">
              <i className="pi pi-history" />
              <span>LỊCH SỬ THAO TÁC</span>
            </div>
            <HistoryTimeline
              events={historyEvents}
              loading={historyLoading}
              error={historyError}
              emptyMessage="Chưa có lịch sử thao tác cho phiếu sản xuất này."
            />
          </aside>
        ) : (
          <aside className="outbound-history-panel outbound-history-panel-placeholder">
            <div className="outbound-history-panel-header">
              <i className="pi pi-history" />
              <span>LỊCH SỬ THAO TÁC</span>
            </div>
            <p className="outbound-history-placeholder-copy">Lịch sử thao tác sẽ hiển thị sau khi lưu phiếu.</p>
          </aside>
        )}

      </div>{/* end row */}

      {/* Footer */}
      <div className="prod-footer-bar">
        <div className="prod-footer-bar__left">
          <Button label="Quay lại" icon="pi pi-arrow-left" className="p-button-text p-button-secondary" style={{ fontSize: 12, fontWeight: 700 }} onClick={() => navigate('/production')} />
              {orderId && !isLocked && (
            <Button label="HỦY PHIẾU" icon="pi pi-times-circle" loading={cancelling} className="p-button-text p-button-danger" style={{ fontSize: 12, fontWeight: 700 }} onClick={handleCancel} />
          )}
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
          {saveSuccess && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />{nvlExported ? 'Đã xuất thêm NVL thành công' : 'Đã xuất kho NVL thành công'}
            </span>
          )}
          {!saveSuccess && nvlExported && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="pi pi-check-circle" />NVL đã xuất kho
            </span>
          )}
          <Button
            label="Xem lưu đồ NVL"
            icon="pi pi-sitemap"
            className="p-button-outlined p-button-secondary"
            style={{ fontSize: 12, fontWeight: 700 }}
            disabled={!orderId}
            onClick={() => setShowFlowModal(true)}
          />
          {orderId ? (
            <>
              <Button
                label={nvlExported ? 'Xuất thêm NVL' : 'Lưu xuất NVL'}
                icon={nvlExported ? 'pi pi-plus' : 'pi pi-save'}
                loading={savingLines}
                disabled={isLocked}
                className="p-button-outlined p-button-success"
                style={{ fontSize: 12, fontWeight: 700 }}
                onClick={handleSaveLines}
              />
              <Button
                label="XUẤT YÊU CẦU NVL"
                icon="pi pi-file-word"
                disabled={!order}
                className="p-button-outlined p-button-secondary"
                style={{ fontSize: 12, fontWeight: 700 }}
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
              <Button
                label="Tiếp theo: Nhập BTP"
                icon="pi pi-arrow-right"
                iconPos="right"
                disabled={isLocked}
                className="p-button-primary"
                style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
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
              style={{ background: '#5269e0', border: 'none', fontWeight: 700, fontSize: 13, padding: '8px 20px' }}
              onClick={handleCreate}
            />
          )}
        </div>
      </div>

      {/* ── Export classification dialog ─────────────────────────────── */}
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
              className="p-button-text"
              disabled={exporting}
              onClick={() => setShowExportDialog(false)}
            />
            <Button
              label={exporting ? 'Đang xuất...' : 'Xuất file'}
              icon="pi pi-file-word"
              loading={exporting}
              disabled={selectedClassCode.size === 0}
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
