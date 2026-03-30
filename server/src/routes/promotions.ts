import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

const promotionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['percent', 'fixed', 'buy_x_get_y']),
  value: z.number().min(0),
  minOrderValue: z.number().min(0).default(0),
  buyQty: z.number().int().positive().optional(),
  getQty: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
})

// ── List ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('promotions.read'), async (req, res) => {
  const { isActive, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = {}
  if (isActive !== undefined) where.isActive = isActive === 'true'

  const [data, total] = await Promise.all([
    prisma.promotion.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.promotion.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('promotions.read'), async (req, res) => {
  const promo = await prisma.promotion.findUnique({ where: { id: req.params.id } })
  if (!promo) { res.status(404).json({ error: 'Promotion not found' }); return }
  res.json(promo)
})

// ── Create ────────────────────────────────────────────────────────────
router.post('/', requireAuth, requirePermission('promotions.write'), async (req, res) => {
  const parsed = promotionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.promotion.findUnique({ where: { code: parsed.data.code } })
  if (existing) { res.status(409).json({ error: 'Promotion code already exists' }); return }

  const promo = await prisma.promotion.create({
    data: {
      ...parsed.data,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
    },
  })
  res.status(201).json(promo)
})

// ── Update ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requirePermission('promotions.write'), async (req, res) => {
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } })
  if (!existing) { res.status(404).json({ error: 'Promotion not found' }); return }

  const parsed = promotionSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.startAt) data.startAt = new Date(parsed.data.startAt)
  if (parsed.data.endAt) data.endAt = new Date(parsed.data.endAt)

  const promo = await prisma.promotion.update({ where: { id: existing.id }, data })
  res.json(promo)
})

// ── Delete ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('promotions.write'), async (req, res) => {
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } })
  if (!existing) { res.status(404).json({ error: 'Promotion not found' }); return }
  if (existing.usedCount > 0) { res.status(409).json({ error: 'Promotion has been used and cannot be deleted' }); return }
  await prisma.promotion.delete({ where: { id: existing.id } })
  res.status(204).send()
})

// ──────────────────────────────────────────────────────────────────────
// APPLY PROMOTION TO SALE
// ──────────────────────────────────────────────────────────────────────

/**
 * Validate and preview discount for a given order total.
 * Does NOT persist — just returns the calculated discount amount.
 */
router.post('/preview', requireAuth, requirePermission('promotions.read'), async (req, res) => {
  const schema = z.object({
    code: z.string(),
    orderTotal: z.number().positive(),
    itemCount: z.number().int().positive().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const promo = await prisma.promotion.findUnique({ where: { code: parsed.data.code } })
  if (!promo || !promo.isActive) { res.status(404).json({ error: 'Promotion not found or inactive' }); return }

  const now = new Date()
  if (promo.startAt && now < promo.startAt) { res.status(409).json({ error: 'Promotion has not started yet' }); return }
  if (promo.endAt && now > promo.endAt) { res.status(409).json({ error: 'Promotion has expired' }); return }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) { res.status(409).json({ error: 'Promotion usage limit reached' }); return }
  if (parsed.data.orderTotal < Number(promo.minOrderValue)) {
    res.status(409).json({ error: `Minimum order value is ${promo.minOrderValue}` }); return
  }

  let discount = 0
  if (promo.type === 'percent') {
    discount = (parsed.data.orderTotal * Number(promo.value)) / 100
  } else if (promo.type === 'fixed') {
    discount = Math.min(Number(promo.value), parsed.data.orderTotal)
  } else if (promo.type === 'buy_x_get_y') {
    discount = 0 // UI handles product-level free items
  }

  res.json({ promotionId: promo.id, code: promo.code, type: promo.type, discount })
})

/**
 * Apply promotion to an existing sale.
 */
router.post('/apply', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const schema = z.object({ code: z.string(), saleId: z.string() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const [promo, sale] = await Promise.all([
    prisma.promotion.findUnique({ where: { code: parsed.data.code } }),
    prisma.sale.findFirst({ where: { id: parsed.data.saleId, deletedAt: null } }),
  ])

  if (!promo || !promo.isActive) { res.status(404).json({ error: 'Promotion not found or inactive' }); return }
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }

  const alreadyUsed = await prisma.promotionUsage.findFirst({
    where: { promotionId: promo.id, saleId: sale.id },
  })
  if (alreadyUsed) { res.status(409).json({ error: 'Promotion already applied to this sale' }); return }

  const now = new Date()
  if (promo.startAt && now < promo.startAt) { res.status(409).json({ error: 'Promotion has not started yet' }); return }
  if (promo.endAt && now > promo.endAt) { res.status(409).json({ error: 'Promotion has expired' }); return }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) { res.status(409).json({ error: 'Promotion usage limit reached' }); return }

  let discountAmount = 0
  const orderTotal = Number(sale.grandTotal)
  if (promo.type === 'percent') {
    discountAmount = (orderTotal * Number(promo.value)) / 100
  } else if (promo.type === 'fixed') {
    discountAmount = Math.min(Number(promo.value), orderTotal)
  }

  await prisma.$transaction(async (tx) => {
    await tx.promotionUsage.create({
      data: { promotionId: promo.id, saleId: sale.id, discount: discountAmount },
    })
    await tx.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        discount: Number(sale.discount) + discountAmount,
        grandTotal: orderTotal - discountAmount,
      },
    })
  })

  res.json({ message: 'Promotion applied', discountAmount })
})

export default router
