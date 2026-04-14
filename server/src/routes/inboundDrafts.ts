import { Router } from 'express'
import { Prisma } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma.js'

const router = Router()

const BASE_UPLOAD_DIR = path.resolve('uploads/inbound-drafts')
const TEMP_UPLOAD_DIR = path.join(BASE_UPLOAD_DIR, '_tmp')

fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

const VALID_DOC_TYPES = ['Invoice', 'COA', 'MSDS', 'Other'] as const

type DraftDocType = (typeof VALID_DOC_TYPES)[number]

type DraftDocumentRecord = {
  id: string
  draftCode: string
  docType: DraftDocType
  originalName: string
  mimeType: string
  fileSize: number
  createdAt: string
}

type UploadContext = {
  purchaseRequestRef?: string
  productId?: string
  lotNo?: string
  expectedDate?: string
  supplierName?: string
  quantityBase?: string
  quantityDisplay?: string
  unitUsed?: string
}

function sanitizeDraftCode(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}

function normalizeUploadedFilename(originalName: string): string {
  const raw = String(originalName ?? '').trim()
  if (!raw) return 'unnamed-file'

  const maybeMojibake = /Ã.|Â|â.|ðŸ|Ð|Ñ/.test(raw)
  if (!maybeMojibake) return raw

  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8').trim()
    return decoded || raw
  } catch {
    return raw
  }
}

function getDraftPaths(draftCode: string) {
  const safeDraftCode = sanitizeDraftCode(draftCode)
  const draftDir = path.join(BASE_UPLOAD_DIR, safeDraftCode)
  return { safeDraftCode, draftDir }
}

function getReceiptUploadDir(receiptId: bigint): string {
  return path.join(BASE_UPLOAD_DIR, receiptId.toString())
}

function toResponse(doc: DraftDocumentRecord) {
  return {
    id: doc.id,
    draftCode: doc.draftCode,
    docType: doc.docType,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt,
  }
}

function getRequestedDraftCode(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') return null
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  return trimmed
}

function isValidDocType(value: string): value is DraftDocType {
  return (VALID_DOC_TYPES as readonly string[]).includes(value)
}

function parseDecimal(input: unknown, fallback: string): Prisma.Decimal {
  const raw = String(input ?? '').trim()
  if (!raw) return new Prisma.Decimal(fallback)
  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '.')
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return new Prisma.Decimal(fallback)
  try {
    return new Prisma.Decimal(normalized)
  } catch {
    return new Prisma.Decimal(fallback)
  }
}

function parseDateOnly(value?: string): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function getSystemUserId(db: Prisma.TransactionClient): Promise<bigint> {
  const users = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM users WHERE is_active = 1 ORDER BY id ASC LIMIT 1
  `)
  if (!users[0]) throw new Error('Không tìm thấy user hệ thống để upload chứng từ.')
  return users[0].id
}

async function findPurchaseRequestIdByRef(db: Prisma.TransactionClient, purchaseRequestRef?: string): Promise<bigint | null> {
  const ref = String(purchaseRequestRef ?? '').trim()
  if (!ref) return null
  const rows = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM purchase_requests WHERE request_ref = ${ref} LIMIT 1
  `)
  return rows[0]?.id ?? null
}

