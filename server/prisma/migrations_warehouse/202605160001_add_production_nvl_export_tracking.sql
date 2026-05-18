-- Add NVL export tracking to production_orders
ALTER TABLE `production_orders`
  ADD COLUMN `nvl_exported_at` DATETIME(3) NULL AFTER `output_product_id`;

-- Add production order link and cancellation flag to inventory_transactions
ALTER TABLE `inventory_transactions`
  ADD COLUMN `production_order_id` BIGINT UNSIGNED NULL AFTER `inbound_receipt_item_id`,
  ADD COLUMN `is_cancelled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `notes`,
  ADD INDEX `inventory_transactions_production_order_id_idx` (`production_order_id`),
  ADD CONSTRAINT `inventory_transactions_production_order_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
