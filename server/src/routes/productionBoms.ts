import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBomCode(): string {
  const seq = String(Date.now()).slice(-4)
  return `DM-${seq}`
}

const serializeBigInt = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (typeof obj === 'object') {
    if (typeof (obj as Record<string, unknown>).toNumber === 'function') {
      return (obj as { toNumber: () => number }).toNumber()
    }
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)])
    )
  }
  return obj
}

const bomInclude = {
  outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
  creator:       { select: { id: true, fullName: true } },
  approver:      { select: { id: true, fullName: true } },
  lines: { orderBy: { sortOrder: 'asc' as const } },
}

// ─── History helper ───────────────────────────────────────────────────────────

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function logBomAction(
  db: TxClient | typeof prisma,
  bomId: bigint,
  actorId: bigint,
  actionType: string,
  actionLabel: string,
) {
  await (db as typeof prisma).productionBomLog.create({
    data: { bomId, actorId, actionType, actionLabel },
  })
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const lineSchema = z.object({
  id:          z.number().int().positive().optional(),
  sortOrder:   z.number().int().min(0).default(0),
  lineType:    z.enum(['nvl', 'btp']).default('nvl'),
  productId:   z.number().int().positive().nullable().optional(),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  qtyPerBase:  z.number().min(0),
  wasteQty:    z.number().min(0).default(0),
  unit:        z.string().min(1),
  notes:       z.string().nullable().optional(),
})

const createSchema = z.object({
  bomCode:        z.string().min(1).optional(),
  bomName:        z.string().min(1),
  bomVersion:     z.string().optional(),
  outputProductId:z.number().int().positive().nullable().optional(),
  baseQty:        z.number().positive().default(1),
  effectiveFrom:  z.string().nullable().optional(),
  effectiveTo:    z.string().nullable().optional(),
  notes:          z.string().nullable().optional(),
  lines:          z.array(lineSchema).default([]),
})

// ─── LIST ─────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const { status, q, page = '1', limit = '50' } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (status && status !== 'all') where.status = status
  if (q) {
    where.OR = [
      { bomCode: { contains: q } },
      { bomName: { contains: q } },
    ]
  }

  const pageNum  = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(200, parseInt(limit) || 50)
  const skip     = (pageNum - 1) * limitNum

  const [data, total] = await prisma.$transaction([
    prisma.productionBom.findMany({
      where,
      include: {
        outputProduct: { select: { id: true, code: true, name: true, outputType: true, unit: true } },
        creator:       { select: { id: true, fullName: true } },
        approver:      { select: { id: true, fullName: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.productionBom.count({ where }),
  ])

  res.json(serializeBigInt({ data, total, page: pageNum, limit: limitNum }))
})

// ─── NEXT CODE ────────────────────────────────────────────────────────────────

router.get('/next-code', requireAuth, requirePermission('production:view'), async (_req, res) => {
  // Find the highest DM-NNNN numeric suffix among existing codes
  const boms = await prisma.productionBom.findMany({
    where:  { bomCode: { startsWith: 'DM-' } },
    select: { bomCode: true },
  })
  let max = 0
  for (const b of boms) {
    const num = parseInt((b.bomCode ?? '').replace('DM-', ''), 10)
    if (!isNaN(num) && num > max) max = num
  }
  const next = `DM-${String(max + 1).padStart(4, '0')}`
  res.json({ code: next })
})

// ─── GET SINGLE ───────────────────────────────────────────────────────────────

router.get('/:id', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const id = BigInt(req.params.id)
  const bom = await prisma.productionBom.findUnique({ where: { id }, include: bomInclude })
  if (!bom) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  res.json(serializeBigInt(bom))
})

// ─── CREATE ───────────────────────────────────────────────────────────────────

router.post('/', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const body = createSchema.parse(req.body)
  const userId = BigInt(req.auth!.sub)

  const bom = await prisma.productionBom.create({
    data: {
      bomCode:        body.bomCode?.trim() || buildBomCode(),
      bomName:        body.bomName,
      bomVersion:     body.bomVersion?.trim() ?? null,
      outputProductId: body.outputProductId ? BigInt(body.outputProductId) : null,
      baseQty:        body.baseQty,
      effectiveFrom:  body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      effectiveTo:    body.effectiveTo   ? new Date(body.effectiveTo)   : null,
      notes:          body.notes ?? null,
      createdBy:      userId,
      lines: {
        create: body.lines.map((l, i) => ({
          sortOrder:   l.sortOrder ?? i,
          lineType:    l.lineType,
          productId:   l.productId ? BigInt(l.productId) : null,
          productCode: l.productCode,
          productName: l.productName,
          qtyPerBase:  l.qtyPerBase,
          wasteQty:    l.wasteQty ?? 0,
          unit:        l.unit,
          notes:       l.notes ?? null,
        })),
      },
    },
    include: bomInclude,
  })

  await logBomAction(prisma, bom.id, userId, 'created', 'Tạo phiếu định mức')

  res.status(201).json(serializeBigInt(bom))
})

// ─── UPDATE (header + replace all lines) ─────────────────────────────────────

router.put('/:id', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id   = BigInt(req.params.id)
  const body = createSchema.parse(req.body)

  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (!['draft'].includes(existing.status)) {
    res.status(409).json({ error: 'Chỉ phiếu ở trạng thái "Bản nháp" mới được chỉnh sửa.' }); return
  }

  const userId = BigInt(req.auth!.sub)

  const bom = await prisma.$transaction(async (tx) => {
    await tx.productionBomLine.deleteMany({ where: { bomId: id } })
    const updated = await tx.productionBom.update({
      where: { id },
      data: {
        ...(body.bomCode?.trim() ? { bomCode: body.bomCode.trim() } : {}),
        bomVersion:      body.bomVersion?.trim() ?? null,
        bomName:         body.bomName,
        outputProductId: body.outputProductId ? BigInt(body.outputProductId) : null,
        baseQty:         body.baseQty,
        effectiveFrom:   body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo:     body.effectiveTo   ? new Date(body.effectiveTo)   : null,
        notes:           body.notes ?? null,
        lines: {
          create: body.lines.map((l, i) => ({
            sortOrder:   l.sortOrder ?? i,
            lineType:    l.lineType,
            productId:   l.productId ? BigInt(l.productId) : null,
            productCode: l.productCode,
            productName: l.productName,
            qtyPerBase:  l.qtyPerBase,
            wasteQty:    l.wasteQty ?? 0,
            unit:        l.unit,
            notes:       l.notes ?? null,
          })),
        },
      },
      include: bomInclude,
    })
    await logBomAction(tx, id, userId, 'updated', 'Cập nhật phiếu định mức')
    return updated
  })

  res.json(serializeBigInt(bom))
})

// ─── SUBMIT (draft → submitted) ───────────────────────────────────────────────

router.post('/:id/submit', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id     = BigInt(req.params.id)
  const userId = BigInt(req.auth!.sub)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true, lines: { select: { id: true } } } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'draft') {
    res.status(409).json({ error: 'Chỉ phiếu "Bản nháp" mới có thể gửi duyệt.' }); return
  }
  if (existing.lines.length === 0) {
    res.status(422).json({ error: 'Phiếu định mức phải có ít nhất 1 dòng NVL/BTP.' }); return
  }
  const bom = await prisma.$transaction(async (tx) => {
    const updated = await tx.productionBom.update({ where: { id }, data: { status: 'submitted' }, include: bomInclude })
    await logBomAction(tx, id, userId, 'submitted', 'Gửi duyệt phiếu định mức')
    return updated
  })
  res.json(serializeBigInt(bom))
})

