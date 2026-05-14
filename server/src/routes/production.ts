import { Router } from 'express'
import { z } from 'zod'
import { ProductionOrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOrderRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(now.getTime()).slice(-4)
  return `PSX-${yyyy}${mm}${dd}-${seq}`
}

const serializeBigInt = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (typeof obj === 'object') {
    // Handle Prisma Decimal type (decimal.js Decimal instance)
    if (typeof (obj as Record<string, unknown>).toNumber === 'function') {
      return (obj as { toNumber: () => number }).toNumber()
    }
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)])
    )
  }
  return obj
}

// ─── LINE INCLUDE ─────────────────────────────────────────────────────────────

const linesInclude = {
  lines: {
    orderBy: { id: 'asc' as const },
    include: {
      location:      { select: { id: true, code: true, name: true } },
      product:       { select: { id: true, code: true, name: true } },
      outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
    },
  },
  logs: {
    orderBy: { createdAt: 'desc' as const },
    include: { user: { select: { id: true, fullName: true } } },
  },
}

const orderInclude = {
  creator:       { select: { id: true, fullName: true } },
  skuProduct:    { select: { id: true, code: true, name: true } },
  outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
  ...linesInclude,
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const {
    status,
    q,
    sortBy = 'createdAt',
    sortDir = 'desc',
    page = '1',
    limit = '200',
  } = req.query as Record<string, string>

  const skip = (Number(page) - 1) * Number(limit)
  const direction: Prisma.SortOrder = sortDir === 'asc' ? 'asc' : 'desc'

  const where: Prisma.ProductionOrderWhereInput = {}
  if (status && status !== 'all') where.status = status as ProductionOrderStatus
  if (q?.trim()) {
    const keyword = q.trim()
    where.OR = [
      { orderRef: { contains: keyword } },
      { skuCode: { contains: keyword } },
      { skuName: { contains: keyword } },
      { productType: { contains: keyword } },
    ]
  }

  const orderBy: Prisma.ProductionOrderOrderByWithRelationInput =
    sortBy === 'issuedAt'  ? { issuedAt: direction }
    : sortBy === 'status'  ? { status: direction }
    : sortBy === 'orderRef' ? { orderRef: direction }
    : { createdAt: direction }

  const [data, total] = await Promise.all([
    prisma.productionOrder.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      include: {
        creator:       { select: { id: true, fullName: true } },
        skuProduct:    { select: { id: true, code: true, name: true } },
        outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
      },
    }),
    prisma.productionOrder.count({ where }),
  ])

  res.json(serializeBigInt({ data, total, page: Number(page), limit: Number(limit) }))
})

// ─── GET SINGLE (with lines + logs) ──────────────────────────────────────────

router.get('/:id', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const order = await prisma.productionOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    include: orderInclude,
  })
  if (!order) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  return res.json(serializeBigInt(order))
})

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  orderRef:        z.string().max(100).optional().nullable(),
  issuedAt:        z.string().optional(),
  skuProductId:    z.coerce.bigint().optional().nullable(),
  skuCode:         z.string().max(100).optional().nullable(),
  skuName:         z.string().max(255).optional().nullable(),
  productType:     z.string().max(100).optional().nullable(),
  outputProductId: z.coerce.bigint().optional().nullable(),
  notes:           z.string().optional().nullable(),
})

router.post('/', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ.', errors: parsed.error.flatten() })

  const body = parsed.data
  const userId = BigInt(req.auth!.sub)
  const orderRef = body.orderRef?.trim() || buildOrderRef()

  const order = await prisma.productionOrder.create({
    data: {
      orderRef,
      issuedAt:        body.issuedAt ? new Date(body.issuedAt) : new Date(),
      skuProductId:    body.skuProductId ?? null,
      skuCode:         body.skuCode ?? null,
      skuName:         body.skuName ?? null,
      productType:     body.productType ?? null,
      outputProductId: body.outputProductId ?? null,
      notes:           body.notes ?? null,
      createdBy: userId,
      status:    'draft',
      currentStep: 1,
      logs: {
        create: {
          userId,
          userName: req.auth!.email,
          action:   `Khởi tạo phiếu sản xuất ${orderRef}`,
          logType:  'system',
        },
      },
    },
    include: orderInclude,
  })

  return res.status(201).json(serializeBigInt(order))
})

// ─── UPDATE ORDER HEADER ──────────────────────────────────────────────────────

