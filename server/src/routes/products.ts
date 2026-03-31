// @ts-nocheck
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ── List ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('products.read'), async (req, res) => {
  const { q, categoryId, brandId, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = { deletedAt: null }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (brandId) where.brandId = brandId

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { variants: { where: { deletedAt: null } } },
    }),
    prisma.product.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

// ── Get one ───────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requirePermission('products.read'), async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      variants: { where: { deletedAt: null } },
      warehouseStock: { include: { warehouse: true } },
    },
  })
  if (!product) { res.status(404).json({ error: 'Product not found' }); return }
  res.json(product)
})

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  taxRateId: z.string().optional(),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  alertQty: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional(),
})

// ── Create ────────────────────────────────────────────────────────────
router.post('/', requireAuth, requirePermission('products.write'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.product.findFirst({ where: { code: parsed.data.code, deletedAt: null } })
  if (existing) { res.status(409).json({ error: 'Product code already exists' }); return }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      costPrice: parsed.data.costPrice,
      sellPrice: parsed.data.sellPrice,
      alertQty: parsed.data.alertQty,
    },
  })
  res.status(201).json(product)
})

// ── Update ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requirePermission('products.write'), async (req, res) => {
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: 'Product not found' }); return }

  const parsed = productSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(product)
})

// ── Soft Delete ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('products.write'), async (req, res) => {
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: 'Product not found' }); return }

  await prisma.product.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  res.status(204).send()
})

// ── Variants ──────────────────────────────────────────────────────────
const variantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
})

router.get('/:id/variants', requireAuth, requirePermission('products.read'), async (req, res) => {
  const variants = await prisma.productVariant.findMany({
    where: { productId: req.params.id, deletedAt: null },
  })
  res.json(variants)
})

router.post('/:id/variants', requireAuth, requirePermission('products.write'), async (req, res) => {
  const parsed = variantSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const product = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!product) { res.status(404).json({ error: 'Product not found' }); return }

  const variant = await prisma.productVariant.create({
    data: { ...parsed.data, productId: req.params.id },
  })
  res.status(201).json(variant)
})

router.delete('/:id/variants/:variantId', requireAuth, requirePermission('products.write'), async (req, res) => {
  await prisma.productVariant.updateMany({
    where: { id: req.params.variantId, productId: req.params.id },
    data: { deletedAt: new Date() },
  })
  res.status(204).send()
})

export default router
