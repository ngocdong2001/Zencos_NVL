import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

type AuthToken = {
  sub: string
  email: string
  permissions: string[]
}

export type AuthenticatedRequest = Request & {
  auth?: AuthToken
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'change-me-in-production') as AuthToken
    req.auth = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!req.auth.permissions.includes(permission)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  }
}

export async function getUserPermissions(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const permissions = new Set<string>()
  for (const role of userRoles) {
    for (const rolePerm of role.role.permissions) {
      permissions.add(rolePerm.permission.code)
    }
  }

  return [...permissions]
}
