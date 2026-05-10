-- Migration: Tạo bảng products_outputs (thành phẩm & bán thành phẩm)
-- Ngày: 2026-05-06

-- 1. Tạo bảng products_outputs
CREATE TABLE products_outputs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(100)    NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  output_type ENUM('finished', 'semi_finished') NOT NULL,
  unit        VARCHAR(50)     NOT NULL,
  notes       TEXT,
  deleted_at  DATETIME(3),
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL,
  CONSTRAINT uq_po_code UNIQUE (code),
  INDEX idx_po_output_type (output_type)
);

-- 2. Thêm output_product_id vào production_orders
ALTER TABLE production_orders
  ADD COLUMN output_product_id BIGINT UNSIGNED,
  ADD INDEX idx_prod_order_output_product (output_product_id),
  ADD CONSTRAINT fk_prod_order_output_product
    FOREIGN KEY (output_product_id) REFERENCES products_outputs(id) ON DELETE SET NULL;

-- 3. Thêm output_product_id vào production_order_lines
ALTER TABLE production_order_lines
  ADD COLUMN output_product_id BIGINT UNSIGNED,
  ADD INDEX idx_pol_output_product (output_product_id),
  ADD CONSTRAINT fk_pol_output_product
    FOREIGN KEY (output_product_id) REFERENCES products_outputs(id) ON DELETE SET NULL;
