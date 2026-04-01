import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ClassificationSeed = {
  code: string
  name: string
  notes: string | null
  deletedAt: string | null
}

type UnitSeed = {
  code: string
  name: string
  memo: string | null
  conversionToBase: number
  isPurchaseUnit: boolean
  isDefaultDisplay: boolean
  parentCode: string | null
}

type SupplierSeed = {
  code: string
  name: string
  phone: string | null
  contactInfo: string | null
  address: string | null
  notes: string | null
  deletedAt: string | null
}

type CustomerSeed = {
  code: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  deletedAt: string | null
}

type LocationSeed = {
  code: string
  name: string
  notes: string | null
  deletedAt: string | null
}

type ProductSeed = {
  code: string
  name: string
  inciName: string | null
  productTypeCode: string
  baseUnitCode: string
  hasExpiry: boolean
  useFefo: boolean
  minStockLevel: number
  notes: string | null
  deletedAt: string | null
}

const classificationSeeds: ClassificationSeed[] = [
  { code: 'RAW_MATERIAL', name: 'Hóa chất pha chế', notes: 'Danh mục mặc định', deletedAt: null },
  { code: 'CLS-TEST', name: 'Phan loai test', notes: 'updated', deletedAt: '2026-03-30T14:35:45.109Z' },
  { code: 'CLA-2', name: 'Lít', notes: 'Dùng cho dạng dung dịch lỏng', deletedAt: '2026-03-31T21:46:46.416Z' },
  { code: 'CLA-001', name: 'NVL loại 2', notes: 'Danh mục mặc định', deletedAt: '2026-03-31T17:29:45.264Z' },
  { code: 'PACK', name: 'Bao bì', notes: 'Bao bì giấy cho hộp kem', deletedAt: null },
]

const unitSeeds: UnitSeed[] = [
  { code: 'KG', name: 'KG', memo: 'thể rắn', conversionToBase: 1000, isPurchaseUnit: true, isDefaultDisplay: true, parentCode: 'GR' },
  { code: 'GR', name: 'gr', memo: 'Dạng bột', conversionToBase: 1, isPurchaseUnit: true, isDefaultDisplay: false, parentCode: null },
  { code: 'L', name: 'Lít', memo: 'Dùng cho dạng dung dịch lỏng', conversionToBase: 1, isPurchaseUnit: false, isDefaultDisplay: false, parentCode: 'ml' },
  { code: 'ml', name: 'Mili lít', memo: 'test test', conversionToBase: 1000, isPurchaseUnit: false, isDefaultDisplay: false, parentCode: null },
]

const supplierSeeds: SupplierSeed[] = [
  { code: 'RAW_MATERIAL', name: 'ChemSource Vietnam', phone: '0900000001', contactInfo: '0900000001', address: 'HCM', notes: 'Demo', deletedAt: null },
  { code: 'SUP-2', name: 'BASF', phone: null, contactInfo: null, address: null, notes: 'Demo', deletedAt: null },
  { code: 'SUP-003', name: 'AAA', phone: null, contactInfo: null, address: null, notes: '', deletedAt: null },
]

const customerSeeds: CustomerSeed[] = [
  { code: 'CUS-001', name: 'Khach Hang A', phone: '091364551', email: 'khachA@example.com', address: 'HCM', notes: 'Demo', deletedAt: null },
  { code: 'CUS-002', name: 'Khách hàng B', phone: '090999999', email: 'khachB@gmail.com', address: 'HCM', notes: 'Demo', deletedAt: null },
  { code: 'CUS-003', name: 'Nguyễn Văn KH', phone: '0978999555', email: '', address: 'Long An', notes: 'Demo', deletedAt: null },
]

const locationSeeds: LocationSeed[] = [
  { code: 'LOC-001', name: 'Kho Long An', notes: 'Kho mặc định', deletedAt: null },
  { code: 'LOC-TEST', name: 'Vi tri test', notes: 'updated', deletedAt: '2026-03-30T14:38:15.175Z' },
  { code: 'LOC-002', name: 'Kho Vĩnh Long', notes: 'Không sử dụng', deletedAt: null },
]