router.put('/:id', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ.', errors: parsed.error.flatten() })

  const existing = await prisma.productionOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { id: true, status: true },
  })
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (existing.status === 'cancelled') return res.status(400).json({ message: 'Không thể sửa lệnh đã hủy.' })

  const body = parsed.data
  const order = await prisma.productionOrder.update({
    where: { id: existing.id },
    data: {
      ...(body.orderRef     !== undefined && { orderRef:     body.orderRef }),
      ...(body.issuedAt                  && { issuedAt:     new Date(body.issuedAt) }),
      ...(body.skuProductId !== undefined && { skuProductId: body.skuProductId }),
      ...(body.skuCode         !== undefined && { skuCode:         body.skuCode }),
      ...(body.skuName         !== undefined && { skuName:         body.skuName }),
      ...(body.productType     !== undefined && { productType:     body.productType }),
      ...(body.outputProductId !== undefined && { outputProductId: body.outputProductId }),
      ...(body.notes           !== undefined && { notes:           body.notes }),
    },
    include: orderInclude,
  })
  return res.json(serializeBigInt(order))
})

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

const patchStatusSchema = z.object({
  status: z.enum(['draft', 'in_progress', 'completed', 'cancelled']),
})

router.patch('/:id/status', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = patchStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' })

  const userId = BigInt(req.auth!.sub)
  const statusLabel: Record<string, string> = {
    draft: 'Bản nháp', in_progress: 'Đang sản xuất', completed: 'Hoàn thành', cancelled: 'Đã hủy',
  }
  const order = await prisma.productionOrder.update({
    where: { id: BigInt(req.params.id) },
    data: {
      status: parsed.data.status as ProductionOrderStatus,
      logs: {
        create: {
          userId,
          userName: req.auth!.email,
          action:   `Chuyển trạng thái → ${statusLabel[parsed.data.status]}`,
          logType:  'update',
        },
      },
    },
    include: orderInclude,
  })
  return res.json(serializeBigInt(order))
})

// ─── ADVANCE STEP ─────────────────────────────────────────────────────────────

const STEP_NAMES: Record<number, string> = {
  1: 'Bước 1 – Xuất NVL',
  2: 'Bước 2 – Nhập BTP',
  3: 'Bước 3 – Xuất BTP',
  4: 'Bước 4 – Nhập TP',
}

router.patch('/:id/step', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.productionOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { id: true, currentStep: true, status: true },
  })
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (existing.status === 'cancelled') return res.status(400).json({ message: 'Không thể cập nhật lệnh đã hủy.' })

  const nextStep = Math.min((existing.currentStep ?? 1) + 1, 4)
  const userId = BigInt(req.auth!.sub)

  const order = await prisma.productionOrder.update({
    where: { id: existing.id },
    data: {
      currentStep: nextStep,
      status: 'in_progress' as ProductionOrderStatus,
      logs: {
        create: {
          userId,
          userName: req.auth!.email,
          action:   `Chuyển sang ${STEP_NAMES[nextStep] ?? `Bước ${nextStep}`}`,
          logType:  'process',
        },
      },
    },
    include: orderInclude,
  })
  return res.json(serializeBigInt(order))
})

// ─── COMPLETE ORDER ───────────────────────────────────────────────────────────

router.patch('/:id/complete', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.productionOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { id: true, status: true },
  })
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (existing.status === 'cancelled') return res.status(400).json({ message: 'Không thể hoàn thành lệnh đã hủy.' })

  const userId = BigInt(req.auth!.sub)
  
  // Fetch order with lines to create output transactions
  const orderWithLines = await prisma.productionOrder.findUnique({
    where: { id: existing.id },
    include: {
      lines: {
        include: {
          outputProduct: {
            select: { id: true, code: true, name: true, outputType: true, unit: true }
          }
        }
      }
    }
  })

  if (!orderWithLines) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })

  // Prepare transactions to create
  const transactionsToCreate = orderWithLines.lines
    .filter(line => {
      if (!line.outputProductId || !line.outputProduct?.outputType) return false
      if (line.outputProduct.outputType !== 'finished') return false
      if (!line.actualQty) return false
      const qty = typeof line.actualQty === 'object' ? parseFloat(line.actualQty.toString()) : line.actualQty
      return qty > 0
    })
    .map(line => ({
      productionOrderId: existing.id,
      outputProductId: line.outputProductId!,
      type: 'import_from_production' as const,
      quantityBase: line.actualQty!,
      warehouseLocationId: line.locationId,
      userId,
      transactionDate: new Date(),
    }))

  // Update order and create transactions in transaction
  const order = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.productionOrder.update({
      where: { id: existing.id },
      data: {
        status: 'completed' as ProductionOrderStatus,
        currentStep: 4,
        logs: {
          create: {
            userId,
            userName: req.auth!.email,
            action:   'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho',
            logType:  'process',
          },
        },
      },
      include: orderInclude,
    })

    // Create output transactions individually
    for (const txData of transactionsToCreate) {
      await tx.productionOutputTransaction.create({
        data: txData,
      })
    }

    return updatedOrder
  })

  return res.json(serializeBigInt(order))
})

