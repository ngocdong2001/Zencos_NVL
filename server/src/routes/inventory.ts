import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// WAREHOUSE STOCK
// ──────────────────────────────────────────────────────────────────────
router.get('/stock', requireAuth, requirePermission('inventory.read'), async (req, res) => {
  const { warehouseId, productId } = req.query as Record<string, string>
  const where: Record<string, unknown> = {}
  if (warehouseId) where.warehouseId = warehouseId
  if (productId) where.productId = productId

  const stock = await prisma.warehouseProduct.findMany({
    where,
    include: { product: true, warehouse: true },
  })
  res.json(stock)
})

// ──────────────────────────────────────────────────────────────────────
// ADJUSTMENTS
// ──────────────────────────────────────────────────────────────────────
router.get('/adjustments', requireAuth, requirePermission('inventory.read'), async (req, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const [data, total] = await Promise.all([
    prisma.adjustment.findMany({
      skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, warehouse: true },
    }),
    prisma.adjustment.count(),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/adjustments/:id', requireAuth, requirePermission('inventory.read'), async (req, res) => {
  const adj = await prisma.adjustment.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, warehouse: true },
  })
  if (!adj) { res.status(404).json({ error: 'Adjustment not found' }); return }
  res.json(adj)
})

const adjustmentItemSchema = z.object({
  productId: z.string(),
  type: z.enum(['addition', 'subtraction']),
  qty: z.number().positive(),
})

const adjustmentSchema = z.object({
  reference: z.string().min(1),
  warehouseId: z.string(),
  note: z.string().optional(),
  items: z.array(adjustmentItemSchema).min(1),
})

router.post('/adjustments', requireAuth, requirePermission('inventory.write'), async (req, res) => {
  const parsed = adjustmentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data

  const adj = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.adjustment.create({
      data: { ...header, items: { create: items } },
      include: { items: true },
    })

    // update warehouse stock
    for (const item of items) {
      const sign = item.type === 'addition' ? 1 : -1
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: header.warehouseId, productId: item.productId } },
        update: { qty: { increment: sign * item.qty } },
        create: { warehouseId: header.warehouseId, productId: item.productId, qty: sign * item.qty },
      })
    }
    return created
  })
  res.status(201).json(adj)
})

// ──────────────────────────────────────────────────────────────────────
// STOCK COUNTS
// ──────────────────────────────────────────────────────────────────────
router.get('/stock-counts', requireAuth, requirePermission('inventory.read'), async (req, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const [data, total] = await Promise.all([
    prisma.stockCount.findMany({
      skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: { warehouse: true },
    }),
    prisma.stockCount.count(),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/stock-counts/:id', requireAuth, requirePermission('inventory.read'), async (req, res) => {
  const sc = await prisma.stockCount.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, warehouse: true },
  })
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return }
  res.json(sc)
})

const stockCountItemSchema = z.object({
  productId: z.string(),
  expected: z.number().min(0),
  actual: z.number().min(0),
})

const stockCountSchema = z.object({
  reference: z.string().min(1),
  warehouseId: z.string(),
  note: z.string().optional(),
  items: z.array(stockCountItemSchema).min(1),
})

router.post('/stock-counts', requireAuth, requirePermission('inventory.write'), async (req, res) => {
  const parsed = stockCountSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data

  const sc = await prisma.stockCount.create({
    data: { ...header, status: 'draft', items: { create: items } },
    include: { items: true },
  })
  res.status(201).json(sc)
})

router.post('/stock-counts/:id/confirm', requireAuth, requirePermission('inventory.write'), async (req, res) => {
  const sc = await prisma.stockCount.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return }
  if (sc.status === 'confirmed') { res.status(409).json({ error: 'Already confirmed' }); return }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of sc.items) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: sc.warehouseId, productId: item.productId } },
        update: { qty: item.actual },
        create: { warehouseId: sc.warehouseId, productId: item.productId, qty: item.actual },
      })
    }
    await tx.stockCount.update({ where: { id: sc.id }, data: { status: 'confirmed' } })
  })
  res.json({ message: 'Stock count confirmed' })
})

export default router