const productSeeds: ProductSeed[] = [
  {
    code: 'RAW_MATERIAL',
    name: 'Glycerin 99.5%',
    inciName: 'Glycerin',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'L',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: null,
  },
  {
    code: 'NVL-002',
    name: 'Vitamin E BASE',
    inciName: 'Vitamin E',
    productTypeCode: 'PACK',
    baseUnitCode: 'GR',
    hasExpiry: false,
    useFefo: false,
    minStockLevel: 0,
    notes: '',
    deletedAt: '2026-03-31T10:58:16.167Z',
  },
  {
    code: 'NVL-003',
    name: 'havchavc',
    inciName: 'hhhh',
    productTypeCode: 'PACK',
    baseUnitCode: 'GR',
    hasExpiry: false,
    useFefo: false,
    minStockLevel: 0,
    notes: '',
    deletedAt: '2026-03-31T10:44:25.442Z',
  },
  {
    code: 'NVL-004',
    name: 'Vitamin D',
    inciName: 'Vitamin D1',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'GR',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: null,
  },
  {
    code: 'NVL-005',
    name: 'bbbbb',
    inciName: 'bbbb',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'GR',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: '2026-03-30T17:32:13.503Z',
  },
  {
    code: 'NVL-001',
    name: 'sdfsdf',
    inciName: 'sdfsf',
    productTypeCode: 'PACK',
    baseUnitCode: 'ml',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: null,
  },
  {
    code: 'NVL-006',
    name: 'aaa aaa',
    inciName: 'aaa',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'GR',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: '2026-03-31T14:40:43.653Z',
  },
  {
    code: 'NVL-007',
    name: 'Acid HCL 95%',
    inciName: 'Acid Clohydric',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'L',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: null,
  },
  {
    code: 'NVL-008',
    name: 'Vitamin E - BASF',
    inciName: 'Vitamin E',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'GR',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: null,
  },
  {
    code: 'NVL-009',
    name: 'VitaC',
    inciName: 'Vitamin C',
    productTypeCode: 'RAW_MATERIAL',
    baseUnitCode: 'GR',
    hasExpiry: true,
    useFefo: true,
    minStockLevel: 0,
    notes: '',
    deletedAt: '2026-03-31T16:17:14.181Z',
  },
]

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null
}

async function main() {
  const classificationByCode = new Map<string, bigint>()
  for (const item of classificationSeeds) {
    const saved = await prisma.productClassification.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
      create: {
        code: item.code,
        name: item.name,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
    })
    classificationByCode.set(item.code, saved.id)
  }

  const unitByCode = new Map<string, bigint>()
  for (const item of unitSeeds) {
    const existing = await prisma.productUnit.findFirst({
      where: { productId: null, unitCodeName: item.code },
      select: { id: true },
    })

    const saved = existing
      ? await prisma.productUnit.update({
          where: { id: existing.id },
          data: {
            unitName: item.name,
            unitMemo: item.memo,
            conversionToBase: item.conversionToBase,
            isPurchaseUnit: item.isPurchaseUnit,
            isDefaultDisplay: item.isDefaultDisplay,
          },
          select: { id: true },
        })
      : await prisma.productUnit.create({
          data: {
            productId: null,
            unitCodeName: item.code,
            unitName: item.name,
            unitMemo: item.memo,
            conversionToBase: item.conversionToBase,
            isPurchaseUnit: item.isPurchaseUnit,
            isDefaultDisplay: item.isDefaultDisplay,
          },
          select: { id: true },
        })

    unitByCode.set(item.code, saved.id)
  }

  for (const item of unitSeeds) {
    const currentId = unitByCode.get(item.code)
    if (!currentId) continue
    const parentId = item.parentCode ? (unitByCode.get(item.parentCode) ?? null) : null

    await prisma.productUnit.update({
      where: { id: currentId },
      data: { parentUnitId: parentId },
    })
  }

  for (const item of supplierSeeds) {
    await prisma.supplier.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        phone: item.phone,
        contactInfo: item.contactInfo,
        address: item.address,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
      create: {
        code: item.code,
        name: item.name,
        phone: item.phone,
        contactInfo: item.contactInfo,
        address: item.address,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
    })
  }

  for (const item of customerSeeds) {
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { code: item.code },
          {
            AND: [
              { name: item.name },
              { phone: item.phone },
              { email: item.email },
            ],
          },
        ],
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          code: item.code,
          address: item.address,
          notes: item.notes,
          deletedAt: toDate(item.deletedAt),
        },
      })
    } else {
      await prisma.customer.create({
        data: {
          code: item.code,
          name: item.name,
          phone: item.phone,
          email: item.email,
          address: item.address,
          notes: item.notes,
          deletedAt: toDate(item.deletedAt),
        },
      })
    }
  }

  for (const item of locationSeeds) {
    await prisma.catalogLocation.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
      create: {
        code: item.code,
        name: item.name,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
    })
  }

  for (const item of productSeeds) {
    const productTypeId = classificationByCode.get(item.productTypeCode)
    const baseUnitId = unitByCode.get(item.baseUnitCode)
    if (!productTypeId || !baseUnitId) {
      throw new Error(`Missing reference for product ${item.code}`)
    }

    await prisma.product.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        inciName: item.inciName,
        productType: productTypeId,
        hasExpiry: item.hasExpiry,
        useFefo: item.useFefo,
        baseUnit: baseUnitId,
        minStockLevel: item.minStockLevel,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
      create: {
        code: item.code,
        name: item.name,
        inciName: item.inciName,
        productType: productTypeId,
        hasExpiry: item.hasExpiry,
        useFefo: item.useFefo,
        baseUnit: baseUnitId,
        minStockLevel: item.minStockLevel,
        notes: item.notes,
        deletedAt: toDate(item.deletedAt),
      },
    })
  }

  console.log('Demo seed applied from current snapshot (classifications, units, suppliers, customers, locations, products).')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
