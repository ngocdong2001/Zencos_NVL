import { apiFetch } from './api'

const http = apiFetch

export type TpStockLot = {
  outputProductId: string
  batchLotNo: string | null
  batchExpiryDate: string | null
  warehouseLocationId: string | null
  availableQty: number
  product: {
    id: string
    code: string
    name: string
    unit: string
    outputType: 'finished' | 'semi_finished'
  } | null
}

export type CreateTpExportOrderPayload = {
  orderRef?: string
  customerId?: string
  sourceLocationId?: string
  exportedAt?: string
  notes?: string
  dienGiai?: string
  items: Array<{
    outputProductId: string
    lotNo?: string | null
    expiryDate?: string | null
    warehouseLocationId?: string | null
    quantityBase: number
    unitUsed: string
    quantityDisplay: number
  }>
}

export type CreateTpExportOrderResponse = {
  id: string
  orderRef: string | null
}

export type TpExportOrderStatus = 'pending' | 'fulfilled' | 'cancelled'
export type TpExportSortBy = 'createdAt' | 'status' | 'orderRef' | 'exportedAt'
export type SortDir = 'asc' | 'desc'

export type TpExportOrderListRow = {
  id: string
  orderRef: string | null
  status: TpExportOrderStatus
  sourceOrderId?: string | null
  adjustedByOrderId?: string | null
  exportedAt: string | null
  createdAt: string
  dienGiai?: string | null
  customer: { id: string; name: string } | null
  sourceLocation: { id: string; code: string; name: string } | null
  items: Array<{
    id: string
    outputProductId: string
    lotNo: string | null
    expiryDate: string | null
    quantityBase: number
    unitUsed: string
    outputProduct: {
      id: string
      code: string
      name: string
      unit: string
      outputType: string
    }
  }>
}

export type TpExportOrderListResponse = {
  data: TpExportOrderListRow[]
  total: number
  page: number
  limit: number
}

export type TpExportOrderDetail = {
  id: string
  orderRef: string | null
  status: TpExportOrderStatus
  sourceOrder: { id: string; orderRef: string | null; status: TpExportOrderStatus } | null
  adjustedByOrder: { id: string; orderRef: string | null; status: TpExportOrderStatus } | null
  exportedAt: string | null
  createdAt: string
  notes: string | null
  dienGiai: string | null
  customer: { id: string; code: string; name: string } | null
  sourceLocation: { id: string; code: string; name: string } | null
  creator: { id: string; fullName: string }
  items: Array<{
    id: string
    outputProductId: string
    lotNo: string | null
    expiryDate: string | null
    warehouseLocationId: string | null
    quantityBase: number
    quantityDisplay: number
    unitUsed: string
    outputProduct: {
      id: string
      code: string
      name: string
      unit: string
      outputType: string
    }
  }>
}

export type TpExportHistoryRow = {
  id: string
  actionType: string
  actionLabel: string
  actorName: string
  createdAt: string
  data: Record<string, unknown> | null
}

// ─── Stock API ─────────────────────────────────────────────────────────────────

export async function fetchTpStock(outputProductId?: string): Promise<TpStockLot[]> {
  const query = outputProductId ? `?outputProductId=${encodeURIComponent(outputProductId)}` : ''
  return http<TpStockLot[]>(`/api/tp-sales/tp-stock${query}`)
}

export async function fetchTpFefoSuggestions(outputProductId: string, limit = 5): Promise<TpStockLot[]> {
  const query = `?outputProductId=${encodeURIComponent(outputProductId)}&limit=${encodeURIComponent(String(limit))}`
  return http<TpStockLot[]>(`/api/tp-sales/tp-fefo${query}`)
}

// ─── Order CRUD ────────────────────────────────────────────────────────────────

export async function fetchTpExportOrders(params?: {
  page?: number
  limit?: number
  customerId?: string
  status?: TpExportOrderStatus | 'all'
  q?: string
  sortBy?: TpExportSortBy
  sortDir?: SortDir
}): Promise<TpExportOrderListResponse> {
  const query = new URLSearchParams()
  query.set('page', String(params?.page ?? 1))
  query.set('limit', String(params?.limit ?? 10))
  query.set('sortBy', params?.sortBy ?? 'createdAt')
  query.set('sortDir', params?.sortDir ?? 'desc')
  if (params?.customerId) query.set('customerId', params.customerId)
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.q?.trim()) query.set('q', params.q.trim())
  return http<TpExportOrderListResponse>(`/api/tp-sales?${query.toString()}`)
}

export async function fetchTpExportOrderDetail(orderId: string): Promise<TpExportOrderDetail> {
  return http<TpExportOrderDetail>(`/api/tp-sales/${encodeURIComponent(orderId)}`)
}

export async function createTpExportOrder(payload: CreateTpExportOrderPayload): Promise<CreateTpExportOrderResponse> {
  return http<CreateTpExportOrderResponse>('/api/tp-sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTpExportOrder(orderId: string, payload: CreateTpExportOrderPayload): Promise<CreateTpExportOrderResponse> {
  return http<CreateTpExportOrderResponse>(`/api/tp-sales/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fulfilTpExportOrder(orderId: string): Promise<TpExportOrderDetail> {
  return http<TpExportOrderDetail>(`/api/tp-sales/${encodeURIComponent(orderId)}/fulfil`, { method: 'PATCH' })
}

export async function cancelTpExportOrder(orderId: string): Promise<TpExportOrderDetail> {
  return http<TpExportOrderDetail>(`/api/tp-sales/${encodeURIComponent(orderId)}/cancel`, { method: 'PATCH' })
}

export async function createTpVoidRerelease(orderId: string): Promise<CreateTpExportOrderResponse> {
  return http<CreateTpExportOrderResponse>(`/api/tp-sales/${encodeURIComponent(orderId)}/void-rerelease`, { method: 'POST' })
}

export async function fetchTpExportHistory(orderId: string): Promise<TpExportHistoryRow[]> {
  return http<TpExportHistoryRow[]>(`/api/tp-sales/${encodeURIComponent(orderId)}/history`)
}
