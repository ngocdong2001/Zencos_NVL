import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// All users routes require auth
router.use(requireAuth)

const VALID_ROLES = [
  'admin', 'ceo',
  'warehouse_manager', 'kho', 'warehouse_staff',
  'production_planning', 'production_staff',
  'rd_manager', 'rd_staff',
  'mua_hang', 'purchasing',
  'qa', 'qc', 'sale', 'accounting',
  'viewer',
] as const

const createUserSchema = z.object({
  email: z.string().email().max(191),
  password: z.string().min(8).max(64),
  fullName: z.string().min(1).max(191),
  role: z.enum(VALID_ROLES),
  isActive: z.boolean().optional().default(true),
})

const updateUserSchema = z.object({
  email: z.string().email().max(191).optional(),
  fullName: z.string().min(1).max(191).optional(),
  role: z.enum(VALID_ROLES).optional(),
  isActive: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  newPassword: z.string().min(8).max(64),
})

const selfChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(64),
})

// GET /api/users — list all users (admin or users:view)
router.get('/', requirePermission('users:view'), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return res.json(users.map((u) => ({ ...u, id: String(u.id) })))
})

// POST /api/users — create user (admin only)
router.post('/', requirePermission('users:write'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const { email, password, fullName, role, isActive } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ message: 'Email đã tồn tại' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, role, isActive },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  })

  return res.status(201).json({ ...user, id: String(user.id) })
})

// PUT /api/users/:id — update user (admin only)
router.put('/:id', requirePermission('users:write'), async (req: AuthenticatedRequest, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const userId = BigInt(req.params.id)

  // Prevent admin from deactivating themselves
  if (parsed.data.isActive === false && String(userId) === req.auth?.sub) {
    return res.status(400).json({ message: 'Không thể tự vô hiệu hoá tài khoản của mình' })
  }

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng' })
  }

  // Check email uniqueness if changing email
  if (parsed.data.email && parsed.data.email !== user.email) {
    const conflict = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (conflict) {
      return res.status(409).json({ message: 'Email đã tồn tại' })
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, email: true, fullName: true, role: true, isActive: true, updatedAt: true },
  })

  return res.json({ ...updated, id: String(updated.id) })
})

// POST /api/users/:id/reset-password — admin resets another user's password
router.post('/:id/reset-password', requirePermission('users:write'), async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const userId = BigInt(req.params.id)
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  return res.json({ message: 'Đặt lại mật khẩu thành công' })
})

// DELETE /api/users/:id — soft delete (admin only)
router.delete('/:id', requirePermission('users:delete'), async (req: AuthenticatedRequest, res) => {
  const userId = BigInt(req.params.id)

  if (String(userId) === req.auth?.sub) {
    return res.status(400).json({ message: 'Không thể xoá tài khoản của mình' })
  }

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng' })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  })

  return res.status(204).send()
})

// GET /api/users/profile — own profile
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  const userId = req.auth?.sub
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId), deletedAt: null },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ message: 'Not found' })

  return res.json({ ...user, id: String(user.id) })
})

// POST /api/users/change-password — change own password
router.post('/change-password', async (req: AuthenticatedRequest, res) => {
  const parsed = selfChangePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const userId = req.auth?.sub
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  const user = await prisma.user.findFirst({ where: { id: BigInt(userId), deletedAt: null } })
  if (!user) return res.status(404).json({ message: 'Not found' })

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({ where: { id: BigInt(userId) }, data: { passwordHash } })

  return res.json({ message: 'Đổi mật khẩu thành công' })
})

export default router
