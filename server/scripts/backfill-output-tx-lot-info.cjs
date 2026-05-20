/**
 * backfill-output-tx-lot-info.cjs
 *
 * Cập nhật lại batch_lot_no và batch_expiry_date cho các dòng
 * production_output_transactions có type = 'import_from_production'
 * bằng cách JOIN với production_order_lines (step=4, direction='in').
 *
 * Chỉ xử lý các dòng có batch_lot_no = '' (rỗng sau khi đã fix NULL → '').
 *
 * Chạy: node server/scripts/backfill-output-tx-lot-info.cjs
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Lấy tất cả tx cần backfill
  const txList = await prisma.$queryRawUnsafe(`
    SELECT
      t.id,
      t.production_order_id,
      t.output_product_id,
      t.batch_lot_no,
      t.batch_expiry_date
    FROM production_output_transactions t
    WHERE t.type = 'import_from_production'
      AND t.batch_lot_no = ''
    ORDER BY t.id ASC
  `)

  if (!txList.length) {
    console.log('Không có dòng nào cần backfill.')
    return
  }

  console.log(`Tìm thấy ${txList.length} dòng cần backfill.`)

  let updated = 0
  let skipped = 0

  for (const tx of txList) {
    // Tìm line step=4, direction='in' khớp với (order_id, output_product_id)
    const lines = await prisma.$queryRawUnsafe(`
      SELECT lot_no, expiry_date
      FROM production_order_lines
      WHERE order_id = ?
        AND step = 4
        AND direction = 'in'
        AND output_product_id = ?
      LIMIT 1
    `, tx.production_order_id, tx.output_product_id)

    if (!lines.length || lines[0].lot_no === null) {
      console.log(`  SKIP tx#${tx.id} — không tìm thấy line tương ứng hoặc lot_no null`)
      skipped++
      continue
    }

    const { lot_no, expiry_date } = lines[0]

    await prisma.$executeRawUnsafe(`
      UPDATE production_output_transactions
      SET batch_lot_no = ?,
          batch_expiry_date = ?
      WHERE id = ?
    `, lot_no, expiry_date ?? null, tx.id)

    console.log(`  OK tx#${tx.id}: lot_no="${lot_no}", expiry=${expiry_date ? expiry_date.toISOString().slice(0,10) : 'null'}`)
    updated++
  }

  console.log(`\nHoàn tất: ${updated} dòng cập nhật, ${skipped} dòng bỏ qua.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
