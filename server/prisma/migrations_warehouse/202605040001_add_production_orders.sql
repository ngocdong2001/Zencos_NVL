-- Add production_orders table
CREATE TABLE IF NOT EXISTS `production_orders` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_ref`       VARCHAR(100)    NULL,
  `issued_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sku_product_id`  BIGINT UNSIGNED NULL,
  `sku_code`        VARCHAR(100)    NULL,
  `sku_name`        VARCHAR(255)    NULL,
  `product_type`    VARCHAR(100)    NULL,
  `current_step`    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `status`          ENUM('draft','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  `notes`           TEXT            NULL,
  `created_by`      BIGINT UNSIGNED NOT NULL,
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `production_orders_status_idx`     (`status`),
  INDEX `production_orders_issued_at_idx`  (`issued_at`),
  INDEX `production_orders_created_by_idx` (`created_by`),
  INDEX `production_orders_sku_product_id_idx` (`sku_product_id`),
  CONSTRAINT `production_orders_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_orders_sku_product_id_fkey`
    FOREIGN KEY (`sku_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
