ALTER TABLE purchase_request_items
  ADD COLUMN unit_price DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER quantity_display;
