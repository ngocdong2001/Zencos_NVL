import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../lib/prisma.js'

const router = Router()
const INBOUND_STATUSES = ['draft', 'pending_qc', 'posted', 'cancelled'] as const

function parseYmdDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDraftStep(value: unknown): 1 | 2 | 3 | 4 | null {
  const step = Number(value)
  if (!Number.isInteger(step) || step < 1 || step > 4) return null
  return step as 1 | 2 | 3 | 4
}

function readDraftStep(step: unknown): 1 | 2 | 3 | 4 {
  return parseDraftStep(step) ?? 2
}

async function getFirstActiveUserId(): Promise<bigint> {
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  if (!user) {
    throw new Error('Không tìm thấy người dùng đang hoạt động để thực hiện thao tác.')
  }

  return user.id
}

router.get('/receipts', async (req, res) => {
  const {
    page = '1',
    limit = '100',
    fromDate,
    toDate,
    status,
    q,
  } = req.query as Record<string, string | undefined>

  const pageNumber = Number(page)
  const limitNumber = Number(limit)
  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : 1
  const safeLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(Math.floor(limitNumber), 500) : 100

  const where: Record<string, unknown> = {}

  if (status && status !== 'all') {
    if (!INBOUND_STATUSES.includes(status as (typeof INBOUND_STATUSES)[number])) {
      res.status(400).json({ error: 'status không hợp lệ.' })
      return
    }
    where.status = status
  }

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

  if (parsedFromDate || parsedToDate) {
    const createdAtFilter: Record<string, Date> = {}
    if (parsedFromDate) {
      createdAtFilter.gte = parsedFromDate
    }
    if (parsedToDate) {
      const nextDay = new Date(parsedToDate)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      createdAtFilter.lt = nextDay
    }
    where.createdAt = createdAtFilter
  }

  if (q?.trim()) {
    const query = q.trim()
    where.OR = [
      { receiptRef: { contains: query } },
      { supplier: { name: { contains: query } } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.inboundReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, fullName: true } },
        poster: { select: { id: true, fullName: true } },
        items: {
          select: {
            lotNo: true,
            quantityBase: true,
            lineAmount: true,
          },
        },
      },
    }),
    prisma.inboundReceipt.count({ where }),
  ])

  const data = rows.map((row: {
    id: bigint
    receiptRef: string
    status: string
    currentStep: number
    expectedDate: Date | null
    qcCheckedAt: Date | null
    receivedAt: Date | null
    createdAt: Date
    updatedAt: Date
    supplier: { code: string; name: string } | null
    creator: { fullName: string }
    poster: { fullName: string } | null
    items: Array<{ lotNo: string; quantityBase: unknown; lineAmount: unknown }>
  }) => {
    const quantityBaseTotal = Number(
      row.items
        .reduce((sum: number, item) => sum + Number(item.quantityBase), 0)
        .toFixed(3),
    )

    const totalValue = Number(
      row.items
        .reduce((sum: number, item) => sum + Number(item.lineAmount), 0)
        .toFixed(0),
    )

    return {
      id: row.id.toString(),
      receiptRef: row.receiptRef,
      status: row.status,
      currentStep: readDraftStep(row.currentStep),
      supplierName: row.supplier?.name ?? '---',
      supplierCode: row.supplier?.code ?? null,
      lotCount: row.items.length,
      quantityBaseTotal,
      totalValue,
      assigneeName: row.poster?.fullName ?? row.creator.fullName,
      expectedDate: row.expectedDate ? row.expectedDate.toISOString().slice(0, 10) : null,
      qcCheckedAt: row.qcCheckedAt ? row.qcCheckedAt.toISOString() : null,
      receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  })

  res.json({
    data,
    total,
    page: safePage,
    limit: safeLimit,
  })
})