async function ensureInboundReceiptAndItem(
  db: Prisma.TransactionClient,
  draftCode: string,
  context: UploadContext,
): Promise<{ receiptId: bigint; itemId: bigint }> {
  const rows = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id FROM inbound_receipts WHERE receipt_ref = ${draftCode} LIMIT 1
  `)

  const purchaseRequestId = await findPurchaseRequestIdByRef(db, context.purchaseRequestRef)
  const expectedDate = parseDateOnly(context.expectedDate)
  const systemUserId = await getSystemUserId(db)

  const receiptId = rows[0]?.id ?? (await (async () => {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO inbound_receipts
        (receipt_ref, purchase_request_id, supplier_id, receiving_location_id, status, expected_date, created_by, posted_by, notes, created_at, updated_at)
      VALUES
        (${draftCode}, ${purchaseRequestId}, ${null}, ${null}, ${'draft'}, ${expectedDate}, ${systemUserId}, ${null}, ${'Auto-created from wizard Step 3 upload'}, NOW(3), NOW(3))
    `)
    const inserted = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT LAST_INSERT_ID() AS id`)
    if (!inserted[0]?.id) throw new Error('Không thể tạo phiếu nhập kho nháp.')
    return inserted[0].id
  })())

  const productIdRaw = String(context.productId ?? '').trim()
  const lotNo = String(context.lotNo ?? '').trim() || `${draftCode}-LOT`
  const quantityBase = parseDecimal(context.quantityBase, '0')
  const quantityDisplay = parseDecimal(context.quantityDisplay, quantityBase.toString())
  const unitUsed = String(context.unitUsed ?? 'g').trim() || 'g'

  const productId = /^\d+$/.test(productIdRaw) ? BigInt(productIdRaw) : null

  const existingItem = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id
    FROM inbound_receipt_items
    WHERE inbound_receipt_id = ${receiptId}
      AND lot_no = ${lotNo}
      AND (${productId} IS NULL OR product_id = ${productId})
    LIMIT 1
  `)
  if (existingItem[0]?.id) {
    return { receiptId, itemId: existingItem[0].id }
  }

  if (!productId) {
    const firstItem = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id FROM inbound_receipt_items WHERE inbound_receipt_id = ${receiptId} ORDER BY id ASC LIMIT 1
    `)
    if (firstItem[0]?.id) {
      return { receiptId, itemId: firstItem[0].id }
    }
    throw new Error('Không xác định được sản phẩm cho chứng từ. Vui lòng chọn mã nguyên vật liệu ở bước 2.')
  }

  const prItemRows = purchaseRequestId
    ? await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id FROM purchase_request_items
      WHERE purchase_request_id = ${purchaseRequestId}
        AND product_id = ${productId}
      ORDER BY id ASC
      LIMIT 1
    `)
    : []

  const purchaseRequestItemId = prItemRows[0]?.id ?? null

  await db.$executeRaw(Prisma.sql`
    INSERT INTO inbound_receipt_items
      (inbound_receipt_id, purchase_request_item_id, product_id, lot_no, quantity_base, unit_used, quantity_display, unit_price_per_kg, line_amount, qc_status, has_document, notes, created_at, updated_at)
    VALUES
      (${receiptId}, ${purchaseRequestItemId}, ${productId}, ${lotNo}, ${quantityBase}, ${unitUsed}, ${quantityDisplay}, 0, 0, ${'pending'}, 0, ${'Auto-created from wizard Step 3 upload'}, NOW(3), NOW(3))
  `)
  const insertedItem = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT LAST_INSERT_ID() AS id`)
  if (!insertedItem[0]?.id) throw new Error('Không thể tạo dòng nhập kho nháp.')

  return { receiptId, itemId: insertedItem[0].id }
}

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, JPG và PNG.'))
    }
  },
})

router.get('/:draftCode/documents', async (req, res) => {
  const draftCode = getRequestedDraftCode(req.params.draftCode)
  if (!draftCode) {
    return res.status(400).json({ message: 'Mã phiếu nháp không hợp lệ.' })
  }

  const docs = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT d.id, d.doc_type, d.original_name, d.mime_type, d.file_size, d.created_at
    FROM inbound_receipts r
    JOIN inbound_receipt_items i ON i.inbound_receipt_id = r.id
    JOIN inbound_receipt_item_documents d ON d.item_id = i.id
    WHERE r.receipt_ref = ${draftCode}
    ORDER BY d.created_at ASC
  `)

  return res.json(docs.map((doc) => toResponse({
    id: String(doc.id),
    draftCode,
    docType: String(doc.doc_type) as DraftDocType,
    originalName: String(doc.original_name),
    mimeType: String(doc.mime_type),
    fileSize: Number(doc.file_size),
    createdAt: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
  })))
})

