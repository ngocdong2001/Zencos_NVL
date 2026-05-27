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
      product:       { select: { id: true, code: true, name: true, productClassification: { select: { code: true, name: true } } } },
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

// ─── EXPORT EXCEL DATA (/export-excel must come before /:id) ─────────────────

router.get('/export-excel', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const { dateFrom, dateTo, status } = req.query as Record<string, string>

  // Build WHERE conditions for raw query
  const conditions: string[] = []
  const params: (string | Date)[] = []

  if (status && status !== 'all') {
    conditions.push('po.status = ?')
    params.push(status)
  }
  if (dateFrom) {
    conditions.push('po.issued_at >= ?')
    params.push(new Date(dateFrom))
  }
  if (dateTo) {
    conditions.push('po.issued_at <= ?')
    params.push(new Date(new Date(dateTo).setHours(23, 59, 59, 999)))
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  // Customer and delivery come from: production_order_lines (step4) ─► tp_export_order_items (lotNo+outputProductId) ─► tp_export_orders ─► customers
  const sql = `
    SELECT
      po.id                   AS po_id,
      po.issued_at            AS issued_at,
      po.step1_processed_at   AS step1_processed_at,
      po.step2_processed_at   AS step2_processed_at,
      po.step3_processed_at   AS step3_processed_at,
      po.step4_processed_at   AS step4_processed_at,
      op.name                 AS output_product_name,
      pol.planned_qty         AS planned_qty,
      pol.actual_qty          AS actual_qty,
      pol.lot_no              AS lot_no,
      c.name                  AS customer_name,
      te.exported_at          AS delivered_at,
      (
        SELECT GROUP_CONCAT(
          CONCAT(pol2.product_name, '||', IFNULL(DATE_FORMAT(pol2.export_date, '%d/%m/%y'), ''))
          ORDER BY pol2.id ASC
          SEPARATOR ';;'
        )
        FROM production_order_lines pol2
        WHERE pol2.order_id = po.id AND pol2.step = 1 AND pol2.direction = 'out'
      )                       AS nvl_export_dates
    FROM production_orders po
    LEFT JOIN products_outputs op
      ON op.id = po.output_product_id
    LEFT JOIN production_order_lines pol
      ON pol.order_id = po.id
      AND pol.step = 4
      AND pol.direction = 'in'
      AND pol.output_product_id IS NOT NULL
    LEFT JOIN tp_export_order_items tei
      ON tei.lot_no = pol.lot_no
      AND tei.output_product_id = pol.output_product_id
    LEFT JOIN tp_export_orders te
      ON te.id = tei.export_order_id
    LEFT JOIN customers c
      ON c.id = te.customer_id
    ${whereClause}
    ORDER BY po.issued_at ASC
  `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await prisma.$queryRawUnsafe<any[]>(sql, ...params)

  const rows = raw.map((r, idx) => ({
    stt:              idx + 1,
    customerName:     r.customer_name ?? null,
    productName:      r.output_product_name ?? null,
    plannedQty:       r.planned_qty  != null ? Number(r.planned_qty)  : null,
    actualQty:        r.actual_qty   != null ? Number(r.actual_qty)   : null,
    lotNo:            r.lot_no ?? null,
    issuedAt:         r.issued_at ?? null,
    step1ProcessedAt: r.step1_processed_at ?? null,
    step2ProcessedAt: r.step2_processed_at ?? null,
    step3ProcessedAt: r.step3_processed_at ?? null,
    step4ProcessedAt: r.step4_processed_at ?? null,
    deliveredAt:      r.delivered_at ?? null,
    nvlExportDates:   r.nvl_export_dates ?? null,
  }))

  return res.json(rows)
})

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
        lines: {
          where: { step: 4, direction: 'in', outputProductId: { not: null } },
          select: {
            step: true,
            plannedQty: true,
            actualQty: true,
            lotNo: true,
            expiryDate: true,
            unit: true,
          },
          orderBy: { step: 'asc' as const },
          take: 1,
        },
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
          step:     1,
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

// ─── CONFIRM NVL EXPORT (Step 1) ──────────────────────────────────────────────
// POST /api/production-orders/:id/confirm-nvl-export
// Creates inventory deduct transactions for all step-1 NVL out lines.
// Idempotent guard: if nvlExportedAt is already set, returns 409.

