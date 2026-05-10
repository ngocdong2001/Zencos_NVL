import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type AuthToken = {
  sub: string
  email: string
  role: string
  permissions: string[]
}

export type AuthenticatedRequest = Request & {
  auth?: AuthToken
}

// Role → permissions map. 'admin' gets wildcard '*' checked separately.
// Granular actions per module: :view (list), :detail (single record), :write (create/edit), :delete
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],

  ceo: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'inbound:view', 'inbound:detail', 'inbound:write', 'inbound:delete',
    'outbound:view', 'outbound:detail', 'outbound:write', 'outbound:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'purchase:view', 'purchase:detail', 'purchase:write', 'purchase:delete',
    'opening-stock:view', 'opening-stock:write', 'opening-stock:delete',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
    'users:view',
  ],

  warehouse_manager: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'inbound:view', 'inbound:detail', 'inbound:write', 'inbound:delete',
    'outbound:view', 'outbound:detail', 'outbound:write', 'outbound:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'purchase:view', 'purchase:detail', 'purchase:write', 'purchase:delete',
    'opening-stock:view', 'opening-stock:write', 'opening-stock:delete',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
    'users:view',
  ],

  warehouse_staff: [
    'catalog:view',
    'inbound:view', 'inbound:detail', 'inbound:write',
    'outbound:view', 'outbound:detail', 'outbound:write',
    'production:view', 'production:detail', 'production:write',
    'purchase:view',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],

  kho: [
    'catalog:view',
    'inbound:view', 'inbound:detail', 'inbound:write',
    'outbound:view', 'outbound:detail', 'outbound:write',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],

  purchasing: [
    'catalog:view',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'warehouse:view',
    'reports:view',
  ],

  mua_hang: [
    'catalog:view',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'inbound:view', 'inbound:detail',
    'warehouse:view',
    'reports:view',
  ],

  production_planning: [
    'catalog:view',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],

  production_staff: [
    'catalog:view',
    'production:view', 'production:detail', 'production:write',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'warehouse:view', 'warehouse:detail',
  ],

  rd_staff: [
    'catalog:view', 'catalog:write',
    'production:view', 'production:detail',
  ],

  rd_manager: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'reports:view',
  ],

  qa: [
    'catalog:view',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'production:view', 'production:detail',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],

  qc: [
    'catalog:view',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'production:view', 'production:detail', 'production:write',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],

  sale: [
    'catalog:view',
    'outbound:view', 'outbound:detail',
    'purchase:view', 'purchase:detail',
    'reports:view',
  ],

  accounting: [
    'catalog:view',
    'purchase:view', 'purchase:detail',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'opening-stock:view',
    'reports:view',
  ],

  viewer: [
    'catalog:view',
    'inbound:view',
    'outbound:view',
    'production:view',
    'purchase:view',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
}

export function getUserPermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? 'change-me-in-production',
    ) as AuthToken
    req.auth = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const perms = req.auth.permissions
    if (perms.includes('*') || perms.includes(permission)) {
      return next()
    }

    return res.status(403).json({ message: 'Forbidden' })
  }
}

