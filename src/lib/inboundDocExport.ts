import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import type { InboundReceiptDetailResponse } from './inboundApi'

const TEMPLATE_PATH = '/templates/phieu-tiep-nhan-nvl.docx'

function formatDateVn(dateStr: string | null | undefined): string {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) {
    // Try parsing as YYYY-MM-DD
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    return dateStr
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatQtyVn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '---'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

export interface InboundDocExportData {
  ten_nguyen_vat_lieu: string
  ma_nvl: string
  so_phieu_nhap_kho: string
  so_hoa_don: string
  nha_san_xuat: string
  nha_cung_cap: string
  lot_no: string
  ngay_san_xuat: string
  so_luong_nhap: string
  quy_cach: string
  tinh_trang: string
  nguoi_lap_phieu: string
  ngay_thang_nam: string
}

export function buildInboundDocData(detail: InboundReceiptDetailResponse): InboundDocExportData {
  const item = detail.items[0]

  const qtyDisplay = item ? Number(item.quantityDisplay) : null
  const unitUsed = item?.unitUsed?.trim() || 'kg'
  const qtyStr = qtyDisplay != null ? `${formatQtyVn(qtyDisplay)} ${unitUsed}` : '---'

  return {
    ten_nguyen_vat_lieu: (item?.product.name ?? '---').trim() || '---',
    ma_nvl: (item?.product.code ?? '---').trim() || '---',
    so_phieu_nhap_kho: (detail.receiptRef ?? '---').trim() || '---',
    so_hoa_don: (item?.invoiceNumber ?? '---').trim() || '---',
    nha_san_xuat: (item?.manufacturer?.name ?? '---').trim() || '---',
    nha_cung_cap: (detail.supplier?.name ?? '---').trim() || '---',
    lot_no: (item?.lotNo ?? '---').trim() || '---',
    ngay_san_xuat: formatDateVn(item?.manufactureDate),
    so_luong_nhap: qtyStr,
    quy_cach: '---',
    tinh_trang: 'Còn nguyên',
    nguoi_lap_phieu: (detail.creator?.fullName ?? '---').trim() || '---',
    ngay_thang_nam: buildCurrentDateVn(),
  }
}

function buildCurrentDateVn(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `ngày ${day} tháng ${month} năm ${year}`
}

export async function exportInboundReceiptDoc(detail: InboundReceiptDetailResponse): Promise<void> {
  // Fetch the template
  const response = await fetch(TEMPLATE_PATH)
  if (!response.ok) {
    throw new Error(`Không thể tải mẫu phiếu: HTTP ${response.status}`)
  }
  const templateBuffer = await response.arrayBuffer()

  // Load template into PizZip
  const zip = new PizZip(templateBuffer)

  // Create docxtemplater instance
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Fill template with data
  const data = buildInboundDocData(detail)
  doc.render(data)

  // Generate output blob
  const outputBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  // Trigger download
  const safeCode = (detail.receiptRef ?? 'phieu').replace(/[^A-Za-z0-9_-]/g, '_')
  saveAs(outputBlob, `Phieu_tiep_nhan_NVL_${safeCode}.docx`)
}
