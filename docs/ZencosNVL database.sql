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

 Date: 03/04/2026 15:16:54
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
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `invoice_date` date NULL DEFAULT NULL,
  `unit_price_per_kg` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `received_qty_base` decimal(15, 4) NOT NULL,
  `purchase_unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `purchase_qty` decimal(15, 4) NULL DEFAULT NULL,
  `manufacture_date` date NULL DEFAULT NULL,
  `expiry_date` date NULL DEFAULT NULL,
  `status` enum('available','quarantine','rejected','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `batches_product_id_status_expiry_date_idx`(`product_id` ASC, `status` ASC, `expiry_date` ASC) USING BTREE,
  INDEX `batches_supplier_id_fkey`(`supplier_id` ASC) USING BTREE,
  CONSTRAINT `batches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of batches
-- ----------------------------

-- ----------------------------
-- Table structure for catalog_units
-- ----------------------------
DROP TABLE IF EXISTS `catalog_units`;
CREATE TABLE `catalog_units`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_catalog_units_code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of catalog_units
-- ----------------------------
INSERT INTO `catalog_units` VALUES (1, 'GR', 'Gram', 'Dạng bột, rắn', NULL, '2026-03-30 14:31:30.902', '2026-03-31 14:31:26.365');
INSERT INTO `catalog_units` VALUES (2, 'U-TEST', 'Unit test', 'updated', '2026-03-30 14:35:45.152', '2026-03-30 14:35:35.057', '2026-03-30 14:35:45.152');
INSERT INTO `catalog_units` VALUES (3, 'L', 'Lít', 'Đo dung dịch lỏng', NULL, '2026-03-31 11:41:45.822', '2026-03-31 11:41:45.822');
INSERT INTO `catalog_units` VALUES (4, 'UNI-001', 'Kg', '', NULL, '2026-03-31 20:22:25.215', '2026-03-31 20:22:25.215');

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
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of customers
-- ----------------------------
INSERT INTO `customers` VALUES (1, 'CUS-001', 'Khach Hang A', '091364551', 'khachA@example.com', 'HCM', 'Demo', NULL, '2026-03-30 14:30:07.335', '2026-04-01 13:47:13.212');
INSERT INTO `customers` VALUES (2, 'CUS-002', 'Khách hàng B', '090999999', 'khachB@gmail.com', 'HCM', 'Demo', NULL, '2026-03-31 11:41:11.342', '2026-04-01 13:47:13.409');
INSERT INTO `customers` VALUES (3, 'CUS-003', 'Nguyễn Văn KH', '0978999555', '', 'Long An', 'Demo', NULL, '2026-03-31 22:03:03.791', '2026-04-01 13:47:13.760');
INSERT INTO `customers` VALUES (4, 'CUS-004', 'Nguyễn Văn KH6', '', '', 'Long An', 'Demo', NULL, '2026-04-01 13:39:29.849', '2026-04-01 13:47:14.112');
INSERT INTO `customers` VALUES (5, 'CUS-005', 'Trần 7', '', 'khachB@gmail.com', 'HCM', 'Demo', NULL, '2026-04-01 13:39:29.873', '2026-04-01 13:47:14.323');
INSERT INTO `customers` VALUES (6, 'CUS-006', 'Bá 8', '', 'khachA@example.com', 'HCM', 'Demo', '2026-04-01 13:39:43.310', '2026-04-01 13:39:29.893', '2026-04-01 13:39:43.310');
INSERT INTO `customers` VALUES (7, 'CUS-007', 'Nguyễn Văn KH6', '978999555', '', 'Long An', 'Demo', NULL, '2026-04-01 13:46:48.848', '2026-04-01 14:02:43.295');
INSERT INTO `customers` VALUES (8, 'CUS-008', 'Trần 7', '90999999', 'khachB@gmail.com', 'HCM', 'Demo', NULL, '2026-04-01 13:46:48.874', '2026-04-01 13:59:25.061');
INSERT INTO `customers` VALUES (9, 'CUS-009', 'Bá 8', '91364551', 'khachA@example.com', 'HCM', 'Demo', NULL, '2026-04-01 13:46:48.890', '2026-04-01 20:11:52.817');
INSERT INTO `customers` VALUES (10, 'CUS-6', 'Nguyễn Văn KH6', '978999555', '', 'Long An', 'Demo', '2026-04-01 20:11:20.186', '2026-04-01 20:10:40.285', '2026-04-01 20:11:20.186');
INSERT INTO `customers` VALUES (11, 'CUS-5', 'Trần 7', '90999999', 'khachB@gmail.com', 'HCM', 'Demo', '2026-04-01 20:11:19.848', '2026-04-01 20:10:40.304', '2026-04-01 20:11:19.848');
INSERT INTO `customers` VALUES (12, 'CUS-4', 'Bá 8', '91364551', 'khachA@example.com', 'HCM', 'Demo', '2026-04-01 20:11:19.100', '2026-04-01 20:10:40.320', '2026-04-01 20:11:19.100');

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `exported_at` datetime(3) NULL DEFAULT NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `export_orders_customer_id_fkey`(`customer_id` ASC) USING BTREE,
  INDEX `export_orders_created_by_fkey`(`created_by` ASC) USING BTREE,
  CONSTRAINT `export_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_orders
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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_inventory_locations_code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inventory_locations
-- ----------------------------
INSERT INTO `inventory_locations` VALUES (1, 'LOC-001', 'Kho Long An', 'Kho mặc định', NULL, '2026-03-30 14:37:00.556', '2026-03-31 21:50:07.770');
INSERT INTO `inventory_locations` VALUES (2, 'LOC-TEST', 'Vi tri test', 'updated', '2026-03-30 14:38:15.175', '2026-03-30 14:38:15.115', '2026-03-30 14:38:15.175');
INSERT INTO `inventory_locations` VALUES (3, 'LOC-002', 'Kho Vĩnh Long', 'Không sử dụng', NULL, '2026-03-31 21:50:14.736', '2026-03-31 21:50:22.832');
INSERT INTO `inventory_locations` VALUES (6, 'LOC-002a', 'Kho Vĩnh Long', 'Không sử dụng', '2026-04-01 21:09:54.129', '2026-04-01 21:09:48.471', '2026-04-01 21:09:54.129');
INSERT INTO `inventory_locations` VALUES (7, 'LOC-001a', 'Kho Long An', 'Kho mặc định', '2026-04-01 21:09:53.359', '2026-04-01 21:09:48.491', '2026-04-01 21:09:53.359');

-- ----------------------------
-- Table structure for inventory_transactions
-- ----------------------------
DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `export_order_item_id` bigint UNSIGNED NULL DEFAULT NULL,
  `type` enum('import','export','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_base` decimal(15, 4) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `transaction_date` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `inventory_transactions_batch_id_fkey`(`batch_id` ASC) USING BTREE,
  INDEX `inventory_transactions_user_id_fkey`(`user_id` ASC) USING BTREE,
  INDEX `inventory_transactions_export_order_item_id_fkey`(`export_order_item_id` ASC) USING BTREE,
  CONSTRAINT `inventory_transactions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_declarations
-- ----------------------------
INSERT INTO `opening_stock_declarations` VALUES (1, 'OPEN-20260402-1775145438089', 'draft', 'manual', NULL, NULL, 1, NULL, NULL, '2026-04-02 22:57:18.093', '2026-04-02 22:57:18.093');

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
  CONSTRAINT `opening_stock_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `opening_stock_declarations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_unit_price_unit_id_fkey` FOREIGN KEY (`unit_price_unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_items
-- ----------------------------
INSERT INTO `opening_stock_items` VALUES (6, 1, 14, '2223', '2026-03-31', NULL, NULL, NULL, NULL, NULL, 10.0000, 'GR', 10.0000, 5000.00, 5000.00, 2, 1.0000, 50000.00, 0, NULL, NULL, '2026-04-03 14:27:48.935', '2026-04-03 15:04:08.734');

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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_catalog_classifications_code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_classifications
-- ----------------------------
INSERT INTO `product_classifications` VALUES (1, 'RAW_MATERIAL', 'Hóa chất pha chế', 'Danh mục mặc định', NULL, '2026-03-30 14:31:30.890', '2026-03-31 22:34:30.583');
INSERT INTO `product_classifications` VALUES (2, 'CLS-TEST', 'Phan loai test', 'updated', '2026-03-30 14:35:45.109', '2026-03-30 14:35:35.002', '2026-03-30 14:35:45.109');
INSERT INTO `product_classifications` VALUES (3, 'CLA-2', 'Lít', 'Dùng cho dạng dung dịch lỏng', '2026-03-31 21:46:46.416', '2026-03-30 14:48:43.866', '2026-03-31 21:46:46.416');
INSERT INTO `product_classifications` VALUES (4, 'CLA-001', 'NVL loại 2', 'Danh mục mặc định', '2026-03-31 17:29:45.264', '2026-03-31 11:40:46.926', '2026-03-31 17:29:45.264');
INSERT INTO `product_classifications` VALUES (5, 'PACK', 'Bao bì', 'Bao bì giấy cho hộp kem', NULL, '2026-03-31 17:15:16.004', '2026-03-31 22:34:25.160');
INSERT INTO `product_classifications` VALUES (6, 'RAW1', 'NVL loại 1', '', NULL, '2026-04-01 13:36:00.020', '2026-04-01 20:57:01.637');
INSERT INTO `product_classifications` VALUES (7, 'RAW2', 'NVL loại 2', 'test NVL', NULL, '2026-04-01 13:36:00.039', '2026-04-02 21:41:22.532');
INSERT INTO `product_classifications` VALUES (10, 'WATER', 'NƯỚC TINH KHIẾT', '', NULL, '2026-04-01 20:57:51.778', '2026-04-01 20:57:51.778');

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
-- Table structure for product_units
-- ----------------------------
DROP TABLE IF EXISTS `product_units`;
CREATE TABLE `product_units`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) UNSIGNED ZEROFILL NULL DEFAULT NULL,
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
  INDEX `parent_unit_id`(`parent_unit_id` ASC) USING BTREE,
  CONSTRAINT `product_unit_product_unit_self` FOREIGN KEY (`parent_unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `product_units_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_units
-- ----------------------------
INSERT INTO `product_units` VALUES (1, NULL, 2, 'KG', 'KG', 'thể rắn', 1000.0000, 1, 0, '2026-03-31 20:48:31.312', '2026-04-02 22:10:36.296');
INSERT INTO `product_units` VALUES (2, NULL, NULL, 'GR', 'gr', 'Dạng bột', 1.0000, 0, 1, '2026-03-31 20:49:00.670', '2026-04-02 22:10:29.643');
INSERT INTO `product_units` VALUES (3, NULL, 4, 'L', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-01 13:12:49.261');
INSERT INTO `product_units` VALUES (4, NULL, NULL, 'ml', 'Mili lít', 'test test', 1000.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-01 13:18:44.157');
INSERT INTO `product_units` VALUES (6, NULL, 4, 'Ll', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1.0000, 0, 0, '2026-04-01 21:10:44.457', '2026-04-01 21:10:44.457');

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
  `base_unit` bigint(20) UNSIGNED ZEROFILL NOT NULL,
  `order_unit` bigint UNSIGNED NULL DEFAULT NULL,
  `min_stock_level` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `deleted_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `product_type` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `products_code_key`(`code` ASC) USING BTREE,
  INDEX `products_product_type_fkey`(`product_type` ASC) USING BTREE,
  INDEX `products_base_unit_fkey`(`base_unit` ASC) USING BTREE,
  INDEX `products_order_unit_idx`(`order_unit` ASC) USING BTREE,
  CONSTRAINT `products_base_unit_fkey` FOREIGN KEY (`base_unit`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_product_type_fkey` FOREIGN KEY (`product_type`) REFERENCES `product_classifications` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_product_units_fkey` FOREIGN KEY (`base_unit`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_order_unit_fkey` FOREIGN KEY (`order_unit`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 'RAW_MATERIAL', 'Glycerin 99.5%', 'Glycerin', 1, 1, 00000000000000000004, 3, 0.0000, '', NULL, '2026-03-30 14:30:07.305', '2026-04-03 10:07:39.502', 1);
INSERT INTO `products` VALUES (2, 'NVL-002', 'Vitamin E BASE', 'Vitamin E', 0, 0, 00000000000000000002, 2, 0.0000, '', '2026-03-31 10:58:16.167', '2026-03-30 14:40:09.253', '2026-03-31 10:58:16.167', 5);
INSERT INTO `products` VALUES (3, 'NVL-003', 'havchavc', 'hhhh', 0, 0, 00000000000000000002, 2, 0.0000, '', '2026-03-31 10:44:25.442', '2026-03-30 17:30:01.086', '2026-03-31 10:44:25.442', 5);
INSERT INTO `products` VALUES (4, 'NVL-004', 'Vitamin D', 'Vitamin D1', 1, 1, 00000000000000000002, 1, 0.0000, '', NULL, '2026-03-30 17:30:23.627', '2026-04-03 10:07:39.816', 1);
INSERT INTO `products` VALUES (5, 'NVL-005', 'bbbbb', 'bbbb', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-30 17:32:13.503', '2026-03-30 17:30:39.499', '2026-03-30 17:32:13.503', 1);
INSERT INTO `products` VALUES (8, 'NVL-001', 'sdfsdf', 'sdfsf', 1, 1, 00000000000000000004, 4, 0.0000, '', NULL, '2026-03-31 11:19:07.937', '2026-04-03 10:07:40.036', 5);
INSERT INTO `products` VALUES (11, 'NVL-006', 'aaa aaa', 'aaa', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-31 14:40:43.653', '2026-03-31 11:33:06.095', '2026-03-31 14:40:43.653', 1);
INSERT INTO `products` VALUES (13, 'NVL-007', 'Acid HCL 95%', 'Acid Clohydric', 1, 1, 00000000000000000004, 3, 0.0000, '', NULL, '2026-03-31 11:40:14.182', '2026-04-03 10:07:40.835', 1);
INSERT INTO `products` VALUES (14, 'NVL-008', 'Vitamin E - BASF', 'Vitamin E3', 1, 1, 00000000000000000002, 2, 0.0000, '', NULL, '2026-03-31 14:59:45.264', '2026-04-03 10:43:15.538', 1);
INSERT INTO `products` VALUES (15, 'NVL-009', 'VitaC', 'Vitamin C', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-31 16:17:14.181', '2026-03-31 16:17:04.966', '2026-03-31 16:17:14.181', 1);
INSERT INTO `products` VALUES (16, 'NVL-011', 'Vitamin E - BASF', 'Vitamin E', 1, 1, 00000000000000000002, 1, 0.0000, '', NULL, '2026-04-01 20:56:29.292', '2026-04-03 10:43:14.842', 1);

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
  `unit_display` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15, 4) NOT NULL,
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
  `status` enum('draft','submitted','approved','ordered','received','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `expected_date` date NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
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
  CONSTRAINT `purchase_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of suppliers
-- ----------------------------
INSERT INTO `suppliers` VALUES (1, 'RAW_MATERIAL', 'ChemSource Vietnam', NULL, '0900000001', 'HCM', 'Demo', NULL, '2026-03-30 14:30:07.321', '2026-03-31 16:27:26.079');
INSERT INTO `suppliers` VALUES (2, 'SUP-2', 'BASF', NULL, NULL, NULL, 'Demo', NULL, '2026-03-30 14:40:33.230', '2026-03-31 16:27:26.392');
INSERT INTO `suppliers` VALUES (3, 'SUP-003', 'AAA', '', '', '', '', NULL, '2026-03-31 11:40:59.480', '2026-04-01 20:38:57.145');

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
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_email_key`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'admin@zencos.local', 'dev-hash', 'Admin Zencos', 'admin', 1, '2026-03-30 14:30:07.287', '2026-03-30 14:30:07.287');

SET FOREIGN_KEY_CHECKS = 1;
