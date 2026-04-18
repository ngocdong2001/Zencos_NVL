import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateBounds() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const today = new Date(todayStr + 'T00:00:00.000Z')

  const in7Days = new Date(today)
  in7Days.setUTCDate(in7Days.getUTCDate() + 7)

  const in30Days = new Date(today)
  in30Days.setUTCDate(in30Days.getUTCDate() + 30)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

  return { today, in7Days, in30Days, sevenDaysAgo }
}

function formatTxTime(d: Date): string {
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${hours}:${minutes} ${day}/${month}`
}

function fmtQty(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function formatDateDMY(d: Date): string {
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

// ── GET /api/dashboard ────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  const { today, in7Days, in30Days, sevenDaysAgo } = getDateBounds()

  const [
    stockValueRows,
    expiringBatchCount,
    pendingInboundCount,
    pendingOutboundCount,
    pendingPurchaseCount,
    criticalBatches,
    lowStockProducts,
    fefoData,
    weeklyFlowRaw,
    recentInbound,
    recentOutbound,
    recentPurchaseRequests,
  ] = await Promise.all([

    // KPI 1: total stock value — correct formula: (current_qty_base / priceUnitConversionToBase) * unit_price_per_kg
    // priceUnitConversionToBase comes from product.orderUnitRef.conversionToBase (e.g. 1000 for kg when base=gram)
    prisma.$queryRaw<Array<{ total: string | null }>>(Prisma.sql`
      SELECT CAST(
        SUM(b.current_qty_base / COALESCE(pu.conversion_to_base, 1) * b.unit_price_per_kg)
      AS CHAR) AS total
      FROM batches b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN product_units pu ON pu.id = p.order_unit
      WHERE b.status = 'available' AND b.deleted_at IS NULL
    `),

    // KPI 2: lots expiring within 30 days
    prisma.batch.count({
      where: { status: 'available', deletedAt: null, expiryDate: { gte: today, lte: in30Days } },
    }),

    // KPI 3: pending inbound receipts
    prisma.inboundReceipt.count({
      where: { status: { in: ['draft', 'pending_qc'] } },
    }),

    // KPI 4: pending export orders
    prisma.exportOrder.count({
      where: { status: 'pending' },
    }),

    // KPI 5: pending purchase requests (draft, submitted, approved, ordered)
    prisma.purchaseRequest.count({
      where: { status: { in: ['draft', 'submitted', 'approved', 'ordered', 'partially_received'] } },
    }),

    // Alerts: lots expiring in 30 days (critical = ≤7 days, warning = 8–30 days)
    prisma.batch.findMany({
      where: { status: 'available', deletedAt: null, expiryDate: { gte: today, lte: in30Days } },
      include: { product: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 5,
    }),

    // Alerts: products below min stock level
    prisma.$queryRaw<Array<{ name: string; qty: string; minStock: string; unitName: string }>>(Prisma.sql`
      SELECT p.name,
        CAST(COALESCE(SUM(CASE WHEN b.status = 'available' AND b.deleted_at IS NULL THEN b.current_qty_base ELSE 0 END), 0) AS CHAR) AS qty,
        CAST(p.min_stock_level AS CHAR) AS minStock,
        COALESCE(pu.unit_code_name, pu.unit_name, 'kg') AS unitName
      FROM products p
      LEFT JOIN batches b ON b.product_id = p.id
      LEFT JOIN product_units pu ON pu.id = p.base_unit
      WHERE p.deleted_at IS NULL AND p.min_stock_level > 0
      GROUP BY p.id, p.name, p.min_stock_level, pu.unit_code_name, pu.unit_name
      HAVING CAST(qty AS DECIMAL(15,4)) < CAST(minStock AS DECIMAL(15,4))
      ORDER BY (CAST(qty AS DECIMAL(15,4)) / p.min_stock_level) ASC
      LIMIT 3
    `),

    // FEFO: batch categories
    prisma.$queryRaw<Array<{ category: string; cnt: bigint }>>(Prisma.sql`
      SELECT
        CASE
          WHEN expiry_date IS NULL OR expiry_date > ${in30Days} THEN 'safe'
          WHEN expiry_date >= ${today} THEN 'near_expiry'
          ELSE 'expired'
        END AS category,
        COUNT(*) AS cnt
      FROM batches
      WHERE status = 'available' AND deleted_at IS NULL AND current_qty_base > 0
      GROUP BY category
    `),

    // Weekly flow by unit: nhap/xuat quantity grouped by base unit for last 7 days
    prisma.$queryRaw<Array<{ unit: string; txType: string; total: string }>>(Prisma.sql`
      SELECT
        COALESCE(pu.unit_code_name, pu.unit_name, 'kg') AS unit,
        it.type AS txType,
        CAST(SUM(it.quantity_base / COALESCE(pu.conversion_to_base, 1)) AS CHAR) AS total
      FROM inventory_transactions it
      LEFT JOIN batches b ON b.id = it.batch_id
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN product_units pu ON pu.id = p.base_unit
      WHERE it.transaction_date >= ${sevenDaysAgo}
        AND it.type IN ('import', 'export')
      GROUP BY COALESCE(pu.unit_code_name, pu.unit_name, 'kg'), it.type
      ORDER BY unit ASC
    `),

    // Recent inbound receipts
    prisma.inboundReceipt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        items: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
      },
    }),

    // Recent export orders
    prisma.exportOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        items: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
      },
    }),

    // Recent purchase requests
    prisma.purchaseRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        items: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
      },
    }),
  ])

  // ── Build KPI ────────────────────────────────────────────────────────────
  const kpi = {
    totalStockValue: Number(stockValueRows[0]?.total ?? 0),
    expiringBatchCount,
    pendingInboundCount,
    pendingOutboundCount,
    pendingPurchaseCount,
  }

  // ── Build alerts ─────────────────────────────────────────────────────────
  const alerts: Array<{ id: number; message: string; actionLabel: string; severity: 'critical' | 'warning' | 'info' }> = []
  let alertId = 1

  // Deduplicate expiring batches by lotNo + productId
  const seenLots = new Set<string>()
  const dedupedBatches = criticalBatches.filter((batch) => {
    if (!batch.expiryDate) return false
    const key = `${batch.lotNo}__${batch.productId}`
    if (seenLots.has(key)) return false
    seenLots.add(key)
    return true
  })

  // Structured expiry alerts for UI
  const expiryAlerts = dedupedBatches.map((batch, idx) => {
    const daysLeft = Math.ceil((batch.expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: idx + 1,
      lotNo: batch.lotNo,
      productName: batch.product.name,
      expiryDateDisplay: formatDateDMY(batch.expiryDate!),
      daysLeft,
    }
  })

  // Structured low stock alerts for UI
  const lowStockAlerts = lowStockProducts.map((p, idx) => {
    const qty = Number(p.qty)
    const minStock = Number(p.minStock)
    const deficitPct = minStock > 0 ? Math.round((qty - minStock) / minStock * 100) : 0
    return {
      id: idx + 1,
      productName: p.name,
      currentQty: qty,
      minStock,
      unitName: p.unitName,
      deficitPct,
    }
  })

  // Flat alerts (backward compat)
  for (const batch of dedupedBatches) {
    const daysLeft = Math.ceil((batch.expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const severity: 'critical' | 'warning' = daysLeft <= 7 ? 'critical' : 'warning'
    alerts.push({
      id: alertId++,
      message: `Lô hàng ${batch.lotNo} (${batch.product.name}) sẽ hết hạn sau ${daysLeft} ngày.`,
      actionLabel: 'Xử lý ngay',
      severity,
    })
  }

  for (const p of lowStockProducts) {
    const qty = Number(p.qty)
    alerts.push({
      id: alertId++,
      message: `Tồn kho ${p.name} đang dưới mức an toàn (${fmtQty(qty)} ${p.unitName}).`,
      actionLabel: 'Tạo phiếu nhập',
      severity: 'warning',
    })
  }

  if (pendingInboundCount > 0 && alerts.length < 3) {
    alerts.push({
      id: alertId++,
      message: `Có ${pendingInboundCount} phiếu nhập kho đang chờ xử lý.`,
      actionLabel: 'Xem phiếu nhập',
      severity: 'warning',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 1,
      message: 'Không có cảnh báo nào cần xử lý hôm nay.',
      actionLabel: 'Xem tổng quan',
      severity: 'info',
    })
  }

  // ── Build FEFO ───────────────────────────────────────────────────────────
  const fefoMap: Record<string, number> = {}
  let fefoTotal = 0
  for (const row of fefoData) {
    fefoMap[row.category] = Number(row.cnt)
    fefoTotal += Number(row.cnt)
  }
  const fefo = fefoTotal > 0
    ? {
        safePct: Math.round(((fefoMap['safe'] ?? 0) / fefoTotal) * 100),
        nearExpiryPct: Math.round(((fefoMap['near_expiry'] ?? 0) / fefoTotal) * 100),
        expiredPct: Math.round(((fefoMap['expired'] ?? 0) / fefoTotal) * 100),
        total: fefoTotal,
      }
    : { safePct: 0, nearExpiryPct: 0, expiredPct: 0, total: 0 }

  // ── Build weekly chart (grouped by unit) ────────────────────────────────
  const unitMap: Record<string, { nhap: number; xuat: number }> = {}
  for (const row of weeklyFlowRaw) {
    const unit = row.unit ?? 'kg'
    if (!unitMap[unit]) unitMap[unit] = { nhap: 0, xuat: 0 }
    if (row.txType === 'import') unitMap[unit].nhap += Number(row.total)
    else if (row.txType === 'export') unitMap[unit].xuat += Number(row.total)
  }
  const weeklyFlow = Object.entries(unitMap).map(([unit, vals]) => ({ unit, ...vals }))

  // ── Build recent transactions ────────────────────────────────────────────
  const inboundStatusMap: Record<string, string> = {
    draft: 'Đang xử lý',
    pending_qc: 'Chờ kiểm định',
    posted: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }

  const outboundStatusMap: Record<string, string> = {
    pending: 'Đang xử lý',
    fulfilled: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }

  const purchaseStatusMap: Record<string, string> = {
    draft: 'Nháp',
    submitted: 'Chờ duyệt',
    approved: 'Đã duyệt',
    ordered: 'Đã đặt hàng',
    partially_received: 'Nhận một phần',
    received: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }

  type RawTx = {
    dbId: string
    id: string
    type: string
    material: string
    quantity: string
    time: string
    status: string
    _sortDate: Date
  }

  const inboundTxs: RawTx[] = recentInbound.map((r) => {
    const totalQty = r.items.reduce((s, i) => s + Number(i.quantityBase), 0)
    return {
      dbId: String(r.id),
      id: r.receiptRef,
      type: 'Nhập',
      material: r.items[0]?.product?.name ?? '---',
      quantity: `${fmtQty(totalQty)} kg`,
      time: formatTxTime(r.createdAt),
      status: inboundStatusMap[r.status] ?? r.status,
      _sortDate: r.createdAt,
    }
  })

  const outboundTxs: RawTx[] = recentOutbound.map((r) => {
    const totalQty = r.items.reduce((s, i) => s + Number(i.quantityBase), 0)
    return {
      dbId: String(r.id),
      id: r.orderRef ?? `EXP-${r.id}`,
      type: 'Xuất',
      material: r.items[0]?.product?.name ?? '---',
      quantity: `${fmtQty(totalQty)} kg`,
      time: formatTxTime(r.createdAt),
      status: outboundStatusMap[r.status] ?? r.status,
      _sortDate: r.createdAt,
    }
  })

  const purchaseTxs: RawTx[] = recentPurchaseRequests.map((r) => {
    const totalQty = r.items.reduce((s, i) => s + Number(i.quantityNeededBase), 0)
    return {
      dbId: r.id,
      id: r.requestRef,
      type: 'Mua hàng',
      material: r.items[0]?.product?.name ?? '---',
      quantity: `${fmtQty(totalQty)} kg`,
      time: formatTxTime(r.createdAt),
      status: purchaseStatusMap[r.status] ?? r.status,
      _sortDate: r.createdAt,
    }
  })

  const recentTransactions = [...inboundTxs, ...outboundTxs, ...purchaseTxs]
    .sort((a, b) => b._sortDate.getTime() - a._sortDate.getTime())
    .slice(0, 20)
    .map(({ _sortDate: _, ...rest }) => rest)

  res.json({ kpi, alerts, expiryAlerts, lowStockAlerts, fefo, weeklyFlow, recentTransactions })
})

export default router
