import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

const customerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
})

router.get('/customers', requirePermission('customers.read'), async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim()
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { code: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { addresses: { where: { deletedAt: null } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(customers)
})

router.post('/customers', requirePermission('customers.write'), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const created = await prisma.customer.create({ data: parsed.data })
  return res.status(201).json(created)
})

router.put('/customers/:id', requirePermission('customers.write'), async (req, res) => {
  const parsed = customerSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: parsed.data,
  })
  return res.json(updated)
})

router.delete('/customers/:id', requirePermission('customers.write'), async (req, res) => {
  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  })
  return res.json({ id: updated.id, deletedAt: updated.deletedAt })
})

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
})

router.get('/suppliers', requirePermission('suppliers.read'), async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
  return res.json(suppliers)
})

router.post('/suppliers', requirePermission('suppliers.write'), async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const created = await prisma.supplier.create({ data: parsed.data })
  return res.status(201).json(created)
})

router.put('/suppliers/:id', requirePermission('suppliers.write'), async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const updated = await prisma.supplier.update({ where: { id: req.params.id }, data: parsed.data })
  return res.json(updated)
})

router.delete('/suppliers/:id', requirePermission('suppliers.write'), async (req, res) => {
  const updated = await prisma.supplier.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  return res.json({ id: updated.id, deletedAt: updated.deletedAt })
})

function registerSimpleCatalogRoutes(path: string, readPermission: string, writePermission: string) {
  const schema = z.object({ code: z.string().min(1), name: z.string().min(1) })

  router.get(`/${path}`, requirePermission(readPermission), async (_req, res) => {
    const model = getCatalogModel(path)
    const rows = await model.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
    return res.json(rows)
  })

  router.post(`/${path}`, requirePermission(writePermission), async (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
    }
    const model = getCatalogModel(path)
    const row = await model.create({ data: parsed.data })
    return res.status(201).json(row)
  })

  router.put(`/${path}/:id`, requirePermission(writePermission), async (req, res) => {
    const parsed = schema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
    }
    const model = getCatalogModel(path)
    const row = await model.update({ where: { id: req.params.id }, data: parsed.data })
    return res.json(row)
  })

  router.delete(`/${path}/:id`, requirePermission(writePermission), async (req, res) => {
    const model = getCatalogModel(path)
    const row = await model.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
    return res.json({ id: row.id, deletedAt: row.deletedAt })
  })
}

router.get('/tax-rates', requirePermission('settings.read'), async (_req, res) => {
  const rows = await prisma.taxRate.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
  return res.json(rows)
})

router.post('/tax-rates', requirePermission('settings.write'), async (req, res) => {
  const parsed = z
    .object({ code: z.string().min(1), name: z.string().min(1), rate: z.number().nonnegative() })
    .safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const row = await prisma.taxRate.create({ data: parsed.data })
  return res.status(201).json(row)
})

router.put('/tax-rates/:id', requirePermission('settings.write'), async (req, res) => {
  const parsed = z.object({ code: z.string().min(1).optional(), name: z.string().min(1).optional(), rate: z.number().nonnegative().optional() }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const row = await prisma.taxRate.update({ where: { id: req.params.id }, data: parsed.data })
  return res.json(row)
})

router.delete('/tax-rates/:id', requirePermission('settings.write'), async (req, res) => {
  const row = await prisma.taxRate.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  return res.json({ id: row.id, deletedAt: row.deletedAt })
})

router.get('/currencies', requirePermission('settings.read'), async (_req, res) => {
  const rows = await prisma.currency.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
  return res.json(rows)
})

router.post('/currencies', requirePermission('settings.write'), async (req, res) => {
  const parsed = z.object({ code: z.string().min(1), name: z.string().min(1), symbol: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const row = await prisma.currency.create({ data: parsed.data })
  return res.status(201).json(row)
})

router.put('/currencies/:id', requirePermission('settings.write'), async (req, res) => {
  const parsed = z.object({ code: z.string().min(1).optional(), name: z.string().min(1).optional(), symbol: z.string().min(1).optional() }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const row = await prisma.currency.update({ where: { id: req.params.id }, data: parsed.data })
  return res.json(row)
})

router.delete('/currencies/:id', requirePermission('settings.write'), async (req, res) => {
  const row = await prisma.currency.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  return res.json({ id: row.id, deletedAt: row.deletedAt })
})

registerSimpleCatalogRoutes('categories', 'settings.read', 'settings.write')
registerSimpleCatalogRoutes('brands', 'settings.read', 'settings.write')
registerSimpleCatalogRoutes('units', 'settings.read', 'settings.write')
registerSimpleCatalogRoutes('warehouses', 'settings.read', 'settings.write')

function getCatalogModel(path: string): any {
  switch (path) {
    case 'categories':
      return prisma.category
    case 'brands':
      return prisma.brand
    case 'units':
      return prisma.unit
    case 'warehouses':
      return prisma.warehouse
    default:
      throw new Error(`Unsupported catalog path: ${path}`)
  }
}

export default router
