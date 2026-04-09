import { Timeline } from 'primereact/timeline'
import type { PurchaseRequestHistoryEvent } from '../../lib/purchaseShortageApi'

type Props = {
  events: PurchaseRequestHistoryEvent[]
  loading: boolean
  error: string | null
  emptyMessage?: string
  loadingMessage?: string
}

function formatHistoryDateTime(raw: string) {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('vi-VN', {
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapHistoryStyle(actionType: PurchaseRequestHistoryEvent['actionType']) {
  if (actionType === 'created') return { tone: 'tone-created', icon: 'pi pi-file-edit', badge: 'Tạo mới' }
  if (actionType === 'updated') return { tone: 'tone-updated', icon: 'pi pi-pencil', badge: 'Cập nhật' }
  if (actionType === 'submitted') return { tone: 'tone-submitted', icon: 'pi pi-send', badge: 'Đã gửi' }
  if (actionType === 'approved') return { tone: 'tone-approved', icon: 'pi pi-check-circle', badge: 'Đã duyệt' }
  if (actionType === 'ordered') return { tone: 'tone-ordered', icon: 'pi pi-shopping-cart', badge: 'Đặt hàng' }
  if (actionType === 'received') return { tone: 'tone-received', icon: 'pi pi-check-square', badge: 'Đã nhận' }
  return { tone: 'tone-cancelled', icon: 'pi pi-times-circle', badge: 'Đã hủy' }
}

function historyMarkerTemplate(event: PurchaseRequestHistoryEvent) {
  const style = mapHistoryStyle(event.actionType)
  return <span className={`purchase-timeline-marker ${style.tone}`} aria-hidden />
}

function historyContentTemplate(event: PurchaseRequestHistoryEvent) {
  const style = mapHistoryStyle(event.actionType)
  return (
    <div className={`purchase-timeline-content ${style.tone}`}>
      <div className="purchase-timeline-head">
        <span className="purchase-timeline-badge">
          <i className={style.icon} aria-hidden />
          {style.badge}
        </span>
      </div>
      <strong>{event.action}</strong>
      <span>{`${formatHistoryDateTime(event.at)} bởi ${event.actorName}`}</span>
    </div>
  )
}

export function HistoryTimeline({
  events,
  loading,
  error,
  emptyMessage = 'Chưa có lịch sử thao tác cho phiếu này.',
  loadingMessage = 'Đang tải lịch sử thao tác...',
}: Props) {
  if (loading) return <p className="purchase-side-note">{loadingMessage}</p>
  if (error) return <p className="po-field-error">{error}</p>
  if (events.length === 0) return <p className="purchase-side-note">{emptyMessage}</p>

  return (
    <div className="purchase-history-scroll">
      <Timeline
        value={events}
        align="left"
        className="purchase-history-timeline"
        marker={historyMarkerTemplate}
        content={historyContentTemplate}
      />
    </div>
  )
}
