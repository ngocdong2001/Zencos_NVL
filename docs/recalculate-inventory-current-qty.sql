-- Recalculate batches.current_qty_base with outbound-status aware logic
-- Business rule: draft/pending export orders must NOT affect inventory.
-- Safe run flow: preview mismatch -> update -> verify

START TRANSACTION;

-- 1) Compute recalculated quantity per batch
-- Rules:
--   - import: only include manual imports (inbound_receipt_item_id IS NULL)
--             because standard posted inbound is already captured in received_qty_base
--   - adjustment: include normally, except when linked to unfulfilled export order item
--   - export: only decrease when linked order/item is fulfilled
DROP TEMPORARY TABLE IF EXISTS tmp_batch_recalc;
CREATE TEMPORARY TABLE tmp_batch_recalc AS
SELECT
  b.id AS batch_id,
  ROUND(
    b.received_qty_base
    + COALESCE(SUM(
        CASE
          WHEN t.type = 'import' THEN
            CASE
              WHEN t.inbound_receipt_item_id IS NULL THEN t.quantity_base
              ELSE 0
            END
          WHEN t.type = 'export' THEN
            CASE
              -- Legacy rows not linked to export_order_item are treated as valid exports
              WHEN t.export_order_item_id IS NULL THEN -t.quantity_base
              WHEN eoi.status = 'fulfilled' AND eo.status = 'fulfilled' THEN -t.quantity_base
              ELSE 0
            END
          WHEN t.type = 'adjustment' THEN
            CASE
              -- If adjustment belongs to non-fulfilled export flow, ignore it in recalculation
              WHEN t.export_order_item_id IS NOT NULL
                   AND NOT (eoi.status = 'fulfilled' AND eo.status = 'fulfilled') THEN 0
              ELSE t.quantity_base
            END
          ELSE 0
        END
      ), 0),
    4
  ) AS recalculated_qty
FROM batches b
LEFT JOIN inventory_transactions t ON t.batch_id = b.id
LEFT JOIN export_order_items eoi ON eoi.id = t.export_order_item_id
LEFT JOIN export_orders eo ON eo.id = eoi.export_order_id
GROUP BY b.id, b.received_qty_base;

-- 2) Preview mismatches before update
SELECT
  b.id,
  b.current_qty_base AS current_qty_before,
  r.recalculated_qty AS current_qty_after,
  ROUND(r.recalculated_qty - b.current_qty_base, 4) AS delta
FROM batches b
JOIN tmp_batch_recalc r ON r.batch_id = b.id
WHERE ROUND(b.current_qty_base, 4) <> ROUND(r.recalculated_qty, 4)
ORDER BY ABS(r.recalculated_qty - b.current_qty_base) DESC
LIMIT 200;

-- 3) Apply recalculated values
UPDATE batches b
JOIN tmp_batch_recalc r ON r.batch_id = b.id
SET b.current_qty_base = r.recalculated_qty;

-- 4) Verify after update (expected mismatch_count = 0)
SELECT COUNT(*) AS mismatch_count
FROM batches b
JOIN tmp_batch_recalc r ON r.batch_id = b.id
WHERE ROUND(b.current_qty_base, 4) <> ROUND(r.recalculated_qty, 4);

COMMIT;

-- Optional check: transaction impact by order status (for audit)
SELECT
  eo.status AS export_order_status,
  t.type,
  COUNT(*) AS tx_count,
  ROUND(SUM(t.quantity_base), 4) AS qty_sum
FROM inventory_transactions t
LEFT JOIN export_order_items eoi ON eoi.id = t.export_order_item_id
LEFT JOIN export_orders eo ON eo.id = eoi.export_order_id
WHERE t.export_order_item_id IS NOT NULL
GROUP BY eo.status, t.type
ORDER BY eo.status, t.type;

-- Optional check: product-level on-hand after recalc
SELECT
  p.id,
  p.code,
  p.name,
  COALESCE(SUM(b.current_qty_base), 0) AS qty_on_hand
FROM products p
LEFT JOIN batches b
  ON b.product_id = p.id
 AND b.status = 'available'
 AND b.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name
ORDER BY p.code;
