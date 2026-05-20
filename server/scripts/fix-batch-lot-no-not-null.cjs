const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.$executeRawUnsafe(
    "UPDATE production_output_transactions SET batch_lot_no = '' WHERE batch_lot_no IS NULL"
  )
  console.log(`Updated ${updated} NULL rows to empty string`)

  await prisma.$executeRawUnsafe(
    "ALTER TABLE production_output_transactions MODIFY COLUMN batch_lot_no VARCHAR(100) NOT NULL DEFAULT ''"
  )
  console.log('Column altered: batch_lot_no is now NOT NULL DEFAULT empty string')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
