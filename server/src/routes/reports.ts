import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

function parseDateRange(from?: string, to?: string) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const lte = to ? new Date(to) : new Date()
  lte.setHours(23, 59, 59, 999)
  return { gte, lte }
}

// ──────────────────────────────────────────────────────────────────────
// EXPORT ORDERS SUMMARY (replaces legacy sales-summary)
// ──────────────────────────────────────────────────────────────────────
router.get('/sales-summary', requireAuth, requirePermission('reports.read'), async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>
  const dateRange = parseDateRange(from, to)
  const where: Prisma.ExportOrderWhereInput = { createdAt: dateRange }

  const [count, byStatus] = await Promise.all([
    prisma.exportOrder.count({ where }),
    prisma.exportOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
  ])

  res.json({ period: { from: dateRange.gte, to: dateRange.lte }, totals: { count }, byStatus })
})

// ──────────────────────────────────────────────────────────────────────
// PURCHASE REQUESTS SUMMARY (replaces legacy purchases-summary)
// ──────────────────────────────────────────────────────────────────────
router.get('/purchases-summary', requireAuth, requirePermission('reports.read'), async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>
  const dateRange = parseDateRange(from, to)
  const where: Prisma.PurchaseRequestWhereInput = { createdAt: dateRange }

  const [count, byStatus] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
  ])

  res.json({ period: { from: dateRange.gte, to: dateRange.lte }, totals: { count }, byStatus })
})

// ──────────────────────────────────────────────────────────────────────
// STOCK REPORT — available batch quantities per product
// ──────────────────────────────────────────────────────────────────────
router.get('/stock', requireAuth, requirePermission('reports.read'), async (req: Request, res: Response) => {
  const { productId } = req.query as Record<string, string>
  const where: Prisma.BatchWhereInput = { status: 'available', deletedAt: null }
  if (productId) where.productId = BigInt(productId)

  const batches = await prisma.batch.findMany({
    where,
    include: { product: { select: { id: true, code: true, name: true, minStockLevel: true } } },
  })

  // Aggregate total available qty per product
  const byProduct = new Map<string, { product: (typeof batches)[0]['product']; totalQty: number; batchCount: number }>()
  for (const b of batches) {
    const key = b.productId.toString()
    const entry = byProduct.get(key)
    if (entry) {
      entry.totalQty += Number(b.currentQtyBase)
      entry.batchCount++
    } else {
      byProduct.set(key, { product: b.product, totalQty: Number(b.currentQtyBase), batchCount: 1 })
    }
  }

  const items = [...byProduct.values()].map((row) => ({
    ...row,
    belowMin: row.totalQty <= Number(row.product.minStockLevel),
  }))

  res.json({ items, summary: { totalProducts: items.length, belowMinCount: items.filter((i) => i.belowMin).length } })
})

