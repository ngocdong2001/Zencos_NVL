// @ts-nocheck
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
    await prisma.loginAttempt.create({ data: { email, success: false, ipAddress: req.ip, userAgent: req.get('user-agent') } })
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  await prisma.loginAttempt.create({
    data: {
      email,
      success: valid,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  })

  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const permissions = await getUserPermissions(user.id)
  const token = jwt.sign(
    { sub: user.id, email: user.email, permissions },
    process.env.JWT_SECRET ?? 'change-me-in-production',
    { expiresIn: '8h' },
  )

  return res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName }, permissions })
})

router.post('/logout', async (_req, res) => {
  return res.json({ message: 'Logged out. Client should discard token.' })
})

const forgotSchema = z.object({ email: z.string().email() })
router.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || user.deletedAt) {
    return res.json({ message: 'If the email exists, a reset token has been generated.' })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  })

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
    return res.status(400).json({ message: 'Invalid or expired token' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return res.json({ message: 'Password has been reset successfully' })
})

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth?.sub
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, isActive: true, createdAt: true },
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json({ user, permissions: req.auth?.permissions ?? [] })
})

export default router
