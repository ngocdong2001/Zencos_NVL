-- Migration: Add TP Export Orders tables (xuất thành phẩm)
-- Created: 2026-05-14

CREATE TABLE `tp_export_orders` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_ref`            VARCHAR(100)    NULL,
  `customer_id`          BIGINT UNSIGNED NULL,
  `source_location_id`   BIGINT UNSIGNED NULL,
  `source_order_id`      BIGINT UNSIGNED NULL,
  `adjusted_by_order_id` BIGINT UNSIGNED NULL,
  `exported_at`          DATETIME(3)     NULL,
  `status`               ENUM('pending','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
  `notes`                TEXT            NULL,
  `dien_giai`            TEXT            NULL,
  `created_by`           BIGINT UNSIGNED NOT NULL,
  `created_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tp_export_orders_source_order_id_key` (`source_order_id`),
  UNIQUE KEY `tp_export_orders_adjusted_by_order_id_key` (`adjusted_by_order_id`),
  INDEX `tp_export_orders_source_order_id_idx` (`source_order_id`),
  INDEX `tp_export_orders_adjusted_by_order_id_idx` (`adjusted_by_order_id`),
  INDEX `tp_export_orders_source_location_id_idx` (`source_location_id`),
  CONSTRAINT `fk_tp_export_customer`        FOREIGN KEY (`customer_id`)          REFERENCES `customers`           (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tp_export_location`         FOREIGN KEY (`source_location_id`)   REFERENCES `inventory_locations`  (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tp_export_source_order`     FOREIGN KEY (`source_order_id`)      REFERENCES `tp_export_orders`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tp_export_adjusted_by`      FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `tp_export_orders`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tp_export_created_by`       FOREIGN KEY (`created_by`)           REFERENCES `users`                (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tp_export_order_items` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id`       BIGINT UNSIGNED NOT NULL,
  `output_product_id`     BIGINT UNSIGNED NOT NULL,
  `lot_no`                VARCHAR(100)    NULL,
  `expiry_date`           DATE            NULL,
  `warehouse_location_id` BIGINT UNSIGNED NULL,
  `quantity_base`         DECIMAL(15,4)   NOT NULL,
  `unit_used`             VARCHAR(50)     NOT NULL,
  `quantity_display`      DECIMAL(15,4)   NOT NULL,
  `created_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `tp_export_order_items_export_order_id_idx` (`export_order_id`),
  INDEX `tp_export_order_items_output_product_id_idx` (`output_product_id`),
  CONSTRAINT `fk_tp_item_order`          FOREIGN KEY (`export_order_id`)       REFERENCES `tp_export_orders`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_item_output_product` FOREIGN KEY (`output_product_id`)     REFERENCES `products_outputs`    (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tp_item_location`       FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tp_export_order_history` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` BIGINT UNSIGNED NOT NULL,
  `action_type`     VARCHAR(100)    NOT NULL,
  `action_label`    VARCHAR(255)    NOT NULL,
  `actor_id`        BIGINT UNSIGNED NOT NULL,
  `data`            JSON            NULL,
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `tp_export_order_history_export_order_id_idx` (`export_order_id`),
  INDEX `tp_export_order_history_created_at_idx` (`created_at`),
  CONSTRAINT `fk_tp_history_order` FOREIGN KEY (`export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_history_actor` FOREIGN KEY (`actor_id`)        REFERENCES `users`            (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
