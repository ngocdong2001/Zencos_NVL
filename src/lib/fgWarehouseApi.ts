import { apiFetch } from './api'

const http = apiFetch

export type FgLotDetail = {
  id: string
  lotNo: string
  expiryDate: string | null
  manufactureDate: string | null
  receivedAt: string | null
  productionOrderId: string | null
  orderRef: string | null
  quantityBase: number
  status: 'near_expiration' | 'monitoring' | 'normal'
}

export type FgInventoryItem = {
  id: string
  code: string
  name: string
  unit: string
  outputType: string
  openingQuantity: number
  importQuantity: number
  exportQuantity: number
  stockQuantity: number
  value: number
}

export type FgInventorySummary = {
  totalProducts: number
  nearExpirationCount: number
  totalInventoryValue: number
}

export type FgItemTransaction = {
  id: string
  type: string
  quantityBase: number
  transactionDate: string
  userName: string
  lotNo: string
  orderRef: string | null
  notes: string
}

export type FgMonthlyStats = {
  month: string
  importQty: number
  exportQty: number
}

export type FgInventoryItemDetail = {
  id: string
  code: string
  name: string
  unit: string
  outputType: string
  stockQuantity: number
  lots: FgLotDetail[]
  transactions: FgItemTransaction[]
  monthlyStats: FgMonthlyStats[]
}

export type FgWarehouseData = {
  summary: FgInventorySummary
  items: FgInventoryItem[]
  total: number
}

export async function fetchFgProductLots(productId: string, signal?: AbortSignal): Promise<FgLotDetail[]> {
  return http<FgLotDetail[]>(`/api/fg-warehouse/items/${productId}/lots`, signal ? { signal } : undefined)
}

export async function fetchFgInventoryItemDetail(id: string): Promise<FgInventoryItemDetail> {
  return http<FgInventoryItemDetail>(`/api/fg-warehouse/items/${id}`)
}

export async function fetchFgWarehouseData(
  q = '',
  page = 1,
  limit = 10,
  dateFrom: Date | null = null,
  dateTo: Date | null = null,
): Promise<FgWarehouseData> {
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (dateFrom) params.set('dateFrom', toLocalDateStr(dateFrom))
  if (dateTo)   params.set('dateTo',   toLocalDateStr(dateTo))

  return http<FgWarehouseData>(`/api/fg-warehouse?${params.toString()}`)
}
