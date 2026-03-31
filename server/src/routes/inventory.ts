import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { InventoryTransactionType, BatchStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// BATCH STOCK — available quantities per product/lot
// ──────────────────────────────────────────────────────────────────────
router.get('/stock', requireAuth, requirePermission('inventory.read'), async (req: Request, res: Response) => {
  const { productId, status } = req.query as Record<string, string>
  const where: Prisma.BatchWhereInput = { deletedAt: null }
  if (productId) where.productId = BigInt(productId)
  if (status) where.status = status as BatchStatus

  const batches = await prisma.batch.findMany({
    where,
    include: {
      product: { select: { id: true, code: true, name: true } },
      supplier: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ productId: 'asc' }, { expiryDate: 'asc' }],
  })
  res.json(batches)
})

// ──────────────────────────────────────────────────────────────────────
// INVENTORY TRANSACTIONS
// ──────────────────────────────────────────────────────────────────────
router.get('/transactions', requireAuth, requirePermission('inventory.read'), async (req: Request, res: Response) => {
  const { batchId, type, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Prisma.InventoryTransactionWhereInput = {}
  if (batchId) where.batchId = BigInt(batchId)
  if (type) where.type = type as InventoryTransactionType

  const [data, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where, skip, take: Number(limit), orderBy: { transactionDate: 'desc' },
      include: {
        batch: { include: { product: { select: { id: true, code: true, name: true } } } },
        user: { select: { id: true, fullName: true } },
      },
    }),
    prisma.inventoryTransaction.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

const transactionSchema = z.object({
  batchId: z.string(),
  type: z.nativeEnum(InventoryTransactionType),
  quantityBase: z.number().refine((n) => n !== 0, { message: 'quantityBase must be non-zero' }),
  notes: z.string().optional(),
  transactionDate: z.string().optional(),
})

router.post('/transactions', requireAuth, requirePermission('inventory.write'), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = transactionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const batch = await prisma.batch.findUnique({ where: { id: BigInt(parsed.data.batchId) } })
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  const tx = await prisma.inventoryTransaction.create({
    data: {
      batchId: BigInt(parsed.data.batchId),
      userId: BigInt(req.auth!.sub),
      type: parsed.data.type,
      quantityBase: parsed.data.quantityBase,
      notes: parsed.data.notes,
      transactionDate: parsed.data.transactionDate ? new Date(parsed.data.transactionDate) : new Date(),
    },
  })
  res.status(201).json(tx)
})

// ──────────────────────────────────────────────────────────────────────
// LEGACY ALIASES — superseded endpoints
// ──────────────────────────────────────────────────────────────────────
const superseded = (_req: Request, res: Response): void => {
  res.status(501).json({
    error: 'This endpoint has been superseded.',
    hint: 'Use GET /api/inventory/transactions?type=adjustment and POST /api/inventory/transactions instead.',
  })
}

router.get('/adjustments', requireAuth, requirePermission('inventory.read'), superseded)
router.get('/adjustments/:id', requireAuth, requirePermission('inventory.read'), superseded)
router.post('/adjustments', requireAuth, requirePermission('inventory.write'), superseded)
router.get('/stock-counts', requireAuth, requirePermission('inventory.read'), superseded)
router.get('/stock-counts/:id', requireAuth, requirePermission('inventory.read'), superseded)
router.post('/stock-counts', requireAuth, requirePermission('inventory.write'), superseded)
router.post('/stock-counts/:id/confirm', requireAuth, requirePermission('inventory.write'), superseded)

export default router
