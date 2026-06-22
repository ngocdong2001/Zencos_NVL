import { apiFetch } from './api'

const http = apiFetch

/* ── List response types ── */

export type CustomerMaterialInboundReceiptRowResponse = {
  id: string
  receiptRef: string
  status: 'draft' | 'pending_qc' | 'posted' | 'cancelled'
  customerId: string | null
  customerName: string
  customerCode: string | null
  receivingLocationName: string | null
  receivedAt: string | null
  createdAt: string
  assigneeName: string
  itemCount: number
  totalQtyBase: number
  materialName: string
}

export type CustomerMaterialInboundListResponse = {
  data: CustomerMaterialInboundReceiptRowResponse[]
  total: number
  page: number
  limit: number
}

export async function fetchCustomerMaterialInboundReceipts(params?: {
  page?: number
  limit?: number
  status?: string
  q?: string
}): Promise<CustomerMaterialInboundListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.q?.trim()) query.set('q', params.q.trim())
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return http<CustomerMaterialInboundListResponse>(`/api/customer-material-inbound/receipts${suffix}`)
}

/* ── Create payload types ── */

export type CustomerMaterialInboundItemPayload = {
  productId: string
  lotNo: string
  manufacturerLotNo?: string
  invoiceNumber?: string
  invoiceDate?: string
  manufactureDate?: string
  expiryDate?: string
  quantityBase: number
  quantityDisplay: number
  unitUsed: string
  unitPricePerKg?: number
  manufacturerId?: string
}

export type CreateCustomerMaterialInboundPayload = {
  receiptRef?: string
  customerId: string
  receivingLocationId: string
  receivedAt?: string
  dienGiai?: string
  notes?: string
  status?: 'draft' | 'posted'
  items: CustomerMaterialInboundItemPayload[]
}

export type CustomerMaterialInboundReceiptResponse = {
  id: string
  receiptRef: string
}

export async function createCustomerMaterialInboundReceipt(
  payload: CreateCustomerMaterialInboundPayload,
): Promise<CustomerMaterialInboundReceiptResponse> {
  return http<CustomerMaterialInboundReceiptResponse>('/api/customer-material-inbound/receipts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* ── Detail types ── */

export type CustomerMaterialInboundReceiptItem = {
  id: string
  productId: string
  productCode: string
  productName: string
  lotNo: string
  manufacturerLotNo: string | null
  manufactureDate: string | null
  expiryDate: string | null
  quantityBase: number
  unitUsed: string
}

export type CustomerMaterialInboundReceiptDetail = {
  id: string
  receiptRef: string
  status: 'draft' | 'pending_qc' | 'posted' | 'cancelled'
  customerId: string
  customerName: string
  customerCode: string | null
  receivingLocationId: string
  receivingLocationName: string
  receivedAt: string
  dienGiai: string | null
  items: CustomerMaterialInboundReceiptItem[]
  createdAt: string
  createdBy: string
}

export async function fetchCustomerMaterialInboundReceiptDetail(
  receiptId: string,
): Promise<CustomerMaterialInboundReceiptDetail> {
  return http<CustomerMaterialInboundReceiptDetail>(`/api/customer-material-inbound/receipts/${receiptId}`)
}

export async function updateCustomerMaterialInboundReceipt(
  receiptId: string,
  payload: CreateCustomerMaterialInboundPayload,
): Promise<CustomerMaterialInboundReceiptResponse> {
  return http<CustomerMaterialInboundReceiptResponse>(`/api/customer-material-inbound/receipts/${receiptId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function revertCustomerMaterialInboundToDraft(
  receiptId: string,
): Promise<{ success: boolean; message: string }> {
  return http<{ success: boolean; message: string }>(
    `/api/customer-material-inbound/receipts/${receiptId}/revert-to-draft`,
    {
      method: 'POST',
    },
  )
}
