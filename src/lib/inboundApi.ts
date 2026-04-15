const API_BASE_URL = 'http://localhost:4000'

const INBOUND_RECEIPT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,119}$/

export type InboundReceiptStatusApi = 'draft' | 'pending_qc' | 'posted' | 'cancelled'

export type InboundReceiptRowResponse = {
  id: string
  receiptRef: string
  status: InboundReceiptStatusApi
  currentStep: 1 | 2 | 3 | 4
  sourceReceiptId: string | null
  adjustedByReceiptId: string | null
  supplierName: string
  supplierCode: string | null
  materialName: string
  lotNo: string
  lotCount: number
  quantityBaseTotal: number
  totalValue: number
  assigneeName: string
  expectedDate: string | null
  qcCheckedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type InboundReceiptListResponse = {
  data: InboundReceiptRowResponse[]
  total: number
  page: number
  limit: number
}

export type InboundReceiptDetailResponse = {
  id: string
  receiptRef: string
  status: InboundReceiptStatusApi
  currentStep: 1 | 2 | 3 | 4
  sourceReceipt: {
    id: string
    receiptRef: string
    status: InboundReceiptStatusApi
  } | null
  adjustedByReceipt: {
    id: string
    receiptRef: string
    status: InboundReceiptStatusApi
  } | null
  expectedDate: string | null
  receivedAt: string | null
  qcCheckedAt: string | null
  createdAt: string
  updatedAt: string
  purchaseRequest: {
    id: string
    requestRef: string
  } | null
  supplier: {
    id: string
    code: string
    name: string
  } | null
  receivingLocation: {
    id: string
    code: string
    name: string
  } | null
  creator: {
    id: string
    fullName: string
  }
  poster: {
    id: string
    fullName: string
  } | null
  items: Array<{
    id: string
    product: {
      id: string
      code: string
      name: string
      orderUnitRef?: {
        unitName: string
        conversionToBase: number
      } | null
    }
    lotNo: string
    invoiceNumber: string | null
    invoiceDate: string | null
    manufactureDate: string | null
    expiryDate: string | null
    quantityBase: number
    unitUsed: string
    quantityDisplay: number
    unitPricePerKg: number
    lineAmount: number
    qcStatus: 'pending' | 'passed' | 'failed'
    hasDocument: boolean
    documents: Array<{
      id: string
      docType: 'Invoice' | 'COA' | 'MSDS' | 'Other'
      originalName: string
      mimeType: string
      fileSize: number
      createdAt: string
    }>
  }>
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const json = JSON.parse(text) as { message?: string; error?: string }
      message = json.message ?? json.error ?? text
    } catch {
      // keep raw response text
    }
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function validateInboundReceiptRefFormat(receiptRef: string): string | null {
  const trimmed = receiptRef.trim()
  if (!trimmed) return 'Vui lòng nhập mã tham chiếu phiếu.'
  if (!INBOUND_RECEIPT_REF_PATTERN.test(trimmed)) {
    return 'Mã tham chiếu chỉ được chứa chữ, số, gạch nối hoặc gạch dưới, tối thiểu 3 ký tự.'
  }
  return null
}

export async function validateInboundReceiptRefUniqueness(receiptRef: string, currentReceiptId?: string): Promise<string | null> {
  const trimmed = receiptRef.trim()
  if (!trimmed) return 'Vui lòng nhập mã tham chiếu phiếu.'

  const response = await fetchInboundReceipts({ page: 1, limit: 50, q: trimmed })
  const duplicate = response.data.find((row) => row.receiptRef.trim().toLowerCase() === trimmed.toLowerCase() && row.id !== currentReceiptId)
  return duplicate ? 'Mã phiếu nhập đã tồn tại.' : null
}

export async function fetchInboundReceipts(params?: {
  page?: number
  limit?: number
  status?: InboundReceiptStatusApi | 'all'
  fromDate?: string
  toDate?: string
  q?: string
}): Promise<InboundReceiptListResponse> {
  const query = new URLSearchParams()

  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.fromDate) query.set('fromDate', params.fromDate)
  if (params?.toDate) query.set('toDate', params.toDate)
  if (params?.q?.trim()) query.set('q', params.q.trim())

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return http<InboundReceiptListResponse>(`/api/inbound/receipts${suffix}`)
}

export function fetchInboundReceiptDetail(id: string): Promise<InboundReceiptDetailResponse> {
  return http<InboundReceiptDetailResponse>(`/api/inbound/receipts/${encodeURIComponent(id)}`)
}

export type InboundReceiptHistoryRowResponse = {
  id: string
  actionType: string
  actionLabel: string
  actorName: string
  createdAt: string
  data: Record<string, unknown> | null
}

export function fetchInboundReceiptHistory(id: string): Promise<InboundReceiptHistoryRowResponse[]> {
  return http<InboundReceiptHistoryRowResponse[]>(`/api/inbound/receipts/${encodeURIComponent(id)}/history`)
}

export type SaveDraftPayload = {
  receiptRef: string
  purchaseRequestRef?: string
  supplierName?: string
  receivingLocationId?: string
  expectedDate?: string
  currentStep?: 1 | 2 | 3 | 4
  item?: {
    productId: string
    lotNo: string
    quantityBase: number
    quantityDisplay: number
    unitUsed: string
    unitPricePerKg?: number
    lineAmount?: number
    invoiceNumber?: string
    invoiceDate?: string
    manufactureDate?: string
    expiryDate?: string
  }
}

export type SaveDraftResponse = {
  id: string
  receiptRef: string
  currentStep: 1 | 2 | 3 | 4
}

export function createDraftReceipt(payload: SaveDraftPayload): Promise<SaveDraftResponse> {
  return http<SaveDraftResponse>('/api/inbound/receipts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDraftReceipt(id: string, payload: SaveDraftPayload): Promise<SaveDraftResponse> {
  return http<SaveDraftResponse>(`/api/inbound/receipts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteDraftReceipt(id: string): Promise<void> {
  return http<void>(`/api/inbound/receipts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export type SubmitInboundQcPayload = {
  items: Array<{
    itemId: string
    qcStatus: 'pending' | 'passed' | 'failed'
  }>
}

export type SubmitInboundQcResponse = {
  id: string
  status: InboundReceiptStatusApi
  qcCheckedAt: string
}

export function submitInboundReceiptQc(id: string, payload: SubmitInboundQcPayload): Promise<SubmitInboundQcResponse> {
  return http<SubmitInboundQcResponse>(`/api/inbound/receipts/${encodeURIComponent(id)}/qc`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export type PostInboundReceiptResponse = {
  id: string
  status: InboundReceiptStatusApi
  receivedAt: string
}

export function postInboundReceipt(id: string): Promise<PostInboundReceiptResponse> {
  return http<PostInboundReceiptResponse>(`/api/inbound/receipts/${encodeURIComponent(id)}/post`, {
    method: 'POST',
  })
}

export type CreateInboundVoidRereceiveResponse = {
  id: string
  receiptRef: string
  currentStep: 1 | 2 | 3 | 4
  sourceReceiptId: string
}

export function createInboundVoidRereceive(id: string): Promise<CreateInboundVoidRereceiveResponse> {
  return http<CreateInboundVoidRereceiveResponse>(`/api/inbound/receipts/${encodeURIComponent(id)}/void-rereceive`, {
    method: 'POST',
  })
}
