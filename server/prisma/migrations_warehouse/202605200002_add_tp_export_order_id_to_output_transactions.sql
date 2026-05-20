-- Add tp_export_order_id column to production_output_transactions
-- Allows standalone TP export transactions to link to tp_export_orders instead of production_orders

ALTER TABLE production_output_transactions
  ADD COLUMN tp_export_order_id BIGINT UNSIGNED NULL AFTER production_order_id,
  ADD CONSTRAINT production_output_transactions_ibfk_5
    FOREIGN KEY (tp_export_order_id) REFERENCES tp_export_orders(id) ON DELETE SET NULL,
  ADD INDEX idx_production_output_transactions_tp_export_order_id (tp_export_order_id);
