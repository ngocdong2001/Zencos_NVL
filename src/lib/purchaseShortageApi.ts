const API_BASE_URL = 'http://localhost:4000'

const TOKEN_STORAGE_KEYS = ['auth.token', 'token', 'accessToken']

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  for (const key of TOKEN_STORAGE_KEYS) {
    const local = window.localStorage.getItem(key)
    if (local?.trim()) return local.trim()

    const session = window.sessionStorage.getItem(key)
    if (session?.trim()) return session.trim()
  }

  return null
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const json = JSON.parse(text) as { error?: string; message?: string }
      message = json.error ?? json.message ?? text
    } catch {
      // keep raw text
    }
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export type ShortageStatus = 'critical' | 'warning' | 'stable'

export type PurchaseShortageRow = {
  id: string
  code: string
  materialName: string
  stockCurrent: number
  stockMin: number
  stockShort: number
  unit: string
  status: ShortageStatus
  updatedAt: string
}

export type PurchaseShortageResponse = {
  data: PurchaseShortageRow[]
  total: number
  page: number
  limit: number
  summary: {
    critical: number
    warning: number
    stable: number
  }
}

export type CreatePurchaseRequestPayload = {
  requestRef: string
  supplierId?: string
  receivingLocationId?: string
  expectedDate?: string
  notes?: string
  items: Array<{
    productId: string
    quantityNeededBase: number
    unitDisplay: string
    quantityDisplay: number
    unitPrice: number
    notes?: string
  }>
}

export type PurchaseRequestItemResponse = {
  id: string
  productId: string
  quantityNeededBase: number
  unitDisplay: string
  quantityDisplay: number
  unitPrice?: number
  notes?: string | null
}

export type CreatePurchaseRequestResponse = {
  id: string
  requestRef: string
  status: string
  expectedDate?: string | null
  notes?: string | null
  items: PurchaseRequestItemResponse[]
}

export type PurchaseRequestDetailResponse = {
  id: string
  requestRef: string
  status: PurchaseRequestStatus
  expectedDate?: string | null
  notes?: string | null
  totalAmount?: number
  supplier?: {
    id: string
    code: string
    name: string
  } | null
  receivingLocation?: {
    id: string
    code: string
    name: string
  } | null
  requester?: {
    id: string
    fullName: string
  } | null
  items: Array<PurchaseRequestItemResponse & {
    product: {
      id: string
      code: string
      name: string
      orderUnitRef?: {
        id: string
        unitName: string
        unitCodeName?: string | null
        conversionToBase: number
      } | null
    }
  }>
}

export type PurchaseRequestHistoryEvent = {
  id: string
  actionType: 'created' | 'updated' | 'submitted' | 'approved' | 'ordered' | 'received' | 'cancelled'
  action: string
  actorName: string
  actorId: string | null
  at: string
}

export type PurchaseRequestHistoryResponse = {
  data: PurchaseRequestHistoryEvent[]
}

export type PurchaseRequestInboundDrilldownResponse = {
  id: string
  requestRef: string
  status: PurchaseRequestStatus
  expectedDate?: string | null
  orderedAt?: string | null
  receivedAt?: string | null
  supplier?: {
    id: string
    code: string
    name: string
  } | null
  receivingLocation?: {
    id: string
    code: string
    name: string
  } | null
  requester?: {
    id: string
    fullName: string
  } | null
  summary: {
    lineCount: number
    receiptCount: number
    orderedQtyBaseTotal: number
    receivedQtyBaseTotal: number
    remainingQtyBaseTotal: number
  }
  poItems: Array<{
    id: string
    product: {
      id: string
      code: string
      name: string
    }
    quantityNeededBase: number
    receivedQtyBase: number
    unitDisplay: string
    quantityDisplay: number
    unitPrice: number
    notes?: string | null
  }>
  receipts: Array<{
    id: string
    receiptRef: string
    status: 'draft' | 'pending_qc' | 'posted' | 'cancelled'
    currentStep: number
    createdAt: string
    expectedDate?: string | null
    receivedAt?: string | null
    qcCheckedAt?: string | null
    sourceReceipt?: {
      id: string
      receiptRef: string
    } | null
    adjustedByReceipt?: {
      id: string
      receiptRef: string
    } | null
    supplier?: {
      id: string
      code: string
      name: string
    } | null
    receivingLocation?: {
      id: string
      code: string
      name: string
    } | null
    creator?: {
      id: string
      fullName: string
    } | null
    poster?: {
      id: string
      fullName: string
    } | null
    summary: {
      itemCount: number
      quantityBaseTotal: number
      totalAmount: number
    }
    items: Array<{
      id: string
      purchaseRequestItemId: string | null
      product: {
        id: string
        code: string
        name: string
      }
      lotNo: string
      quantityBase: number
      quantityDisplay: number
      unitUsed: string
      unitPricePerKg: number
      lineAmount: number
      qcStatus: 'pending' | 'passed' | 'failed'
      invoiceNumber?: string | null
      invoiceDate?: string | null
      manufactureDate?: string | null
      expiryDate?: string | null
      hasDocument: boolean
      documents: Array<{
        id: string
        docType: 'Invoice' | 'COA' | 'MSDS' | 'Other'
        originalName: string
        createdAt: string
      }>
    }>
  }>
}

