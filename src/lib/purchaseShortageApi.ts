const API_BASE_URL = 'http://localhost:4000'

const TOKEN_STORAGE_KEYS = ['auth.token', 'token', 'accessToken']

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  for (const key of TOKEN_STORAGE_KEYS) {
    const local = window.localStorage.getItem(key)
    if (local?.trim()) return local.trim()

    const session = window.sessionStorage.getItem(key)
    if (session?.trim()) return session.trim()
  }

  return null
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const json = JSON.parse(text) as { error?: string; message?: string }
      message = json.error ?? json.message ?? text
    } catch {
      // keep raw text
    }
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export type ShortageStatus = 'critical' | 'warning' | 'stable'

export type PurchaseShortageRow = {
  id: string
  code: string
  materialName: string
  stockCurrent: number
  stockMin: number
  stockShort: number
  unit: string
  status: ShortageStatus
  updatedAt: string
}

export type PurchaseShortageResponse = {
  data: PurchaseShortageRow[]
  total: number
  page: number
  limit: number
  summary: {
    critical: number
    warning: number
    stable: number
  }
}

export async function fetchPurchaseShortages(params: {
  q?: string
  status?: 'all' | ShortageStatus
  page?: number
  limit?: number
}): Promise<PurchaseShortageResponse> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const suffix = query.toString()
  return http<PurchaseShortageResponse>(`/api/reports/shortages${suffix ? `?${suffix}` : ''}`)
}
