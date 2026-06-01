import { apiFetch, buildApiUrl } from './api'

const http = apiFetch

export type InboundDraftDocType = 'Invoice' | 'COA' | 'MSDS' | 'Other'

export type InboundDraftDoc = {
  id: string
  draftCode: string
  docType: InboundDraftDocType
  originalName: string
  mimeType: string
  fileSize: number
  createdAt: string
}

export type InboundDraftUploadContext = {
  purchaseRequestRef?: string
  productId?: string
  lotNo?: string
  expectedDate?: string
  supplierName?: string
  quantityBase?: string
  quantityDisplay?: string
  unitUsed?: string
}

export function fetchInboundDraftDocuments(draftCode: string): Promise<InboundDraftDoc[]> {
  return http<InboundDraftDoc[]>(`/api/inbound-drafts/${encodeURIComponent(draftCode)}/documents`)
}

export function uploadInboundDraftDocument(
  draftCode: string,
  file: File,
  docType: InboundDraftDocType,
  context?: InboundDraftUploadContext,
): Promise<InboundDraftDoc> {
  const form = new FormData()
  form.append('file', file)
  form.append('docType', docType)
  if (context) {
    form.append('context', JSON.stringify(context))
  }
  return http<InboundDraftDoc>(`/api/inbound-drafts/${encodeURIComponent(draftCode)}/documents`, {
    method: 'POST',
    body: form,
  })
}

export function updateInboundDraftDocument(
  draftCode: string,
  docId: string,
  docType: InboundDraftDocType,
): Promise<InboundDraftDoc> {
  return http<InboundDraftDoc>(
    `/api/inbound-drafts/${encodeURIComponent(draftCode)}/documents/${encodeURIComponent(docId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    },
  )
}

export function deleteInboundDraftDocument(draftCode: string, docId: string): Promise<void> {
  return http<void>(`/api/inbound-drafts/${encodeURIComponent(draftCode)}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  })
}

export function getInboundDraftDocumentFileUrl(draftCode: string, docId: string, download = false): string {
  const qs = download ? '?download=true' : ''
  return buildApiUrl(`/api/inbound-drafts/${encodeURIComponent(draftCode)}/documents/${encodeURIComponent(docId)}/file${qs}`)
}