import { apiFetch } from './api'

const http = apiFetch

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductionOrderStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

export type ProductOutputType = 'finished' | 'semi_finished'

export type ProductOutput = {
  id: string
  code: string
  name: string
  outputType: ProductOutputType
  unit: string
  notes: string | null
}

export type ProductionOrderListRow = {
  id: string
  orderRef: string | null
  issuedAt: string
  skuProductId: string | null
  skuCode: string | null
  skuName: string | null
  productType: string | null
  outputProductId: string | null
  outputProduct: { id: string; code: string; name: string; outputType: ProductOutputType; unit: string } | null
  currentStep: number
  status: ProductionOrderStatus
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  creator: { id: string; fullName: string }
  skuProduct: { id: string; code: string; name: string } | null
}

export type ProductionOrderListItem = ProductionOrderListRow & {
  lines?: Array<{
    step: number
    plannedQty: number
    actualQty: number
    lotNo: string | null
    expiryDate: string | null
    unit: string
  }>
}

export type ProductionOrderListResponse = {
  data: ProductionOrderListItem[]
  total: number
  page: number
  limit: number
}

export type ProductionOrderLine = {
  id: string
  orderId: string
  step: number
  direction: 'in' | 'out'
  productId: string | null
  outputProductId: string | null
  productCode: string
  productName: string
  lotNo: string | null
  expiryDate: string | null
  plannedQty: number
  actualQty: number
  wasteQty: number
  unit: string
  locationId: string | null
  qualityStatus: 'pass' | 'fail' | 'pending' | null
  notes: string | null
  createdAt: string
  updatedAt: string
  location: { id: string; code: string; name: string } | null
  product:  { id: string; code: string; name: string; productClassification: { code: string; name: string } | null } | null
  outputProduct: { id: string; code: string; name: string; outputType: ProductOutputType; unit: string } | null
}

export type ProductionOrderLog = {
  id: string
  orderId: string
  userId: string | null
  userName: string | null
  action: string
  logType: string
  createdAt: string
  user: { id: string; fullName: string } | null
}

export type ProductionOrderDetail = ProductionOrderListRow & {
  lines: ProductionOrderLine[]
  logs:  ProductionOrderLog[]
  nvlExportedAt: string | null
  step1ProcessedAt: string | null
  step2ProcessedAt: string | null
  step3ProcessedAt: string | null
  step4ProcessedAt: string | null
}

export type LinePayload = {
  productId?: string | null
  outputProductId?: string | null
  productCode: string
  productName: string
  lotNo?: string | null
  expiryDate?: string | null
  plannedQty: number
  actualQty: number
  wasteQty: number
  unit: string
  locationId?: string | null
  qualityStatus?: 'pass' | 'fail' | 'pending' | null
  direction: 'in' | 'out'
  notes?: string | null
}

// ─── List & single ────────────────────────────────────────────────────────────

export async function fetchProductionOrders(params?: {
  status?: ProductionOrderStatus | 'all'
  q?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}): Promise<ProductionOrderListResponse> {
  const query = new URLSearchParams()
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.q) query.set('q', params.q)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.sortBy) query.set('sortBy', params.sortBy)
  if (params?.sortDir) query.set('sortDir', params.sortDir)
  const qs = query.toString()
  return http<ProductionOrderListResponse>(`/api/production-orders${qs ? `?${qs}` : ''}`)
}

export async function fetchProductionOrderDetail(id: string): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}`)
}

/** @deprecated Use fetchProductionOrderDetail */
export async function fetchProductionOrder(id: string): Promise<ProductionOrderListRow> {
  return http<ProductionOrderListRow>(`/api/production-orders/${id}`)
}

export async function createProductionOrder(data: {
  orderRef?: string | null
  issuedAt?: string
  skuProductId?: string | null
  skuCode?: string | null
  skuName?: string | null
  productType?: string | null
  outputProductId?: string | null
  notes?: string | null
}): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>('/api/production-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProductionOrderHeader(
  id: string,
  data: {
    orderRef?: string | null
    issuedAt?: string
    skuProductId?: string | null
    skuCode?: string | null
    skuName?: string | null
    productType?: string | null
    outputProductId?: string | null
    notes?: string | null
  },
): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateProductionOrderStatus(
  id: string,
  status: ProductionOrderStatus,
): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function advanceProductionStep(id: string): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}/step`, {
    method: 'PATCH',
  })
}

export async function completeProductionOrder(id: string): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}/complete`, {
    method: 'PATCH',
  })
}

export async function confirmNvlExport(id: string): Promise<ProductionOrderDetail> {
  return http<ProductionOrderDetail>(`/api/production-orders/${id}/confirm-nvl-export`, {
    method: 'POST',
  })
}

// ─── Lines ────────────────────────────────────────────────────────────────────

export async function fetchProductionOrderLines(
  id: string,
  step?: number,
): Promise<ProductionOrderLine[]> {
  const qs = step ? `?step=${step}` : ''
  return http<ProductionOrderLine[]>(`/api/production-orders/${id}/lines${qs}`)
}

export async function upsertProductionOrderLines(
  id: string,
  step: number,
  lines: LinePayload[],
  processedAt?: string | null,
): Promise<ProductionOrderLine[]> {
  return http<ProductionOrderLine[]>(`/api/production-orders/${id}/lines/${step}`, {
    method: 'PUT',
    body: JSON.stringify({ lines, processedAt: processedAt ?? null }),
  })
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function fetchProductionOrderLogs(id: string, step?: number): Promise<ProductionOrderLog[]> {
  const qs = step !== undefined ? `?step=${step}` : ''
  return http<ProductionOrderLog[]>(`/api/production-orders/${id}/logs${qs}`)
}

// ─── Product Outputs catalog ──────────────────────────────────────────────────

export async function fetchProductOutputs(params?: {
  q?: string
  outputType?: ProductOutputType | 'all'
}): Promise<ProductOutput[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.outputType && params.outputType !== 'all') query.set('outputType', params.outputType)
  const qs = query.toString()
  return http<ProductOutput[]>(`/api/catalog/products-outputs${qs ? `?${qs}` : ''}`)
}
