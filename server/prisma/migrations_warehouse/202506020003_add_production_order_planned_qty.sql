-- Add planned_qty to production_orders
-- Stores the planned production quantity used to scale BOM NVL line quantities.
ALTER TABLE `production_orders`
  ADD COLUMN `planned_qty` DECIMAL(15, 4) NULL AFTER `production_bom_id`;
