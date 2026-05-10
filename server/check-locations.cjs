const {PrismaClient} = require('./node_modules/@prisma/client')
const p = new PrismaClient()
const ser = (o) => JSON.parse(JSON.stringify(o, (_, v) => typeof v === 'bigint' ? v.toString() : v))

Promise.all([
  p.productUnit.findMany({ where: { productId: null }, select: { id: true, unitName: true }, take: 10 }),
  p.productClassification.findMany({ select: { id: true, code: true, name: true }, take: 10 }),
]).then(([units, cats]) => {
  console.log('=== GLOBAL UNITS ===', ser(units))
  console.log('=== CLASSIFICATIONS ===', ser(cats))
}).catch(e => console.error(e)).finally(() => p.$disconnect())

