import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

const OWNER_TAG_PREFIX = '[OWNER_CUSTOMER]'

router.get('/receipts', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '100', status, q } = req.query as Record<string, string | undefined>

  const pageNum = Math.max(1, Math.floor(Number(page)) || 1)
  const limitNum = Math.min(500, Math.max(1, Math.floor(Number(limit)) || 100))

  const where: Prisma.InboundReceiptWhereInput = {
    customerId: { not: null },
  }

  if (status && status !== 'all' && ['draft', 'pending_qc', 'posted', 'cancelled'].includes(status)) {
    where.status = status as 'draft' | 'pending_qc' | 'posted' | 'cancelled'
  }

  if (q?.trim()) {
    where.OR = [
      { receiptRef: { contains: q.trim() } },
      { customer: { name: { contains: q.trim() } } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.inboundReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        customer: { select: { id: true, code: true, name: true } },
        receivingLocation: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, fullName: true } },
        poster: { select: { id: true, fullName: true } },
        items: {
          select: {
            id: true,
            lotNo: true,
            quantityBase: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
    prisma.inboundReceipt.count({ where }),
  ])

  const data = rows.map((row) => {
    const totalQtyBase = Number(
      row.items.reduce((s, i) => s + Number(i.quantityBase), 0).toFixed(3),
    )
    const firstItem = row.items[0]
    return {
      id: row.id.toString(),
      receiptRef: row.receiptRef,
      status: row.status,
      customerId: row.customer?.id?.toString() ?? null,
      customerName: row.customer?.name ?? '---',
      customerCode: row.customer?.code ?? null,
      receivingLocationName: row.receivingLocation?.name ?? null,
      receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      assigneeName: row.poster?.fullName ?? row.creator.fullName,
      itemCount: row.items.length,
      totalQtyBase,
      materialName: firstItem?.product?.name?.trim() || '---',
    }
  })

  res.json({ data, total, page: pageNum, limit: limitNum })
})

router.get('/receipts/:receiptId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const receiptId = BigInt(req.params.receiptId)

  const receipt = await prisma.inboundReceipt.findFirst({
    where: {
      id: receiptId,
      customerId: { not: null },
    },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      receivingLocation: { select: { id: true, name: true } },
      creator: { select: { id: true, fullName: true } },
      items: {
        select: {
          id: true,
          productId: true,
          lotNo: true,
          manufacturerLotNo: true,
          manufactureDate: true,
          expiryDate: true,
          quantityBase: true,
          unitUsed: true,
          product: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhận.' })
    return
  }

  const detail = {
    id: receipt.id.toString(),
    receiptRef: receipt.receiptRef,
    status: receipt.status,
    customerId: receipt.customer!.id.toString(),
    customerName: receipt.customer!.name,
    customerCode: receipt.customer!.code ?? null,
    receivingLocationId: receipt.receivingLocation!.id.toString(),
    receivingLocationName: receipt.receivingLocation!.name,
    receivedAt: receipt.receivedAt ? receipt.receivedAt.toISOString() : new Date().toISOString(),
    dienGiai: receipt.dienGiai,
    items: receipt.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId.toString(),
      productCode: item.product.code,
      productName: item.product.name,
      lotNo: item.lotNo,
      manufacturerLotNo: item.manufacturerLotNo,
      manufactureDate: item.manufactureDate ? item.manufactureDate.toISOString().slice(0, 10) : null,
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : null,
      quantityBase: Number(item.quantityBase),
      unitUsed: item.unitUsed,
    })),
    createdAt: receipt.createdAt.toISOString(),
    createdBy: receipt.creator.fullName,
  }

  res.json(detail)
})

const createCustomerInboundSchema = z.object({
  receiptRef: z.string().trim().max(100).optional(),
  customerId: z.string().trim().min(1),
  receivingLocationId: z.string().trim().min(1),
  receivedAt: z.string().datetime().optional(),
  dienGiai: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(4000).optional(),
  status: z.enum(['draft', 'posted']).optional(),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    lotNo: z.string().trim().min(1).max(100),
    manufacturerLotNo: z.string().trim().max(100).optional(),
    invoiceNumber: z.string().trim().max(100).optional(),
    invoiceDate: z.string().trim().optional(),
    manufactureDate: z.string().trim().optional(),
    expiryDate: z.string().trim().optional(),
    quantityBase: z.number().positive(),
    quantityDisplay: z.number().positive().optional(),
    unitUsed: z.string().trim().min(1).max(50),
    unitPricePerKg: z.number().min(0).optional(),
    manufacturerId: z.string().trim().optional(),
  })).min(1),
})

function buildDefaultReceiptRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `NK-KH-${yyyy}${mm}${dd}-${hh}${min}${ss}`
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

async function getCurrentUserIdFromRequest(req: AuthenticatedRequest): Promise<bigint> {
  if (req.auth?.sub) {
    return BigInt(req.auth.sub)
  }
  return getFirstActiveUserId()
}

function parseOptionalDate(value?: string): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function buildOwnerTag(customer: { id: bigint; code: string; name: string }): string {
  return `${OWNER_TAG_PREFIX}${customer.id.toString()}|${customer.code}|${customer.name}`
}

router.post('/receipts', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createCustomerInboundSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const payload = parsed.data
  const currentUserId = await getCurrentUserIdFromRequest(req)

  const customerId = BigInt(payload.customerId)
  const receivingLocationId = BigInt(payload.receivingLocationId)
  const receiptRefCandidate = payload.receiptRef?.trim() || buildDefaultReceiptRef()
  const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date()

  if (Number.isNaN(receivedAt.getTime())) {
    res.status(400).json({ error: 'Ngày nhận hàng không hợp lệ.' })
    return
  }

  const [customer, location] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
    prisma.catalogLocation.findFirst({
      where: { id: receivingLocationId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ])

  if (!customer) {
    res.status(400).json({ error: 'Khách hàng không tồn tại hoặc đã ngưng hoạt động.' })
    return
  }

  if (!location) {
    res.status(400).json({ error: 'Kho nhận không tồn tại hoặc đã ngưng hoạt động.' })
    return
  }

  const ownerTag = buildOwnerTag(customer)
  const receiptNotes = [ownerTag, payload.notes?.trim()].filter(Boolean).join('\n')

  try {
    const created = await prisma.$transaction(async (tx) => {
      let receiptRef = receiptRefCandidate
      for (let attempt = 1; attempt <= 20; attempt += 1) {
        const existing = await tx.inboundReceipt.findUnique({
          where: { receiptRef },
          select: { id: true },
        })
        if (!existing) break
        receiptRef = `${receiptRefCandidate}-${attempt}`
      }

      const status = payload.status === 'draft' ? 'draft' : 'posted'
      const currentStep = status === 'draft' ? 1 : 4
      const receipt = await tx.inboundReceipt.create({
        data: {
          receiptRef,
          status,
          currentStep,
          customerId,
          receivingLocationId,
          createdBy: currentUserId,
          postedBy: status === 'posted' ? currentUserId : null,
          receivedAt,
          expectedDate: receivedAt,
          notes: receiptNotes || null,
          dienGiai: payload.dienGiai?.trim() || null,
        },
        select: {
          id: true,
          receiptRef: true,
        },
      })

      for (const item of payload.items) {
        const invoiceDate = parseOptionalDate(item.invoiceDate)
        const manufactureDate = parseOptionalDate(item.manufactureDate)
        const expiryDate = parseOptionalDate(item.expiryDate)

        const receiptItem = await tx.inboundReceiptItem.create({
          data: {
            inboundReceiptId: receipt.id,
            productId: BigInt(item.productId),
            lotNo: item.lotNo,
            manufacturerLotNo: item.manufacturerLotNo?.trim() || null,
            invoiceNumber: item.invoiceNumber?.trim() || null,
            invoiceDate,
            manufactureDate,
            expiryDate,
            quantityBase: item.quantityBase,
            quantityDisplay: item.quantityDisplay ?? item.quantityBase,
            unitUsed: item.unitUsed,
            unitPricePerKg: item.unitPricePerKg ?? 0,
            lineAmount: 0,
            qcStatus: 'passed',
            hasDocument: false,
            manufacturerId: item.manufacturerId ? BigInt(item.manufacturerId) : null,
            notes: ownerTag,
          },
          select: {
            id: true,
            productId: true,
          },
        })

        const createdBatch = await tx.batch.create({
          data: {
            productId: receiptItem.productId,
            lotNo: item.lotNo,
            manufacturerLotNo: item.manufacturerLotNo?.trim() || null,
            invoiceNumber: item.invoiceNumber?.trim() || null,
            invoiceDate,
            unitPricePerKg: item.unitPricePerKg ?? 0,
            receivedQtyBase: item.quantityBase,
            currentQtyBase: item.quantityBase,
            purchaseUnit: item.unitUsed,
            purchaseQty: item.quantityDisplay ?? item.quantityBase,
            manufactureDate,
            expiryDate,
            manufacturerId: item.manufacturerId ? BigInt(item.manufacturerId) : null,
            status: 'available',
            notes: ownerTag,
            inboundReceiptItemId: receiptItem.id,
          },
          select: {
            id: true,
          },
        })

        const txRow = await tx.inventoryTransaction.create({
          data: {
            batchId: createdBatch.id,
            userId: currentUserId,
            inboundReceiptItemId: receiptItem.id,
            warehouseLocationId: receivingLocationId,
            type: 'import',
            quantityBase: item.quantityBase,
            notes: `Nhận NVL của khách (${customer.name})`,
            transactionDate: receivedAt,
          },
          select: {
            id: true,
          },
        })

        await tx.inboundReceiptItem.update({
          where: { id: receiptItem.id },
          data: {
            postedBatchId: createdBatch.id,
            postedTxId: txRow.id,
          },
        })
      }

      await tx.inboundReceiptHistory.create({
        data: {
          inboundReceiptId: receipt.id,
          actionType: 'customer_inbound_posted',
          actionLabel: 'Đăng sổ nhận NVL của khách',
          actorId: currentUserId,
          data: {
            ownerCustomerId: customer.id.toString(),
            ownerCustomerCode: customer.code,
            ownerCustomerName: customer.name,
            lineCount: payload.items.length,
          },
        },
      })

      return receipt
    })

    res.status(201).json({
      id: created.id.toString(),
      receiptRef: created.receiptRef,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tạo phiếu nhận NVL của khách.'
    res.status(400).json({ error: message })
  }
})

router.put('/receipts/:receiptId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const receiptId = BigInt(req.params.receiptId)
  const parsed = createCustomerInboundSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const payload = parsed.data
  const currentUserId = await getCurrentUserIdFromRequest(req)

  // Check if receipt exists and is draft
  const existingReceipt = await prisma.inboundReceipt.findFirst({
    where: {
      id: receiptId,
      customerId: { not: null },
    },
    select: { id: true, status: true, receiptRef: true },
  })

  if (!existingReceipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhận.' })
    return
  }

  if (existingReceipt.status !== 'draft') {
    res.status(400).json({ error: 'Chỉ có thể sửa phiếu nhận ở trạng thái lưu nháp.' })
    return
  }

  const customerId = BigInt(payload.customerId)
  const receivingLocationId = BigInt(payload.receivingLocationId)
  const receiptRefCandidate = payload.receiptRef?.trim() || existingReceipt.receiptRef
  const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date()

  if (Number.isNaN(receivedAt.getTime())) {
    res.status(400).json({ error: 'Ngày nhận hàng không hợp lệ.' })
    return
  }

  const [customer, location] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
    prisma.catalogLocation.findFirst({
      where: { id: receivingLocationId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ])

  if (!customer) {
    res.status(400).json({ error: 'Khách hàng không tồn tại hoặc đã ngưng hoạt động.' })
    return
  }

  if (!location) {
    res.status(400).json({ error: 'Kho nhận không tồn tại hoặc đã ngưng hoạt động.' })
    return
  }

  const ownerTag = buildOwnerTag(customer)
  const receiptNotes = [ownerTag, payload.notes?.trim()].filter(Boolean).join('\n')

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items and related data
      const oldItems = await tx.inboundReceiptItem.findMany({
        where: { inboundReceiptId: receiptId },
        select: { id: true, postedBatchId: true, postedTxId: true },
      })

      for (const oldItem of oldItems) {
        if (oldItem.postedTxId) {
          await tx.inventoryTransaction.delete({ where: { id: oldItem.postedTxId } })
        }
        if (oldItem.postedBatchId) {
          await tx.batch.delete({ where: { id: oldItem.postedBatchId } })
        }
        await tx.inboundReceiptItem.delete({ where: { id: oldItem.id } })
      }

      // Update receipt
      const status = payload.status === 'draft' ? 'draft' : 'posted'
      const currentStep = status === 'draft' ? 1 : 4
      
      let receiptRef = receiptRefCandidate
      if (receiptRef !== existingReceipt.receiptRef) {
        for (let attempt = 1; attempt <= 20; attempt += 1) {
          const existing = await tx.inboundReceipt.findUnique({
            where: { receiptRef },
            select: { id: true },
          })
          if (!existing || existing.id === receiptId) break
          receiptRef = `${receiptRefCandidate}-${attempt}`
        }
      }

      const receipt = await tx.inboundReceipt.update({
        where: { id: receiptId },
        data: {
          receiptRef,
          status,
          currentStep,
          customerId,
          receivingLocationId,
          postedBy: status === 'posted' ? currentUserId : null,
          receivedAt,
          expectedDate: receivedAt,
          notes: receiptNotes || null,
          dienGiai: payload.dienGiai?.trim() || null,
        },
        select: {
          id: true,
          receiptRef: true,
        },
      })

      // Create new items
      for (const item of payload.items) {
        const invoiceDate = parseOptionalDate(item.invoiceDate)
        const manufactureDate = parseOptionalDate(item.manufactureDate)
        const expiryDate = parseOptionalDate(item.expiryDate)

        const receiptItem = await tx.inboundReceiptItem.create({
          data: {
            inboundReceiptId: receipt.id,
            productId: BigInt(item.productId),
            lotNo: item.lotNo,
            manufacturerLotNo: item.manufacturerLotNo?.trim() || null,
            invoiceNumber: item.invoiceNumber?.trim() || null,
            invoiceDate,
            manufactureDate,
            expiryDate,
            quantityBase: item.quantityBase,
            quantityDisplay: item.quantityDisplay ?? item.quantityBase,
            unitUsed: item.unitUsed,
            unitPricePerKg: item.unitPricePerKg ?? 0,
            lineAmount: 0,
            qcStatus: 'passed',
            hasDocument: false,
            manufacturerId: item.manufacturerId ? BigInt(item.manufacturerId) : null,
            notes: ownerTag,
          },
          select: {
            id: true,
            productId: true,
          },
        })

        if (status === 'posted') {
          const createdBatch = await tx.batch.create({
            data: {
              productId: receiptItem.productId,
              lotNo: item.lotNo,
              manufacturerLotNo: item.manufacturerLotNo?.trim() || null,
              invoiceNumber: item.invoiceNumber?.trim() || null,
              invoiceDate,
              unitPricePerKg: item.unitPricePerKg ?? 0,
              receivedQtyBase: item.quantityBase,
              currentQtyBase: item.quantityBase,
              purchaseUnit: item.unitUsed,
              purchaseQty: item.quantityDisplay ?? item.quantityBase,
              manufactureDate,
              expiryDate,
              manufacturerId: item.manufacturerId ? BigInt(item.manufacturerId) : null,
              status: 'available',
              notes: ownerTag,
              inboundReceiptItemId: receiptItem.id,
            },
            select: {
              id: true,
            },
          })

          const txRow = await tx.inventoryTransaction.create({
            data: {
              batchId: createdBatch.id,
              userId: currentUserId,
              inboundReceiptItemId: receiptItem.id,
              warehouseLocationId: receivingLocationId,
              type: 'import',
              quantityBase: item.quantityBase,
              notes: `Nhận NVL của khách (${customer.name})`,
              transactionDate: receivedAt,
            },
            select: {
              id: true,
            },
          })

          await tx.inboundReceiptItem.update({
            where: { id: receiptItem.id },
            data: {
              postedBatchId: createdBatch.id,
              postedTxId: txRow.id,
            },
          })
        }
      }

      if (status === 'posted') {
        await tx.inboundReceiptHistory.create({
          data: {
            inboundReceiptId: receipt.id,
            actionType: 'customer_inbound_updated_posted',
            actionLabel: 'Cập nhật và đăng sổ nhận NVL của khách',
            actorId: currentUserId,
            data: {
              ownerCustomerId: customer.id.toString(),
              ownerCustomerCode: customer.code,
              ownerCustomerName: customer.name,
              lineCount: payload.items.length,
            },
          },
        })
      } else {
        await tx.inboundReceiptHistory.create({
          data: {
            inboundReceiptId: receipt.id,
            actionType: 'customer_inbound_updated_draft',
            actionLabel: 'Cập nhật phiếu nhận NVL của khách (nháp)',
            actorId: currentUserId,
            data: {
              ownerCustomerId: customer.id.toString(),
              ownerCustomerCode: customer.code,
              ownerCustomerName: customer.name,
              lineCount: payload.items.length,
            },
          },
        })
      }

      return receipt
    })

    res.json({
      id: updated.id.toString(),
      receiptRef: updated.receiptRef,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể cập nhật phiếu nhận NVL của khách.'
    res.status(400).json({ error: message })
  }
})

router.post('/receipts/:receiptId/revert-to-draft', requireAuth, async (req: AuthenticatedRequest, res) => {
  const receiptId = BigInt(req.params.receiptId)
  const currentUserId = await getCurrentUserIdFromRequest(req)

  // Check if receipt exists and is posted
  const existingReceipt = await prisma.inboundReceipt.findFirst({
    where: {
      id: receiptId,
      customerId: { not: null },
    },
    select: {
      id: true,
      status: true,
      receiptRef: true,
      customer: { select: { id: true, code: true, name: true } },
    },
  })

  if (!existingReceipt) {
    res.status(404).json({ error: 'Không tìm thấy phiếu nhận.' })
    return
  }

  if (existingReceipt.status !== 'posted') {
    res.status(400).json({ error: 'Chỉ có thể thu hồi phiếu nhận ở trạng thái đã hoàn thành.' })
    return
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Get all items and their batches
      const items = await tx.inboundReceiptItem.findMany({
        where: { inboundReceiptId: receiptId },
        select: {
          id: true,
          postedBatchId: true,
          postedTxId: true,
          productId: true,
          lotNo: true,
        },
      })

      // Check if any batch has been used
      for (const item of items) {
        if (item.postedBatchId) {
          const batch = await tx.batch.findUnique({
            where: { id: item.postedBatchId },
            select: { receivedQtyBase: true, currentQtyBase: true },
          })

          if (batch && Number(batch.currentQtyBase) !== Number(batch.receivedQtyBase)) {
            res.status(400).json({
              error: `Không thể thu hồi phiếu nhận vì lô hàng đã được sử dụng (LOT: ${item.lotNo}).`,
            })
            throw new Error('BATCH_ALREADY_USED')
          }
        }
      }

      // Delete inventory transactions and batches
      for (const item of items) {
        if (item.postedTxId) {
          await tx.inventoryTransaction.delete({ where: { id: item.postedTxId } })
        }
        if (item.postedBatchId) {
          await tx.batch.delete({ where: { id: item.postedBatchId } })
        }
        await tx.inboundReceiptItem.update({
          where: { id: item.id },
          data: {
            postedBatchId: null,
            postedTxId: null,
          },
        })
      }

      // Update receipt to draft
      await tx.inboundReceipt.update({
        where: { id: receiptId },
        data: {
          status: 'draft',
          currentStep: 1,
          postedBy: null,
        },
      })

      // Record history
      await tx.inboundReceiptHistory.create({
        data: {
          inboundReceiptId: receiptId,
          actionType: 'customer_inbound_reverted_to_draft',
          actionLabel: 'Thu hồi phiếu nhận NVL của khách về nháp',
          actorId: currentUserId,
          data: {
            ownerCustomerId: existingReceipt.customer?.id?.toString() ?? null,
            ownerCustomerCode: existingReceipt.customer?.code ?? null,
            ownerCustomerName: existingReceipt.customer?.name ?? null,
            receiptRef: existingReceipt.receiptRef,
          },
        },
      })
    })

    res.json({ success: true, message: 'Đã thu hồi phiếu nhận về nháp thành công.' })
  } catch (error) {
    if (error instanceof Error && error.message === 'BATCH_ALREADY_USED') {
      // Error response already sent in transaction
      return
    }
    const message = error instanceof Error ? error.message : 'Không thể thu hồi phiếu nhận về nháp.'
    res.status(400).json({ error: message })
  }
})

export default router
