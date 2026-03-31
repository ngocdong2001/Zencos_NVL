import { PrismaClient } from '@prisma/client'

// Keep runtime Prisma client unchanged, but relax compile-time typing so
// legacy routes can coexist while schema migration is in progress.
export const prisma = new PrismaClient() as PrismaClient & Record<string, any>
