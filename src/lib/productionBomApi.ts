import { apiFetch } from './api'

const http = apiFetch

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductionBomStatus = 'draft' | 'submitted' | 'approved' | 'inactive' | 'archived'
export type ProductionBomLineType = 'nvl' | 'btp'

export type ProductionBomLine = {
  id: string
  bomId: string
  sortOrder: number
  lineType: ProductionBomLineType
  productId: string | null
  productCode: string
  productName: string
  qtyPerBase: number
  wasteQty: number
  unit: string
  notes: string | null
}

export type ProductionBom = {
  id: string
  bomCode: string | null
  bomName: string
  outputProductId: string | null
  outputProduct: { id: string; code: string; name: string; outputType: string; unit: string } | null
  baseQty: number
  version: number
  status: ProductionBomStatus
  effectiveFrom: string | null
  effectiveTo: string | null
  notes: string | null
  createdBy: string
  creator: { id: string; fullName: string }
  approvedBy: string | null
  approver: { id: string; fullName: string } | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  lines: ProductionBomLine[]
}

export type ProductionBomListResponse = {
  data: ProductionBom[]
  total: number
  page: number
  limit: number
}

export type BomLinePayload = {
  sortOrder?: number
  lineType: ProductionBomLineType
  productId?: number | null
  productCode: string
  productName: string
  qtyPerBase: number
  wasteQty?: number
  unit: string
  notes?: string | null
}

export type CreateBomPayload = {
  bomName: string
  outputProductId?: number | null
  baseQty?: number
  effectiveFrom?: string | null
  effectiveTo?: string | null
  notes?: string | null
  lines: BomLinePayload[]
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function fetchProductionBoms(params?: {
  status?: ProductionBomStatus | 'all'
  q?: string
  page?: number
  limit?: number
}): Promise<ProductionBomListResponse> {
  const query = new URLSearchParams()
  if (params?.status && params.status !== 'all') query.set('status', params.status)
  if (params?.q) query.set('q', params.q)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return http<ProductionBomListResponse>(`/api/production-boms${qs ? `?${qs}` : ''}`)
}

export async function fetchProductionBom(id: string): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}`)
}

export async function createProductionBom(data: CreateBomPayload): Promise<ProductionBom> {
  return http<ProductionBom>('/api/production-boms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProductionBom(id: string, data: CreateBomPayload): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function submitProductionBom(id: string): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}/submit`, { method: 'POST' })
}

export async function approveProductionBom(id: string): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}/approve`, { method: 'POST' })
}

export async function recallProductionBom(id: string): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}/recall`, { method: 'POST' })
}

export async function deactivateProductionBom(id: string): Promise<ProductionBom> {
  return http<ProductionBom>(`/api/production-boms/${id}/deactivate`, { method: 'POST' })
}