router.get('/receipts/:id', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: BigInt(idRaw) },
    include: {
      purchaseRequest: {
        select: {
          id: true,
          requestRef: true,
          supplier: { select: { id: true, code: true, name: true } },
          receivingLocation: { select: { id: true, code: true, name: true } },
        },
      },
      supplier: { select: { id: true, code: true, name: true } },
      receivingLocation: { select: { id: true, code: true, name: true } },
      creator: { select: { id: true, fullName: true } },
      poster: { select: { id: true, fullName: true } },
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              orderUnitRef: {
                select: {
                  unitName: true,
                  conversionToBase: true,
                }
              }
            }
          },
          documents: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              docType: true,
              originalName: true,
              mimeType: true,
              fileSize: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  const effectiveSupplier = receipt.supplier ?? receipt.purchaseRequest?.supplier ?? null

  res.json({
    id: receipt.id.toString(),
    receiptRef: receipt.receiptRef,
    status: receipt.status,
    currentStep: readDraftStep(receipt.currentStep),
    expectedDate: receipt.expectedDate ? receipt.expectedDate.toISOString().slice(0, 10) : null,
    receivedAt: receipt.receivedAt ? receipt.receivedAt.toISOString() : null,
    qcCheckedAt: receipt.qcCheckedAt ? receipt.qcCheckedAt.toISOString() : null,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
    purchaseRequest: receipt.purchaseRequest
      ? {
        id: receipt.purchaseRequest.id.toString(),
        requestRef: receipt.purchaseRequest.requestRef,
      }
      : null,
    supplier: effectiveSupplier
      ? {
        id: effectiveSupplier.id.toString(),
        code: effectiveSupplier.code,
        name: effectiveSupplier.name,
      }
      : null,
    receivingLocation: receipt.receivingLocation
      ? {
        id: receipt.receivingLocation.id.toString(),
        code: receipt.receivingLocation.code,
        name: receipt.receivingLocation.name,
      }
      : null,
    creator: {
      id: receipt.creator.id.toString(),
      fullName: receipt.creator.fullName,
    },
    poster: receipt.poster
      ? {
        id: receipt.poster.id.toString(),
        fullName: receipt.poster.fullName,
      }
      : null,
    items: receipt.items.map((item: {
      id: bigint
      lotNo: string
      invoiceNumber: string | null
      invoiceDate: Date | null
      manufactureDate: Date | null
      expiryDate: Date | null
      quantityBase: unknown
      unitUsed: string
      quantityDisplay: unknown
      unitPricePerKg: unknown
      lineAmount: unknown
      qcStatus: string
      hasDocument: boolean
      product: { id: bigint; code: string; name: string; orderUnitRef: { unitName: string; conversionToBase: unknown } | null }
      documents: Array<{
        id: bigint
        docType: string
        originalName: string
        mimeType: string
        fileSize: unknown
        createdAt: Date
      }>
    }) => ({
      id: item.id.toString(),
      product: {
        id: item.product.id.toString(),
        code: item.product.code,
        name: item.product.name,
        orderUnitRef: item.product.orderUnitRef
          ? {
              unitName: item.product.orderUnitRef.unitName,
              conversionToBase: Number(item.product.orderUnitRef.conversionToBase),
            }
          : null,
      },
      lotNo: item.lotNo,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate ? item.invoiceDate.toISOString().slice(0, 10) : null,
      manufactureDate: item.manufactureDate ? item.manufactureDate.toISOString().slice(0, 10) : null,
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : null,
      quantityBase: Number(item.quantityBase),
      unitUsed: item.unitUsed,
      quantityDisplay: Number(item.quantityDisplay),
      unitPricePerKg: Number(item.unitPricePerKg),
      lineAmount: Number(item.lineAmount),
      qcStatus: item.qcStatus,
      hasDocument: item.hasDocument,
      documents: item.documents.map((doc: {
        id: bigint
        docType: string
        originalName: string
        mimeType: string
        fileSize: unknown
        createdAt: Date
      }) => ({
        id: doc.id.toString(),
        docType: doc.docType,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: Number(doc.fileSize),
        createdAt: doc.createdAt.toISOString(),
      })),
    })),
  })
})

type SaveDraftItemBody = {
  productId?: unknown
  lotNo?: unknown
  quantityBase?: unknown
  quantityDisplay?: unknown
  unitUsed?: unknown
  unitPricePerKg?: unknown
  lineAmount?: unknown
  invoiceNumber?: unknown
  invoiceDate?: unknown
  manufactureDate?: unknown
  expiryDate?: unknown
}

type SaveDraftBody = {
  receiptRef?: unknown
  purchaseRequestRef?: unknown
  supplierName?: unknown
  receivingLocationId?: unknown
  expectedDate?: unknown
  currentStep?: unknown
  item?: SaveDraftItemBody
}

