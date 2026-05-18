import { Router } from 'express'
import { z } from 'zod'
import { ExportOrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTpRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `XKTP-${yyyy}${mm}${dd}-${hh}${min}${ss}${ms}`
}

async function buildAdjustmentOrderRef(sourceOrderRef: string | null, tx: Prisma.TransactionClient): Promise<string> {
  const baseRef = sourceOrderRef?.trim() ? sourceOrderRef.trim() : buildTpRef()
  const base = `${baseRef}-ADJ`
  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`
    const existed = await tx.tpExportOrder.findFirst({ where: { orderRef: candidate }, select: { id: true } })
    if (!existed) return candidate
  }
  throw new Error('Không thể tạo mã phiếu điều chỉnh mới. Vui lòng thử lại.')
}

// ─── TP Stock query helper ─────────────────────────────────────────────────────
// Returns available stock per (outputProductId, lotNo, expiryDate) from production_output_transactions

type TpStockRow = {
  outputProductId: bigint
  batchLotNo: string | null
  batchExpiryDate: Date | null
  warehouseLocationId: bigint | null
  availableQty: number
}

async function queryTpStock(outputProductId?: bigint): Promise<TpStockRow[]> {
  const where = outputProductId
    ? Prisma.sql`WHERE t.output_product_id = ${outputProductId}`
    : Prisma.sql`WHERE 1=1`

  const rows = await prisma.$queryRaw<Array<{
    outputProductId: bigint
    batchLotNo: string | null
    batchExpiryDate: Date | null
    warehouseLocationId: bigint | null
    availableQty: number
  }>>`
    SELECT
      t.output_product_id                                                   AS outputProductId,
      t.batch_lot_no                                                        AS batchLotNo,
      t.batch_expiry_date                                                   AS batchExpiryDate,
      t.warehouse_location_id                                               AS warehouseLocationId,
      SUM(CASE
        WHEN t.type = 'import_from_production' THEN CAST(t.quantity_base AS DECIMAL(15,4))
        ELSE -CAST(t.quantity_base AS DECIMAL(15,4))
      END)                                                                  AS availableQty
    FROM production_output_transactions t
    ${where}
    GROUP BY t.output_product_id, t.batch_lot_no, t.batch_expiry_date, t.warehouse_location_id
    HAVING availableQty > 0.0001
    ORDER BY t.batch_expiry_date ASC, t.batch_lot_no ASC
  `
  return rows.map(r => ({ ...r, availableQty: Number(r.availableQty) }))
}

// ──────────────────────────────────────────────────────────────────────
// TP STOCK API
// ──────────────────────────────────────────────────────────────────────

router.get('/tp-stock', requireAuth, requirePermission('outbound:view'), async (req: AuthenticatedRequest, res) => {
  const { outputProductId } = req.query as Record<string, string>
  const productId = outputProductId ? BigInt(outputProductId) : undefined
  const rows = await queryTpStock(productId)

  // Enrich with product info
  const productIds = [...new Set(rows.map(r => r.outputProductId))]
  const products = await prisma.productOutput.findMany({
    where: { id: { in: productIds } },
    select: { id: true, code: true, name: true, unit: true, outputType: true },
  })
  const productMap = new Map(products.map(p => [p.id.toString(), p]))

  res.json(rows.map(r => ({
    outputProductId: r.outputProductId.toString(),
    batchLotNo: r.batchLotNo,
    batchExpiryDate: r.batchExpiryDate ? r.batchExpiryDate.toISOString() : null,
    warehouseLocationId: r.warehouseLocationId?.toString() ?? null,
    availableQty: r.availableQty,
    product: productMap.get(r.outputProductId.toString()) ?? null,
  })))
})

router.get('/tp-fefo', requireAuth, requirePermission('outbound:view'), async (req: AuthenticatedRequest, res) => {
  const { outputProductId, limit } = req.query as Record<string, string>
  if (!outputProductId) { res.status(400).json({ error: 'outputProductId is required' }); return }

  const productId = BigInt(outputProductId)
  const rows = await queryTpStock(productId)
  const take = Math.min(Math.max(Number(limit ?? 5), 1), 50)

  const product = await prisma.productOutput.findUnique({
    where: { id: productId },
    select: { id: true, code: true, name: true, unit: true, outputType: true },
  })

  res.json(rows.slice(0, take).map(r => ({
    outputProductId: r.outputProductId.toString(),
    batchLotNo: r.batchLotNo,
    batchExpiryDate: r.batchExpiryDate ? r.batchExpiryDate.toISOString() : null,
    warehouseLocationId: r.warehouseLocationId?.toString() ?? null,
    availableQty: r.availableQty,
    product,
  })))
})

// ──────────────────────────────────────────────────────────────────────
// LIST
// ──────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, requirePermission('outbound:view'), async (req: AuthenticatedRequest, res) => {
  const { customerId, status, q, sortBy = 'createdAt', sortDir = 'desc', page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.TpExportOrderWhereInput = {}
  const direction: Prisma.SortOrder = sortDir === 'asc' ? 'asc' : 'desc'

  const orderBy: Prisma.TpExportOrderOrderByWithRelationInput[] =
    sortBy === 'status'    ? [{ status: direction }, { createdAt: 'desc' }]
    : sortBy === 'orderRef' ? [{ orderRef: direction }, { createdAt: 'desc' }]
    : sortBy === 'exportedAt' ? [{ exportedAt: direction }, { createdAt: 'desc' }]
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
    prisma.tpExportOrder.findMany({
      where, skip, take: Number(limit), orderBy,
      include: {
        customer:       { select: { id: true, name: true } },
        sourceLocation: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            outputProduct: { select: { id: true, code: true, name: true, unit: true, outputType: true } },
          },
        },
      },
    }),
    prisma.tpExportOrder.count({ where }),
  ])

  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

// ──────────────────────────────────────────────────────────────────────
// GET SINGLE
// ──────────────────────────────────────────────────────────────────────

router.get('/:id', requireAuth, requirePermission('outbound:view'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.tpExportOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      sourceOrder:      { select: { id: true, orderRef: true, status: true } },
      adjustedByOrder:  { select: { id: true, orderRef: true, status: true } },
      customer:         { select: { id: true, code: true, name: true } },
      sourceLocation:   { select: { id: true, code: true, name: true } },
      creator:          { select: { id: true, fullName: true } },
      items: {
        include: {
          outputProduct: { select: { id: true, code: true, name: true, unit: true, outputType: true } },
        },
      },
    },
  })
  if (!order) { res.status(404).json({ error: 'TP export order not found' }); return }
  res.json(order)
})

// ──────────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  outputProductId:     z.string(),
  lotNo:               z.string().optional().nullable(),
  expiryDate:          z.string().optional().nullable(),
  warehouseLocationId: z.string().optional().nullable(),
  quantityBase:        z.number().positive(),
  unitUsed:            z.string(),
  quantityDisplay:     z.number().positive(),
})

const orderSchema = z.object({
  orderRef:          z.string().optional(),
  customerId:        z.string().optional(),
  sourceLocationId:  z.string().optional(),
  exportedAt:        z.string().optional(),
  notes:             z.string().optional(),
  dienGiai:          z.string().optional(),
  items:             z.array(itemSchema),
})

router.post('/', requireAuth, requirePermission('outbound:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data
  const createdBy = BigInt(req.auth!.sub)

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.tpExportOrder.create({
      data: {
        orderRef:         header.orderRef,
        customerId:       header.customerId        ? BigInt(header.customerId)       : undefined,
        sourceLocationId: header.sourceLocationId  ? BigInt(header.sourceLocationId) : undefined,
        exportedAt:       header.exportedAt        ? new Date(header.exportedAt)     : undefined,
        notes:            header.notes,
        dienGiai:         header.dienGiai,
        createdBy,
        items: {
          create: items.map((i) => ({
            outputProductId:     BigInt(i.outputProductId),
            lotNo:               i.lotNo ?? null,
            expiryDate:          i.expiryDate ? new Date(i.expiryDate) : null,
            warehouseLocationId: i.warehouseLocationId ? BigInt(i.warehouseLocationId) : null,
            quantityBase:        i.quantityBase,
            unitUsed:            i.unitUsed,
            quantityDisplay:     i.quantityDisplay,
          })),
        },
      },
      include: { items: true },
    })

    await tx.tpExportOrderHistory.create({
      data: {
        exportOrderId: created.id,
        actionType:    'created',
        actionLabel:   'Tạo lệnh xuất thành phẩm',
        actorId:       createdBy,
        data: { orderRef: created.orderRef, itemCount: items.length },
      },
    })

    return created
  })

  res.status(201).json(order)
})

// ──────────────────────────────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────────────────────────────

router.put('/:id', requireAuth, requirePermission('outbound:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const orderId = BigInt(req.params.id)
  const { items, ...header } = parsed.data
  const actorId = BigInt(req.auth!.sub)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.tpExportOrder.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      })
      if (!existing) throw new Error('TP export order not found')
      if (existing.status === ExportOrderStatus.cancelled) throw new Error('Không thể chỉnh sửa phiếu đã huỷ')
      if (existing.status === ExportOrderStatus.fulfilled) throw new Error('Không thể chỉnh sửa phiếu đã hoàn thành')

      await tx.tpExportOrderItem.deleteMany({ where: { exportOrderId: orderId } })

      const saved = await tx.tpExportOrder.update({
        where: { id: orderId },
        data: {
          orderRef:         header.orderRef,
          customerId:       header.customerId        ? BigInt(header.customerId)       : null,
          sourceLocationId: header.sourceLocationId  ? BigInt(header.sourceLocationId) : null,
          exportedAt:       header.exportedAt        ? new Date(header.exportedAt)     : existing.status === ExportOrderStatus.pending ? null : undefined,
          notes:            header.notes,
          dienGiai:         header.dienGiai ?? null,
          items: {
            create: items.map((i) => ({
              outputProductId:     BigInt(i.outputProductId),
              lotNo:               i.lotNo ?? null,
              expiryDate:          i.expiryDate ? new Date(i.expiryDate) : null,
              warehouseLocationId: i.warehouseLocationId ? BigInt(i.warehouseLocationId) : null,
              quantityBase:        i.quantityBase,
              unitUsed:            i.unitUsed,
              quantityDisplay:     i.quantityDisplay,
            })),
          },
        },
        include: { items: true },
      })

      await tx.tpExportOrderHistory.create({
        data: {
          exportOrderId: orderId,
          actionType:    'updated',
          actionLabel:   'Cập nhật lệnh xuất thành phẩm',
          actorId,
          data: { orderRef: saved.orderRef, itemCount: items.length },
        },
      })

      return saved
    })

    res.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể cập nhật phiếu.'
    if (message === 'TP export order not found') { res.status(404).json({ error: message }); return }
    if (message.includes('Không thể chỉnh sửa')) { res.status(409).json({ error: message }); return }
    res.status(500).json({ error: message })
  }
})

// ──────────────────────────────────────────────────────────────────────
// VOID & RE-RELEASE (adjustment)
// ──────────────────────────────────────────────────────────────────────

router.post('/:id/void-rerelease', requireAuth, requirePermission('outbound:write'), async (req: AuthenticatedRequest, res) => {
  const sourceOrderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const sourceOrder = await tx.tpExportOrder.findUnique({
        where: { id: sourceOrderId },
        include: {
          items: {
            orderBy: { id: 'asc' },
            select: {
              outputProductId: true,
              lotNo: true,
              expiryDate: true,
              warehouseLocationId: true,
              quantityBase: true,
              unitUsed: true,
              quantityDisplay: true,
            },
          },
        },
      })

      if (!sourceOrder) throw new Error('TP export order not found')
      if (sourceOrder.status !== ExportOrderStatus.fulfilled) {
        throw new Error('Chỉ có thể tạo phiếu điều chỉnh từ phiếu đã hoàn thành.')
      }
      if (sourceOrder.adjustedByOrderId) throw new Error('Phiếu này đã có một phiếu điều chỉnh khác.')
      if (sourceOrder.sourceOrderId) throw new Error('Không thể tạo điều chỉnh chồng cho phiếu điều chỉnh.')
      if (sourceOrder.items.length === 0) throw new Error('Phiếu hoàn thành không có dòng dữ liệu để điều chỉnh.')

      const nextOrderRef = await buildAdjustmentOrderRef(sourceOrder.orderRef ?? null, tx)
      const newOrder = await tx.tpExportOrder.create({
        data: {
          orderRef:    nextOrderRef,
          customerId:  sourceOrder.customerId,
          sourceOrderId: sourceOrder.id,
          createdBy:   actorId,
          status:      ExportOrderStatus.pending,
          notes: `Phiếu điều chỉnh (Void & re-export) từ ${sourceOrder.orderRef ?? `#${sourceOrder.id}`}`,
          items: {
            create: sourceOrder.items.map((item) => ({
              outputProductId:     item.outputProductId,
              lotNo:               item.lotNo,
              expiryDate:          item.expiryDate,
              warehouseLocationId: item.warehouseLocationId,
              quantityBase:        Number(item.quantityBase),
              unitUsed:            item.unitUsed,
              quantityDisplay:     Number(item.quantityDisplay),
            })),
          },
        },
      })

      await tx.tpExportOrder.update({
        where: { id: sourceOrder.id },
        data: { adjustedByOrderId: newOrder.id },
      })

      await tx.tpExportOrderHistory.createMany({
        data: [
          {
            exportOrderId: sourceOrder.id,
            actionType:    'adjustment_created',
            actionLabel:   `Tạo phiếu điều chỉnh ${newOrder.orderRef}`,
            actorId,
            data: { adjustmentOrderId: newOrder.id.toString(), adjustmentOrderRef: newOrder.orderRef },
          },
          {
            exportOrderId: newOrder.id,
            actionType:    'created',
            actionLabel:   'Tạo phiếu xuất điều chỉnh',
            actorId,
            data: { sourceOrderId: sourceOrder.id.toString(), sourceOrderRef: sourceOrder.orderRef },
          },
        ],
      })

      return newOrder
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.status(201).json({ id: String(created.id), orderRef: created.orderRef })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      res.status(409).json({ error: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' }); return
    }
    const message = err instanceof Error ? err.message : 'Không thể tạo phiếu điều chỉnh.'
    const conflictMessages = [
      'Chỉ có thể tạo phiếu điều chỉnh từ phiếu đã hoàn thành.',
      'Phiếu này đã có một phiếu điều chỉnh khác.',
      'Không thể tạo điều chỉnh chồng cho phiếu điều chỉnh.',
      'Phiếu hoàn thành không có dòng dữ liệu để điều chỉnh.',
      'Không thể tạo mã phiếu điều chỉnh mới. Vui lòng thử lại.',
    ]
    if (message === 'TP export order not found') { res.status(404).json({ error: message }); return }
    if (conflictMessages.includes(message)) { res.status(409).json({ error: message }); return }
    console.error(err)
    res.status(500).json({ error: 'Không thể tạo phiếu điều chỉnh.' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// FULFIL  — deducts stock via export_to_sale transactions
// ──────────────────────────────────────────────────────────────────────

router.patch('/:id/fulfil', requireAuth, requirePermission('outbound:write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.tpExportOrder.findUnique({
        where: { id: orderId },
        include: {
          sourceOrder: {
            select: {
              id: true, orderRef: true, status: true, adjustedByOrderId: true,
              items: { select: { id: true, outputProductId: true, lotNo: true, expiryDate: true, warehouseLocationId: true, quantityBase: true } },
            },
          },
          items: {
            select: { id: true, outputProductId: true, lotNo: true, expiryDate: true, warehouseLocationId: true, quantityBase: true },
          },
        },
      })

      if (!order) throw new Error('TP export order not found')
      if (order.status === ExportOrderStatus.fulfilled) throw new Error('Already fulfilled')
      if (order.status === ExportOrderStatus.cancelled) throw new Error('Cannot fulfil a cancelled order')

      // Void + re-release flow: reverse source order's export_to_sale transactions first
      if (order.sourceOrderId && order.sourceOrder) {
        if (order.sourceOrder.status !== ExportOrderStatus.fulfilled) {
          throw new Error('Phiếu gốc chưa ở trạng thái hoàn thành, không thể void & điều chỉnh.')
        }
        if (order.sourceOrder.adjustedByOrderId !== order.id) {
          throw new Error('Phiếu gốc không còn liên kết với phiếu điều chỉnh hiện tại.')
        }

        // Reverse source order's stock deductions
        for (const srcItem of order.sourceOrder.items) {
          const qty = Number(srcItem.quantityBase)
          if (qty <= 0) continue
          await tx.productionOutputTransaction.create({
            data: {
              productionOrderId:    BigInt(0), // sentinel: manual reversal
              outputProductId:      srcItem.outputProductId,
              type:                 'import_from_production', // positive = restore stock
              quantityBase:         qty,
              warehouseLocationId:  srcItem.warehouseLocationId,
              batchLotNo:           srcItem.lotNo,
              batchExpiryDate:      srcItem.expiryDate,
              userId:               actorId,
              notes:                `Void phiếu gốc ${order.sourceOrder.orderRef ?? `#${order.sourceOrder.id}`} do điều chỉnh ${order.orderRef ?? `#${order.id}`}`,
              transactionDate:      new Date(),
            },
          })
        }

        await tx.tpExportOrder.update({ where: { id: order.sourceOrder.id }, data: { status: ExportOrderStatus.cancelled } })
        await tx.tpExportOrderHistory.create({
          data: {
            exportOrderId: order.sourceOrder.id,
            actionType:    'adjusted',
            actionLabel:   `Void do điều chỉnh bởi phiếu ${order.orderRef ?? `#${order.id}`}`,
            actorId,
            data: { adjustmentOrderId: order.id.toString(), adjustmentOrderRef: order.orderRef },
          },
        })
      }

      // Validate stock availability for each item
      for (const item of order.items) {
        const qty = Number(item.quantityBase)
        if (qty <= 0) continue

        const stockRows = await queryTpStock(item.outputProductId)
        const match = stockRows.find(r =>
          r.batchLotNo === item.lotNo &&
          r.warehouseLocationId?.toString() === item.warehouseLocationId?.toString() &&
          (item.expiryDate === null ? r.batchExpiryDate === null : r.batchExpiryDate?.toISOString().slice(0,10) === item.expiryDate?.toISOString().slice(0,10)),
        )
        const available = match?.availableQty ?? 0
        if (available < qty - 0.0001) {
          throw new Error(`Không đủ tồn kho cho lô ${item.lotNo ?? '(không có lô)'} – cần ${qty}, còn ${available.toFixed(3)}`)
        }
      }

      // Deduct stock via export_to_sale transactions
      for (const item of order.items) {
        const qty = Number(item.quantityBase)
        if (qty <= 0) continue
        await tx.productionOutputTransaction.create({
          data: {
            productionOrderId:   BigInt(0), // sentinel: standalone TP export
            outputProductId:     item.outputProductId,
            type:                'export_to_sale',
            quantityBase:        qty,
            warehouseLocationId: item.warehouseLocationId,
            batchLotNo:          item.lotNo,
            batchExpiryDate:     item.expiryDate,
            userId:              actorId,
            notes:               order.orderRef ? `Xuất TP theo phiếu ${order.orderRef}` : undefined,
            transactionDate:     order.exportedAt ?? new Date(),
          },
        })
      }

      const fulfilled = await tx.tpExportOrder.update({
        where: { id: order.id },
        data: { status: ExportOrderStatus.fulfilled, exportedAt: order.exportedAt ?? new Date() },
      })

      await tx.tpExportOrderHistory.create({
        data: {
          exportOrderId: order.id,
          actionType:    'fulfilled',
          actionLabel:   'Đánh dấu hoàn thành xuất thành phẩm',
          actorId,
          data: { orderRef: order.orderRef },
        },
      })

      return fulfilled
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.json(updated)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      res.status(409).json({ error: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' }); return
    }
    const message = err instanceof Error ? err.message : 'Không thể đánh dấu hoàn thành.'
    if (message === 'TP export order not found') { res.status(404).json({ error: message }); return }
    if (['Already fulfilled', 'Cannot fulfil a cancelled order'].includes(message)
      || message.startsWith('Không đủ tồn kho')
      || message.startsWith('Phiếu gốc')
    ) { res.status(409).json({ error: message }); return }
    console.error(err)
    res.status(500).json({ error: 'Không thể đánh dấu hoàn thành.' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// CANCEL
// ──────────────────────────────────────────────────────────────────────

router.patch('/:id/cancel', requireAuth, requirePermission('outbound:write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const actorId = BigInt(req.auth!.sub)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.tpExportOrder.findUnique({ where: { id: orderId } })
      if (!order) throw new Error('TP export order not found')
      if (order.status === ExportOrderStatus.fulfilled) throw new Error('Cannot cancel a fulfilled order')
      if (order.status === ExportOrderStatus.cancelled) throw new Error('Order is already cancelled')

      const cancelled = await tx.tpExportOrder.update({
        where: { id: order.id },
        data: { status: ExportOrderStatus.cancelled },
      })

      if (order.sourceOrderId) {
        await tx.tpExportOrder.updateMany({
          where: { id: order.sourceOrderId, adjustedByOrderId: order.id },
          data: { adjustedByOrderId: null },
        })
        await tx.tpExportOrderHistory.create({
          data: {
            exportOrderId: order.sourceOrderId,
            actionType:    'adjustment_restored',
            actionLabel:   `Phục hồi phiếu gốc do hủy phiếu điều chỉnh ${order.orderRef ?? `#${order.id}`}`,
            actorId,
            data: { adjustmentOrderId: order.id.toString(), adjustmentOrderRef: order.orderRef },
          },
        })
      }

      await tx.tpExportOrderHistory.create({
        data: {
          exportOrderId: order.id,
          actionType:    'cancelled',
          actionLabel:   'Hủy lệnh xuất thành phẩm',
          actorId,
          data: { orderRef: order.orderRef },
        },
      })

      return cancelled
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cannot cancel TP export order'
    if (message === 'TP export order not found') { res.status(404).json({ error: message }); return }
    if (['Cannot cancel a fulfilled order', 'Order is already cancelled'].includes(message)) {
      res.status(409).json({ error: message }); return
    }
    console.error(err)
    res.status(500).json({ error: 'Cannot cancel TP export order' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// HISTORY
// ──────────────────────────────────────────────────────────────────────

router.get('/:id/history', requireAuth, requirePermission('outbound:view'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const order = await prisma.tpExportOrder.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) { res.status(404).json({ error: 'TP export order not found' }); return }

  const rows = await prisma.tpExportOrderHistory.findMany({
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
