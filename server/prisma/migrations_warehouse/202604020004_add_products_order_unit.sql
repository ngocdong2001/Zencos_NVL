ALTER TABLE products
  ADD COLUMN order_unit BIGINT UNSIGNED NULL AFTER base_unit;

UPDATE products
SET order_unit = base_unit
WHERE order_unit IS NULL;

ALTER TABLE products
  ADD INDEX products_order_unit_idx (order_unit);

ALTER TABLE products
  ADD CONSTRAINT products_order_unit_fkey
  FOREIGN KEY (order_unit) REFERENCES product_units(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
