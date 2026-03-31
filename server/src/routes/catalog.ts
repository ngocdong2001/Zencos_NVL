import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const router = Router()

type JsonLike = null | boolean | number | string | JsonLike[] | { [k: string]: JsonLike }

function normalizeForJson(value: unknown): JsonLike {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => normalizeForJson(item))
  if (typeof value === 'object') {
    const out: Record<string, JsonLike> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeForJson(v)
    }
    return out
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value
  return String(value)
}

function toStatusLabel(deletedAt: unknown) {
  return deletedAt ? 'Inactive' : 'Active'
}

function isDuplicateCodeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('Code: `1062`') && error.message.includes('products.products_code_key')
}

function getNextNumberFromCodes(codes: string[], prefix: string): number {
  const used = new Set<number>()

  for (const code of codes) {
    const normalized = code.trim().toUpperCase()
    if (!normalized.startsWith(`${prefix}-`)) continue
    const suffix = normalized.slice(prefix.length + 1)
    const n = Number.parseInt(suffix, 10)
    if (Number.isFinite(n) && n > 0) used.add(n)
  }

  let next = 1
  while (used.has(next)) next += 1
  return next
}

async function getNextMaterialCode(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ code: string | null }>>(Prisma.sql`
    SELECT code
    FROM products
    WHERE code LIKE 'NVL-%'
  `)

  const next = getNextNumberFromCodes(rows.map((row) => String(row.code ?? '')), 'NVL')
  return `NVL-${String(next).padStart(3, '0')}`
}

const materialSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  inciName: z.string().optional().default(''),
  productType: z.enum(['raw_material', 'packaging']).default('raw_material'),
  baseUnit: z.string().min(1).default('GR'),
  minStockLevel: z.coerce.number().nonnegative().default(0),
  hasExpiry: z.boolean().default(true),
  useFefo: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const basicCatalogSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  note: z.string().optional().nullable(),
})

router.get('/materials', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim() ?? ''
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, inci_name, product_type, base_unit, deleted_at
    FROM products
    WHERE deleted_at IS NULL
      AND (${q} = '' OR code LIKE ${`%${q}%`} OR name LIKE ${`%${q}%`} OR inci_name LIKE ${`%${q}%`})
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    inciName: String(row.inci_name ?? ''),
    materialName: String(row.name ?? ''),
    category: String(row.product_type ?? ''),
    unit: String(row.base_unit ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.get('/materials/next-code', async (_req, res) => {
  const nextCode = await getNextMaterialCode()
  return res.json({ nextCode })
})

router.post('/materials', async (req, res) => {
  const parsed = materialSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  const codeToInsert = data.code

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO products
        (code, name, inci_name, product_type, has_expiry, use_fefo, base_unit, min_stock_level, notes, created_at, updated_at)
      VALUES
        (${codeToInsert}, ${data.name}, ${data.inciName}, ${data.productType}, ${data.hasExpiry}, ${data.useFefo}, ${data.baseUnit}, ${data.minStockLevel}, ${data.notes ?? null}, NOW(3), NOW(3))
    `)
  } catch (error) {
    if (!isDuplicateCodeError(error)) throw error

    const isGeneratedNvlCode = /^NVL-\d+$/i.test(codeToInsert)
    if (!isGeneratedNvlCode) {
      return res.status(409).json({ message: 'Code already exists', code: codeToInsert })
    }

    const suggestedCode = await getNextMaterialCode()
    return res.status(409).json({
      message: 'Code already exists',
      code: codeToInsert,
      suggestedCode,
    })
  }

  const created = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, inci_name, product_type, base_unit, deleted_at
    FROM products
    WHERE id = LAST_INSERT_ID()
  `)

  return res.status(201).json(normalizeForJson(created[0] ?? null))
})

router.put('/materials/:id', async (req, res) => {
  const parsed = materialSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE products
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      inci_name = COALESCE(${data.inciName ?? null}, inci_name),
      product_type = COALESCE(${data.productType ?? null}, product_type),
      has_expiry = COALESCE(${data.hasExpiry ?? null}, has_expiry),
      use_fefo = COALESCE(${data.useFefo ?? null}, use_fefo),
      base_unit = COALESCE(${data.baseUnit ?? null}, base_unit),
      min_stock_level = COALESCE(${data.minStockLevel ?? null}, min_stock_level),
      notes = COALESCE(${data.notes ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  const updated = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, inci_name, product_type, base_unit, deleted_at
    FROM products
    WHERE id = ${id}
  `)

  if (!updated[0]) return res.status(404).json({ message: 'Material not found' })
  return res.json(normalizeForJson(updated[0]))
})

router.delete('/materials/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE products
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/suppliers', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, notes, deleted_at
    FROM suppliers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    note: String(row.notes ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.post('/suppliers', async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO suppliers
      (code, name, contact_info, address, notes, created_at, updated_at)
    VALUES
      (${data.code}, ${data.name}, ${data.contactInfo ?? null}, ${data.address ?? null}, ${data.notes ?? null}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/suppliers/:id', async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE suppliers
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      contact_info = COALESCE(${data.contactInfo ?? null}, contact_info),
      address = COALESCE(${data.address ?? null}, address),
      notes = COALESCE(${data.notes ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/suppliers/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE suppliers
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/customers', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, name, notes, deleted_at
    FROM customers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: `CUS-${String(row.id)}`,
    name: String(row.name ?? ''),
    note: String(row.notes ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.post('/customers', async (req, res) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO customers
      (name, phone, email, address, notes, created_at, updated_at)
    VALUES
      (${data.name}, ${data.phone ?? null}, ${data.email ?? null}, ${data.address ?? null}, ${data.notes ?? null}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/customers/:id', async (req, res) => {
  const parsed = customerSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE customers
    SET
      name = COALESCE(${data.name ?? null}, name),
      phone = COALESCE(${data.phone ?? null}, phone),
      email = COALESCE(${data.email ?? null}, email),
      address = COALESCE(${data.address ?? null}, address),
      notes = COALESCE(${data.notes ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/customers/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE customers
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/classifications', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, notes, deleted_at
    FROM catalog_classifications
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    note: String(row.notes ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.post('/classifications', async (req, res) => {
  const parsed = basicCatalogSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO catalog_classifications
      (code, name, notes, created_at, updated_at)
    VALUES
      (${data.code}, ${data.name}, ${data.note ?? null}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/classifications/:id', async (req, res) => {
  const parsed = basicCatalogSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_classifications
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      notes = COALESCE(${data.note ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/classifications/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_classifications
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/units', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, notes, deleted_at
    FROM catalog_units
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    note: String(row.notes ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.post('/units', async (req, res) => {
  const parsed = basicCatalogSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO catalog_units
      (code, name, notes, created_at, updated_at)
    VALUES
      (${data.code}, ${data.name}, ${data.note ?? null}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/units/:id', async (req, res) => {
  const parsed = basicCatalogSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_units
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      notes = COALESCE(${data.note ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/units/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_units
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/locations', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, notes, deleted_at
    FROM catalog_locations
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    note: String(row.notes ?? ''),
    status: toStatusLabel(row.deleted_at),
  }))

  return res.json(normalizeForJson(data))
})

router.post('/locations', async (req, res) => {
  const parsed = basicCatalogSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO catalog_locations
      (code, name, notes, created_at, updated_at)
    VALUES
      (${data.code}, ${data.name}, ${data.note ?? null}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/locations/:id', async (req, res) => {
  const parsed = basicCatalogSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_locations
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      notes = COALESCE(${data.note ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/locations/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE catalog_locations
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

export default router
