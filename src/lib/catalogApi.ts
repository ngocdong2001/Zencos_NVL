import type { BasicRow, BasicTabId, MaterialRow } from '../components/catalog/types'

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
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function fetchMaterials(q?: string): Promise<MaterialRow[]> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return http<MaterialRow[]>(`/api/catalog/materials${query}`)
}

export async function createMaterial(payload: {
  code: string
  name: string
  inciName: string
  productType: 'raw_material' | 'packaging'
  baseUnit: string
  minStockLevel: number
  hasExpiry: boolean
  useFefo: boolean
  notes?: string
}) {
  return http('/api/catalog/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateMaterial(id: string, payload: Partial<{
  code: string
  name: string
  inciName: string
  productType: 'raw_material' | 'packaging'
  baseUnit: string
  minStockLevel: number
  hasExpiry: boolean
  useFefo: boolean
  notes?: string
}>) {
  return http(`/api/catalog/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteMaterial(id: string) {
  return http<void>(`/api/catalog/materials/${id}`, { method: 'DELETE' })
}

export async function fetchBasics(tab: BasicTabId): Promise<BasicRow[]> {
  const pathMap: Record<BasicTabId, string> = {
    classifications: '/api/catalog/classifications',
    suppliers: '/api/catalog/suppliers',
    customers: '/api/catalog/customers',
    locations: '/api/catalog/locations',
    units: '/api/catalog/units',
  }
  return http<BasicRow[]>(pathMap[tab])
}

export async function createBasic(tab: BasicTabId, payload: { code: string; name: string; note: string }) {
  if (tab === 'locations') {
    return http('/api/catalog/locations', {
      method: 'POST',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'classifications') {
    return http('/api/catalog/classifications', {
      method: 'POST',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'units') {
    return http('/api/catalog/units', {
      method: 'POST',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'suppliers') {
    return http('/api/catalog/suppliers', {
      method: 'POST',
      body: JSON.stringify({ code: payload.code, name: payload.name, notes: payload.note }),
    })
  }

  if (tab === 'customers') {
    return http('/api/catalog/customers', {
      method: 'POST',
      body: JSON.stringify({ name: payload.name, notes: payload.note }),
    })
  }

  return Promise.resolve(null)
}

export async function updateBasic(tab: BasicTabId, id: string, payload: Partial<{ code: string; name: string; note: string }>) {
  if (tab === 'locations') {
    return http(`/api/catalog/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'classifications') {
    return http(`/api/catalog/classifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'units') {
    return http(`/api/catalog/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: payload.code, name: payload.name, note: payload.note }),
    })
  }

  if (tab === 'suppliers') {
    return http(`/api/catalog/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: payload.code, name: payload.name, notes: payload.note }),
    })
  }

  if (tab === 'customers') {
    return http(`/api/catalog/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: payload.name, notes: payload.note }),
    })
  }

  return Promise.resolve(null)
}

export async function deleteBasic(tab: BasicTabId, id: string) {
  if (tab === 'locations') {
    return http<void>(`/api/catalog/locations/${id}`, { method: 'DELETE' })
  }

  if (tab === 'classifications') {
    return http<void>(`/api/catalog/classifications/${id}`, { method: 'DELETE' })
  }

  if (tab === 'units') {
    return http<void>(`/api/catalog/units/${id}`, { method: 'DELETE' })
  }

  if (tab === 'suppliers') {
    return http<void>(`/api/catalog/suppliers/${id}`, { method: 'DELETE' })
  }

  if (tab === 'customers') {
    return http<void>(`/api/catalog/customers/${id}`, { method: 'DELETE' })
  }

  return Promise.resolve()
}
