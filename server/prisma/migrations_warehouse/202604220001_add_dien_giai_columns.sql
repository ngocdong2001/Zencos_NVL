ALTER TABLE inbound_receipts
  ADD COLUMN `Dien_giai` TEXT NULL AFTER notes;

ALTER TABLE export_orders
  ADD COLUMN `Dien_giai` TEXT NULL AFTER notes;

ALTER TABLE purchase_requests
  ADD COLUMN `Dien_giai` TEXT NULL AFTER notes;
