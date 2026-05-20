-- Make production_order_id nullable on production_output_transactions
-- to support standalone TP export/reversal records not linked to a production order

ALTER TABLE production_output_transactions
  MODIFY COLUMN production_order_id BIGINT UNSIGNED NULL;

-- Drop old CASCADE FK and re-add with SET NULL on delete
ALTER TABLE production_output_transactions
  DROP FOREIGN KEY production_output_transactions_ibfk_1;

ALTER TABLE production_output_transactions
  ADD CONSTRAINT production_output_transactions_ibfk_1
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL;
