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

export type OpeningStockRow = {
  id: string
  code: string
  tradeName: string
  inciName: string
  lot: string
  openingDate: string
  invoiceNo: string
  invoiceDate: string
  supplierId: string | null
  supplierCode: string
  supplierName: string
  quantityGram: number
  unitPricePerKg: number
  unitPriceValue: number
  unitPriceUnitId: string | null
  unitPriceUnitCode: string
  unitPriceConversionToBase: number
  lineAmount: number
  expiryDate: string
  manufactureDate: string
  hasCertificate: boolean
}

export type OpeningStockPriceUnit = {
  id: string
  code: string
  name: string
  conversionToBase: number
  isPurchaseUnit: boolean
}

export async function fetchOpeningStockRows(): Promise<OpeningStockRow[]> {
  return http<OpeningStockRow[]>('/api/inventory-opening/rows')
}

export async function createOpeningStockRow(payload: {
  code: string
  lot: string
  openingDate?: string
  invoiceNo?: string
  invoiceDate?: string
  supplierId?: string | null
  quantityBase: number
  unitPriceValue: number
  unitPriceUnitId: string
  expiryDate?: string
  manufactureDate?: string
}): Promise<OpeningStockRow> {
  return http<OpeningStockRow>('/api/inventory-opening/rows', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateOpeningStockRow(id: string, payload: {
  lot?: string
  openingDate?: string | null
  invoiceNo?: string
  invoiceDate?: string | null
  supplierId?: string | null
  quantityBase?: number
  unitPriceValue?: number
  expiryDate?: string | null
  manufactureDate?: string | null
}): Promise<OpeningStockRow> {
  return http<OpeningStockRow>(`/api/inventory-opening/rows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchOpeningStockPriceUnits(code: string): Promise<OpeningStockPriceUnit[]> {
  return http<OpeningStockPriceUnit[]>(`/api/inventory-opening/products/${encodeURIComponent(code)}/price-units`)
}

export async function deleteOpeningStockRow(id: string): Promise<void> {
  return http<void>(`/api/inventory-opening/rows/${id}`, { method: 'DELETE' })
}