router.post('/:draftCode/documents', uploadDoc.single('file'), async (req, res) => {
  const draftCode = getRequestedDraftCode(req.params.draftCode)
  if (!draftCode) {
    if (req.file) fs.unlink(req.file.path, () => undefined)
    return res.status(400).json({ message: 'Mã phiếu nháp không hợp lệ.' })
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được gửi lên.' })
  }

  const docType = String(req.body.docType ?? 'Other')
  if (!isValidDocType(docType)) {
    fs.unlink(req.file.path, () => undefined)
    return res.status(400).json({ message: 'Loại chứng từ không hợp lệ.' })
  }

  let finalPath: string | null = null

  try {
    const contextRaw = String(req.body.context ?? '{}')
    const context = JSON.parse(contextRaw) as UploadContext
    const originalName = normalizeUploadedFilename(req.file.originalname)

    const created = await prisma.$transaction(async (db) => {
      const { receiptId, itemId } = await ensureInboundReceiptAndItem(db, draftCode, context)
      const uploaderId = await getSystemUserId(db)

      const draftDir = getReceiptUploadDir(receiptId)
      fs.mkdirSync(draftDir, { recursive: true })
      const documentId = randomUUID()
      const storedName = `${documentId}${path.extname(req.file!.originalname).toLowerCase()}`
      finalPath = path.join(draftDir, storedName)
      fs.renameSync(req.file!.path, finalPath)

      const relativePath = path.relative(process.cwd(), finalPath).replace(/\\/g, '/')

      await db.$executeRaw(Prisma.sql`
        INSERT INTO inbound_receipt_item_documents
          (item_id, doc_type, file_path, original_name, mime_type, file_size, uploaded_by, created_at, updated_at)
        VALUES
          (${itemId}, ${docType}, ${relativePath}, ${originalName}, ${req.file!.mimetype}, ${req.file!.size}, ${uploaderId}, NOW(3), NOW(3))
      `)

      await db.$executeRaw(Prisma.sql`
        UPDATE inbound_receipt_items
        SET has_document = 1, updated_at = NOW(3)
        WHERE id = ${itemId}
      `)

      const inserted = await db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT id, doc_type, original_name, mime_type, file_size, created_at
        FROM inbound_receipt_item_documents
        WHERE id = LAST_INSERT_ID()
      `)
      return inserted[0]
    })

    const payload: DraftDocumentRecord = {
      id: String(created.id),
      draftCode,
      docType: String(created.doc_type) as DraftDocType,
      originalName: String(created.original_name),
      mimeType: String(created.mime_type),
      fileSize: Number(created.file_size),
      createdAt: created.created_at instanceof Date ? created.created_at.toISOString() : String(created.created_at),
    }
    return res.status(201).json(toResponse(payload))
  } catch (error) {
    if (finalPath) {
      fs.unlink(finalPath, () => undefined)
    } else {
      fs.unlink(req.file.path, () => undefined)
    }
    const message = error instanceof Error ? error.message : 'Không thể lưu tài liệu vào phiếu nhập kho.'
    return res.status(400).json({ message })
  }
})

router.put('/:draftCode/documents/:docId', async (req, res) => {
  const draftCode = getRequestedDraftCode(req.params.draftCode)
  if (!draftCode) {
    return res.status(400).json({ message: 'Mã phiếu nháp không hợp lệ.' })
  }

  const docId = String(req.params.docId ?? '').trim()
  if (!docId) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }
  if (!/^\d+$/.test(docId)) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }

  const docType = String(req.body?.docType ?? '').trim()
  if (!isValidDocType(docType)) {
    return res.status(400).json({ message: 'Loại chứng từ không hợp lệ.' })
  }

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT d.id
    FROM inbound_receipts r
    JOIN inbound_receipt_items i ON i.inbound_receipt_id = r.id
    JOIN inbound_receipt_item_documents d ON d.item_id = i.id
    WHERE r.receipt_ref = ${draftCode} AND d.id = ${BigInt(docId)}
    LIMIT 1
  `)
  if (!rows[0]) {
    return res.status(404).json({ message: 'Không tìm thấy tài liệu.' })
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE inbound_receipt_item_documents
    SET doc_type = ${docType}, updated_at = NOW(3)
    WHERE id = ${BigInt(docId)}
  `)

  const updated = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT id, doc_type, original_name, mime_type, file_size, created_at
    FROM inbound_receipt_item_documents
    WHERE id = ${BigInt(docId)}
    LIMIT 1
  `)
  const doc = updated[0]
  return res.json(toResponse({
    id: String(doc.id),
    draftCode,
    docType: String(doc.doc_type) as DraftDocType,
    originalName: String(doc.original_name),
    mimeType: String(doc.mime_type),
    fileSize: Number(doc.file_size),
    createdAt: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
  }))
})

router.delete('/:draftCode/documents/:docId', async (req, res) => {
  const draftCode = getRequestedDraftCode(req.params.draftCode)
  if (!draftCode) {
    return res.status(400).json({ message: 'Mã phiếu nháp không hợp lệ.' })
  }

  const docId = String(req.params.docId ?? '').trim()
  if (!docId) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }

  if (!/^\d+$/.test(docId)) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }

  const docs = await prisma.$queryRaw<Array<{ id: bigint; item_id: bigint; file_path: string }>>(Prisma.sql`
    SELECT d.id, d.item_id, d.file_path
    FROM inbound_receipts r
    JOIN inbound_receipt_items i ON i.inbound_receipt_id = r.id
    JOIN inbound_receipt_item_documents d ON d.item_id = i.id
    WHERE r.receipt_ref = ${draftCode} AND d.id = ${BigInt(docId)}
    LIMIT 1
  `)
  if (!docs[0]) {
    return res.status(404).json({ message: 'Không tìm thấy tài liệu.' })
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM inbound_receipt_item_documents WHERE id = ${BigInt(docId)}
  `)
  fs.unlink(path.resolve(docs[0].file_path), () => undefined)

  const remaining = await prisma.$queryRaw<Array<{ cnt: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS cnt
    FROM inbound_receipt_item_documents
    WHERE item_id = ${docs[0].item_id}
  `)
  const hasDocument = Number(remaining[0]?.cnt ?? 0) > 0 ? 1 : 0
  await prisma.$executeRaw(Prisma.sql`
    UPDATE inbound_receipt_items
    SET has_document = ${hasDocument}, updated_at = NOW(3)
    WHERE id = ${docs[0].item_id}
  `)

  return res.status(204).send()
})

