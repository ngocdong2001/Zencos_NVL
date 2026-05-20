const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const bigIntReplacer = (_, v) => (typeof v === 'bigint' ? v.toString() : v)

async function main() {
  // Lấy tx#3
  const txRows = await prisma.$queryRawUnsafe(
    'SELECT id, production_order_id, output_product_id, batch_lot_no, batch_expiry_date, type FROM production_output_transactions WHERE id = 3'
  )
  console.log('=== TX#3 ===')
  console.log(JSON.stringify(txRows, bigIntReplacer, 2))

  if (!txRows.length) {
    console.log('TX#3 không tồn tại.')
    return
  }

  const tx = txRows[0]
  const orderId = tx.production_order_id

  // Tất cả lines của lệnh sản xuất này
  const allLines = await prisma.$queryRawUnsafe(
    'SELECT id, step, direction, output_product_id, product_code, lot_no, expiry_date FROM production_order_lines WHERE order_id = ? ORDER BY step, direction',
    orderId
  )
  console.log(`\n=== Lines của lệnh SX #${orderId} ===`)
  console.log(JSON.stringify(allLines, bigIntReplacer, 2))

  // Tất cả tx cùng production_order_id
  const allTx = await prisma.$queryRawUnsafe(
    'SELECT id, type, output_product_id, batch_lot_no, batch_expiry_date, quantity_base FROM production_output_transactions WHERE production_order_id = ? ORDER BY id',
    orderId
  )
  console.log(`\n=== Tất cả TX của lệnh SX #${orderId} ===`)
  console.log(JSON.stringify(allTx, bigIntReplacer, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