async function resolveSupplierAndPo(
  supplierName: string | undefined,
  purchaseRequestRef: string | undefined,
): Promise<{ supplierId: bigint | null; purchaseRequestId: bigint | null }> {
  const [supplierRow, prRow] = await Promise.all([
    supplierName?.trim()
      ? prisma.supplier.findFirst({ where: { name: supplierName.trim() }, select: { id: true } })
      : Promise.resolve(null),
    purchaseRequestRef?.trim()
      ? prisma.purchaseRequest.findFirst({ where: { requestRef: purchaseRequestRef.trim() }, select: { id: true } })
      : Promise.resolve(null),
  ])
  return {
    supplierId: supplierRow ? supplierRow.id : null,
    purchaseRequestId: prRow ? prRow.id : null,
  }
}

async function upsertDraftItem(
  receiptId: bigint,
  item: SaveDraftItemBody,
): Promise<void> {
  const productIdStr = String(item.productId ?? '').trim()
  const lotNo = String(item.lotNo ?? '').trim()
  const quantityBase = Number(item.quantityBase)
  if (!productIdStr || !/^\d+$/.test(productIdStr) || !lotNo || !Number.isFinite(quantityBase) || quantityBase <= 0) return

  const quantityDisplay = Number.isFinite(Number(item.quantityDisplay)) ? Number(item.quantityDisplay) : quantityBase
  const unitUsed = String(item.unitUsed ?? 'kg').trim() || 'kg'
  const unitPricePerKg = Number.isFinite(Number(item.unitPricePerKg)) ? Number(item.unitPricePerKg) : 0
  const invoiceDate = typeof item.invoiceDate === 'string' ? parseYmdDate(item.invoiceDate) : null
  const manufactureDate = typeof item.manufactureDate === 'string' ? parseYmdDate(item.manufactureDate) : null
  const expiryDate = typeof item.expiryDate === 'string' ? parseYmdDate(item.expiryDate) : null
  const invoiceNumber = typeof item.invoiceNumber === 'string' && item.invoiceNumber.trim() ? item.invoiceNumber.trim() : null
  const productId = BigInt(productIdStr)

  // Tính lineAmount tại backend: (quantityBase / priceUnitConversionToBase) × unitPricePerKg
  // priceUnitConversionToBase = product.orderUnitRef.conversionToBase
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { orderUnitRef: { select: { conversionToBase: true } } },
  })
  const priceUnitConversionToBase = Number(product?.orderUnitRef?.conversionToBase ?? 1)
  const priceUnitConv = Number.isFinite(priceUnitConversionToBase) && priceUnitConversionToBase > 0 ? priceUnitConversionToBase : 1
  const lineAmount = Math.round((quantityBase / priceUnitConv) * unitPricePerKg)

  // Update the first existing line to keep related documents attached to the same item.
  const existing = await prisma.inboundReceiptItem.findFirst({
    where: { inboundReceiptId: receiptId },
    orderBy: { id: 'asc' },
    select: { id: true },
  })

  if (existing) {
    await prisma.inboundReceiptItem.update({
      where: { id: existing.id },
      data: {
        productId,
        lotNo,
        quantityBase,
        quantityDisplay,
        unitUsed,
        unitPricePerKg,
        lineAmount,
        invoiceNumber,
        invoiceDate,
        manufactureDate,
        expiryDate,
      },
    })
    return
  }

  await prisma.inboundReceiptItem.create({
    data: {
      inboundReceiptId: receiptId,
      productId,
      lotNo,
      quantityBase,
      quantityDisplay,
      unitUsed,
      unitPricePerKg,
      lineAmount,
      invoiceNumber,
      invoiceDate,
      manufactureDate,
      expiryDate,
    },
  })
}

