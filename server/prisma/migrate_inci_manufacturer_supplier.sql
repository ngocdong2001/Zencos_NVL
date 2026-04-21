-- Migration: add product_inci_names, product_manufacturers, product_suppliers
-- Date: 2026-04-20

ALTER TABLE `batches` ADD COLUMN `manufacturer_id` BIGINT UNSIGNED NULL;
ALTER TABLE `inbound_receipt_items` ADD COLUMN `manufacturer_id` BIGINT UNSIGNED NULL;

CREATE TABLE `product_inci_names` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `inci_name` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `product_inci_names_product_id_idx`(`product_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing inci_name data
INSERT INTO `product_inci_names` (`product_id`, `inci_name`, `is_primary`, `created_at`, `updated_at`)
SELECT `id`, `inci_name`, true, NOW(3), NOW(3)
FROM `products`
WHERE `inci_name` IS NOT NULL AND `inci_name` != '';

CREATE TABLE `product_manufacturers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `country` VARCHAR(100) NULL,
  `contact_info` VARCHAR(255) NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `notes` TEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `product_manufacturers_product_id_idx`(`product_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_suppliers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `supplier_id` BIGINT UNSIGNED NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `product_suppliers_product_id_idx`(`product_id`),
  INDEX `product_suppliers_supplier_id_idx`(`supplier_id`),
  UNIQUE INDEX `product_suppliers_product_id_supplier_id_key`(`product_id`, `supplier_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `batches` ADD CONSTRAINT `batches_manufacturer_id_fkey`
  FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inbound_receipt_items` ADD CONSTRAINT `inbound_receipt_items_manufacturer_id_fkey`
  FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `product_inci_names` ADD CONSTRAINT `product_inci_names_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_manufacturers` ADD CONSTRAINT `product_manufacturers_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
