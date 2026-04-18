CREATE TABLE IF NOT EXISTS `export_order_history` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `export_order_id` BIGINT UNSIGNED NOT NULL,
  `action_type`     VARCHAR(100)    NOT NULL,
  `action_label`    VARCHAR(255)    NOT NULL,
  `actor_id`        BIGINT UNSIGNED NOT NULL,
  `data`            JSON            NULL,
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `export_order_history_export_order_id_idx` (`export_order_id`),
  INDEX `export_order_history_created_at_idx` (`created_at`),
  CONSTRAINT `export_order_history_export_order_id_fkey`
    FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `export_order_history_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
