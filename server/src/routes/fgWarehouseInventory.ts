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

// ──────────────────────────────────────────────────────────────────────
// Helper: summary stats
// ──────────────────────────────────────────────────────────────────────
async function querySummary() {
  const now = new Date()
  const cutoff60 = new Date(now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  type NearCountRow    = { cnt: bigint }
  type TotalProductsRow = { cnt: bigint }

  const [nearCountRows, totalProductsCount] = await Promise.all([
    // Count lots expiring within 60 days that still have stock
    prisma.$queryRaw<NearCountRow[]>`
      SELECT COUNT(*) AS cnt FROM (
        SELECT t.output_product_id
        FROM production_output_transactions t
        WHERE t.batch_expiry_date IS NOT NULL
          AND t.batch_expiry_date <= ${cutoff60}
        GROUP BY t.output_product_id, t.batch_lot_no, t.batch_expiry_date
        HAVING SUM(CASE
          WHEN t.type = 'import_from_production' THEN t.quantity_base
          ELSE -t.quantity_base
        END) > 0.0001
      ) AS subq
    `,
    // Count distinct products with current stock > 0
    prisma.$queryRaw<TotalProductsRow[]>`
      SELECT COUNT(*) AS cnt FROM (
        SELECT t.output_product_id
        FROM production_output_transactions t
        GROUP BY t.output_product_id
        HAVING SUM(CASE
          WHEN t.type = 'import_from_production' THEN t.quantity_base
          ELSE -t.quantity_base
        END) > 0.0001
      ) AS subq
    `,
  ])

  return {
    totalProducts: Number(totalProductsCount[0]?.cnt ?? 0),
    nearExpirationCount: Number(nearCountRows[0]?.cnt ?? 0),
    totalInventoryValue: 0,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helper: paginated items + tx aggregation
// ──────────────────────────────────────────────────────────────────────
type ItemsParams = {
  q: string | undefined
  page: string
  limit: string
  dateFrom: string | undefined
  dateTo: string | undefined
}

async function queryItems(p: ItemsParams) {
  const skip = (Number(p.page) - 1) * Number(p.limit)
  const take = Math.min(Number(p.limit), 100)

  const dateFromDate = p.dateFrom ? new Date(p.dateFrom + 'T00:00:00.000Z') : null
  const dateToDate   = p.dateTo   ? new Date(p.dateTo   + 'T23:59:59.999Z') : null

  const productWhere: Prisma.ProductOutputWhereInput = { deletedAt: null }
  if (p.q) {
    productWhere.OR = [
      { code: { contains: p.q } },
      { name: { contains: p.q } },
    ]
  }

  // Round 1: product page + count
  const [products, total] = await Promise.all([
    prisma.productOutput.findMany({
      where: productWhere,
      skip,
      take,
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, unit: true, outputType: true },
    }),
    prisma.productOutput.count({ where: productWhere }),
  ])

  if (products.length === 0) return { items: [], total }

  const productIds = products.map((p) => p.id)

  // Round 2: tx aggregation per product
  const beforeFromCond = dateFromDate
    ? Prisma.sql`t.transaction_date < ${dateFromDate}`
    : Prisma.sql`FALSE`
  const inPeriodFromCond = dateFromDate
    ? Prisma.sql`t.transaction_date >= ${dateFromDate}`
    : Prisma.sql`TRUE`
  const inPeriodToCond = dateToDate
    ? Prisma.sql`t.transaction_date <= ${dateToDate}`
    : Prisma.sql`TRUE`

  type TxAgg = {
    outputProductId: bigint
    openingQty: Prisma.Decimal | null
    importQty:  Prisma.Decimal | null
    exportQty:  Prisma.Decimal | null
    currentQty: Prisma.Decimal | null
  }

  const rows = await prisma.$queryRaw<TxAgg[]>`
    SELECT
      t.output_product_id AS outputProductId,
      SUM(CASE
        WHEN (${beforeFromCond}) AND t.type = 'import_from_production' THEN  t.quantity_base
        WHEN (${beforeFromCond}) AND t.type = 'export_to_sale'         THEN -t.quantity_base
        WHEN (${beforeFromCond}) AND t.type = 'adjustment'             THEN  t.quantity_base
        ELSE 0
      END) AS openingQty,
      SUM(CASE
        WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND t.type = 'import_from_production' THEN t.quantity_base
        WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND t.type = 'adjustment'             THEN GREATEST(0, t.quantity_base)
        ELSE 0
      END) AS importQty,
      SUM(CASE
        WHEN (${inPeriodFromCond}) AND (${inPeriodToCond}) AND t.type = 'export_to_sale' THEN t.quantity_base
        ELSE 0
      END) AS exportQty,
      SUM(CASE
        WHEN t.type = 'import_from_production' THEN  t.quantity_base
        WHEN t.type = 'export_to_sale'         THEN -t.quantity_base
        WHEN t.type = 'adjustment'             THEN  t.quantity_base
        ELSE 0
      END) AS currentQty
    FROM production_output_transactions t
    WHERE t.output_product_id IN (${Prisma.join(productIds)})
    GROUP BY t.output_product_id
  `

  const txMap = new Map<string, { openingQty: number; importQty: number; exportQty: number; currentQty: number }>()
  for (const row of rows) {
    txMap.set(String(row.outputProductId), {
      openingQty: Math.max(0, Number(row.openingQty ?? 0)),
      importQty:  Number(row.importQty  ?? 0),
      exportQty:  Number(row.exportQty  ?? 0),
      currentQty: Math.max(0, Number(row.currentQty ?? 0)),
    })
  }

  const items = products
    .map((product) => {
      const agg = txMap.get(String(product.id)) ?? { openingQty: 0, importQty: 0, exportQty: 0, currentQty: 0 }
      return {
        id:              String(product.id),
        code:            product.code,
        name:            product.name,
        unit:            product.unit,
        outputType:      product.outputType as string,
        openingQuantity: agg.openingQty,
        importQuantity:  agg.importQty,
        exportQuantity:  agg.exportQty,
        stockQuantity:   agg.currentQty,
        value:           0,
      }
    })
    .filter((item) => {
      // Only show products that have had transactions
      const agg = txMap.get(item.id)
      return !!agg
    })

  return { items, total }
}

// ──────────────────────────────────────────────────────────────────────
// GET /api/fg-warehouse  — combined: summary + items
// ──────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { q, page = '1', limit = '10', dateFrom, dateTo } =
    req.query as Record<string, string>

  const [summary, itemsResult] = await Promise.all([
    querySummary(),
    queryItems({ q, page, limit, dateFrom, dateTo }),
  ])

  res.json({ summary, items: itemsResult.items, total: itemsResult.total })
})