router.get('/:draftCode/documents/:docId/file', async (req, res) => {
  const draftCode = getRequestedDraftCode(req.params.draftCode)
  if (!draftCode) {
    return res.status(400).json({ message: 'Mã phiếu nháp không hợp lệ.' })
  }

  const docId = String(req.params.docId ?? '').trim()
  if (!docId) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }

  if (!/^\d+$/.test(docId)) {
    return res.status(400).json({ message: 'Mã tài liệu không hợp lệ.' })
  }

  const docs = await prisma.$queryRaw<Array<{ file_path: string; original_name: string; mime_type: string }>>(Prisma.sql`
    SELECT d.file_path, d.original_name, d.mime_type
    FROM inbound_receipts r
    JOIN inbound_receipt_items i ON i.inbound_receipt_id = r.id
    JOIN inbound_receipt_item_documents d ON d.item_id = i.id
    WHERE r.receipt_ref = ${draftCode} AND d.id = ${BigInt(docId)}
    LIMIT 1
  `)
  if (!docs[0]) {
    return res.status(404).json({ message: 'Không tìm thấy tài liệu.' })
  }

  const absPath = path.resolve(docs[0].file_path)
  const forceDownload = req.query.download === 'true'

  if (forceDownload) {
    return res.download(absPath, docs[0].original_name)
  }

  return res.sendFile(absPath, {
    headers: {
      'Content-Type': docs[0].mime_type,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(docs[0].original_name)}`,
    },
  })
})

export default router