-- DANGER: This script permanently deletes ALL export orders and related data.
-- Scope:
--   - export_orders
--   - export_order_items
--   - export_order_history
--   - purchase_requests created/linked from export orders
--   - purchase_request_items of those purchase_requests
--   - inventory_transactions linked via export_order_item_id
--
-- Run on MySQL/MariaDB.

START TRANSACTION;

-- 0) Snapshot IDs to purge
DROP TEMPORARY TABLE IF EXISTS tmp_export_orders_to_purge;
CREATE TEMPORARY TABLE tmp_export_orders_to_purge AS
SELECT id
FROM export_orders;

DROP TEMPORARY TABLE IF EXISTS tmp_export_order_items_to_purge;
CREATE TEMPORARY TABLE tmp_export_order_items_to_purge AS
SELECT eoi.id
FROM export_order_items eoi
JOIN tmp_export_orders_to_purge eo ON eo.id = eoi.export_order_id;

DROP TEMPORARY TABLE IF EXISTS tmp_purchase_requests_to_purge;
CREATE TEMPORARY TABLE tmp_purchase_requests_to_purge AS
SELECT pr.id
FROM purchase_requests pr
JOIN tmp_export_orders_to_purge eo ON eo.id = pr.export_order_id;

-- 1) Remove inventory ledger rows tied to export order items
DELETE t
FROM inventory_transactions t
JOIN tmp_export_order_items_to_purge eoi ON eoi.id = t.export_order_item_id;

-- 2) Remove history rows (cascade also works, explicit for clarity)
DELETE h
FROM export_order_history h
JOIN tmp_export_orders_to_purge eo ON eo.id = h.export_order_id;

-- 3) Detach inbound receipts from purchase requests that will be removed
UPDATE inbound_receipts ir
JOIN tmp_purchase_requests_to_purge pr ON pr.id = ir.purchase_request_id
SET ir.purchase_request_id = NULL;

-- 4) Remove purchase request items + purchase requests linked to export orders
DELETE pri
FROM purchase_request_items pri
JOIN tmp_purchase_requests_to_purge pr ON pr.id = pri.purchase_request_id;

DELETE pr
FROM purchase_requests pr
JOIN tmp_purchase_requests_to_purge x ON x.id = pr.id;

-- 5) Remove export order items
DELETE eoi
FROM export_order_items eoi
JOIN tmp_export_order_items_to_purge x ON x.id = eoi.id;

-- 6) Remove export orders
DELETE eo
FROM export_orders eo
JOIN tmp_export_orders_to_purge x ON x.id = eo.id;

-- 7) Recalculate current_qty_base to ensure stock is consistent after purge
UPDATE batches b
SET b.current_qty_base = b.received_qty_base + COALESCE((
  SELECT SUM(
    CASE t.type
      WHEN 'import' THEN t.quantity_base
      WHEN 'export' THEN -t.quantity_base
      ELSE t.quantity_base
    END
  )
  FROM inventory_transactions t
  WHERE t.batch_id = b.id
), 0);

COMMIT;

-- Optional verification queries
SELECT COUNT(*) AS remaining_export_orders FROM export_orders;
SELECT COUNT(*) AS remaining_export_order_items FROM export_order_items;
SELECT COUNT(*) AS remaining_export_history FROM export_order_history;
SELECT COUNT(*) AS remaining_linked_export_transactions
FROM inventory_transactions
WHERE export_order_item_id IS NOT NULL;