router.post('/receipts', async (req, res) => {
  const body = req.body as SaveDraftBody

  if (!body.receiptRef || typeof body.receiptRef !== 'string' || !body.receiptRef.trim()) {
    res.status(400).json({ error: 'receiptRef bắt buộc.' })
    return
  }

  const receiptRef = body.receiptRef.trim()
  const existing = await prisma.inboundReceipt.findUnique({ where: { receiptRef } })
  if (existing) {
    res.status(409).json({ error: 'Mã phiếu đã tồn tại. Vui lòng tải lại trang.' })
    return
  }

  const { supplierId, purchaseRequestId } = await resolveSupplierAndPo(
    typeof body.supplierName === 'string' ? body.supplierName : undefined,
    typeof body.purchaseRequestRef === 'string' ? body.purchaseRequestRef : undefined,
  )

  const receivingLocationIdStr = String(body.receivingLocationId ?? '').trim()
  const receivingLocationId = /^\d+$/.test(receivingLocationIdStr) ? BigInt(receivingLocationIdStr) : null

  const parsedExpectedDate = typeof body.expectedDate === 'string' ? parseYmdDate(body.expectedDate) : null
  const parsedCurrentStep = parseDraftStep(body.currentStep)
  const creatorId = await getFirstActiveUserId()

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.inboundReceipt.create({
      data: {
        receiptRef,
        status: 'draft',
        purchaseRequestId,
        supplierId,
        receivingLocationId,
        expectedDate: parsedExpectedDate,
        currentStep: parsedCurrentStep ?? 2,
        createdBy: creatorId,
      },
    })

    await tx.inboundReceiptHistory.create({
      data: {
        inboundReceiptId: created.id,
        actionType: 'created',
        actionLabel: 'Khởi tạo phiếu nhập kho',
        actorId: creatorId,
        data: {
          receiptRef,
          step: parsedCurrentStep ?? 2,
        },
      },
    })

    return created
  })

  if (body.item) await upsertDraftItem(receipt.id, body.item)

  res.status(201).json({ id: receipt.id.toString(), receiptRef: receipt.receiptRef, currentStep: parsedCurrentStep ?? 2 })
})

router.delete('/receipts/:id', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: BigInt(idRaw) },
    select: { id: true, status: true },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  if (receipt.status === 'posted') {
    res.status(409).json({ error: 'Chỉ có thể hủy phiếu khi chưa posted.' })
    return
  }

  const docs = await prisma.inboundReceiptItemDocument.findMany({
    where: {
      item: {
        inboundReceiptId: receipt.id,
      },
    },
    select: {
      filePath: true,
    },
  })

  await prisma.inboundReceipt.delete({ where: { id: receipt.id } })

  await Promise.all(
    docs.map(async (doc) => {
      const absPath = path.resolve(doc.filePath)
      try {
        await fs.unlink(absPath)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`[inbound] Failed to remove draft upload file: ${absPath}`)
        }
      }
    }),
  )

  const receiptUploadDir = path.resolve('uploads/inbound-drafts', receipt.id.toString())
  try {
    await fs.rm(receiptUploadDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup failures for directory removal.
  }

  res.status(204).end()
})

router.patch('/receipts/:id', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: BigInt(idRaw) },
    select: { id: true, status: true, receiptRef: true, currentStep: true },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  if (receipt.status !== 'draft') {
    res.status(409).json({ error: 'Chỉ có thể lưu bản nháp khi phiếu ở trạng thái Nháp.' })
    return
  }

  const body = req.body as SaveDraftBody
  if (!body.receiptRef || typeof body.receiptRef !== 'string' || !body.receiptRef.trim()) {
    res.status(400).json({ error: 'receiptRef bắt buộc.' })
    return
  }

  const receiptRef = body.receiptRef.trim()
  const duplicateReceipt = await prisma.inboundReceipt.findFirst({
    where: {
      receiptRef,
      NOT: { id: receipt.id },
    },
    select: { id: true },
  })

  if (duplicateReceipt) {
    res.status(409).json({ error: 'Mã phiếu nhập đã tồn tại.' })
    return
  }

  const { supplierId, purchaseRequestId } = await resolveSupplierAndPo(
    typeof body.supplierName === 'string' ? body.supplierName : undefined,
    typeof body.purchaseRequestRef === 'string' ? body.purchaseRequestRef : undefined,
  )

  const receivingLocationIdStr = String(body.receivingLocationId ?? '').trim()
  const receivingLocationId = /^\d+$/.test(receivingLocationIdStr) ? BigInt(receivingLocationIdStr) : null

  const parsedExpectedDate = typeof body.expectedDate === 'string' ? parseYmdDate(body.expectedDate) : null
  const parsedCurrentStep = parseDraftStep(body.currentStep)
  const actorId = await getFirstActiveUserId()
  const effectiveStep = parsedCurrentStep ?? readDraftStep(receipt.currentStep)

  await prisma.inboundReceipt.update({
    where: { id: receipt.id },
    data: {
      receiptRef,
      purchaseRequestId,
      supplierId,
      receivingLocationId,
      expectedDate: parsedExpectedDate,
      currentStep: effectiveStep,
    },
  })

  if (body.item) await upsertDraftItem(receipt.id, body.item)

  await prisma.inboundReceiptHistory.create({
    data: {
      inboundReceiptId: receipt.id,
      actionType: 'updated',
      actionLabel: `Cập nhật phiếu nháp (Bước ${effectiveStep})`,
      actorId,
      data: {
        step: effectiveStep,
        hasItemPayload: Boolean(body.item),
      },
    },
  })

  res.json({
    id: receipt.id.toString(),
    receiptRef,
    currentStep: effectiveStep,
  })
})

