-- CreateTable
CREATE TABLE `opening_stock_declarations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `declaration_ref` VARCHAR(100) NOT NULL,
    `status` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
    `source` ENUM('manual', 'excel') NOT NULL DEFAULT 'manual',
    `file_name` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `posted_by` BIGINT UNSIGNED NULL,
    `posted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `opening_stock_declarations_declaration_ref_key`(`declaration_ref`),
    INDEX `opening_stock_declarations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opening_stock_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `declaration_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `lot_no` VARCHAR(100) NOT NULL,
    `manufacture_date` DATE NULL,
    `expiry_date` DATE NULL,
    `quantity_base` DECIMAL(15, 4) NOT NULL,
    `unit_used` VARCHAR(50) NOT NULL,
    `quantity_display` DECIMAL(15, 4) NOT NULL,
    `unit_price_per_kg` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `has_document` BOOLEAN NOT NULL DEFAULT false,
    `location_id` BIGINT UNSIGNED NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `opening_stock_items_product_id_idx`(`product_id`),
    INDEX `opening_stock_items_expiry_date_idx`(`expiry_date`),
    UNIQUE INDEX `opening_stock_items_declaration_id_product_id_lot_no_key`(`declaration_id`, `product_id`, `lot_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `opening_stock_declarations` ADD CONSTRAINT `opening_stock_declarations_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opening_stock_declarations` ADD CONSTRAINT `opening_stock_declarations_posted_by_fkey`
    FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opening_stock_items` ADD CONSTRAINT `opening_stock_items_declaration_id_fkey`
    FOREIGN KEY (`declaration_id`) REFERENCES `opening_stock_declarations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opening_stock_items` ADD CONSTRAINT `opening_stock_items_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opening_stock_items` ADD CONSTRAINT `opening_stock_items_location_id_fkey`
    FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
