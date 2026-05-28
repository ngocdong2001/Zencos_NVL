-- Add production_boms (phiếu định mức sản xuất)
CREATE TABLE IF NOT EXISTS `production_boms` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bom_code`            VARCHAR(100)    NULL,
  `bom_name`            VARCHAR(255)    NOT NULL,
  `output_product_id`   BIGINT UNSIGNED NULL,
  `base_qty`            DECIMAL(15,4)   NOT NULL DEFAULT 1,
  `version`             SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `status`              ENUM('draft','submitted','approved','inactive','archived') NOT NULL DEFAULT 'draft',
  `effective_from`      DATE            NULL,
  `effective_to`        DATE            NULL,
  `notes`               TEXT            NULL,
  `created_by`          BIGINT UNSIGNED NOT NULL,
  `approved_by`         BIGINT UNSIGNED NULL,
  `approved_at`         DATETIME(3)     NULL,
  `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `production_boms_status_idx`            (`status`),
  INDEX `production_boms_output_product_id_idx` (`output_product_id`),
  INDEX `production_boms_created_by_idx`        (`created_by`),
  CONSTRAINT `production_boms_output_product_id_fkey`
    FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `production_boms_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_boms_approved_by_fkey`
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add production_bom_lines (dòng định mức NVL / BTP)
CREATE TABLE IF NOT EXISTS `production_bom_lines` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bom_id`          BIGINT UNSIGNED NOT NULL,
  `sort_order`      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `line_type`       ENUM('nvl','btp') NOT NULL DEFAULT 'nvl',
  `product_id`      BIGINT UNSIGNED NULL,
  `product_code`    VARCHAR(100)    NOT NULL DEFAULT '',
  `product_name`    VARCHAR(255)    NOT NULL DEFAULT '',
  `qty_per_base`    DECIMAL(15,4)   NOT NULL DEFAULT 0,
  `waste_qty`       DECIMAL(15,4)   NOT NULL DEFAULT 0,
  `unit`            VARCHAR(50)     NOT NULL DEFAULT '',
  `notes`           VARCHAR(500)    NULL,
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `production_bom_lines_bom_id_idx` (`bom_id`),
  CONSTRAINT `production_bom_lines_bom_id_fkey`
    FOREIGN KEY (`bom_id`) REFERENCES `production_boms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_bom_lines_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
