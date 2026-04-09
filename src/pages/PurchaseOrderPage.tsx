import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { PurchaseOrderDetailScreen } from '../components/purchaseOrder/PurchaseOrderDetailScreen'
import { PurchaseOrderListScreen } from '../components/purchaseOrder/PurchaseOrderListScreen'
import { PurchaseShortageScreen } from '../components/purchaseOrder/PurchaseShortageScreen'
import { formatQuantity, parseDecimalInput, toEditableNumberString } from '../components/purchaseOrder/format'
import {
  DRAFT_LINES,
  STATUS_LABELS,
  type OutletContext,
  type PurchaseDraftLine,
  type PurchaseOrderRow,
  type PurchaseTab,
  type PurchaseView,
  type PoStatus,
  type PurchaseRequestRowResponse,
  type PurchaseShortageRow,
  type ShortageStatus,
  type SupplierOption,
} from '../components/purchaseOrder/types'
import { fetchBasics } from '../lib/catalogApi'
import {
  createPurchaseRequest,
  fetchPurchaseRequestDetail,
  fetchPurchaseRequestHistory,
  fetchPurchaseRequests,
  fetchPurchaseShortages,
  type PurchaseRequestHistoryEvent,
  submitPurchaseRequest,
  updatePurchaseRequestDraft,
} from '../lib/purchaseShortageApi'

function createRequestRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `PR-${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function PurchaseOrderPage() {
  const { search } = useOutletContext<OutletContext>()
  const [activeView, setActiveView] = useState<PurchaseView>('tabs')
  const [activeTab, setActiveTab] = useState<PurchaseTab>('shortage')

  const [statusFilter, setStatusFilter] = useState<'all' | PoStatus>('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [poPageSize, setPoPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [poRows, setPoRows] = useState<PurchaseOrderRow[]>([])
  const [poLoading, setPoLoading] = useState(false)
  const [poError, setPoError] = useState<string | null>(null)
  const [poRefreshKey, setPoRefreshKey] = useState(0)
  const [shortageStatusFilter, setShortageStatusFilter] = useState<'all' | ShortageStatus>('all')
  const [shortageRows, setShortageRows] = useState<PurchaseShortageRow[]>([])
  const [selectedShortageIds, setSelectedShortageIds] = useState<string[]>([])
  const [shortagePage, setShortagePage] = useState(1)
  const [shortagePageSize, setShortagePageSize] = useState(10)
  const [shortageTotal, setShortageTotal] = useState(0)
  const [shortageSummary, setShortageSummary] = useState({ critical: 0, warning: 0, stable: 0 })
  const [shortageLoading, setShortageLoading] = useState(false)
  const [shortageError, setShortageError] = useState<string | null>(null)
  const [shortageLastUpdatedAt, setShortageLastUpdatedAt] = useState<string | null>(null)
  const [shortageRefreshKey, setShortageRefreshKey] = useState(0)
  const [selectedShortageMap, setSelectedShortageMap] = useState<Record<string, PurchaseShortageRow>>({})
  const [quickSupplierId, setQuickSupplierId] = useState<string>('')
  const [quickSupplierOptions, setQuickSupplierOptions] = useState<SupplierOption[]>([])
  const [quickSupplierLoading, setQuickSupplierLoading] = useState(false)
  const [quickSupplierError, setQuickSupplierError] = useState<string | null>(null)
  const [quickWarehouseId, setQuickWarehouseId] = useState<string>('')
  const [quickWarehouseOptions, setQuickWarehouseOptions] = useState<SupplierOption[]>([])
  const [quickWarehouseLoading, setQuickWarehouseLoading] = useState(false)
  const [quickWarehouseError, setQuickWarehouseError] = useState<string | null>(null)
  const [quickNeedDate, setQuickNeedDate] = useState<Date | null>(null)
  const [quickRequestType, setQuickRequestType] = useState<'normal' | 'urgent' | null>(null)
  const [quickNote, setQuickNote] = useState('')
  const [quickItemQuantities, setQuickItemQuantities] = useState<Record<string, string>>({})
  const [quickQuantityErrors, setQuickQuantityErrors] = useState<Record<string, string>>({})
  const [quickSubmitError, setQuickSubmitError] = useState<string | null>(null)
  const [quickSubmitSuccess, setQuickSubmitSuccess] = useState<string | null>(null)
  const [quickSaving, setQuickSaving] = useState(false)
  const [detailLines, setDetailLines] = useState<PurchaseDraftLine[]>(DRAFT_LINES)
  const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailDraftRef, setDetailDraftRef] = useState('PO-DRAFT-2024-00892')
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailSubmitting, setDetailSubmitting] = useState(false)
  const [detailSubmitError, setDetailSubmitError] = useState<string | null>(null)
  const [detailSubmitSuccess, setDetailSubmitSuccess] = useState<string | null>(null)
  const [detailHistoryEvents, setDetailHistoryEvents] = useState<PurchaseRequestHistoryEvent[]>([])
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false)
  const [detailHistoryError, setDetailHistoryError] = useState<string | null>(null)

  const loadDetailHistory = async (purchaseId: string) => {
    setDetailHistoryLoading(true)
    setDetailHistoryError(null)
    try {
      const history = await fetchPurchaseRequestHistory(purchaseId)
      setDetailHistoryEvents(history.data)
    } catch (error) {
      setDetailHistoryEvents([])
      setDetailHistoryError(error instanceof Error ? error.message : 'Không thể tải lịch sử thao tác.')
    } finally {
      setDetailHistoryLoading(false)
    }
  }

  const poSuppliers = useMemo(
    () => [...new Set(poRows.map((row) => row.supplier))],
    [poRows],
  )
  const poSupplierOptions = useMemo(
    () => [
      { label: 'Nhà cung cấp', value: 'all' },
      ...poSuppliers.map((supplier) => ({ label: supplier, value: supplier })),
    ],
    [poSuppliers],
  )

  useEffect(() => {
    let cancelled = false

    const loadSuppliers = async () => {
      setQuickSupplierLoading(true)
      setQuickSupplierError(null)
      try {
        const rows = await fetchBasics('suppliers')
        if (cancelled) return
        const options = rows
          .filter((row) => row.id && row.name)
          .map((row) => ({
            value: row.id,
            label: row.code ? `${row.code} - ${row.name}` : row.name,
          }))
        setQuickSupplierOptions(options)
      } catch (error) {
        if (cancelled) return
        setQuickSupplierError(error instanceof Error ? error.message : 'Không thể tải danh sách nhà cung cấp.')
      } finally {
        if (!cancelled) setQuickSupplierLoading(false)
      }
    }

    void loadSuppliers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadWarehouses = async () => {
      setQuickWarehouseLoading(true)
      setQuickWarehouseError(null)
      try {
        const rows = await fetchBasics('locations')
        if (cancelled) return
        const options = rows
          .filter((row) => row.id && row.name)
          .map((row) => ({
            value: row.id,
            label: row.code ? `${row.code} - ${row.name}` : row.name,
          }))
        setQuickWarehouseOptions(options)
      } catch (error) {
        if (cancelled) return
        setQuickWarehouseError(error instanceof Error ? error.message : 'Không thể tải danh sách kho nhận hàng.')
      } finally {
        if (!cancelled) setQuickWarehouseLoading(false)
      }
    }

    void loadWarehouses()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeText(search)

    return poRows.filter((row) => {
      const inStatus = statusFilter === 'all' || row.status === statusFilter
      const inSupplier = supplierFilter === 'all' || row.supplier === supplierFilter
      const inFromDate = !fromDate || row.createdAt >= fromDate
      const inToDate = !toDate || row.createdAt <= toDate
      const text = normalizeText([row.code, row.supplier, row.creator, STATUS_LABELS[row.status]].join(' '))
      const inSearch = !normalizedQuery || text.includes(normalizedQuery)
      return inStatus && inSupplier && inFromDate && inToDate && inSearch
    })
  }, [fromDate, poRows, search, statusFilter, supplierFilter, toDate])

  useEffect(() => {
    let cancelled = false

    const toPoRow = (row: PurchaseRequestRowResponse): PurchaseOrderRow => {
      const fallbackTotal = row.items.reduce((sum, item) => {
        const qty = Number(item.quantityDisplay)
        return sum + (Number.isFinite(qty) ? qty : 0)
      }, 0)

      return {
        id: row.id,
        code: row.requestRef,
        createdAt: String(row.createdAt).slice(0, 10),
        supplier: row.supplier?.name ?? '---',
        lineCount: row.items.length,
        totalValue: Number.isFinite(row.totalAmount) ? Number(row.totalAmount) : fallbackTotal,
        status: row.status as PoStatus,
        creator: row.requester?.fullName ?? '---',
      }
    }

    const loadPoRows = async () => {
      setPoLoading(true)
      setPoError(null)
      try {
        const response = await fetchPurchaseRequests({ page: 1, limit: 500 })
        if (cancelled) return
        setPoRows(response.data.map(toPoRow))
      } catch (error) {
        if (cancelled) return
        setPoError(error instanceof Error ? error.message : 'Không thể tải danh sách phiếu PO.')
      } finally {
        if (!cancelled) setPoLoading(false)
      }
    }

    void loadPoRows()
    return () => {
      cancelled = true
    }
  }, [poRefreshKey])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [search, statusFilter, supplierFilter, fromDate, toDate, poPageSize])

  useEffect(() => {
    setShortagePage(1)
    setSelectedShortageIds([])
  }, [search, shortageStatusFilter, shortagePageSize])

  useEffect(() => {
    let cancelled = false

    const loadShortages = async () => {
      setShortageLoading(true)
      setShortageError(null)
      try {
        const response = await fetchPurchaseShortages({
          q: search,
          status: shortageStatusFilter,
          page: shortagePage,
          limit: shortagePageSize,
        })
        if (cancelled) return
        setShortageRows(response.data)
        setShortageTotal(response.total)
        setShortageSummary(response.summary)
        setShortageLastUpdatedAt(response.data[0]?.updatedAt ?? null)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu thiếu hụt'
        setShortageError(message)
      } finally {
        if (!cancelled) setShortageLoading(false)
      }
    }

    void loadShortages()
    return () => {
      cancelled = true
    }
  }, [search, shortagePage, shortagePageSize, shortageRefreshKey, shortageStatusFilter])

  useEffect(() => {
    setSelectedShortageMap((prev) => {
      const next = { ...prev }
      for (const row of shortageRows) {
        next[row.id] = row
      }
      return next
    })
  }, [shortageRows])

  useEffect(() => {
    setQuickItemQuantities((prev) => {
      const next: Record<string, string> = {}
      for (const id of selectedShortageIds) {
        if (prev[id] !== undefined) {
          next[id] = prev[id]
          continue
        }
        const row = selectedShortageMap[id]
        const defaultQty = row && row.stockShort > 0 ? formatQuantity(row.stockShort) : ''
        next[id] = defaultQty
      }
      return next
    })

    setQuickQuantityErrors((prev) => {
      const next: Record<string, string> = {}
      for (const id of selectedShortageIds) {
        if (prev[id]) next[id] = prev[id]
      }
      return next
    })
  }, [selectedShortageIds, selectedShortageMap])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / poPageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * poPageSize
  const visibleRows = filteredRows.slice(start, start + poPageSize)
  const visibleIds = visibleRows.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const rangeStart = filteredRows.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + poPageSize, filteredRows.length)
  const selectedPoRows = visibleRows.filter((row) => selectedIds.includes(row.id))

  const shortageTotalPages = Math.max(1, Math.ceil(shortageTotal / shortagePageSize))
  const shortageSafePage = Math.min(shortagePage, shortageTotalPages)
  const shortageRangeStart = shortageTotal === 0 ? 0 : (shortageSafePage - 1) * shortagePageSize + 1
  const shortageRangeEnd = Math.min(shortageSafePage * shortagePageSize, shortageTotal)
  const shortageVisibleIds = shortageRows.map((row) => row.id)
  const selectedShortageRows = shortageRows.filter((row) => selectedShortageIds.includes(row.id))
  const selectedQuickItems = selectedShortageIds
    .map((id) => selectedShortageMap[id])
    .filter((row): row is PurchaseShortageRow => Boolean(row))
  const allShortageVisibleSelected =
    shortageVisibleIds.length > 0 && shortageVisibleIds.every((id) => selectedShortageIds.includes(id))

  const stats = useMemo(
    () => ({
      total: poRows.length,
      draft: poRows.filter((row) => row.status === 'draft').length,
      submitted: poRows.filter((row) => row.status === 'submitted').length,
    }),
    [poRows],
  )

  const detailSubtotal = useMemo(
    () => detailLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [detailLines],
  )
  const detailVat = Math.round(detailSubtotal * 0.0925)
  const detailTotal = detailSubtotal + detailVat

  const handleUpdateDetailLine = (lineId: string, patch: Partial<PurchaseDraftLine>) => {
    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)
    setDetailLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)))
  }

  const handleAppendDetailLine = (line: Omit<PurchaseDraftLine, 'id'>) => {
    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)

    const normalizedNewCode = normalizeText(line.materialCode)

    setDetailLines((prev) => {
      const inferredProductId = line.productId?.trim()
        || prev.find((item) => normalizeText(item.materialCode) === normalizedNewCode)?.productId
        || ''

      const newLine: PurchaseDraftLine = {
        ...line,
        productId: inferredProductId,
        id: `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      }

      return [...prev, newLine]
    })
  }

  const handleRemoveDetailLine = (lineId: string) => {
    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)
    setDetailLines((prev) => prev.filter((line) => line.id !== lineId))
  }

  const handleToggleVisibleRows = (checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }
    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
  }

  const handlePoSelectionChange = (nextRows: PurchaseOrderRow[]) => {
    const nextSet = new Set(nextRows.map((r) => r.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of visibleIds) {
        if (nextSet.has(id)) next.add(id)
        else next.delete(id)
      }
      return [...next]
    })
  }

  const handleToggleShortageVisibleRows = (checked: boolean) => {
    if (!checked) {
      setSelectedShortageIds((prev) => prev.filter((id) => !shortageVisibleIds.includes(id)))
      return
    }
    setSelectedShortageIds((prev) => [...new Set([...prev, ...shortageVisibleIds])])
  }

  const handleShortageSelectionChange = (nextRows: PurchaseShortageRow[]) => {
    const nextSelectedIds = nextRows.map((row) => row.id)
    const nextSet = new Set(nextSelectedIds)

    setSelectedShortageIds((prev) => {
      const next = new Set(prev)
      for (const id of shortageVisibleIds) {
        if (nextSet.has(id)) next.add(id)
        else next.delete(id)
      }
      return [...next]
    })
  }

  const handleQuickQuantityChange = (itemId: string, rawValue: string) => {
    setQuickSubmitError(null)
    setQuickSubmitSuccess(null)
    setQuickItemQuantities((prev) => ({ ...prev, [itemId]: rawValue }))
    setQuickQuantityErrors((prev) => {
      if (!prev[itemId]) return prev
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const handleQuickQuantityFocus = (itemId: string) => {
    const parsed = parseDecimalInput(quickItemQuantities[itemId] ?? '')
    if (Number.isFinite(parsed)) {
      setQuickItemQuantities((prev) => ({ ...prev, [itemId]: toEditableNumberString(parsed) }))
    }
  }

  const handleQuickQuantityBlur = (itemId: string) => {
    const parsed = parseDecimalInput(quickItemQuantities[itemId] ?? '')
    if (Number.isFinite(parsed)) {
      setQuickItemQuantities((prev) => ({ ...prev, [itemId]: formatQuantity(parsed) }))
      return
    }
    if ((quickItemQuantities[itemId] ?? '').trim() === '') return
    setQuickQuantityErrors((prev) => ({ ...prev, [itemId]: 'Số lượng không hợp lệ.' }))
  }

  const handleQuickSaveDraft = async () => {
    setQuickSubmitError(null)
    setQuickSubmitSuccess(null)

    if (selectedQuickItems.length === 0) {
      setQuickSubmitError('Vui lòng chọn ít nhất 1 nguyên liệu từ danh sách thiếu hụt.')
      return
    }

    const nextErrors: Record<string, string> = {}
    const items = selectedQuickItems.map((row) => {
      const raw = quickItemQuantities[row.id] ?? ''
      const parsed = parseDecimalInput(raw)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors[row.id] = 'Số lượng yêu cầu phải là số > 0.'
      }

      return {
        productId: row.id,
        quantityNeededBase: parsed,
        unitDisplay: row.unit || 'base',
        quantityDisplay: parsed,
        unitPrice: 0,
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setQuickQuantityErrors(nextErrors)
      setQuickSubmitError('Có dòng số lượng không hợp lệ. Vui lòng kiểm tra lại trước khi lưu.')
      return
    }

    const note = quickNote.trim()

    setQuickSaving(true)
    try {
      const created = await createPurchaseRequest({
        requestRef: createRequestRef(),
        supplierId: quickSupplierId || undefined,
        expectedDate: quickNeedDate ? quickNeedDate.toISOString() : undefined,
        notes: note || undefined,
        items,
      })
      setQuickSubmitSuccess(`Đã lưu dự thảo yêu cầu mua hàng ${created.requestRef}.`)
      setPoRefreshKey((prev) => prev + 1)
      setSelectedShortageIds([])
      setQuickItemQuantities({})
      setQuickQuantityErrors({})
      setQuickSupplierId('')
      setQuickWarehouseId('')
    } catch (error) {
      setQuickSubmitError(error instanceof Error ? error.message : 'Không thể lưu dự thảo mua hàng.')
    } finally {
      setQuickSaving(false)
    }
  }

  const handleEnterDetailFromQuick = () => {
    setQuickSubmitError(null)
    setQuickSubmitSuccess(null)

    if (selectedQuickItems.length === 0) {
      setQuickSubmitError('Vui lòng chọn ít nhất 1 nguyên liệu trước khi vào chi tiết phiếu PO.')
      return
    }

    const nextErrors: Record<string, string> = {}
    const mappedLines: PurchaseDraftLine[] = selectedQuickItems.map((item) => {
      const parsed = parseDecimalInput(quickItemQuantities[item.id] ?? '')
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors[item.id] = 'Số lượng yêu cầu phải là số > 0.'
      }

      return {
        id: `quick-${item.id}`,
        productId: item.id,
        materialCode: item.code,
        materialName: item.materialName,
        quantity: Number.isFinite(parsed) ? parsed : 0,
        unit: item.unit || 'base',
        unitPrice: 0,
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setQuickQuantityErrors(nextErrors)
      setQuickSubmitError('Có dòng số lượng không hợp lệ. Vui lòng kiểm tra lại trước khi vào chi tiết.')
      return
    }

    setDetailLines(mappedLines)
    setDetailPurchaseId(null)
    setDetailDraftRef('PO-DRAFT-2024-00892')
    setDetailHistoryEvents([])
    setDetailHistoryError(null)
    setDetailHistoryLoading(false)
    setActiveView('detail')
  }

  const handleEditPoFromList = async (row: PurchaseOrderRow) => {
    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)
    setDetailLoading(true)
    setActiveView('detail')

    try {
      const detail = await fetchPurchaseRequestDetail(row.id)
      const mappedLines: PurchaseDraftLine[] = detail.items.map((item) => ({
        id: `item-${item.id}`,
        productId: String(item.productId),
        materialCode: item.product.code,
        materialName: item.product.name,
        quantity: Number(item.quantityDisplay),
        unit: item.unitDisplay || 'base',
        unitPrice: Number(item.unitPrice ?? 0),
      }))

      setDetailPurchaseId(detail.id)
      setDetailDraftRef(detail.requestRef)
      setDetailLines(mappedLines)
      setQuickSupplierId(detail.supplier?.id ? String(detail.supplier.id) : '')
      setQuickNeedDate(detail.expectedDate ? new Date(detail.expectedDate) : null)
      setQuickNote(detail.notes ?? '')
      setQuickWarehouseId('')
      setQuickRequestType(null)
      await loadDetailHistory(detail.id)
    } catch (error) {
      setDetailSubmitError(error instanceof Error ? error.message : 'Không thể tải chi tiết phiếu PO để chỉnh sửa.')
      setDetailHistoryEvents([])
      setDetailHistoryLoading(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSaveDetailDraft = async () => {
    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)

    if (detailLines.length === 0) {
      setDetailSubmitError('Không có dòng nguyên liệu để lưu bản nháp.')
      return
    }

    const missingProductLink = detailLines.find((line) => !line.productId?.trim())
    if (missingProductLink) {
      setDetailSubmitError(`Dòng ${missingProductLink.materialCode || missingProductLink.materialName || missingProductLink.id} chưa gắn mã sản phẩm hệ thống, chưa thể lưu.`)
      return
    }

    const items = detailLines
      .map((line) => ({
        productId: line.productId,
        quantityNeededBase: line.quantity,
        unitDisplay: line.unit || 'base',
        quantityDisplay: line.quantity,
        unitPrice: line.unitPrice,
      }))

    if (items.some((item) => !Number.isFinite(item.quantityNeededBase) || item.quantityNeededBase <= 0)) {
      setDetailSubmitError('Có dòng số lượng không hợp lệ. Vui lòng kiểm tra lại.')
      return
    }

    const note = quickNote.trim()

    setDetailSaving(true)
    try {
      const payload = {
        requestRef: detailPurchaseId ? detailDraftRef : createRequestRef(),
        supplierId: quickSupplierId || undefined,
        expectedDate: quickNeedDate ? quickNeedDate.toISOString() : undefined,
        notes: note || undefined,
        items,
      }

      const saved = detailPurchaseId
        ? await updatePurchaseRequestDraft(detailPurchaseId, payload)
        : await createPurchaseRequest(payload)

      setDetailPurchaseId(saved.id)
      setDetailDraftRef(saved.requestRef)
      setPoRefreshKey((prev) => prev + 1)
      setDetailSubmitSuccess(`Đã lưu bản nháp ${saved.requestRef}.`)
      await loadDetailHistory(saved.id)
      return saved
    } catch (error) {
      setDetailSubmitError(error instanceof Error ? error.message : 'Không thể lưu bản nháp từ màn chi tiết.')
      return null
    } finally {
      setDetailSaving(false)
    }
  }

  const handleSubmitDetail = async () => {
    if (detailSaving || detailSubmitting || detailLoading) return

    setDetailSubmitError(null)
    setDetailSubmitSuccess(null)

    let requestId = detailPurchaseId
    if (!requestId) {
      const saved = await handleSaveDetailDraft()
      if (!saved?.id) return
      requestId = saved.id
    }

    setDetailSubmitting(true)
    try {
      const submitted = await submitPurchaseRequest(requestId)
      setDetailPurchaseId(submitted.id)
      setDetailDraftRef(submitted.requestRef)
      setDetailSubmitSuccess(`Đã gửi phiếu ${submitted.requestRef} cho bộ phận thu mua.`)
      await loadDetailHistory(submitted.id)
      setPoRefreshKey((prev) => prev + 1)
      setActiveView('tabs')
      setActiveTab('po-list')
    } catch (error) {
      setDetailSubmitError(error instanceof Error ? error.message : 'Không thể gửi phiếu cho bộ phận thu mua.')
    } finally {
      setDetailSubmitting(false)
    }
  }

  const handleCreateNewPo = () => {
    setDetailPurchaseId(null)
    setDetailHistoryEvents([])
    setDetailHistoryError(null)
    setDetailHistoryLoading(false)
    setActiveView('detail')
  }

  if (activeView === 'detail') {
    return (
      <PurchaseOrderDetailScreen
        detailDraftRef={detailDraftRef}
        detailSaving={detailSaving}
        onBack={() => setActiveView('tabs')}
        onSaveDraft={() => {
          void handleSaveDetailDraft()
        }}
        onSubmit={() => {
          void handleSubmitDetail()
        }}
        onCancel={() => setActiveView('tabs')}
        detailSubmitting={detailSubmitting}
        detailSubmitError={detailSubmitError}
        detailSubmitSuccess={detailSubmitSuccess}
        detailLoading={detailLoading}
        quickSupplierId={quickSupplierId}
        quickSupplierOptions={quickSupplierOptions}
        onQuickSupplierIdChange={setQuickSupplierId}
        receivingWarehouseId={quickWarehouseId}
        receivingWarehouseOptions={quickWarehouseOptions}
        receivingWarehouseLoading={quickWarehouseLoading}
        receivingWarehouseError={quickWarehouseError}
        onReceivingWarehouseIdChange={setQuickWarehouseId}
        quickNeedDate={quickNeedDate}
        onQuickNeedDateChange={setQuickNeedDate}
        quickNote={quickNote}
        onQuickNoteChange={setQuickNote}
        detailLines={detailLines}
        onUpdateDetailLine={handleUpdateDetailLine}
        onAppendDetailLine={handleAppendDetailLine}
        onRemoveDetailLine={handleRemoveDetailLine}
        detailSubtotal={detailSubtotal}
        detailVat={detailVat}
        detailTotal={detailTotal}
        detailHistoryEvents={detailHistoryEvents}
        detailHistoryLoading={detailHistoryLoading}
        detailHistoryError={detailHistoryError}
      />
    )
  }

  return (
    <section className="purchase-module-shell">
      <header className="purchase-tabs-header">
        <Button
          type="button"
          className={activeTab === 'shortage' ? 'active' : ''}
          onClick={() => setActiveTab('shortage')}
          label="Yêu cầu mua hàng & Thiếu hụt"
          text
        />
        <Button
          type="button"
          className={activeTab === 'po-list' ? 'active' : ''}
          onClick={() => setActiveTab('po-list')}
          label="Danh sách Phiếu PO"
          text
        />
      </header>

      {activeTab === 'shortage' ? (
        <PurchaseShortageScreen
          shortageStatusFilter={shortageStatusFilter}
          onShortageStatusFilterChange={setShortageStatusFilter}
          shortageSummary={shortageSummary}
          shortageLastUpdatedAt={shortageLastUpdatedAt}
          shortageError={shortageError}
          shortageLoading={shortageLoading}
          shortageRows={shortageRows}
          selectedShortageRows={selectedShortageRows}
          allShortageVisibleSelected={allShortageVisibleSelected}
          onShortageSelectionChange={handleShortageSelectionChange}
          onToggleShortageVisibleRows={handleToggleShortageVisibleRows}
          onReloadShortage={() => setShortageRefreshKey((prev) => prev + 1)}
          shortageRangeStart={shortageRangeStart}
          shortageRangeEnd={shortageRangeEnd}
          shortageTotal={shortageTotal}
          shortageSafePage={shortageSafePage}
          shortageTotalPages={shortageTotalPages}
          shortagePageSize={shortagePageSize}
          onShortagePageChange={setShortagePage}
          onShortagePageSizeChange={setShortagePageSize}
          quickSupplierId={quickSupplierId}
          quickSupplierOptions={quickSupplierOptions}
          quickSupplierLoading={quickSupplierLoading}
          quickSupplierError={quickSupplierError}
          onQuickSupplierIdChange={setQuickSupplierId}
          quickNeedDate={quickNeedDate}
          onQuickNeedDateChange={setQuickNeedDate}
          quickRequestType={quickRequestType}
          onQuickRequestTypeChange={setQuickRequestType}
          selectedQuickItems={selectedQuickItems}
          quickItemQuantities={quickItemQuantities}
          quickQuantityErrors={quickQuantityErrors}
          onQuickQuantityChange={handleQuickQuantityChange}
          onQuickQuantityFocus={handleQuickQuantityFocus}
          onQuickQuantityBlur={handleQuickQuantityBlur}
          quickSubmitError={quickSubmitError}
          quickSubmitSuccess={quickSubmitSuccess}
          quickNote={quickNote}
          onQuickNoteChange={setQuickNote}
          onEnterDetailFromQuick={handleEnterDetailFromQuick}
          quickSaving={quickSaving}
          onQuickSaveDraft={() => {
            void handleQuickSaveDraft()
          }}
        />
      ) : (
        <PurchaseOrderListScreen
          stats={stats}
          onCreateNewPo={handleCreateNewPo}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          supplierFilter={supplierFilter}
          onSupplierFilterChange={setSupplierFilter}
          poSupplierOptions={poSupplierOptions}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          poError={poError}
          visibleRows={visibleRows}
          selectedPoRows={selectedPoRows}
          allVisibleSelected={allVisibleSelected}
          onPoSelectionChange={handlePoSelectionChange}
          onToggleVisibleRows={handleToggleVisibleRows}
          poLoading={poLoading}
          onEditPo={(row) => {
            void handleEditPoFromList(row)
          }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalFilteredRows={filteredRows.length}
          safePage={safePage}
          totalPages={totalPages}
          poPageSize={poPageSize}
          onPageChange={setPage}
          onPageSizeChange={setPoPageSize}
        />
      )}
    </section>
  )
}