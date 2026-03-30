import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// LIST / GET
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('purchases.read'), async (req, res) => {
  const { supplierId, status, paymentStatus, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = { deletedAt: null }
  if (supplierId) where.supplierId = supplierId
  if (status) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, payments: true, expenses: true },
    }),
    prisma.purchase.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('purchases.read'), async (req, res) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      items: { include: { product: true } },
      payments: true,
      expenses: true,
      returns: { include: { items: true } },
    },
  })
  if (!purchase) { res.status(404).json({ error: 'Purchase not found' }); return }
  res.json(purchase)
})

// ──────────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────────
const purchaseItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitCost: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
})

const purchaseSchema = z.object({
  reference: z.string().min(1),
  supplierId: z.string().optional(),
  warehouseId: z.string(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  note: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
})

router.post('/', requireAuth, requirePermission('purchases.write'), async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data

  const purchaseItems = items.map((i) => ({
    ...i,
    subtotal: i.qty * i.unitCost - i.discount + i.tax,
  }))
  const itemsTotal = purchaseItems.reduce((s, i) => s + i.subtotal, 0)
  const grandTotal = itemsTotal - header.discount + header.tax + header.shipping

  const purchase = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.purchase.create({
      data: { ...header, grandTotal, items: { create: purchaseItems } },
      include: { items: true },
    })

    // increase stock on receipt
    for (const item of items) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: header.warehouseId, productId: item.productId } },
        update: { qty: { increment: item.qty } },
        create: { warehouseId: header.warehouseId, productId: item.productId, qty: item.qty },
      })
    }
    await tx.purchase.update({ where: { id: created.id }, data: { status: 'received' } })
    return created
  })
  res.status(201).json(purchase)
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

router.post('/:id/payments', requireAuth, requirePermission('purchases.write'), async (req, res) => {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!purchase) { res.status(404).json({ error: 'Purchase not found' }); return }

  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const p = await tx.purchasePayment.create({
      data: {
        purchaseId: purchase.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        note: parsed.data.note,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      },
    })
    const newPaid = Number(purchase.paid) + parsed.data.amount
    const paymentStatus =
      newPaid >= Number(purchase.grandTotal) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
    await tx.purchase.update({ where: { id: purchase.id }, data: { paid: newPaid, paymentStatus } })
    return p
  })
  res.status(201).json(payment)
})

// ──────────────────────────────────────────────────────────────────────
// EXPENSES
// ──────────────────────────────────────────────────────────────────────
router.post('/:id/expenses', requireAuth, requirePermission('purchases.write'), async (req, res) => {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!purchase) { res.status(404).json({ error: 'Purchase not found' }); return }

  const schema = z.object({ description: z.string().min(1), amount: z.number().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const expense = await prisma.expense.create({
    data: { purchaseId: purchase.id, ...parsed.data },
  })
  res.status(201).json(expense)
})

// ──────────────────────────────────────────────────────────────────────
// RETURNS
// ──────────────────────────────────────────────────────────────────────
const returnItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitCost: z.number().min(0),
})

const purchaseReturnSchema = z.object({
  reference: z.string().min(1),
  note: z.string().optional(),
  items: z.array(returnItemSchema).min(1),
})

router.post('/:id/returns', requireAuth, requirePermission('purchases.write'), async (req, res) => {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!purchase) { res.status(404).json({ error: 'Purchase not found' }); return }

  const parsed = purchaseReturnSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const ret = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.purchaseReturn.create({
      data: {
        reference: parsed.data.reference,
        purchaseId: purchase.id,
        note: parsed.data.note,
        items: { create: parsed.data.items },
      },
      include: { items: true },
    })

    // reduce stock on return to supplier
    for (const item of parsed.data.items) {
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: purchase.warehouseId, productId: item.productId } },
        update: { qty: { decrement: item.qty } },
        create: { warehouseId: purchase.warehouseId, productId: item.productId, qty: -item.qty },
      })
    }
    await tx.purchase.update({ where: { id: purchase.id }, data: { status: 'returned' } })
    return created
  })
  res.status(201).json(ret)
})

// ── Cancel ────────────────────────────────────────────────────────────
router.patch('/:id/cancel', requireAuth, requirePermission('purchases.write'), async (req, res) => {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!purchase) { res.status(404).json({ error: 'Purchase not found' }); return }
  if (purchase.status === 'cancelled') { res.status(409).json({ error: 'Already cancelled' }); return }

  await prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'cancelled' } })
  res.json({ message: 'Purchase cancelled' })
})

export default router
