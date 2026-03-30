import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// SHIFTS
// ──────────────────────────────────────────────────────────────────────

/** Open a new POS shift */
router.post('/shifts/open', requireAuth, requirePermission('pos.write'), async (req, res) => {
  const schema = z.object({
    warehouseId: z.string(),
    openingCash: z.number().min(0).default(0),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  // Check no open shift for this user+warehouse
  const existing = await prisma.posShift.findFirst({
    where: { userId: (req as AuthenticatedRequest).auth!.sub, warehouseId: parsed.data.warehouseId, status: 'open' },
  })
  if (existing) { res.status(409).json({ error: 'An open shift already exists', shift: existing }); return }

  const shift = await prisma.posShift.create({
    data: {
      userId: (req as AuthenticatedRequest).auth!.sub,
      warehouseId: parsed.data.warehouseId,
      openingCash: parsed.data.openingCash,
      note: parsed.data.note,
    },
  })
  res.status(201).json(shift)
})

/** Close a shift */
router.post('/shifts/:id/close', requireAuth, requirePermission('pos.write'), async (req, res) => {
  const shift = await prisma.posShift.findUnique({ where: { id: req.params.id } })
  if (!shift) { res.status(404).json({ error: 'Shift not found' }); return }
  if (shift.status === 'closed') { res.status(409).json({ error: 'Shift already closed' }); return }

  const schema = z.object({ closingCash: z.number().min(0), note: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const updated = await prisma.posShift.update({
    where: { id: shift.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closingCash: parsed.data.closingCash,
      note: parsed.data.note ?? shift.note,
    },
    include: {
      sales: { select: { id: true, grandTotal: true, paid: true } },
    },
  })
  res.json(updated)
})

/** Get shift details */
router.get('/shifts/:id', requireAuth, requirePermission('pos.read'), async (req, res) => {
  const shift = await prisma.posShift.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      warehouse: true,
      bills: true,
      sales: { select: { id: true, reference: true, grandTotal: true, paid: true, paymentStatus: true } },
    },
  })
  if (!shift) { res.status(404).json({ error: 'Shift not found' }); return }
  res.json(shift)
})

/** List shifts */
router.get('/shifts', requireAuth, requirePermission('pos.read'), async (req, res) => {
  const { status, userId, warehouseId, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (userId) where.userId = userId
  if (warehouseId) where.warehouseId = warehouseId

  const [data, total] = await Promise.all([
    prisma.posShift.findMany({
      where, skip, take: Number(limit), orderBy: { openedAt: 'desc' },
      include: { user: { select: { id: true, fullName: true } }, warehouse: true },
    }),
    prisma.posShift.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

// ──────────────────────────────────────────────────────────────────────
// HELD BILLS (Hóa đơn treo)
// ──────────────────────────────────────────────────────────────────────

const billItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
})

/** Hold a bill */
router.post('/bills', requireAuth, requirePermission('pos.write'), async (req, res) => {
  const schema = z.object({
    shiftId: z.string(),
    customerId: z.string().optional(),
    items: z.array(billItemSchema).min(1),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const bill = await prisma.posBill.create({
    data: {
      shiftId: parsed.data.shiftId,
      customerId: parsed.data.customerId,
      items: JSON.stringify(parsed.data.items),
      note: parsed.data.note,
      status: 'held',
    },
  })
  res.status(201).json(bill)
})

/** List held bills for shift */
router.get('/bills', requireAuth, requirePermission('pos.read'), async (req, res) => {
  const { shiftId, status } = req.query as Record<string, string>
  const where: Record<string, unknown> = {}
  if (shiftId) where.shiftId = shiftId
  if (status) where.status = status

  const bills = await prisma.posBill.findMany({
    where, orderBy: { createdAt: 'desc' },
  })
  res.json(bills.map((b) => ({ ...b, items: JSON.parse(b.items) })))
})

/** Update a held bill */
router.put('/bills/:id', requireAuth, requirePermission('pos.write'), async (req, res) => {
  const bill = await prisma.posBill.findUnique({ where: { id: req.params.id } })
  if (!bill) { res.status(404).json({ error: 'Bill not found' }); return }
  if (bill.status !== 'held') { res.status(409).json({ error: 'Only held bills can be updated' }); return }

  const schema = z.object({
    customerId: z.string().optional(),
    items: z.array(billItemSchema).min(1).optional(),
    note: z.string().optional(),
    status: z.enum(['held', 'resumed', 'cancelled']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const data: Record<string, unknown> = {}
  if (parsed.data.customerId !== undefined) data.customerId = parsed.data.customerId
  if (parsed.data.items) data.items = JSON.stringify(parsed.data.items)
  if (parsed.data.note !== undefined) data.note = parsed.data.note
  if (parsed.data.status) data.status = parsed.data.status

  const updated = await prisma.posBill.update({ where: { id: bill.id }, data })
  res.json({ ...updated, items: JSON.parse(updated.items) })
})

// ──────────────────────────────────────────────────────────────────────
// QUICK SALE (converts a bill or direct request into a Sale)
// ──────────────────────────────────────────────────────────────────────

router.post('/quick-sale', requireAuth, requirePermission('pos.write'), async (req, res) => {
  const saleItemSchema = z.object({
    productId: z.string(),
    qty: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
  })
  const schema = z.object({
    shiftId: z.string(),
    billId: z.string().optional(),
    reference: z.string().min(1),
    customerId: z.string().optional(),
    warehouseId: z.string(),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    shipping: z.number().min(0).default(0),
    note: z.string().optional(),
    items: z.array(saleItemSchema).min(1),
    paymentAmount: z.number().min(0).default(0),
    paymentMethod: z.enum(['cash', 'bank', 'card', 'other']).default('cash'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { items, paymentAmount, paymentMethod, billId, ...header } = parsed.data
  const saleItems = items.map((i) => ({ ...i, subtotal: i.qty * i.unitPrice - i.discount + i.tax }))
  const itemsTotal = saleItems.reduce((s, i) => s + i.subtotal, 0)
  const grandTotal = itemsTotal - header.discount + header.tax + header.shipping

  const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.sale.create({
      data: { ...header, grandTotal, status: 'confirmed', items: { create: saleItems } },
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

    // record payment if provided
    if (paymentAmount > 0) {
      await tx.salePayment.create({
        data: { saleId: created.id, amount: paymentAmount, method: paymentMethod },
      })
      const payStatus = paymentAmount >= grandTotal ? 'paid' : 'partial'
      await tx.sale.update({ where: { id: created.id }, data: { paid: paymentAmount, paymentStatus: payStatus } })
    }

    // mark held bill as completed
    if (billId) {
      await tx.posBill.update({ where: { id: billId }, data: { status: 'completed' } })
    }

    return created
  })
  res.status(201).json(sale)
})

export default router
