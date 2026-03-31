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
      entry.totalQty += Number(b.receivedQtyBase)
      entry.batchCount++
    } else {
      byProduct.set(key, { product: b.product, totalQty: Number(b.receivedQtyBase), batchCount: 1 })
    }
  }

  const items = [...byProduct.values()].map((row) => ({
    ...row,
    belowMin: row.totalQty <= Number(row.product.minStockLevel),
  }))

  res.json({ items, summary: { totalProducts: items.length, belowMinCount: items.filter((i) => i.belowMin).length } })
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
