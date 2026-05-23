import { apiFetch } from './api'

const http = apiFetch

export type StockTransferItem = {
  id: string
  transferId: string
  productId: string
  code: string
  inciName: string
  tradeName: string
  unit: string
  quantity: number
  status: 'pending' | 'received' | 'cancelled'
}

export type StockTransfer = {
  id: string
  transferNumber: string
  fromWarehouseId: string
  fromWarehouseCode: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseCode: string
  toWarehouseName: string
  createdBy: string
  createdAt: string
  expectedRecipient: string
  reason: string
  transportMethod: string
  status: 'draft' | 'confirmed' | 'in_transit' | 'received' | 'cancelled'
  items: StockTransferItem[]
}

export type CreateStockTransferPayload = {
  fromWarehouseId: string
  toWarehouseId: string
  expectedRecipient: string
  reason: string
  transportMethod: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export type UpdateStockTransferPayload = Partial<CreateStockTransferPayload>

export async function fetchStockTransfers(
  page = 1,
  pageSize = 10,
  filters?: {
    search?: string
    fromWarehouseId?: string
    toWarehouseId?: string
    status?: string
    dateFrom?: Date | null
    dateTo?: Date | null
  }
): Promise<{ items: StockTransfer[]; total: number }> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('pageSize', pageSize.toString())

  if (filters?.search) params.set('search', filters.search)
  if (filters?.fromWarehouseId) params.set('fromWarehouseId', filters.fromWarehouseId)
  if (filters?.toWarehouseId) params.set('toWarehouseId', filters.toWarehouseId)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString())
  if (filters?.dateTo) params.set('dateTo', filters.dateTo.toISOString())

  return http(`/stock-transfers?${params}`, { method: 'GET' })
}

export async function getStockTransfer(id: string): Promise<StockTransfer> {
  return http(`/stock-transfers/${id}`, { method: 'GET' })
}

export async function createStockTransfer(payload: CreateStockTransferPayload): Promise<StockTransfer> {
  return http('/stock-transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateStockTransfer(id: string, payload: UpdateStockTransferPayload): Promise<StockTransfer> {
  return http(`/stock-transfers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function confirmStockTransfer(id: string): Promise<StockTransfer> {
  return http(`/stock-transfers/${id}/confirm`, {
    method: 'POST',
  })
}

export async function cancelStockTransfer(id: string): Promise<StockTransfer> {
  return http(`/stock-transfers/${id}/cancel`, {
    method: 'POST',
  })
}
