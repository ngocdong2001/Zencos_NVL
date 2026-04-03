import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const router = Router()

type JsonLike = null | boolean | number | string | JsonLike[] | { [k: string]: JsonLike }
type OpeningStockRowRecord = Record<string, unknown>

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

function formatDateOnly(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const str = String(value)
  // nếu có dạng "2026-01-01T..." thì lấy phần date
  return str.length >= 10 ? str.slice(0, 10) : str
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === 'string' && value.trim()) {
    try {
      return BigInt(value)
    } catch {
      return null
    }
  }
  return null
}

function mapOpeningStockRow(row: OpeningStockRowRecord) {
  const unitPriceValue = Number(row.unit_price_value ?? row.unit_price_per_kg ?? 0)
  const conversionToBase = Number(row.unit_price_conversion_to_base ?? 1000)
  const quantityBase = Number(row.quantity_base ?? 0)
  const fallbackLineAmount = conversionToBase > 0 ? (quantityBase / conversionToBase) * unitPriceValue : 0

  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    tradeName: String(row.trade_name ?? ''),
    inciName: String(row.inci_name ?? ''),
    lot: String(row.lot_no ?? ''),
    openingDate: formatDateOnly(row.opening_date),
    invoiceNo: String(row.invoice_no ?? ''),
    invoiceDate: formatDateOnly(row.invoice_date),
    supplierId: row.supplier_id == null ? null : String(row.supplier_id),
    supplierCode: String(row.supplier_code ?? ''),
    supplierName: String(row.supplier_name ?? ''),
    quantityGram: quantityBase,
    unitPricePerKg: Number(row.unit_price_per_kg ?? unitPriceValue),
    unitPriceValue,
    unitPriceUnitId: row.unit_price_unit_id == null ? null : String(row.unit_price_unit_id),
    unitPriceUnitCode: String(row.unit_price_unit_code ?? 'kg'),
    unitPriceConversionToBase: conversionToBase,
    lineAmount: Number(row.line_amount ?? fallbackLineAmount),
    expiryDate: formatDateOnly(row.expiry_date),
    hasCertificate: Boolean(row.has_document),
  }
}

async function ensureSupplierExists(supplierId: bigint | null): Promise<{ id: bigint; code: string; name: string } | null> {
  if (supplierId === null) return null

  const suppliers = await prisma.$queryRaw<Array<{ id: bigint; code: string; name: string }>>(Prisma.sql`
    SELECT id, code, name
    FROM suppliers
    WHERE id = ${supplierId} AND deleted_at IS NULL
    LIMIT 1
  `)

  return suppliers[0] ?? null
}

async function hasOpeningStockAmountFields(): Promise<boolean> {
  const requiredColumns = [
    'unit_price_value',
    'unit_price_unit_id',
    'unit_price_conversion_to_base',
    'line_amount',
  ]

  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS cnt
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'opening_stock_items'
      AND column_name IN (${Prisma.join(requiredColumns)})
  `)

  return Number(rows[0]?.cnt ?? 0) === requiredColumns.length
}

/**
 * Lấy hoặc tạo mới một declaration đang ở trạng thái draft.
 * Route này không dùng auth, nên createdBy = first active user.
 */
async function getOrCreateDraftDeclaration(): Promise<bigint> {
  // Tìm draft declaration gần nhất
  const existing = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id
    FROM opening_stock_declarations
    WHERE status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1
  `)

  if (existing[0]) return existing[0].id

  // Lấy user đầu tiên (system fallback — không có auth context)
  const systemUser = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM users WHERE is_active = 1 ORDER BY id ASC LIMIT 1
  `)

  if (!systemUser[0]) {
    throw new Error('NO_USER_FOUND')
  }

  const userId = systemUser[0].id
  const ref = `OPEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO opening_stock_declarations
      (declaration_ref, status, source, created_by, created_at, updated_at)
    VALUES
      (${ref}, 'draft', 'manual', ${userId}, NOW(3), NOW(3))
  `)

  const created = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM opening_stock_declarations WHERE declaration_ref = ${ref} LIMIT 1
  `)

  return created[0].id
}

