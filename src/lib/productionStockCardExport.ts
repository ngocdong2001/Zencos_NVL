import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ProductionOrderDetail } from './productionApi'

interface StockCardSummaryRow {
  locationName: string
  btpCode: string
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

interface MovementRow {
  date: Date
  importBtp: number
  importTp: number
  exportBtp: number
  exportTp: number
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

function buildMovements(order: ProductionOrderDetail, options: ExportOptions): MovementRow[] {
  const createdAt = new Date(order.createdAt)
  const movements: MovementRow[] = []

  for (const row of options.step3Summaries) {
    movements.push({
      date: createdAt,
      importBtp: 0,
      importTp: 0,
      exportBtp: row.actualQty,
      exportTp: 0,
      note: `XK BTP ${row.btpCode} cho công đoạn đóng gói`,
      remark: row.locationName,
    })
  }

  movements.push({
    date: new Date(),
    importBtp: 0,
    importTp: options.receiptLine.quantity,
    exportBtp: 0,
    exportTp: 0,
    note: `NK TP hoàn tất lệnh ${order.orderRef}`,
    remark: options.receiptLine.notes || '',
  })

  return movements
}

function applyBorders(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) {
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

export async function exportFinishedGoodsStockCard(options: ExportOptions): Promise<void> {
  const { order, receiptLine } = options
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('The kho thanh pham')

  worksheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 28 },
    { width: 10 },
    { width: 14 },
  ]

  worksheet.mergeCells('A1:K1')
  worksheet.getCell('A1').value = 'THẺ KHO - THÀNH PHẨM'
  worksheet.getCell('A1').font = { name: 'Times New Roman', size: 18, bold: true }
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.mergeCells('A2:K2')
  worksheet.getCell('A2').value = '( CÔNG TY TNHH OHELAH COSMETICS )'
  worksheet.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true }
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.getCell('G3').value = 'Ngày lập thẻ :'
  worksheet.getCell('I3').value = formatDateVn(new Date())
  worksheet.getCell('G4').value = 'Tờ số :'
  worksheet.getCell('I4').value = order.orderRef ?? '---'

  worksheet.getCell('A6').value = 'Tên sản phẩm :'
  worksheet.mergeCells('C6:G6')
  worksheet.getCell('C6').value = `${receiptLine.tpName || '---'} ${receiptLine.tpCode ? `(${receiptLine.tpCode})` : ''}`
  worksheet.getCell('A7').value = 'Ngày đặt hàng :'
  worksheet.getCell('C7').value = formatDateVn(order.createdAt)
  worksheet.getCell('A8').value = 'Số lượng đặt hàng :'
  worksheet.getCell('C8').value = formatQtyVn(receiptLine.plannedQty)
  worksheet.getCell('A9').value = 'Đơn vị tính :'
  worksheet.getCell('C9').value = receiptLine.unit || '---'

  worksheet.mergeCells('A11:A13')
  worksheet.getCell('A11').value = 'STT'
  worksheet.mergeCells('B11:B13')
  worksheet.getCell('B11').value = 'Ngày, tháng'

  worksheet.mergeCells('C11:D11')
  worksheet.getCell('C11').value = 'Nhập'
  worksheet.mergeCells('E11:F11')
  worksheet.getCell('E11').value = 'Xuất'
  worksheet.mergeCells('G11:H11')
  worksheet.getCell('G11').value = 'Tồn'

  worksheet.getCell('C12').value = 'BTP'
  worksheet.getCell('D12').value = 'TP'
  worksheet.getCell('E12').value = 'BTP'
  worksheet.getCell('F12').value = 'TP'
  worksheet.getCell('G12').value = 'BTP'
  worksheet.getCell('H12').value = 'TP'

  worksheet.mergeCells('I11:I13')
  worksheet.getCell('I11').value = 'Diễn giải'
  worksheet.mergeCells('J11:J13')
  worksheet.getCell('J11').value = 'Ký nhận'
  worksheet.mergeCells('K11:K13')
  worksheet.getCell('K11').value = 'Ghi chú'