// ─── APPROVE (submitted → approved) ──────────────────────────────────────────

router.post('/:id/approve', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id     = BigInt(req.params.id)
  const userId = BigInt(req.auth!.sub)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'submitted') {
    res.status(409).json({ error: 'Chỉ phiếu "Đã gửi duyệt" mới có thể phê duyệt.' }); return
  }
  const bom = await prisma.$transaction(async (tx) => {
    const updated = await tx.productionBom.update({ where: { id }, data: { status: 'approved', approvedBy: userId, approvedAt: new Date() }, include: bomInclude })
    await logBomAction(tx, id, userId, 'approved', 'Phê duyệt phiếu định mức')
    return updated
  })
  res.json(serializeBigInt(bom))
})

// ─── RECALL to draft (submitted → draft) ─────────────────────────────────────

router.post('/:id/recall', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id     = BigInt(req.params.id)
  const userId = BigInt(req.auth!.sub)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'submitted') {
    res.status(409).json({ error: 'Chỉ phiếu "Đã gửi duyệt" mới có thể thu hồi.' }); return
  }
  const bom = await prisma.$transaction(async (tx) => {
    const updated = await tx.productionBom.update({ where: { id }, data: { status: 'draft', approvedBy: null, approvedAt: null }, include: bomInclude })
    await logBomAction(tx, id, userId, 'recalled', 'Thu hồi phiếu định mức')
    return updated
  })
  res.json(serializeBigInt(bom))
})

// ─── DEACTIVATE (approved → inactive) ────────────────────────────────────────

router.post('/:id/deactivate', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id     = BigInt(req.params.id)
  const userId = BigInt(req.auth!.sub)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'approved') {
    res.status(409).json({ error: 'Chỉ phiếu "Đã duyệt" mới có thể ngưng hiệu lực.' }); return
  }
  const bom = await prisma.$transaction(async (tx) => {
    const updated = await tx.productionBom.update({ where: { id }, data: { status: 'inactive' }, include: bomInclude })
    await logBomAction(tx, id, userId, 'deactivated', 'Ngưng hiệu lực phiếu định mức')
    return updated
  })
  res.json(serializeBigInt(bom))
})

// ─── HISTORY ──────────────────────────────────────────────────────────────────

router.get('/:id/history', requireAuth, requirePermission('production:view'), async (req: AuthenticatedRequest, res) => {
  const id = BigInt(req.params.id)

  const bom = await prisma.productionBom.findUnique({
    where: { id },
    select: { id: true, createdAt: true, creator: { select: { fullName: true } } },
  })
  if (!bom) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }

  const logs = await prisma.productionBomLog.findMany({
    where: { bomId: id },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { fullName: true } } },
  })

  const rows: Array<{ id: string; actionType: string; actionLabel: string; actorName: string; createdAt: string; data: unknown }> =
    logs.map((entry) => ({
      id:          entry.id.toString(),
      actionType:  entry.actionType,
      actionLabel: entry.actionLabel,
      actorName:   entry.actor.fullName,
      createdAt:   entry.createdAt.toISOString(),
      data:        entry.data,
    }))

  // Always show virtual 'created' event if no real log exists yet
  if (!rows.some((r) => r.actionType === 'created')) {
    rows.push({
      id:          `virtual-created-${bom.id.toString()}`,
      actionType:  'created',
      actionLabel: 'Tạo phiếu định mức',
      actorName:   bom.creator.fullName,
      createdAt:   bom.createdAt.toISOString(),
      data:        null,
    })
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  res.json(rows)
})

export default router
