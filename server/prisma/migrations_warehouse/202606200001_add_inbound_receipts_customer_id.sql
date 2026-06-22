ALTER TABLE inbound_receipts
  ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER adjusted_by_receipt_id,
  ADD INDEX inbound_receipts_customer_id_idx (customer_id);

ALTER TABLE inbound_receipts
  ADD CONSTRAINT inbound_receipts_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
