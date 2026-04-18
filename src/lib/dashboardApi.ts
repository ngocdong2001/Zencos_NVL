const API_BASE_URL = 'http://localhost:4000'

async function http<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export type DashboardKpi = {
  totalStockValue: number
  expiringBatchCount: number
  pendingInboundCount: number
  pendingOutboundCount: number
  pendingPurchaseCount: number
}

export type DashboardAlert = {
  id: number
  message: string
  actionLabel: string
  severity: 'critical' | 'warning' | 'info'
}

export type ExpiryAlert = {
  id: number
  lotNo: string
  productName: string
  expiryDateDisplay: string
  daysLeft: number
}

export type LowStockAlert = {
  id: number
  productName: string
  currentQty: number
  minStock: number
  unitName: string
  deficitPct: number
}

export type DashboardFefo = {
  safePct: number
  nearExpiryPct: number
  expiredPct: number
  total: number
}

export type WeeklyFlowPoint = {
  unit: string
  nhap: number
  xuat: number
}

export type RecentTransaction = {
  dbId: string
  id: string
  type: string
  material: string
  quantity: string
  time: string
  status: string
}

export type DashboardData = {
  kpi: DashboardKpi
  alerts: DashboardAlert[]
  expiryAlerts: ExpiryAlert[]
  lowStockAlerts: LowStockAlert[]
  fefo: DashboardFefo
  weeklyFlow: WeeklyFlowPoint[]
  recentTransactions: RecentTransaction[]
}

export function fetchDashboard(): Promise<DashboardData> {
  return http<DashboardData>('/api/dashboard')
}
