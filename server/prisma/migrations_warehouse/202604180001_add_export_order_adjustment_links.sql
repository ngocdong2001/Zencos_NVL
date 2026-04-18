-- Add self-reference links for outbound adjustment flow (void & re-export)
ALTER TABLE export_orders
  ADD COLUMN source_order_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD COLUMN adjusted_by_order_id BIGINT UNSIGNED NULL AFTER source_order_id;

ALTER TABLE export_orders
  ADD UNIQUE INDEX export_orders_source_order_id_key (source_order_id),
  ADD UNIQUE INDEX export_orders_adjusted_by_order_id_key (adjusted_by_order_id),
  ADD INDEX export_orders_source_order_id_idx (source_order_id),
  ADD INDEX export_orders_adjusted_by_order_id_idx (adjusted_by_order_id);

ALTER TABLE export_orders
  ADD CONSTRAINT export_orders_source_order_id_fkey
    FOREIGN KEY (source_order_id) REFERENCES export_orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT export_orders_adjusted_by_order_id_fkey
    FOREIGN KEY (adjusted_by_order_id) REFERENCES export_orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
