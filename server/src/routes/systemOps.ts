import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ──────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS (key/value store)
// ──────────────────────────────────────────────────────────────────────

router.get('/settings', requireAuth, requirePermission('settings.read'), async (_req, res) => {
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
  // Return as {key: value} map for convenience
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  res.json(map)
})

router.get('/settings/:key', requireAuth, requirePermission('settings.read'), async (req, res) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: req.params.key } })
  if (!setting) { res.status(404).json({ error: 'Setting not found' }); return }
  res.json(setting)
})

router.put('/settings/:key', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const schema = z.object({ value: z.string() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const setting = await prisma.systemSetting.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value },
  })
  res.json(setting)
})

/** Batch update multiple settings at once */
router.patch('/settings', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const schema = z.record(z.string(), z.string())
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const ops = Object.entries(parsed.data).map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  )
  await prisma.$transaction(ops)
  res.json({ updated: Object.keys(parsed.data).length })
})

// ──────────────────────────────────────────────────────────────────────
// PRINT TEMPLATES
// ──────────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['sale', 'purchase', 'quote', 'delivery']),
  body: z.string().min(1),
  isDefault: z.boolean().default(false),
})

router.get('/templates', requireAuth, requirePermission('settings.read'), async (req, res) => {
  const { type } = req.query as Record<string, string>
  const where: Record<string, unknown> = {}
  if (type) where.type = type
  const templates = await prisma.printTemplate.findMany({ where, orderBy: { name: 'asc' } })
  res.json(templates)
})

router.get('/templates/:id', requireAuth, requirePermission('settings.read'), async (req, res) => {
  const template = await prisma.printTemplate.findUnique({ where: { id: req.params.id } })
  if (!template) { res.status(404).json({ error: 'Template not found' }); return }
  res.json(template)
})

router.post('/templates', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.printTemplate.findUnique({ where: { code: parsed.data.code } })
  if (existing) { res.status(409).json({ error: 'Template code already exists' }); return }

  // If setting as default, unset others of same type
  if (parsed.data.isDefault) {
    await prisma.printTemplate.updateMany({
      where: { type: parsed.data.type, isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await prisma.printTemplate.create({ data: parsed.data })
  res.status(201).json(template)
})

router.put('/templates/:id', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const existing = await prisma.printTemplate.findUnique({ where: { id: req.params.id } })
  if (!existing) { res.status(404).json({ error: 'Template not found' }); return }

  const parsed = templateSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  if (parsed.data.isDefault) {
    const type = parsed.data.type ?? existing.type
    await prisma.printTemplate.updateMany({
      where: { type, isDefault: true, id: { not: existing.id } },
      data: { isDefault: false },
    })
  }

  const template = await prisma.printTemplate.update({ where: { id: existing.id }, data: parsed.data })
  res.json(template)
})

router.delete('/templates/:id', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const existing = await prisma.printTemplate.findUnique({ where: { id: req.params.id } })
  if (!existing) { res.status(404).json({ error: 'Template not found' }); return }
  await prisma.printTemplate.delete({ where: { id: existing.id } })
  res.status(204).send()
})

// ──────────────────────────────────────────────────────────────────────
// IMPORT LOGS (CSV / XLS import tracking)
// ──────────────────────────────────────────────────────────────────────

router.get('/import-logs', requireAuth, requirePermission('settings.read'), async (req, res) => {
  const { type, status, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Number(page) - 1) * Number(limit)
  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (status) where.status = status

  const [data, total] = await Promise.all([
    prisma.importLog.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.importLog.count({ where }),
  ])
  res.json({ data, total, page: Number(page), limit: Number(limit) })
})

router.get('/import-logs/:id', requireAuth, requirePermission('settings.read'), async (req, res) => {
  const log = await prisma.importLog.findUnique({ where: { id: req.params.id } })
  if (!log) { res.status(404).json({ error: 'Import log not found' }); return }
  res.json(log)
})

/**
 * Initiate an import job (actual CSV parsing would be handled by a background job / upload middleware).
 * This endpoint registers the log and returns an ID. The actual import can be triggered separately.
 */
router.post('/import-logs', requireAuth, requirePermission('settings.write'), async (req, res) => {
  const schema = z.object({
    type: z.enum(['products', 'customers', 'suppliers']),
    fileName: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const log = await prisma.importLog.create({
    data: { type: parsed.data.type, fileName: parsed.data.fileName, status: 'pending' },
  })
  res.status(201).json(log)
})

export default router
