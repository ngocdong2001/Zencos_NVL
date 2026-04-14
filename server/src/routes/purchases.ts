import { Router } from 'express'
import { z } from 'zod'
import { PurchaseRequestStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

function buildInboundReceiptRef(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const serial = now.getTime().toString().slice(-6)
  return `NK-${year}${month}${day}-${serial}`
}

function parseYmdDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function calculatePurchaseRequestTotalAmount(items: Array<{
  quantityDisplay: Prisma.Decimal
  unitPrice?: Prisma.Decimal
  exportOrderItem?: { unitPriceSnapshot: Prisma.Decimal } | null
}>): number {
  return Number(
    items
      .reduce((sum, item) => {
        const qty = Number(item.quantityDisplay)
        const unitPrice = Number(item.unitPrice ?? item.exportOrderItem?.unitPriceSnapshot ?? 0)
        if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum
        return sum + (qty * unitPrice)
      }, 0)
      .toFixed(2),
  )
}

type PurchaseHistoryEvent = {
  id: string
  actionType: 'created' | 'updated' | 'submitted' | 'approved' | 'ordered' | 'received' | 'cancelled'
  action: string
  actorName: string
  actorId: string | null
  at: string
}

type PurchaseEventActionType = PurchaseHistoryEvent['actionType']

const PURCHASE_EVENT_NOTIFICATION_TYPE = 'purchase_request_event'

function isPurchaseHistoryActionType(value: unknown): value is PurchaseEventActionType {
  return value === 'created'
    || value === 'updated'
    || value === 'submitted'
    || value === 'approved'
    || value === 'ordered'
    || value === 'received'
    || value === 'cancelled'
}

async function logPurchaseHistoryEvent(db: Prisma.TransactionClient | typeof prisma, input: {
  requestId: bigint
  actorId: bigint
  actionType: PurchaseEventActionType
  action: string
}) {
  await db.notification.create({
    data: {
      userId: input.actorId,
      type: PURCHASE_EVENT_NOTIFICATION_TYPE,
      data: {
        requestId: input.requestId.toString(),
        actionType: input.actionType,
        action: input.action,
      },
    },
  })
}

function mapPurchaseRequestHistory(pr: {
  id: bigint
  status: PurchaseRequestStatus
  createdAt: Date
  updatedAt: Date
  submittedAt: Date | null
  approvedAt: Date | null
  orderedAt: Date | null
  receivedAt: Date | null
  requester: { id: bigint; fullName: string }
  approver: { id: bigint; fullName: string } | null
}): PurchaseHistoryEvent[] {
  const events: PurchaseHistoryEvent[] = [
    {
      id: `created-${pr.id.toString()}`,
      actionType: 'created',
      action: 'Tạo bản nháp PO',
      actorName: pr.requester.fullName,
      actorId: pr.requester.id.toString(),
      at: pr.createdAt.toISOString(),
    },
  ]

  if (pr.updatedAt.getTime() > pr.createdAt.getTime() && pr.status === PurchaseRequestStatus.draft) {
    events.push({
      id: `updated-${pr.id.toString()}`,
      actionType: 'updated',
      action: 'Cập nhật bản nháp',
      actorName: pr.requester.fullName,
      actorId: pr.requester.id.toString(),
      at: pr.updatedAt.toISOString(),
    })
  }

  if (pr.submittedAt) {
    events.push({
      id: `submitted-${pr.id.toString()}`,
      actionType: 'submitted',
      action: 'Gửi phiếu cho thu mua',
      actorName: pr.requester.fullName,
      actorId: pr.requester.id.toString(),
      at: pr.submittedAt.toISOString(),
    })
  }

  if (pr.approvedAt) {
    events.push({
      id: `approved-${pr.id.toString()}`,
      actionType: 'approved',
      action: 'Duyệt phiếu',
      actorName: pr.approver?.fullName ?? 'Hệ thống',
      actorId: pr.approver?.id.toString() ?? null,
      at: pr.approvedAt.toISOString(),
    })
  }

  if (pr.orderedAt) {
    events.push({
      id: `ordered-${pr.id.toString()}`,
      actionType: 'ordered',
      action: 'Đặt hàng',
      actorName: pr.approver?.fullName ?? pr.requester.fullName,
      actorId: pr.approver?.id.toString() ?? pr.requester.id.toString(),
      at: pr.orderedAt.toISOString(),
    })
  }

  if (pr.receivedAt) {
    events.push({
      id: `received-${pr.id.toString()}`,
      actionType: 'received',
      action: 'Xác nhận đã nhận hàng',
      actorName: pr.approver?.fullName ?? 'Thủ kho',
      actorId: pr.approver?.id.toString() ?? null,
      at: pr.receivedAt.toISOString(),
    })
  }

  if (pr.status === PurchaseRequestStatus.cancelled) {
    events.push({
      id: `cancelled-${pr.id.toString()}`,
      actionType: 'cancelled',
      action: 'Hủy phiếu',
      actorName: pr.approver?.fullName ?? pr.requester.fullName,
      actorId: pr.approver?.id.toString() ?? pr.requester.id.toString(),
      at: pr.updatedAt.toISOString(),
    })
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

// ──────────────────────────────────────────────────────────────────────
// LIST / GET  (Purchase Requests = warehouse procurement workflow)
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('purchases.read'), async (req: AuthenticatedRequest, res) => {
  const { supplierId, status, page = '1', limit = '20', fromDate, toDate } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.PurchaseRequestWhereInput = {}
  if (supplierId) where.supplierId = BigInt(supplierId)
  if (status) where.status = status as PurchaseRequestStatus

  const parsedFromDate = fromDate ? parseYmdDate(fromDate) : null
  const parsedToDate = toDate ? parseYmdDate(toDate) : null

  if (fromDate && !parsedFromDate) {
    res.status(400).json({ error: 'fromDate không hợp lệ, cần định dạng YYYY-MM-DD.' })
    return
  }

  if (toDate && !parsedToDate) {
    res.status(400).json({ error: 'toDate không hợp lệ, cần định dạng YYYY-MM-DD.' })
    return
  }

  if (parsedFromDate && parsedToDate && parsedFromDate.getTime() > parsedToDate.getTime()) {
    res.status(400).json({ error: 'Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.' })
    return
  }

  const createdAtFilter: Prisma.DateTimeFilter = {}
  if (parsedFromDate) {
    createdAtFilter.gte = parsedFromDate
  }
  if (parsedToDate) {
    const nextDay = new Date(parsedToDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    createdAtFilter.lt = nextDay
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.createdAt = createdAtFilter
  }

  const [rawData, total] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        receivingLocation: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            exportOrderItem: { select: { unitPriceSnapshot: true } },
          },
        },
      },
    }),
    prisma.purchaseRequest.count({ where }),
  ])

  const data = rawData.map((row) => ({
    ...row,
    totalAmount: calculatePurchaseRequestTotalAmount(row.items),
  }))

  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('purchases.read'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      supplier: true,
      receivingLocation: { select: { id: true, code: true, name: true } },
      requester: { select: { id: true, fullName: true } },
      approver: { select: { id: true, fullName: true } },
      items: {
        include: {
          product: {
            include: {
              orderUnitRef: { select: { id: true, unitName: true, unitCodeName: true, conversionToBase: true } },
            },
          },
          exportOrderItem: { select: { unitPriceSnapshot: true } },
        },
      },
    },
  })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  res.json({
    ...pr,
    totalAmount: calculatePurchaseRequestTotalAmount(pr.items),
  })
})

