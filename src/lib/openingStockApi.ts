import { apiFetch } from './api'

const http = apiFetch


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
  locationId: string | null
  locationCode: string
  locationName: string
}

export type OpeningStockPriceUnit = {
  id: string
  code: string
  name: string
  conversionToBase: number
  isPurchaseUnit: boolean
}

export type OpeningStockUpdateResult = OpeningStockRow & {
  autoAdjusted?: boolean
  adjustmentQuantityBase?: number
  batchSynced?: boolean
}

export type OpeningStockDeleteResult = {
  deleted: boolean
  autoReversed?: boolean
  reversalQuantityBase?: number
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
  locationId?: string | null
  quantityBase: number
  unitPriceValue: number
  unitPriceUnitId?: string
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
}): Promise<OpeningStockUpdateResult> {
  return http<OpeningStockUpdateResult>(`/api/inventory-opening/rows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchOpeningStockPriceUnits(code: string): Promise<OpeningStockPriceUnit[]> {
  return http<OpeningStockPriceUnit[]>(`/api/inventory-opening/products/${encodeURIComponent(code)}/price-units`)
}

export async function deleteOpeningStockRow(id: string): Promise<OpeningStockDeleteResult> {
  return http<OpeningStockDeleteResult>(`/api/inventory-opening/rows/${id}`, { method: 'DELETE' })
}
