/**
 * backfill-inventory-tx-location.cjs
 *
 * Điền warehouse_location_id cho các dòng inventory_transactions còn NULL.
 *
 * Nguồn suy luận location (theo thứ tự ưu tiên):
 *   1. inbound_receipt_item_id IS NOT NULL
 *        → JOIN inbound_receipt_items → inbound_receipts.receiving_location_id
 *   2. export_order_item_id IS NOT NULL
 *        → JOIN export_order_items → export_orders.source_location_id
 *   3. production_order_id IS NOT NULL (xuất NVL cho sản xuất)
 *        → JOIN production_order_lines (step=1, direction='out', khớp product_id từ batch)
 *   4. opening_stock_items.posted_tx_id = tx.id (import tồn đầu kỳ)
 *        → dùng opening_stock_items.location_id
 *   5. opening_stock_items.posted_batch_id = tx.batch_id (adjustment/reversal tồn đầu kỳ)
 *        → dùng opening_stock_items.location_id
 *   6. batch.inbound_receipt_item_id IS NOT NULL (fallback mọi loại tx)
 *        → JOIN inbound_receipt_items → inbound_receipts.receiving_location_id
 *   7. batch.lot_no + batch.product_id khớp opening_stock_items (batch mồ côi)
 *        → dùng opening_stock_items.location_id
 *
 * Các dòng không suy luận được sẽ được in ra để xử lý thủ công.
 *
 * Chạy: node server/scripts/backfill-inventory-tx-location.cjs [--dry-run]
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

if (DRY_RUN) {
  console.log('[DRY RUN] Sẽ không cập nhật dữ liệu thực tế.\n')
}

async function main() {
  // Lấy tất cả transactions có warehouse_location_id NULL
  const nullTxList = await prisma.$queryRawUnsafe(`
    SELECT
      t.id,
      t.type,
      t.batch_id,
      t.export_order_item_id,
      t.inbound_receipt_item_id,
      t.production_order_id
    FROM inventory_transactions t
    WHERE t.warehouse_location_id IS NULL
    ORDER BY t.id ASC
  `)

  if (!nullTxList.length) {
    console.log('Không có dòng nào có warehouse_location_id NULL.')
    return
  }

  console.log(`Tìm thấy ${nullTxList.length} dòng cần backfill.\n`)

  let updated = 0
  let skipped = 0
  const unresolvable = []

  for (const tx of nullTxList) {
    let resolvedLocationId = null
    let source = null

    // ─── Nguồn 1: import từ inbound receipt ───────────────────────────────────
    if (tx.inbound_receipt_item_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT ir.receiving_location_id
        FROM inbound_receipt_items iri
        JOIN inbound_receipts ir ON ir.id = iri.inbound_receipt_id
        WHERE iri.id = ?
          AND ir.receiving_location_id IS NOT NULL
        LIMIT 1
      `, tx.inbound_receipt_item_id)

      if (rows.length && rows[0].receiving_location_id != null) {
        resolvedLocationId = rows[0].receiving_location_id
        source = `inbound_receipt_item#${tx.inbound_receipt_item_id}`
      }
    }

    // ─── Nguồn 2: export theo export order ────────────────────────────────────
    if (resolvedLocationId == null && tx.export_order_item_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT eo.source_location_id
        FROM export_order_items eoi
        JOIN export_orders eo ON eo.id = eoi.export_order_id
        WHERE eoi.id = ?
          AND eo.source_location_id IS NOT NULL
        LIMIT 1
      `, tx.export_order_item_id)

      if (rows.length && rows[0].source_location_id != null) {
        resolvedLocationId = rows[0].source_location_id
        source = `export_order_item#${tx.export_order_item_id}`
      }
    }

    // ─── Nguồn 3: export NVL cho production order (step=1, direction='out') ───
    if (resolvedLocationId == null && tx.production_order_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT pol.location_id
        FROM production_order_lines pol
        JOIN batches b ON b.product_id = pol.product_id
        WHERE pol.order_id = ?
          AND pol.step = 1
          AND pol.direction = 'out'
          AND b.id = ?
          AND pol.location_id IS NOT NULL
        LIMIT 1
      `, tx.production_order_id, tx.batch_id)

      if (rows.length && rows[0].location_id != null) {
        resolvedLocationId = rows[0].location_id
        source = `production_order_line(order#${tx.production_order_id}, batch#${tx.batch_id})`
      }
    }

    // ─── Nguồn 4: opening stock item – tra theo posted_tx_id ─────────────────
    if (resolvedLocationId == null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT osi.location_id
        FROM opening_stock_items osi
        WHERE osi.posted_tx_id = ?
          AND osi.location_id IS NOT NULL
        LIMIT 1
      `, tx.id)

      if (rows.length && rows[0].location_id != null) {
        resolvedLocationId = rows[0].location_id
        source = `opening_stock_item(posted_tx_id=${tx.id})`
      }
    }

    // ─── Nguồn 5: opening stock item – tra theo posted_batch_id ──────────────
    if (resolvedLocationId == null && tx.batch_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT osi.location_id
        FROM opening_stock_items osi
        WHERE osi.posted_batch_id = ?
          AND osi.location_id IS NOT NULL
        LIMIT 1
      `, tx.batch_id)

      if (rows.length && rows[0].location_id != null) {
        resolvedLocationId = rows[0].location_id
        source = `opening_stock_item(posted_batch_id=${tx.batch_id})`
      }
    }

    // ─── Nguồn 6: trace qua batch.inbound_receipt_item_id → inbound_receipt ──
    if (resolvedLocationId == null && tx.batch_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT ir.receiving_location_id
        FROM batches b
        JOIN inbound_receipt_items iri ON iri.id = b.inbound_receipt_item_id
        JOIN inbound_receipts ir ON ir.id = iri.inbound_receipt_id
        WHERE b.id = ?
          AND ir.receiving_location_id IS NOT NULL
        LIMIT 1
      `, tx.batch_id)

      if (rows.length && rows[0].receiving_location_id != null) {
        resolvedLocationId = rows[0].receiving_location_id
        source = `batch#${tx.batch_id}→inbound_receipt`
      }
    }

    // ─── Nguồn 7: batch không có receipt → match lot_no+product_id trong OSI ─
    if (resolvedLocationId == null && tx.batch_id != null) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT osi.location_id
        FROM batches b
        JOIN opening_stock_items osi ON osi.product_id = b.product_id
          AND osi.lot_no = b.lot_no
        WHERE b.id = ?
          AND osi.location_id IS NOT NULL
        LIMIT 1
      `, tx.batch_id)

      if (rows.length && rows[0].location_id != null) {
        resolvedLocationId = rows[0].location_id
        source = `batch#${tx.batch_id}→osi(lot_no+product_id)`
      }
    }

    // ─── Cập nhật hoặc ghi nhận ───────────────────────────────────────────────
    if (resolvedLocationId != null) {
      if (!DRY_RUN) {
        await prisma.$executeRawUnsafe(`
          UPDATE inventory_transactions
          SET warehouse_location_id = ?
          WHERE id = ?
        `, resolvedLocationId, tx.id)
      }
      console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] tx#${tx.id} (${tx.type}): location=${resolvedLocationId} ← ${source}`)
      updated++
    } else {
      console.warn(`  [SKIP] tx#${tx.id} (${tx.type}): không suy luận được location`)
      unresolvable.push(tx.id)
      skipped++
    }
  }

  console.log(`\n═══ Kết quả ═══`)
  console.log(`  Cập nhật: ${updated}`)
  console.log(`  Bỏ qua (không tìm được location): ${skipped}`)

  if (unresolvable.length) {
    console.warn(`\n  Danh sách tx cần xử lý thủ công: ${unresolvable.join(', ')}`)
    console.warn(`  Chạy query sau để kiểm tra:`)
    console.warn(`    SELECT * FROM inventory_transactions WHERE id IN (${unresolvable.join(', ')});`)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Không có dòng nào thực sự được ghi.')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
