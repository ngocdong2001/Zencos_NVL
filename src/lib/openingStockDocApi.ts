const API_BASE_URL = 'http://localhost:4000'

export type OpeningStockDocType = 'Invoice' | 'COA' | 'MSDS' | 'Other'

export type StockItemDoc = {
  id: string
  docType: OpeningStockDocType
  originalName: string
  mimeType: string
  fileSize: number
  createdAt: string
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init })
  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const json = JSON.parse(text) as { message?: string }
      message = json.message ?? text
    } catch {
      // keep raw text
    }
    throw new Error(message || `HTTP ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
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
  return `${API_BASE_URL}/api/inventory-opening/rows/${encodeURIComponent(itemId)}/documents/${encodeURIComponent(docId)}/file${qs}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
