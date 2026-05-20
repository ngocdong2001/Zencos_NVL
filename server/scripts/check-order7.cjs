const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const r = await prisma.$queryRawUnsafe('SELECT id, order_ref, sku_name, sku_code FROM production_orders WHERE id = 7')
  console.log('Lệnh SX #7:', JSON.stringify(r, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
