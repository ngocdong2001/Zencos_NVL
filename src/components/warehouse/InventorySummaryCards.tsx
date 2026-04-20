import type { InventorySummary } from '../../lib/warehouseApi'
import './InventorySummaryCards.css'

type Props = {
  summary: InventorySummary | null
  loading: boolean
}

function formatShortCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ đ`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} triệu đ`
  if (value >= 1e3) return `${Math.round(value / 1e3)} nghìn đ`
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const FALLBACK: InventorySummary = {
  totalMaterials: 0,
  nearExpirationCount: 0,
  lowStockCount: 0,
  totalInventoryValue: 0,
}

export function InventorySummaryCards({ summary, loading }: Props) {
  const data = summary ?? FALLBACK

  if (loading && !summary) {
    return (
      <div className="summary-cards-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="summary-card summary-card--skeleton">
            <div className="card-info">
              <div className="skeleton-label"></div>
              <div className="skeleton-value"></div>
            </div>
            <div className="card-icon-box card-icon-box--neutral skeleton-icon"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="summary-cards-grid">
      {/* Card 1: Total Materials */}
      <div className="summary-card">
        <div className="card-info">
          <div className="card-label">TỔNG NGUYÊN LIỆU</div>
          <div className="card-value card-value--blue">{data.totalMaterials}</div>
        </div>
        <div className="card-icon-box card-icon-box--blue">
          <i className="pi pi-server"></i>
        </div>
      </div>

      {/* Card 2: Near Expiration - fixed duplicate */}
      <div className="summary-card">
        <div className="card-info">
          <div className="card-label">CẦN HẠN (&lt;60D)</div>
          <div className="card-value card-value--red">{pad2(data.nearExpirationCount)}</div>
        </div>
        <div className="card-icon-box card-icon-box--orange">
          <i className="pi pi-exclamation-triangle"></i>
        </div>
      </div>

      {/* Card 3: Low Stock */}
      <div className="summary-card">
        <div className="card-info">
          <div className="card-label">TỒN KHO THẤP</div>
          <div className="card-value card-value--dark">{pad2(data.lowStockCount)}</div>
        </div>
        <div className="card-icon-box card-icon-box--neutral">
          <i className="pi pi-arrow-up-right"></i>
        </div>
      </div>

      {/* Card 4: Total Inventory Value */}
      <div className="summary-card">
        <div className="card-info">
          <div className="card-label">TỔNG GIÁ TRỊ KHO</div>
          <div className="card-value card-value--teal">{formatShortCurrency(data.totalInventoryValue)}</div>
        </div>
        <div className="card-icon-box card-icon-box--teal">
          <i className="pi pi-history"></i>
        </div>
      </div>
    </div>
  )
}
