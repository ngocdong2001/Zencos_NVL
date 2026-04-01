import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

function isDuplicateCustomerCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && Array.isArray(error.meta?.target)
    && error.meta.target.includes('code')
}

function isDuplicateSupplierCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && Array.isArray(error.meta?.target)
    && error.meta.target.includes('code')
}

// ──────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────────────────────────────
const customerSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

async function getNextCustomerCode(): Promise<string> {
  const customers = await prisma.customer.findMany({
    select: { code: true },
    where: { code: { startsWith: 'CUS-' } },
  })

  const used = new Set<number>()
  for (const customer of customers) {
    const match = customer.code.match(/^CUS-(\d+)$/i)
    if (!match) continue
    const nextValue = Number.parseInt(match[1], 10)
    if (Number.isFinite(nextValue) && nextValue > 0) {
      used.add(nextValue)
    }
  }

  let next = 1
  while (used.has(next)) next += 1
  return `CUS-${String(next).padStart(3, '0')}`
}

router.get('/customers', requirePermission('customers.read'), async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim()
  const where: Prisma.CustomerWhereInput = { deletedAt: null }
  if (q) {
    where.OR = [
      { code: { contains: q } },
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ]
  }
  const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } })
  res.json(customers)
})

router.post('/customers', requirePermission('customers.write'), async (req: Request, res: Response) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  try {
    const created = await prisma.customer.create({
      data: {
        ...parsed.data,
        code: parsed.data.code?.trim() || await getNextCustomerCode(),
      },
    })
    res.status(201).json(created)
  } catch (error) {
    if (isDuplicateCustomerCodeError(error)) {
      res.status(409).json({ message: 'Mã khách hàng đã tồn tại', code: parsed.data.code?.trim() })
      return
    }
    throw error
  }
})

router.put('/customers/:id', requirePermission('customers.write'), async (req: Request, res: Response) => {
  const parsed = customerSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  try {
    const updated = await prisma.customer.update({ where: { id: BigInt(req.params.id) }, data: parsed.data })
    res.json(updated)
  } catch (error) {
    if (isDuplicateCustomerCodeError(error)) {
      res.status(409).json({ message: 'Mã khách hàng đã tồn tại', code: parsed.data.code?.trim() })
      return
    }
    throw error
  }
})

router.delete('/customers/:id', requirePermission('customers.write'), async (req: Request, res: Response) => {
  const updated = await prisma.customer.update({
    where: { id: BigInt(req.params.id) },
    data: { deletedAt: new Date() },
  })
  res.json({ id: updated.id.toString(), deletedAt: updated.deletedAt })
})

// ──────────────────────────────────────────────────────────────────────
// SUPPLIERS
// ──────────────────────────────────────────────────────────────────────
const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  contactInfo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/suppliers', requirePermission('suppliers.read'), async (_req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
  res.json(suppliers)
})

router.post('/suppliers', requirePermission('suppliers.write'), async (req: Request, res: Response) => {
  const parsed = supplierSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  try {
    const created = await prisma.supplier.create({ data: parsed.data })
    res.status(201).json(created)
  } catch (error) {
    if (isDuplicateSupplierCodeError(error)) {
      res.status(409).json({ message: 'Mã nhà cung cấp đã tồn tại', code: parsed.data.code?.trim() })
      return
    }
    throw error
  }
})

router.put('/suppliers/:id', requirePermission('suppliers.write'), async (req: Request, res: Response) => {
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  try {
    const updated = await prisma.supplier.update({ where: { id: BigInt(req.params.id) }, data: parsed.data })
    res.json(updated)
  } catch (error) {
    if (isDuplicateSupplierCodeError(error)) {
      res.status(409).json({ message: 'Mã nhà cung cấp đã tồn tại', code: parsed.data.code?.trim() })
      return
    }
    throw error
  }
})

router.delete('/suppliers/:id', requirePermission('suppliers.write'), async (req: Request, res: Response) => {
  const updated = await prisma.supplier.update({
    where: { id: BigInt(req.params.id) },
    data: { deletedAt: new Date() },
  })
  res.json({ id: updated.id.toString(), deletedAt: updated.deletedAt })
})

// ──────────────────────────────────────────────────────────────────────
// NOT IMPLEMENTED — models not in warehouse schema
// ──────────────────────────────────────────────────────────────────────
const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'This data domain is not modelled in the current warehouse schema.' })
}

router.get('/tax-rates', requirePermission('settings.read'), notImplemented)
router.post('/tax-rates', requirePermission('settings.write'), notImplemented)
router.put('/tax-rates/:id', requirePermission('settings.write'), notImplemented)
router.delete('/tax-rates/:id', requirePermission('settings.write'), notImplemented)

router.get('/currencies', requirePermission('settings.read'), notImplemented)
router.post('/currencies', requirePermission('settings.write'), notImplemented)
router.put('/currencies/:id', requirePermission('settings.write'), notImplemented)
router.delete('/currencies/:id', requirePermission('settings.write'), notImplemented)

router.get('/categories', requirePermission('settings.read'), notImplemented)
router.post('/categories', requirePermission('settings.write'), notImplemented)
router.put('/categories/:id', requirePermission('settings.write'), notImplemented)
router.delete('/categories/:id', requirePermission('settings.write'), notImplemented)

router.get('/brands', requirePermission('settings.read'), notImplemented)
router.post('/brands', requirePermission('settings.write'), notImplemented)
router.put('/brands/:id', requirePermission('settings.write'), notImplemented)
router.delete('/brands/:id', requirePermission('settings.write'), notImplemented)

router.get('/warehouses', requirePermission('settings.read'), notImplemented)
router.post('/warehouses', requirePermission('settings.write'), notImplemented)
router.put('/warehouses/:id', requirePermission('settings.write'), notImplemented)
router.delete('/warehouses/:id', requirePermission('settings.write'), notImplemented)

router.get('/units', requirePermission('settings.read'), notImplemented)
router.post('/units', requirePermission('settings.write'), notImplemented)
router.put('/units/:id', requirePermission('settings.write'), notImplemented)
router.delete('/units/:id', requirePermission('settings.write'), notImplemented)

export default router
