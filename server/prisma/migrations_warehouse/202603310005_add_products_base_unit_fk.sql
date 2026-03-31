-- Migration: add FK from products.base_unit to product_units.id

ALTER TABLE products
  ADD INDEX products_base_unit_fkey (base_unit);

ALTER TABLE products
  ADD CONSTRAINT products_base_unit_fkey
  FOREIGN KEY (base_unit) REFERENCES product_units(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
