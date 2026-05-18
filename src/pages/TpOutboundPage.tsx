import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Tag } from 'primereact/tag'
import { fetchBasics, fetchProductOutputsCatalog } from '../lib/catalogApi'
import type { BasicRow, ProductOutputRow } from '../components/catalog/types'
import {
  cancelTpExportOrder,
  createTpExportOrder,
  createTpVoidRerelease,
  fetchTpExportHistory,
  fetchTpExportOrderDetail,
  fetchTpFefoSuggestions,
  fetchTpStock,
  fulfilTpExportOrder,
  updateTpExportOrder,
  type CreateTpExportOrderPayload,
  type TpExportOrderStatus,
  type TpStockLot,
} from '../lib/tpOutboundApi'
import { formatQuantity, parseDecimalInput, toEditableNumberString } from '../components/purchaseOrder/format'
import { showConfirmAction, showDangerConfirm } from '../lib/confirm'
import { HistoryTimeline, type HistoryTimelineEvent } from '../components/shared/HistoryTimeline'

/* ─────────────────────────────────────────────────── types ── */

type SelectOption = { label: string; value: string }

type ItemRow = {
  key: string
  outputProductId: string
  lotNo: string | null
  expiryDate: string | null
  warehouseLocationId: string | null
  availableQty: number
  quantityBase: number
  quantityInput: string
  unitPrice: number
  unitPriceInput: string
  stockLots: TpStockLot[]
  stockLoading: boolean
}

/* ─────────────────────────────────────────────── helpers ── */

