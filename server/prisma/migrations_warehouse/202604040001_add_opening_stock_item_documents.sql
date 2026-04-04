CREATE TABLE `opening_stock_item_documents` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id`       BIGINT UNSIGNED NOT NULL,
  `doc_type`      ENUM('Invoice','COA','MSDS','Other') NOT NULL DEFAULT 'Other',
  `file_path`     VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type`     VARCHAR(100) NOT NULL,
  `file_size`     BIGINT UNSIGNED NOT NULL,
  `uploaded_by`   BIGINT UNSIGNED NOT NULL,
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `opening_stock_item_documents_item_id_idx` (`item_id`),
  CONSTRAINT `opening_stock_item_documents_item_id_fkey`
    FOREIGN KEY (`item_id`) REFERENCES `opening_stock_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_item_documents_uploaded_by_fkey`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