type SubmitInboundQcBody = {
  items?: Array<{
    itemId?: unknown
    qcStatus?: unknown
  }>
}

router.patch('/receipts/:id/qc', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const body = req.body as SubmitInboundQcBody
  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    res.status(400).json({ error: 'Thiếu dữ liệu QC. Vui lòng chọn kết quả kiểm tra cho từng dòng.' })
    return
  }

  const validQcStatuses = new Set(['pending', 'passed', 'failed'])
  const normalized = items.map((item) => ({
    itemId: String(item.itemId ?? '').trim(),
    qcStatus: String(item.qcStatus ?? '').trim(),
  }))

  for (const item of normalized) {
    if (!/^\d+$/.test(item.itemId)) {
      res.status(400).json({ error: 'Dòng QC không hợp lệ.' })
      return
    }
    if (!validQcStatuses.has(item.qcStatus)) {
      res.status(400).json({ error: 'Trạng thái QC không hợp lệ.' })
      return
    }
  }

  const receiptId = BigInt(idRaw)
  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      status: true,
      items: { select: { id: true } },
    },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  if (receipt.status === 'posted' || receipt.status === 'cancelled') {
    res.status(409).json({ error: 'Phiếu đã khóa trạng thái, không thể cập nhật QC.' })
    return
  }

  const validItemIds = new Set(receipt.items.map((item) => item.id.toString()))
  const targetItemIds = Array.from(new Set(normalized.map((item) => item.itemId)))
  const outsideItems = targetItemIds.filter((itemId) => !validItemIds.has(itemId))
  if (outsideItems.length > 0) {
    res.status(400).json({ error: 'Có dòng QC không thuộc phiếu nhập kho hiện tại.' })
    return
  }

  const actorId = await getFirstActiveUserId()
  const qcCheckedAt = new Date()

  await prisma.$transaction(async (tx) => {
    for (const item of normalized) {
      await tx.inboundReceiptItem.update({
        where: { id: BigInt(item.itemId) },
        data: { qcStatus: item.qcStatus as 'pending' | 'passed' | 'failed' },
      })
    }

    await tx.inboundReceipt.update({
      where: { id: receipt.id },
      data: {
        status: 'pending_qc',
        qcCheckedAt,
        currentStep: 4,
      },
    })

    await tx.inboundReceiptHistory.create({
      data: {
        inboundReceiptId: receipt.id,
        actionType: 'qc_reviewed',
        actionLabel: 'Cập nhật kết quả QC',
        actorId,
        data: {
          itemCount: normalized.length,
          checkedAt: qcCheckedAt.toISOString(),
        },
      },
    })
  })

  res.json({
    id: receipt.id.toString(),
    status: 'pending_qc',
    qcCheckedAt: qcCheckedAt.toISOString(),
  })
})

