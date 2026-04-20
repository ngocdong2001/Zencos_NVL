const API_BASE_URL = 'http://localhost:4000'

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

export type LotDetail = {
  id: string
  lotNo: string
  expiryDate: string
  unitPricePerKg: number
  quantityGram: number
  status: 'near_expiration' | 'monitoring' | 'normal'
  receiptId: string | null
  receiptRef: string | null
}

export type InventoryItem = {
  id: string
  code: string
  inciName: string
  tradeName: string
  unit: string
  openingQuantity: number
  importQuantity: number
  exportQuantity: number
  stockQuantity: number
  totalStockQuantity: number
  value: number
}

export type InventorySummary = {
  totalMaterials: number
  nearExpirationCount: number
  lowStockCount: number
  totalInventoryValue: number
}

export type FilterOptions = 'all' | 'expiring_soon' | 'low_stock'

export type ItemTransaction = {
  id: string
  type: 'import' | 'export' | 'adjustment'
  quantityBase: number
  transactionDate: string
  userName: string
  lotNo: string
  notes: string
}

export type MonthlyStats = {
  month: string
  importGram: number
  exportGram: number
}

export type ItemDocument = {
  id: string
  docType: string
  originalName: string
  fileSize: number | null
  createdAt: string
}

export type InventoryItemDetail = {
  id: string
  code: string
  inciName: string
  tradeName: string
  unit: string
  classification: string
  minStockLevel: number
  stockQuantity: number
  value: number
  lots: LotDetail[]
  transactions: ItemTransaction[]
  monthlyStats: MonthlyStats[]
  documents: ItemDocument[]
}

export async function fetchProductLots(productId: string, signal?: AbortSignal): Promise<LotDetail[]> {
  return http<LotDetail[]>(`/api/warehouse/items/${productId}/lots`, signal ? { signal } : undefined)
}

export async function fetchInventoryItemDetail(id: string): Promise<InventoryItemDetail> {
  return http<InventoryItemDetail>(`/api/warehouse/items/${id}`)
}

export type WarehouseData = {
  summary: InventorySummary
  items: InventoryItem[]
  total: number
}

export async function fetchWarehouseData(
  filter: FilterOptions = 'all',
  searchQuery: string = '',
  page: number = 1,
  pageSize: number = 10,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<WarehouseData> {
  const params = new URLSearchParams({
    filter,
    q: searchQuery,
    page: String(page),
    limit: String(pageSize),
  })
  if (dateFrom) params.set('dateFrom', dateFrom.toISOString().split('T')[0])
  if (dateTo) params.set('dateTo', dateTo.toISOString().split('T')[0])
  return http<WarehouseData>(`/api/warehouse?${params.toString()}`)
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  return http<InventorySummary>('/api/warehouse/summary')
}

export async function fetchInventoryItem(id: string): Promise<InventoryItem> {
  return http<InventoryItem>(`/api/warehouse/items/${id}`)
}

export async function createInventoryItem(payload: {
  code: string
  inciName: string
  tradeName: string
  lotNo: string
  expiryDate: string
  unitPricePerKg: number
  quantityGram: number
}): Promise<InventoryItem> {
  return http<InventoryItem>('/api/warehouse/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateInventoryItem(
  id: string,
  payload: Partial<InventoryItem>,
): Promise<InventoryItem> {
  return http<InventoryItem>(`/api/warehouse/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteInventoryItem(id: string): Promise<{ deleted: boolean }> {
  return http<{ deleted: boolean }>(`/api/warehouse/items/${id}`, {
    method: 'DELETE',
  })
}

export async function exportInventoryToExcel(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/warehouse/export/excel`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to export: HTTP ${response.status}`)
  }

  return response.blob()
}