const addRowSchema = z.object({
  code: z.string().min(1),
  lot: z.string().optional().default(''),
  openingDate: z.string({ required_error: 'Ngày tồn đầu không được để trống.' }).min(1, 'Ngày tồn đầu không được để trống.'),
  invoiceNo: z.string().optional().default(''),
  invoiceDate: z.string().optional().nullable(),
  supplierId: z.union([z.coerce.bigint().positive(), z.literal(''), z.null()]).optional(),
  quantityBase: z.coerce.number().nonnegative().optional(),
  quantityGram: z.coerce.number().nonnegative().optional(),
  unitPriceValue: z.coerce.number().nonnegative().optional(),
  unitPriceUnitId: z.coerce.bigint().positive().optional(),
  unitPricePerKg: z.coerce.number().nonnegative().optional(),
  expiryDate: z.string().optional().nullable(),
})

const updateRowSchema = z.object({
  lot: z.string().optional(),
  openingDate: z.string().optional().nullable(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional().nullable(),
  supplierId: z.union([z.coerce.bigint().positive(), z.literal(''), z.null()]).optional(),
  quantityBase: z.coerce.number().nonnegative().optional(),
  unitPriceValue: z.coerce.number().nonnegative().optional(),
  expiryDate: z.string().optional().nullable(),
})

router.get('/products/:code/price-units', async (req, res) => {
  const code = String(req.params.code ?? '').trim().toUpperCase()
  if (!code) {
    return res.status(400).json({ message: 'Thiếu mã nguyên liệu.' })
  }

  const products = await prisma.$queryRaw<Array<{ id: bigint; base_unit: bigint | null; order_unit: bigint | null }>>(Prisma.sql`
    SELECT id, base_unit, order_unit
    FROM products
    WHERE code = ${code} AND deleted_at IS NULL
    LIMIT 1
  `)

  if (!products[0]) {
    return res.status(404).json({ message: `Không tìm thấy nguyên liệu với mã "${code}"` })
  }

  const productId = products[0].id
  const baseUnitId = products[0].base_unit
  const orderUnitId = products[0].order_unit

  const units = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      id,
      unit_code_name,
      unit_name,
      conversion_to_base,
      is_purchase_unit,
      is_default_display
    FROM product_units
    WHERE product_id = ${productId}
       OR id = ${baseUnitId}
       OR id = ${orderUnitId}
    ORDER BY
      CASE WHEN id = ${orderUnitId} THEN 0 WHEN id = ${baseUnitId} THEN 1 ELSE 2 END,
      is_purchase_unit DESC,
      is_default_display DESC,
      conversion_to_base DESC,
      id ASC
  `)

  const orderUnitIdStr = orderUnitId == null ? '' : String(orderUnitId)
  const data = units.map((unit) => ({
    id: String(unit.id),
    code: String(unit.unit_code_name ?? unit.unit_name ?? ''),
    name: String(unit.unit_name ?? unit.unit_code_name ?? ''),
    conversionToBase: Number(unit.conversion_to_base ?? 1),
    isPurchaseUnit: String(unit.id) === orderUnitIdStr || Boolean(unit.is_purchase_unit),
  }))

  return res.json(normalizeForJson(data))
})

// ──────────────────────────────────────────────────────────────────────
// GET /rows — danh sách flat từ tất cả draft declarations
// ──────────────────────────────────────────────────────────────────────
router.get('/rows', async (_req, res) => {
  const hasAmountFields = await hasOpeningStockAmountFields()

  const rows = hasAmountFields
    ? await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_value,
          osi.unit_price_unit_id,
          pu_price.unit_code_name AS unit_price_unit_code,
          osi.unit_price_conversion_to_base,
          osi.line_amount,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        LEFT JOIN product_units pu_price ON pu_price.id = osi.unit_price_unit_id
        JOIN opening_stock_declarations osd ON osd.id = osi.declaration_id
        WHERE osd.status = 'draft'
        ORDER BY osi.created_at DESC
      `)
    : await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        JOIN opening_stock_declarations osd ON osd.id = osi.declaration_id
        WHERE osd.status = 'draft'
        ORDER BY osi.created_at DESC
      `)

  const data = rows.map((row) => mapOpeningStockRow(row))

  return res.json(normalizeForJson(data))
})

// ──────────────────────────────────────────────────────────────────────
// POST /rows — thêm một item mới (tự tạo/tìm draft declaration)
// ──────────────────────────────────────────────────────────────────────
router.post('/rows', async (req, res) => {
  const parsed = addRowSchema.safeParse(req.body)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const firstFieldError = Object.values(flat.fieldErrors).flat()[0]
    const firstFormError = flat.formErrors[0]
    const message = firstFieldError ?? firstFormError ?? 'Dữ liệu không hợp lệ.'
    return res.status(400).json({ message, errors: flat })
  }

  const data = parsed.data
  const code = data.code.trim().toUpperCase()

  // Tìm product theo code
  const products = await prisma.$queryRaw<Array<{
    id: bigint
    code: string
    name: string
    inci_name: string | null
    unit_code_name: string | null
  }>>(Prisma.sql`
    SELECT
      p.id,
      p.code,
      p.name,
      p.inci_name,
      pu.unit_code_name
    FROM products p
    LEFT JOIN product_units pu ON pu.id = p.base_unit
    WHERE p.code = ${code} AND p.deleted_at IS NULL
    LIMIT 1
  `)

  if (!products[0]) {
    return res.status(404).json({ message: `Không tìm thấy nguyên liệu với mã "${code}"`, code })
  }

  const product = products[0]
  const productId = product.id
  const unitUsed = product.unit_code_name ?? 'g'
  const lotNo = data.lot.trim()
  const declarationId = await getOrCreateDraftDeclaration()
  const quantityBase = data.quantityBase ?? data.quantityGram ?? 0

  const productUnitLinks = await prisma.$queryRaw<Array<{ base_unit: bigint | null; order_unit: bigint | null }>>(Prisma.sql`
    SELECT base_unit, order_unit
    FROM products
    WHERE id = ${productId}
    LIMIT 1
  `)

  const baseUnitId = productUnitLinks[0]?.base_unit ?? null
  const orderUnitId = productUnitLinks[0]?.order_unit ?? null

  let unitPriceValue = data.unitPriceValue ?? data.unitPricePerKg ?? 0
  let unitPriceUnitId = toBigInt(data.unitPriceUnitId)

  if (unitPriceUnitId === null) {
    const fallbackPriceUnits = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, conversion_to_base, unit_code_name, unit_name
      FROM product_units
      WHERE product_id = ${productId}
         OR id = ${baseUnitId}
         OR id = ${orderUnitId}
      ORDER BY
        CASE WHEN id = ${orderUnitId} THEN 0 WHEN id = ${baseUnitId} THEN 1 WHEN LOWER(COALESCE(unit_code_name, unit_name)) = 'kg' THEN 2 ELSE 3 END,
        is_purchase_unit DESC,
        is_default_display DESC,
        conversion_to_base DESC,
        id ASC
      LIMIT 1
    `)

    if (!fallbackPriceUnits[0]) {
      return res.status(400).json({ message: 'Nguyên liệu chưa có đơn vị tính để áp giá.' })
    }

    unitPriceUnitId = toBigInt(fallbackPriceUnits[0].id)
  }

  const priceUnits = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, unit_code_name, unit_name, conversion_to_base
    FROM product_units
    WHERE id = ${unitPriceUnitId}
      AND (
        product_id = ${productId}
        OR id = ${baseUnitId}
        OR id = ${orderUnitId}
      )
    LIMIT 1
  `)

  if (!priceUnits[0]) {
    return res.status(400).json({ message: 'Đơn vị đơn giá không hợp lệ cho mã NVL đã chọn.' })
  }

  const priceUnit = priceUnits[0]
  const unitPriceConversionToBase = Number(priceUnit.conversion_to_base ?? 0)
  if (!Number.isFinite(unitPriceConversionToBase) || unitPriceConversionToBase <= 0) {
    return res.status(400).json({ message: 'Hệ số quy đổi đơn vị đơn giá không hợp lệ.' })
  }

  if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
    unitPriceValue = 0
  }

  const lineAmount = (quantityBase / unitPriceConversionToBase) * unitPriceValue
  const invoiceNo = data.invoiceNo?.trim() || null
  const invoiceDate = data.invoiceDate?.trim() || null
  const supplierId = typeof data.supplierId === 'bigint' ? data.supplierId : null
  const supplier = await ensureSupplierExists(supplierId)

  if (supplierId !== null && !supplier) {
    return res.status(400).json({ message: 'Nhà cung cấp không hợp lệ.' })
  }

  // Kiểm tra trùng lặp (declarationId + productId + lotNo)
  const duplicate = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM opening_stock_items
    WHERE declaration_id = ${declarationId}
      AND product_id = ${productId}
      AND lot_no = ${lotNo}
    LIMIT 1
  `)

  if (duplicate[0]) {
    return res.status(409).json({
      message: `Mã NVL "${code}" + Lô "${lotNo}" đã tồn tại trong phiếu khai báo.`,
      code,
      lot: lotNo,
    })
  }

  const openingDate = data.openingDate?.trim() || null
  const expiryDate = data.expiryDate?.trim() || null
  const quantityDisplay = quantityBase
  const hasAmountFields = await hasOpeningStockAmountFields()

  if (hasAmountFields) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO opening_stock_items
        (declaration_id, product_id, lot_no, opening_date, expiry_date,
         invoice_no, invoice_date, supplier_id,
         quantity_base, unit_used, quantity_display, unit_price_per_kg,
         unit_price_value, unit_price_unit_id, unit_price_conversion_to_base, line_amount,
         has_document,
         created_at, updated_at)
      VALUES
        (${declarationId}, ${productId}, ${lotNo},
         ${openingDate ? new Date(openingDate) : null},
         ${expiryDate ? new Date(expiryDate) : null},
         ${invoiceNo}, ${invoiceDate ? new Date(invoiceDate) : null}, ${supplierId},
         ${quantityBase}, ${unitUsed}, ${quantityDisplay},
         ${unitPriceValue},
         ${unitPriceValue}, ${unitPriceUnitId}, ${unitPriceConversionToBase}, ${lineAmount},
         0,
         NOW(3), NOW(3))
    `)
  } else {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO opening_stock_items
        (declaration_id, product_id, lot_no, opening_date, expiry_date,
         invoice_no, invoice_date, supplier_id,
         quantity_base, unit_used, quantity_display, unit_price_per_kg, has_document,
         created_at, updated_at)
      VALUES
        (${declarationId}, ${productId}, ${lotNo},
         ${openingDate ? new Date(openingDate) : null},
         ${expiryDate ? new Date(expiryDate) : null},
         ${invoiceNo}, ${invoiceDate ? new Date(invoiceDate) : null}, ${supplierId},
         ${quantityBase}, ${unitUsed}, ${quantityDisplay}, ${unitPriceValue}, 0,
         NOW(3), NOW(3))
    `)
  }

  const created = hasAmountFields
    ? await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_value,
          osi.unit_price_unit_id,
          pu_price.unit_code_name AS unit_price_unit_code,
          osi.unit_price_conversion_to_base,
          osi.line_amount,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        LEFT JOIN product_units pu_price ON pu_price.id = osi.unit_price_unit_id
        WHERE osi.id = LAST_INSERT_ID()
      `)
    : await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        WHERE osi.id = LAST_INSERT_ID()
      `)

  const row = created[0]
  if (!row) return res.status(500).json({ message: 'Không thể đọc lại bản ghi vừa tạo.' })

  return res.status(201).json(normalizeForJson(mapOpeningStockRow(row)))
})