router.post('/receipts/:id/post', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const receiptId = BigInt(idRaw)

  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: receiptId },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: {
          documents: { select: { id: true } },
        },
      },
    },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  if (receipt.status === 'posted') {
    res.status(409).json({ error: 'Phiếu đã được posted trước đó.' })
    return
  }

  if (receipt.status === 'cancelled') {
    res.status(409).json({ error: 'Phiếu đã bị hủy, không thể posted.' })
    return
  }

  if (receipt.items.length === 0) {
    res.status(400).json({ error: 'Phiếu chưa có dòng hàng nhập. Vui lòng bổ sung dữ liệu trước khi posted.' })
    return
  }

  const failedItems = receipt.items.filter((item) => item.qcStatus !== 'passed')
  if (failedItems.length > 0) {
    res.status(400).json({ error: 'Chưa thể posted. Tất cả dòng phải có kết quả QC đạt (passed).' })
    return
  }

  const missingDocs = receipt.items.filter((item) => !item.hasDocument || item.documents.length === 0)
  if (missingDocs.length > 0) {
    res.status(400).json({ error: 'Chưa thể posted. Một số dòng chưa có chứng từ bắt buộc.' })
    return
  }

  const actorId = await getFirstActiveUserId()
  const postedAt = new Date()

  await prisma.$transaction(async (tx) => {
    for (const item of receipt.items) {
      if (item.postedBatchId && item.postedTxId) continue

      const quantityBase = Number(item.quantityBase)
      const quantityDisplay = Number(item.quantityDisplay)
      const unitPricePerKg = Number(item.unitPricePerKg)

      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          supplierId: receipt.supplierId ?? undefined,
          inboundReceiptItemId: item.id,
          lotNo: item.lotNo,
          invoiceNumber: item.invoiceNumber ?? undefined,
          invoiceDate: item.invoiceDate ?? undefined,
          unitPricePerKg,
          receivedQtyBase: quantityBase,
          currentQtyBase: 0,
          purchaseUnit: item.unitUsed,
          purchaseQty: quantityDisplay,
          manufactureDate: item.manufactureDate ?? undefined,
          expiryDate: item.expiryDate ?? undefined,
          status: 'available',
          notes: `Auto-posted từ phiếu nhập ${receipt.receiptRef}`,
        },
      })

      const txImport = await tx.inventoryTransaction.create({
        data: {
          batchId: batch.id,
          userId: actorId,
          inboundReceiptItemId: item.id,
          type: 'import',
          quantityBase,
          notes: `Nhập kho từ phiếu ${receipt.receiptRef}`,
          transactionDate: postedAt,
        },
      })

      await tx.batch.update({
        where: { id: batch.id },
        data: { currentQtyBase: { increment: quantityBase } },
      })

      await tx.inboundReceiptItem.update({
        where: { id: item.id },
        data: {
          postedBatchId: batch.id,
          postedTxId: txImport.id,
        },
      })

      if (item.purchaseRequestItemId) {
        await tx.purchaseRequestItem.update({
          where: { id: item.purchaseRequestItemId },
          data: {
            receivedQtyBase: { increment: quantityBase },
          },
        })
      }
    }

    if (receipt.purchaseRequestId) {
      const prItems = await tx.purchaseRequestItem.findMany({
        where: { purchaseRequestId: receipt.purchaseRequestId },
        select: {
          quantityNeededBase: true,
          receivedQtyBase: true,
        },
      })

      const isFullyReceived = prItems.length > 0
        && prItems.every((item) => Number(item.receivedQtyBase) >= Number(item.quantityNeededBase))

      await tx.purchaseRequest.update({
        where: { id: receipt.purchaseRequestId },
        data: {
          status: isFullyReceived ? 'received' : 'partially_received',
          receivedAt: isFullyReceived ? postedAt : null,
        },
      })
    }

    await tx.inboundReceipt.update({
      where: { id: receipt.id },
      data: {
        status: 'posted',
        postedBy: actorId,
        receivedAt: postedAt,
        qcCheckedAt: receipt.qcCheckedAt ?? postedAt,
        currentStep: 4,
      },
    })

    await tx.inboundReceiptHistory.create({
      data: {
        inboundReceiptId: receipt.id,
        actionType: 'posted',
        actionLabel: 'Posted phiếu nhập kho',
        actorId,
        data: {
          postedAt: postedAt.toISOString(),
          itemCount: receipt.items.length,
        },
      },
    })
  })

  res.json({
    id: receipt.id.toString(),
    status: 'posted',
    receivedAt: postedAt.toISOString(),
  })
})

router.get('/receipts/:id/history', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const receiptId = BigInt(idRaw)

  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      createdAt: true,
      creator: {
        select: {
          fullName: true,
        },
      },
    },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  const history = await prisma.inboundReceiptHistory.findMany({
    where: { inboundReceiptId: receiptId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          fullName: true,
        },
      },
    },
  })

  const rows = history.map((entry) => ({
    id: entry.id.toString(),
    actionType: entry.actionType,
    actionLabel: entry.actionLabel,
    actorName: entry.actor.fullName,
    createdAt: entry.createdAt.toISOString(),
    data: entry.data,
  }))

  const hasCreatedEvent = rows.some((entry) => entry.actionType === 'created')
  if (!hasCreatedEvent) {
    rows.push({
      id: `virtual-created-${receipt.id.toString()}`,
      actionType: 'created',
      actionLabel: 'Khởi tạo phiếu nhập kho',
      actorName: receipt.creator.fullName,
      createdAt: receipt.createdAt.toISOString(),
      data: null,
    })
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  res.json(rows)
})

export default router
