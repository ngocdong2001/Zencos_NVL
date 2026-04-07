import { Router } from 'express'
import { z } from 'zod'
import { ExportOrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// LIST / GET  (Export Orders = warehouse dispatches to customers)
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('sales.read'), async (req: AuthenticatedRequest, res) => {
  const { customerId, status, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.ExportOrderWhereInput = {}
  if (customerId) where.customerId = BigInt(customerId)
  if (status) where.status = status as ExportOrderStatus

  const [data, total] = await Promise.all([
    prisma.exportOrder.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, name: true } } } },
      },
    }),
    prisma.exportOrder.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('sales.read'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.exportOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      customer: true,
      items: { include: { product: true, batch: true } },
      creator: { select: { id: true, fullName: true } },
    },
  })
  if (!order) { res.status(404).json({ error: 'Export order not found' }); return }
  res.json(order)
})

// ──────────────────────────────────────────────────────────────────────
// CREATE EXPORT ORDER
// ──────────────────────────────────────────────────────────────────────
const exportItemSchema = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  quantityBase: z.number().positive(),
  unitUsed: z.string(),
  quantityDisplay: z.number().positive(),
  unitPriceSnapshot: z.number().min(0).optional(),
})

const exportOrderSchema = z.object({
  orderRef: z.string().optional(),
  customerId: z.string().optional(),
  exportedAt: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(exportItemSchema).min(1),
})

router.post('/', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const parsed = exportOrderSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data
  const createdBy = BigInt(req.auth!.sub)

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.exportOrder.create({
      data: {
        orderRef: header.orderRef,
        customerId: header.customerId ? BigInt(header.customerId) : undefined,
        exportedAt: header.exportedAt ? new Date(header.exportedAt) : undefined,
        notes: header.notes,
        createdBy,
        items: {
          create: items.map((i) => ({
            productId: BigInt(i.productId),
            batchId: i.batchId ? BigInt(i.batchId) : undefined,
            quantityBase: i.quantityBase,
            unitUsed: i.unitUsed,
            quantityDisplay: i.quantityDisplay,
            unitPriceSnapshot: i.unitPriceSnapshot ?? 0,
          })),
        },
      },
      include: { items: true },
    })

    // Record export inventory transactions for items linked to a batch
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      if (item.batchId) {
        const batchId = BigInt(item.batchId)
        const batch = await tx.batch.findUnique({
          where: { id: batchId },
          select: { id: true, currentQtyBase: true },
        })
        if (!batch) throw new Error(`Batch ${item.batchId} not found`)
        if (Number(batch.currentQtyBase) < item.quantityBase) {
          throw new Error(`Insufficient stock in batch ${item.batchId}`)
        }

        await tx.inventoryTransaction.create({
          data: {
            batchId,
            userId: createdBy,
            exportOrderItemId: created.items[idx].id,
            type: 'export',
            quantityBase: item.quantityBase,
            transactionDate: header.exportedAt ? new Date(header.exportedAt) : new Date(),
          },
        })

        await tx.batch.update({
          where: { id: batchId },
          data: { currentQtyBase: { decrement: item.quantityBase } },
        })
      }
    }
    return created
  })
  res.status(201).json(order)
})

// ──────────────────────────────────────────────────────────────────────
// FULFIL / CANCEL
// ──────────────────────────────────────────────────────────────────────
router.patch('/:id/fulfil', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.exportOrder.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!order) { res.status(404).json({ error: 'Export order not found' }); return }
  if (order.status === ExportOrderStatus.fulfilled) { res.status(409).json({ error: 'Already fulfilled' }); return }

  const updated = await prisma.exportOrder.update({
    where: { id: order.id },
    data: { status: ExportOrderStatus.fulfilled, exportedAt: order.exportedAt ?? new Date() },
  })
  res.json(updated)
})

router.patch('/:id/cancel', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.exportOrder.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!order) { res.status(404).json({ error: 'Export order not found' }); return }
  if (order.status === ExportOrderStatus.fulfilled) { res.status(409).json({ error: 'Cannot cancel a fulfilled order' }); return }

  const updated = await prisma.exportOrder.update({
    where: { id: order.id },
    data: { status: ExportOrderStatus.cancelled },
  })
  res.json(updated)
})

export default router
