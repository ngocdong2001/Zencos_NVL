-- Make warehouse_location_id NOT NULL on inventory_transactions
-- All existing rows must already have a warehouse_location_id value before running this migration.

-- Drop existing FK constraint first (MySQL requires this to change column definition)
ALTER TABLE `inventory_transactions`
  DROP FOREIGN KEY `inventory_transactions_warehouse_location_id_fkey`;

-- Change column from NULL to NOT NULL
ALTER TABLE `inventory_transactions`
  MODIFY COLUMN `warehouse_location_id` BIGINT UNSIGNED NOT NULL;

-- Re-add FK constraint with ON DELETE RESTRICT
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `inventory_transactions_warehouse_location_id_fkey`
    FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