router.get('/:id/history', requireAuth, requirePermission('purchases.read'), async (req: AuthenticatedRequest, res) => {
  const requestId = BigInt(req.params.id)

  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: BigInt(req.params.id) },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      approvedAt: true,
      orderedAt: true,
      receivedAt: true,
      requester: { select: { id: true, fullName: true } },
      approver: { select: { id: true, fullName: true } },
    },
  })

  if (!pr) {
    res.status(404).json({ error: 'Purchase request not found' })
    return
  }

  const persistedEvents = await prisma.notification.findMany({
    where: { type: PURCHASE_EVENT_NOTIFICATION_TYPE },
    orderBy: { createdAt: 'desc' },
  })

  const filteredEvents = persistedEvents.filter((row) => {
    const data = row.data as Record<string, unknown> | null
    return String(data?.requestId ?? '') === requestId.toString()
  })

  const actorIds = [...new Set(filteredEvents.map((event) => event.userId))]
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true },
  })
  const actorNameById = new Map(actors.map((actor) => [actor.id.toString(), actor.fullName]))

  const history = filteredEvents
    .map((row): PurchaseHistoryEvent | null => {
      const data = row.data as Record<string, unknown> | null
      const actionType = data?.actionType
      const action = String(data?.action ?? '').trim()
      if (!isPurchaseHistoryActionType(actionType)) return null
      if (!action) return null

      const actorId = row.userId.toString()
      const actorName = actorNameById.get(actorId) ?? 'Người dùng hệ thống'

      return {
        id: `event-${row.id.toString()}`,
        actionType,
        action,
        actorName,
        actorId,
        at: row.createdAt.toISOString(),
      }
    })
    .filter((event): event is PurchaseHistoryEvent => Boolean(event))

  if (history.length === 0) {
    // Backward-compatibility fallback for old records created before per-save event logging.
    const fallbackHistory = mapPurchaseRequestHistory(pr)
    res.json({ data: fallbackHistory })
    return
  }

  res.json({ data: history })
})

