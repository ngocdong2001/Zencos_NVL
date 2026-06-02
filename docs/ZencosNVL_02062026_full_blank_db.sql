/*
 Navicat Premium Data Transfer

 Source Server         : ZencosNVL_conn
 Source Server Type    : MySQL
 Source Server Version : 80408
 Source Host           : localhost:3306
 Source Schema         : ZencosNVL

 Target Server Type    : MySQL
 Target Server Version : 80408
 File Encoding         : 65001

 Date: 02/06/2026 18:44:27
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for batch_documents
-- ----------------------------
DROP TABLE IF EXISTS `batch_documents`;
CREATE TABLE `batch_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('Invoice','COA','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `batch_documents_batch_id_fkey`(`batch_id` ASC) USING BTREE,
  INDEX `batch_documents_uploaded_by_fkey`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `batch_documents_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `batch_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of batch_documents
-- ----------------------------

-- ----------------------------
-- Table structure for batches
-- ----------------------------
DROP TABLE IF EXISTS `batches`;
CREATE TABLE `batches`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `supplier_id` bigint UNSIGNED NULL DEFAULT NULL,
  `inbound_receipt_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `invoice_date` date NULL DEFAULT NULL,
  `unit_price_per_kg` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `received_qty_base` decimal(15, 4) NOT NULL,
  `current_qty_base` decimal(15, 4) NOT NULL DEFAULT 0.0000 COMMENT 'Running balance per batch. Initialized from received_qty_base + existing transactions. Updated atomically with inventory_transactions via prisma.$transaction.',
  `purchase_unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `purchase_qty` decimal(15, 4) NULL DEFAULT NULL,
  `manufacture_date` date NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `status` enum('available','quarantine','rejected','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `manufacturer_id` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `batches_product_id_status_expiry_date_idx`(`product_id` ASC, `status` ASC, `expiry_date` ASC) USING BTREE,
  INDEX `batches_supplier_id_fkey`(`supplier_id` ASC) USING BTREE,
  INDEX `batches_inbound_receipt_item_id_idx`(`inbound_receipt_item_id` ASC) USING BTREE,
  INDEX `batches_manufacturer_id_fkey`(`manufacturer_id` ASC) USING BTREE,
  CONSTRAINT `batches_inbound_receipt_item_id_fkey` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batches_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 72 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of batches
-- ----------------------------

-- ----------------------------
-- Table structure for customers
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `customers_code_key`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of customers
-- ----------------------------

-- ----------------------------
-- Table structure for export_order_history
-- ----------------------------
DROP TABLE IF EXISTS `export_order_history`;
CREATE TABLE `export_order_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint UNSIGNED NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint UNSIGNED NOT NULL,
  `data` json NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `export_order_history_export_order_id_idx`(`export_order_id` ASC) USING BTREE,
  INDEX `export_order_history_created_at_idx`(`created_at` ASC) USING BTREE,
  INDEX `export_order_history_actor_id_fkey`(`actor_id` ASC) USING BTREE,
  CONSTRAINT `export_order_history_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_order_history_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 43 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_order_history
-- ----------------------------

-- ----------------------------
-- Table structure for export_order_items
-- ----------------------------
DROP TABLE IF EXISTS `export_order_items`;
CREATE TABLE `export_order_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint UNSIGNED NOT NULL,
  `batch_id` bigint UNSIGNED NULL DEFAULT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
  `unit_price_snapshot` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `export_order_items_export_order_id_fkey`(`export_order_id` ASC) USING BTREE,
  INDEX `export_order_items_batch_id_fkey`(`batch_id` ASC) USING BTREE,
  INDEX `export_order_items_product_id_fkey`(`product_id` ASC) USING BTREE,
  CONSTRAINT `export_order_items_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_order_items_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `export_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 69 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_order_items
-- ----------------------------

-- ----------------------------
-- Table structure for export_orders
-- ----------------------------
DROP TABLE IF EXISTS `export_orders`;
CREATE TABLE `export_orders`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` bigint UNSIGNED NULL DEFAULT NULL,
  `source_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `adjusted_by_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `exported_at` datetime(3) NULL DEFAULT NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `source_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `export_orders_source_order_id_key`(`source_order_id` ASC) USING BTREE,
  UNIQUE INDEX `export_orders_adjusted_by_order_id_key`(`adjusted_by_order_id` ASC) USING BTREE,
  INDEX `export_orders_customer_id_fkey`(`customer_id` ASC) USING BTREE,
  INDEX `export_orders_created_by_fkey`(`created_by` ASC) USING BTREE,
  INDEX `export_orders_source_order_id_idx`(`source_order_id` ASC) USING BTREE,
  INDEX `export_orders_adjusted_by_order_id_idx`(`adjusted_by_order_id` ASC) USING BTREE,
  INDEX `export_orders_source_location_id_idx`(`source_location_id` ASC) USING BTREE,
  CONSTRAINT `export_orders_adjusted_by_order_id_fkey` FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_source_location_id_fkey` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 27 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_orders
-- ----------------------------

-- ----------------------------
-- Table structure for inbound_receipt_history
-- ----------------------------
DROP TABLE IF EXISTS `inbound_receipt_history`;
CREATE TABLE `inbound_receipt_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` bigint UNSIGNED NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint UNSIGNED NOT NULL,
  `data` json NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `inbound_receipt_history_inbound_receipt_id_idx`(`inbound_receipt_id` ASC) USING BTREE,
  INDEX `inbound_receipt_history_created_at_idx`(`created_at` ASC) USING BTREE,
  INDEX `inbound_receipt_history_actor_id_fkey`(`actor_id` ASC) USING BTREE,
  CONSTRAINT `inbound_receipt_history_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_history_inbound_receipt_id_fkey` FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 170 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_history
-- ----------------------------

-- ----------------------------
-- Table structure for inbound_receipt_item_documents
-- ----------------------------
DROP TABLE IF EXISTS `inbound_receipt_item_documents`;
CREATE TABLE `inbound_receipt_item_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `inbound_receipt_item_documents_item_id_idx`(`item_id` ASC) USING BTREE,
  INDEX `inbound_receipt_item_documents_uploaded_by_fkey`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `inbound_receipt_item_documents_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_item_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 83 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_item_documents
-- ----------------------------

-- ----------------------------
-- Table structure for inbound_receipt_items
-- ----------------------------
DROP TABLE IF EXISTS `inbound_receipt_items`;
CREATE TABLE `inbound_receipt_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` bigint UNSIGNED NOT NULL,
  `purchase_request_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `invoice_date` date NULL DEFAULT NULL,
  `manufacture_date` date NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
  `unit_price_per_kg` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `line_amount` decimal(18, 2) NOT NULL DEFAULT 0.00,
  `qc_status` enum('pending','passed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `has_document` tinyint(1) NOT NULL DEFAULT 0,
  `posted_batch_id` bigint UNSIGNED NULL DEFAULT NULL,
  `posted_tx_id` bigint UNSIGNED NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `manufacturer_id` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `inbound_receipt_items_inbound_receipt_id_product_id_lot_no_key`(`inbound_receipt_id` ASC, `product_id` ASC, `lot_no` ASC) USING BTREE,
  INDEX `inbound_receipt_items_product_id_idx`(`product_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_purchase_request_item_id_idx`(`purchase_request_item_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_posted_batch_id_idx`(`posted_batch_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_posted_tx_id_idx`(`posted_tx_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_expiry_date_idx`(`expiry_date` ASC) USING BTREE,
  INDEX `inbound_receipt_items_manufacturer_id_fkey`(`manufacturer_id` ASC) USING BTREE,
  CONSTRAINT `inbound_receipt_items_inbound_receipt_id_fkey` FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_batch_id_fkey` FOREIGN KEY (`posted_batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_tx_id_fkey` FOREIGN KEY (`posted_tx_id`) REFERENCES `inventory_transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 46 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_items
-- ----------------------------

-- ----------------------------
-- Table structure for inbound_receipts
-- ----------------------------
DROP TABLE IF EXISTS `inbound_receipts`;
CREATE TABLE `inbound_receipts`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_request_id` bigint UNSIGNED NULL DEFAULT NULL,
  `source_receipt_id` bigint UNSIGNED NULL DEFAULT NULL,
  `adjusted_by_receipt_id` bigint UNSIGNED NULL DEFAULT NULL,
  `supplier_id` bigint UNSIGNED NULL DEFAULT NULL,
  `receiving_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `status` enum('draft','pending_qc','posted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `expected_date` date NULL DEFAULT NULL,
  `received_at` datetime(3) NULL DEFAULT NULL,
  `qc_checked_at` datetime(3) NULL DEFAULT NULL,
  `current_step` tinyint UNSIGNED NOT NULL DEFAULT 2,
  `created_by` bigint UNSIGNED NOT NULL,
  `posted_by` bigint UNSIGNED NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `inbound_receipts_receipt_ref_key`(`receipt_ref` ASC) USING BTREE,
  UNIQUE INDEX `inbound_receipts_source_receipt_id_key`(`source_receipt_id` ASC) USING BTREE,
  UNIQUE INDEX `inbound_receipts_adjusted_by_receipt_id_key`(`adjusted_by_receipt_id` ASC) USING BTREE,
  INDEX `inbound_receipts_status_idx`(`status` ASC) USING BTREE,
  INDEX `inbound_receipts_purchase_request_id_idx`(`purchase_request_id` ASC) USING BTREE,
  INDEX `inbound_receipts_supplier_id_idx`(`supplier_id` ASC) USING BTREE,
  INDEX `inbound_receipts_receiving_location_id_idx`(`receiving_location_id` ASC) USING BTREE,
  INDEX `inbound_receipts_created_by_fkey`(`created_by` ASC) USING BTREE,
  INDEX `inbound_receipts_posted_by_fkey`(`posted_by` ASC) USING BTREE,
  INDEX `inbound_receipts_source_receipt_id_idx`(`source_receipt_id` ASC) USING BTREE,
  INDEX `inbound_receipts_adjusted_by_receipt_id_idx`(`adjusted_by_receipt_id` ASC) USING BTREE,
  CONSTRAINT `inbound_receipts_adjusted_by_receipt_id_fkey` FOREIGN KEY (`adjusted_by_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_posted_by_fkey` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_receiving_location_id_fkey` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_source_receipt_id_fkey` FOREIGN KEY (`source_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 52 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipts
-- ----------------------------

-- ----------------------------
-- Table structure for inventory_locations
-- ----------------------------
DROP TABLE IF EXISTS `inventory_locations`;
CREATE TABLE `inventory_locations`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `inventory_locations_code_key`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inventory_locations
-- ----------------------------
INSERT INTO `inventory_locations` VALUES (1, 'LOC-001', 'Kho Long An', 'Kho mặc định', NULL, '2026-03-30 14:37:00.556', '2026-05-05 16:52:26.162');
INSERT INTO `inventory_locations` VALUES (3, 'LOC-002', 'Kho Vĩnh Long', 'Không sử dụng', NULL, '2026-03-31 21:50:14.736', '2026-05-05 16:52:25.336');

-- ----------------------------
-- Table structure for inventory_transactions
-- ----------------------------
DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `export_order_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `inbound_receipt_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `production_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `warehouse_location_id` bigint UNSIGNED NOT NULL,
  `type` enum('import','export','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `is_cancelled` tinyint(1) NOT NULL DEFAULT 0,
  `transaction_date` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `inventory_transactions_user_id_fkey`(`user_id` ASC) USING BTREE,
  INDEX `inventory_transactions_export_order_item_id_fkey`(`export_order_item_id` ASC) USING BTREE,
  INDEX `inventory_transactions_inbound_receipt_item_id_idx`(`inbound_receipt_item_id` ASC) USING BTREE,
  INDEX `inventory_transactions_batch_id_transaction_date_type_idx`(`batch_id` ASC, `transaction_date` ASC, `type` ASC) USING BTREE,
  INDEX `inventory_transactions_production_order_id_idx`(`production_order_id` ASC) USING BTREE,
  INDEX `inventory_transactions_warehouse_location_id_idx`(`warehouse_location_id` ASC) USING BTREE,
  CONSTRAINT `inventory_transactions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_inbound_receipt_item_id_fkey` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 184 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inventory_transactions
-- ----------------------------

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json NOT NULL,
  `read_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `notifications_user_id_fkey`(`user_id` ASC) USING BTREE,
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 57 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of notifications
-- ----------------------------

-- ----------------------------
-- Table structure for opening_stock_declarations
-- ----------------------------
DROP TABLE IF EXISTS `opening_stock_declarations`;
CREATE TABLE `opening_stock_declarations`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `declaration_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','posted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `source` enum('manual','excel') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `posted_by` bigint UNSIGNED NULL DEFAULT NULL,
  `posted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `opening_stock_declarations_declaration_ref_key`(`declaration_ref` ASC) USING BTREE,
  INDEX `opening_stock_declarations_status_idx`(`status` ASC) USING BTREE,
  INDEX `opening_stock_declarations_created_by_fkey`(`created_by` ASC) USING BTREE,
  INDEX `opening_stock_declarations_posted_by_fkey`(`posted_by` ASC) USING BTREE,
  CONSTRAINT `opening_stock_declarations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_declarations_posted_by_fkey` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_declarations
-- ----------------------------

-- ----------------------------
-- Table structure for opening_stock_item_documents
-- ----------------------------
DROP TABLE IF EXISTS `opening_stock_item_documents`;
CREATE TABLE `opening_stock_item_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `opening_stock_item_documents_item_id_idx`(`item_id` ASC) USING BTREE,
  INDEX `opening_stock_item_documents_uploaded_by_fkey`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `opening_stock_item_documents_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `opening_stock_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_item_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 130 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_item_documents
-- ----------------------------

-- ----------------------------
-- Table structure for opening_stock_items
-- ----------------------------
DROP TABLE IF EXISTS `opening_stock_items`;
CREATE TABLE `opening_stock_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `declaration_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `opening_date` date NOT NULL,
  `invoice_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `invoice_date` date NULL DEFAULT NULL,
  `supplier_id` bigint UNSIGNED NULL DEFAULT NULL,
  `manufacture_date` date NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
  `unit_price_per_kg` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `unit_price_value` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `unit_price_unit_id` bigint UNSIGNED NULL DEFAULT NULL,
  `unit_price_conversion_to_base` decimal(15, 4) NOT NULL DEFAULT 1.0000,
  `line_amount` decimal(18, 2) NOT NULL DEFAULT 0.00,
  `has_document` tinyint(1) NOT NULL DEFAULT 0,
  `posting_status` enum('draft','posted','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `posted_batch_id` bigint UNSIGNED NULL DEFAULT NULL,
  `posted_tx_id` bigint UNSIGNED NULL DEFAULT NULL,
  `posted_at` datetime(3) NULL DEFAULT NULL,
  `location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `opening_stock_items_declaration_id_product_id_lot_no_key`(`declaration_id` ASC, `product_id` ASC, `lot_no` ASC) USING BTREE,
  INDEX `opening_stock_items_product_id_idx`(`product_id` ASC) USING BTREE,
  INDEX `opening_stock_items_expiry_date_idx`(`expiry_date` ASC) USING BTREE,
  INDEX `opening_stock_items_location_id_fkey`(`location_id` ASC) USING BTREE,
  INDEX `opening_stock_items_unit_price_unit_id_idx`(`unit_price_unit_id` ASC) USING BTREE,
  INDEX `opening_stock_items_supplier_id_idx`(`supplier_id` ASC) USING BTREE,
  INDEX `opening_stock_items_posting_status_idx`(`posting_status` ASC) USING BTREE,
  INDEX `opening_stock_items_posted_batch_id_idx`(`posted_batch_id` ASC) USING BTREE,
  INDEX `opening_stock_items_posted_tx_id_idx`(`posted_tx_id` ASC) USING BTREE,
  CONSTRAINT `opening_stock_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `opening_stock_declarations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_unit_price_unit_id_fkey` FOREIGN KEY (`unit_price_unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 66 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_items
-- ----------------------------

-- ----------------------------
-- Table structure for password_reset_tokens
-- ----------------------------
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `password_reset_tokens_token_key`(`token` ASC) USING BTREE,
  INDEX `password_reset_tokens_user_id_idx`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of password_reset_tokens
-- ----------------------------

-- ----------------------------
-- Table structure for product_classifications
-- ----------------------------
DROP TABLE IF EXISTS `product_classifications`;
CREATE TABLE `product_classifications`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `product_classifications_code_key`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 25 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_classifications
-- ----------------------------
INSERT INTO `product_classifications` VALUES (1, 'RAW_MATERIAL', 'Hóa chất pha chế', 'Danh mục mặc định', NULL, '2026-03-30 14:31:30.890', '2026-03-31 22:34:30.583');
INSERT INTO `product_classifications` VALUES (2, 'CLS-TEST', 'Phan loai test', 'updated', '2026-03-30 14:35:45.109', '2026-03-30 14:35:35.002', '2026-03-30 14:35:45.109');
INSERT INTO `product_classifications` VALUES (3, 'CLA-2', 'Lít', 'Dùng cho dạng dung dịch lỏng', '2026-03-31 21:46:46.416', '2026-03-30 14:48:43.866', '2026-03-31 21:46:46.416');
INSERT INTO `product_classifications` VALUES (4, 'CLA-001', 'NVL loại 2', 'Danh mục mặc định', '2026-03-31 17:29:45.264', '2026-03-31 11:40:46.926', '2026-03-31 17:29:45.264');
INSERT INTO `product_classifications` VALUES (5, 'PACK', 'Bao bì', 'Bao bì giấy cho hộp kem', NULL, '2026-03-31 17:15:16.004', '2026-03-31 22:34:25.160');
INSERT INTO `product_classifications` VALUES (6, 'RAW1', 'NVL loại 1', '', NULL, '2026-04-01 13:36:00.020', '2026-04-01 20:57:01.637');
INSERT INTO `product_classifications` VALUES (7, 'RAW2', 'NVL loại 2', 'test NVL', NULL, '2026-04-01 13:36:00.039', '2026-06-02 15:32:23.022');
INSERT INTO `product_classifications` VALUES (10, 'WATER', 'NƯỚC TINH KHIẾT', '', NULL, '2026-04-01 20:57:51.778', '2026-06-02 15:32:23.620');

-- ----------------------------
-- Table structure for product_documents
-- ----------------------------
DROP TABLE IF EXISTS `product_documents`;
CREATE TABLE `product_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('MSDS','Spec','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NULL DEFAULT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `valid_until` date NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `product_documents_product_id_fkey`(`product_id` ASC) USING BTREE,
  INDEX `product_documents_uploaded_by_fkey`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `product_documents_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_documents
-- ----------------------------

-- ----------------------------
-- Table structure for product_inci_names
-- ----------------------------
DROP TABLE IF EXISTS `product_inci_names`;
CREATE TABLE `product_inci_names`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `inci_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `product_inci_names_product_id_idx`(`product_id` ASC) USING BTREE,
  CONSTRAINT `product_inci_names_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 41 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_inci_names
-- ----------------------------

-- ----------------------------
-- Table structure for product_manufacturers
-- ----------------------------
DROP TABLE IF EXISTS `product_manufacturers`;
CREATE TABLE `product_manufacturers`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `contact_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `product_manufacturers_product_id_idx`(`product_id` ASC) USING BTREE,
  CONSTRAINT `product_manufacturers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_manufacturers
-- ----------------------------

-- ----------------------------
-- Table structure for product_suppliers
-- ----------------------------
DROP TABLE IF EXISTS `product_suppliers`;
CREATE TABLE `product_suppliers`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `supplier_id` bigint UNSIGNED NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `product_suppliers_product_id_supplier_id_key`(`product_id` ASC, `supplier_id` ASC) USING BTREE,
  INDEX `product_suppliers_product_id_idx`(`product_id` ASC) USING BTREE,
  INDEX `product_suppliers_supplier_id_idx`(`supplier_id` ASC) USING BTREE,
  CONSTRAINT `product_suppliers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_suppliers_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_suppliers
-- ----------------------------

-- ----------------------------
-- Table structure for product_units
-- ----------------------------
DROP TABLE IF EXISTS `product_units`;
CREATE TABLE `product_units`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `parent_unit_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT 'id của đơn vị cha',
  `unit_code_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `unit_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `conversion_to_base` decimal(15, 4) NOT NULL,
  `is_purchase_unit` tinyint(1) NOT NULL DEFAULT 0,
  `is_default_display` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `product_units_product_id_unit_name_key`(`product_id` ASC, `unit_name` ASC) USING BTREE,
  INDEX `product_units_parent_unit_id_fkey`(`parent_unit_id` ASC) USING BTREE,
  CONSTRAINT `product_units_parent_unit_id_fkey` FOREIGN KEY (`parent_unit_id`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `product_units_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_units
-- ----------------------------
INSERT INTO `product_units` VALUES (2, NULL, NULL, 'g', 'Gram', 'Dạng bột', 1.0000, 0, 1, '2026-03-31 20:49:00.670', '2026-04-21 15:16:05.866');
INSERT INTO `product_units` VALUES (3, NULL, 4, 'L', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1000.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:38.219');
INSERT INTO `product_units` VALUES (4, NULL, NULL, 'ml', 'Mili lít', 'test test', 1.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:29.255');
INSERT INTO `product_units` VALUES (7, NULL, NULL, NULL, 'Cái', NULL, 1.0000, 0, 0, '2026-05-05 13:31:15.463', '2026-05-05 13:31:15.463');
INSERT INTO `product_units` VALUES (8, NULL, NULL, 'Hộp', 'Hộp', '', 1.0000, 0, 0, '2026-05-05 13:31:15.486', '2026-06-02 15:37:07.045');
INSERT INTO `product_units` VALUES (9, NULL, NULL, NULL, 'Bộ', NULL, 1.0000, 0, 0, '2026-05-05 13:31:15.501', '2026-05-05 13:31:15.501');

-- ----------------------------
-- Table structure for production_bom_lines
-- ----------------------------
DROP TABLE IF EXISTS `production_bom_lines`;
CREATE TABLE `production_bom_lines`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `bom_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL DEFAULT 0,
  `line_type` enum('nvl','btp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nvl',
  `product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `qty_per_base` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `waste_qty` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `production_bom_lines_bom_id_idx`(`bom_id` ASC) USING BTREE,
  INDEX `production_bom_lines_product_id_fkey`(`product_id` ASC) USING BTREE,
  CONSTRAINT `production_bom_lines_bom_id_fkey` FOREIGN KEY (`bom_id`) REFERENCES `production_boms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_bom_lines_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_bom_lines
-- ----------------------------

-- ----------------------------
-- Table structure for production_boms
-- ----------------------------
DROP TABLE IF EXISTS `production_boms`;
CREATE TABLE `production_boms`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `bom_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `bom_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bom_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `output_product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `base_qty` decimal(15, 4) NOT NULL DEFAULT 1.0000,
  `version` smallint UNSIGNED NOT NULL DEFAULT 1,
  `status` enum('draft','submitted','approved','inactive','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `effective_from` date NULL DEFAULT NULL,
  `effective_to` date NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `approved_by` bigint UNSIGNED NULL DEFAULT NULL,
  `approved_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `production_boms_status_idx`(`status` ASC) USING BTREE,
  INDEX `production_boms_output_product_id_idx`(`output_product_id` ASC) USING BTREE,
  INDEX `production_boms_created_by_idx`(`created_by` ASC) USING BTREE,
  INDEX `production_boms_approved_by_fkey`(`approved_by` ASC) USING BTREE,
  CONSTRAINT `production_boms_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `production_boms_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_boms_output_product_id_fkey` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_boms
-- ----------------------------

-- ----------------------------
-- Table structure for production_order_lines
-- ----------------------------
DROP TABLE IF EXISTS `production_order_lines`;
CREATE TABLE `production_order_lines`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint UNSIGNED NOT NULL,
  `step` tinyint NOT NULL,
  `direction` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `export_date` datetime(3) NULL DEFAULT NULL,
  `planned_qty` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `actual_qty` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `waste_qty` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `quality_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `output_product_id` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `production_order_lines_order_id_step_idx`(`order_id` ASC, `step` ASC) USING BTREE,
  INDEX `production_order_lines_product_id_fkey`(`product_id` ASC) USING BTREE,
  INDEX `production_order_lines_location_id_fkey`(`location_id` ASC) USING BTREE,
  INDEX `idx_pol_output_product`(`output_product_id` ASC) USING BTREE,
  CONSTRAINT `fk_pol_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_order_lines_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `production_order_lines_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_order_lines_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 548 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_order_lines
-- ----------------------------

-- ----------------------------
-- Table structure for production_order_logs
-- ----------------------------
DROP TABLE IF EXISTS `production_order_logs`;
CREATE TABLE `production_order_logs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `user_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `action` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `log_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `step` tinyint UNSIGNED NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `production_order_logs_order_id_idx`(`order_id` ASC) USING BTREE,
  INDEX `production_order_logs_user_id_fkey`(`user_id` ASC) USING BTREE,
  CONSTRAINT `production_order_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_order_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 397 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_order_logs
-- ----------------------------

-- ----------------------------
-- Table structure for production_orders
-- ----------------------------
DROP TABLE IF EXISTS `production_orders`;
CREATE TABLE `production_orders`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `issued_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sku_product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `sku_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `sku_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `product_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `current_step` tinyint NOT NULL DEFAULT 1,
  `status` enum('draft','in_progress','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `output_product_id` bigint UNSIGNED NULL DEFAULT NULL,
  `nvl_exported_at` datetime(3) NULL DEFAULT NULL,
  `step1_processed_at` datetime NULL DEFAULT NULL,
  `step2_processed_at` datetime NULL DEFAULT NULL,
  `step3_processed_at` datetime NULL DEFAULT NULL,
  `step4_processed_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `production_orders_status_idx`(`status` ASC) USING BTREE,
  INDEX `production_orders_issued_at_idx`(`issued_at` ASC) USING BTREE,
  INDEX `production_orders_created_by_idx`(`created_by` ASC) USING BTREE,
  INDEX `production_orders_sku_product_id_idx`(`sku_product_id` ASC) USING BTREE,
  INDEX `idx_prod_order_output_product`(`output_product_id` ASC) USING BTREE,
  CONSTRAINT `fk_prod_order_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_orders_sku_product_id_fkey` FOREIGN KEY (`sku_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_orders
-- ----------------------------

-- ----------------------------
-- Table structure for production_output_transactions
-- ----------------------------
DROP TABLE IF EXISTS `production_output_transactions`;
CREATE TABLE `production_output_transactions`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `tp_export_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `output_product_id` bigint UNSIGNED NOT NULL,
  `type` enum('import_from_production','export_to_sale','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `warehouse_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `batch_lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `batch_expiry_date` date NULL DEFAULT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_production_order_id`(`production_order_id` ASC) USING BTREE,
  INDEX `idx_output_product_transaction`(`output_product_id` ASC, `transaction_date` ASC, `type` ASC) USING BTREE,
  INDEX `warehouse_location_id`(`warehouse_location_id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_production_output_transactions_tp_export_order_id`(`tp_export_order_id` ASC) USING BTREE,
  CONSTRAINT `production_output_transactions_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_2` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_3` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_5` FOREIGN KEY (`tp_export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 22 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_output_transactions
-- ----------------------------

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inci_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `has_expiry` tinyint(1) NOT NULL DEFAULT 1,
  `use_fefo` tinyint(1) NOT NULL DEFAULT 1,
  `base_unit` bigint UNSIGNED NOT NULL,
  `order_unit` bigint UNSIGNED NULL DEFAULT NULL,
  `min_stock_level` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `product_type` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `products_code_key`(`code` ASC) USING BTREE,
  INDEX `products_order_unit_idx`(`order_unit` ASC) USING BTREE,
  INDEX `products_base_unit_fkey`(`base_unit` ASC) USING BTREE,
  INDEX `products_product_type_fkey`(`product_type` ASC) USING BTREE,
  CONSTRAINT `products_base_unit_fkey` FOREIGN KEY (`base_unit`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_order_unit_fkey` FOREIGN KEY (`order_unit`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_product_type_fkey` FOREIGN KEY (`product_type`) REFERENCES `product_classifications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 76 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------

-- ----------------------------
-- Table structure for products_outputs
-- ----------------------------
DROP TABLE IF EXISTS `products_outputs`;
CREATE TABLE `products_outputs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `output_type` enum('finished','semi_finished') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_po_code`(`code` ASC) USING BTREE,
  INDEX `idx_po_output_type`(`output_type` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products_outputs
-- ----------------------------

-- ----------------------------
-- Table structure for purchase_request_items
-- ----------------------------
DROP TABLE IF EXISTS `purchase_request_items`;
CREATE TABLE `purchase_request_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `purchase_request_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `export_order_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `quantity_needed_base` decimal(15, 4) NOT NULL,
  `received_qty_base` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `unit_display` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
  `unit_price` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `purchase_request_items_purchase_request_id_fkey`(`purchase_request_id` ASC) USING BTREE,
  INDEX `purchase_request_items_product_id_fkey`(`product_id` ASC) USING BTREE,
  INDEX `purchase_request_items_export_order_item_id_fkey`(`export_order_item_id` ASC) USING BTREE,
  CONSTRAINT `purchase_request_items_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_request_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_request_items_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 89 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of purchase_request_items
-- ----------------------------

-- ----------------------------
-- Table structure for purchase_requests
-- ----------------------------
DROP TABLE IF EXISTS `purchase_requests`;
CREATE TABLE `purchase_requests`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `request_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` bigint UNSIGNED NOT NULL,
  `approved_by` bigint UNSIGNED NULL DEFAULT NULL,
  `supplier_id` bigint UNSIGNED NULL DEFAULT NULL,
  `receiving_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `status` enum('draft','submitted','approved','ordered','partially_received','received','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `expected_date` date NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `submitted_at` datetime(3) NULL DEFAULT NULL,
  `approved_at` datetime(3) NULL DEFAULT NULL,
  `ordered_at` datetime(3) NULL DEFAULT NULL,
  `received_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `purchase_requests_request_ref_key`(`request_ref` ASC) USING BTREE,
  INDEX `purchase_requests_status_idx`(`status` ASC) USING BTREE,
  INDEX `purchase_requests_export_order_id_idx`(`export_order_id` ASC) USING BTREE,
  INDEX `purchase_requests_requested_by_fkey`(`requested_by` ASC) USING BTREE,
  INDEX `purchase_requests_approved_by_fkey`(`approved_by` ASC) USING BTREE,
  INDEX `purchase_requests_supplier_id_fkey`(`supplier_id` ASC) USING BTREE,
  INDEX `idx_purchase_requests_receiving_location_id`(`receiving_location_id` ASC) USING BTREE,
  CONSTRAINT `purchase_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_receiving_location_id_fkey` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 29 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of purchase_requests
-- ----------------------------

-- ----------------------------
-- Table structure for suppliers
-- ----------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `contact_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `suppliers_code_key`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 30 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of suppliers
-- ----------------------------

-- ----------------------------
-- Table structure for tp_export_order_history
-- ----------------------------
DROP TABLE IF EXISTS `tp_export_order_history`;
CREATE TABLE `tp_export_order_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint UNSIGNED NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint UNSIGNED NOT NULL,
  `data` json NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `tp_export_order_history_export_order_id_idx`(`export_order_id` ASC) USING BTREE,
  INDEX `tp_export_order_history_created_at_idx`(`created_at` ASC) USING BTREE,
  INDEX `fk_tp_history_actor`(`actor_id` ASC) USING BTREE,
  CONSTRAINT `fk_tp_history_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_history_order` FOREIGN KEY (`export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_order_history
-- ----------------------------

-- ----------------------------
-- Table structure for tp_export_order_items
-- ----------------------------
DROP TABLE IF EXISTS `tp_export_order_items`;
CREATE TABLE `tp_export_order_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint UNSIGNED NOT NULL,
  `output_product_id` bigint UNSIGNED NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `warehouse_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `tp_export_order_items_export_order_id_idx`(`export_order_id` ASC) USING BTREE,
  INDEX `tp_export_order_items_output_product_id_idx`(`output_product_id` ASC) USING BTREE,
  INDEX `fk_tp_item_location`(`warehouse_location_id` ASC) USING BTREE,
  CONSTRAINT `fk_tp_item_location` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_item_order` FOREIGN KEY (`export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_item_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_order_items
-- ----------------------------

-- ----------------------------
-- Table structure for tp_export_orders
-- ----------------------------
DROP TABLE IF EXISTS `tp_export_orders`;
CREATE TABLE `tp_export_orders`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `customer_id` bigint UNSIGNED NULL DEFAULT NULL,
  `source_location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `source_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `adjusted_by_order_id` bigint UNSIGNED NULL DEFAULT NULL,
  `exported_at` datetime(3) NULL DEFAULT NULL,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `tp_export_orders_source_order_id_key`(`source_order_id` ASC) USING BTREE,
  UNIQUE INDEX `tp_export_orders_adjusted_by_order_id_key`(`adjusted_by_order_id` ASC) USING BTREE,
  INDEX `tp_export_orders_source_order_id_idx`(`source_order_id` ASC) USING BTREE,
  INDEX `tp_export_orders_adjusted_by_order_id_idx`(`adjusted_by_order_id` ASC) USING BTREE,
  INDEX `tp_export_orders_source_location_id_idx`(`source_location_id` ASC) USING BTREE,
  INDEX `fk_tp_export_customer`(`customer_id` ASC) USING BTREE,
  INDEX `fk_tp_export_created_by`(`created_by` ASC) USING BTREE,
  CONSTRAINT `fk_tp_export_adjusted_by` FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_location` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_source_order` FOREIGN KEY (`source_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_orders
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'warehouse_staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_email_key`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'admin@zencos.local', '$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu', 'Admin Zencos', 'admin', 1, '2026-03-30 14:30:07.287', '2026-03-30 14:30:07.287', NULL);
INSERT INTO `users` VALUES (2, 'admin@zencos.vn', '$2a$10$Ew87NqAXsVlUb5OI48J.JOo9tBb2vXWqGejpxcD0TmMMMHy31ADEO', 'Administrator', 'admin', 1, '2026-05-05 09:28:51.700', '2026-06-01 07:22:50.997', NULL);
INSERT INTO `users` VALUES (4, 'muahang@zencos.vn', '$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu', 'Nguyen Van Mua Hang', 'warehouse_manager', 1, '2026-05-05 12:51:45.729', '2026-05-05 12:53:36.856', NULL);

SET FOREIGN_KEY_CHECKS = 1;
