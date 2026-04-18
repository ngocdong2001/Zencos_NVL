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

async function buildAdjustmentOrderRef(sourceOrderRef: string | null, tx: Prisma.TransactionClient): Promise<string> {
  const baseRef = sourceOrderRef?.trim() ? sourceOrderRef.trim() : buildPoRef()
  const base = `${baseRef}-ADJ`
  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`
    const existed = await tx.exportOrder.findFirst({ where: { orderRef: candidate }, select: { id: true } })
    if (!existed) return candidate
  }
  throw new Error('Không thể tạo mã phiếu điều chỉnh mới. Vui lòng thử lại.')
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
      sourceOrder: { select: { id: true, orderRef: true, status: true } },
      adjustedByOrder: { select: { id: true, orderRef: true, status: true } },
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

    // Record history
    await tx.exportOrderHistory.create({
      data: {
        exportOrderId: created.id,
        actionType: 'created',
        actionLabel: 'Tạo lệnh xuất kho',
        actorId: createdBy,
        data: { orderRef: created.orderRef, itemCount: items.length },
      },
    })

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
      if (existing.status === ExportOrderStatus.fulfilled) {
        throw new Error('Không thể chỉnh sửa phiếu đã hoàn thành')
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

      // Record history
      await tx.exportOrderHistory.create({
        data: {
          exportOrderId: orderId,
          actionType: 'updated',
          actionLabel: 'Cập nhật lệnh xuất kho',
          actorId: createdBy,
          data: { orderRef: savedOrder.orderRef, itemCount: items.length },
        },
      })

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
    if (message === 'Không thể chỉnh sửa phiếu đã hoàn thành') {
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

router.post('/:id/void-rerelease', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const sourceOrderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const sourceOrder = await tx.exportOrder.findUnique({
        where: { id: sourceOrderId },
        include: {
          items: {
            orderBy: { id: 'asc' },
            select: {
              productId: true,
              batchId: true,
              quantityBase: true,
              unitUsed: true,
              quantityDisplay: true,
              unitPriceSnapshot: true,
            },
          },
        },
      })

      if (!sourceOrder) throw new Error('Export order not found')
      if (sourceOrder.status !== ExportOrderStatus.fulfilled) {
        throw new Error('Chỉ có thể tạo phiếu điều chỉnh từ phiếu đã hoàn thành.')
      }
      const sourceOrderAny = sourceOrder as any
      if (sourceOrderAny.adjustedByOrderId) {
        throw new Error('Phiếu này đã có một phiếu điều chỉnh khác.')
      }
      if (sourceOrderAny.sourceOrderId) {
        throw new Error('Không thể tạo điều chỉnh chồng cho phiếu điều chỉnh.')
      }
      if (sourceOrder.items.length === 0) {
        throw new Error('Phiếu hoàn thành không có dòng dữ liệu để điều chỉnh.')
      }

      const nextOrderRef = await buildAdjustmentOrderRef(sourceOrder.orderRef ?? null, tx)
      const createdOrder = await tx.exportOrder.create({
        data: {
          orderRef: nextOrderRef,
          customerId: sourceOrder.customerId,
          sourceOrderId: sourceOrder.id,
          createdBy: actorId,
          status: ExportOrderStatus.pending,
          notes: `Phiếu điều chỉnh theo hướng Void & re-export từ ${sourceOrder.orderRef ?? `#${sourceOrder.id}`}`,
          items: {
            create: sourceOrder.items.map((item) => ({
              productId: item.productId,
              batchId: item.batchId ?? undefined,
              quantityBase: Number(item.quantityBase),
              unitUsed: item.unitUsed,
              quantityDisplay: Number(item.quantityDisplay),
              unitPriceSnapshot: Number(item.unitPriceSnapshot),
            })),
          },
        },
      })

      await (tx.exportOrder as any).update({
        where: { id: sourceOrder.id },
        data: { adjustedByOrderId: createdOrder.id },
      })

      await tx.exportOrderHistory.create({
        data: {
          exportOrderId: sourceOrder.id,
          actionType: 'adjustment_created',
          actionLabel: `Tạo phiếu điều chỉnh ${createdOrder.orderRef}`,
          actorId,
          data: {
            adjustmentOrderId: createdOrder.id.toString(),
            adjustmentOrderRef: createdOrder.orderRef,
          },
        },
      })

      await tx.exportOrderHistory.create({
        data: {
          exportOrderId: createdOrder.id,
          actionType: 'created',
          actionLabel: 'Tạo phiếu xuất điều chỉnh',
          actorId,
          data: {
            sourceOrderId: sourceOrder.id.toString(),
            sourceOrderRef: sourceOrder.orderRef,
          },
        },
      })

      return createdOrder
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.status(201).json({ id: String(created.id), orderRef: created.orderRef })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      res.status(409).json({ error: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' })
      return
    }

    const message = err instanceof Error ? err.message : 'Không thể tạo phiếu điều chỉnh.'
    if (message === 'Export order not found') {
      res.status(404).json({ error: message })
      return
    }
    if (
      message === 'Chỉ có thể tạo phiếu điều chỉnh từ phiếu đã hoàn thành.'
      || message === 'Phiếu này đã có một phiếu điều chỉnh khác.'
      || message === 'Không thể tạo điều chỉnh chồng cho phiếu điều chỉnh.'
      || message === 'Phiếu hoàn thành không có dòng dữ liệu để điều chỉnh.'
      || message === 'Không thể tạo mã phiếu điều chỉnh mới. Vui lòng thử lại.'
    ) {
      res.status(409).json({ error: message })
      return
    }

    console.error(err)
    res.status(500).json({ error: 'Không thể tạo phiếu điều chỉnh.' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// FULFIL / CANCEL
// ──────────────────────────────────────────────────────────────────────
router.patch('/:id/fulfil', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.exportOrder.findUnique({
        where: { id: orderId },
        include: {
          sourceOrder: {
            select: {
              id: true,
              orderRef: true,
              status: true,
              adjustedByOrderId: true,
              items: {
                select: {
                  id: true,
                  batchId: true,
                  quantityBase: true,
                },
              },
            },
          },
          items: {
            select: {
              id: true,
              batchId: true,
              quantityBase: true,
            },
          },
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

      if (!order) throw new Error('Export order not found')
      const orderAny = order as any
      if (order.status === ExportOrderStatus.fulfilled) throw new Error('Already fulfilled')
      if (order.status === ExportOrderStatus.cancelled) throw new Error('Cannot fulfil a cancelled order')

      if (orderAny.sourceOrderId) {
        if (!orderAny.sourceOrder) {
          throw new Error('Không tìm thấy phiếu gốc để điều chỉnh.')
        }
        if (orderAny.sourceOrder.status !== ExportOrderStatus.fulfilled) {
          throw new Error('Phiếu gốc chưa ở trạng thái hoàn thành, không thể void & điều chỉnh.')
        }
        if (orderAny.sourceOrder.adjustedByOrderId !== order.id) {
          throw new Error('Phiếu gốc không còn liên kết với phiếu điều chỉnh hiện tại.')
        }

        // Void source fulfilled order stock impact before applying adjusted allocation.
        for (const sourceItem of orderAny.sourceOrder.items) {
          if (!sourceItem.batchId) continue
          const sourceQty = Number(sourceItem.quantityBase)
          if (sourceQty <= 0) continue

          await tx.inventoryTransaction.create({
            data: {
              batchId: sourceItem.batchId,
              userId: actorId,
              exportOrderItemId: sourceItem.id,
              type: 'adjustment',
              quantityBase: sourceQty,
              notes: `Void phiếu gốc ${orderAny.sourceOrder.orderRef ?? `#${orderAny.sourceOrder.id}`} do điều chỉnh ${order.orderRef ?? `#${order.id}`}`,
              transactionDate: order.exportedAt ?? new Date(),
            },
          })

          await tx.batch.update({
            where: { id: sourceItem.batchId },
            data: { currentQtyBase: { increment: sourceQty } },
          })
        }

        await tx.exportOrderItem.updateMany({
          where: { exportOrderId: orderAny.sourceOrder.id },
          data: { status: ExportOrderStatus.cancelled },
        })

        await tx.exportOrder.update({
          where: { id: orderAny.sourceOrder.id },
          data: { status: ExportOrderStatus.cancelled },
        })

        await tx.exportOrderHistory.create({
          data: {
            exportOrderId: orderAny.sourceOrder.id,
            actionType: 'adjusted',
            actionLabel: `Void do điều chỉnh bởi phiếu ${order.orderRef ?? `#${order.id}`}`,
            actorId,
            data: {
              adjustmentOrderId: order.id.toString(),
              adjustmentOrderRef: order.orderRef,
            },
          },
        })
      }

      // For shortage-linked orders: only allow fulfilment after linked PO has received enough quantity.
      if (order.purchaseRequests.length > 0) {
        const blockingPO = order.purchaseRequests.find((pr) =>
          pr.items.some((item) => Number(item.receivedQtyBase) + 0.0001 < Number(item.quantityNeededBase)),
        )

        if (blockingPO) {
          throw new Error(`Không thể đánh dấu hoàn thành. PO liên quan ${blockingPO.requestRef} chưa nhận đủ hàng theo số lượng yêu cầu.`)
        }
      }

      for (const item of order.items) {
        if (!item.batchId) continue
        const qty = Number(item.quantityBase)
        if (qty <= 0) continue

        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
          select: { id: true, currentQtyBase: true },
        })
        if (!batch) throw new Error(`Batch ${item.batchId} not found`)
        if (Number(batch.currentQtyBase) < qty) {
          throw new Error(`Insufficient stock in batch ${item.batchId}`)
        }

        await tx.inventoryTransaction.create({
          data: {
            batchId: item.batchId,
            userId: actorId,
            exportOrderItemId: item.id,
            type: 'export',
            quantityBase: qty,
            notes: order.orderRef ? `Xuất kho khi hoàn thành phiếu ${order.orderRef}` : undefined,
            transactionDate: order.exportedAt ?? new Date(),
          },
        })

        await tx.batch.update({
          where: { id: item.batchId },
          data: { currentQtyBase: { decrement: qty } },
        })
      }

      await tx.exportOrderItem.updateMany({
        where: { exportOrderId: order.id },
        data: { status: ExportOrderStatus.fulfilled },
      })

      const fulfilledOrder = await tx.exportOrder.update({
        where: { id: order.id },
        data: { status: ExportOrderStatus.fulfilled, exportedAt: order.exportedAt ?? new Date() },
      })

      await tx.exportOrderHistory.create({
        data: {
          exportOrderId: order.id,
          actionType: 'fulfilled',
          actionLabel: 'Đánh dấu hoàn thành xuất kho',
          actorId,
          data: { orderRef: order.orderRef },
        },
      })

      return fulfilledOrder
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.json(updated)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      res.status(409).json({ error: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' })
      return
    }

    const message = err instanceof Error ? err.message : 'Không thể đánh dấu hoàn thành.'
    if (message === 'Export order not found') {
      res.status(404).json({ error: message })
      return
    }
    if (message === 'Already fulfilled' || message === 'Cannot fulfil a cancelled order' || message.startsWith('Không thể đánh dấu hoàn thành.')) {
      res.status(409).json({ error: message })
      return
    }
    if (message.startsWith('Insufficient stock in batch') || message.startsWith('Batch ')) {
      res.status(409).json({ error: message })
      return
    }

    console.error(err)
    res.status(500).json({ error: 'Không thể đánh dấu hoàn thành.' })
  }
})

router.patch('/:id/cancel', requireAuth, requirePermission('sales.write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.exportOrder.findUnique({ where: { id: orderId } })

      if (!order) throw new Error('Export order not found')
      const orderAny = order as any
      if (order.status === ExportOrderStatus.fulfilled) {
        throw new Error('Cannot cancel a fulfilled order')
      }
      if (order.status === ExportOrderStatus.cancelled) {
        throw new Error('Order is already cancelled')
      }

      const cancelledOrder = await tx.exportOrder.update({
        where: { id: order.id },
        data: { status: ExportOrderStatus.cancelled },
      })

      await tx.exportOrderItem.updateMany({
        where: { exportOrderId: order.id },
        data: { status: ExportOrderStatus.cancelled },
      })

      if (orderAny.sourceOrderId) {
        await tx.exportOrder.updateMany({
          where: {
            id: orderAny.sourceOrderId,
            adjustedByOrderId: order.id,
          },
          data: { adjustedByOrderId: null },
        })

        await tx.exportOrderHistory.create({
          data: {
            exportOrderId: orderAny.sourceOrderId,
            actionType: 'adjustment_restored',
            actionLabel: `Phục hồi phiếu gốc do hủy phiếu điều chỉnh ${order.orderRef ?? `#${order.id}`}`,
            actorId,
            data: {
              adjustmentOrderId: order.id.toString(),
              adjustmentOrderRef: order.orderRef,
              restoredBecause: 'adjustment_cancelled',
            },
          },
        })
      }

      await tx.exportOrderHistory.create({
        data: {
          exportOrderId: order.id,
          actionType: 'cancelled',
          actionLabel: 'Hủy lệnh xuất kho',
          actorId,
          data: {
            orderRef: order.orderRef,
            restoredItemCount: 0,
          },
        },
      })

      return cancelledOrder
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cannot cancel export order'
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      res.status(409).json({ error: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' })
      return
    }
    if (message === 'Export order not found') {
      res.status(404).json({ error: message })
      return
    }
    if (message === 'Cannot cancel a fulfilled order' || message === 'Order is already cancelled') {
      res.status(409).json({ error: message })
      return
    }

    console.error(err)
    res.status(500).json({ error: 'Cannot cancel export order' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// HISTORY
// ──────────────────────────────────────────────────────────────────────
router.get('/:id/history', requireAuth, requirePermission('sales.read'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)

  const order = await prisma.exportOrder.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) { res.status(404).json({ error: 'Export order not found' }); return }

  const rows = await prisma.exportOrderHistory.findMany({
    where: { exportOrderId: orderId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { fullName: true } } },
  })

  res.json(rows.map((r) => ({
    id: String(r.id),
    actionType: r.actionType,
    actionLabel: r.actionLabel,
    actorName: r.actor.fullName,
    createdAt: r.createdAt.toISOString(),
    data: r.data,
  })))
})

export default router
