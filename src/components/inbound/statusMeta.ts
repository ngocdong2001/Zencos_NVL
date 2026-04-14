export type InboundReceiptStatus = 'draft' | 'pending_qc' | 'posted' | 'cancelled'

export function getInboundStatusMeta(status: InboundReceiptStatus): {
  label: string
  tone: InboundReceiptStatus
} {
  if (status === 'posted') return { label: 'Đã posted', tone: 'posted' }
  if (status === 'pending_qc') return { label: 'Chờ QC', tone: 'pending_qc' }
  if (status === 'cancelled') return { label: 'Đã hủy', tone: 'cancelled' }
  return { label: 'Nháp', tone: 'draft' }
}