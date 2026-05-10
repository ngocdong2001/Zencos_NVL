/**
 * seed-production.cjs
 * Tạo dữ liệu test cho module Production:
 * - Thêm ProductUnit toàn cục: cái, hộp, bộ
 * - Tạo 7 sản phẩm mẫu (NVL + BTP + TP) dùng cho quy trình Melasma Cream 30g
 * - Tạo 2 ProductionOrder mẫu (1 draft, 1 in_progress) kèm đầy đủ lines + logs
 */

const { PrismaClient } = require('./node_modules/@prisma/client')
const p = new PrismaClient()
const ser = (o) => JSON.parse(JSON.stringify(o, (_, v) => typeof v === 'bigint' ? v.toString() : v))

// Known IDs from DB
const ADMIN_USER_ID  = 1n
const LOC_NVL_ID     = 1n   // Kho Long An (nguyên liệu)
const LOC_BTP_ID     = 8n   // KHO BÁN THÀNH PHẨM
const LOC_TP_ID      = 9n   // KHO THÀNH PHẨM
const UNIT_GRAM_ID   = 2n   // Gram

async function run() {
  console.log('--- Seed production data ---')

  // ─── 1. Ensure global units cái / hộp / bộ ───────────────────────────────
  async function ensureUnit(name) {
    const existing = await p.productUnit.findFirst({ where: { productId: null, unitName: name } })
    if (existing) return existing
    return p.productUnit.create({ data: { productId: null, unitName: name, conversionToBase: 1 } })
  }
  const unitCai = await ensureUnit('Cái')
  const unitHop = await ensureUnit('Hộp')
  const unitBo  = await ensureUnit('Bộ')
  console.log('Units:', ser({ cai: unitCai.id, hop: unitHop.id, bo: unitBo.id }))

  // ─── 2. Create products (skip if code exists) ─────────────────────────────
  const productDefs = [
    // NVL
    { code: 'MELASMA30-RM',  name: 'Nguyên liệu Melasma Cream',  baseUnitId: UNIT_GRAM_ID },
    { code: 'BOTTLE-30G',    name: 'Hũ nhựa 30g cao cấp',        baseUnitId: BigInt(unitCai.id) },
    { code: 'BOX-MELASMA',   name: 'Vỏ hộp giấy Melasma',        baseUnitId: BigInt(unitCai.id) },
    { code: 'LABEL-M30',     name: 'Tên nhãn chống giả Melasma', baseUnitId: BigInt(unitCai.id) },
    // BTP
    { code: 'MELASMA30-BTP', name: 'Bán thành phẩm Melasma Cream',baseUnitId: UNIT_GRAM_ID },
    { code: 'PKG-KIT-30G',   name: 'Bộ kit đóng gói Melasma 30g', baseUnitId: BigInt(unitBo.id) },
    // TP
    { code: 'MELASMA30-TP',  name: 'Kem Melasma Cream 30g (thành phẩm)', baseUnitId: BigInt(unitHop.id) },
  ]

  const products = {}
  for (const def of productDefs) {
    const existing = await p.product.findUnique({ where: { code: def.code } })
    if (existing) {
      products[def.code] = existing
      console.log(`  Skip existing product: ${def.code}`)
    } else {
      const created = await p.product.create({
        data: {
          code:         def.code,
          name:         def.name,
          baseUnit:     def.baseUnitId,
          hasExpiry:    true,
          useFefo:      true,
          minStockLevel: 0,
        },
      })
      products[def.code] = created
      console.log(`  Created product: ${def.code} (id=${created.id})`)
    }
  }

  // ─── 3. Create ProductionOrder #1 — draft, step 1 ────────────────────────
  const order1 = await p.productionOrder.create({
    data: {
      orderRef:    'PSX-20240515-0089',
      issuedAt:    new Date('2024-05-15'),
      skuCode:     'MELASMA30-TP',
      skuName:     'Kem Melasma Cream 30g (thành phẩm)',
      productType: 'Mỹ phẩm - Kem dưỡng',
      status:      'draft',
      currentStep: 1,
      createdBy:   ADMIN_USER_ID,
      skuProductId: BigInt(products['MELASMA30-TP'].id),
      notes:       'Đợt sản xuất tháng 5/2024 – lô 700 hộp',
      lines: {
        create: [
          // Step 1 – Xuất NVL (direction=out, location=kho NVL)
          { step: 1, direction: 'out', productId: BigInt(products['MELASMA30-RM'].id),  productCode: 'MELASMA30-RM',  productName: 'Nguyên liệu Melasma Cream',    lotNo: 'L2405-001', plannedQty: 20000, actualQty: 20000, wasteQty: 0,  unit: 'g',   locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['BOTTLE-30G'].id),    productCode: 'BOTTLE-30G',    productName: 'Hũ nhựa 30g cao cấp',           lotNo: 'PKG-0992',  plannedQty: 700,   actualQty: 700,   wasteQty: 0,  unit: 'cái', locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['BOX-MELASMA'].id),   productCode: 'BOX-MELASMA',   productName: 'Vỏ hộp giấy Melasma',           lotNo: 'PKG-1005',  plannedQty: 700,   actualQty: 700,   wasteQty: 0,  unit: 'cái', locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['LABEL-M30'].id),     productCode: 'LABEL-M30',     productName: 'Tên nhãn chống giả Melasma',    lotNo: 'LBL-554',   plannedQty: 700,   actualQty: 700,   wasteQty: 0,  unit: 'cái', locationId: LOC_NVL_ID },
        ],
      },
      logs: {
        create: [
          { userId: ADMIN_USER_ID, userName: 'admin@zencos.local', action: 'Khởi tạo phiếu từ Lệnh sản xuất LSX-2024-001', logType: 'system',  createdAt: new Date('2024-05-15T14:30:00') },
        ],
      },
    },
  })
  console.log('Created order1:', ser(order1.id), order1.orderRef)

  // ─── 4. Create ProductionOrder #2 — in_progress, step 2 ──────────────────
  const order2 = await p.productionOrder.create({
    data: {
      orderRef:    'PSX-20240520-0095',
      issuedAt:    new Date('2024-05-20'),
      skuCode:     'MELASMA30-TP',
      skuName:     'Kem Melasma Cream 30g (thành phẩm)',
      productType: 'Mỹ phẩm - Kem dưỡng',
      status:      'in_progress',
      currentStep: 2,
      createdBy:   ADMIN_USER_ID,
      skuProductId: BigInt(products['MELASMA30-TP'].id),
      notes:       'Đợt sản xuất tháng 5/2024 – lô thứ 2',
      lines: {
        create: [
          // Step 1 – Xuất NVL (completed)
          { step: 1, direction: 'out', productId: BigInt(products['MELASMA30-RM'].id), productCode: 'MELASMA30-RM', productName: 'Nguyên liệu Melasma Cream',  lotNo: 'L2405-002', plannedQty: 20000, actualQty: 20000, wasteQty: 0,   unit: 'g',   locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['BOTTLE-30G'].id),   productCode: 'BOTTLE-30G',   productName: 'Hũ nhựa 30g cao cấp',         lotNo: 'PKG-1010',  plannedQty: 700,   actualQty: 700,   wasteQty: 0,   unit: 'cái', locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['BOX-MELASMA'].id),  productCode: 'BOX-MELASMA',  productName: 'Vỏ hộp giấy Melasma',         lotNo: 'PKG-1020',  plannedQty: 700,   actualQty: 700,   wasteQty: 0,   unit: 'cái', locationId: LOC_NVL_ID },
          { step: 1, direction: 'out', productId: BigInt(products['LABEL-M30'].id),    productCode: 'LABEL-M30',    productName: 'Tên nhãn chống giả Melasma',   lotNo: 'LBL-560',   plannedQty: 700,   actualQty: 700,   wasteQty: 0,   unit: 'cái', locationId: LOC_NVL_ID },
          // Step 2 – Nhập BTP (direction=in, location=kho BTP)
          { step: 2, direction: 'in',  productId: BigInt(products['MELASMA30-BTP'].id),productCode: 'MELASMA30-BTP',productName: 'Bán thành phẩm Melasma Cream', lotNo: 'BTP-2405-002', expiryDate: new Date('2026-11-20'), plannedQty: 19850, actualQty: 19850, wasteQty: 150, unit: 'g',   locationId: LOC_BTP_ID },
          { step: 2, direction: 'in',  productId: BigInt(products['PKG-KIT-30G'].id),  productCode: 'PKG-KIT-30G',  productName: 'Bộ kit đóng gói Melasma 30g',  lotNo: 'KIT-1010',    expiryDate: null,              plannedQty: 660,   actualQty: 660,   wasteQty: 40,  unit: 'bộ',  locationId: LOC_BTP_ID },
        ],
      },
      logs: {
        create: [
          { userId: ADMIN_USER_ID, userName: 'admin@zencos.local', action: 'Khởi tạo phiếu sản xuất PSX-20240520-0095',              logType: 'system',  createdAt: new Date('2024-05-20T08:00:00') },
          { userId: ADMIN_USER_ID, userName: 'admin@zencos.local', action: 'Bước 1 – Xuất NVL hoàn thành (4 dòng)',                   logType: 'process', createdAt: new Date('2024-05-20T09:30:00') },
          { userId: ADMIN_USER_ID, userName: 'admin@zencos.local', action: 'Hệ thống tự động tính toán hao hụt theo định mức công thức', logType: 'system',  createdAt: new Date('2024-05-20T09:35:00') },
          { userId: ADMIN_USER_ID, userName: 'admin@zencos.local', action: 'Chuyển sang Bước 2 – Nhập BTP',                           logType: 'process', createdAt: new Date('2024-05-20T10:00:00') },
        ],
      },
    },
  })
  console.log('Created order2:', ser(order2.id), order2.orderRef)

  console.log('--- Seed completed ---')
}

run().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
