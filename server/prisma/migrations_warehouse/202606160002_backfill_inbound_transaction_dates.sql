-- ============================================================
-- Backfill: chỉnh lại ngày giao dịch tồn kho của các phiếu
-- nhập kho đã posted theo đúng ngày nhận hàng (expected_date).
--
-- Các trường được cập nhật:
--   1. inventory_transactions.transaction_date
--   2. inbound_receipts.received_at
--   3. inbound_receipts.qc_checked_at (nếu đã có giá trị)
--
-- Chạy trong transaction để dễ rollback nếu cần.
-- ============================================================

START TRANSACTION;

-- ── 1. Cập nhật received_at và qc_checked_at trên phiếu nhập kho ──────────────
UPDATE inbound_receipts ir
SET
  ir.received_at  = CONVERT_TZ(
                      CONCAT(DATE(ir.expected_date), ' 00:00:00'),
                      '+00:00', '+00:00'
                    ),
  ir.qc_checked_at = CASE
                       WHEN ir.qc_checked_at IS NOT NULL
                         THEN CONVERT_TZ(
                                CONCAT(DATE(ir.expected_date), ' 00:00:00'),
                                '+00:00', '+00:00'
                              )
                       ELSE ir.qc_checked_at
                     END,
  ir.updated_at   = NOW(3)
WHERE ir.status       = 'posted'
  AND ir.expected_date IS NOT NULL
  AND DATE(ir.received_at) <> DATE(ir.expected_date);

-- ── 2. Cập nhật transaction_date cho giao dịch liên kết qua posted_tx_id ─────
UPDATE inventory_transactions it
JOIN inbound_receipt_items iri ON iri.posted_tx_id = it.id
JOIN inbound_receipts ir       ON ir.id = iri.inbound_receipt_id
SET
  it.transaction_date = CONVERT_TZ(
                          CONCAT(DATE(ir.expected_date), ' 00:00:00'),
                          '+00:00', '+00:00'
                        ),
  it.updated_at       = NOW(3)
WHERE ir.status        = 'posted'
  AND ir.expected_date IS NOT NULL
  AND DATE(it.transaction_date) <> DATE(ir.expected_date);

-- ── 3. Cập nhật transaction_date cho source transactions (điều chỉnh/void) ───
UPDATE inventory_transactions it
JOIN inbound_receipt_items iri ON iri.id = it.inbound_receipt_item_id
JOIN inbound_receipts ir       ON ir.id = iri.inbound_receipt_id
SET
  it.transaction_date = CONVERT_TZ(
                          CONCAT(DATE(ir.expected_date), ' 00:00:00'),
                          '+00:00', '+00:00'
                        ),
  it.updated_at       = NOW(3)
WHERE ir.status        = 'posted'
  AND ir.expected_date IS NOT NULL
  AND DATE(it.transaction_date) <> DATE(ir.expected_date);

COMMIT;
