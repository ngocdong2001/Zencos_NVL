ALTER TABLE customers
  ADD COLUMN code VARCHAR(100) NULL AFTER id;

UPDATE customers
SET code = CONCAT('CUS-', LPAD(CAST(id AS CHAR), 3, '0'))
WHERE code IS NULL OR code = '';

ALTER TABLE customers
  MODIFY COLUMN code VARCHAR(100) NOT NULL;

ALTER TABLE customers
  ADD UNIQUE KEY customers_code_key (code);