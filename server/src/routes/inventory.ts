import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { InventoryTransactionType, BatchStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// HELPER — resolve warehouse location for a list of batch IDs
// Tries 3 sources in priority order:
//   1. inbound_receipt_items → inbound_receipts.receiving_location_id
//   2. opening_stock_items.posted_batch_id = batch.id → location_id
//   3. opening_stock_items matching (product_id, lot_no) → location_id
// ──────────────────────────────────────────────────────────────────────
type BatchLocationRow = { batchId: bigint; locationId: bigint | null; locationCode: string | null; locationName: string | null }

async function getBatchLocations(batchIds: bigint[]): Promise<Map<string, { id: string; code: string; name: string } | null>> {
  if (batchIds.length === 0) return new Map()

  const placeholders = batchIds.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe<BatchLocationRow[]>(
    `SELECT
       b.id AS batchId,
       COALESCE(ir.receiving_location_id, osi_b.location_id, osi_l.location_id) AS locationId,
       COALESCE(ir_loc.code, osi_b_loc.code, osi_l_loc.code) AS locationCode,
       COALESCE(ir_loc.name, osi_b_loc.name, osi_l_loc.name) AS locationName
     FROM batches b
     LEFT JOIN inbound_receipt_items iri ON iri.id = b.inbound_receipt_item_id
     LEFT JOIN inbound_receipts ir ON ir.id = iri.inbound_receipt_id AND ir.receiving_location_id IS NOT NULL
     LEFT JOIN inventory_locations ir_loc ON ir_loc.id = ir.receiving_location_id
     LEFT JOIN (
       SELECT osi.posted_batch_id, MIN(osi.location_id) AS location_id
       FROM opening_stock_items osi
       WHERE osi.location_id IS NOT NULL AND osi.posted_batch_id IS NOT NULL
       GROUP BY osi.posted_batch_id
     ) osi_b ON osi_b.posted_batch_id = b.id
     LEFT JOIN inventory_locations osi_b_loc ON osi_b_loc.id = osi_b.location_id
     LEFT JOIN (
       SELECT osi.product_id, osi.lot_no, MIN(osi.location_id) AS location_id
       FROM opening_stock_items osi
       WHERE osi.location_id IS NOT NULL
       GROUP BY osi.product_id, osi.lot_no
     ) osi_l ON osi_l.product_id = b.product_id AND osi_l.lot_no = b.lot_no
     LEFT JOIN inventory_locations osi_l_loc ON osi_l_loc.id = osi_l.location_id
     WHERE b.id IN (${placeholders})`,
    ...batchIds,
  )

  const map = new Map<string, { id: string; code: string; name: string } | null>()
  for (const row of rows) {
    const key = String(row.batchId)
    map.set(key, row.locationId != null ? { id: String(row.locationId), code: row.locationCode ?? '', name: row.locationName ?? '' } : null)
  }
  return map
}

// ──────────────────────────────────────────────────────────────────────
// HELPER — reverse-compute quantity adjustments from transactions AFTER
// a given date; used to report stock as-of a historical processing date.
// Returns Map<batchId string, netDelta> where netDelta should be
// subtracted from currentQtyBase to get qty at that date.
// ──────────────────────────────────────────────────────────────────────
async function getQtyAdjustmentsSince(batchIds: bigint[], afterDate: Date): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map()
  const txs = await prisma.inventoryTransaction.findMany({
    where: {
      batchId: { in: batchIds },
      isCancelled: false,
      transactionDate: { gt: afterDate },
    },
    select: { batchId: true, type: true, quantityBase: true },
  })
  const map = new Map<string, number>()
  for (const tx of txs) {
    const key = String(tx.batchId)
    const prev = map.get(key) ?? 0
    // Mirror the delta logic used when creating transactions:
    // import → +qty, export → -qty, adjustment → +qty (may be negative)
    const delta = tx.type === InventoryTransactionType.export
      ? -Number(tx.quantityBase)
      : Number(tx.quantityBase)
    map.set(key, prev + delta)
  }
  return map
}

