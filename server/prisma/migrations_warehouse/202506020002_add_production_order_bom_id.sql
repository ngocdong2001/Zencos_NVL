-- Add production_bom_id to production_orders
-- Links a production order to the BOM (định mức sản xuất) it was created from.
ALTER TABLE `production_orders`
  ADD COLUMN `production_bom_id` BIGINT UNSIGNED NULL AFTER `output_product_id`,
  ADD INDEX `idx_production_orders_bom_id` (`production_bom_id`);