// ──────────────────────────────────────────────────────────────────────
// GET /api/fg-warehouse/items/:id/lots  — lot sub-grid (FEFO)
// ──────────────────────────────────────────────────────────────────────
router.get('/items/:id/lots', async (req: Request, res: Response) => {
  const id = BigInt(req.params.id)

  type LotRow = {
    lotNo: string | null
    expiryDate: Date | null
    firstTxDate: Date | null
    productionOrderId: bigint | null
    orderRef: string | null
    currentQty: Prisma.Decimal | null
  }

  const rows = await prisma.$queryRaw<LotRow[]>`
    SELECT
      t.batch_lot_no                   AS lotNo,
      t.batch_expiry_date              AS expiryDate,
      MIN(t.transaction_date)          AS firstTxDate,
      MIN(t.production_order_id)       AS productionOrderId,
      MAX(po.order_ref)                AS orderRef,
      SUM(CASE
        WHEN t.type = 'import_from_production' THEN  t.quantity_base
        WHEN t.type = 'export_to_sale'         THEN -t.quantity_base
        WHEN t.type = 'adjustment'             THEN  t.quantity_base
        ELSE 0
      END)                             AS currentQty
    FROM production_output_transactions t
    LEFT JOIN production_orders po ON po.id = t.production_order_id
    WHERE t.output_product_id = ${id}
    GROUP BY t.batch_lot_no, t.batch_expiry_date
    HAVING currentQty > 0.0001
    ORDER BY t.batch_expiry_date ASC, t.batch_lot_no ASC
  `

  const lots = rows.map((r, idx) => ({
    id:                String(idx),
    lotNo:             r.lotNo ?? '(không có lô)',
    expiryDate:        r.expiryDate ? r.expiryDate.toISOString() : null,
    manufactureDate:   null,
    receivedAt:        r.firstTxDate ? r.firstTxDate.toISOString() : null,
    productionOrderId: r.productionOrderId ? String(r.productionOrderId) : null,
    orderRef:          r.orderRef ?? null,
    quantityBase:      Number(r.currentQty ?? 0),
    status:            lotStatus(r.expiryDate),
  }))

  res.json(lots)
})

