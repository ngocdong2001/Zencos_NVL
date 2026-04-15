ALTER TABLE inbound_receipts
  ADD COLUMN source_receipt_id BIGINT UNSIGNED NULL AFTER purchase_request_id,
  ADD COLUMN adjusted_by_receipt_id BIGINT UNSIGNED NULL AFTER source_receipt_id;

ALTER TABLE inbound_receipts
  ADD CONSTRAINT fk_inbound_receipts_source_receipt
    FOREIGN KEY (source_receipt_id) REFERENCES inbound_receipts(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_inbound_receipts_adjusted_by_receipt
    FOREIGN KEY (adjusted_by_receipt_id) REFERENCES inbound_receipts(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_inbound_receipts_source_receipt_id
  ON inbound_receipts(source_receipt_id);

CREATE INDEX idx_inbound_receipts_adjusted_by_receipt_id
  ON inbound_receipts(adjusted_by_receipt_id);

CREATE UNIQUE INDEX ux_inbound_receipts_source_receipt_id
  ON inbound_receipts(source_receipt_id);

CREATE UNIQUE INDEX ux_inbound_receipts_adjusted_by_receipt_id
  ON inbound_receipts(adjusted_by_receipt_id);