// ──────────────────────────────────────────────────────────────────────
// CREATE (draft)
// ──────────────────────────────────────────────────────────────────────
const prItemSchema = z.object({
  productId: z.string(),
  quantityNeededBase: z.number().positive(),
  unitDisplay: z.string(),
  quantityDisplay: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})

const createPRSchema = z.object({
  requestRef: z.string().min(1).regex(/^PO-/i, 'Mã tham chiếu phải bắt đầu bằng PO-'),
  supplierId: z.string().optional(),
  receivingLocationId: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prItemSchema).min(1),
})

const updatePRSchema = z.object({
  requestRef: z.string().min(1).regex(/^PO-/i, 'Mã tham chiếu phải bắt đầu bằng PO-').optional(),
  supplierId: z.string().optional(),
  receivingLocationId: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prItemSchema).min(1),
})

router.post('/', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const parsed = createPRSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { items, ...header } = parsed.data
  const requestedBy = BigInt(req.auth!.sub)

  const pr = await prisma.purchaseRequest.create({
    data: {
      requestRef: header.requestRef,
      requestedBy,
      supplierId: header.supplierId ? BigInt(header.supplierId) : undefined,
      receivingLocationId: header.receivingLocationId ? BigInt(header.receivingLocationId) : undefined,
      expectedDate: header.expectedDate ? new Date(header.expectedDate) : undefined,
      notes: header.notes,
      items: {
        create: items.map((i) => ({
          productId: BigInt(i.productId),
          quantityNeededBase: i.quantityNeededBase,
          unitDisplay: i.unitDisplay,
          quantityDisplay: i.quantityDisplay,
          unitPrice: i.unitPrice ?? 0,
          notes: i.notes,
        })),
      },
    },
    include: { items: true },
  })

  await logPurchaseHistoryEvent(prisma, {
    requestId: pr.id,
    actorId: requestedBy,
    actionType: 'created',
    action: 'Tạo bản nháp PO',
  })

  res.status(201).json(pr)
})