// ──────────────────────────────────────────────────────────────────────
// GET /api/fg-warehouse/items/:id  — detail page
// ──────────────────────────────────────────────────────────────────────
router.get('/items/:id', async (req: Request, res: Response) => {
  const id = BigInt(req.params.id)

  type MonthlyRow = { month: string; importQty: Prisma.Decimal; exportQty: Prisma.Decimal }
  type TxRow = {
    id: bigint
    type: string
    quantityBase: Prisma.Decimal
    transactionDate: Date
    userName: string | null
    lotNo: string | null
    orderRef: string | null
    notes: string | null
  }
  type LotRow = {
    lotNo: string | null
    expiryDate: Date | null
    firstTxDate: Date | null
    orderRef: string | null
    currentQty: Prisma.Decimal | null
  }

  const [product, monthlyRows, txRows, lotRows] = await Promise.all([
    prisma.productOutput.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, unit: true, outputType: true },
    }),
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT
        DATE_FORMAT(t.transaction_date, '%Y-%m') AS month,
        SUM(CASE WHEN t.type = 'import_from_production' THEN t.quantity_base ELSE 0 END) AS importQty,
        SUM(CASE WHEN t.type = 'export_to_sale'         THEN t.quantity_base ELSE 0 END) AS exportQty
      FROM production_output_transactions t
      WHERE t.output_product_id = ${id}
        AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `,
    prisma.$queryRaw<TxRow[]>`
      SELECT
        t.id                                                  AS id,
        t.type                                                AS type,
        t.quantity_base                                       AS quantityBase,
        t.transaction_date                                    AS transactionDate,
        COALESCE(u.full_name, 'Hệ thống')                    AS userName,
        t.batch_lot_no                                        AS lotNo,
        CASE WHEN t.production_order_id <> 0 THEN po.order_ref ELSE NULL END AS orderRef,
        t.notes                                               AS notes
      FROM production_output_transactions t
      LEFT JOIN users u  ON u.id = t.user_id
      LEFT JOIN production_orders po ON po.id = t.production_order_id AND t.production_order_id <> 0
      WHERE t.output_product_id = ${id}
      ORDER BY t.transaction_date DESC
      LIMIT 200
    `,
    prisma.$queryRaw<LotRow[]>`
      SELECT
        t.batch_lot_no          AS lotNo,
        t.batch_expiry_date     AS expiryDate,
        MIN(t.transaction_date) AS firstTxDate,
        MAX(po.order_ref)       AS orderRef,
        SUM(CASE
          WHEN t.type = 'import_from_production' THEN  t.quantity_base
          WHEN t.type = 'export_to_sale'         THEN -t.quantity_base
          WHEN t.type = 'adjustment'             THEN  t.quantity_base
          ELSE 0
        END) AS currentQty
      FROM production_output_transactions t
      LEFT JOIN production_orders po ON po.id = t.production_order_id
      WHERE t.output_product_id = ${id}
      GROUP BY t.batch_lot_no, t.batch_expiry_date
      HAVING currentQty > 0.0001
      ORDER BY t.batch_expiry_date ASC, t.batch_lot_no ASC
    `,
  ])

  if (!product) {
    res.status(404).json({ error: 'Không tìm thấy thành phẩm' })
    return
  }

  const stockQuantity = lotRows.reduce((s, r) => s + Math.max(0, Number(r.currentQty ?? 0)), 0)

  const lots = lotRows.map((r, idx) => ({
    id:           String(idx),
    lotNo:        r.lotNo ?? '(không có lô)',
    expiryDate:   r.expiryDate ? r.expiryDate.toISOString() : null,
    receivedAt:   r.firstTxDate ? r.firstTxDate.toISOString() : null,
    orderRef:     r.orderRef ?? null,
    quantityBase: Number(r.currentQty ?? 0),
    status:       lotStatus(r.expiryDate),
  }))

  const transactions = [...txRows].reverse().map((tx) => ({
    id:              String(tx.id),
    type:            tx.type as string,
    quantityBase:    Number(tx.quantityBase),
    transactionDate: tx.transactionDate.toISOString(),
    userName:        tx.userName ?? 'Hệ thống',
    lotNo:           tx.lotNo ?? '',
    orderRef:        tx.orderRef ?? null,
    notes:           tx.notes ?? '',
  }))

  res.json({
    id:           String(product.id),
    code:         product.code,
    name:         product.name,
    unit:         product.unit,
    outputType:   product.outputType as string,
    stockQuantity,
    lots,
    transactions,
    monthlyStats: monthlyRows.map((r) => ({
      month:     r.month,
      importQty: Number(r.importQty),
      exportQty: Number(r.exportQty),
    })),
  })
})

export default router