function toNumeric(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildTpRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `XKTP-${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

function formatCurrencyVi(value: number): string {
  if (!value || !Number.isFinite(value)) return '0 ₫'
  return value.toLocaleString('vi-VN') + ' ₫'
}

function createEmptyRow(): ItemRow {
  return {
    key: crypto.randomUUID(),
    outputProductId: '',
    lotNo: null,
    expiryDate: null,
    warehouseLocationId: null,
    availableQty: 0,
    quantityBase: 0,
    quantityInput: '',
    unitPrice: 0,
    unitPriceInput: '',
    stockLots: [],
    stockLoading: false,
  }
}

function getStatusLabel(status: TpExportOrderStatus | null): string {
  if (status === 'fulfilled') return 'Đã hoàn thành'
  if (status === 'cancelled') return 'Đã hủy'
  return 'Chờ xác nhận'
}

function getStatusClass(status: TpExportOrderStatus | null): string {
  if (status === 'fulfilled') return 'tp-inv-status--fulfilled'
  if (status === 'cancelled') return 'tp-inv-status--cancelled'
  return 'tp-inv-status--pending'
}


/* ─────────────────────────────────────── main component ── */

export function TpOutboundPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const isEditMode = Boolean(orderId)

  /* ── catalog data ── */
  const [customerRows, setCustomerRows] = useState<BasicRow[]>([])
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [products, setProducts] = useState<ProductOutputRow[]>([])
  const [productOptions, setProductOptions] = useState<SelectOption[]>([])

  /* ── form state ── */
  const [customerId, setCustomerId] = useState('')
  const [sourceLocationId, setSourceLocationId] = useState('')
  const [dienGiai, setDienGiai] = useState('')
  const [exportedAt, setExportedAt] = useState<Date>(new Date())
  const [personInCharge, setPersonInCharge] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [itemRows, setItemRows] = useState<ItemRow[]>([createEmptyRow()])
  const [tableSearch, setTableSearch] = useState('')

  /* ── order metadata ── */
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [newOrderRef, setNewOrderRef] = useState(() => buildTpRef())
  const [editingOrderRef, setEditingOrderRef] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<TpExportOrderStatus | null>(null)
  const [processingAction, setProcessingAction] = useState<'fulfil' | 'cancel' | 'adjust' | null>(null)
  const [sourceOrderId, setSourceOrderId] = useState<string | null>(null)
  const [adjustedByOrderId, setAdjustedByOrderId] = useState<string | null>(null)

  /* ── history ── */
  const [historyEvents, setHistoryEvents] = useState<HistoryTimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const isLockedEditMode = isEditMode && (editingStatus === 'fulfilled' || editingStatus === 'cancelled')
  const isFulfilledViewMode = isEditMode && editingStatus === 'fulfilled'
  const isCancelledViewMode = isEditMode && editingStatus === 'cancelled'

  /* ── derived ── */
  const selectedCustomer = useMemo(
    () => customerRows.find((r) => r.id === customerId) ?? null,
    [customerRows, customerId],
  )

  const customerNameOptions = useMemo(
    () => customerRows.filter((r) => r.id && r.name).map((r) => ({ value: r.id, label: r.name })),
    [customerRows],
  )

  const customerCodeOptions = useMemo(
    () => customerRows.filter((r) => r.id).map((r) => ({ value: r.id, label: r.code?.trim() ? r.code : '---' })),
    [customerRows],
  )

  const usedProductIds = useMemo(
    () => new Set(itemRows.map((r) => r.outputProductId).filter(Boolean)),
    [itemRows],
  )

  const visibleRows = useMemo(() => {
    if (!tableSearch.trim()) return itemRows
    const q = tableSearch.toLowerCase()
    return itemRows.filter((r) => {
      const prod = products.find((p) => p.id === r.outputProductId)
      return (
        prod?.code?.toLowerCase().includes(q) ||
        prod?.name?.toLowerCase().includes(q) ||
        (r.lotNo ?? '').toLowerCase().includes(q)
      )
    })
  }, [itemRows, tableSearch, products])

  const totalQty = useMemo(
    () => itemRows.reduce((s, r) => s + r.quantityBase, 0),
    [itemRows],
  )

  const totalAmount = useMemo(
    () => itemRows.reduce((s, r) => s + r.quantityBase * r.unitPrice, 0),
    [itemRows],
  )

  /* ── load history ── */
  const loadHistory = async (id: string) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows = await fetchTpExportHistory(id)
      setHistoryEvents(
        rows.map((r) => ({
          id: r.id,
          actionType: r.actionType,
          action: r.actionLabel,
          actorName: r.actorName,
          at: r.createdAt,
        })),
      )
    } catch (err) {
      setHistoryEvents([])
      setHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử.')
    } finally {
      setHistoryLoading(false)
    }
  }

  /* ── initial load & edit load ── */
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      setFormError(null)
      try {
        const [customers, catalogProducts, locationRows] = await Promise.all([
          fetchBasics('customers'),
          fetchProductOutputsCatalog(),
          fetchBasics('locations'),
        ])
        if (cancelled) return

        setCustomerRows(customers.filter((r: BasicRow) => r.id && r.name))
        setLocationOptions(
          locationRows
            .filter((r: BasicRow) => r.id && r.status !== 'inactive')
            .map((r: BasicRow) => ({ value: r.id, label: r.name + (r.code ? ` (${r.code})` : '') })),
        )
        setProducts(catalogProducts)
        setProductOptions(catalogProducts.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })))

        if (isEditMode && orderId) {
          const detail = await fetchTpExportOrderDetail(orderId)
          if (cancelled) return

          setEditingStatus(detail.status)
          setSourceOrderId(detail.sourceOrder?.id ?? null)
          setAdjustedByOrderId(detail.adjustedByOrder?.id ?? null)
          setSourceLocationId(detail.sourceLocation?.id ?? '')
          setEditingOrderRef(detail.orderRef)
          setCustomerId(detail.customer?.id ?? '')
          setDienGiai(detail.dienGiai ?? '')
          if (detail.exportedAt) setExportedAt(new Date(detail.exportedAt))

          /* Reconstruct ItemRows from order items */
          const allocItems = detail.items.filter((i) => i.lotNo != null)
          const headerItems = detail.items.filter((i) => !i.lotNo)
          const sourceItems = allocItems.length > 0 ? allocItems : headerItems

          const editRows: ItemRow[] = sourceItems.map((item) => ({
            key: crypto.randomUUID(),
            outputProductId: item.outputProductId,
            lotNo: item.lotNo ?? null,
            expiryDate: item.expiryDate ?? null,
            warehouseLocationId: item.warehouseLocationId ?? null,
            availableQty: toNumeric(item.quantityBase),
            quantityBase: toNumeric(item.quantityBase),
            quantityInput: formatQuantity(toNumeric(item.quantityBase)),
            unitPrice: 0,
            unitPriceInput: '',
            stockLots: [],
            stockLoading: Boolean(item.outputProductId),
          }))

          /* Load stock for all products in parallel */
          const uniqueProductIds = [...new Set(editRows.map((r) => r.outputProductId).filter(Boolean))]
          const stockMap = new Map<string, TpStockLot[]>()
          await Promise.all(
            uniqueProductIds.map(async (pid) => {
              try {
                const lots = await fetchTpStock(pid)
                stockMap.set(pid, lots)
              } catch {
                stockMap.set(pid, [])
              }
            }),
          )
          if (cancelled) return

          const shouldRestore = detail.status === 'fulfilled'
          const finalRows = editRows.map((row) => {
            const lots = stockMap.get(row.outputProductId) ?? []
            const restoredLots = lots.map((lot) => {
              const isThisLot =
                lot.batchLotNo === row.lotNo &&
                lot.batchExpiryDate === row.expiryDate &&
                lot.warehouseLocationId === row.warehouseLocationId
              return {
                ...lot,
                availableQty: lot.availableQty + (shouldRestore && isThisLot ? row.quantityBase : 0),
              }
            })
            const restoredAvailQty =
              restoredLots.find(
                (l) =>
                  l.batchLotNo === row.lotNo &&
                  l.batchExpiryDate === row.expiryDate &&
                  l.warehouseLocationId === row.warehouseLocationId,
              )?.availableQty ?? row.availableQty
            return { ...row, stockLots: restoredLots, stockLoading: false, availableQty: restoredAvailQty }
          })

          setItemRows(finalRows.length > 0 ? finalRows : [createEmptyRow()])
        }
      } catch (error) {
        if (cancelled) return
        setFormError(error instanceof Error ? error.message : 'Không thể tải dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [isEditMode, orderId])

  useEffect(() => {
    if (!orderId) { setHistoryEvents([]); return }
    void loadHistory(orderId)
  }, [orderId])

  /* ── row management ── */
  const updateRow = (key: string, updater: (r: ItemRow) => ItemRow) => {
    if (isLockedEditMode) return
    setItemRows((prev) => prev.map((r) => (r.key === key ? updater(r) : r)))
  }

  const addRow = () => {
    if (isLockedEditMode) return
    setItemRows((prev) => [...prev, createEmptyRow()])
  }

  const removeRow = (key: string) => {
    if (isLockedEditMode) return
    if (itemRows.length <= 1) return
    setItemRows((prev) => prev.filter((r) => r.key !== key))
  }

  const handleProductChange = async (key: string, newProductId: string) => {
    if (isLockedEditMode) return
    updateRow(key, (r) => ({
      ...r,
      outputProductId: newProductId,
      lotNo: null,
      expiryDate: null,
      warehouseLocationId: null,
      availableQty: 0,
      quantityBase: 0,
      quantityInput: '',
      stockLots: [],
      stockLoading: Boolean(newProductId),
    }))
    if (!newProductId) return
    try {
      const lots = await fetchTpStock(newProductId)
      updateRow(key, (r) => ({ ...r, stockLots: lots, stockLoading: false }))
    } catch {
      updateRow(key, (r) => ({ ...r, stockLoading: false }))
    }
  }

  const handleLotChange = (key: string, lotKey: string) => {
    if (isLockedEditMode) return
    updateRow(key, (r) => {
      if (!lotKey) {
        return { ...r, lotNo: null, expiryDate: null, warehouseLocationId: null, availableQty: 0 }
      }
      const [lNo, lExp, lLoc] = lotKey.split('__')
      const matchedLot = r.stockLots.find(
        (l) =>
          (l.batchLotNo ?? '') === lNo &&
          (l.batchExpiryDate ?? '') === lExp &&
          (l.warehouseLocationId ?? '') === lLoc,
      )
      return {
        ...r,
        lotNo: lNo || null,
        expiryDate: lExp || null,
        warehouseLocationId: lLoc || null,
        availableQty: matchedLot?.availableQty ?? 0,
      }
    })
  }

  const handleQtyFocus = (key: string) => {
    if (isLockedEditMode) return
    updateRow(key, (r) => ({ ...r, quantityInput: toEditableNumberString(r.quantityBase) }))
  }

  const handleQtyBlur = (key: string) => {
    if (isLockedEditMode) return
    setItemRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const raw = r.quantityInput.trim()
        if (!raw) return { ...r, quantityBase: 0, quantityInput: '' }
        const parsed = parseDecimalInput(raw)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setFormError('Số lượng không hợp lệ.')
          return r
        }
        return { ...r, quantityBase: parsed, quantityInput: formatQuantity(parsed) }
      }),
    )
    setFormError(null)
  }

  const handleUnitPriceFocus = (key: string) => {
    if (isLockedEditMode) return
    updateRow(key, (r) => ({ ...r, unitPriceInput: toEditableNumberString(r.unitPrice) }))
  }

  const handleUnitPriceBlur = (key: string) => {
    if (isLockedEditMode) return
    setItemRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const raw = r.unitPriceInput.trim()
        if (!raw) return { ...r, unitPrice: 0, unitPriceInput: '' }
        const parsed = parseDecimalInput(raw)
        if (!Number.isFinite(parsed) || parsed < 0) return r
        return { ...r, unitPrice: parsed, unitPriceInput: formatQuantity(parsed) }
      }),
    )
  }

  const applyFefoForRow = async (key: string) => {
    if (isLockedEditMode) return
    const row = itemRows.find((r) => r.key === key)
    if (!row || !row.outputProductId) return
    try {
      const suggestions = await fetchTpFefoSuggestions(row.outputProductId, 1)
      if (suggestions.length === 0) { setFormError('Không có lô khả dụng theo FEFO.'); return }
      const best = suggestions[0]
      updateRow(key, (r) => ({
        ...r,
        lotNo: best.batchLotNo,
        expiryDate: best.batchExpiryDate,
        warehouseLocationId: best.warehouseLocationId,
        availableQty: best.availableQty,
        quantityBase: r.quantityBase > 0 ? Math.min(r.quantityBase, best.availableQty) : best.availableQty,
        quantityInput: formatQuantity(r.quantityBase > 0 ? Math.min(r.quantityBase, best.availableQty) : best.availableQty),
      }))
    } catch {
      setFormError('Không thể lấy gợi ý FEFO.')
    }
  }

  /* ── validation ── */
  const validateBeforeSubmit = (): boolean => {
    const validRows = itemRows.filter((r) => r.outputProductId || r.quantityBase > 0)
    if (validRows.length === 0) {
      setFormError('Vui lòng thêm ít nhất một dòng hàng hóa.')
      return false
    }
    for (const row of itemRows) {
      if (!row.outputProductId && row.quantityBase === 0) continue
      const prod = products.find((p) => p.id === row.outputProductId)
      if (!row.outputProductId) { setFormError('Một dòng chưa chọn sản phẩm.'); return false }
      if (row.quantityBase <= 0) { setFormError(`${prod?.name ?? 'Sản phẩm'}: Số lượng phải lớn hơn 0.`); return false }
      if (row.lotNo && row.quantityBase > row.availableQty + 0.0001) {
        setFormError(`${prod?.name ?? 'Sản phẩm'}: Số lượng vượt tồn lô ${row.lotNo ?? ''}.`)
        return false
      }
    }
    setFormError(null)
    return true
  }

  /* ── build payload ── */
  const buildPayload = (): CreateTpExportOrderPayload => {
    const items: CreateTpExportOrderPayload['items'] = itemRows
      .filter((r) => r.outputProductId && r.quantityBase > 0)
      .map((r) => {
        const prod = products.find((p) => p.id === r.outputProductId)!
        return {
          outputProductId: r.outputProductId,
          lotNo: r.lotNo,
          expiryDate: r.expiryDate,
          warehouseLocationId: r.warehouseLocationId,
          quantityBase: r.quantityBase,
          unitUsed: prod.unit,
          quantityDisplay: r.quantityBase,
        }
      })

    return {
      orderRef: isEditMode ? (editingOrderRef ?? undefined) : (newOrderRef.trim() || buildTpRef()),
      customerId: customerId || undefined,
      sourceLocationId: sourceLocationId || undefined,
      exportedAt: exportedAt.toISOString(),
      dienGiai: dienGiai.trim() || undefined,
      items,
    }
  }

  /* ── submit (save draft) ── */
  const submitExport = async () => {
    if (isLockedEditMode) {
      setFormError(editingStatus === 'cancelled' ? 'Phiếu đã hủy, không thể chỉnh sửa.' : 'Phiếu đã hoàn thành, không thể chỉnh sửa.')
      return
    }
    if (!validateBeforeSubmit()) return
    if (isEditMode && !orderId) return

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const payload = buildPayload()
      const savedOrder = isEditMode && orderId
        ? await updateTpExportOrder(orderId, payload)
        : await createTpExportOrder(payload)

      navigate('/tp-outbound', { state: { createdOrderId: savedOrder.id } })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu lệnh xuất.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── confirm export ── */
  const triggerConfirmExport = () => {
    if (!isEditMode || !orderId) {
      if (!validateBeforeSubmit()) return
      showConfirmAction({
        header: 'Xác nhận xuất kho',
        message: 'Tạo phiếu và xác nhận xuất kho ngay?',
        acceptLabel: 'Xác nhận xuất kho',
        onAccept: () => {
          void (async () => {
            setSubmitting(true)
            setFormError(null)
            try {
              const payload = buildPayload()
              const savedOrder = await createTpExportOrder(payload)
              await fulfilTpExportOrder(savedOrder.id)
              navigate('/tp-outbound', { state: { createdOrderId: savedOrder.id } })
            } catch (err) {
              setFormError(err instanceof Error ? err.message : 'Không thể xác nhận xuất kho.')
            } finally {
              setSubmitting(false)
            }
          })()
        },
      })
      return
    }

    showConfirmAction({
      header: 'Xác nhận xuất kho',
      message: `Xác nhận hoàn thành lệnh ${editingOrderRef ?? `#${orderId}`}?`,
      acceptLabel: 'Xác nhận xuất kho',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('fulfil')
            setFormError(null)
            await fulfilTpExportOrder(orderId)
            navigate('/tp-outbound', { state: { createdOrderId: orderId } })
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể xác nhận xuất kho.')
          } finally { setProcessingAction(null) }
        })()
      },
    })
  }

  const triggerCancelOrder = () => {
    if (!isEditMode || !orderId) return
    showDangerConfirm({
      header: 'Hủy lệnh xuất',
      message: `Hủy lệnh ${editingOrderRef ?? `#${orderId}`}?`,
      acceptLabel: 'Hủy lệnh',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('cancel')
            setFormError(null)
            await cancelTpExportOrder(orderId)
            navigate('/tp-outbound', { state: { createdOrderId: orderId } })
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể hủy.')
          } finally { setProcessingAction(null) }
        })()
      },
    })
  }

  const triggerCreateAdjustmentOrder = () => {
    if (!isEditMode || !orderId || !isFulfilledViewMode) return
    if (sourceOrderId || adjustedByOrderId) {
      setFormError('Phiếu này đã thuộc luồng điều chỉnh hoặc đã có phiếu điều chỉnh.')
      return
    }
    showConfirmAction({
      header: 'Void & tạo phiếu điều chỉnh',
      message: `Tạo phiếu điều chỉnh từ lệnh ${editingOrderRef ?? `#${orderId}`}?`,
      acceptLabel: 'Tạo điều chỉnh',
      onAccept: () => {
        void (async () => {
          try {
            setProcessingAction('adjust')
            setFormError(null)
            const created = await createTpVoidRerelease(orderId)
            navigate(`/tp-outbound/${created.id}/edit`)
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể tạo điều chỉnh.')
          } finally { setProcessingAction(null) }
        })()
      },
    })
  }

  /* ── table cell renderers ── */
  const sttBody = (_row: ItemRow, opts: { rowIndex: number }) => (
    <span className="tp-inv-stt">{opts.rowIndex + 1}</span>
  )

  const productCodeBody = (row: ItemRow) => {
    const prod = products.find((p) => p.id === row.outputProductId)
    if (isLockedEditMode) {
      return <span className="tp-inv-product-code">{prod?.code ?? '---'}</span>
    }
    const availableOptions = productOptions.filter(
      (opt) => opt.value === row.outputProductId || !usedProductIds.has(opt.value),
    )
    return (
      <Dropdown
        value={row.outputProductId || null}
        options={availableOptions}
        onChange={(e) => { void handleProductChange(row.key, String(e.value ?? '')) }}
        placeholder="Chọn mã SP..."
        filter
        showClear
        className="tp-inv-cell-dropdown"
        disabled={loading}
        panelStyle={{ minWidth: 280 }}
      />
    )
  }

  const productNameBody = (row: ItemRow) => {
    const prod = products.find((p) => p.id === row.outputProductId)
    return (
      <div className="tp-inv-product-name">
        <span>{prod?.name ?? ''}</span>
        {prod?.outputType && (
          <Tag
            value={prod.outputType === 'finished' ? 'TP' : 'BTP'}
            severity="info"
            style={{ fontSize: '0.7rem', padding: '1px 5px' }}
          />
        )}
      </div>
    )
  }

  const lotBody = (row: ItemRow) => {
    if (isLockedEditMode) {
      return row.lotNo ? <span className="tp-inv-lot-badge">{row.lotNo}</span> : <span className="tp-inv-muted">—</span>
    }

    const lotOptions = [
      { label: '— Không chọn lô —', value: '' },
      ...row.stockLots.map((l) => {
        const key = `${l.batchLotNo ?? ''}__${l.batchExpiryDate ?? ''}__${l.warehouseLocationId ?? ''}`
        return {
          label: `${l.batchLotNo ?? '(no lot)'} · tồn: ${formatQuantity(l.availableQty)}`,
          value: key,
        }
      }),
    ]
    const currentKey = row.lotNo != null
      ? `${row.lotNo ?? ''}__${row.expiryDate ?? ''}__${row.warehouseLocationId ?? ''}`
      : ''

    return (
      <div className="tp-inv-lot-cell">
        <Dropdown
          value={currentKey}
          options={lotOptions}
          onChange={(e) => handleLotChange(row.key, String(e.value ?? ''))}
          placeholder={row.stockLoading ? 'Đang tải...' : 'Chọn lô...'}
          className="tp-inv-cell-dropdown tp-inv-lot-dropdown"
          disabled={!row.outputProductId || row.stockLoading}
          panelStyle={{ minWidth: 260 }}
        />
        {row.outputProductId && (
          <button
            type="button"
            className="tp-inv-fefo-btn"
            onClick={() => { void applyFefoForRow(row.key) }}
            title="FEFO tự động"
            disabled={isLockedEditMode}
          >
            ⚡
          </button>
        )}
      </div>
    )
  }

  const unitBody = (row: ItemRow) => {
    const prod = products.find((p) => p.id === row.outputProductId)
    return <span className="tp-inv-unit">{prod?.unit ?? ''}</span>
  }

  const qtyBody = (row: ItemRow) => {
    const prod = products.find((p) => p.id === row.outputProductId)
    if (isLockedEditMode) {
      return <span className="tp-inv-qty">{formatQuantity(row.quantityBase)}</span>
    }
    return (
      <div className="tp-inv-qty-cell">
        <InputText
          value={row.quantityInput}
          onChange={(e) => updateRow(row.key, (r) => ({ ...r, quantityInput: e.target.value }))}
          onFocus={() => handleQtyFocus(row.key)}
          onBlur={() => handleQtyBlur(row.key)}
          placeholder="0"
          className="tp-inv-cell-input tp-inv-cell-input--number"
          disabled={!row.outputProductId}
        />
        {row.lotNo && row.availableQty > 0 && (
          <span className="tp-inv-avail-hint">/ {formatQuantity(row.availableQty)} {prod?.unit ?? ''}</span>
        )}
      </div>
    )
  }

  const unitPriceBody = (row: ItemRow) => {
    if (isLockedEditMode) {
      return <span className="tp-inv-price">{row.unitPrice > 0 ? formatCurrencyVi(row.unitPrice) : '—'}</span>
    }
    return (
      <InputText
        value={row.unitPriceInput}
        onChange={(e) => updateRow(row.key, (r) => ({ ...r, unitPriceInput: e.target.value }))}
        onFocus={() => handleUnitPriceFocus(row.key)}
        onBlur={() => handleUnitPriceBlur(row.key)}
        placeholder="0"
        className="tp-inv-cell-input tp-inv-cell-input--number"
        disabled={!row.outputProductId}
      />
    )
  }

  const lineTotalBody = (row: ItemRow) => {
    const total = row.quantityBase * row.unitPrice
    return <span className="tp-inv-line-total">{total > 0 ? formatCurrencyVi(total) : '—'}</span>
  }

  const actionBody = (row: ItemRow) => {
    if (isLockedEditMode) return null
    return (
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        size="small"
        onClick={() => removeRow(row.key)}
        disabled={itemRows.length <= 1}
        tooltip="Xóa dòng"
        tooltipOptions={{ position: 'left' }}
      />
    )
  }

  /* ── render ── */
  const orderRef = isEditMode ? (editingOrderRef ?? `#${orderId}`) : newOrderRef
  const watermarkText = isFulfilledViewMode ? 'ĐÃ HOÀN THÀNH' : (isCancelledViewMode ? 'ĐÃ HỦY' : null)
  const watermarkClass = isFulfilledViewMode ? 'fulfilled' : (isCancelledViewMode ? 'cancelled' : '')
  const currentStatusLabel = getStatusLabel(editingStatus)
  const currentStatusClass = getStatusClass(editingStatus)

  if (loading) {
    return (
      <section className="tp-inv-page">
        <div className="catalog-loading-wrap">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#4b63d0' }} />
          <p>Đang tải dữ liệu...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="tp-inv-page">
      {watermarkText && (
        <div className={`outbound-status-watermark ${watermarkClass}`} aria-hidden>{watermarkText}</div>
      )}

      {/* ─── Page header ─── */}
      <header className="tp-inv-header">
        <div className="tp-inv-header-left">
          <Button
            icon="pi pi-arrow-left"
            text
            rounded
            size="small"
            onClick={() => navigate('/tp-outbound')}
            className="tp-inv-back-btn"
            tooltip="Quay lại danh sách"
            tooltipOptions={{ position: 'right' }}
          />
          <div className="tp-inv-title-block">
            <h1 className="tp-inv-title">Xuất kho thành phẩm</h1>
            {isEditMode ? (
              <span className="tp-inv-ref-tag">{orderRef}</span>
            ) : (
              <span className="tp-inv-ref-tag tp-inv-ref-editable">
                <InputText
                  value={newOrderRef}
                  onChange={(e) => setNewOrderRef(e.target.value)}
                  placeholder="Mã phiếu xuất"
                  className="tp-inv-ref-input"
                />
              </span>
            )}
          </div>
        </div>
        <div className="tp-inv-header-right">
          {isEditMode && (
            <span className={`tp-inv-status-badge ${currentStatusClass}`}>{currentStatusLabel}</span>
          )}
          {isEditMode && (
            <Button
              icon={showHistory ? 'pi pi-times' : 'pi pi-history'}
              text
              rounded
              size="small"
              onClick={() => setShowHistory((v) => !v)}
              tooltip={showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
              tooltipOptions={{ position: 'left' }}
            />
          )}
        </div>
      </header>

      {/* ─── Notices ─── */}
      {(formError || formSuccess) && (
        <div className={`catalog-inline-notice ${formError ? 'error' : 'success'}`}>
          <span>{formError ?? formSuccess}</span>
          <button
            type="button"
            className="catalog-inline-notice-close"
            onClick={() => { setFormError(null); setFormSuccess(null) }}
            aria-label="Đóng"
          >×</button>
        </div>
      )}

      {sourceOrderId && (
        <div className="catalog-inline-notice" style={{ background: '#fefce8', borderColor: '#fde047' }}>
          <span>
            <i className="pi pi-info-circle" style={{ marginRight: 6 }} />
            Phiếu điều chỉnh từ lệnh gốc{' '}
            <button
              type="button"
              className="tp-inv-link-btn"
              onClick={() => navigate(`/tp-outbound/${sourceOrderId}/edit`)}
            >#{sourceOrderId}</button>
          </span>
        </div>
      )}

      {adjustedByOrderId && (
        <div className="catalog-inline-notice" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <span>
            <i className="pi pi-check-circle" style={{ marginRight: 6 }} />
            Đã có phiếu điều chỉnh{' '}
            <button
              type="button"
              className="tp-inv-link-btn"
              onClick={() => navigate(`/tp-outbound/${adjustedByOrderId}/edit`)}
            >#{adjustedByOrderId}</button>
          </span>
        </div>
      )}

      <div className="tp-inv-body">
        <div className="tp-inv-main-column">

          {/* ─── Two-column info grid ─── */}
          <div className="tp-inv-info-grid">

            {/* Left card: Customer info */}
            <article className="tp-inv-card">
              <header className="tp-inv-card-header">
                <i className="pi pi-user" aria-hidden />
                <span>THÔNG TIN KHÁCH HÀNG</span>
              </header>

              <div className="tp-inv-fields-col">
                <div className="tp-inv-fields-row">
                  <label className="tp-inv-field">
                    <span className="tp-inv-field-label">Mã khách hàng</span>
                    <Dropdown
                      value={customerId}
                      options={customerCodeOptions}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(e) => setCustomerId(String(e.value ?? ''))}
                      placeholder="Chọn mã..."
                      filter
                      showClear
                      disabled={loading || isLockedEditMode}
                      className="tp-inv-field-dropdown"
                    />
                  </label>
                  <label className="tp-inv-field" style={{ flex: 2 }}>
                    <span className="tp-inv-field-label">Tên khách hàng</span>
                    <Dropdown
                      value={customerId}
                      options={customerNameOptions}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(e) => setCustomerId(String(e.value ?? ''))}
                      placeholder="Chọn khách hàng..."
                      filter
                      showClear
                      disabled={loading || isLockedEditMode}
                      className="tp-inv-field-dropdown"
                    />
                  </label>
                </div>

                {selectedCustomer && (
                  <div className="tp-inv-customer-detail">
                    {selectedCustomer.address && (
                      <div className="tp-inv-customer-info-row">
                        <i className="pi pi-map-marker" aria-hidden />
                        <span>{selectedCustomer.address}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="tp-inv-customer-info-row">
                        <i className="pi pi-phone" aria-hidden />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="tp-inv-customer-info-row">
                        <i className="pi pi-envelope" aria-hidden />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <label className="tp-inv-field">
                  <span className="tp-inv-field-label">Hình thức thanh toán</span>
                  <InputText
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Ví dụ: Chuyển khoản, Công nợ 30 ngày..."
                    disabled={isLockedEditMode}
                    className="tp-inv-field-input"
                  />
                </label>
              </div>
            </article>

            {/* Right card: Export/shipping info */}
            <article className="tp-inv-card">
              <header className="tp-inv-card-header">
                <i className="pi pi-box" aria-hidden />
                <span>THÔNG TIN XUẤT KHO &amp; VẬN CHUYỂN</span>
              </header>

              <div className="tp-inv-fields-col">
                <div className="tp-inv-fields-row">
                  <label className="tp-inv-field">
                    <span className="tp-inv-field-label">Ngày xuất kho</span>
                    <Calendar
                      value={exportedAt}
                      onChange={(e) => { if (e.value instanceof Date) setExportedAt(e.value) }}
                      showTime
                      hourFormat="24"
                      dateFormat="dd/mm/yy"
                      disabled={isLockedEditMode}
                      className="tp-inv-field-calendar"
                      showIcon
                    />
                  </label>
                  <label className="tp-inv-field" style={{ flex: 2 }}>
                    <span className="tp-inv-field-label">Kho xuất</span>
                    <Dropdown
                      value={sourceLocationId}
                      options={locationOptions}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(e) => setSourceLocationId(String(e.value ?? ''))}
                      placeholder="Chọn kho xuất hàng..."
                      filter
                      showClear
                      disabled={loading || isLockedEditMode}
                      className="tp-inv-field-dropdown"
                    />
                  </label>
                </div>

                <div className="tp-inv-fields-row">
                  <label className="tp-inv-field">
                    <span className="tp-inv-field-label">Người giao hàng</span>
                    <InputText
                      value={personInCharge}
                      onChange={(e) => setPersonInCharge(e.target.value)}
                      placeholder="Tên người giao..."
                      disabled={isLockedEditMode}
                      className="tp-inv-field-input"
                    />
                  </label>
                  <label className="tp-inv-field">
                    <span className="tp-inv-field-label">Phương thức vận chuyển</span>
                    <InputText
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      placeholder="Ví dụ: GHTK, GHN..."
                      disabled={isLockedEditMode}
                      className="tp-inv-field-input"
                    />
                  </label>
                </div>

                <div className="tp-inv-fields-row">
                  <label className="tp-inv-field">
                    <span className="tp-inv-field-label">Số vận đơn</span>
                    <InputText
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Nhập số vận đơn..."
                      disabled={isLockedEditMode}
                      className="tp-inv-field-input"
                    />
                  </label>
                  <label className="tp-inv-field" style={{ flex: 2 }}>
                    <span className="tp-inv-field-label">Diễn giải / Ghi chú đơn hàng</span>
                    <InputTextarea
                      value={dienGiai}
                      onChange={(e) => setDienGiai(e.target.value)}
                      placeholder="Nhập ghi chú cho phiếu xuất..."
                      rows={2}
                      autoResize
                      disabled={isLockedEditMode}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              </div>
            </article>
          </div>

          {/* ─── Items section ─── */}
          <section className="tp-inv-items-section">
            {/* Toolbar */}
            <div className="tp-inv-items-toolbar">
              <div className="tp-inv-items-toolbar-left">
                <i className="pi pi-list" aria-hidden />
                <span className="tp-inv-items-title">BẢNG CHI TIẾT HÀNG HÓA</span>
                <span className="tp-inv-items-count">{itemRows.filter((r) => r.outputProductId).length} dòng</span>
              </div>
              <div className="tp-inv-items-toolbar-right">
                <span className="p-input-icon-left tp-inv-search-wrap">
                  <i className="pi pi-search" />
                  <InputText
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Tìm mã hàng, tên hàng, số lô..."
                    className="tp-inv-search-input"
                  />
                </span>
              </div>
            </div>

            {/* DataTable */}
            <DataTable
              value={visibleRows}
              dataKey="key"
              emptyMessage="Chưa có dòng hàng hóa nào."
              className="tp-inv-table"
              scrollable
              scrollHeight="auto"
              size="small"
            >
              <Column
                header="STT"
                body={sttBody}
                style={{ width: 52, textAlign: 'center' }}
                className="tp-inv-col-stt"
              />
              <Column
                header="Mã hàng"
                body={productCodeBody}
                style={{ width: 200 }}
                className="tp-inv-col-code"
              />
              <Column
                header="Tên hàng hóa"
                body={productNameBody}
                style={{ minWidth: 180 }}
                className="tp-inv-col-name"
              />
              <Column
                header="Số lô"
                body={lotBody}
                style={{ width: 230 }}
                className="tp-inv-col-lot"
              />
              <Column
                header="ĐV"
                body={unitBody}
                style={{ width: 56, textAlign: 'center' }}
                className="tp-inv-col-unit"
              />
              <Column
                header="Số lượng"
                body={qtyBody}
                style={{ width: 170 }}
                className="tp-inv-col-qty"
              />
              <Column
                header="Đơn giá"
                body={unitPriceBody}
                style={{ width: 140 }}
                className="tp-inv-col-price"
              />
              <Column
                header="Thành tiền"
                body={lineTotalBody}
                style={{ width: 140, textAlign: 'right' }}
                className="tp-inv-col-total"
              />
              {!isLockedEditMode && (
                <Column
                  body={actionBody}
                  style={{ width: 52, textAlign: 'center' }}
                  className="tp-inv-col-action"
                />
              )}
            </DataTable>

            {/* Add row */}
            {!isLockedEditMode && (
              <div className="tp-inv-add-row-area">
                <Button
                  icon="pi pi-plus"
                  label="Thêm dòng hàng"
                  text
                  size="small"
                  onClick={addRow}
                  className="tp-inv-add-row-btn"
                />
              </div>
            )}

            {/* Summary */}
            <div className="tp-inv-summary">
              <div className="tp-inv-summary-row">
                <span>Tổng số lượng hàng:</span>
                <strong>{formatQuantity(totalQty)} sản phẩm</strong>
              </div>
              <div className="tp-inv-summary-row">
                <span>Tổng tiền hàng:</span>
                <strong>{formatCurrencyVi(totalAmount)}</strong>
              </div>
              <div className="tp-inv-summary-row tp-inv-grand-total-row">
                <span>TỔNG THANH TOÁN:</span>
                <strong className="tp-inv-grand-total">{formatCurrencyVi(totalAmount)}</strong>
              </div>
            </div>
          </section>
        </div>

        {/* ─── History panel (when visible) ─── */}
        {showHistory && isEditMode && (
          <aside className="tp-inv-history-panel">
            <div className="tp-inv-history-panel-header">
              <i className="pi pi-history" aria-hidden />
              <span>LỊCH SỬ</span>
            </div>
            {historyLoading && (
              <div className="tp-inv-history-placeholder">
                <i className="pi pi-spin pi-spinner" />
                <p>Đang tải...</p>
              </div>
            )}
            {historyError && (
              <div className="tp-inv-history-placeholder">
                <i className="pi pi-exclamation-circle" style={{ color: '#ef4444' }} />
                <p>{historyError}</p>
              </div>
            )}
            {!historyLoading && !historyError && historyEvents.length === 0 && (
              <div className="tp-inv-history-placeholder">
                <i className="pi pi-clock" style={{ opacity: 0.3 }} />
                <p>Chưa có lịch sử</p>
              </div>
            )}
            {!historyLoading && (
              <HistoryTimeline
                events={historyEvents}
                loading={historyLoading}
                error={historyError}
                emptyMessage="Chưa c� lịch sử thao t�c cho lệnh xuất th�nh phẩm n�y."
              />
            )}
          </aside>
        )}
      </div>

      {/* ─── Action bar ─── */}
      <div className="tp-inv-action-bar">
        <div className="tp-inv-action-left">
          {!isLockedEditMode && (
            <Button
              icon="pi pi-save"
              label="Lưu nháp"
              outlined
              onClick={submitExport}
              loading={submitting}
              disabled={processingAction != null}
            />
          )}
          <Button
            icon="pi pi-print"
            label="In hóa đơn"
            outlined
            disabled
            tooltip="Tính năng sắp ra mắt"
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-file-export"
            label="Xuất Excel"
            outlined
            disabled
            tooltip="Tính năng sắp ra mắt"
            tooltipOptions={{ position: 'top' }}
          />
          {isFulfilledViewMode && !sourceOrderId && !adjustedByOrderId && (
            <Button
              icon="pi pi-sync"
              label="Tạo phiếu điều chỉnh"
              outlined
              severity="warning"
              onClick={triggerCreateAdjustmentOrder}
              loading={processingAction === 'adjust'}
              disabled={processingAction != null}
            />
          )}
          {!isLockedEditMode && isEditMode && (
            <Button
              icon="pi pi-ban"
              label="Hủy lệnh"
              outlined
              severity="danger"
              onClick={triggerCancelOrder}
              loading={processingAction === 'cancel'}
              disabled={processingAction != null || submitting}
            />
          )}
        </div>

        <div className="tp-inv-action-right">
          {!isLockedEditMode && (
            <Button
              icon="pi pi-check"
              label="Xác nhận xuất kho"
              onClick={triggerConfirmExport}
              loading={processingAction === 'fulfil' || submitting}
              disabled={processingAction != null}
              className="tp-inv-confirm-btn"
            />
          )}
        </div>
      </div>
    </section>
  )
}
