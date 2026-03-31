// @ts-nocheck
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ── List ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('quotes.read'), async (req, res) => {
  const { customerId, status, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = { deletedAt: null }
  if (customerId) where.customerId = customerId
  if (status) where.status = status

  const [data, total] = await Promise.all([
    prisma.quote.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: { select: { id: true, code: true, name: true } } } } },
    }),
    prisma.quote.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

// ── Get one ───────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requirePermission('quotes.read'), async (req, res) => {
  const quote = await prisma.quote.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { items: { include: { product: true } } },
  })
  if (!quote) { res.status(404).json({ error: 'Quote not found' }); return }
  res.json(quote)
})

// ── Create / Update ───────────────────────────────────────────────────
const quoteItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
})

const quoteSchema = z.object({
  reference: z.string().min(1),
  customerId: z.string().optional(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  note: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(quoteItemSchema).min(1),
})

function calcQuoteTotals(items: z.infer<typeof quoteItemSchema>[], header: { discount: number; tax: number; shipping: number }) {
  const quoteItems = items.map((i) => ({
    ...i,
    subtotal: i.qty * i.unitPrice - i.discount + i.tax,
  }))
  const itemsTotal = quoteItems.reduce((s, i) => s + i.subtotal, 0)
  const grandTotal = itemsTotal - header.discount + header.tax + header.shipping
  return { quoteItems, grandTotal }
}

router.post('/', requireAuth, requirePermission('quotes.write'), async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { items, ...header } = parsed.data
  const { quoteItems, grandTotal } = calcQuoteTotals(items, header)

  const quote = await prisma.quote.create({
    data: {
      ...header,
      grandTotal,
      validUntil: header.validUntil ? new Date(header.validUntil) : undefined,
      items: { create: quoteItems },
    },
    include: { items: true },
  })
  res.status(201).json(quote)
})

router.put('/:id', requireAuth, requirePermission('quotes.write'), async (req, res) => {
  const existing = await prisma.quote.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: 'Quote not found' }); return }
  if (!['draft', 'sent'].includes(existing.status)) {
    res.status(409).json({ error: 'Only draft/sent quotes can be edited' }); return
  }

  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { items, ...header } = parsed.data
  const { quoteItems, grandTotal } = calcQuoteTotals(items, header)

  // replace items
  await prisma.quoteItem.deleteMany({ where: { quoteId: existing.id } })
  const updated = await prisma.quote.update({
    where: { id: existing.id },
    data: {
      ...header,
      grandTotal,
      validUntil: header.validUntil ? new Date(header.validUntil) : null,
      items: { create: quoteItems },
    },
    include: { items: true },
  })
  res.json(updated)
})

// ── Status transitions ────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, requirePermission('quotes.write'), async (req, res) => {
  const schema = z.object({ status: z.enum(['sent', 'accepted', 'rejected', 'expired']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.quote.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: 'Quote not found' }); return }

  const updated = await prisma.quote.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  })
  res.json(updated)
})

// ── Convert to Sale ───────────────────────────────────────────────────
router.post('/:id/convert-to-sale', requireAuth, requirePermission('quotes.write'), async (req, res) => {
  const quote = await prisma.quote.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { items: true },
  })
  if (!quote) { res.status(404).json({ error: 'Quote not found' }); return }
  if (quote.status !== 'accepted') {
    res.status(409).json({ error: 'Only accepted quotes can be converted to sales' }); return
  }

  const schema = z.object({
    saleReference: z.string().min(1),
    warehouseId: z.string(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const saleItems = quote.items.map((i) => ({
    productId: i.productId,
    qty: i.qty,
    unitPrice: i.unitPrice,
    discount: i.discount,
    tax: i.tax,
    subtotal: i.subtotal,
  }))

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        reference: parsed.data.saleReference,
        customerId: quote.customerId,
        warehouseId: parsed.data.warehouseId,
        discount: quote.discount,
        tax: quote.tax,
        shipping: quote.shipping,
        grandTotal: quote.grandTotal,
        items: { create: saleItems },
      },
      include: { items: true },
    })

    for (const item of saleItems) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: parsed.data.warehouseId, productId: item.productId } },
        update: { qty: { decrement: item.qty } },
        create: { warehouseId: parsed.data.warehouseId, productId: item.productId, qty: item.qty.negated() },
      })
    }

    await tx.quote.update({ where: { id: quote.id }, data: { status: 'accepted' } })
    return created
  })

  res.status(201).json({ quote: { id: quote.id, reference: quote.reference }, sale })
})

// ── Soft delete ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('quotes.write'), async (req, res) => {
  const existing = await prisma.quote.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: 'Quote not found' }); return }
  await prisma.quote.update({ where: { id: existing.id }, data: { deletedAt: new Date() } })
  res.status(204).send()
})

export default router
