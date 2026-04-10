ALTER TABLE purchase_requests
  ADD COLUMN receiving_location_id BIGINT UNSIGNED NULL AFTER supplier_id;

ALTER TABLE purchase_requests
  ADD INDEX idx_purchase_requests_receiving_location_id (receiving_location_id);

ALTER TABLE purchase_requests
  ADD CONSTRAINT fk_purchase_requests_receiving_location
  FOREIGN KEY (receiving_location_id) REFERENCES inventory_locations(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
