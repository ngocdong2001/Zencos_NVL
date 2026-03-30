import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-HQ' },
    update: { name: 'Headquarters Warehouse', address: '15 Tran Hung Dao, Ho Chi Minh City' },
    create: {
      code: 'WH-HQ',
      name: 'Headquarters Warehouse',
      address: '15 Tran Hung Dao, Ho Chi Minh City',
    },
  })

  const unit = await prisma.unit.upsert({
    where: { code: 'PCS' },
    update: { name: 'Piece' },
    create: { code: 'PCS', name: 'Piece' },
  })

  const categoryHardware = await prisma.category.upsert({
    where: { code: 'CAT-HARDWARE' },
    update: { name: 'Business Hardware' },
    create: { code: 'CAT-HARDWARE', name: 'Business Hardware' },
  })

  const categoryServices = await prisma.category.upsert({
    where: { code: 'CAT-SERVICES' },
    update: { name: 'Business Services' },
    create: { code: 'CAT-SERVICES', name: 'Business Services' },
  })

  const brandNorth = await prisma.brand.upsert({
    where: { code: 'BR-NORTH' },
    update: { name: 'North Axis' },
    create: { code: 'BR-NORTH', name: 'North Axis' },
  })

  const brandPulse = await prisma.brand.upsert({
    where: { code: 'BR-PULSE' },
    update: { name: 'Pulse Systems' },
    create: { code: 'BR-PULSE', name: 'Pulse Systems' },
  })

  const taxRate = await prisma.taxRate.upsert({
    where: { code: 'VAT10' },
    update: { name: 'VAT 10%', rate: 10 },
    create: { code: 'VAT10', name: 'VAT 10%', rate: 10 },
  })

  await prisma.currency.upsert({
    where: { code: 'VND' },
    update: { name: 'Vietnamese Dong', symbol: '₫' },
    create: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  })

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { code: 'CUST-NORTHWIND' },
      update: { name: 'Northwind Retail', phone: '0901000001', email: 'ops@northwind.vn', note: 'Key retail account' },
      create: { code: 'CUST-NORTHWIND', name: 'Northwind Retail', phone: '0901000001', email: 'ops@northwind.vn', note: 'Key retail account' },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-LUMEN' },
      update: { name: 'Lumen Health', phone: '0901000002', email: 'finance@lumen.vn', note: 'Healthcare vertical' },
      create: { code: 'CUST-LUMEN', name: 'Lumen Health', phone: '0901000002', email: 'finance@lumen.vn', note: 'Healthcare vertical' },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-APEX' },
      update: { name: 'Apex Commerce', phone: '0901000003', email: 'admin@apex.vn', note: 'Multi-store operator' },
      create: { code: 'CUST-APEX', name: 'Apex Commerce', phone: '0901000003', email: 'admin@apex.vn', note: 'Multi-store operator' },
    }),
  ])

  const products = await Promise.all([
    prisma.product.upsert({
      where: { code: 'PRD-POS-KIT' },
      update: {
        name: 'POS Starter Kit',
        description: 'Touch screen terminal bundle for storefront rollout.',
        categoryId: categoryHardware.id,
        brandId: brandNorth.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 7200000,
        sellPrice: 9900000,
        alertQty: 8,
      },
      create: {
        code: 'PRD-POS-KIT',
        name: 'POS Starter Kit',
        description: 'Touch screen terminal bundle for storefront rollout.',
        categoryId: categoryHardware.id,
        brandId: brandNorth.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 7200000,
        sellPrice: 9900000,
        alertQty: 8,
      },
    }),
    prisma.product.upsert({
      where: { code: 'PRD-LABEL-PRINTER' },
      update: {
        name: 'Label Printer X2',
        description: 'High-volume label printer for warehouse and retail.',
        categoryId: categoryHardware.id,
        brandId: brandPulse.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 2300000,
        sellPrice: 3200000,
        alertQty: 6,
      },
      create: {
        code: 'PRD-LABEL-PRINTER',
        name: 'Label Printer X2',
        description: 'High-volume label printer for warehouse and retail.',
        categoryId: categoryHardware.id,
        brandId: brandPulse.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 2300000,
        sellPrice: 3200000,
        alertQty: 6,
      },
    }),
    prisma.product.upsert({
      where: { code: 'PRD-ERP-CARE' },
      update: {
        name: 'ERP Care Subscription',
        description: '12-month managed support subscription.',
        categoryId: categoryServices.id,
        brandId: brandNorth.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 1200000,
        sellPrice: 1800000,
        alertQty: 2,
      },
      create: {
        code: 'PRD-ERP-CARE',
        name: 'ERP Care Subscription',
        description: '12-month managed support subscription.',
        categoryId: categoryServices.id,
        brandId: brandNorth.id,
        unitId: unit.id,
        taxRateId: taxRate.id,
        costPrice: 1200000,
        sellPrice: 1800000,
        alertQty: 2,
      },
    }),
  ])

  const [posKit, labelPrinter, erpCare] = products

  await prisma.warehouseProduct.upsert({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: posKit.id } },
    update: { qty: 18 },
    create: { warehouseId: warehouse.id, productId: posKit.id, qty: 18 },
  })
  await prisma.warehouseProduct.upsert({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: labelPrinter.id } },
    update: { qty: 11 },
    create: { warehouseId: warehouse.id, productId: labelPrinter.id, qty: 11 },
  })
  await prisma.warehouseProduct.upsert({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: erpCare.id } },
    update: { qty: 4 },
    create: { warehouseId: warehouse.id, productId: erpCare.id, qty: 4 },
  })

  const saleOne = await prisma.sale.findUnique({ where: { reference: 'SAL-1001' } })
  if (!saleOne) {
    const created = await prisma.sale.create({
      data: {
        reference: 'SAL-1001',
        customerId: customers[0].id,
        warehouseId: warehouse.id,
        status: 'delivered',
        paymentStatus: 'paid',
        discount: 300000,
        tax: 990000,
        shipping: 150000,
        grandTotal: 10650000,
        paid: 10650000,
        note: 'Demo order for dashboard walkthrough',
        items: {
          create: [
            { productId: posKit.id, qty: 1, unitPrice: 9900000, discount: 300000, tax: 990000, subtotal: 10590000 },
            { productId: erpCare.id, qty: 0.5, unitPrice: 1800000, discount: 0, tax: 60000, subtotal: 960000 },
          ],
        },
      },
    })

    await prisma.salePayment.create({
      data: { saleId: created.id, amount: 10650000, method: 'bank', note: 'Demo full payment' },
    })
  }

  const saleTwo = await prisma.sale.findUnique({ where: { reference: 'SAL-1002' } })
  if (!saleTwo) {
    const created = await prisma.sale.create({
      data: {
        reference: 'SAL-1002',
        customerId: customers[1].id,
        warehouseId: warehouse.id,
        status: 'confirmed',
        paymentStatus: 'partial',
        discount: 0,
        tax: 320000,
        shipping: 80000,
        grandTotal: 3600000,
        paid: 1800000,
        note: 'Demo partially paid invoice',
        items: {
          create: [
            { productId: labelPrinter.id, qty: 1, unitPrice: 3200000, discount: 0, tax: 320000, subtotal: 3520000 },
          ],
        },
      },
    })

    await prisma.salePayment.create({
      data: { saleId: created.id, amount: 1800000, method: 'cash', note: 'Deposit received' },
    })
  }

  const saleThree = await prisma.sale.findUnique({ where: { reference: 'SAL-1003' } })
  if (!saleThree) {
    await prisma.sale.create({
      data: {
        reference: 'SAL-1003',
        customerId: customers[2].id,
        warehouseId: warehouse.id,
        status: 'pending',
        paymentStatus: 'unpaid',
        discount: 100000,
        tax: 198000,
        shipping: 50000,
        grandTotal: 2128000,
        paid: 0,
        note: 'Demo unpaid order',
        items: {
          create: [
            { productId: erpCare.id, qty: 1, unitPrice: 1800000, discount: 100000, tax: 198000, subtotal: 1898000 },
          ],
        },
      },
    })
  }

  console.log('Demo data seeded: customers, products, inventory, and sales')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
