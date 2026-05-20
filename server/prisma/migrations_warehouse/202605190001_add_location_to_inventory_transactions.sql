-- Add warehouse_location_id to inventory_transactions
-- This allows production NVL export/import transactions to reference the source/destination warehouse

ALTER TABLE `inventory_transactions`
  ADD COLUMN `warehouse_location_id` BIGINT UNSIGNED NULL
    AFTER `production_order_id`,
  ADD INDEX `inventory_transactions_warehouse_location_id_idx` (`warehouse_location_id`),
  ADD CONSTRAINT `inventory_transactions_warehouse_location_id_fkey`
    FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
