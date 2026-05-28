import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBomCode(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const seq  = String(now.getTime()).slice(-4)
  return `BOM-${yyyy}${mm}-${seq}`
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
  bomName:        z.string().min(1),
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
      bomCode:        buildBomCode(),
      bomName:        body.bomName,
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

  const bom = await prisma.$transaction(async (tx) => {
    await tx.productionBomLine.deleteMany({ where: { bomId: id } })
    return tx.productionBom.update({
      where: { id },
      data: {
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
  })

  res.json(serializeBigInt(bom))
})

// ─── SUBMIT (draft → submitted) ───────────────────────────────────────────────

router.post('/:id/submit', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id = BigInt(req.params.id)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true, lines: { select: { id: true } } } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'draft') {
    res.status(409).json({ error: 'Chỉ phiếu "Bản nháp" mới có thể gửi duyệt.' }); return
  }
  if (existing.lines.length === 0) {
    res.status(422).json({ error: 'Phiếu định mức phải có ít nhất 1 dòng NVL/BTP.' }); return
  }
  const bom = await prisma.productionBom.update({
    where: { id },
    data:  { status: 'submitted' },
    include: bomInclude,
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
  const bom = await prisma.productionBom.update({
    where: { id },
    data:  { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    include: bomInclude,
  })
  res.json(serializeBigInt(bom))
})

// ─── RECALL to draft (submitted → draft) ─────────────────────────────────────

router.post('/:id/recall', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id = BigInt(req.params.id)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'submitted') {
    res.status(409).json({ error: 'Chỉ phiếu "Đã gửi duyệt" mới có thể thu hồi.' }); return
  }
  const bom = await prisma.productionBom.update({
    where: { id },
    data:  { status: 'draft', approvedBy: null, approvedAt: null },
    include: bomInclude,
  })
  res.json(serializeBigInt(bom))
})

// ─── DEACTIVATE (approved → inactive) ────────────────────────────────────────

router.post('/:id/deactivate', requireAuth, requirePermission('production:write'), async (req: AuthenticatedRequest, res) => {
  const id = BigInt(req.params.id)
  const existing = await prisma.productionBom.findUnique({ where: { id }, select: { status: true } })
  if (!existing) { res.status(404).json({ error: 'Không tìm thấy phiếu định mức.' }); return }
  if (existing.status !== 'approved') {
    res.status(409).json({ error: 'Chỉ phiếu "Đã duyệt" mới có thể ngưng hiệu lực.' }); return
  }
  const bom = await prisma.productionBom.update({
    where: { id },
    data:  { status: 'inactive' },
    include: bomInclude,
  })
  res.json(serializeBigInt(bom))
})

export default router
