/**
 * backfill-inbound-transaction-dates.mjs
 *
 * Backfill: chỉnh lại ngày giao dịch tồn kho của các phiếu nhập kho đã posted
 * theo đúng ngày nhận hàng (expected_date) của phiếu, thay vì ngày hệ thống
 * tại thời điểm posted.
 *
 * Các trường được cập nhật:
 *   - inventory_transactions.transaction_date
 *   - inbound_receipts.received_at
 *   - inbound_receipts.qc_checked_at  (nếu chưa có hoặc lệch ngày)
 *
 * Chạy: node server/backfill-inbound-transaction-dates.mjs [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('=== DRY RUN — không thay đổi dữ liệu ===\n')
}

async function main() {
  // 1. Lấy tất cả phiếu nhập kho đã posted và có expected_date
  const receipts = await prisma.$queryRaw`
    SELECT
      ir.id,
      ir.receipt_ref,
      ir.expected_date,
      ir.received_at,
      ir.qc_checked_at,
      ir.status
    FROM inbound_receipts ir
    WHERE ir.status = 'posted'
      AND ir.expected_date IS NOT NULL
    ORDER BY ir.id ASC
  `

  console.log(`Tìm thấy ${receipts.length} phiếu nhập kho đã posted có expected_date.\n`)

  let updatedReceipts = 0
  let updatedTransactions = 0
  let skippedAlready = 0

  for (const receipt of receipts) {
    const receiptId = receipt.id
    const receiptRef = receipt.receipt_ref
    // expected_date là DATE (chỉ có ngày, không có giờ) — chuẩn hoá về 00:00:00 UTC
    const expectedDate = new Date(receipt.expected_date)
    const expectedDateStr = expectedDate.toISOString().slice(0, 10)
    const targetDate = new Date(`${expectedDateStr}T00:00:00.000Z`)

    // Kiểm tra received_at hiện tại
    const currentReceivedAt = receipt.received_at ? new Date(receipt.received_at) : null
    const currentReceivedStr = currentReceivedAt ? currentReceivedAt.toISOString().slice(0, 10) : null
    const needsReceiptUpdate = currentReceivedStr !== expectedDateStr

    // Lấy các inventory_transactions liên kết qua inbound_receipt_items.posted_tx_id
    const linkedTxRows = await prisma.$queryRaw`
      SELECT
        it.id AS tx_id,
        it.transaction_date,
        iri.id AS item_id
      FROM inbound_receipt_items iri
      JOIN inventory_transactions it ON it.id = iri.posted_tx_id
      WHERE iri.inbound_receipt_id = ${receiptId}
        AND iri.posted_tx_id IS NOT NULL
    `

    // Lấy thêm các source transactions (phiếu điều chỉnh/void có thể có source tx)
    const sourceTxRows = await prisma.$queryRaw`
      SELECT
        it.id AS tx_id,
        it.transaction_date
      FROM inbound_receipt_items iri
      JOIN inventory_transactions it ON it.inbound_receipt_item_id = iri.id
      WHERE iri.inbound_receipt_id = ${receiptId}
        AND it.id NOT IN (
          SELECT posted_tx_id FROM inbound_receipt_items
          WHERE inbound_receipt_id = ${receiptId}
            AND posted_tx_id IS NOT NULL
        )
    `

    const allTxRows = [...linkedTxRows, ...sourceTxRows]
    const txsNeedingUpdate = allTxRows.filter((row) => {
      const txDate = new Date(row.transaction_date)
      return txDate.toISOString().slice(0, 10) !== expectedDateStr
    })

    if (!needsReceiptUpdate && txsNeedingUpdate.length === 0) {
      console.log(`[SKIP] ${receiptRef} — ngày đã đúng (${expectedDateStr})`)
      skippedAlready++
      continue
    }

    console.log(`[UPDATE] ${receiptRef} (id=${receiptId}) expected_date=${expectedDateStr}`)
    if (needsReceiptUpdate) {
      console.log(`  receipts.received_at: ${currentReceivedStr ?? 'null'} → ${expectedDateStr}`)
    }
    if (txsNeedingUpdate.length > 0) {
      console.log(`  inventory_transactions: ${txsNeedingUpdate.length} dòng cần cập nhật`)
      for (const tx of txsNeedingUpdate) {
        const from = new Date(tx.transaction_date).toISOString().slice(0, 10)
        console.log(`    tx_id=${tx.tx_id}: ${from} → ${expectedDateStr}`)
      }
    }

    if (!isDryRun) {
      // Cập nhật received_at và qc_checked_at trên phiếu
      if (needsReceiptUpdate) {
        await prisma.$executeRaw`
          UPDATE inbound_receipts
          SET
            received_at = ${targetDate},
            qc_checked_at = CASE
              WHEN qc_checked_at IS NOT NULL THEN ${targetDate}
              ELSE qc_checked_at
            END,
            updated_at = NOW(3)
          WHERE id = ${receiptId}
        `
      }

      // Cập nhật transaction_date của tất cả inventory_transactions liên quan
      if (txsNeedingUpdate.length > 0) {
        const txIds = txsNeedingUpdate.map((tx) => tx.tx_id)
        for (const txId of txIds) {
          await prisma.$executeRaw`
            UPDATE inventory_transactions
            SET transaction_date = ${targetDate},
                updated_at = NOW(3)
            WHERE id = ${txId}
          `
        }
        updatedTransactions += txIds.length
      }

      updatedReceipts++
    }
  }

  console.log('\n=== KẾT QUẢ ===')
  if (isDryRun) {
    console.log('DRY RUN — không có thay đổi thực sự.')
  } else {
    console.log(`Đã cập nhật: ${updatedReceipts} phiếu nhập kho`)
    console.log(`Đã cập nhật: ${updatedTransactions} giao dịch tồn kho`)
  }
  console.log(`Bỏ qua (đã đúng ngày): ${skippedAlready} phiếu`)
}

main()
  .catch((err) => {
    console.error('Lỗi khi chạy backfill:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