router.post('/:id/confirm-nvl-export', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const userId  = BigInt(req.auth!.sub)

  const existing = await prisma.productionOrder.findUnique({
    where:  { id: orderId },
    select: { id: true, status: true, nvlExportedAt: true, orderRef: true },
  })
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (existing.status === 'cancelled') return res.status(400).json({ message: 'Phiếu đã hủy.' })

  // Find batches already transacted for this order (active, not cancelled) — for deduplication
  const existingTxns = await prisma.inventoryTransaction.findMany({
    where: { productionOrderId: orderId, isCancelled: false, type: 'export' },
    select: { batchId: true },
  })
  const alreadyTransactedBatchIds = new Set(existingTxns.map(t => t.batchId))

  // Fetch step-1 out lines
  const step1Lines = await prisma.productionOrderLine.findMany({
    where: { orderId, step: 1, direction: 'out' },
    include: { product: { select: { id: true, code: true } } },
  })
  if (step1Lines.length === 0)
    return res.status(400).json({ message: 'Chưa có dữ liệu NVL xuất kho. Vui lòng lưu bước 1 trước.' })

  // Build list of (batch, qty) to process
  type BatchDeduct = { batchId: bigint; qty: number; lineNotes: string; locationId: bigint | null; exportDate: Date | null }
  const deducts: BatchDeduct[] = []

  for (const line of step1Lines) {
    if (!line.productId || !line.lotNo) continue
    const qty = typeof line.actualQty === 'object'
      ? (line.actualQty as unknown as { toNumber(): number }).toNumber()
      : Number(line.actualQty)
    if (qty <= 0) continue

    const batch = await prisma.batch.findFirst({
      where: { productId: line.productId, lotNo: line.lotNo, deletedAt: null },
      select: { id: true },
    })
    if (!batch) {
      return res.status(422).json({
        message: `Không tìm thấy lô hàng "${line.lotNo}" cho sản phẩm "${line.productCode}". Kiểm tra lại dữ liệu lô.`,
      })
    }
    // Skip batches already transacted for this order (deduplication)
    if (alreadyTransactedBatchIds.has(batch.id)) continue
    deducts.push({
      batchId: batch.id,
      qty,
      lineNotes: `Xuất NVL cho lệnh ${existing.orderRef ?? orderId.toString()}`,
      locationId: line.locationId ?? null,
      exportDate: line.exportDate ?? null,
    })
  }

  if (deducts.length === 0)
    return res.status(200).json(serializeBigInt(await prisma.productionOrder.findUnique({ where: { id: orderId }, include: orderInclude })))

  // Execute in a single transaction
  await prisma.$transaction(async (tx) => {
    const now = new Date()

    for (const d of deducts) {
      // Deduct batch qty
      await tx.batch.update({
        where: { id: d.batchId },
        data: { currentQtyBase: { decrement: d.qty } },
      })
      // Create inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          batchId:             d.batchId,
          userId,
          productionOrderId:   orderId,
          warehouseLocationId: d.locationId ?? (() => { throw new Error(`NVL line for batch ${d.batchId} has no warehouse location`) })(),
          type:                'export',
          quantityBase:        d.qty,
          isCancelled:         false,
          notes:               d.lineNotes,
          transactionDate:     d.exportDate ?? now,
        },
      })
    }

    // Mark NVL as exported (only set timestamp on first export) and log
    await tx.productionOrder.update({
      where: { id: orderId },
      data:  {
        nvlExportedAt: existing.nvlExportedAt ?? now,
        logs: {
          create: {
            userId,
            userName: req.auth!.email,
            action:   `Xác nhận xuất kho NVL – ${deducts.length} lô hàng đã trừ kho`,
            logType:  'process',
            step:     1,
          },
        },
      },
    })
  })

  const updated = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: orderInclude,
  })
  return res.json(serializeBigInt(updated))
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

  const existingOrder = await prisma.productionOrder.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { id: true, status: true, nvlExportedAt: true, orderRef: true },
  })
  if (!existingOrder) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })

  // When cancelling → reverse NVL and TP output transactions
  if (parsed.data.status === 'cancelled') {
    // NVL: find active export inventory transactions
    const nvlTxns = existingOrder.nvlExportedAt
      ? await prisma.inventoryTransaction.findMany({
          where: { productionOrderId: existingOrder.id, isCancelled: false, type: 'export' },
          select: { id: true, batchId: true, quantityBase: true, warehouseLocationId: true },
        })
      : []

    // TP: find production output import transactions not yet linked to a TP export order
    const tpTxns = await prisma.productionOutputTransaction.findMany({
      where: { productionOrderId: existingOrder.id, type: 'import_from_production', tpExportOrderId: null },
      select: { id: true },
    })

    if (nvlTxns.length > 0 || tpTxns.length > 0) {
      await prisma.$transaction(async (tx) => {
        const now = new Date()

        // Reverse NVL: restore batch qty + create reversal txn + mark original cancelled
        for (const txn of nvlTxns) {
          const qty = typeof txn.quantityBase === 'object'
            ? (txn.quantityBase as unknown as { toNumber(): number }).toNumber()
            : Number(txn.quantityBase)

          // Restore batch qty
          await tx.batch.update({
            where: { id: txn.batchId },
            data:  { currentQtyBase: { increment: qty } },
          })
          // Create reversal transaction (audit trail)
          await tx.inventoryTransaction.create({
            data: {
              batchId:             txn.batchId,
              userId,
              productionOrderId:   existingOrder.id,
              warehouseLocationId: txn.warehouseLocationId,
              type:                'import',
              quantityBase:        qty,
              isCancelled:         false,
              notes:               `Hoàn kho NVL – hủy lệnh ${existingOrder.orderRef ?? existingOrder.id.toString()}`,
              transactionDate:     now,
            },
          })
          // Mark original transaction as cancelled (keep for audit trail)
          await tx.inventoryTransaction.update({
            where: { id: txn.id },
            data:  { isCancelled: true },
          })
        }

        // Reverse TP: delete import_from_production records not yet used in exports
        if (tpTxns.length > 0) {
          await tx.productionOutputTransaction.deleteMany({
            where: { id: { in: tpTxns.map((t) => t.id) } },
          })
        }

        const logParts: string[] = []
        if (nvlTxns.length > 0) logParts.push(`hoàn trả ${nvlTxns.length} giao dịch xuất NVL vào kho`)
        if (tpTxns.length > 0) logParts.push(`hủy ${tpTxns.length} giao dịch nhập TP`)

        // Update status + log
        await tx.productionOrder.update({
          where: { id: existingOrder.id },
          data: {
            status:  'cancelled' as ProductionOrderStatus,
            logs: {
              create: {
                userId,
                userName: req.auth!.email,
                action:   `Hủy phiếu – ${logParts.join(', ') || 'chuyển trạng thái'}`,
                logType:  'process',
                step:     1,
              },
            },
          },
        })
      })

      const updated = await prisma.productionOrder.findUnique({
        where: { id: existingOrder.id },
        include: orderInclude,
      })
      return res.json(serializeBigInt(updated))
    }
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
      batchLotNo: line.lotNo ?? '',
      batchExpiryDate: line.expiryDate ?? null,
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

// ─── RETURN EXCESS NVL TO WAREHOUSE ──────────────────────────────────────────
// POST /api/production-orders/:id/return-nvl
// Creates import inventory transactions for excess NVL returned after production

const returnNvlSchema = z.object({
  lines: z.array(z.object({
    productId: z.coerce.bigint(),
    lotNo:     z.string().min(1, 'Số lô không được để trống'),
    returnQty: z.number().positive('Số lượng hoàn nhập phải > 0'),
  })).min(1, 'Cần ít nhất 1 dòng hoàn nhập'),
})

router.post('/:id/return-nvl', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const orderId = BigInt(req.params.id)
  const userId  = BigInt(req.auth!.sub)

  const parsed = returnNvlSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ.' })
  }

  const order = await prisma.productionOrder.findUnique({
    where:  { id: orderId },
    select: { id: true, status: true, orderRef: true },
  })
  if (!order) return res.status(404).json({ message: 'Không tìm thấy lệnh sản xuất.' })
  if (order.status === 'cancelled') return res.status(400).json({ message: 'Phiếu đã bị hủy.' })

  // Fetch step-1 out lines for validation
  const step1Lines = await prisma.productionOrderLine.findMany({
    where: { orderId, step: 1, direction: 'out' },
    select: { productId: true, lotNo: true, actualQty: true, locationId: true },
  })

  // Build location lookup map: (productId-lotNo) → locationId
  const step1LocationMap = new Map<string, bigint | null>()
  for (const l of step1Lines) {
    const key = `${l.productId}-${l.lotNo}`
    if (!step1LocationMap.has(key)) step1LocationMap.set(key, l.locationId ?? null)
  }

  // Fetch already-returned qty per (productId, lotNo) for this order
  // A "return" = import transaction linked to this productionOrderId
  const existingReturns = await prisma.inventoryTransaction.findMany({
    where: { productionOrderId: orderId, isCancelled: false, type: 'import' },
    include: { batch: { select: { productId: true, lotNo: true } } },
  })

  type ReturnKey = string
  const alreadyReturnedQty = new Map<ReturnKey, number>()
  for (const r of existingReturns) {
    const key: ReturnKey = `${r.batch.productId}-${r.batch.lotNo}`
    const qty = typeof r.quantityBase === 'object'
      ? (r.quantityBase as unknown as { toNumber(): number }).toNumber()
      : Number(r.quantityBase)
    alreadyReturnedQty.set(key, (alreadyReturnedQty.get(key) ?? 0) + qty)
  }

  // Validate each return line
  for (const line of parsed.data.lines) {
    const step1 = step1Lines.find(l => l.productId === line.productId && l.lotNo === line.lotNo)
    const exportedQty = step1
      ? (typeof step1.actualQty === 'object'
          ? (step1.actualQty as unknown as { toNumber(): number }).toNumber()
          : Number(step1.actualQty))
      : 0
    const alreadyReturned = alreadyReturnedQty.get(`${line.productId}-${line.lotNo}`) ?? 0
    const remainingExport = exportedQty - alreadyReturned

    if (line.returnQty > remainingExport + 0.0001) {
      return res.status(422).json({
        message: `Số lượng hoàn nhập (${line.returnQty}) vượt quá số lượng có thể hoàn (${remainingExport.toFixed(3)}) cho lô "${line.lotNo}".`,
      })
    }
  }

  const returned: Array<{ productId: string; lotNo: string; returnQty: number }> = []

  await prisma.$transaction(async (tx) => {
    const now = new Date()

    for (const line of parsed.data.lines) {
      const batch = await tx.batch.findFirst({
        where: { productId: line.productId, lotNo: line.lotNo, deletedAt: null },
        select: { id: true },
      })
      if (!batch) {
        throw new Error(`Không tìm thấy lô hàng "${line.lotNo}" để hoàn nhập.`)
      }

      // Create import transaction (return to warehouse)
      const returnLocationId = step1LocationMap.get(`${line.productId}-${line.lotNo}`)
      if (!returnLocationId) throw new Error(`Không tìm thấy kho xuất của lô "${line.lotNo}" để hoàn nhập.`)
      await tx.inventoryTransaction.create({
        data: {
          batchId:             batch.id,
          userId,
          productionOrderId:   orderId,
          warehouseLocationId: returnLocationId,
          type:                'import',
          quantityBase:        line.returnQty,
          isCancelled:         false,
          notes:               `Hoàn nhập NVL thừa – lệnh ${order.orderRef ?? orderId.toString()}`,
          transactionDate:     now,
        },
      })

      // Restore batch qty
      await tx.batch.update({
        where: { id: batch.id },
        data:  { currentQtyBase: { increment: line.returnQty } },
      })

      returned.push({ productId: line.productId.toString(), lotNo: line.lotNo, returnQty: line.returnQty })
    }

    // Audit log
    await tx.productionOrder.update({
      where: { id: orderId },
      data: {
        logs: {
          create: {
            userId,
            userName: req.auth!.email,
            action:   `Hoàn nhập NVL thừa – ${returned.length} dòng, tổng ${returned.reduce((s, r) => s + r.returnQty, 0).toFixed(3)} đơn vị`,
            logType:  'process',
          },
        },
      },
    })
  })

  return res.json({ success: true, returned })
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
  exportDate:      z.string().optional().nullable(),
})

const upsertLinesSchema = z.object({
  lines: z.array(linePayloadSchema),
  processedAt: z.string().optional().nullable(),
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

  const stepDateKey = `step${step}ProcessedAt` as 'step1ProcessedAt' | 'step2ProcessedAt' | 'step3ProcessedAt' | 'step4ProcessedAt'
  const processedAtValue = parsed.data.processedAt ? new Date(parsed.data.processedAt) : null

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
          exportDate:      line.exportDate ? new Date(line.exportDate) : null,
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
    prisma.productionOrder.update({
      where: { id: orderId },
      data: { [stepDateKey]: processedAtValue },
    }),
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
  const stepFilter = req.query.step !== undefined ? Number(req.query.step) : undefined
  const logs = await prisma.productionOrderLog.findMany({
    where: {
      orderId: BigInt(req.params.id),
      ...(stepFilter !== undefined ? { step: stepFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true } } },
  })
  return res.json(serializeBigInt(logs))
})

export default router

