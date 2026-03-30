import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const permissionCodes = [
    'customers.read',
    'customers.write',
    'suppliers.read',
    'suppliers.write',
    'products.read',
    'products.write',
    'inventory.read',
    'inventory.write',
    'sales.read',
    'sales.write',
    'purchases.read',
    'purchases.write',
    'reports.read',
    'pos.read',
    'pos.write',
    'transfers.read',
    'transfers.write',
    'quotes.read',
    'quotes.write',
    'promotions.read',
    'promotions.write',
    'settings.read',
    'settings.write',
  ]

  for (const code of permissionCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: { name: code },
      create: { code, name: code },
    })
  }

  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: { name: 'Administrator' },
    create: { code: 'admin', name: 'Administrator' },
  })

  const perms = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
  for (const perm of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    })
  }

  const passwordHash = await bcrypt.hash('Admin@12345', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aibiz.local' },
    update: { fullName: 'System Admin', isActive: true, passwordHash },
    create: {
      email: 'admin@aibiz.local',
      fullName: 'System Admin',
      passwordHash,
      isActive: true,
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  })

  console.log('Seed completed: admin@aibiz.local / Admin@12345')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