function parseAsOfDate(raw: string): Date | null {
  // Accept 'YYYY-MM-DD' (treat as end-of-day) or full ISO datetime
  const padded = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999` : raw
  const d = new Date(padded)
  return isNaN(d.getTime()) ? null : d
}

// ──────────────────────────────────────────────────────────────────────
// BATCH STOCK — available quantities per product/lot
// ──────────────────────────────────────────────────────────────────────
router.get('/stock', requireAuth, requirePermission('inventory.read'), async (req: Request, res: Response) => {
  const { productId, status, locationId, asOfDate } = req.query as Record<string, string>
  const where: Prisma.BatchWhereInput = { deletedAt: null }
  if (productId) where.productId = BigInt(productId)
  if (status) where.status = status as BatchStatus

  const batches = await prisma.batch.findMany({
    where,
    include: {
      product: {
        select: {
          id: true, code: true, name: true,
          inciNames: { where: { isPrimary: true }, select: { inciName: true }, take: 1 },
        },
      },
      supplier: { select: { id: true, code: true, name: true } },
      manufacturer: { select: { id: true, name: true } },
    },
    orderBy: [{ productId: 'asc' }, { expiryDate: 'asc' }],
  })
  const locationMap = await getBatchLocations(batches.map((b) => b.id))
  const mapped = batches.map((b) => ({
    ...b,
    product: {
      id: b.product.id,
      code: b.product.code,
      name: b.product.name,
      inciName: b.product.inciNames?.[0]?.inciName ?? null,
    },
    manufacturerName: b.manufacturer?.name ?? null,
    supplierName: b.supplier?.name ?? null,
    location: locationMap.get(String(b.id)) ?? null,
  }))
  let result = locationId ? mapped.filter((b) => String(b.location?.id ?? '') === locationId) : mapped

  if (asOfDate) {
    const afterDate = parseAsOfDate(asOfDate)
    if (afterDate) {
      const adjustments = await getQtyAdjustmentsSince(batches.map((b) => b.id), afterDate)
      result = result.map((b) => ({
        ...b,
        currentQtyBase: Number(b.currentQtyBase) - (adjustments.get(String(b.id)) ?? 0),
      }))
    }
  }

  res.json(result)
})

const fefoQuerySchema = z.object({
  productId: z.string().min(1),
  limit: z.string().optional(),
  locationId: z.string().optional(),
  asOfDate: z.string().optional(),
})

router.get('/fefo-suggestions', requireAuth, requirePermission('inventory.read'), async (req: Request, res: Response) => {
  const parsed = fefoQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const productId = BigInt(parsed.data.productId)
  const locationId = parsed.data.locationId
  const asOfDate = parsed.data.asOfDate
  const limitRaw = Number(parsed.data.limit ?? 5)
  const take = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 5

  // When asOfDate is provided, fetch ALL batches (including qty=0) so we can
  // include batches that were depleted AFTER that date.
  // Without asOfDate, limit to batches with current stock > 0.
  const suggestions = await prisma.batch.findMany({
    where: {
      deletedAt: null,
      productId,
      ...(asOfDate ? {} : { currentQtyBase: { gt: 0 } }),
    },
    include: {
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          inciNames: { where: { isPrimary: true }, select: { inciName: true }, take: 1 },
        },
      },
      supplier: { select: { id: true, code: true, name: true } },
      manufacturer: { select: { id: true, name: true } },
    },
    orderBy: [{ expiryDate: 'asc' }, { lotNo: 'asc' }],
  })

  const locationMap = await getBatchLocations(suggestions.map((s) => s.id))

  // Apply historical qty adjustment if asOfDate given
  let qtyAdjustments = new Map<string, number>()
  if (asOfDate) {
    const afterDate = parseAsOfDate(asOfDate)
    if (afterDate) {
      qtyAdjustments = await getQtyAdjustmentsSince(suggestions.map((s) => s.id), afterDate)
    }
  }

  const enriched = suggestions.map((s) => {
    const adjustedQty = Number(s.currentQtyBase) - (qtyAdjustments.get(String(s.id)) ?? 0)
    return {
      id: s.id,
      lotNo: s.lotNo,
      invoiceNumber: s.invoiceNumber ?? null,
      expiryDate: s.expiryDate,
      currentQtyBase: adjustedQty,
      manufacturerName: s.manufacturer?.name ?? null,
      supplierName: s.supplier?.name ?? null,
      product: {
        id: s.product.id,
        code: s.product.code,
        name: s.product.name,
        inciName: s.product.inciNames?.[0]?.inciName ?? null,
      },
      location: locationMap.get(String(s.id)) ?? null,
    }
  })

  // Filter by location then by qty > 0 (especially important when asOfDate adjusts down)
  const filtered = locationId ? enriched.filter((s) => String(s.location?.id ?? '') === locationId) : enriched
  res.json(filtered.filter((s) => s.currentQtyBase > 0).slice(0, take))
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

  const batchId = BigInt(parsed.data.batchId)
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, currentQtyBase: true },
  })
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  if (parsed.data.type === InventoryTransactionType.export) {
    const availableQty = Number(batch.currentQtyBase)
    if (availableQty < parsed.data.quantityBase) {
      res.status(409).json({ error: 'Insufficient stock in selected batch' })
      return
    }
  }

  const delta =
    parsed.data.type === InventoryTransactionType.import
      ? parsed.data.quantityBase
      : parsed.data.type === InventoryTransactionType.export
        ? -parsed.data.quantityBase
        : parsed.data.quantityBase

  const tx = await prisma.$transaction(async (db) => {
    const createdTx = await db.inventoryTransaction.create({
      data: {
        batchId,
        userId: BigInt(req.auth!.sub),
        type: parsed.data.type,
        quantityBase: parsed.data.quantityBase,
        notes: parsed.data.notes,
        transactionDate: parsed.data.transactionDate ? new Date(parsed.data.transactionDate) : new Date(),
      },
    })

    await db.batch.update({
      where: { id: batchId },
      data: { currentQtyBase: { increment: delta } },
    })

    return createdTx
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
