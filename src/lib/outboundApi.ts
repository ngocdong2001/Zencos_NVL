import { apiFetch } from './api'

const http = apiFetch

export type InventoryStockBatch = {
  id: string
  lotNo: string
  invoiceNumber: string | null
  expiryDate: string | null
  currentQtyBase: number
  manufacturerName: string | null
  supplierName: string | null
  product: {
    id: string
    code: string
    name: string
    inciName: string | null
  }
  location: { id: string; code: string; name: string } | null
}

export type CreateExportOrderPayload = {
  orderRef?: string
  customerId?: string
  sourceLocationId?: string
  exportedAt?: string
  notes?: string
  dienGiai?: string
  shortages?: Array<{
    productId: string
    requestedQty: number
    availableQty: number
    shortageQty: number
    unitUsed: string
  }>
  items: Array<{
    productId: string
    batchId?: string
    quantityBase: number
    unitUsed: string
    quantityDisplay: number
    unitPriceSnapshot?: number
  }>
}

export type CreateExportOrderResponse = {
  id: string
  orderRef: string | null
}

export type ExportOrderStatus = 'pending' | 'fulfilled' | 'cancelled'
export type ExportOrderSortBy = 'createdAt' | 'status' | 'orderRef' | 'exportedAt'
export type SortDir = 'asc' | 'desc'

export type ExportOrderListRow = {
  id: string
  orderRef: string | null
  status: ExportOrderStatus
  sourceOrderId?: string | null
  adjustedByOrderId?: string | null
  canFulfil?: boolean
  fulfilBlockedReason?: string | null
  exportedAt: string | null
  createdAt: string
  dienGiai?: string | null
  customer: {
    id: string
    name: string
  } | null
  sourceLocation: {
    id: string
    code: string
    name: string
  } | null
  items: Array<{
    id: string
    batchId?: string | null
    product: {
      id: string
      code: string
      name: string
    }
    quantityBase: number
    unitUsed: string
  }>
}

export type ExportOrderListResponse = {
  data: ExportOrderListRow[]
  total: number
  page: number
  limit: number
}

export type ExportOrderDetail = {
  id: string
  orderRef: string | null
  status: ExportOrderStatus
  sourceOrder: {
    id: string
    orderRef: string | null
    status: ExportOrderStatus
  } | null
  adjustedByOrder: {
    id: string
    orderRef: string | null
    status: ExportOrderStatus
  } | null
  exportedAt: string | null
  createdAt: string
  notes: string | null
  dienGiai: string | null
  customer: {
    id: string
    code: string
    name: string
  } | null
  sourceLocation: {
    id: string
    code: string
    name: string
  } | null
  creator: {
    id: string
    fullName: string
  }
  items: Array<{
    id: string
    quantityBase: number
    quantityDisplay: number
    unitUsed: string
    product: {
      id: string
      code: string
      name: string
    }
    batch: {
      id: string
      lotNo: string
      expiryDate: string | null
    } | null
  }>
  purchaseRequests: Array<{
    id: string
    requestRef: string
    status: string
    expectedDate: string | null
    submittedAt: string | null
    approvedAt: string | null
    notes: string | null
    supplier: { id: string; name: string } | null
    items: Array<{
      id: string
      quantityNeededBase: number
      receivedQtyBase: number
      unitDisplay: string
      quantityDisplay: number
      unitPrice: number
      product: { id: string; code: string; name: string }
    }>
  }>
}

export async function fetchInventoryStock(productId?: string, locationId?: string, asOfDate?: string): Promise<InventoryStockBatch[]> {
  const params = new URLSearchParams()
  if (productId) params.set('productId', productId)
  if (locationId) params.set('locationId', locationId)
  if (asOfDate) params.set('asOfDate', asOfDate)
  const query = params.toString() ? `?${params.toString()}` : ''
  return http<InventoryStockBatch[]>(`/api/inventory/stock${query}`)
}

export async function fetchFefoSuggestions(productId: string, limit = 5, locationId?: string, asOfDate?: string): Promise<InventoryStockBatch[]> {
  const params = new URLSearchParams({ productId, limit: String(limit) })
  if (locationId) params.set('locationId', locationId)
  if (asOfDate) params.set('asOfDate', asOfDate)
  return http<InventoryStockBatch[]>(`/api/inventory/fefo-suggestions?${params.toString()}`)
}

export async function createExportOrder(payload: CreateExportOrderPayload): Promise<CreateExportOrderResponse> {
  return http<CreateExportOrderResponse>('/api/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateExportOrder(orderId: string, payload: CreateExportOrderPayload): Promise<CreateExportOrderResponse> {
  return http<CreateExportOrderResponse>(`/api/sales/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchExportOrders(params?: {
  page?: number
  limit?: number
  customerId?: string
  status?: ExportOrderStatus | 'all'
  q?: string
  sortBy?: ExportOrderSortBy
  sortDir?: SortDir
}): Promise<ExportOrderListResponse> {
  const query = new URLSearchParams()
  query.set('page', String(params?.page ?? 1))
  query.set('limit', String(params?.limit ?? 10))
  query.set('sortBy', params?.sortBy ?? 'createdAt')
  query.set('sortDir', params?.sortDir ?? 'desc')
  if (params?.customerId) query.set('customerId', params.customerId)
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.q?.trim()) query.set('q', params.q.trim())
  return http<ExportOrderListResponse>(`/api/sales?${query.toString()}`)
}

export async function fetchExportOrderDetail(orderId: string): Promise<ExportOrderDetail> {
  return http<ExportOrderDetail>(`/api/sales/${encodeURIComponent(orderId)}`)
}

export async function fulfilExportOrder(orderId: string): Promise<ExportOrderDetail> {
  return http<ExportOrderDetail>(`/api/sales/${encodeURIComponent(orderId)}/fulfil`, {
    method: 'PATCH',
  })
}

export async function cancelExportOrder(orderId: string): Promise<ExportOrderDetail> {
  return http<ExportOrderDetail>(`/api/sales/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
  })
}

export async function createExportVoidRerelease(orderId: string): Promise<CreateExportOrderResponse> {
  return http<CreateExportOrderResponse>(`/api/sales/${encodeURIComponent(orderId)}/void-rerelease`, {
    method: 'POST',
  })
}

export type ExportOrderHistoryRow = {
  id: string
  actionType: string
  actionLabel: string
  actorName: string
  createdAt: string
  data: Record<string, unknown> | null
}

export async function fetchExportOrderHistory(orderId: string): Promise<ExportOrderHistoryRow[]> {
  return http<ExportOrderHistoryRow[]>(`/api/sales/${encodeURIComponent(orderId)}/history`)
}
