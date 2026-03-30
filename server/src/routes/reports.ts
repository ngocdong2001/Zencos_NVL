import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// Helper: parse date range from query
function parseDateRange(from?: string, to?: string) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const lte = to ? new Date(to) : new Date()
  lte.setHours(23, 59, 59, 999)
  return { gte, lte }
}

// ──────────────────────────────────────────────────────────────────────
// SALES SUMMARY
// ──────────────────────────────────────────────────────────────────────
router.get('/sales-summary', requireAuth, requirePermission('reports.read'), async (req, res) => {
  const { from, to } = req.query as Record<string, string>
  const dateRange = parseDateRange(from, to)

  const [sales, totalRows] = await Promise.all([
    prisma.sale.aggregate({
      where: { deletedAt: null, createdAt: dateRange },
      _sum: { grandTotal: true, paid: true, discount: true, tax: true, shipping: true },
      _count: { id: true },
    }),
    prisma.sale.groupBy({
      by: ['status'],
      where: { deletedAt: null, createdAt: dateRange },
      _count: { id: true },
      _sum: { grandTotal: true },
    }),
  ])

  res.json({
    period: { from: dateRange.gte, to: dateRange.lte },
    totals: {
      count: sales._count.id,
      grandTotal: sales._sum.grandTotal ?? 0,
      paid: sales._sum.paid ?? 0,
      outstanding: Number(sales._sum.grandTotal ?? 0) - Number(sales._sum.paid ?? 0),
    },
    byStatus: totalRows,
  })
})

// ──────────────────────────────────────────────────────────────────────
// PURCHASES SUMMARY
// ──────────────────────────────────────────────────────────────────────
router.get('/purchases-summary', requireAuth, requirePermission('reports.read'), async (req, res) => {
  const { from, to } = req.query as Record<string, string>
  const dateRange = parseDateRange(from, to)

  const [purchases, byStatus] = await Promise.all([
    prisma.purchase.aggregate({
      where: { deletedAt: null, createdAt: dateRange },
      _sum: { grandTotal: true, paid: true },
      _count: { id: true },
    }),
    prisma.purchase.groupBy({
      by: ['status'],
      where: { deletedAt: null, createdAt: dateRange },
      _count: { id: true },
      _sum: { grandTotal: true },
    }),
  ])

  res.json({
    period: { from: dateRange.gte, to: dateRange.lte },
    totals: {
      count: purchases._count.id,
      grandTotal: purchases._sum.grandTotal ?? 0,
      paid: purchases._sum.paid ?? 0,
      outstanding: Number(purchases._sum.grandTotal ?? 0) - Number(purchases._sum.paid ?? 0),
    },
    byStatus,
  })
})

// ──────────────────────────────────────────────────────────────────────
// STOCK REPORT
// ──────────────────────────────────────────────────────────────────────
router.get('/stock', requireAuth, requirePermission('reports.read'), async (req, res) => {
  const { warehouseId } = req.query as Record<string, string>
  const where: Record<string, unknown> = {}
  if (warehouseId) where.warehouseId = warehouseId

  const stock = await prisma.warehouseProduct.findMany({
    where,
    include: {
      product: { select: { id: true, code: true, name: true, alertQty: true, costPrice: true, sellPrice: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    },
    orderBy: { product: { name: 'asc' } },
  })

  const items = stock.map((s) => ({
    ...s,
    stockValue: Number(s.qty) * Number(s.product.costPrice),
    belowAlert: Number(s.qty) <= Number(s.product.alertQty),
  }))

  const totalValue = items.reduce((sum, i) => sum + i.stockValue, 0)
  const belowAlertCount = items.filter((i) => i.belowAlert).length

  res.json({ items, summary: { totalItems: items.length, totalValue, belowAlertCount } })
})

// ──────────────────────────────────────────────────────────────────────
// RECEIVABLES (unpaid / partial sales)
// ──────────────────────────────────────────────────────────────────────
router.get('/receivables', requireAuth, requirePermission('reports.read'), async (req, res) => {
  const { customerId } = req.query as Record<string, string>
  const where: Record<string, unknown> = {
    deletedAt: null,
    paymentStatus: { in: ['unpaid', 'partial'] },
  }
  if (customerId) where.customerId = customerId

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reference: true,
      customerId: true,
      grandTotal: true,
      paid: true,
      paymentStatus: true,
      createdAt: true,
    },
  })

  const totalOutstanding = sales.reduce(
    (sum, s) => sum + Number(s.grandTotal) - Number(s.paid),
    0
  )

  res.json({
    items: sales.map((s) => ({
      ...s,
      outstanding: Number(s.grandTotal) - Number(s.paid),
    })),
    summary: { count: sales.length, totalOutstanding },
  })
})

// ──────────────────────────────────────────────────────────────────────
// PAYABLES (unpaid / partial purchases)
// ──────────────────────────────────────────────────────────────────────
router.get('/payables', requireAuth, requirePermission('reports.read'), async (req, res) => {
  const { supplierId } = req.query as Record<string, string>
  const where: Record<string, unknown> = {
    deletedAt: null,
    paymentStatus: { in: ['unpaid', 'partial'] },
  }
  if (supplierId) where.supplierId = supplierId

  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reference: true,
      supplierId: true,
      grandTotal: true,
      paid: true,
      paymentStatus: true,
      createdAt: true,
    },
  })

  const totalOutstanding = purchases.reduce(
    (sum, p) => sum + Number(p.grandTotal) - Number(p.paid),
    0
  )

  res.json({
    items: purchases.map((p) => ({
      ...p,
      outstanding: Number(p.grandTotal) - Number(p.paid),
    })),
    summary: { count: purchases.length, totalOutstanding },
  })
})

export default router
