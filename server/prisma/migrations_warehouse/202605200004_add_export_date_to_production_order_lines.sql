-- Add export_date column to production_order_lines
-- Tracks the actual date each lot was physically exported from the warehouse
ALTER TABLE `production_order_lines`
  ADD COLUMN `export_date` DATETIME(3) NULL AFTER `expiry_date`;
