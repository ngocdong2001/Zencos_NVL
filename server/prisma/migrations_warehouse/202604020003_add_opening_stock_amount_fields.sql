ALTER TABLE `opening_stock_items`
  ADD COLUMN `unit_price_value` DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER `unit_price_per_kg`,
  ADD COLUMN `unit_price_unit_id` BIGINT UNSIGNED NULL AFTER `unit_price_value`,
  ADD COLUMN `unit_price_conversion_to_base` DECIMAL(15, 4) NOT NULL DEFAULT 1 AFTER `unit_price_unit_id`,
  ADD COLUMN `line_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0 AFTER `unit_price_conversion_to_base`;

CREATE INDEX `opening_stock_items_unit_price_unit_id_idx`
  ON `opening_stock_items`(`unit_price_unit_id`);

ALTER TABLE `opening_stock_items`
  ADD CONSTRAINT `opening_stock_items_unit_price_unit_id_fkey`
  FOREIGN KEY (`unit_price_unit_id`) REFERENCES `product_units`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE opening_stock_items osi
SET
  osi.unit_price_value = osi.unit_price_per_kg,
  osi.unit_price_conversion_to_base = CASE
    WHEN osi.unit_price_per_kg > 0 THEN 1000
    ELSE 1
  END;

UPDATE opening_stock_items osi
JOIN (
  SELECT pu.product_id, MIN(pu.id) AS unit_id
  FROM product_units pu
  WHERE pu.product_id IS NOT NULL
    AND LOWER(COALESCE(pu.unit_code_name, pu.unit_name)) = 'kg'
  GROUP BY pu.product_id
) kg ON kg.product_id = osi.product_id
SET osi.unit_price_unit_id = kg.unit_id
WHERE osi.unit_price_unit_id IS NULL;

UPDATE opening_stock_items osi
SET osi.line_amount = ROUND(
  (osi.quantity_base / NULLIF(osi.unit_price_conversion_to_base, 0)) * osi.unit_price_value,
  2
);
