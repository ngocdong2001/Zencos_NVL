import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// ──────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/customers', requirePermission('customers.read'), async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim()
  const where: Prisma.CustomerWhereInput = { deletedAt: null }
  if (q) {
    where.OR = [
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
  const created = await prisma.customer.create({ data: parsed.data })
  res.status(201).json(created)
})

router.put('/customers/:id', requirePermission('customers.write'), async (req: Request, res: Response) => {
  const parsed = customerSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  const updated = await prisma.customer.update({ where: { id: BigInt(req.params.id) }, data: parsed.data })
  res.json(updated)
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
  const created = await prisma.supplier.create({ data: parsed.data })
  res.status(201).json(created)
})

router.put('/suppliers/:id', requirePermission('suppliers.write'), async (req: Request, res: Response) => {
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() }); return }
  const updated = await prisma.supplier.update({ where: { id: BigInt(req.params.id) }, data: parsed.data })
  res.json(updated)
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
