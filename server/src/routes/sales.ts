import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// SALES LIST / GET
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('sales.read'), async (req, res) => {
  const { customerId, status, paymentStatus, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = { deletedAt: null }
  if (customerId) where.customerId = customerId
  if (status) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, payments: true },
    }),
    prisma.sale.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('sales.read'), async (req, res) => {
  const sale = await prisma.sale.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      items: { include: { product: true } },
      payments: true,
      deliveries: true,
      returns: { include: { items: true } },
    },
  })
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }
  res.json(sale)
})

// ──────────────────────────────────────────────────────────────────────
// CREATE SALE
// ──────────────────────────────────────────────────────────────────────
const saleItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
})

const saleSchema = z.object({
  reference: z.string().min(1),
  customerId: z.string().optional(),
  warehouseId: z.string(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  note: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
})

router.post('/', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const parsed = saleSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data

  const saleItems = items.map((i) => ({
    ...i,
    subtotal: i.qty * i.unitPrice - i.discount + i.tax,
  }))
  const itemsTotal = saleItems.reduce((s, i) => s + i.subtotal, 0)
  const grandTotal = itemsTotal - header.discount + header.tax + header.shipping

  const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.sale.create({
      data: {
        ...header,
        grandTotal,
        items: { create: saleItems },
      },
      include: { items: true },
    })

    // deduct stock
    for (const item of items) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: header.warehouseId, productId: item.productId } },
        update: { qty: { decrement: item.qty } },
        create: { warehouseId: header.warehouseId, productId: item.productId, qty: -item.qty },
      })
    }
    return created
  })
  res.status(201).json(sale)
})

// ──────────────────────────────────────────────────────────────────────
// PAYMENTS
// ──────────────────────────────────────────────────────────────────────
const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'bank', 'card', 'other']),
  note: z.string().optional(),
  paidAt: z.string().optional(),
})

router.post('/:id/payments', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }

  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const p = await tx.salePayment.create({
      data: {
        saleId: sale.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        note: parsed.data.note,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      },
    })
    const newPaid = Number(sale.paid) + parsed.data.amount
    const paymentStatus =
      newPaid >= Number(sale.grandTotal) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
    await tx.sale.update({ where: { id: sale.id }, data: { paid: newPaid, paymentStatus } })
    return p
  })
  res.status(201).json(payment)
})

// ──────────────────────────────────────────────────────────────────────
// DELIVERIES
// ──────────────────────────────────────────────────────────────────────
router.post('/:id/deliveries', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }

  const delivery = await prisma.delivery.create({
    data: { saleId: sale.id, note: req.body.note, status: 'delivered' },
  })
  await prisma.sale.update({
    where: { id: sale.id },
    data: { status: 'delivered' },
  })
  res.status(201).json(delivery)
})

// ──────────────────────────────────────────────────────────────────────
// RETURNS
// ──────────────────────────────────────────────────────────────────────
const returnItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
})

const saleReturnSchema = z.object({
  reference: z.string().min(1),
  note: z.string().optional(),
  items: z.array(returnItemSchema).min(1),
})

router.post('/:id/returns', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const sale = await prisma.sale.findFirst({
    where: { id: req.params.id, deletedAt: null },
  })
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }

  const parsed = saleReturnSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const ret = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.saleReturn.create({
      data: {
        reference: parsed.data.reference,
        saleId: sale.id,
        note: parsed.data.note,
        items: { create: parsed.data.items },
      },
      include: { items: true },
    })

    // return items to warehouse stock
    for (const item of parsed.data.items) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: sale.warehouseId, productId: item.productId } },
        update: { qty: { increment: item.qty } },
        create: { warehouseId: sale.warehouseId, productId: item.productId, qty: item.qty },
      })
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'returned' } })
    return created
  })
  res.status(201).json(ret)
})

// ── Cancel ────────────────────────────────────────────────────────────
router.patch('/:id/cancel', requireAuth, requirePermission('sales.write'), async (req, res) => {
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!sale) { res.status(404).json({ error: 'Sale not found' }); return }
  if (sale.status === 'cancelled') { res.status(409).json({ error: 'Already cancelled' }); return }

  await prisma.sale.update({ where: { id: sale.id }, data: { status: 'cancelled' } })
  res.json({ message: 'Sale cancelled' })
})

export default router