// ─── GET LINES (by step) ──────────────────────────────────────────────────────

router.get('/:id/lines', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const { step } = req.query as { step?: string }
  const lines = await prisma.productionOrderLine.findMany({
    where: {
      orderId: BigInt(req.params.id),
      ...(step ? { step: Number(step) } : {}),
    },
    orderBy: { id: 'asc' },
    include: {
      location:      { select: { id: true, code: true, name: true } },
      product:       { select: { id: true, code: true, name: true } },
      outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
    },
  })
  return res.json(serializeBigInt(lines))
})

// ─── UPSERT LINES FOR A STEP ──────────────────────────────────────────────────
// PUT /api/production-orders/:id/lines/:step
// Replaces all lines for the given step atomically

const linePayloadSchema = z.object({
  productId:       z.coerce.bigint().optional().nullable(),
  outputProductId: z.coerce.bigint().optional().nullable(),
  productCode:     z.string().max(100),
  productName:     z.string().max(255),
  lotNo:           z.string().max(100).optional().nullable(),
  expiryDate:      z.string().optional().nullable(),
  plannedQty:      z.number().min(0).default(0),
  actualQty:       z.number().min(0).default(0),
  wasteQty:        z.number().min(0).default(0),
  unit:            z.string().max(50),
  locationId:      z.coerce.bigint().optional().nullable(),
  qualityStatus:   z.enum(['pass', 'fail', 'pending']).optional().nullable(),
  direction:       z.enum(['in', 'out']),
  notes:           z.string().optional().nullable(),
})

const upsertLinesSchema = z.object({
  lines: z.array(linePayloadSchema),
})

router.put('/:id/lines/:step', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const step    = Number(req.params.step)

  if (step < 1 || step > 4) return res.status(400).json({ message: 'Bước không hợp lệ (1-4).' })

  const existing = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (existing.status === 'cancelled') return res.status(400).json({ message: 'Không thể sửa lệnh đã hủy.' })

  const parsed = upsertLinesSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ.', errors: parsed.error.flatten() })

  const userId = BigInt(req.auth!.sub)

  await prisma.$transaction([
    prisma.productionOrderLine.deleteMany({ where: { orderId, step } }),
    ...parsed.data.lines.map(line =>
      prisma.productionOrderLine.create({
        data: {
          orderId,
          step,
          direction:       line.direction,
          productId:       line.productId ?? null,
          outputProductId: line.outputProductId ?? null,
          productCode:     line.productCode,
          productName:     line.productName,
          lotNo:           line.lotNo ?? null,
          expiryDate:      line.expiryDate ? new Date(line.expiryDate) : null,
          plannedQty:      line.plannedQty,
          actualQty:       line.actualQty,
          wasteQty:        line.wasteQty,
          unit:            line.unit,
          locationId:      line.locationId ?? null,
          qualityStatus:   line.qualityStatus ?? null,
          notes:           line.notes ?? null,
        },
      })
    ),
    prisma.productionOrderLog.create({
      data: {
        orderId,
        userId,
        userName: req.auth!.email,
        action:   `Cập nhật ${STEP_NAMES[step] ?? `Bước ${step}`} – ${parsed.data.lines.length} dòng`,
        logType:  'update',
      },
    }),
  ])

  const updatedLines = await prisma.productionOrderLine.findMany({
    where: { orderId, step },
    orderBy: { id: 'asc' },
    include: {
      location: { select: { id: true, code: true, name: true } },
      product:  { select: { id: true, code: true, name: true } },
    },
  })
  return res.json(serializeBigInt(updatedLines))
})

// ─── GET LOGS ─────────────────────────────────────────────────────────────────

router.get('/:id/logs', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const logs = await prisma.productionOrderLog.findMany({
    where: { orderId: BigInt(req.params.id) },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true } } },
  })
  return res.json(serializeBigInt(logs))
})

export default router