export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export type PurchaseRequestRowResponse = {
  id: string
  requestRef: string
  createdAt: string
  status: PurchaseRequestStatus
  expectedDate?: string | null
  totalAmount?: number
  supplier?: {
    id: string
    code: string
    name: string
  } | null
  receivingLocation?: {
    id: string
    code: string
    name: string
  } | null
  requester?: {
    id: string
    fullName: string
  } | null
  items: PurchaseRequestItemResponse[]
}

export type PurchaseRequestListResponse = {
  data: PurchaseRequestRowResponse[]
  total: number
  page: number
  limit: number
}

export async function fetchPurchaseShortages(params: {
  q?: string
  status?: 'all' | ShortageStatus
  page?: number
  limit?: number
}): Promise<PurchaseShortageResponse> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const suffix = query.toString()
  return http<PurchaseShortageResponse>(`/api/reports/shortages${suffix ? `?${suffix}` : ''}`)
}

export async function createPurchaseRequest(
  payload: CreatePurchaseRequestPayload,
): Promise<CreatePurchaseRequestResponse> {
  return http<CreatePurchaseRequestResponse>('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePurchaseRequestDraft(
  id: string,
  payload: CreatePurchaseRequestPayload,
): Promise<CreatePurchaseRequestResponse> {
  return http<CreatePurchaseRequestResponse>(`/api/purchases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function submitPurchaseRequest(id: string): Promise<CreatePurchaseRequestResponse> {
  return http<CreatePurchaseRequestResponse>(`/api/purchases/${id}/submit`, {
    method: 'PATCH',
  })
}

export async function recallPurchaseRequest(id: string): Promise<CreatePurchaseRequestResponse> {
  return http<CreatePurchaseRequestResponse>(`/api/purchases/${id}/recall`, {
    method: 'PATCH',
  })
}

export async function fetchPurchaseRequestDetail(id: string): Promise<PurchaseRequestDetailResponse> {
  return http<PurchaseRequestDetailResponse>(`/api/purchases/${id}`)
}

export async function fetchPurchaseRequestHistory(id: string): Promise<PurchaseRequestHistoryResponse> {
  return http<PurchaseRequestHistoryResponse>(`/api/purchases/${id}/history`)
}

export async function fetchPurchaseRequestInboundDrilldown(id: string): Promise<PurchaseRequestInboundDrilldownResponse> {
  return http<PurchaseRequestInboundDrilldownResponse>(`/api/purchases/${id}/inbound-drilldown`)
}

export async function recalculatePurchaseRequestReceived(id: string): Promise<{ success: boolean; message: string }> {
  return http<{ success: boolean; message: string }>(`/api/purchases/${id}/recalculate-received`, { method: 'POST' })
}

export async function fetchPurchaseRequests(params?: {
  page?: number
  limit?: number
  status?: PurchaseRequestStatus
  supplierId?: string
  fromDate?: string
  toDate?: string
}): Promise<PurchaseRequestListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.status) query.set('status', params.status)
  if (params?.supplierId) query.set('supplierId', params.supplierId)
  if (params?.fromDate) query.set('fromDate', params.fromDate)
  if (params?.toDate) query.set('toDate', params.toDate)

  const suffix = query.toString()
  return http<PurchaseRequestListResponse>(`/api/purchases${suffix ? `?${suffix}` : ''}`)
}

export async function deletePurchaseRequest(id: string): Promise<void> {
  await http<void>(`/api/purchases/${id}`, {
    method: 'DELETE',
  })
}
