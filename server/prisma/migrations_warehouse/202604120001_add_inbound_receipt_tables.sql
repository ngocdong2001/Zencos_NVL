ALTER TABLE purchase_requests
  MODIFY COLUMN status ENUM('draft','submitted','approved','ordered','partially_received','received','cancelled') NOT NULL DEFAULT 'draft';

ALTER TABLE purchase_request_items
  ADD COLUMN received_qty_base DECIMAL(15, 4) NOT NULL DEFAULT 0 AFTER quantity_needed_base;

ALTER TABLE batches
  ADD COLUMN inbound_receipt_item_id BIGINT UNSIGNED NULL AFTER supplier_id,
  ADD INDEX idx_batches_inbound_receipt_item_id (inbound_receipt_item_id);

ALTER TABLE inventory_transactions
  ADD COLUMN inbound_receipt_item_id BIGINT UNSIGNED NULL AFTER export_order_item_id,
  ADD INDEX idx_inventory_transactions_inbound_receipt_item_id (inbound_receipt_item_id);

CREATE TABLE `inbound_receipts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_ref` VARCHAR(100) NOT NULL,
  `purchase_request_id` BIGINT UNSIGNED NULL,
  `supplier_id` BIGINT UNSIGNED NULL,
  `receiving_location_id` BIGINT UNSIGNED NULL,
  `status` ENUM('draft','pending_qc','posted','cancelled') NOT NULL DEFAULT 'draft',
  `expected_date` DATE NULL,
  `received_at` DATETIME(3) NULL,
  `qc_checked_at` DATETIME(3) NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `posted_by` BIGINT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `inbound_receipts_receipt_ref_key` (`receipt_ref`),
  INDEX `inbound_receipts_status_idx` (`status`),
  INDEX `inbound_receipts_purchase_request_id_idx` (`purchase_request_id`),
  INDEX `inbound_receipts_supplier_id_idx` (`supplier_id`),
  INDEX `inbound_receipts_receiving_location_id_idx` (`receiving_location_id`),
  CONSTRAINT `inbound_receipts_purchase_request_id_fkey`
    FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_supplier_id_fkey`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_receiving_location_id_fkey`
    FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_posted_by_fkey`
    FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inbound_receipt_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` BIGINT UNSIGNED NOT NULL,
  `purchase_request_item_id` BIGINT UNSIGNED NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `lot_no` VARCHAR(100) NOT NULL,
  `invoice_number` VARCHAR(100) NULL,
  `invoice_date` DATE NULL,
  `manufacture_date` DATE NULL,
  `expiry_date` DATE NULL,
  `quantity_base` DECIMAL(15, 4) NOT NULL,
  `unit_used` VARCHAR(50) NOT NULL,
  `quantity_display` DECIMAL(15, 4) NOT NULL,
  `unit_price_per_kg` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `line_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
  `qc_status` ENUM('pending','passed','failed') NOT NULL DEFAULT 'pending',
  `has_document` TINYINT(1) NOT NULL DEFAULT 0,
  `posted_batch_id` BIGINT UNSIGNED NULL,
  `posted_tx_id` BIGINT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `inbound_receipt_items_receipt_product_lot_key` (`inbound_receipt_id`, `product_id`, `lot_no`),
  INDEX `inbound_receipt_items_product_id_idx` (`product_id`),
  INDEX `inbound_receipt_items_purchase_request_item_id_idx` (`purchase_request_item_id`),
  INDEX `inbound_receipt_items_posted_batch_id_idx` (`posted_batch_id`),
  INDEX `inbound_receipt_items_posted_tx_id_idx` (`posted_tx_id`),
  INDEX `inbound_receipt_items_expiry_date_idx` (`expiry_date`),
  CONSTRAINT `inbound_receipt_items_inbound_receipt_id_fkey`
    FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_purchase_request_item_id_fkey`
    FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_batch_id_fkey`
    FOREIGN KEY (`posted_batch_id`) REFERENCES `batches` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_tx_id_fkey`
    FOREIGN KEY (`posted_tx_id`) REFERENCES `inventory_transactions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inbound_receipt_item_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` BIGINT UNSIGNED NOT NULL,
  `doc_type` ENUM('Invoice','COA','MSDS','Other') NOT NULL DEFAULT 'Other',
  `file_path` VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `uploaded_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `inbound_receipt_item_documents_item_id_idx` (`item_id`),
  CONSTRAINT `inbound_receipt_item_documents_item_id_fkey`
    FOREIGN KEY (`item_id`) REFERENCES `inbound_receipt_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_item_documents_uploaded_by_fkey`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inbound_receipt_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` BIGINT UNSIGNED NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `action_label` VARCHAR(255) NOT NULL,
  `actor_id` BIGINT UNSIGNED NOT NULL,
  `data` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `inbound_receipt_history_inbound_receipt_id_idx` (`inbound_receipt_id`),
  INDEX `inbound_receipt_history_created_at_idx` (`created_at`),
  CONSTRAINT `inbound_receipt_history_inbound_receipt_id_fkey`
    FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_history_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE batches
  ADD CONSTRAINT fk_batches_inbound_receipt_item
    FOREIGN KEY (inbound_receipt_item_id) REFERENCES inbound_receipt_items(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_inventory_transactions_inbound_receipt_item
    FOREIGN KEY (inbound_receipt_item_id) REFERENCES inbound_receipt_items(id)
    ON DELETE SET NULL ON UPDATE CASCADE;