import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import type { InventoryItemDetail } from './warehouseApi'

const TEMPLATE_PATH = '/templates/Mau the kho nhap_xuat.docx'

interface StockCardRow {
  ngay: string
  so_chung_tu: string
  dien_giai: string
  lo_hang: string
  don_vi: string
  nhap_so_luong: string
  xuat_so_luong: string
  ton_so_luong: string
  nguoi_thuc_hien: string
  nguoi_kiem_tra: string
}

function formatDateVn(dateStr: string | null | undefined): string {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    return dateStr
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatQtyVn(value: number): string {
  if (!Number.isFinite(value)) return '---'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function buildStockCardRows(detail: InventoryItemDetail): StockCardRow[] {
  const rows: StockCardRow[] = []

  // Calculate opening balance
  const totalImport = detail.transactions.reduce(
    (sum, tx) => sum + (tx.type === 'import' ? tx.quantityBase : 0),
    0,
  )
  const totalExport = detail.transactions.reduce(
    (sum, tx) => sum + (tx.type === 'export' ? tx.quantityBase : 0),
    0,
  )
  const openingBalance = detail.stockQuantity - totalImport + totalExport

  // Opening row
  rows.push({
    ngay: '---',
    so_chung_tu: 'Tồn đầu kỳ',
    dien_giai: 'Tồn kho đầu kỳ',
    lo_hang: '',
    don_vi: detail.unit || '',
    nhap_so_luong: '',
    xuat_so_luong: '',
    ton_so_luong: formatQtyVn(openingBalance),
    nguoi_thuc_hien: '',
    nguoi_kiem_tra: '',
  })

  // Transaction rows
  const sortedTxs = [...detail.transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
  )

  let runningBalance = openingBalance
  for (const tx of sortedTxs) {
    const importQty = tx.type === 'import' ? tx.quantityBase : 0
    const exportQty = tx.type === 'export' ? tx.quantityBase : 0
    runningBalance += importQty - exportQty

    rows.push({
      ngay: formatDateVn(tx.transactionDate),
      so_chung_tu: tx.refNo || (tx.type === 'import' ? 'Nhập' : tx.type === 'export' ? 'Xuất' : 'Điều chỉnh'),
      dien_giai: tx.entityName || tx.notes || '',
      lo_hang: tx.lotNo || '',
      don_vi: detail.unit || '',
      nhap_so_luong: importQty > 0 ? formatQtyVn(importQty) : '',
      xuat_so_luong: exportQty > 0 ? formatQtyVn(exportQty) : '',
      ton_so_luong: formatQtyVn(runningBalance),
      nguoi_thuc_hien: tx.userName || '',
      nguoi_kiem_tra: '',
    })
  }

  // Total row
  rows.push({
    ngay: '',
    so_chung_tu: 'TỔNG CỘNG',
    dien_giai: '',
    lo_hang: '',
    don_vi: '',
    nhap_so_luong: formatQtyVn(totalImport),
    xuat_so_luong: formatQtyVn(totalExport),
    ton_so_luong: formatQtyVn(detail.stockQuantity),
    nguoi_thuc_hien: '',
    nguoi_kiem_tra: '',
  })

  return rows
}

export async function exportStockCard(detail: InventoryItemDetail): Promise<void> {
  // Fetch the template
  const response = await fetch(TEMPLATE_PATH)
  if (!response.ok) {
    throw new Error(`Không thể tải mẫu thẻ kho: HTTP ${response.status}`)
  }
  const templateBuffer = await response.arrayBuffer()

  // Load template into PizZip
  const zip = new PizZip(templateBuffer)

  // Create docxtemplater instance
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Build template data
  const stockCardRows = buildStockCardRows(detail)

  const data = {
    // Header fields (matching template placeholders)
    ten_nvl: detail.inciName || detail.tradeName || '---',
    nha_cung_cap: '---', // Supplier info not available in detail object
    don_vi_tinh: detail.unit || '---',
    // Transaction rows data
    rows: stockCardRows,
  }

  // Fill template with data
  doc.render(data)

  // Generate output blob
  const outputBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  // Trigger download
  const safeCode = (detail.code ?? 'the-kho').replace(/[^A-Za-z0-9_-]/g, '_')
  saveAs(outputBlob, `The_kho_${safeCode}_${new Date().toISOString().split('T')[0]}.docx`)
}
