import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getUserPermissions, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.deletedAt || !user.isActive) {
    return res.status(401).json({ message: 'Thông tin đăng nhập không đúng' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Thông tin đăng nhập không đúng' })
  }

  const permissions = getUserPermissions(user.role)
  const token = jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role, permissions },
    process.env.JWT_SECRET ?? 'change-me-in-production',
    { expiresIn: '8h' },
  )

  return res.json({
    token,
    user: { id: String(user.id), email: user.email, fullName: user.fullName, role: user.role },
    permissions,
  })
})

router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out. Client should discard token.' })
})

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth?.sub
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json({
    user: { ...user, id: String(user.id) },
    permissions: req.auth?.permissions ?? [],
  })
})

const forgotSchema = z.object({ email: z.string().email() })

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  // Always return the same message to avoid email enumeration
  if (!user || user.deletedAt) {
    return res.json({ message: 'Nếu email tồn tại, reset token đã được tạo.' })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30 min

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  // In production: send email with token. For now, return token in response.
  return res.json({ message: 'Reset token generated', token, expiresAt })
})

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(64),
})

router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return res.json({ message: 'Mật khẩu đã được đặt lại thành công' })
})

export default router