  for (let col = 1; col <= 11; col += 1) {
    setCenter(worksheet.getCell(11, col), true)
    setCenter(worksheet.getCell(12, col), true)
    setCenter(worksheet.getCell(13, col), true)
  }

  let rowIdx = 14
  let runningBtp = 0
  let runningTp = 0
  const movements = buildMovements(order, options)

  worksheet.getCell(`B${rowIdx}`).value = '* TỒN KHO ĐẦU KỲ :'
  worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(runningBtp)
  worksheet.getCell(`H${rowIdx}`).value = formatQtyVn(runningTp)
  worksheet.getCell(`B${rowIdx}`).font = { name: 'Times New Roman', bold: true, italic: true }
  rowIdx += 1

  let stt = 1
  let totalImportBtp = 0
  let totalImportTp = 0
  let totalExportBtp = 0
  let totalExportTp = 0

  for (const m of movements) {
    runningBtp += m.importBtp - m.exportBtp
    runningTp += m.importTp - m.exportTp

    totalImportBtp += m.importBtp
    totalImportTp += m.importTp
    totalExportBtp += m.exportBtp
    totalExportTp += m.exportTp

    worksheet.getCell(`A${rowIdx}`).value = stt
    worksheet.getCell(`B${rowIdx}`).value = formatDateVn(m.date)
    worksheet.getCell(`C${rowIdx}`).value = m.importBtp ? formatQtyVn(m.importBtp) : '-'
    worksheet.getCell(`D${rowIdx}`).value = m.importTp ? formatQtyVn(m.importTp) : '-'
    worksheet.getCell(`E${rowIdx}`).value = m.exportBtp ? formatQtyVn(m.exportBtp) : '-'
    worksheet.getCell(`F${rowIdx}`).value = m.exportTp ? formatQtyVn(m.exportTp) : '-'
    worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(runningBtp)
    worksheet.getCell(`H${rowIdx}`).value = formatQtyVn(runningTp)
    worksheet.getCell(`I${rowIdx}`).value = m.note
    worksheet.getCell(`J${rowIdx}`).value = ''
    worksheet.getCell(`K${rowIdx}`).value = m.remark

    for (let col = 1; col <= 8; col += 1) {
      worksheet.getCell(rowIdx, col).alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getCell(rowIdx, col).font = { name: 'Times New Roman', size: 12 }
    }

    worksheet.getCell(`I${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    worksheet.getCell(`K${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    worksheet.getCell(`I${rowIdx}`).font = { name: 'Times New Roman', size: 12 }
    worksheet.getCell(`K${rowIdx}`).font = { name: 'Times New Roman', size: 12 }

    stt += 1
    rowIdx += 1
  }

  worksheet.getCell(`A${rowIdx}`).value = 'TỔNG CỘNG'
  worksheet.mergeCells(`A${rowIdx}:B${rowIdx}`)
  worksheet.getCell(`C${rowIdx}`).value = formatQtyVn(totalImportBtp)
  worksheet.getCell(`D${rowIdx}`).value = formatQtyVn(totalImportTp)
  worksheet.getCell(`E${rowIdx}`).value = formatQtyVn(totalExportBtp)
  worksheet.getCell(`F${rowIdx}`).value = formatQtyVn(totalExportTp)
  worksheet.getCell(`G${rowIdx}`).value = formatQtyVn(runningBtp)
  worksheet.getCell(`H${rowIdx}`).value = formatQtyVn(runningTp)

  for (let col = 1; col <= 11; col += 1) {
    const cell = worksheet.getCell(rowIdx, col)
    cell.font = { name: 'Times New Roman', size: 12, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: col <= 8 ? 'center' : 'left' }
  }

  applyBorders(worksheet, 11, rowIdx, 1, 11)

  const fileSafeRef = (order.orderRef ?? `PO_${order.id}`).replace(/[^A-Za-z0-9_-]/g, '_')
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `The_kho_thanh_pham_${fileSafeRef}.xlsx`)
}
