const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  // Kiểm tra product output_product_id=1
  const p = await prisma.$queryRawUnsafe('SELECT id, sku_code, sku_name FROM products_outputs WHERE id = 1')
  console.log('Product #1:', JSON.stringify(p, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))

  // Kiểm tra toàn bộ trạng thái sau backfill
  const txAll = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.type, t.batch_lot_no, t.batch_expiry_date, t.quantity_base, 
           op.sku_code, op.sku_name
    FROM production_output_transactions t
    LEFT JOIN products_outputs op ON op.id = t.output_product_id
    ORDER BY t.id
  `)
  console.log('\nTất cả production_output_transactions:')
  console.log(JSON.stringify(txAll, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
