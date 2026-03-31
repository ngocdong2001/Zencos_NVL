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
  productType: z.union([z.string().min(1), z.coerce.number().int().positive()]).default('raw_material'),
  baseUnit: z.union([z.string().min(1), z.coerce.number().int().positive()]),
  minStockLevel: z.coerce.number().nonnegative().default(0),
  hasExpiry: z.boolean().default(true),
  useFefo: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

const productUnitCatalogSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  note: z.string().optional().nullable(),
  parentUnitId: z.coerce.number().int().positive().optional().nullable(),
  conversionToBase: z.coerce.number().positive().optional().default(1),
  isPurchaseUnit: z.boolean().optional().default(false),
  isDefaultDisplay: z.boolean().optional().default(false),
})

async function resolveBaseUnitId(baseUnit: string | number): Promise<number> {
  const byId =
    typeof baseUnit === 'number'
      ? await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          SELECT id
          FROM product_units
          WHERE id = ${baseUnit}
          LIMIT 1
        `)
      : []

  if (byId[0]) return Number(byId[0].id)

  if (typeof baseUnit !== 'string') {
    throw new Error('INVALID_BASE_UNIT')
  }

  const normalized = baseUnit.trim()
  if (!normalized) throw new Error('INVALID_BASE_UNIT')

  const byCodeOrName = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id
    FROM product_units
    WHERE unit_code_name = ${normalized} OR unit_name = ${normalized}
    ORDER BY is_default_display DESC, id ASC
    LIMIT 1
  `)

  if (byCodeOrName[0]) return Number(byCodeOrName[0].id)

  throw new Error('INVALID_BASE_UNIT')
}

async function resolveProductTypeId(productType: string | number): Promise<number> {
  const classification =
    typeof productType === 'number'
      ? await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          SELECT id
          FROM product_classifications
          WHERE id = ${productType} AND deleted_at IS NULL
          LIMIT 1
        `)
      : await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          SELECT id
          FROM product_classifications
          WHERE code = ${productType} AND deleted_at IS NULL
          LIMIT 1
        `)

  if (!classification[0]) {
    throw new Error('INVALID_PRODUCT_TYPE')
  }

  return Number(classification[0].id)
}

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
    SELECT
      p.id,
      p.code,
      p.name,
      p.inci_name,
      p.product_type,
      pc.code AS product_type_code,
      p.base_unit,
      pu.unit_code_name,
      pu.unit_name,
      p.deleted_at
    FROM products p
    LEFT JOIN product_classifications pc ON pc.id = p.product_type
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.deleted_at IS NULL
      AND (${q} = '' OR p.code LIKE ${`%${q}%`} OR p.name LIKE ${`%${q}%`} OR p.inci_name LIKE ${`%${q}%`})
    ORDER BY p.created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    inciName: String(row.inci_name ?? ''),
    materialName: String(row.name ?? ''),
    category: String(row.product_type_code ?? row.product_type ?? ''),
    unit: String(row.unit_code_name ?? row.unit_name ?? row.base_unit ?? ''),
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
  let productTypeId: number
  let baseUnitId: number

  try {
    productTypeId = await resolveProductTypeId(data.productType)
    baseUnitId = await resolveBaseUnitId(data.baseUnit)
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PRODUCT_TYPE') {
      return res.status(400).json({ message: 'Invalid productType' })
    }
    if (error instanceof Error && error.message === 'INVALID_BASE_UNIT') {
      return res.status(400).json({ message: 'Invalid baseUnit' })
    }
    throw error
  }

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO products
        (code, name, inci_name, product_type, has_expiry, use_fefo, base_unit, min_stock_level, notes, created_at, updated_at)
      VALUES
        (${codeToInsert}, ${data.name}, ${data.inciName}, ${productTypeId}, ${data.hasExpiry}, ${data.useFefo}, ${baseUnitId}, ${data.minStockLevel}, ${data.notes ?? null}, NOW(3), NOW(3))
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
    SELECT
      p.id,
      p.code,
      p.name,
      p.inci_name,
      p.product_type,
      pc.code AS product_type_code,
      p.base_unit,
      pu.unit_code_name,
      pu.unit_name,
      p.deleted_at
    FROM products p
    LEFT JOIN product_classifications pc ON pc.id = p.product_type
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.id = LAST_INSERT_ID()
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
  let productTypeId: number | null = null
  let baseUnitId: number | null = null
  if (data.productType !== undefined) {
    try {
      productTypeId = await resolveProductTypeId(data.productType)
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_PRODUCT_TYPE') {
        return res.status(400).json({ message: 'Invalid productType' })
      }
      throw error
    }
  }

  if (data.baseUnit !== undefined) {
    try {
      baseUnitId = await resolveBaseUnitId(data.baseUnit)
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_BASE_UNIT') {
        return res.status(400).json({ message: 'Invalid baseUnit' })
      }
      throw error
    }
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE products
    SET
      code = COALESCE(${data.code ?? null}, code),
      name = COALESCE(${data.name ?? null}, name),
      inci_name = COALESCE(${data.inciName ?? null}, inci_name),
      product_type = COALESCE(${productTypeId}, product_type),
      has_expiry = COALESCE(${data.hasExpiry ?? null}, has_expiry),
      use_fefo = COALESCE(${data.useFefo ?? null}, use_fefo),
      base_unit = COALESCE(${baseUnitId}, base_unit),
      min_stock_level = COALESCE(${data.minStockLevel ?? null}, min_stock_level),
      notes = COALESCE(${data.notes ?? null}, notes),
      updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  const updated = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      p.id,
      p.code,
      p.name,
      p.inci_name,
      p.product_type,
      pc.code AS product_type_code,
      p.base_unit,
      pu.unit_code_name,
      pu.unit_name,
      p.deleted_at
    FROM products p
    LEFT JOIN product_classifications pc ON pc.id = p.product_type
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.id = ${id}
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
    SELECT id, code, name, contact_info, address, notes, deleted_at
    FROM suppliers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    contactInfo: String(row.contact_info ?? ''),
    address: String(row.address ?? ''),
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
    SELECT id, name, phone, email, address, notes, deleted_at
    FROM customers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: `CUS-${String(row.id)}`,
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    address: String(row.address ?? ''),
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
    FROM product_classifications
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
    INSERT INTO product_classifications
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
    UPDATE product_classifications
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
    UPDATE product_classifications
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

