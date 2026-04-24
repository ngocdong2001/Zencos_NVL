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

async function buildAdjustmentReceiptRef(sourceReceiptRef: string): Promise<string> {
  const base = `${sourceReceiptRef}-ADJ`
  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`
    const existed = await prisma.inboundReceipt.findUnique({
      where: { receiptRef: candidate },
      select: { id: true },
    })
    if (!existed) return candidate
  }
  throw new Error('Không thể tạo mã phiếu điều chỉnh mới. Vui lòng thử lại.')
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
            product: {
              select: {
                name: true,
              },
            },
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
    sourceReceiptId: bigint | null
    adjustedByReceiptId: bigint | null
    expectedDate: Date | null
    qcCheckedAt: Date | null
    receivedAt: Date | null
    createdAt: Date
    updatedAt: Date
    supplier: { code: string; name: string } | null
    creator: { fullName: string }
    poster: { fullName: string } | null
    items: Array<{
      lotNo: string
      quantityBase: unknown
      lineAmount: unknown
      product: { name: string } | null
    }>
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

    const firstItem = row.items[0]
    const materialName = firstItem?.product?.name?.trim() || '---'
    const lotNo = firstItem?.lotNo?.trim() || '---'

    return {
      id: row.id.toString(),
      receiptRef: row.receiptRef,
      status: row.status,
      currentStep: readDraftStep(row.currentStep),
      sourceReceiptId: row.sourceReceiptId ? row.sourceReceiptId.toString() : null,
      adjustedByReceiptId: row.adjustedByReceiptId ? row.adjustedByReceiptId.toString() : null,
      supplierName: row.supplier?.name ?? '---',
      supplierCode: row.supplier?.code ?? null,
      materialName,
      lotNo,
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
      sourceReceipt: {
        select: {
          id: true,
          receiptRef: true,
          status: true,
        },
      },
      adjustedByReceipt: {
        select: {
          id: true,
          receiptRef: true,
          status: true,
        },
      },
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              inciNames: {
                where: { isPrimary: true },
                select: { inciName: true },
                take: 1,
              },
              orderUnitRef: {
                select: {
                  unitName: true,
                  conversionToBase: true,
                }
              }
            }
          },
          manufacturer: {
            select: { id: true, name: true },
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
    sourceReceipt: receipt.sourceReceipt
      ? {
        id: receipt.sourceReceipt.id.toString(),
        receiptRef: receipt.sourceReceipt.receiptRef,
        status: receipt.sourceReceipt.status,
      }
      : null,
    adjustedByReceipt: receipt.adjustedByReceipt
      ? {
        id: receipt.adjustedByReceipt.id.toString(),
        receiptRef: receipt.adjustedByReceipt.receiptRef,
        status: receipt.adjustedByReceipt.status,
      }
      : null,
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
      product: {
        id: bigint
        code: string
        name: string
        inciNames?: Array<{ inciName: string }> | null
        orderUnitRef: { unitName: string; conversionToBase: unknown } | null
      }
      manufacturer: { id: bigint; name: string } | null
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
        inciName: item.product.inciNames?.[0]?.inciName ?? null,
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
      manufacturer: item.manufacturer
        ? { id: item.manufacturer.id.toString(), name: item.manufacturer.name }
        : null,
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
  manufacturerId?: unknown
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
  if (!productIdStr || !/^\d+$/.test(productIdStr) || !lotNo || !Number.isFinite(quantityBase) || quantityBase < 0) return

  const quantityDisplay = Number.isFinite(Number(item.quantityDisplay)) ? Number(item.quantityDisplay) : quantityBase
  const unitUsed = String(item.unitUsed ?? 'kg').trim() || 'kg'
  const unitPricePerKg = Number.isFinite(Number(item.unitPricePerKg)) ? Number(item.unitPricePerKg) : 0
  const invoiceDate = typeof item.invoiceDate === 'string' ? parseYmdDate(item.invoiceDate) : null
  const manufactureDate = typeof item.manufactureDate === 'string' ? parseYmdDate(item.manufactureDate) : null
  const expiryDate = typeof item.expiryDate === 'string' ? parseYmdDate(item.expiryDate) : null
  const invoiceNumber = typeof item.invoiceNumber === 'string' && item.invoiceNumber.trim() ? item.invoiceNumber.trim() : null
  const manufacturerIdStr = String(item.manufacturerId ?? '').trim()
  const manufacturerId = /^\d+$/.test(manufacturerIdStr) ? BigInt(manufacturerIdStr) : null
  const productId = BigInt(productIdStr)
  const receipt = await prisma.inboundReceipt.findUnique({
    where: { id: receiptId },
    select: { purchaseRequestId: true },
  })

  const purchaseRequestItem = receipt?.purchaseRequestId
    ? await prisma.purchaseRequestItem.findFirst({
      where: {
        purchaseRequestId: receipt.purchaseRequestId,
        productId,
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    })
    : null
  const purchaseRequestItemId = purchaseRequestItem?.id ?? null

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
        purchaseRequestItemId,
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
        manufacturerId,
      },
    })
    return
  }

  await prisma.inboundReceiptItem.create({
    data: {
      inboundReceiptId: receiptId,
      purchaseRequestItemId,
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
      manufacturerId,
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
    select: { id: true, status: true, sourceReceiptId: true, receiptRef: true },
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

  const actorId = await getFirstActiveUserId()

  await prisma.$transaction(async (tx) => {
    if (receipt.sourceReceiptId) {
      await tx.inboundReceipt.updateMany({
        where: {
          id: receipt.sourceReceiptId,
          adjustedByReceiptId: receipt.id,
        },
        data: {
          adjustedByReceiptId: null,
        },
      })

      await tx.inboundReceiptHistory.create({
        data: {
          inboundReceiptId: receipt.sourceReceiptId,
            actionType: 'adjustment_restored',
            actionLabel: `Phục hồi phiếu gốc do hủy phiếu điều chỉnh ${receipt.receiptRef}`,
          actorId,
          data: {
            adjustmentReceiptId: receipt.id.toString(),
            adjustmentReceiptRef: receipt.receiptRef,
              restoredBecause: 'adjustment_cancelled',
          },
        },
      })
    }

    await tx.inboundReceipt.delete({ where: { id: receipt.id } })
  })

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

  const isAdjustment = Boolean(receipt.sourceReceiptId)

  if (receipt.items.length === 0 && !isAdjustment) {
    res.status(400).json({ error: 'Phiếu chưa có dòng hàng nhập. Vui lòng bổ sung dữ liệu trước khi posted.' })
    return
  }

  // Chỉ bắt buộc QC + chứng từ cho phiếu thường, hoặc phiếu điều chỉnh còn dòng hàng
  if (receipt.items.length > 0) {
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
  }

  const actorId = await getFirstActiveUserId()
  const postedAt = new Date()

  await prisma.$transaction(async (tx) => {
    const touchedPurchaseRequestIds = new Set<string>()
    const touchedPurchaseRequestItemIds = new Set<string>()

    if (receipt.sourceReceiptId) {
      const sourceReceipt = await tx.inboundReceipt.findUnique({
        where: { id: receipt.sourceReceiptId },
        include: {
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              lotNo: true,
              purchaseRequestItemId: true,
              quantityBase: true,
              postedBatchId: true,
            },
          },
        },
      })

      if (!sourceReceipt) {
        throw new Error('Không tìm thấy phiếu gốc để thực hiện void & re-receive.')
      }

      if (sourceReceipt.status !== 'posted') {
        throw new Error('Phiếu gốc chưa ở trạng thái posted, không thể thực hiện void & re-receive.')
      }

      if (sourceReceipt.adjustedByReceiptId && sourceReceipt.adjustedByReceiptId !== receipt.id) {
        throw new Error('Phiếu gốc đã có một phiếu điều chỉnh khác.')
      }

      if (sourceReceipt.purchaseRequestId) {
        touchedPurchaseRequestIds.add(sourceReceipt.purchaseRequestId.toString())
      }

      for (const sourceItem of sourceReceipt.items) {
        if (!sourceItem.postedBatchId) continue

        const sourceBatch = await tx.batch.findUnique({
          where: { id: sourceItem.postedBatchId },
          select: { id: true, currentQtyBase: true },
        })

        if (!sourceBatch) {
          throw new Error('Không tìm thấy batch gốc để void.')
        }

        const originalQtyBase = Number(sourceItem.quantityBase)
        const currentQtyBase = Number(sourceBatch.currentQtyBase)
        if (currentQtyBase < originalQtyBase) {
          const issuedQty = (originalQtyBase - currentQtyBase).toFixed(3)
          throw new Error(
            `Không thể void lô ${sourceItem.lotNo}. Lô đã xuất ${issuedQty} g, còn lại ${currentQtyBase.toFixed(3)} g. ` +
            `Vui lòng nhập trả kho toàn bộ trước khi điều chỉnh.`
          )
        }

        await tx.inventoryTransaction.create({
          data: {
            batchId: sourceBatch.id,
            userId: actorId,
            inboundReceiptItemId: sourceItem.id,
            type: 'adjustment',
            quantityBase: -originalQtyBase,
            notes: `Void & re-receive từ phiếu ${receipt.receiptRef}`,
            transactionDate: postedAt,
          },
        })

        await tx.batch.update({
          where: { id: sourceBatch.id },
          data: {
            currentQtyBase: { decrement: originalQtyBase },
            status: 'rejected',
          },
        })

        if (sourceItem.purchaseRequestItemId) {
          touchedPurchaseRequestItemIds.add(sourceItem.purchaseRequestItemId.toString())
        }
      }

      await tx.inboundReceipt.update({
        where: { id: sourceReceipt.id },
        data: {
          adjustedByReceiptId: receipt.id,
        },
      })

      await tx.inboundReceiptHistory.create({
        data: {
          inboundReceiptId: sourceReceipt.id,
          actionType: 'voided_for_rereceive',
          actionLabel: `Void batch gốc bởi phiếu điều chỉnh ${receipt.receiptRef}`,
          actorId,
          data: {
            adjustmentReceiptId: receipt.id.toString(),
            adjustmentReceiptRef: receipt.receiptRef,
            adjustedAt: postedAt.toISOString(),
          },
        },
      })
    }

    for (const item of receipt.items) {
      if (item.postedBatchId && item.postedTxId) continue

      const quantityBase = Number(item.quantityBase)
      const quantityDisplay = Number(item.quantityDisplay)
      const unitPricePerKg = Number(item.unitPricePerKg)

      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          supplierId: receipt.supplierId ?? undefined,
          manufacturerId: item.manufacturerId ?? undefined,
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
        touchedPurchaseRequestItemIds.add(item.purchaseRequestItemId.toString())

        if (receipt.purchaseRequestId) {
          touchedPurchaseRequestIds.add(receipt.purchaseRequestId.toString())
        }
      }
    }

    // Recalculate receivedQtyBase from actual receipt lines in the same DB transaction
    // to avoid drift caused by incremental add/subtract logic over time.
    if (touchedPurchaseRequestItemIds.size > 0) {
      const touchedPrItems = await tx.purchaseRequestItem.findMany({
        where: {
          id: {
            in: Array.from(touchedPurchaseRequestItemIds).map((id) => BigInt(id)),
          },
        },
        select: {
          id: true,
          purchaseRequestId: true,
        },
      })

      for (const prItem of touchedPrItems) {
        const aggregate = await tx.inboundReceiptItem.aggregate({
          where: {
            purchaseRequestItemId: prItem.id,
            OR: [
              { inboundReceiptId: receipt.id },
              {
                inboundReceipt: {
                  status: 'posted',
                  adjustedByReceiptId: null,
                },
              },
            ],
          },
          _sum: {
            quantityBase: true,
          },
        })

        await tx.purchaseRequestItem.update({
          where: { id: prItem.id },
          data: {
            receivedQtyBase: Number(aggregate._sum.quantityBase ?? 0),
          },
        })

        touchedPurchaseRequestIds.add(prItem.purchaseRequestId.toString())
      }
    }

    for (const purchaseRequestIdRaw of touchedPurchaseRequestIds) {
      const purchaseRequestId = BigInt(purchaseRequestIdRaw)
      const prItems = await tx.purchaseRequestItem.findMany({
        where: { purchaseRequestId },
        select: {
          quantityNeededBase: true,
          receivedQtyBase: true,
        },
      })

      const hasAnyReceived = prItems.some((item) => Number(item.receivedQtyBase) > 0)
      const isFullyReceived = prItems.length > 0
        && prItems.every((item) => Number(item.receivedQtyBase) >= Number(item.quantityNeededBase))

      await tx.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: {
          status: isFullyReceived ? 'received' : (hasAnyReceived ? 'partially_received' : 'ordered'),
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

router.post('/receipts/:id/void-rereceive', async (req, res) => {
  const idRaw = String(req.params.id ?? '').trim()
  if (!/^\d+$/.test(idRaw)) {
    res.status(400).json({ error: 'ID phiếu nhập kho không hợp lệ.' })
    return
  }

  const sourceReceipt = await prisma.inboundReceipt.findUnique({
    where: { id: BigInt(idRaw) },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: {
          documents: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!sourceReceipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' })
    return
  }

  if (sourceReceipt.status !== 'posted') {
    res.status(409).json({ error: 'Chỉ có thể điều chỉnh phiếu đã posted.' })
    return
  }

  if (sourceReceipt.adjustedByReceiptId) {
    res.status(409).json({ error: 'Phiếu này đã có phiếu điều chỉnh trước đó.' })
    return
  }

  const existingAdjustment = await prisma.inboundReceipt.findFirst({
    where: {
      sourceReceiptId: sourceReceipt.id,
    },
    select: {
      id: true,
      receiptRef: true,
      status: true,
    },
  })

  if (existingAdjustment) {
    res.status(409).json({
      error: `Phiếu này đã có phiếu điều chỉnh ${existingAdjustment.receiptRef} (${existingAdjustment.status}).`,
    })
    return
  }

  if (sourceReceipt.items.length === 0) {
    res.status(400).json({ error: 'Phiếu posted không có dòng dữ liệu để điều chỉnh.' })
    return
  }

  // Guard: kiểm tra các lô đã có xuất kho
  const issuedBatches: Array<{ lotNo: string; issuedQty: number; currentQty: number }> = []
  for (const item of sourceReceipt.items) {
    if (!item.postedBatchId) continue
    const batch = await prisma.batch.findUnique({
      where: { id: item.postedBatchId },
      select: { currentQtyBase: true },
    })
    if (!batch) continue
    const originalQty = Number(item.quantityBase)
    const currentQty = Number(batch.currentQtyBase)
    if (currentQty < originalQty) {
      issuedBatches.push({
        lotNo: item.lotNo,
        issuedQty: originalQty - currentQty,
        currentQty,
      })
    }
  }

  if (issuedBatches.length > 0) {
    const detail = issuedBatches
      .map((b) => `Lô ${b.lotNo}: đã xuất ${b.issuedQty.toFixed(3)} g, còn lại ${b.currentQty.toFixed(3)} g`)
      .join('; ')
    res.status(409).json({
      error: `Không thể điều chỉnh phiếu. Một số lô đã phát sinh xuất kho: ${detail}. Vui lòng nhập trả kho trước khi điều chỉnh.`,
    })
    return
  }

  const actorId = await getFirstActiveUserId()
  const nextReceiptRef = await buildAdjustmentReceiptRef(sourceReceipt.receiptRef)

  const adjustmentReceipt = await prisma.$transaction(async (tx) => {
    const created = await tx.inboundReceipt.create({
      data: {
        receiptRef: nextReceiptRef,
        purchaseRequestId: sourceReceipt.purchaseRequestId,
        sourceReceiptId: sourceReceipt.id,
        supplierId: sourceReceipt.supplierId,
        receivingLocationId: sourceReceipt.receivingLocationId,
        status: 'draft',
        expectedDate: sourceReceipt.expectedDate,
        currentStep: 4,
        createdBy: actorId,
        notes: `Phiếu điều chỉnh theo hướng Void & re-receive từ ${sourceReceipt.receiptRef}`,
      },
    })

    for (const item of sourceReceipt.items) {
      const clonedItem = await tx.inboundReceiptItem.create({
        data: {
          inboundReceiptId: created.id,
          purchaseRequestItemId: item.purchaseRequestItemId,
          productId: item.productId,
          lotNo: item.lotNo,
          invoiceNumber: item.invoiceNumber,
          invoiceDate: item.invoiceDate,
          manufactureDate: item.manufactureDate,
          expiryDate: item.expiryDate,
          quantityBase: item.quantityBase,
          unitUsed: item.unitUsed,
          quantityDisplay: item.quantityDisplay,
          unitPricePerKg: item.unitPricePerKg,
          lineAmount: item.lineAmount,
          manufacturerId: item.manufacturerId ?? undefined,
          qcStatus: 'passed',
          hasDocument: item.hasDocument,
          notes: item.notes,
        },
      })

      if (item.documents.length > 0) {
        await tx.inboundReceiptItemDocument.createMany({
          data: item.documents.map((doc) => ({
            itemId: clonedItem.id,
            docType: doc.docType,
            filePath: doc.filePath,
            originalName: doc.originalName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            uploadedBy: doc.uploadedBy,
          })),
        })
      }
    }

    await tx.inboundReceiptHistory.createMany({
      data: [
        {
          inboundReceiptId: created.id,
          actionType: 'created_adjustment',
          actionLabel: `Khởi tạo phiếu điều chỉnh từ ${sourceReceipt.receiptRef}`,
          actorId,
          data: {
            sourceReceiptId: sourceReceipt.id.toString(),
            sourceReceiptRef: sourceReceipt.receiptRef,
          },
        },
        {
          inboundReceiptId: sourceReceipt.id,
          actionType: 'adjustment_created',
          actionLabel: `Tạo phiếu điều chỉnh nháp ${created.receiptRef}`,
          actorId,
          data: {
            adjustmentReceiptId: created.id.toString(),
            adjustmentReceiptRef: created.receiptRef,
          },
        },
      ],
    })

    return created
  })

  res.status(201).json({
    id: adjustmentReceipt.id.toString(),
    receiptRef: adjustmentReceipt.receiptRef,
    currentStep: readDraftStep(adjustmentReceipt.currentStep),
    sourceReceiptId: sourceReceipt.id.toString(),
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
