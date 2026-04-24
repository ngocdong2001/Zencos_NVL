import type { PurchaseRequestRowResponse, PurchaseShortageRow, ShortageStatus } from '../../lib/purchaseShortageApi'

export type PurchaseView = 'tabs' | 'detail' | 'inbound-drilldown'
export type PurchaseTab = 'shortage' | 'po-list'
export type PoStatus = 'draft' | 'submitted' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled'

export type PurchaseOrderRow = {
  id: string
  code: string
  createdAt: string
  supplier: string
  lineCount: number
  totalValue: number
  status: PoStatus
  creator: string
}

export type PurchaseDraftLine = {
  id: string
  productId: string
  materialCode: string
  materialName: string
  inciName: string
  manufacturerName: string
  quantity: number
  unit: string
  orderUnit: string
  orderUnitConversionToBase: number
  unitPrice: number
}

export type SupplierOption = {
  label: string
  value: string
}

export type OutletContext = { search: string }

export const STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã gửi',
  approved: 'Đã duyệt',
  ordered: 'Đã đặt',
  partially_received: 'Nhận một phần',
  received: 'Đã nhận',
  cancelled: 'Đã hủy',
}

export const PO_PAGE_SIZE_OPTIONS = [10, 20, 50]
export const SHORTAGE_PAGE_SIZE_OPTIONS = [10, 20, 50]

export const SHORTAGE_STATUS_OPTIONS: Array<{ label: string; value: 'all' | ShortageStatus }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Nguy cấp', value: 'critical' },
  { label: 'Cảnh báo', value: 'warning' },
  { label: 'Ổn định', value: 'stable' },
]

export const PO_STATUS_OPTIONS: Array<{ label: string; value: 'all' | PoStatus }> = [
  { label: 'Trạng thái', value: 'all' },
  { label: 'Bản nháp', value: 'draft' },
  { label: 'Đã gửi', value: 'submitted' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Đã đặt', value: 'ordered' },
  { label: 'Nhận một phần', value: 'partially_received' },
  { label: 'Đã nhận', value: 'received' },
  { label: 'Đã hủy', value: 'cancelled' },
]

export const DRAFT_LINES: PurchaseDraftLine[] = [
  {
    id: 'line-1',
    productId: '',
    materialCode: 'RM-EXT-002',
    materialName: 'Chiết xuất Cam thảo (Licorice Extract)',
    inciName: '',
    manufacturerName: '',
    quantity: 50,
    unit: 'kg',
    orderUnit: 'kg',
    orderUnitConversionToBase: 1,
    unitPrice: 450000,
  },
  {
    id: 'line-2',
    productId: '',
    materialCode: 'RM-SOL-015',
    materialName: 'Glycerin tinh khiết 99.5%',
    inciName: '',
    manufacturerName: '',
    quantity: 200,
    unit: 'kg',
    orderUnit: 'kg',
    orderUnitConversionToBase: 1,
    unitPrice: 35000,
  },
  {
    id: 'line-3',
    productId: '',
    materialCode: 'RM-SOL-022',
    materialName: 'Propylene Glycol USP',
    inciName: '',
    manufacturerName: '',
    quantity: 150,
    unit: 'kg',
    orderUnit: 'kg',
    orderUnitConversionToBase: 1,
    unitPrice: 42000,
  },
]

export type { PurchaseRequestRowResponse, PurchaseShortageRow, ShortageStatus }
