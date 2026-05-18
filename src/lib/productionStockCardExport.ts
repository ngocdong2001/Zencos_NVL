import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ProductionOrderDetail } from './productionApi'

interface StockCardSummaryRow {
  locationName: string
  btpCode: string
  btpName: string
  actualQty: number
  unit: string
}

interface ExportOptions {
  order: ProductionOrderDetail
  receiptLine: {
    tpCode: string
    tpName: string
    quantity: number
    plannedQty: number
    unit: string
    notes: string
  }
  step3Summaries: StockCardSummaryRow[]
}

interface PerMaterialRow {
  date: Date
  code: string
  name: string
  importQty: number
  exportQty: number
  unit: string
  note: string
  remark: string
}

function formatDateVn(date: Date | string | null | undefined): string {
  if (!date) return '---'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '---'
  return d.toLocaleDateString('vi-VN')
}

function formatQtyVn(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function buildRows(order: ProductionOrderDetail, options: ExportOptions): PerMaterialRow[] {
  const rows: PerMaterialRow[] = []
  const step3Date = order.step3ProcessedAt ? new Date(order.step3ProcessedAt) : new Date(order.createdAt)
  const step4Date = order.step4ProcessedAt ? new Date(order.step4ProcessedAt) : new Date()

  for (const row of options.step3Summaries) {
    rows.push({
      date: step3Date,
      code: row.btpCode,
      name: row.btpName || row.btpCode,
      importQty: 0,
      exportQty: row.actualQty,
      unit: row.unit,
      note: `Xuất BTP cho công đoạn đóng gói (${row.locationName})`,
      remark: '',
    })
  }

  rows.push({
    date: step4Date,
    code: options.receiptLine.tpCode,
    name: options.receiptLine.tpName || options.receiptLine.tpCode,
    importQty: options.receiptLine.quantity,
    exportQty: 0,
    unit: options.receiptLine.unit,
    note: `Nhập TP hoàn tất lệnh ${order.orderRef ?? order.id}`,
    remark: options.receiptLine.notes || '',
  })

  return rows
}

function applyBorders(
  worksheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number,
) {
  for (let r = fromRow; r <= toRow; r += 1) {
    for (let c = fromCol; c <= toCol; c += 1) {
      const cell = worksheet.getCell(r, c)
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  }
}

function setCenter(cell: ExcelJS.Cell, bold = false) {
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  cell.font = { name: 'Times New Roman', size: 12, bold }
}

// Column layout (A-J, 10 columns):
// A: STT | B: Ngày | C: Mã vật tư | D: Tên vật tư | E: Nhập | F: Xuất | G: Tồn | H: ĐVT | I: Diễn giải | J: Ghi chú

export async function exportFinishedGoodsStockCard(options: ExportOptions): Promise<void> {
  const { order, receiptLine } = options
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('The kho thanh pham')

  worksheet.columns = [
    { width: 6 },  // A: STT
    { width: 14 }, // B: Ngày
    { width: 14 }, // C: Mã vật tư
    { width: 34 }, // D: Tên vật tư
    { width: 12 }, // E: Nhập
    { width: 12 }, // F: Xuất
    { width: 12 }, // G: Tồn
    { width: 8 },  // H: ĐVT
    { width: 32 }, // I: Diễn giải
    { width: 14 }, // J: Ghi chú
  ]

  // ── Title block ──────────────────────────────────────────────────────────────
  worksheet.mergeCells('A1:J1')
  worksheet.getCell('A1').value = 'THẺ KHO - THÀNH PHẨM'
  worksheet.getCell('A1').font = { name: 'Times New Roman', size: 18, bold: true }
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.mergeCells('A2:J2')
  worksheet.getCell('A2').value = '( CÔNG TY TNHH OHELAH COSMETICS )'
  worksheet.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true }
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.getCell('G3').value = 'Ngày lập thẻ :'
  worksheet.getCell('I3').value = formatDateVn(new Date())
  worksheet.getCell('G4').value = 'Tờ số :'
  worksheet.getCell('I4').value = order.orderRef ?? '---'

  // ── Order info ────────────────────────────────────────────────────────────────
  worksheet.getCell('A6').value = 'Tên sản phẩm :'
  worksheet.mergeCells('C6:G6')
  worksheet.getCell('C6').value =
    `${receiptLine.tpName || '---'} ${receiptLine.tpCode ? `(${receiptLine.tpCode})` : ''}`
  worksheet.getCell('A7').value = 'Ngày lập lệnh :'
  worksheet.getCell('C7').value = formatDateVn(order.createdAt)
  worksheet.getCell('A8').value = 'Số lượng đặt hàng :'
  worksheet.getCell('C8').value = formatQtyVn(receiptLine.plannedQty)
  worksheet.getCell('A9').value = 'Đơn vị tính :'
  worksheet.getCell('C9').value = receiptLine.unit || '---'

  for (const r of [6, 7, 8, 9]) {
    worksheet.getCell(`A${r}`).font = { name: 'Times New Roman', size: 12 }
    worksheet.getCell(`C${r}`).font = { name: 'Times New Roman', size: 12 }
  }

  // ── Table header (rows 11-12) ─────────────────────────────────────────────────
  worksheet.mergeCells('A11:A12')
  worksheet.getCell('A11').value = 'STT'
  worksheet.mergeCells('B11:B12')
  worksheet.getCell('B11').value = 'Ngày, tháng'
  worksheet.mergeCells('C11:C12')
  worksheet.getCell('C11').value = 'Mã vật tư'
  worksheet.mergeCells('D11:D12')
  worksheet.getCell('D11').value = 'Tên vật tư'
  worksheet.mergeCells('E11:E12')
  worksheet.getCell('E11').value = 'Nhập'
  worksheet.mergeCells('F11:F12')
  worksheet.getCell('F11').value = 'Xuất'
  worksheet.mergeCells('G11:G12')
  worksheet.getCell('G11').value = 'Tồn'
  worksheet.mergeCells('H11:H12')
  worksheet.getCell('H11').value = 'ĐVT'
  worksheet.mergeCells('I11:I12')
  worksheet.getCell('I11').value = 'Diễn giải'
  worksheet.mergeCells('J11:J12')
  worksheet.getCell('J11').value = 'Ghi chú'

  for (let col = 1; col <= 10; col += 1) {
    setCenter(worksheet.getCell(11, col), true)
    setCenter(worksheet.getCell(12, col), true)
  }
  worksheet.getRow(11).height = 24

  // ── Data rows ─────────────────────────────────────────────────────────────────
  let rowIdx = 13

  // Opening balance row
  worksheet.getCell(`B${rowIdx}`).value = '* TỒN KHO ĐẦU KỲ :'
  worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(0)
  worksheet.getCell(`B${rowIdx}`).font = { name: 'Times New Roman', bold: true, italic: true, size: 12 }
  worksheet.getCell(`G${rowIdx}`).font = { name: 'Times New Roman', size: 12 }
  worksheet.getCell(`G${rowIdx}`).alignment = { horizontal: 'center' }
  rowIdx += 1

  const rows = buildRows(order, options)
  const balanceByCode = new Map<string, number>()
  let stt = 1
  const totalNhap: Record<string, number> = {}
  const totalXuat: Record<string, number> = {}

  for (const m of rows) {
    const prev = balanceByCode.get(m.code) ?? 0
    const balance = prev + m.importQty - m.exportQty
    balanceByCode.set(m.code, balance)

    totalNhap[m.code] = (totalNhap[m.code] ?? 0) + m.importQty
    totalXuat[m.code] = (totalXuat[m.code] ?? 0) + m.exportQty

    worksheet.getCell(`A${rowIdx}`).value = stt
    worksheet.getCell(`B${rowIdx}`).value = formatDateVn(m.date)
    worksheet.getCell(`C${rowIdx}`).value = m.code
    worksheet.getCell(`D${rowIdx}`).value = m.name
    worksheet.getCell(`E${rowIdx}`).value = m.importQty > 0 ? formatQtyVn(m.importQty) : '-'
    worksheet.getCell(`F${rowIdx}`).value = m.exportQty > 0 ? formatQtyVn(m.exportQty) : '-'
    worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(balance)
    worksheet.getCell(`H${rowIdx}`).value = m.unit
    worksheet.getCell(`I${rowIdx}`).value = m.note
    worksheet.getCell(`J${rowIdx}`).value = m.remark

    for (let col = 1; col <= 8; col += 1) {
      worksheet.getCell(rowIdx, col).alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getCell(rowIdx, col).font = { name: 'Times New Roman', size: 12 }
    }
    worksheet.getCell(`D${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getCell(`I${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    worksheet.getCell(`J${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    worksheet.getCell(`I${rowIdx}`).font = { name: 'Times New Roman', size: 12 }
    worksheet.getCell(`J${rowIdx}`).font = { name: 'Times New Roman', size: 12 }

    stt += 1
    rowIdx += 1
  }

  // ── Totals row ────────────────────────────────────────────────────────────────
  const grandNhap = Object.values(totalNhap).reduce((s, v) => s + v, 0)
  const grandXuat = Object.values(totalXuat).reduce((s, v) => s + v, 0)
  const grandTon = grandNhap - grandXuat

  worksheet.mergeCells(`A${rowIdx}:C${rowIdx}`)
  worksheet.getCell(`A${rowIdx}`).value = 'TỔNG CỘNG'
  worksheet.getCell(`E${rowIdx}`).value = formatQtyVn(grandNhap)
  worksheet.getCell(`F${rowIdx}`).value = formatQtyVn(grandXuat)
  worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(grandTon)

  for (let col = 1; col <= 10; col += 1) {
    const cell = worksheet.getCell(rowIdx, col)
    cell.font = { name: 'Times New Roman', size: 12, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: col <= 8 ? 'center' : 'left' }
  }

  applyBorders(worksheet, 11, rowIdx, 1, 10)

  const fileSafeRef = (order.orderRef ?? `PO_${order.id}`).replace(/[^A-Za-z0-9_-]/g, '_')
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `The_kho_thanh_pham_${fileSafeRef}.xlsx`,
  )
}
