import { confirmDialog } from 'primereact/confirmdialog'

type ConfirmActionOptions = {
  header: string
  message: string
  onAccept: () => void
  onReject?: () => void
  icon?: string
  acceptLabel?: string
  rejectLabel?: string
  acceptClassName?: string
}

export function showConfirmAction(options: ConfirmActionOptions) {
  confirmDialog({
    header: options.header,
    message: options.message,
    icon: options.icon ?? 'pi pi-exclamation-triangle',
    acceptLabel: options.acceptLabel ?? 'Đồng ý',
    rejectLabel: options.rejectLabel ?? 'Hủy',
    acceptClassName: options.acceptClassName,
    accept: options.onAccept,
    reject: options.onReject,
  })
}

export function showDangerConfirm(options: Omit<ConfirmActionOptions, 'acceptClassName'>) {
  showConfirmAction({
    ...options,
    acceptClassName: 'p-button-danger',
  })
}