router.patch('/:id', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const parsed = updatePRSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.purchaseRequest.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!existing) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (existing.status !== PurchaseRequestStatus.draft) {
    res.status(409).json({ error: 'Can only edit a draft request' }); return
  }

  const { items, ...header } = parsed.data

  const updated = await prisma.$transaction(async (db) => {
    const result = await db.purchaseRequest.update({
      where: { id: existing.id },
      data: {
        requestRef: header.requestRef,
        supplierId: header.supplierId ? BigInt(header.supplierId) : null,
        receivingLocationId: header.receivingLocationId ? BigInt(header.receivingLocationId) : null,
        expectedDate: header.expectedDate ? new Date(header.expectedDate) : null,
        notes: header.notes,
        items: {
          deleteMany: {},
          create: items.map((i) => ({
            productId: BigInt(i.productId),
            quantityNeededBase: i.quantityNeededBase,
            unitDisplay: i.unitDisplay,
            quantityDisplay: i.quantityDisplay,
            unitPrice: i.unitPrice ?? 0,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    })

    await logPurchaseHistoryEvent(db, {
      requestId: existing.id,
      actorId: BigInt(req.auth!.sub),
      actionType: 'updated',
      action: 'Lưu cập nhật bản nháp',
    })

    return result
  })

  res.json(updated)
})

// ──────────────────────────────────────────────────────────────────────
// WORKFLOW TRANSITIONS
// ──────────────────────────────────────────────────────────────────────
router.patch('/:id/submit', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (pr.status !== PurchaseRequestStatus.draft) {
    res.status(409).json({ error: 'Can only submit a draft request' }); return
  }
  const updated = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: PurchaseRequestStatus.submitted, submittedAt: new Date() },
  })

  await logPurchaseHistoryEvent(prisma, {
    requestId: pr.id,
    actorId: BigInt(req.auth!.sub),
    actionType: 'submitted',
    action: 'Gửi phiếu cho thu mua',
  })

  res.json(updated)
})

router.patch('/:id/recall', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (pr.status !== PurchaseRequestStatus.submitted) {
    res.status(409).json({ error: 'Can only recall a submitted request' }); return
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: PurchaseRequestStatus.draft, submittedAt: null },
  })

  await logPurchaseHistoryEvent(prisma, {
    requestId: pr.id,
    actorId: BigInt(req.auth!.sub),
    actionType: 'updated',
    action: 'Thu hồi phiếu về bản nháp',
  })

  res.json(updated)
})

router.patch('/:id/approve', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (pr.status !== PurchaseRequestStatus.submitted) {
    res.status(409).json({ error: 'Can only approve a submitted request' }); return
  }
  const updated = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: PurchaseRequestStatus.approved, approvedBy: BigInt(req.auth!.sub), approvedAt: new Date() },
  })

  await logPurchaseHistoryEvent(prisma, {
    requestId: pr.id,
    actorId: BigInt(req.auth!.sub),
    actionType: 'approved',
    action: 'Duyệt phiếu',
  })

  res.json(updated)
})

