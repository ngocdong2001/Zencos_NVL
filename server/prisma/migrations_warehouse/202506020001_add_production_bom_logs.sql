-- Add production_bom_logs (lịch sử thao tác phiếu định mức sản xuất)
CREATE TABLE IF NOT EXISTS `production_bom_logs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bom_id`       BIGINT UNSIGNED NOT NULL,
  `actor_id`     BIGINT UNSIGNED NOT NULL,
  `action_type`  VARCHAR(100)    NOT NULL,
  `action_label` VARCHAR(255)    NOT NULL,
  `data`         JSON            NULL,
  `created_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `production_bom_logs_bom_id_idx`      (`bom_id`),
  INDEX `production_bom_logs_created_at_idx`  (`created_at`),
  CONSTRAINT `production_bom_logs_bom_id_fkey`
    FOREIGN KEY (`bom_id`)   REFERENCES `production_boms` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `production_bom_logs_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)           ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