router.get('/units', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, parent_unit_id, unit_code_name, unit_name, unit_memo, conversion_to_base, is_purchase_unit, is_default_display
    FROM product_units
    WHERE product_id IS NULL
    ORDER BY created_at DESC
  `)

  const data = rows.map((row) => ({
    id: String(row.id),
    code: String(row.unit_code_name ?? row.unit_name ?? ''),
    name: String(row.unit_name ?? ''),
    note: String(row.unit_memo ?? ''),
    parentUnitId: row.parent_unit_id == null ? '' : String(row.parent_unit_id),
    conversionToBase: Number(row.conversion_to_base ?? 1),
    isPurchaseUnit: Boolean(row.is_purchase_unit),
    isDefaultDisplay: Boolean(row.is_default_display),
    status: 'Active',
  }))

  return res.json(normalizeForJson(data))
})

router.post('/units', async (req, res) => {
  const parsed = productUnitCatalogSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO product_units
      (product_id, parent_unit_id, unit_code_name, unit_name, unit_memo, conversion_to_base, is_purchase_unit, is_default_display, created_at, updated_at)
    VALUES
      (NULL, ${data.parentUnitId ?? null}, ${data.code}, ${data.name}, ${data.note ?? null}, ${data.conversionToBase}, ${data.isPurchaseUnit}, ${data.isDefaultDisplay}, NOW(3), NOW(3))
  `)

  return res.status(201).json({ ok: true })
})

router.put('/units/:id', async (req, res) => {
  const parsed = productUnitCatalogSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const data = parsed.data
  const hasParentUnitId = Object.prototype.hasOwnProperty.call(data, 'parentUnitId')
  await prisma.$executeRaw(Prisma.sql`
    UPDATE product_units
    SET
      parent_unit_id = CASE
        WHEN ${hasParentUnitId} THEN ${data.parentUnitId ?? null}
        ELSE parent_unit_id
      END,
      unit_code_name = COALESCE(${data.code ?? null}, unit_code_name),
      unit_name = COALESCE(${data.name ?? null}, unit_name),
      unit_memo = COALESCE(${data.note ?? null}, unit_memo),
      conversion_to_base = COALESCE(${data.conversionToBase ?? null}, conversion_to_base),
      is_purchase_unit = COALESCE(${data.isPurchaseUnit ?? null}, is_purchase_unit),
      is_default_display = COALESCE(${data.isDefaultDisplay ?? null}, is_default_display),
      updated_at = NOW(3)
    WHERE id = ${id} AND product_id IS NULL
  `)

  return res.json({ ok: true })
})

router.delete('/units/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM product_units
    WHERE id = ${id} AND product_id IS NULL
  `)

  return res.status(204).send()
})

router.get('/locations', async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, code, name, notes, deleted_at
    FROM inventory_locations
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
    INSERT INTO inventory_locations
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
    UPDATE inventory_locations
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
    UPDATE inventory_locations
    SET deleted_at = NOW(3), updated_at = NOW(3)
    WHERE id = ${id} AND deleted_at IS NULL
  `)

  return res.status(204).send()
})

export default router
