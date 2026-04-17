import { Router } from 'express'
import { z } from 'zod'
import { ExportOrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

function buildPoRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `PO-${yyyy}${mm}${dd}-${hh}${min}${ss}${ms}`
}

// ──────────────────────────────────────────────────────────────────────
// LIST / GET  (Export Orders = warehouse dispatches to customers)
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('sales.read'), async (req: AuthenticatedRequest, res) => {
  const { customerId, status, q, sortBy = 'createdAt', sortDir = 'desc', page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.ExportOrderWhereInput = {}
  const direction: Prisma.SortOrder = sortDir === 'asc' ? 'asc' : 'desc'
  const orderBy: Prisma.ExportOrderOrderByWithRelationInput[] =
    sortBy === 'status'
      ? [{ status: direction }, { createdAt: 'desc' }]
      : sortBy === 'orderRef'
        ? [{ orderRef: direction }, { createdAt: 'desc' }]
        : sortBy === 'exportedAt'
          ? [{ exportedAt: direction }, { createdAt: 'desc' }]
          : [{ createdAt: direction }]

  if (customerId) where.customerId = BigInt(customerId)
  if (status) where.status = status as ExportOrderStatus
  if (q?.trim()) {
    const keyword = q.trim()
    where.OR = [
      { orderRef: { contains: keyword } },
      { customer: { name: { contains: keyword } } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.exportOrder.findMany({
      where, skip, take: Number(limit), orderBy,
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, name: true } } } },
        purchaseRequests: {
          select: {
            requestRef: true,
            items: {
              select: {
                quantityNeededBase: true,
                receivedQtyBase: true,
              },
            },
          },
        },
      },
    }),
    prisma.exportOrder.count({ where }),
  ])

  const enriched = data.map((order) => {
    const blockingPO = order.purchaseRequests.find((pr) =>
      pr.items.some((item) => Number(item.receivedQtyBase) + 0.0001 < Number(item.quantityNeededBase)),
    )

    return {
      ...order,
      canFulfil: !blockingPO,
      fulfilBlockedReason: blockingPO
        ? `PO liên quan ${blockingPO.requestRef} chưa nhận đủ hàng theo số lượng yêu cầu.`
        : null,
    }
  })

  res.json({ data: enriched, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('sales.read'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.exportOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          batch: true,
          purchaseRequestItems: {
            include: {
              purchaseRequest: {
                select: {
                  id: true,
                  requestRef: true,
                  status: true,
                  expectedDate: true,
                  supplier: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
      creator: { select: { id: true, fullName: true } },
      purchaseRequests: {
        select: {
          id: true,
          requestRef: true,
          status: true,
          expectedDate: true,
          submittedAt: true,
          approvedAt: true,
          notes: true,
          supplier: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              quantityNeededBase: true,
              receivedQtyBase: true,
              unitDisplay: true,
              quantityDisplay: true,
              unitPrice: true,
              product: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
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

const shortageSchema = z.object({
  productId: z.string(),
  requestedQty: z.number().positive(),
  availableQty: z.number().min(0),
  shortageQty: z.number().positive(),
  unitUsed: z.string(),
})

const exportOrderSchema = z.object({
  orderRef: z.string().optional(),
  customerId: z.string().optional(),
  exportedAt: z.string().optional(),
  notes: z.string().optional(),
  shortages: z.array(shortageSchema).optional(),
  items: z.array(exportItemSchema),
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

    // Auto-create draft PurchaseRequest when shortage is declared
    if (header.shortages && header.shortages.length > 0) {
      const prItems: Array<{ productId: bigint; quantityNeededBase: number; unitDisplay: string; quantityDisplay: number }> = []
      const notesParts: string[] = []

      for (const shortage of header.shortages) {
        const { productId, shortageQty, unitUsed } = shortage
        const product = await tx.product.findUnique({
          where: { id: BigInt(productId) },
          select: {
            orderUnitRef: { select: { unitName: true, conversionToBase: true } },
            baseUnitRef: { select: { unitName: true } },
          },
        })
        const conversionToBase = product?.orderUnitRef ? Number(product.orderUnitRef.conversionToBase) : 1
        const orderUnitName = product?.orderUnitRef?.unitName ?? product?.baseUnitRef?.unitName ?? unitUsed
        const displayQty = conversionToBase > 0 ? shortageQty / conversionToBase : shortageQty

        prItems.push({
          productId: BigInt(productId),
          quantityNeededBase: shortageQty,
          unitDisplay: orderUnitName,
          quantityDisplay: displayQty,
        })
        notesParts.push(`${displayQty} ${orderUnitName}`)
      }

      await tx.purchaseRequest.create({
        data: {
          requestRef: buildPoRef(),
          requestedBy: createdBy,
          exportOrderId: created.id,
          notes: `Tự tạo từ lệnh xuất kho ${header.orderRef ?? `#${created.id}`} – thiếu ${notesParts.join(', ')}`,
          items: { create: prItems },
        },
      })
    }

    return created
  })
  res.status(201).json(order)
})

router.put('/:id', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const parsed = exportOrderSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const orderId = BigInt(req.params.id)
  const { items, ...header } = parsed.data
  const createdBy = BigInt(req.auth!.sub)

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.exportOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            batchId: true,
            quantityBase: true,
          },
        },
      },
    })

      if (!existing) throw new Error('Export order not found')
      if (existing.status === ExportOrderStatus.cancelled) {
        throw new Error('Không thể chỉnh sửa phiếu đã huỷ')
      }

    // Roll back previous stock consumption for old items before applying new allocation.
    // Create adjustment reversal transactions to preserve audit trail instead of deleting.
      for (const item of existing.items) {
        if (!item.batchId) continue
        const qty = Number(item.quantityBase)
        if (qty <= 0) continue

        // Reversal adjustment: add stock back
        await tx.inventoryTransaction.create({
          data: {
            batchId: item.batchId,
            userId: createdBy,
            exportOrderItemId: item.id,
            type: 'adjustment',
            quantityBase: qty,
            notes: `Hoàn trả tồn kho do chỉnh sửa phiếu xuất ${existing.orderRef ?? `#${orderId}`}`,
            transactionDate: new Date(),
          },
        })

        await tx.batch.update({
          where: { id: item.batchId },
          data: { currentQtyBase: { increment: qty } },
        })
      }

      await tx.exportOrderItem.deleteMany({ where: { exportOrderId: orderId } })

      const savedOrder = await tx.exportOrder.update({
        where: { id: orderId },
        data: {
        orderRef: header.orderRef,
        customerId: header.customerId ? BigInt(header.customerId) : null,
        exportedAt: header.exportedAt ? new Date(header.exportedAt) : existing.exportedAt,
        notes: header.notes,
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

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        if (!item.batchId) continue

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
            exportOrderItemId: savedOrder.items[idx].id,
            type: 'export',
            quantityBase: item.quantityBase,
            notes: existing.orderRef ? `Xuất kho (cập nhật) – ${existing.orderRef}` : undefined,
            transactionDate: header.exportedAt ? new Date(header.exportedAt) : new Date(),
          },
        })

        await tx.batch.update({
          where: { id: batchId },
          data: { currentQtyBase: { decrement: item.quantityBase } },
        })
      }

      // Auto-manage linked PurchaseRequest on edit
      // Delete existing draft PRs linked to this order (only draft – don't touch submitted/approved ones)
      const existingDraftPRs = await tx.purchaseRequest.findMany({
        where: { exportOrderId: orderId, status: 'draft' },
        select: { id: true },
      })
      for (const pr of existingDraftPRs) {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: pr.id } })
        await tx.purchaseRequest.delete({ where: { id: pr.id } })
      }

      // Create new draft PO if shortage declared
      if (header.shortages && header.shortages.length > 0) {
        const prItems: Array<{ productId: bigint; quantityNeededBase: number; unitDisplay: string; quantityDisplay: number }> = []
        const notesParts: string[] = []

        for (const shortage of header.shortages) {
          const { productId, shortageQty, unitUsed } = shortage
          const product = await tx.product.findUnique({
            where: { id: BigInt(productId) },
            select: {
              orderUnitRef: { select: { unitName: true, conversionToBase: true } },
              baseUnitRef: { select: { unitName: true } },
            },
          })
          const conversionToBase = product?.orderUnitRef ? Number(product.orderUnitRef.conversionToBase) : 1
          const orderUnitName = product?.orderUnitRef?.unitName ?? product?.baseUnitRef?.unitName ?? unitUsed
          const displayQty = conversionToBase > 0 ? shortageQty / conversionToBase : shortageQty

          prItems.push({
            productId: BigInt(productId),
            quantityNeededBase: shortageQty,
            unitDisplay: orderUnitName,
            quantityDisplay: displayQty,
          })
          notesParts.push(`${displayQty} ${orderUnitName}`)
        }

        await tx.purchaseRequest.create({
          data: {
            requestRef: buildPoRef(),
            requestedBy: createdBy,
            exportOrderId: orderId,
            notes: `Tự tạo từ lệnh xuất kho ${header.orderRef ?? existing.orderRef ?? `#${orderId}`} – thiếu ${notesParts.join(', ')}`,
            items: { create: prItems },
          },
        })
      }

      return savedOrder
    })

    res.json(updatedOrder)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể cập nhật lệnh xuất kho.'
    if (message === 'Export order not found') {
      res.status(404).json({ error: message })
      return
    }
    if (message === 'Không thể chỉnh sửa phiếu đã huỷ') {
      res.status(409).json({ error: message })
      return
    }
    if (message.startsWith('Insufficient stock in batch') || message.startsWith('Batch ')) {
      res.status(409).json({ error: message })
      return
    }
    res.status(500).json({ error: message })
  }
})

// ──────────────────────────────────────────────────────────────────────
// FULFIL / CANCEL
// ──────────────────────────────────────────────────────────────────────
router.patch('/:id/fulfil', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.exportOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      purchaseRequests: {
        select: {
          requestRef: true,
          items: {
            select: {
              quantityNeededBase: true,
              receivedQtyBase: true,
            },
          },
        },
      },
    },
  })
  if (!order) { res.status(404).json({ error: 'Export order not found' }); return }
  if (order.status === ExportOrderStatus.fulfilled) { res.status(409).json({ error: 'Already fulfilled' }); return }

  // For shortage-linked orders: only allow fulfilment after linked PO has received enough quantity.
  if (order.purchaseRequests.length > 0) {
    const blockingPO = order.purchaseRequests.find((pr) =>
      pr.items.some((item) => Number(item.receivedQtyBase) + 0.0001 < Number(item.quantityNeededBase)),
    )

    if (blockingPO) {
      res.status(409).json({
        error: `Không thể đánh dấu hoàn thành. PO liên quan ${blockingPO.requestRef} chưa nhận đủ hàng theo số lượng yêu cầu.`,
      })
      return
    }
  }

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
