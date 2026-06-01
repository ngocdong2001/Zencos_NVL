import { apiFetch, buildApiUrl } from './api'

const http = apiFetch

export type OpeningStockDocType = 'Invoice' | 'COA' | 'MSDS' | 'Other'

export type StockItemDoc = {
  id: string
  docType: OpeningStockDocType
  originalName: string
  mimeType: string
  fileSize: number
  createdAt: string
}

export function fetchItemDocuments(itemId: string): Promise<StockItemDoc[]> {
  return http<StockItemDoc[]>(`/api/inventory-opening/rows/${encodeURIComponent(itemId)}/documents`)
}

export function uploadItemDocument(itemId: string, file: File, docType: OpeningStockDocType): Promise<StockItemDoc> {
  const form = new FormData()
  form.append('file', file)
  form.append('docType', docType)
  return http<StockItemDoc>(`/api/inventory-opening/rows/${encodeURIComponent(itemId)}/documents`, {
    method: 'POST',
    body: form,
  })
}

export function deleteItemDocument(itemId: string, docId: string): Promise<void> {
  return http<void>(
    `/api/inventory-opening/rows/${encodeURIComponent(itemId)}/documents/${encodeURIComponent(docId)}`,
    { method: 'DELETE' },
  )
}

export function getDocumentFileUrl(itemId: string, docId: string, download = false): string {
  const qs = download ? '?download=true' : ''
  return buildApiUrl(`/api/inventory-opening/rows/${encodeURIComponent(itemId)}/documents/${encodeURIComponent(docId)}/file${qs}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
