import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { ProductionFlowDiagram } from '../components/production/ProductionFlowDiagramModule'

export function ProductionFlowDiagramPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  if (!orderId) return null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: '#fff', overflow: 'hidden',
    }}>
      {/* Header with back button */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        <Button
          type="button" icon="pi pi-arrow-left" text
          className="icon-btn"
          onClick={() => navigate('/production')}
          style={{ marginLeft: -8 }}
          aria-label="Quay lại"
        />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          Biểu đồ luồng vật tư
        </h2>
      </div>

      {/* Diagram */}
      <ProductionFlowDiagram orderId={orderId} hideHeader={false} hideBottomBar={false} />
    </div>
  )
}


