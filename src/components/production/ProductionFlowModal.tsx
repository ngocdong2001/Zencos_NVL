import { Dialog } from 'primereact/dialog'
import { ProductionFlowDiagram } from './ProductionFlowDiagramModule'

interface ProductionFlowModalProps {
  visible: boolean
  orderId: string | null
  onHide: () => void
}

export function ProductionFlowModal({ visible, orderId, onHide }: ProductionFlowModalProps) {
  if (!orderId) return null

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      maximizable
      style={{ width: '95vw', height: '95vh' }}
      header="Biểu đồ luồng vật tư"
      modal
      className="production-flow-modal"
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ProductionFlowDiagram orderId={orderId} hideHeader hideBottomBar />
      </div>
    </Dialog>
  )
}
