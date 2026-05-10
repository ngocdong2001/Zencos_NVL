import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const hash = bcrypt.hashSync('Admin@123', 10)

const user = await prisma.user.upsert({
  where: { email: 'admin@zencos.vn' },
  update: {},
  create: {
    email: 'admin@zencos.vn',
    passwordHash: hash,
    fullName: 'Administrator',
    role: 'admin',
    isActive: true
  }
})

console.log('Admin user ready:', user.email, '| role:', user.role)
await prisma.$disconnect()