// ──────────────────────────────────────────────────────────────────────
// PUT /rows/:id — cập nhật item trong draft declaration
// ──────────────────────────────────────────────────────────────────────
router.put('/rows/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  const parsed = updateRowSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const data = parsed.data

  const currentRows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      osi.id,
      osi.declaration_id,
      osi.product_id,
      osi.quantity_base,
      osi.unit_price_value,
      osi.unit_price_per_kg,
      osi.unit_price_conversion_to_base,
      osi.lot_no,
      osi.opening_date,
      osi.invoice_no,
      osi.invoice_date,
      osi.supplier_id,
      osi.expiry_date
    FROM opening_stock_items osi
    JOIN opening_stock_declarations osd ON osd.id = osi.declaration_id
    WHERE osi.id = ${id} AND osd.status = 'draft'
    LIMIT 1
  `)

  const current = currentRows[0]
  if (!current) {
    return res.status(404).json({ message: 'Không tìm thấy item hoặc phiếu đã được xác nhận.' })
  }

  const hasAmountFields = await hasOpeningStockAmountFields()
  const quantityBase = data.quantityBase ?? Number(current.quantity_base ?? 0)
  const unitPriceValue = data.unitPriceValue ?? Number(current.unit_price_value ?? current.unit_price_per_kg ?? 0)
  const conversionToBase = Number(current.unit_price_conversion_to_base ?? 1000)
  const lineAmount = conversionToBase > 0 ? (quantityBase / conversionToBase) * unitPriceValue : 0
  const lotNo = (data.lot ?? String(current.lot_no ?? '')).trim()
  const openingDate = data.openingDate === undefined ? current.opening_date : (data.openingDate?.trim() || null)
  const invoiceNo = data.invoiceNo === undefined ? String(current.invoice_no ?? '') : data.invoiceNo.trim()
  const invoiceDate = data.invoiceDate === undefined ? current.invoice_date : (data.invoiceDate?.trim() || null)
  const supplierId = data.supplierId === undefined
    ? toBigInt(current.supplier_id)
    : (typeof data.supplierId === 'bigint' ? data.supplierId : null)
  const expiryDate = data.expiryDate === undefined ? current.expiry_date : (data.expiryDate?.trim() || null)

  const supplier = await ensureSupplierExists(supplierId)
  if (supplierId !== null && !supplier) {
    return res.status(400).json({ message: 'Nhà cung cấp không hợp lệ.' })
  }

  if (!Number.isFinite(quantityBase) || quantityBase < 0 || !Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
    return res.status(400).json({ message: 'SL (GRAM) và Đơn giá phải là số hợp lệ >= 0.' })
  }

  if (hasAmountFields) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE opening_stock_items
      SET
        lot_no = ${lotNo},
        opening_date = ${openingDate ? new Date(String(openingDate)) : null},
        invoice_no = ${invoiceNo || null},
        invoice_date = ${invoiceDate ? new Date(String(invoiceDate)) : null},
        supplier_id = ${supplierId},
        expiry_date = ${expiryDate ? new Date(String(expiryDate)) : null},
        quantity_base = ${quantityBase},
        quantity_display = ${quantityBase},
        unit_price_per_kg = ${unitPriceValue},
        unit_price_value = ${unitPriceValue},
        line_amount = ${lineAmount},
        updated_at = NOW(3)
      WHERE id = ${id}
    `)
  } else {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE opening_stock_items
      SET
        lot_no = ${lotNo},
        opening_date = ${openingDate ? new Date(String(openingDate)) : null},
        invoice_no = ${invoiceNo || null},
        invoice_date = ${invoiceDate ? new Date(String(invoiceDate)) : null},
        supplier_id = ${supplierId},
        expiry_date = ${expiryDate ? new Date(String(expiryDate)) : null},
        quantity_base = ${quantityBase},
        quantity_display = ${quantityBase},
        unit_price_per_kg = ${unitPriceValue},
        updated_at = NOW(3)
      WHERE id = ${id}
    `)
  }

  const updated = hasAmountFields
    ? await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_value,
          osi.unit_price_unit_id,
          pu_price.unit_code_name AS unit_price_unit_code,
          osi.unit_price_conversion_to_base,
          osi.line_amount,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        LEFT JOIN product_units pu_price ON pu_price.id = osi.unit_price_unit_id
        WHERE osi.id = ${id}
        LIMIT 1
      `)
    : await prisma.$queryRaw<Array<OpeningStockRowRecord>>(Prisma.sql`
        SELECT
          osi.id,
          p.code,
          p.name        AS trade_name,
          p.inci_name,
          osi.lot_no,
          osi.opening_date,
          osi.invoice_no,
          osi.invoice_date,
          osi.supplier_id,
          s.code AS supplier_code,
          s.name AS supplier_name,
          osi.quantity_base,
          osi.unit_price_per_kg,
          osi.expiry_date,
          osi.has_document
        FROM opening_stock_items osi
        JOIN products p ON p.id = osi.product_id
        LEFT JOIN suppliers s ON s.id = osi.supplier_id
        WHERE osi.id = ${id}
        LIMIT 1
      `)

  const row = updated[0]
  if (!row) return res.status(500).json({ message: 'Không thể đọc lại bản ghi vừa cập nhật.' })

  return res.json(normalizeForJson(mapOpeningStockRow(row)))
})

// ──────────────────────────────────────────────────────────────────────
// DELETE /rows/:id — xóa item khỏi draft declaration
// ──────────────────────────────────────────────────────────────────────
router.delete('/rows/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }

  // Chỉ cho phép xóa item trong declaration đang draft
  const item = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT osi.id
    FROM opening_stock_items osi
    JOIN opening_stock_declarations osd ON osd.id = osi.declaration_id
    WHERE osi.id = ${id} AND osd.status = 'draft'
    LIMIT 1
  `)

  if (!item[0]) {
    return res.status(404).json({ message: 'Không tìm thấy item hoặc phiếu đã được xác nhận.' })
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM opening_stock_items WHERE id = ${id}
  `)

  return res.status(204).send()
})

export default router
