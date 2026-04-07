import { Router } from 'express'
import { z } from 'zod'
import { PurchaseRequestStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// LIST / GET  (Purchase Requests = warehouse procurement workflow)
// ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('purchases.read'), async (req: AuthenticatedRequest, res) => {
  const { supplierId, status, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.PurchaseRequestWhereInput = {}
  if (supplierId) where.supplierId = BigInt(supplierId)
  if (status) where.status = status as PurchaseRequestStatus

  const [data, total] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, fullName: true } },
        items: { include: { product: { select: { id: true, code: true, name: true } } } },
      },
    }),
    prisma.purchaseRequest.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/:id', requireAuth, requirePermission('purchases.read'), async (req: AuthenticatedRequest, res) => {
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      supplier: true,
      requester: { select: { id: true, fullName: true } },
      approver: { select: { id: true, fullName: true } },
      items: { include: { product: true } },
    },
  })
  if (!pr) { res.status(404).json({ error: 'Purchase request not found' }); return }
  res.json(pr)
})

// ──────────────────────────────────────────────────────────────────────
// CREATE (draft)
// ──────────────────────────────────────────────────────────────────────
const prItemSchema = z.object({
  productId: z.string(),
  quantityNeededBase: z.number().positive(),
  unitDisplay: z.string(),
  quantityDisplay: z.number().positive(),
  notes: z.string().optional(),
})

const createPRSchema = z.object({
  requestRef: z.string().min(1),
  supplierId: z.string().optional(),
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
      expectedDate: header.expectedDate ? new Date(header.expectedDate) : undefined,
      notes: header.notes,
      items: {
        create: items.map((i) => ({
          productId: BigInt(i.productId),
          quantityNeededBase: i.quantityNeededBase,
          unitDisplay: i.unitDisplay,
          quantityDisplay: i.quantityDisplay,
          notes: i.notes,
        })),
      },
    },
    include: { items: true },
  })
  res.status(201).json(pr)
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
  if (pr.status !== PurchaseRequestStatus.approved && pr.status !== PurchaseRequestStatus.ordered) {
    res.status(409).json({ error: 'Request must be approved or ordered before marking received' }); return
  }

  if (pr.items.length === 0) {
    res.status(409).json({ error: 'Cannot receive a request without items' })
    return
  }

  const receivedAt = new Date()
  const userId = BigInt(req.auth!.sub)

  const updated = await prisma.$transaction(async (db) => {
    const request = await db.purchaseRequest.update({
      where: { id: pr.id },
      data: { status: PurchaseRequestStatus.received, receivedAt },
    })

    for (let idx = 0; idx < pr.items.length; idx++) {
      const item = pr.items[idx]
      const lotNo = `${request.requestRef}-${item.product.code}-${Date.now().toString().slice(-6)}-${idx + 1}`

      const batch = await db.batch.create({
        data: {
          productId: item.productId,
          supplierId: request.supplierId ?? undefined,
          lotNo,
          receivedQtyBase: item.quantityNeededBase,
          currentQtyBase: 0,
          purchaseUnit: item.unitDisplay,
          purchaseQty: item.quantityDisplay,
          invoiceDate: receivedAt,
          status: 'available',
          notes: `Auto-created from purchase request ${request.requestRef}`,
        },
      })

      await db.inventoryTransaction.create({
        data: {
          batchId: batch.id,
          userId,
          type: 'import',
          quantityBase: item.quantityNeededBase,
          notes: `Goods received from purchase request ${request.requestRef}`,
          transactionDate: receivedAt,
        },
      })

      await db.batch.update({
        where: { id: batch.id },
        data: { currentQtyBase: { increment: item.quantityNeededBase } },
      })
    }

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
  res.json(updated)
})

export default router
