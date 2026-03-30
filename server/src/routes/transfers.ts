import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ── List ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('transfers.read'), async (req, res) => {
  const { status, fromWarehouseId, toWarehouseId, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId
  if (toWarehouseId) where.toWarehouseId = toWarehouseId

  const [data, total] = await Promise.all([
    prisma.transfer.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, name: true } } } },
      },
    }),
    prisma.transfer.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

// ── Get one ───────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requirePermission('transfers.read'), async (req, res) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id: req.params.id },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      items: { include: { product: true } },
    },
  })
  if (!transfer) { res.status(404).json({ error: 'Transfer not found' }); return }
  res.json(transfer)
})

// ── Create (draft) ────────────────────────────────────────────────────
const transferItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
})
const transferSchema = z.object({
  reference: z.string().min(1),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  note: z.string().optional(),
  items: z.array(transferItemSchema).min(1),
})

router.post('/', requireAuth, requirePermission('transfers.write'), async (req, res) => {
  const parsed = transferSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  if (parsed.data.fromWarehouseId === parsed.data.toWarehouseId) {
    res.status(400).json({ error: 'Source and destination warehouse must differ' }); return
  }

  const { items, ...header } = parsed.data
  const transfer = await prisma.transfer.create({
    data: { ...header, items: { create: items } },
    include: { items: true },
  })
  res.status(201).json(transfer)
})

// ── Confirm (moves stock) ─────────────────────────────────────────────
router.post('/:id/confirm', requireAuth, requirePermission('transfers.write'), async (req, res) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!transfer) { res.status(404).json({ error: 'Transfer not found' }); return }
  if (transfer.status !== 'draft') { res.status(409).json({ error: 'Transfer is not in draft status' }); return }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of transfer.items) {
      // deduct from source
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: item.productId } },
        update: { qty: { decrement: item.qty } },
        create: { warehouseId: transfer.fromWarehouseId, productId: item.productId, qty: item.qty.negated() },
      })
      // add to destination
      await tx.warehouseProduct.upsert({
        where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: item.productId } },
        update: { qty: { increment: item.qty } },
        create: { warehouseId: transfer.toWarehouseId, productId: item.productId, qty: item.qty },
      })
    }
    await tx.transfer.update({ where: { id: transfer.id }, data: { status: 'confirmed' } })
  })

  const updated = await prisma.transfer.findUnique({
    where: { id: transfer.id },
    include: { items: { include: { product: true } }, fromWarehouse: true, toWarehouse: true },
  })
  res.json(updated)
})

// ── Cancel ────────────────────────────────────────────────────────────
router.patch('/:id/cancel', requireAuth, requirePermission('transfers.write'), async (req, res) => {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id } })
  if (!transfer) { res.status(404).json({ error: 'Transfer not found' }); return }
  if (transfer.status !== 'draft') { res.status(409).json({ error: 'Only draft transfers can be cancelled' }); return }

  await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'cancelled' } })
  res.json({ message: 'Transfer cancelled' })
})

export default router