// ──────────────────────────────────────────────────────────────────────
// SHORTAGE REPORT — product shortages based on current_qty_base
// ──────────────────────────────────────────────────────────────────────
router.get('/shortages', requireAuth, requirePermission('reports.read'), async (req: Request, res: Response) => {
  const { q = '', status = 'all', page = '1', limit = '20' } = req.query as Record<string, string>
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20))
  const skip = (safePage - 1) * safeLimit
  const query = q.trim().toLowerCase()

  const qtyExpr = Prisma.sql`COALESCE(SUM(CASE WHEN b.status = 'available' AND b.deleted_at IS NULL THEN b.current_qty_base ELSE 0 END), 0)`
  const searchClause = query
    ? Prisma.sql`AND (LOWER(p.code) LIKE ${`%${query}%`} OR LOWER(p.name) LIKE ${`%${query}%`})`
    : Prisma.empty

  let statusHaving = Prisma.empty
  if (status === 'critical') {
    statusHaving = Prisma.sql`HAVING ${qtyExpr} <= 0 OR ${qtyExpr} < (p.min_stock_level * 0.5)`
  } else if (status === 'warning') {
    statusHaving = Prisma.sql`HAVING ${qtyExpr} >= (p.min_stock_level * 0.5) AND ${qtyExpr} < p.min_stock_level`
  } else if (status === 'stable') {
    statusHaving = Prisma.sql`HAVING ${qtyExpr} > 0 AND ${qtyExpr} >= p.min_stock_level`
  }

  type ShortageRow = {
    id: bigint
    code: string
    name: string
    minStockLevel: Prisma.Decimal
    qtyOnHand: Prisma.Decimal
    unitCode: string | null
    unitName: string | null
    updatedAt: Date
  }

  const rows = await prisma.$queryRaw<ShortageRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.code,
      p.name,
      p.min_stock_level AS minStockLevel,
      ${qtyExpr} AS qtyOnHand,
      pu.unit_code_name AS unitCode,
      pu.unit_name AS unitName,
      COALESCE(MAX(CASE WHEN b.status = 'available' AND b.deleted_at IS NULL THEN b.updated_at END), p.updated_at) AS updatedAt
    FROM products p
    LEFT JOIN batches b ON b.product_id = p.id
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.deleted_at IS NULL
    ${searchClause}
    GROUP BY p.id, p.code, p.name, p.min_stock_level, p.updated_at, pu.unit_code_name, pu.unit_name
    ${statusHaving}
    ORDER BY (p.min_stock_level - ${qtyExpr}) DESC, p.code ASC
    LIMIT ${safeLimit} OFFSET ${skip}
  `)

  const allRows = await prisma.$queryRaw<ShortageRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.code,
      p.name,
      p.min_stock_level AS minStockLevel,
      ${qtyExpr} AS qtyOnHand,
      pu.unit_code_name AS unitCode,
      pu.unit_name AS unitName,
      COALESCE(MAX(CASE WHEN b.status = 'available' AND b.deleted_at IS NULL THEN b.updated_at END), p.updated_at) AS updatedAt
    FROM products p
    LEFT JOIN batches b ON b.product_id = p.id
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.deleted_at IS NULL
    ${searchClause}
    GROUP BY p.id, p.code, p.name, p.min_stock_level, p.updated_at, pu.unit_code_name, pu.unit_name
    ${statusHaving}
  `)

  const toStatus = (qtyOnHand: number, minStock: number): 'critical' | 'warning' | 'stable' => {
    if (qtyOnHand <= 0 || qtyOnHand < minStock * 0.5) return 'critical'
    if (qtyOnHand < minStock) return 'warning'
    return 'stable'
  }

  const items = rows.map((row) => {
    const minStock = Number(row.minStockLevel)
    const qtyOnHand = Number(row.qtyOnHand)
    const shortageQty = minStock - qtyOnHand
    return {
      id: row.id.toString(),
      code: row.code,
      materialName: row.name,
      stockCurrent: qtyOnHand,
      stockMin: minStock,
      stockShort: shortageQty > 0 ? shortageQty : 0,
      unit: row.unitCode ?? row.unitName ?? '',
      status: toStatus(qtyOnHand, minStock),
      updatedAt: row.updatedAt,
    }
  })

  const summary = allRows.reduce(
    (acc, row) => {
      const minStock = Number(row.minStockLevel)
      const qtyOnHand = Number(row.qtyOnHand)
      const mapped = toStatus(qtyOnHand, minStock)
      if (mapped === 'critical') acc.critical += 1
      else if (mapped === 'warning') acc.warning += 1
      else acc.stable += 1
      return acc
    },
    { critical: 0, warning: 0, stable: 0 },
  )

  res.json({
    data: items,
    total: allRows.length,
    page: safePage,
    limit: safeLimit,
    summary,
  })
})

// ──────────────────────────────────────────────────────────────────────
// NOT APPLICABLE — no payment tracking in warehouse schema
// ──────────────────────────────────────────────────────────────────────
const notApplicable = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'This report is not applicable to the current warehouse schema.' })
}

router.get('/receivables', requireAuth, requirePermission('reports.read'), notApplicable)
router.get('/payables', requireAuth, requirePermission('reports.read'), notApplicable)

export default router
