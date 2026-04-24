import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const router = Router()

const NEAR_EXPIRY_DAYS = 60
const MONITOR_EXPIRY_DAYS = 180

function lotStatus(expiryDate: Date | null): 'near_expiration' | 'monitoring' | 'normal' {
  if (!expiryDate) return 'normal'
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= NEAR_EXPIRY_DAYS) return 'near_expiration'
  if (daysLeft <= MONITOR_EXPIRY_DAYS) return 'monitoring'
  return 'normal'
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helper: summary stats (4 queries in Promise.all)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function querySummary() {
  const now = new Date()
  const cutoff60 = new Date(now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const [totalMaterials, nearExpirationCount, lowStockAgg, valueAgg] = await Promise.all([
    prisma.product.count({
      where: {
        deletedAt: null,
        batches: { some: { deletedAt: null, currentQtyBase: { gt: 0 } } },
      },
    }),
    prisma.product.count({
      where: {
        deletedAt: null,
        batches: {
          some: {
            deletedAt: null,
            currentQtyBase: { gt: 0 },
            expiryDate: { lte: cutoff60 },
          },
        },
      },
    }),
    prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*) AS cnt
      FROM products p
      WHERE p.deleted_at IS NULL
        AND p.min_stock_level > 0
        AND (
          SELECT COALESCE(SUM(b.current_qty_base), 0)
          FROM batches b
          WHERE b.product_id = p.id AND b.deleted_at IS NULL
        ) < p.min_stock_level
    `,
    prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>`
      SELECT SUM(b.current_qty_base / COALESCE(pu.conversion_to_base, 1) * b.unit_price_per_kg) AS total
      FROM batches b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN product_units pu ON pu.id = p.order_unit
      WHERE b.deleted_at IS NULL AND b.current_qty_base > 0
    `,
  ])

  return {
    totalMaterials,
    nearExpirationCount,
    lowStockCount: Number(lowStockAgg[0]?.cnt ?? 0),
    totalInventoryValue: Number(valueAgg[0]?.total ?? 0),
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helper: paginated items + tx aggregation
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ItemsParams = {
  filter: string
  q: string | undefined
  page: string
  limit: string
  dateFrom: string | undefined
  dateTo: string | undefined
}

async function queryItems(p: ItemsParams) {
  const skip = (Number(p.page) - 1) * Number(p.limit)
  const take = Math.min(Number(p.limit), 100)
  const cutoff60 = new Date(Date.now() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const dateFromDate = p.dateFrom ? new Date(p.dateFrom + 'T00:00:00.000Z') : null
  const dateToDate   = p.dateTo   ? new Date(p.dateTo   + 'T23:59:59.999Z') : null

  const productWhere: Prisma.ProductWhereInput = { deletedAt: null }

  if (p.q) {
    productWhere.OR = [
      { code: { contains: p.q } },
      { name: { contains: p.q } },
      { inciName: { contains: p.q } },
      { inciNames: { some: { inciName: { contains: p.q } } } },
    ]
  }

  if (p.filter === 'expiring_soon') {
    productWhere.batches = {
      some: { deletedAt: null, currentQtyBase: { gt: 0 }, expiryDate: { lte: cutoff60 } },
    }
  } else if (p.filter === 'low_stock') {
    productWhere.minStockLevel = { gt: 0 }
  }

  // Round 1: products page + count in parallel
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      include: {
        baseUnitRef: { select: { unitName: true } },
        batches: {
          where: { deletedAt: null, currentQtyBase: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, unitPricePerKg: true, currentQtyBase: true },
        },
        orderUnitRef: { select: { conversionToBase: true } },
      },
      skip,
      take,
      orderBy: { code: 'asc' },
    }),
    prisma.product.count({ where: productWhere }),
  ])

  // Round 2: tx aggregation (needs productIds)
  type TxAgg = { productId: bigint; openingQty: Prisma.Decimal | null; importQty: Prisma.Decimal | null; exportQty: Prisma.Decimal | null }
  const txAggMap = new Map<string, { openingQty: number; importQty: number; exportQty: number }>()

  if (products.length > 0) {
    const productIds = products.map(prod => prod.id)

    const beforeFromCond = dateFromDate
      ? Prisma.sql`it.transaction_date < ${dateFromDate}`
      : Prisma.sql`FALSE`
    const inPeriodFromCond = dateFromDate
      ? Prisma.sql`it.transaction_date >= ${dateFromDate}`
      : Prisma.sql`TRUE`
    const inPeriodToCond = dateToDate
      ? Prisma.sql`it.transaction_date <= ${dateToDate}`
      : Prisma.sql`TRUE`

    const rows = await prisma.$queryRaw<TxAgg[]>`
      SELECT
        b.product_id AS productId,
        SUM(CASE WHEN (${beforeFromCond}) AND it.type = 'import'  THEN  ABS(it.quantity_base)
                 WHEN (${beforeFromCond}) AND it.type = 'export'  THEN -ABS(it.quantity_base)
                 WHEN (${beforeFromCond}) AND it.type = 'adjustment' THEN it.quantity_base
                 ELSE 0 END) AS openingQty,
        GREATEST(0,
          SUM(CASE WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND it.type = 'import'     THEN  ABS(it.quantity_base)
                   WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND it.type = 'adjustment' THEN  it.quantity_base
                   ELSE 0 END)
        ) AS importQty,
        SUM(CASE WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND it.type = 'export' THEN ABS(it.quantity_base)
                 ELSE 0 END) AS exportQty
      FROM inventory_transactions it
      JOIN batches b ON b.id = it.batch_id
      WHERE b.product_id IN (${Prisma.join(productIds)})
        AND b.deleted_at IS NULL
      GROUP BY b.product_id
    `

    for (const row of rows) {
      txAggMap.set(String(row.productId), {
        openingQty: Number(row.openingQty ?? 0),
        importQty:  Number(row.importQty  ?? 0),
        exportQty:  Number(row.exportQty  ?? 0),
      })
    }
  }

  const items = products.map((product) => {
    const agg = txAggMap.get(String(product.id)) ?? { openingQty: 0, importQty: 0, exportQty: 0 }
    const stockQty = product.batches.reduce((sum, b) => sum + Number(b.currentQtyBase), 0)
    const priceConv = Number(product.orderUnitRef?.conversionToBase ?? 1) || 1
    return {
      id: String(product.id),
      code: product.code,
      inciName: product.inciName ?? '',
      tradeName: product.name,
      unit: product.baseUnitRef?.unitName ?? 'g',
      openingQuantity: agg.openingQty,
      importQuantity:  agg.importQty,
      exportQuantity:  agg.exportQty,
      stockQuantity: stockQty,
      totalStockQuantity: stockQty,
      value: product.batches.reduce((acc, b) => acc + (Number(b.currentQtyBase) / priceConv) * Number(b.unitPricePerKg), 0),
    }
  })

  const filtered = p.filter === 'low_stock'
    ? items.filter((item) => item.stockQuantity < Number(products.find((prod) => String(prod.id) === item.id)?.minStockLevel ?? 0))
    : items

  return { items: filtered, total: p.filter === 'low_stock' ? filtered.length : total }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/warehouse  â€” combined: summary + items in parallel
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', async (req: Request, res: Response) => {
  const { filter = 'all', q, page = '1', limit = '10', dateFrom, dateTo } =
    req.query as Record<string, string>

  const [summary, itemsResult] = await Promise.all([
    querySummary(),
    queryItems({ filter, q, page, limit, dateFrom, dateTo }),
  ])

  res.json({ summary, items: itemsResult.items, total: itemsResult.total })
})

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/warehouse/summary  (kept for backward compat)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/summary', async (_req: Request, res: Response) => {
  res.json(await querySummary())
})


// ──────────────────────────────────────────────────────────────────────
// GET /api/warehouse/items  (kept for backward compat)
// ──────────────────────────────────────────────────────────────────────
router.get('/items', async (req: Request, res: Response) => {
  const { filter = 'all', q, page = '1', limit = '10', dateFrom, dateTo } =
    req.query as Record<string, string>
  res.json(await queryItems({ filter, q, page, limit, dateFrom, dateTo }))
})


// ──────────────────────────────────────────────────────────────────────
// GET /api/warehouse/items/:id/lots  — lazy lot list for sub-grid
// ──────────────────────────────────────────────────────────────────────
router.get('/items/:id/lots', async (req: Request, res: Response) => {
  const id = BigInt(req.params.id)

  const batches = await prisma.batch.findMany({
    where: { productId: id, deletedAt: null, currentQtyBase: { gt: 0 } },
    orderBy: { expiryDate: 'asc' },
    select: {
      id: true, lotNo: true, expiryDate: true, unitPricePerKg: true, currentQtyBase: true,
      inboundReceiptItemSource: { select: { inboundReceipt: { select: { id: true, receiptRef: true } } } },
    },
  })

  const lots = batches.map((b) => ({
    id: String(b.id),
    lotNo: b.lotNo,
    expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
    unitPricePerKg: Number(b.unitPricePerKg),
    quantityGram: Number(b.currentQtyBase),
    status: lotStatus(b.expiryDate),
    receiptId:  b.inboundReceiptItemSource?.inboundReceipt?.id  ? String(b.inboundReceiptItemSource.inboundReceipt.id) : null,
    receiptRef: b.inboundReceiptItemSource?.inboundReceipt?.receiptRef ?? null,
  }))

  res.json(lots)
})


// ──────────────────────────────────────────────────────────────────────
// GET /api/warehouse/items/:id  — detail page: lots + transactions + charts
// ──────────────────────────────────────────────────────────────────────
router.get('/items/:id', async (req: Request, res: Response) => {
  const id = BigInt(req.params.id)

  type MonthlyRow = { month: string; importGram: number; exportGram: number }

  const [product, monthlyRows, recentTx] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        baseUnitRef:  { select: { unitName: true } },
        orderUnitRef: { select: { conversionToBase: true } },
        productClassification: { select: { name: true } },
        inciNames: { select: { inciName: true, isPrimary: true }, orderBy: { isPrimary: 'desc' as const } },
        productDocuments: {
          select: { id: true, docType: true, originalName: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        batches: {
          where: { deletedAt: null, currentQtyBase: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, lotNo: true, expiryDate: true, unitPricePerKg: true, currentQtyBase: true,
            inboundReceiptItemSource: { select: { inboundReceipt: { select: { id: true, receiptRef: true } } } },
            manufacturer: { select: { id: true, name: true } },
            supplierId: true,
          },
        },
      },
    }),
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT
        DATE_FORMAT(it.transaction_date, '%Y-%m') AS month,
        GREATEST(0,
          SUM(CASE WHEN it.type = 'import'     THEN  ABS(it.quantity_base)
                   WHEN it.type = 'adjustment' THEN  it.quantity_base
                   ELSE 0 END)
        ) AS importGram,
        SUM(CASE WHEN it.type = 'export' THEN ABS(it.quantity_base) ELSE 0 END) AS exportGram
      FROM inventory_transactions it
      JOIN batches b ON b.id = it.batch_id
      WHERE b.product_id = ${id}
        AND b.deleted_at IS NULL
        AND it.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `,
    prisma.inventoryTransaction.findMany({
      where: { batch: { productId: id, deletedAt: null } },
      orderBy: { transactionDate: 'desc' },
      take: 15,
      include: {
        user:  { select: { fullName: true } },
        batch: { select: { lotNo: true } },
      },
    }),
  ])

  if (!product) {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    return
  }

  const priceConv = Number(product.orderUnitRef?.conversionToBase ?? 1) || 1
  const stockQty  = product.batches.reduce((s, b) => s + Number(b.currentQtyBase), 0)
  const value     = product.batches.reduce((s, b) => s + (Number(b.currentQtyBase) / priceConv) * Number(b.unitPricePerKg), 0)

  const lots = product.batches.map((b) => ({
    id:             String(b.id),
    lotNo:          b.lotNo,
    expiryDate:     b.expiryDate ? b.expiryDate.toISOString() : null,
    unitPricePerKg: Number(b.unitPricePerKg),
    quantityGram:   Number(b.currentQtyBase),
    status:         lotStatus(b.expiryDate),
    receiptId:      b.inboundReceiptItemSource?.inboundReceipt?.id  ? String(b.inboundReceiptItemSource.inboundReceipt.id) : null,
    receiptRef:     b.inboundReceiptItemSource?.inboundReceipt?.receiptRef ?? null,
    manufacturerName: b.manufacturer?.name ?? null,
  }))

  const transactions = recentTx.map((tx) => ({
    id:              String(tx.id),
    type:            tx.type as string,
    quantityBase:    Math.abs(Number(tx.quantityBase)),
    transactionDate: tx.transactionDate.toISOString(),
    userName:        tx.user?.fullName ?? 'Hệ thống',
    lotNo:           tx.batch.lotNo,
    notes:           tx.notes ?? '',
  }))

  res.json({
    id:             String(product.id),
    code:           product.code,
    inciName:       product.inciNames?.find(n => n.isPrimary)?.inciName ?? product.inciName ?? '',
    tradeName:      product.name,
    unit:           product.baseUnitRef?.unitName ?? 'g',
    classification: product.productClassification?.name ?? '',
    minStockLevel:  Number(product.minStockLevel),
    stockQuantity:  stockQty,
    value,
    lots,
    transactions,
    monthlyStats: monthlyRows.map((r) => ({
      month:      r.month,
      importGram: Number(r.importGram),
      exportGram: Number(r.exportGram),
    })),
    documents: product.productDocuments.map((d) => ({
      id:           String(d.id),
      docType:      d.docType as string,
      originalName: d.originalName,
      fileSize:     d.fileSize ? Number(d.fileSize) : null,
      createdAt:    d.createdAt.toISOString(),
    })),
  })
})

export default router