router.patch('/:id/receive', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      items: {
        include: {
          product: { select: { id: true, code: true } },
        },
      },
    },
  })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (!['approved', 'ordered', 'partially_received'].includes(String(pr.status))) {
    res.status(409).json({ error: 'Request must be approved or ordered before marking received' }); return
  }

  if (pr.items.length === 0) {
    res.status(409).json({ error: 'Cannot receive a request without items' })
    return
  }

  const receivedAt = new Date()
  const userId = BigInt(req.auth!.sub)

  const updated = await prisma.$transaction(async (db) => {
    const inboundRef = buildInboundReceiptRef(receivedAt)

    await db.$executeRaw(Prisma.sql`
      INSERT INTO inbound_receipts
        (receipt_ref, purchase_request_id, supplier_id, receiving_location_id, status, expected_date, received_at, qc_checked_at, created_by, posted_by, notes, created_at, updated_at)
      VALUES
        (
          ${inboundRef},
          ${pr.id},
          ${pr.supplierId},
          ${pr.receivingLocationId},
          ${'posted'},
          ${pr.expectedDate},
          ${receivedAt},
          ${receivedAt},
          ${userId},
          ${userId},
          ${`Auto-posted from purchase request ${pr.requestRef}`},
          NOW(3),
          NOW(3)
        )
    `)

    const createdInbound = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT LAST_INSERT_ID() AS id
    `)
    const inboundReceiptId = createdInbound[0]?.id
    if (!inboundReceiptId) {
      throw new Error('Cannot create inbound receipt')
    }

    const request = await db.purchaseRequest.update({
      where: { id: pr.id },
      data: { status: PurchaseRequestStatus.received, receivedAt },
    })

    for (let idx = 0; idx < pr.items.length; idx++) {
      const item = pr.items[idx]
      const lotNo = `${request.requestRef}-${item.product.code}-${Date.now().toString().slice(-6)}-${idx + 1}`

      await db.$executeRaw(Prisma.sql`
        INSERT INTO inbound_receipt_items
          (inbound_receipt_id, purchase_request_item_id, product_id, lot_no, invoice_number, invoice_date, manufacture_date, expiry_date, quantity_base, unit_used, quantity_display, unit_price_per_kg, line_amount, qc_status, has_document, posted_batch_id, posted_tx_id, notes, created_at, updated_at)
        VALUES
          (
            ${inboundReceiptId},
            ${item.id},
            ${item.productId},
            ${lotNo},
            ${null},
            ${receivedAt},
            ${null},
            ${null},
            ${item.quantityNeededBase},
            ${item.unitDisplay},
            ${item.quantityDisplay},
            ${item.unitPrice ?? 0},
            ${new Prisma.Decimal(item.quantityDisplay).mul(item.unitPrice ?? 0)},
            ${'pending'},
            ${false},
            ${null},
            ${null},
            ${`Auto-created from purchase request ${request.requestRef}`},
            NOW(3),
            NOW(3)
          )
      `)

      const createdInboundItem = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT LAST_INSERT_ID() AS id
      `)
      const inboundReceiptItemId = createdInboundItem[0]?.id
      if (!inboundReceiptItemId) {
        throw new Error('Cannot create inbound receipt item')
      }

      const batch = await db.batch.create({
        data: {
          productId: item.productId,
          supplierId: request.supplierId ?? undefined,
          inboundReceiptItemId,
          lotNo,
          receivedQtyBase: item.quantityNeededBase,
          currentQtyBase: item.quantityNeededBase,
          purchaseUnit: item.unitDisplay,
          purchaseQty: item.quantityDisplay,
          invoiceDate: receivedAt,
          status: 'available',
          notes: `Auto-created from inbound receipt ${inboundRef}`,
        },
      })

      const tx = await db.inventoryTransaction.create({
        data: {
          batchId: batch.id,
          userId,
          inboundReceiptItemId,
          type: 'import',
          quantityBase: item.quantityNeededBase,
          notes: `Goods received from inbound receipt ${inboundRef}`,
          transactionDate: receivedAt,
        },
      })

      await db.$executeRaw(Prisma.sql`
        UPDATE inbound_receipt_items
        SET posted_batch_id = ${batch.id}, posted_tx_id = ${tx.id}, qc_status = ${'passed'}, updated_at = NOW(3)
        WHERE id = ${inboundReceiptItemId}
      `)

      await db.$executeRaw(Prisma.sql`
        UPDATE purchase_request_items
        SET received_qty_base = quantity_needed_base, updated_at = NOW(3)
        WHERE id = ${item.id}
      `)
    }

    await logPurchaseHistoryEvent(db, {
      requestId: pr.id,
      actorId: userId,
      actionType: 'received',
      action: 'Xác nhận đã nhận hàng',
    })

    return request
  })

  res.json(updated)
})

router.patch('/:id/cancel', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: BigInt(req.params.id) } })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  if (pr.status === PurchaseRequestStatus.received || pr.status === PurchaseRequestStatus.cancelled) {
    res.status(409).json({ error: `Cannot cancel a ${pr.status} request` }); return
  }
  const updated = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: PurchaseRequestStatus.cancelled },
  })

  await logPurchaseHistoryEvent(prisma, {
    requestId: pr.id,
    actorId: BigInt(req.auth!.sub),
    actionType: 'cancelled',
    action: 'Hủy phiếu',
  })

  res.json(updated)
})

router.delete('/:id', requireAuth, requirePermission('purchases.write'), async (req: AuthenticatedRequest, res) => {
  const requestId = BigInt(req.params.id)
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: requestId } })
  if (!pr) {
    res.status(404).json({ error: 'Purchase request not found' })
    return
  }

  if (pr.status !== PurchaseRequestStatus.draft) {
    res.status(409).json({ error: 'Chỉ có thể xóa phiếu đang ở trạng thái bản nháp.' })
    return
  }

  await prisma.purchaseRequest.delete({ where: { id: requestId } })
  res.status(204).send()
})

export default router
