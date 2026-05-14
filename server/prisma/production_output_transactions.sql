-- Create production_output_transactions table to track TP (finished products) and BTP (semi-finished) movements
CREATE TABLE `production_output_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `production_order_id` bigint unsigned NOT NULL,
  `output_product_id` bigint unsigned NOT NULL,
  `type` enum('import_from_production','export_to_sale','adjustment') NOT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `warehouse_location_id` bigint unsigned,
  `batch_lot_no` varchar(100),
  `batch_expiry_date` date,
  `user_id` bigint unsigned,
  `notes` text,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_production_order_id` (`production_order_id`),
  KEY `idx_output_product_transaction` (`output_product_id`, `transaction_date`, `type`),
  FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
