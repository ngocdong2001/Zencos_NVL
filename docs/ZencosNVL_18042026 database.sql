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

 Date: 18/04/2026 14:52:13
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
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `batches_product_id_status_expiry_date_idx`(`product_id` ASC, `status` ASC, `expiry_date` ASC) USING BTREE,
  INDEX `batches_supplier_id_fkey`(`supplier_id` ASC) USING BTREE,
  INDEX `idx_batches_inbound_receipt_item_id`(`inbound_receipt_item_id` ASC) USING BTREE,
  CONSTRAINT `batches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_inbound_receipt_item` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of batches
-- ----------------------------
INSERT INTO `batches` VALUES (5, 14, 2, NULL, '1122', '1122/26', '2026-04-01', 10000.00, 1000.0000, 1600.0000, 'GR', 1000.0000, '2026-02-01', '2026-11-30', 'available', 'Auto-posted from opening_stock_item #19', NULL, '2026-04-07 13:58:10.710', '2026-04-09 03:34:48.536');
INSERT INTO `batches` VALUES (6, 4, 1, NULL, '1124', '1124/26', '2026-04-02', 500000.00, 1000.0000, 2000.0000, 'GR', 1000.0000, '2026-01-01', '2026-05-31', 'available', 'Auto-posted from opening_stock_item #20', NULL, '2026-04-07 14:30:39.558', '2026-04-09 08:42:28.688');
INSERT INTO `batches` VALUES (7, 24, 2, NULL, '1133', '1133/26', '2026-04-01', 10000.00, 500.0000, 500.0000, 'ml', 500.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #21', NULL, '2026-04-08 15:01:48.624', '2026-04-09 02:50:35.626');
INSERT INTO `batches` VALUES (8, 24, NULL, NULL, '', NULL, NULL, 0.00, 0.0000, 0.0000, 'ml', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #22', NULL, '2026-04-08 15:29:03.453', '2026-04-08 15:29:03.463');
INSERT INTO `batches` VALUES (9, 1, 1, NULL, '1144', '1144/26', '2026-04-01', 25000.00, 1000.0000, 2000.0000, 'ml', 1000.0000, '2026-01-01', '2026-11-29', 'available', 'Auto-posted from opening_stock_item #23', NULL, '2026-04-08 15:32:17.029', '2026-04-08 15:32:17.040');
INSERT INTO `batches` VALUES (10, 14, 3, 12, 'LOT-NVL-008-260412', 'hd25', '2026-04-12', 5000000.00, 500.0000, 400.0000, 'GR', 500.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260412-9213', NULL, '2026-04-14 02:54:29.662', '2026-04-18 07:33:14.788');
INSERT INTO `batches` VALUES (14, 13, 2, 24, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', 3000000.00, 550.0000, 0.0000, 'ml', 550.0000, '2026-04-01', '2026-04-30', 'rejected', 'Auto-posted từ phiếu nhập NK-20260414-9031', NULL, '2026-04-14 14:58:01.087', '2026-04-14 15:08:54.258');
INSERT INTO `batches` VALUES (15, 13, 2, 25, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', 3000000.00, 0.0000, 0.0000, 'ml', 0.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260414-9031-ADJ', NULL, '2026-04-14 15:08:54.273', '2026-04-14 15:08:54.279');
INSERT INTO `batches` VALUES (16, 13, 2, 26, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', 3000000.00, 600.0000, 0.0000, 'ml', 600.0000, '2026-04-01', '2026-04-30', 'rejected', 'Auto-posted từ phiếu nhập NK-20260414-9953', NULL, '2026-04-14 15:13:05.925', '2026-04-14 15:13:33.301');
INSERT INTO `batches` VALUES (17, 13, 2, 27, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', 3000000.00, 0.0000, 0.0000, 'ml', 0.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260414-9953-ADJ', NULL, '2026-04-14 15:13:33.324', '2026-04-14 15:13:33.329');
INSERT INTO `batches` VALUES (18, 4, 3, 28, 'LOT-NVL-004-260429', 'hd33456', '2026-04-30', 4000000.00, 500.0000, 500.0000, 'KG', 0.5000, '2026-04-30', '2026-08-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-7641', NULL, '2026-04-15 11:49:01.560', '2026-04-15 11:49:01.577');
INSERT INTO `batches` VALUES (19, 23, 3, 31, 'LOT-NVL-012-260429', 'hd-20026', '2026-04-15', 3600000.00, 1000.0000, 200.0000, 'ml', 1000.0000, '2026-04-01', '2026-10-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-4245', NULL, '2026-04-15 13:51:07.116', '2026-04-18 07:48:16.650');
INSERT INTO `batches` VALUES (20, 13, 2, 32, 'LOT-NVL-007-260416', 'hd-2026-abc', '2026-04-14', 4000000.00, 1000.0000, 500.0000, 'ml', 1000.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260415-5159', NULL, '2026-04-15 13:53:32.167', '2026-04-18 07:48:16.671');
INSERT INTO `batches` VALUES (21, 1, 3, 33, 'LOT-R_GLYCERIN-260429', 'hd345', '2026-04-16', 2800000.00, 1000.0000, 998.0000, 'ml', 1000.0000, '2026-04-01', '2026-05-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-5696', NULL, '2026-04-15 14:02:26.306', '2026-04-18 04:09:36.638');
INSERT INTO `batches` VALUES (22, 23, 3, 37, 'LOT-NVL-012-260417', 'hd6650', '2026-04-18', 2000000.00, 1000.0000, 0.0000, 'ml', 1000.0000, '2026-03-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260418-0619', NULL, '2026-04-18 01:31:21.898', '2026-04-18 03:16:58.409');

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
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_order_history
-- ----------------------------
INSERT INTO `export_order_history` VALUES (5, 8, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-101640\", \"itemCount\": 3}', '2026-04-18 03:16:40.491');
INSERT INTO `export_order_history` VALUES (6, 8, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"XK-20260418-101640\"}', '2026-04-18 03:16:58.451');
INSERT INTO `export_order_history` VALUES (7, 11, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-20260418-110137\", \"itemCount\": 1}', '2026-04-18 04:01:37.569');
INSERT INTO `export_order_history` VALUES (8, 11, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-20260418-110137\"}', '2026-04-18 04:01:37.642');
INSERT INTO `export_order_history` VALUES (9, 11, 'adjustment_created', 'Tạo phiếu điều chỉnh SMOKE-XK-20260418-110137-ADJ', 1, '{\"adjustmentOrderId\": \"12\", \"adjustmentOrderRef\": \"SMOKE-XK-20260418-110137-ADJ\"}', '2026-04-18 04:01:37.694');
INSERT INTO `export_order_history` VALUES (10, 12, 'created', 'Tạo phiếu xuất điều chỉnh', 1, '{\"sourceOrderId\": \"11\", \"sourceOrderRef\": \"SMOKE-XK-20260418-110137\"}', '2026-04-18 04:01:37.696');
INSERT INTO `export_order_history` VALUES (11, 11, 'adjusted', 'Void do điều chỉnh bởi phiếu SMOKE-XK-20260418-110137-ADJ', 1, '{\"adjustmentOrderId\": \"12\", \"adjustmentOrderRef\": \"SMOKE-XK-20260418-110137-ADJ\"}', '2026-04-18 04:01:37.768');
INSERT INTO `export_order_history` VALUES (12, 12, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-20260418-110137-ADJ\"}', '2026-04-18 04:01:37.781');
INSERT INTO `export_order_history` VALUES (13, 13, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-CANCEL-20260418-110936\", \"itemCount\": 1}', '2026-04-18 04:09:36.599');
INSERT INTO `export_order_history` VALUES (14, 13, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-CANCEL-20260418-110936\"}', '2026-04-18 04:09:36.652');
INSERT INTO `export_order_history` VALUES (15, 13, 'adjustment_created', 'Tạo phiếu điều chỉnh SMOKE-XK-CANCEL-20260418-110936-ADJ', 1, '{\"adjustmentOrderId\": \"14\", \"adjustmentOrderRef\": \"SMOKE-XK-CANCEL-20260418-110936-ADJ\"}', '2026-04-18 04:09:36.719');
INSERT INTO `export_order_history` VALUES (16, 14, 'created', 'Tạo phiếu xuất điều chỉnh', 1, '{\"sourceOrderId\": \"13\", \"sourceOrderRef\": \"SMOKE-XK-CANCEL-20260418-110936\"}', '2026-04-18 04:09:36.721');
INSERT INTO `export_order_history` VALUES (17, 13, 'adjustment_restored', 'Phục hồi phiếu gốc do hủy phiếu điều chỉnh SMOKE-XK-CANCEL-20260418-110936-ADJ', 1, '{\"restoredBecause\": \"adjustment_cancelled\", \"adjustmentOrderId\": \"14\", \"adjustmentOrderRef\": \"SMOKE-XK-CANCEL-20260418-110936-ADJ\"}', '2026-04-18 04:09:36.773');
INSERT INTO `export_order_history` VALUES (18, 14, 'cancelled', 'Hủy lệnh xuất kho', 1, '{\"orderRef\": \"SMOKE-XK-CANCEL-20260418-110936-ADJ\", \"restoredItemCount\": 0}', '2026-04-18 04:09:36.777');
INSERT INTO `export_order_history` VALUES (19, 15, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-1427AA\", \"itemCount\": 4}', '2026-04-18 07:28:15.264');
INSERT INTO `export_order_history` VALUES (20, 15, 'cancelled', 'Hủy lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-1427AA\", \"restoredItemCount\": 0}', '2026-04-18 07:29:42.053');
INSERT INTO `export_order_history` VALUES (21, 16, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-143233\", \"itemCount\": 4}', '2026-04-18 07:33:10.840');
INSERT INTO `export_order_history` VALUES (22, 16, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"XK-20260418-143233\"}', '2026-04-18 07:33:14.819');
INSERT INTO `export_order_history` VALUES (23, 17, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-144620\", \"itemCount\": 4}', '2026-04-18 07:48:08.793');
INSERT INTO `export_order_history` VALUES (24, 17, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"XK-20260418-144620\"}', '2026-04-18 07:48:16.690');

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
) ENGINE = InnoDB AUTO_INCREMENT = 47 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_order_items
-- ----------------------------
INSERT INTO `export_order_items` VALUES (26, 8, NULL, 23, 1500.0000, 'ml', 1500.0000, 0.00, 'fulfilled', '2026-04-18 03:16:40.458', '2026-04-18 03:16:58.442');
INSERT INTO `export_order_items` VALUES (27, 8, 22, 23, 1000.0000, 'ml', 1000.0000, 0.00, 'fulfilled', '2026-04-18 03:16:40.458', '2026-04-18 03:16:58.442');
INSERT INTO `export_order_items` VALUES (28, 8, 19, 23, 500.0000, 'ml', 500.0000, 0.00, 'fulfilled', '2026-04-18 03:16:40.458', '2026-04-18 03:16:58.442');
INSERT INTO `export_order_items` VALUES (31, 11, 21, 1, 1.0000, 'kg', 1.0000, 0.00, 'cancelled', '2026-04-18 04:01:37.553', '2026-04-18 04:01:37.761');
INSERT INTO `export_order_items` VALUES (32, 12, 21, 1, 1.0000, 'kg', 1.0000, 0.00, 'fulfilled', '2026-04-18 04:01:37.685', '2026-04-18 04:01:37.776');
INSERT INTO `export_order_items` VALUES (33, 13, 21, 1, 1.0000, 'kg', 1.0000, 0.00, 'fulfilled', '2026-04-18 04:09:36.589', '2026-04-18 04:09:36.645');
INSERT INTO `export_order_items` VALUES (34, 14, 21, 1, 1.0000, 'kg', 1.0000, 0.00, 'cancelled', '2026-04-18 04:09:36.707', '2026-04-18 04:09:36.770');
INSERT INTO `export_order_items` VALUES (35, 15, NULL, 4, 500.0000, 'GR', 500.0000, 0.00, 'cancelled', '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.048');
INSERT INTO `export_order_items` VALUES (36, 15, 6, 4, 500.0000, 'GR', 500.0000, 0.00, 'cancelled', '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.048');
INSERT INTO `export_order_items` VALUES (37, 15, NULL, 1, 200.0000, 'ml', 200.0000, 0.00, 'cancelled', '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.048');
INSERT INTO `export_order_items` VALUES (38, 15, 9, 1, 200.0000, 'ml', 200.0000, 0.00, 'cancelled', '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.048');
INSERT INTO `export_order_items` VALUES (39, 16, NULL, 23, 250.0000, 'ml', 250.0000, 0.00, 'fulfilled', '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.797');
INSERT INTO `export_order_items` VALUES (40, 16, 19, 23, 250.0000, 'ml', 250.0000, 0.00, 'fulfilled', '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.797');
INSERT INTO `export_order_items` VALUES (41, 16, NULL, 14, 100.0000, 'GR', 100.0000, 0.00, 'fulfilled', '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.797');
INSERT INTO `export_order_items` VALUES (42, 16, 10, 14, 100.0000, 'GR', 100.0000, 0.00, 'fulfilled', '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.797');
INSERT INTO `export_order_items` VALUES (43, 17, NULL, 23, 50.0000, 'ml', 50.0000, 0.00, 'fulfilled', '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.676');
INSERT INTO `export_order_items` VALUES (44, 17, 19, 23, 50.0000, 'ml', 50.0000, 0.00, 'fulfilled', '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.676');
INSERT INTO `export_order_items` VALUES (45, 17, NULL, 13, 500.0000, 'ml', 500.0000, 0.00, 'fulfilled', '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.676');
INSERT INTO `export_order_items` VALUES (46, 17, 20, 13, 500.0000, 'ml', 500.0000, 0.00, 'fulfilled', '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.676');

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
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `export_orders_source_order_id_key`(`source_order_id` ASC) USING BTREE,
  UNIQUE INDEX `export_orders_adjusted_by_order_id_key`(`adjusted_by_order_id` ASC) USING BTREE,
  INDEX `export_orders_customer_id_fkey`(`customer_id` ASC) USING BTREE,
  INDEX `export_orders_created_by_fkey`(`created_by` ASC) USING BTREE,
  INDEX `export_orders_source_order_id_idx`(`source_order_id` ASC) USING BTREE,
  INDEX `export_orders_adjusted_by_order_id_idx`(`adjusted_by_order_id` ASC) USING BTREE,
  CONSTRAINT `export_orders_adjusted_by_order_id_fkey` FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of export_orders
-- ----------------------------
INSERT INTO `export_orders` VALUES (8, 7, NULL, NULL, 'XK-20260418-101640', '2026-04-18 03:16:40.451', 1, 'fulfilled', NULL, '2026-04-18 03:16:40.458', '2026-04-18 03:16:58.445');
INSERT INTO `export_orders` VALUES (11, 9, NULL, 12, 'SMOKE-XK-20260418-110137', '2026-04-18 04:01:37.549', 1, 'cancelled', 'Smoke test void-adjust outbound', '2026-04-18 04:01:37.553', '2026-04-18 04:01:37.763');
INSERT INTO `export_orders` VALUES (12, 9, 11, NULL, 'SMOKE-XK-20260418-110137-ADJ', '2026-04-18 04:01:37.777', 1, 'fulfilled', 'Phiếu điều chỉnh theo hướng Void & re-export từ SMOKE-XK-20260418-110137', '2026-04-18 04:01:37.685', '2026-04-18 04:01:37.778');
INSERT INTO `export_orders` VALUES (13, 9, NULL, NULL, 'SMOKE-XK-CANCEL-20260418-110936', '2026-04-18 04:09:36.585', 1, 'fulfilled', 'Smoke test cancel pending adjustment outbound', '2026-04-18 04:09:36.589', '2026-04-18 04:09:36.771');
INSERT INTO `export_orders` VALUES (14, 9, 13, NULL, 'SMOKE-XK-CANCEL-20260418-110936-ADJ', NULL, 1, 'cancelled', 'Phiếu điều chỉnh theo hướng Void & re-export từ SMOKE-XK-CANCEL-20260418-110936', '2026-04-18 04:09:36.707', '2026-04-18 04:09:36.766');
INSERT INTO `export_orders` VALUES (15, 3, NULL, NULL, 'XK-20260418-1427AA', '2026-04-18 07:28:15.117', 1, 'cancelled', NULL, '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.033');
INSERT INTO `export_orders` VALUES (16, 9, NULL, NULL, 'XK-20260418-143233', '2026-04-18 07:33:10.802', 1, 'fulfilled', NULL, '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.804');
INSERT INTO `export_orders` VALUES (17, 9, NULL, NULL, 'XK-20260418-144620', '2026-04-18 07:48:08.748', 1, 'fulfilled', NULL, '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.680');

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
) ENGINE = InnoDB AUTO_INCREMENT = 121 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_history
-- ----------------------------
INSERT INTO `inbound_receipt_history` VALUES (1, 4, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T02:31:34.630Z\", \"itemCount\": 1}', '2026-04-14 02:31:34.656');
INSERT INTO `inbound_receipt_history` VALUES (2, 4, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T02:32:00.885Z\", \"itemCount\": 1}', '2026-04-14 02:32:00.907');
INSERT INTO `inbound_receipt_history` VALUES (3, 4, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T02:35:41.540Z\", \"itemCount\": 1}', '2026-04-14 02:35:41.558');
INSERT INTO `inbound_receipt_history` VALUES (4, 4, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T02:54:22.586Z\", \"itemCount\": 1}', '2026-04-14 02:54:22.603');
INSERT INTO `inbound_receipt_history` VALUES (5, 4, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T02:54:29.618Z\", \"itemCount\": 1}', '2026-04-14 02:54:29.629');
INSERT INTO `inbound_receipt_history` VALUES (6, 4, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-14T02:54:29.660Z\", \"itemCount\": 1}', '2026-04-14 02:54:29.707');
INSERT INTO `inbound_receipt_history` VALUES (56, 18, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260414-9031\"}', '2026-04-14 14:57:11.673');
INSERT INTO `inbound_receipt_history` VALUES (57, 18, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 14:57:54.001');
INSERT INTO `inbound_receipt_history` VALUES (58, 18, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T14:58:01.049Z\", \"itemCount\": 1}', '2026-04-14 14:58:01.062');
INSERT INTO `inbound_receipt_history` VALUES (59, 18, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-14T14:58:01.084Z\", \"itemCount\": 1}', '2026-04-14 14:58:01.122');
INSERT INTO `inbound_receipt_history` VALUES (60, 19, 'created_adjustment', 'Khởi tạo phiếu điều chỉnh từ NK-20260414-9031', 1, '{\"sourceReceiptId\": \"18\", \"sourceReceiptRef\": \"NK-20260414-9031\"}', '2026-04-14 15:00:45.015');
INSERT INTO `inbound_receipt_history` VALUES (61, 18, 'adjustment_created', 'Tạo phiếu điều chỉnh NK-20260414-9031-ADJ', 1, '{\"adjustmentReceiptId\": \"19\", \"adjustmentReceiptRef\": \"NK-20260414-9031-ADJ\"}', '2026-04-14 15:00:45.015');
INSERT INTO `inbound_receipt_history` VALUES (62, 19, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": false}', '2026-04-14 15:01:01.728');
INSERT INTO `inbound_receipt_history` VALUES (63, 19, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:06:05.751');
INSERT INTO `inbound_receipt_history` VALUES (64, 19, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:06:23.644');
INSERT INTO `inbound_receipt_history` VALUES (65, 19, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:06:36.938');
INSERT INTO `inbound_receipt_history` VALUES (66, 19, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:08:47.357');
INSERT INTO `inbound_receipt_history` VALUES (67, 19, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T15:08:54.201Z\", \"itemCount\": 1}', '2026-04-14 15:08:54.216');
INSERT INTO `inbound_receipt_history` VALUES (68, 18, 'voided_for_rereceive', 'Void batch gốc bởi phiếu điều chỉnh NK-20260414-9031-ADJ', 1, '{\"adjustedAt\": \"2026-04-14T15:08:54.242Z\", \"adjustmentReceiptId\": \"19\", \"adjustmentReceiptRef\": \"NK-20260414-9031-ADJ\"}', '2026-04-14 15:08:54.270');
INSERT INTO `inbound_receipt_history` VALUES (69, 19, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-14T15:08:54.242Z\", \"itemCount\": 1}', '2026-04-14 15:08:54.309');
INSERT INTO `inbound_receipt_history` VALUES (70, 20, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260414-9953\"}', '2026-04-14 15:12:32.198');
INSERT INTO `inbound_receipt_history` VALUES (71, 20, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:12:58.974');
INSERT INTO `inbound_receipt_history` VALUES (72, 20, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T15:13:05.871Z\", \"itemCount\": 1}', '2026-04-14 15:13:05.892');
INSERT INTO `inbound_receipt_history` VALUES (73, 20, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-14T15:13:05.914Z\", \"itemCount\": 1}', '2026-04-14 15:13:05.963');
INSERT INTO `inbound_receipt_history` VALUES (74, 21, 'created_adjustment', 'Khởi tạo phiếu điều chỉnh từ NK-20260414-9953', 1, '{\"sourceReceiptId\": \"20\", \"sourceReceiptRef\": \"NK-20260414-9953\"}', '2026-04-14 15:13:19.368');
INSERT INTO `inbound_receipt_history` VALUES (75, 20, 'adjustment_created', 'Tạo phiếu điều chỉnh NK-20260414-9953-ADJ', 1, '{\"adjustmentReceiptId\": \"21\", \"adjustmentReceiptRef\": \"NK-20260414-9953-ADJ\"}', '2026-04-14 15:13:19.368');
INSERT INTO `inbound_receipt_history` VALUES (76, 21, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-14 15:13:28.022');
INSERT INTO `inbound_receipt_history` VALUES (77, 21, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-14T15:13:33.237Z\", \"itemCount\": 1}', '2026-04-14 15:13:33.258');
INSERT INTO `inbound_receipt_history` VALUES (78, 20, 'voided_for_rereceive', 'Void batch gốc bởi phiếu điều chỉnh NK-20260414-9953-ADJ', 1, '{\"adjustedAt\": \"2026-04-14T15:13:33.281Z\", \"adjustmentReceiptId\": \"21\", \"adjustmentReceiptRef\": \"NK-20260414-9953-ADJ\"}', '2026-04-14 15:13:33.321');
INSERT INTO `inbound_receipt_history` VALUES (79, 21, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-14T15:13:33.281Z\", \"itemCount\": 1}', '2026-04-14 15:13:33.352');
INSERT INTO `inbound_receipt_history` VALUES (81, 23, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-7320\"}', '2026-04-15 11:42:22.213');
INSERT INTO `inbound_receipt_history` VALUES (82, 24, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-7602\"}', '2026-04-15 11:46:43.606');
INSERT INTO `inbound_receipt_history` VALUES (83, 25, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-7641\"}', '2026-04-15 11:47:20.091');
INSERT INTO `inbound_receipt_history` VALUES (84, 25, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 11:48:39.026');
INSERT INTO `inbound_receipt_history` VALUES (85, 25, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-15T11:48:57.803Z\", \"itemCount\": 1}', '2026-04-15 11:48:57.818');
INSERT INTO `inbound_receipt_history` VALUES (86, 25, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-15T11:49:01.519Z\", \"itemCount\": 1}', '2026-04-15 11:49:01.530');
INSERT INTO `inbound_receipt_history` VALUES (87, 25, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-15T11:49:01.556Z\", \"itemCount\": 1}', '2026-04-15 11:49:01.615');
INSERT INTO `inbound_receipt_history` VALUES (94, 29, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-4245\"}', '2026-04-15 13:37:33.772');
INSERT INTO `inbound_receipt_history` VALUES (95, 29, 'updated', 'Cập nhật phiếu nháp (Bước 3)', 1, '{\"step\": 3, \"hasItemPayload\": true}', '2026-04-15 13:38:17.561');
INSERT INTO `inbound_receipt_history` VALUES (96, 29, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 13:38:21.017');
INSERT INTO `inbound_receipt_history` VALUES (97, 29, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 13:42:06.275');
INSERT INTO `inbound_receipt_history` VALUES (98, 29, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 13:47:58.984');
INSERT INTO `inbound_receipt_history` VALUES (99, 29, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-15T13:51:07.063Z\", \"itemCount\": 1}', '2026-04-15 13:51:07.083');
INSERT INTO `inbound_receipt_history` VALUES (100, 29, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-15T13:51:07.113Z\", \"itemCount\": 1}', '2026-04-15 13:51:07.168');
INSERT INTO `inbound_receipt_history` VALUES (101, 30, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-5159\"}', '2026-04-15 13:52:42.790');
INSERT INTO `inbound_receipt_history` VALUES (102, 30, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 13:53:24.298');
INSERT INTO `inbound_receipt_history` VALUES (103, 30, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-15T13:53:32.121Z\", \"itemCount\": 1}', '2026-04-15 13:53:32.142');
INSERT INTO `inbound_receipt_history` VALUES (104, 30, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-15T13:53:32.165Z\", \"itemCount\": 1}', '2026-04-15 13:53:32.215');
INSERT INTO `inbound_receipt_history` VALUES (105, 31, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260415-5696\"}', '2026-04-15 14:01:39.217');
INSERT INTO `inbound_receipt_history` VALUES (106, 31, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-15 14:02:19.768');
INSERT INTO `inbound_receipt_history` VALUES (107, 31, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-15T14:02:26.258Z\", \"itemCount\": 1}', '2026-04-15 14:02:26.275');
INSERT INTO `inbound_receipt_history` VALUES (108, 31, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-15T14:02:26.303Z\", \"itemCount\": 1}', '2026-04-15 14:02:26.350');
INSERT INTO `inbound_receipt_history` VALUES (110, 31, 'adjustment_created', 'Tạo phiếu điều chỉnh NK-20260415-5696-ADJ', 1, '{\"adjustmentReceiptId\": \"32\", \"adjustmentReceiptRef\": \"NK-20260415-5696-ADJ\"}', '2026-04-15 14:10:24.976');
INSERT INTO `inbound_receipt_history` VALUES (112, 31, 'adjustment_created', 'Tạo phiếu điều chỉnh nháp NK-20260415-5696-ADJ', 1, '{\"adjustmentReceiptId\": \"33\", \"adjustmentReceiptRef\": \"NK-20260415-5696-ADJ\"}', '2026-04-15 14:46:08.195');
INSERT INTO `inbound_receipt_history` VALUES (113, 31, 'adjustment_deleted', 'Hủy phiếu điều chỉnh nháp NK-20260415-5696-ADJ', 1, '{\"adjustmentReceiptId\": \"33\", \"adjustmentReceiptRef\": \"NK-20260415-5696-ADJ\"}', '2026-04-15 14:46:16.070');
INSERT INTO `inbound_receipt_history` VALUES (115, 31, 'adjustment_created', 'Tạo phiếu điều chỉnh nháp NK-20260415-5696-ADJ', 1, '{\"adjustmentReceiptId\": \"34\", \"adjustmentReceiptRef\": \"NK-20260415-5696-ADJ\"}', '2026-04-17 03:11:37.320');
INSERT INTO `inbound_receipt_history` VALUES (116, 31, 'adjustment_restored', 'Phục hồi phiếu gốc do hủy phiếu điều chỉnh NK-20260415-5696-ADJ', 1, '{\"restoredBecause\": \"adjustment_cancelled\", \"adjustmentReceiptId\": \"34\", \"adjustmentReceiptRef\": \"NK-20260415-5696-ADJ\"}', '2026-04-17 03:11:44.197');
INSERT INTO `inbound_receipt_history` VALUES (117, 35, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260418-0619\"}', '2026-04-18 01:30:23.574');
INSERT INTO `inbound_receipt_history` VALUES (118, 35, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-18 01:31:07.437');
INSERT INTO `inbound_receipt_history` VALUES (119, 35, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-18T01:31:21.853Z\", \"itemCount\": 1}', '2026-04-18 01:31:21.867');
INSERT INTO `inbound_receipt_history` VALUES (120, 35, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-18T01:31:21.895Z\", \"itemCount\": 1}', '2026-04-18 01:31:21.948');

-- ----------------------------
-- Table structure for inbound_receipt_item_documents
-- ----------------------------
DROP TABLE IF EXISTS `inbound_receipt_item_documents`;
CREATE TABLE `inbound_receipt_item_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `inbound_receipt_item_documents_item_id_idx`(`item_id` ASC) USING BTREE,
  INDEX `inbound_receipt_item_documents_uploaded_by_fkey`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `inbound_receipt_item_documents_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_item_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 64 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_item_documents
-- ----------------------------
INSERT INTO `inbound_receipt_item_documents` VALUES (11, 12, 'Invoice', 'uploads/inbound-drafts/4/4af306aa-50e5-48cd-bf09-3499da4d1616.pdf', 'Marco\'s Probing checklist.pdf', 'application/pdf', 729300, 1, '2026-04-12 22:00:41.250', '2026-04-14 10:14:11.243');
INSERT INTO `inbound_receipt_item_documents` VALUES (12, 12, 'Invoice', 'uploads/inbound-drafts/4/7682f384-acf0-43fc-a78b-401d9c4581a0.pdf', 'Data_sheet_MP11_Inspection_System_for_CNC_Machining_Centres_with_Manual_Tool_Change.pdf', 'application/pdf', 154607, 1, '2026-04-12 22:01:05.624', '2026-04-14 10:14:12.382');
INSERT INTO `inbound_receipt_item_documents` VALUES (34, 24, 'COA', 'uploads/inbound-drafts/18/6a4f14b2-f7d4-4067-a36b-5d7d78b746af.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-14 21:57:46.021', '2026-04-14 21:57:46.021');
INSERT INTO `inbound_receipt_item_documents` VALUES (35, 24, 'MSDS', 'uploads/inbound-drafts/18/860eb2eb-9341-4ad3-ac4f-fc02c7e9682a.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-14 21:57:50.457', '2026-04-14 21:57:52.496');
INSERT INTO `inbound_receipt_item_documents` VALUES (36, 25, 'COA', 'uploads/inbound-drafts/18/6a4f14b2-f7d4-4067-a36b-5d7d78b746af.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-14 15:00:45.012', '2026-04-14 15:00:45.012');
INSERT INTO `inbound_receipt_item_documents` VALUES (37, 25, 'MSDS', 'uploads/inbound-drafts/18/860eb2eb-9341-4ad3-ac4f-fc02c7e9682a.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-14 15:00:45.012', '2026-04-14 15:00:45.012');
INSERT INTO `inbound_receipt_item_documents` VALUES (38, 26, 'COA', 'uploads/inbound-drafts/20/b1915697-e741-498e-b319-17de8046e5a5.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-14 22:12:55.142', '2026-04-14 22:12:55.142');
INSERT INTO `inbound_receipt_item_documents` VALUES (39, 26, 'MSDS', 'uploads/inbound-drafts/20/8b43fdd8-7725-4f6e-9cee-0dba72d573e0.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-14 22:12:55.179', '2026-04-14 22:12:57.585');
INSERT INTO `inbound_receipt_item_documents` VALUES (40, 27, 'COA', 'uploads/inbound-drafts/20/b1915697-e741-498e-b319-17de8046e5a5.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-14 15:13:19.365', '2026-04-14 15:13:19.365');
INSERT INTO `inbound_receipt_item_documents` VALUES (41, 27, 'MSDS', 'uploads/inbound-drafts/20/8b43fdd8-7725-4f6e-9cee-0dba72d573e0.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-14 15:13:19.365', '2026-04-14 15:13:19.365');
INSERT INTO `inbound_receipt_item_documents` VALUES (42, 28, 'COA', 'uploads/inbound-drafts/25/19424da2-788b-4feb-b9bb-feecf173281e.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-15 18:48:35.768', '2026-04-15 18:48:35.768');
INSERT INTO `inbound_receipt_item_documents` VALUES (43, 28, 'MSDS', 'uploads/inbound-drafts/25/c0c94c6b-d90e-4494-80c6-d7209a679600.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-15 18:48:35.812', '2026-04-15 18:48:37.700');
INSERT INTO `inbound_receipt_item_documents` VALUES (46, 31, 'COA', 'uploads/inbound-drafts/29/1544adaa-d59b-4a25-83f2-bf7da7ee7875.pdf', 'MP11_installation_and_users_guide (1).pdf', 'application/pdf', 540061, 1, '2026-04-15 20:38:12.287', '2026-04-15 20:38:12.287');
INSERT INTO `inbound_receipt_item_documents` VALUES (47, 31, 'MSDS', 'uploads/inbound-drafts/29/5faf45f6-3932-43ac-a119-6eec6561ff25.pdf', 'MP11_installation_and_users_guide.pdf', 'application/pdf', 540061, 1, '2026-04-15 20:38:12.327', '2026-04-15 20:38:15.251');
INSERT INTO `inbound_receipt_item_documents` VALUES (48, 32, 'MSDS', 'uploads/inbound-drafts/30/4971cef2-961f-432e-9108-38b78d0361fe.pdf', 'Visily-Export-Đơn Hàng Sản Xuất-2026-03-23.pdf', 'application/pdf', 248368, 1, '2026-04-15 20:53:16.805', '2026-04-15 20:53:19.278');
INSERT INTO `inbound_receipt_item_documents` VALUES (49, 32, 'COA', 'uploads/inbound-drafts/30/8395f077-8b0f-4bd1-bd52-2717d4bebcde.pdf', 'Visily-Export-Container-2026-03-23.pdf', 'application/pdf', 223110, 1, '2026-04-15 20:53:16.837', '2026-04-15 20:53:16.837');
INSERT INTO `inbound_receipt_item_documents` VALUES (50, 33, 'COA', 'uploads/inbound-drafts/31/3d33d6d8-ea6e-4af6-bde8-e77ed7b19b56.pdf', 'Comparison_of_Linear_Regression_and_LSTM_Long_Shor.pdf', 'application/pdf', 1666308, 1, '2026-04-15 21:02:08.424', '2026-04-15 21:02:08.424');
INSERT INTO `inbound_receipt_item_documents` VALUES (51, 33, 'Invoice', 'uploads/inbound-drafts/31/407b1ebb-3ca0-484c-8df8-bc5027253d54.png', 'newplot (7).png', 'image/png', 193947, 1, '2026-04-15 21:02:08.453', '2026-04-15 21:02:12.663');
INSERT INTO `inbound_receipt_item_documents` VALUES (52, 33, 'MSDS', 'uploads/inbound-drafts/31/c2d82cb4-51da-41ce-b4ef-a9bd421c95ea.png', 'Chia Sáº».png', 'image/png', 306073, 1, '2026-04-15 21:02:08.484', '2026-04-15 21:02:15.048');
INSERT INTO `inbound_receipt_item_documents` VALUES (62, 37, 'COA', 'uploads/inbound-drafts/35/90959a1b-d797-4b8e-816d-0e8b9bedb18b.pdf', 'Data_sheet_MP11_Inspection_System_for_CNC_Machining_Centres_with_Manual_Tool_Change.pdf', 'application/pdf', 154607, 1, '2026-04-18 08:30:59.901', '2026-04-18 08:30:59.901');
INSERT INTO `inbound_receipt_item_documents` VALUES (63, 37, 'MSDS', 'uploads/inbound-drafts/35/f1d84f55-4d0d-488a-930f-0e62563295b4.pdf', 'MP11_installation_and_users_guide (2).pdf', 'application/pdf', 540061, 1, '2026-04-18 08:31:04.044', '2026-04-18 08:31:06.184');

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
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `inbound_receipt_items_receipt_product_lot_key`(`inbound_receipt_id` ASC, `product_id` ASC, `lot_no` ASC) USING BTREE,
  INDEX `inbound_receipt_items_product_id_idx`(`product_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_purchase_request_item_id_idx`(`purchase_request_item_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_posted_batch_id_idx`(`posted_batch_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_posted_tx_id_idx`(`posted_tx_id` ASC) USING BTREE,
  INDEX `inbound_receipt_items_expiry_date_idx`(`expiry_date` ASC) USING BTREE,
  CONSTRAINT `inbound_receipt_items_inbound_receipt_id_fkey` FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_batch_id_fkey` FOREIGN KEY (`posted_batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_tx_id_fkey` FOREIGN KEY (`posted_tx_id`) REFERENCES `inventory_transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 38 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_items
-- ----------------------------
INSERT INTO `inbound_receipt_items` VALUES (12, 4, 59, 14, 'LOT-NVL-008-260412', 'hd25', '2026-04-12', '2026-04-01', '2026-04-30', 500.0000, 'GR', 500.0000, 5000000.00, 2500000.00, 'passed', 1, 10, 17, 'Auto-created from wizard Step 3 upload', '2026-04-12 22:00:41.245', '2026-04-14 02:54:29.683');
INSERT INTO `inbound_receipt_items` VALUES (24, 18, 61, 13, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', '2026-04-01', '2026-04-30', 550.0000, 'ml', 550.0000, 3000000.00, 1650000.00, 'passed', 1, 14, 23, 'Auto-created from wizard Step 3 upload', '2026-04-14 21:57:46.015', '2026-04-14 14:58:01.100');
INSERT INTO `inbound_receipt_items` VALUES (25, 19, 61, 13, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', '2026-04-01', '2026-04-30', 0.0000, 'ml', 0.0000, 3000000.00, 0.00, 'passed', 1, 15, 25, 'Auto-created from wizard Step 3 upload', '2026-04-14 15:00:45.006', '2026-04-14 15:08:54.284');
INSERT INTO `inbound_receipt_items` VALUES (26, 20, 61, 13, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', '2026-04-01', '2026-04-30', 600.0000, 'ml', 600.0000, 3000000.00, 1800000.00, 'passed', 1, 16, 26, 'Auto-created from wizard Step 3 upload', '2026-04-14 22:12:55.135', '2026-04-14 15:13:05.939');
INSERT INTO `inbound_receipt_items` VALUES (27, 21, 61, 13, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', '2026-04-01', '2026-04-30', 0.0000, 'ml', 0.0000, 3000000.00, 0.00, 'passed', 1, 17, 28, 'Auto-created from wizard Step 3 upload', '2026-04-14 15:13:19.358', '2026-04-14 15:13:33.333');
INSERT INTO `inbound_receipt_items` VALUES (28, 25, 63, 4, 'LOT-NVL-004-260429', 'hd33456', '2026-04-30', '2026-04-30', '2026-08-31', 500.0000, 'KG', 0.5000, 4000000.00, 2000000.00, 'passed', 1, 18, 29, 'Auto-created from wizard Step 3 upload', '2026-04-15 18:48:35.760', '2026-04-15 11:49:01.585');
INSERT INTO `inbound_receipt_items` VALUES (31, 29, 65, 23, 'LOT-NVL-012-260429', 'hd-20026', '2026-04-15', '2026-04-01', '2026-10-31', 1000.0000, 'ml', 1000.0000, 3600000.00, 3600000.00, 'passed', 1, 19, 30, 'Auto-created from wizard Step 3 upload', '2026-04-15 20:38:12.280', '2026-04-15 13:51:07.135');
INSERT INTO `inbound_receipt_items` VALUES (32, 30, 61, 13, 'LOT-NVL-007-260416', 'hd-2026-abc', '2026-04-14', '2026-04-01', '2026-04-30', 1000.0000, 'ml', 1000.0000, 4000000.00, 4000000.00, 'passed', 1, 20, 31, 'Auto-created from wizard Step 3 upload', '2026-04-15 20:53:16.778', '2026-04-15 13:53:32.184');
INSERT INTO `inbound_receipt_items` VALUES (33, 31, 66, 1, 'LOT-R_GLYCERIN-260429', 'hd345', '2026-04-16', '2026-04-01', '2026-05-31', 1000.0000, 'ml', 1000.0000, 2800000.00, 2800000.00, 'passed', 1, 21, 32, 'Auto-created from wizard Step 3 upload', '2026-04-15 21:02:08.418', '2026-04-15 14:02:26.322');
INSERT INTO `inbound_receipt_items` VALUES (37, 35, 75, 23, 'LOT-NVL-012-260417', 'hd6650', '2026-04-18', '2026-03-01', '2026-04-30', 1000.0000, 'ml', 1000.0000, 2000000.00, 2000000.00, 'passed', 1, 22, 43, 'Auto-created from wizard Step 3 upload', '2026-04-18 08:30:59.892', '2026-04-18 01:31:21.917');

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
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `inbound_receipts_receipt_ref_key`(`receipt_ref` ASC) USING BTREE,
  UNIQUE INDEX `ux_inbound_receipts_source_receipt_id`(`source_receipt_id` ASC) USING BTREE,
  UNIQUE INDEX `ux_inbound_receipts_adjusted_by_receipt_id`(`adjusted_by_receipt_id` ASC) USING BTREE,
  INDEX `inbound_receipts_status_idx`(`status` ASC) USING BTREE,
  INDEX `inbound_receipts_purchase_request_id_idx`(`purchase_request_id` ASC) USING BTREE,
  INDEX `inbound_receipts_supplier_id_idx`(`supplier_id` ASC) USING BTREE,
  INDEX `inbound_receipts_receiving_location_id_idx`(`receiving_location_id` ASC) USING BTREE,
  INDEX `inbound_receipts_created_by_fkey`(`created_by` ASC) USING BTREE,
  INDEX `inbound_receipts_posted_by_fkey`(`posted_by` ASC) USING BTREE,
  INDEX `idx_inbound_receipts_source_receipt_id`(`source_receipt_id` ASC) USING BTREE,
  INDEX `idx_inbound_receipts_adjusted_by_receipt_id`(`adjusted_by_receipt_id` ASC) USING BTREE,
  CONSTRAINT `fk_inbound_receipts_adjusted_by_receipt` FOREIGN KEY (`adjusted_by_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inbound_receipts_source_receipt` FOREIGN KEY (`source_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_posted_by_fkey` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_receiving_location_id_fkey` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 36 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipts
-- ----------------------------
INSERT INTO `inbound_receipts` VALUES (4, 'NK-20260412-9213', 8, NULL, NULL, 3, 1, 'posted', '2026-04-12', '2026-04-14 02:54:29.660', '2026-04-14 02:54:29.618', 4, 1, 1, 'Auto-created from wizard Step 3 upload', '2026-04-12 22:00:41.232', '2026-04-14 02:54:29.703');
INSERT INTO `inbound_receipts` VALUES (18, 'NK-20260414-9031', 11, NULL, 19, 2, 1, 'posted', '2026-04-16', '2026-04-14 14:58:01.084', '2026-04-14 14:58:01.049', 4, 1, 1, NULL, '2026-04-14 14:57:11.668', '2026-04-14 15:08:54.264');
INSERT INTO `inbound_receipts` VALUES (19, 'NK-20260414-9031-ADJ', 11, 18, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.201', 4, 1, 1, 'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260414-9031', '2026-04-14 15:00:44.988', '2026-04-14 15:08:54.305');
INSERT INTO `inbound_receipts` VALUES (20, 'NK-20260414-9953', 11, NULL, 21, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:13:05.914', '2026-04-14 15:13:05.871', 4, 1, 1, NULL, '2026-04-14 15:12:32.191', '2026-04-14 15:13:33.316');
INSERT INTO `inbound_receipts` VALUES (21, 'NK-20260414-9953-ADJ', 11, 20, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.237', 4, 1, 1, 'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260414-9953', '2026-04-14 15:13:19.346', '2026-04-14 15:13:33.348');
INSERT INTO `inbound_receipts` VALUES (23, 'NK-20260415-7320', 11, NULL, NULL, 2, 3, 'draft', '2026-04-16', NULL, NULL, 2, 1, NULL, NULL, '2026-04-15 11:42:22.203', '2026-04-15 11:42:22.203');
INSERT INTO `inbound_receipts` VALUES (24, 'NK-20260415-7602', 12, NULL, NULL, 3, 1, 'draft', '2026-04-29', NULL, NULL, 2, 1, NULL, NULL, '2026-04-15 11:46:43.601', '2026-04-15 11:46:43.601');
INSERT INTO `inbound_receipts` VALUES (25, 'NK-20260415-7641', 12, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 11:49:01.556', '2026-04-15 11:49:01.519', 4, 1, 1, NULL, '2026-04-15 11:47:20.082', '2026-04-15 11:49:01.610');
INSERT INTO `inbound_receipts` VALUES (29, 'NK-20260415-4245', 13, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 13:51:07.113', '2026-04-15 13:51:07.063', 4, 1, 1, NULL, '2026-04-15 13:37:33.766', '2026-04-15 13:51:07.163');
INSERT INTO `inbound_receipts` VALUES (30, 'NK-20260415-5159', 11, NULL, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-15 13:53:32.165', '2026-04-15 13:53:32.121', 4, 1, 1, NULL, '2026-04-15 13:52:42.786', '2026-04-15 13:53:32.210');
INSERT INTO `inbound_receipts` VALUES (31, 'NK-20260415-5696', 14, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 14:02:26.303', '2026-04-15 14:02:26.258', 4, 1, 1, NULL, '2026-04-15 14:01:39.212', '2026-04-15 14:10:52.303');
INSERT INTO `inbound_receipts` VALUES (35, 'NK-20260418-0619', 21, NULL, NULL, 3, 1, 'posted', '2026-04-17', '2026-04-18 01:31:21.895', '2026-04-18 01:31:21.853', 4, 1, 1, NULL, '2026-04-18 01:30:23.568', '2026-04-18 01:31:21.943');

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
  `inbound_receipt_item_id` bigint UNSIGNED NULL DEFAULT NULL,
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
  INDEX `idx_inventory_transactions_inbound_receipt_item_id`(`inbound_receipt_item_id` ASC) USING BTREE,
  CONSTRAINT `fk_inventory_transactions_inbound_receipt_item` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 61 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inventory_transactions
-- ----------------------------
INSERT INTO `inventory_transactions` VALUES (9, 5, 1, NULL, NULL, 'import', 1000.0000, 'Opening stock auto-post from item #19', '2026-04-07 00:00:00.000', '2026-04-07 13:58:10.716', '2026-04-07 13:58:10.716');
INSERT INTO `inventory_transactions` VALUES (10, 6, 1, NULL, NULL, 'import', 1000.0000, 'Opening stock auto-post from item #20', '2026-04-07 00:00:00.000', '2026-04-07 14:30:39.563', '2026-04-07 14:30:39.563');
INSERT INTO `inventory_transactions` VALUES (11, 7, 1, NULL, NULL, 'import', 500.0000, 'Opening stock auto-post from item #21', '2026-04-08 00:00:00.000', '2026-04-08 15:01:48.639', '2026-04-08 15:01:48.639');
INSERT INTO `inventory_transactions` VALUES (12, 8, 1, NULL, NULL, 'import', 0.0000, 'Opening stock auto-post from item #22', '2026-04-08 00:00:00.000', '2026-04-08 15:29:03.458', '2026-04-08 15:29:03.458');
INSERT INTO `inventory_transactions` VALUES (13, 9, 1, NULL, NULL, 'import', 1000.0000, 'Opening stock auto-post from item #23', '2026-04-08 00:00:00.000', '2026-04-08 15:32:17.034', '2026-04-08 15:32:17.034');
INSERT INTO `inventory_transactions` VALUES (14, 5, 1, NULL, NULL, 'adjustment', -600.0000, 'Opening stock item #19 edited: quantity 1000 -> 400', '2026-04-09 02:49:58.327', '2026-04-09 02:49:58.328', '2026-04-09 02:49:58.328');
INSERT INTO `inventory_transactions` VALUES (15, 7, 1, NULL, NULL, 'adjustment', -500.0000, 'Reversal delete opening stock item #21', '2026-04-09 02:50:35.620', '2026-04-09 02:50:35.621', '2026-04-09 02:50:35.621');
INSERT INTO `inventory_transactions` VALUES (16, 5, 1, NULL, NULL, 'adjustment', 200.0000, 'Opening stock item #19 edited: quantity 400 -> 600', '2026-04-09 03:34:48.525', '2026-04-09 03:34:48.527', '2026-04-09 03:34:48.527');
INSERT INTO `inventory_transactions` VALUES (17, 10, 1, NULL, 12, 'import', 500.0000, 'Nhập kho từ phiếu NK-20260412-9213', '2026-04-14 02:54:29.660', '2026-04-14 02:54:29.669', '2026-04-14 02:54:29.669');
INSERT INTO `inventory_transactions` VALUES (23, 14, 1, NULL, 24, 'import', 550.0000, 'Nhập kho từ phiếu NK-20260414-9031', '2026-04-14 14:58:01.084', '2026-04-14 14:58:01.092', '2026-04-14 14:58:01.092');
INSERT INTO `inventory_transactions` VALUES (24, 14, 1, NULL, 24, 'adjustment', -550.0000, 'Void & re-receive từ phiếu NK-20260414-9031-ADJ', '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.253', '2026-04-14 15:08:54.253');
INSERT INTO `inventory_transactions` VALUES (25, 15, 1, NULL, 25, 'import', 0.0000, 'Nhập kho từ phiếu NK-20260414-9031-ADJ', '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.276', '2026-04-14 15:08:54.276');
INSERT INTO `inventory_transactions` VALUES (26, 16, 1, NULL, 26, 'import', 600.0000, 'Nhập kho từ phiếu NK-20260414-9953', '2026-04-14 15:13:05.914', '2026-04-14 15:13:05.930', '2026-04-14 15:13:05.930');
INSERT INTO `inventory_transactions` VALUES (27, 16, 1, NULL, 26, 'adjustment', -600.0000, 'Void & re-receive từ phiếu NK-20260414-9953-ADJ', '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.297', '2026-04-14 15:13:33.297');
INSERT INTO `inventory_transactions` VALUES (28, 17, 1, NULL, 27, 'import', 0.0000, 'Nhập kho từ phiếu NK-20260414-9953-ADJ', '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.327', '2026-04-14 15:13:33.327');
INSERT INTO `inventory_transactions` VALUES (29, 18, 1, NULL, 28, 'import', 500.0000, 'Nhập kho từ phiếu NK-20260415-7641', '2026-04-15 11:49:01.556', '2026-04-15 11:49:01.566', '2026-04-15 11:49:01.566');
INSERT INTO `inventory_transactions` VALUES (30, 19, 1, NULL, 31, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-4245', '2026-04-15 13:51:07.113', '2026-04-15 13:51:07.123', '2026-04-15 13:51:07.123');
INSERT INTO `inventory_transactions` VALUES (31, 20, 1, NULL, 32, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-5159', '2026-04-15 13:53:32.165', '2026-04-15 13:53:32.173', '2026-04-15 13:53:32.173');
INSERT INTO `inventory_transactions` VALUES (32, 21, 1, NULL, 33, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-5696', '2026-04-15 14:02:26.303', '2026-04-15 14:02:26.311', '2026-04-15 14:02:26.311');
INSERT INTO `inventory_transactions` VALUES (35, 19, 1, NULL, NULL, 'export', 100.0000, NULL, '2026-04-17 15:21:00.686', '2026-04-17 15:21:00.748', '2026-04-17 15:21:00.748');
INSERT INTO `inventory_transactions` VALUES (36, 20, 1, NULL, NULL, 'export', 200.0000, NULL, '2026-04-17 15:21:00.686', '2026-04-17 15:21:00.764', '2026-04-17 15:21:00.764');
INSERT INTO `inventory_transactions` VALUES (37, 19, 1, NULL, NULL, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', '2026-04-17 15:22:45.087', '2026-04-17 15:22:45.088', '2026-04-17 15:22:45.088');
INSERT INTO `inventory_transactions` VALUES (38, 20, 1, NULL, NULL, 'adjustment', 200.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', '2026-04-17 15:22:45.104', '2026-04-17 15:22:45.105', '2026-04-17 15:22:45.105');
INSERT INTO `inventory_transactions` VALUES (39, 19, 1, NULL, NULL, 'export', 100.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', '2026-04-17 15:22:45.077', '2026-04-17 15:22:45.125', '2026-04-17 15:22:45.125');
INSERT INTO `inventory_transactions` VALUES (40, 19, 1, NULL, NULL, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', '2026-04-17 15:23:08.808', '2026-04-17 15:23:08.809', '2026-04-17 15:23:08.809');
INSERT INTO `inventory_transactions` VALUES (41, 19, 1, NULL, NULL, 'export', 100.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', '2026-04-17 15:23:08.800', '2026-04-17 15:23:08.826', '2026-04-17 15:23:08.826');
INSERT INTO `inventory_transactions` VALUES (42, 20, 1, NULL, NULL, 'export', 200.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', '2026-04-17 15:23:08.800', '2026-04-17 15:23:08.834', '2026-04-17 15:23:08.834');
INSERT INTO `inventory_transactions` VALUES (43, 22, 1, NULL, 37, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260418-0619', '2026-04-18 01:31:21.895', '2026-04-18 01:31:21.904', '2026-04-18 01:31:21.904');
INSERT INTO `inventory_transactions` VALUES (44, 19, 1, NULL, NULL, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', '2026-04-18 01:33:30.957', '2026-04-18 01:33:30.958', '2026-04-18 01:33:30.958');
INSERT INTO `inventory_transactions` VALUES (45, 20, 1, NULL, NULL, 'adjustment', 200.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', '2026-04-18 01:33:30.972', '2026-04-18 01:33:30.973', '2026-04-18 01:33:30.973');
INSERT INTO `inventory_transactions` VALUES (51, 22, 1, 27, NULL, 'export', 1000.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-101640', '2026-04-18 03:16:40.451', '2026-04-18 03:16:58.404', '2026-04-18 03:16:58.404');
INSERT INTO `inventory_transactions` VALUES (52, 19, 1, 28, NULL, 'export', 500.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-101640', '2026-04-18 03:16:40.451', '2026-04-18 03:16:58.436', '2026-04-18 03:16:58.436');
INSERT INTO `inventory_transactions` VALUES (53, 21, 1, 31, NULL, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-20260418-110137', '2026-04-18 04:01:37.549', '2026-04-18 04:01:37.621', '2026-04-18 04:01:37.621');
INSERT INTO `inventory_transactions` VALUES (54, 21, 1, 31, NULL, 'adjustment', 1.0000, 'Void phiếu gốc SMOKE-XK-20260418-110137 do điều chỉnh SMOKE-XK-20260418-110137-ADJ', '2026-04-18 04:01:37.753', '2026-04-18 04:01:37.754', '2026-04-18 04:01:37.754');
INSERT INTO `inventory_transactions` VALUES (55, 21, 1, 32, NULL, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-20260418-110137-ADJ', '2026-04-18 04:01:37.770', '2026-04-18 04:01:37.771', '2026-04-18 04:01:37.771');
INSERT INTO `inventory_transactions` VALUES (56, 21, 1, 33, NULL, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-CANCEL-20260418-110936', '2026-04-18 04:09:36.585', '2026-04-18 04:09:36.634', '2026-04-18 04:09:36.634');
INSERT INTO `inventory_transactions` VALUES (57, 19, 1, 40, NULL, 'export', 250.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-143233', '2026-04-18 07:33:10.802', '2026-04-18 07:33:14.727', '2026-04-18 07:33:14.727');
INSERT INTO `inventory_transactions` VALUES (58, 10, 1, 42, NULL, 'export', 100.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-143233', '2026-04-18 07:33:10.802', '2026-04-18 07:33:14.781', '2026-04-18 07:33:14.781');
INSERT INTO `inventory_transactions` VALUES (59, 19, 1, 44, NULL, 'export', 50.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-144620', '2026-04-18 07:48:08.748', '2026-04-18 07:48:16.640', '2026-04-18 07:48:16.640');
INSERT INTO `inventory_transactions` VALUES (60, 20, 1, 46, NULL, 'export', 500.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-144620', '2026-04-18 07:48:08.748', '2026-04-18 07:48:16.667', '2026-04-18 07:48:16.667');

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
) ENGINE = InnoDB AUTO_INCREMENT = 37 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of notifications
-- ----------------------------
INSERT INTO `notifications` VALUES (1, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:06:43.791', '2026-04-09 14:06:43.791');
INSERT INTO `notifications` VALUES (2, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:08:05.893', '2026-04-09 14:08:05.893');
INSERT INTO `notifications` VALUES (3, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:13:23.900', '2026-04-09 14:13:23.900');
INSERT INTO `notifications` VALUES (4, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:21:30.007', '2026-04-09 14:21:30.007');
INSERT INTO `notifications` VALUES (5, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:23:50.929', '2026-04-09 14:23:50.929');
INSERT INTO `notifications` VALUES (6, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:24:51.482', '2026-04-09 14:24:51.482');
INSERT INTO `notifications` VALUES (7, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:24:57.677', '2026-04-09 14:24:57.677');
INSERT INTO `notifications` VALUES (8, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:36:02.408', '2026-04-09 14:36:02.408');
INSERT INTO `notifications` VALUES (9, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"9\", \"actionType\": \"created\"}', NULL, '2026-04-09 14:52:20.523', '2026-04-09 14:52:20.523');
INSERT INTO `notifications` VALUES (10, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"9\", \"actionType\": \"updated\"}', NULL, '2026-04-09 14:52:37.419', '2026-04-09 14:52:37.419');
INSERT INTO `notifications` VALUES (11, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"7\", \"actionType\": \"updated\"}', NULL, '2026-04-09 15:03:53.552', '2026-04-09 15:03:53.552');
INSERT INTO `notifications` VALUES (12, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-09 15:22:14.735', '2026-04-09 15:22:14.735');
INSERT INTO `notifications` VALUES (13, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"8\", \"actionType\": \"submitted\"}', NULL, '2026-04-09 15:22:17.445', '2026-04-09 15:22:17.445');
INSERT INTO `notifications` VALUES (14, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-09 15:22:27.113', '2026-04-09 15:22:27.113');
INSERT INTO `notifications` VALUES (15, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-09 15:22:30.003', '2026-04-09 15:22:30.003');
INSERT INTO `notifications` VALUES (16, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"8\", \"actionType\": \"submitted\"}', NULL, '2026-04-09 15:22:31.447', '2026-04-09 15:22:31.447');
INSERT INTO `notifications` VALUES (17, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"10\", \"actionType\": \"created\"}', NULL, '2026-04-10 08:01:30.051', '2026-04-10 08:01:30.051');
INSERT INTO `notifications` VALUES (18, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"9\", \"actionType\": \"updated\"}', NULL, '2026-04-10 08:24:52.974', '2026-04-10 08:24:52.974');
INSERT INTO `notifications` VALUES (19, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-12 08:13:01.885', '2026-04-12 08:13:01.885');
INSERT INTO `notifications` VALUES (20, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"8\", \"actionType\": \"submitted\"}', NULL, '2026-04-12 08:13:05.506', '2026-04-12 08:13:05.506');
INSERT INTO `notifications` VALUES (21, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-12 08:13:33.003', '2026-04-12 08:13:33.003');
INSERT INTO `notifications` VALUES (22, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"8\", \"actionType\": \"updated\"}', NULL, '2026-04-12 08:13:46.613', '2026-04-12 08:13:46.613');
INSERT INTO `notifications` VALUES (23, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"8\", \"actionType\": \"submitted\"}', NULL, '2026-04-12 08:13:49.124', '2026-04-12 08:13:49.124');
INSERT INTO `notifications` VALUES (24, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"11\", \"actionType\": \"created\"}', NULL, '2026-04-14 03:21:59.354', '2026-04-14 03:21:59.354');
INSERT INTO `notifications` VALUES (25, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"11\", \"actionType\": \"submitted\"}', NULL, '2026-04-14 03:21:59.512', '2026-04-14 03:21:59.512');
INSERT INTO `notifications` VALUES (26, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"12\", \"actionType\": \"created\"}', NULL, '2026-04-15 11:46:13.526', '2026-04-15 11:46:13.526');
INSERT INTO `notifications` VALUES (27, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"12\", \"actionType\": \"submitted\"}', NULL, '2026-04-15 11:46:13.690', '2026-04-15 11:46:13.690');
INSERT INTO `notifications` VALUES (28, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"13\", \"actionType\": \"created\"}', NULL, '2026-04-15 13:17:06.574', '2026-04-15 13:17:06.574');
INSERT INTO `notifications` VALUES (29, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"13\", \"actionType\": \"updated\"}', NULL, '2026-04-15 13:17:20.698', '2026-04-15 13:17:20.698');
INSERT INTO `notifications` VALUES (30, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"13\", \"actionType\": \"submitted\"}', NULL, '2026-04-15 13:17:23.808', '2026-04-15 13:17:23.808');
INSERT INTO `notifications` VALUES (31, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"14\", \"actionType\": \"created\"}', NULL, '2026-04-15 14:01:20.938', '2026-04-15 14:01:20.938');
INSERT INTO `notifications` VALUES (32, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"14\", \"actionType\": \"submitted\"}', NULL, '2026-04-15 14:01:21.091', '2026-04-15 14:01:21.091');
INSERT INTO `notifications` VALUES (33, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"16\", \"actionType\": \"updated\"}', NULL, '2026-04-17 13:47:28.675', '2026-04-17 13:47:28.675');
INSERT INTO `notifications` VALUES (34, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"18\", \"actionType\": \"updated\"}', NULL, '2026-04-17 14:02:00.302', '2026-04-17 14:02:00.302');
INSERT INTO `notifications` VALUES (35, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"21\", \"actionType\": \"created\"}', NULL, '2026-04-18 01:30:11.906', '2026-04-18 01:30:11.906');
INSERT INTO `notifications` VALUES (36, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"21\", \"actionType\": \"submitted\"}', NULL, '2026-04-18 01:30:12.071', '2026-04-18 01:30:12.071');

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
INSERT INTO `opening_stock_declarations` VALUES (1, 'OPEN-20260402-1775145438089', 'draft', 'manual', NULL, NULL, 1, NULL, NULL, '2026-04-02 22:57:18.093', '2026-04-02 22:57:18.093');

-- ----------------------------
-- Table structure for opening_stock_item_documents
-- ----------------------------
DROP TABLE IF EXISTS `opening_stock_item_documents`;
CREATE TABLE `opening_stock_item_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` bigint UNSIGNED NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other',
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
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_item_documents
-- ----------------------------
INSERT INTO `opening_stock_item_documents` VALUES (16, 23, 'MSDS', 'uploads/opening-stock/b8145156-a454-45fa-8153-91cafca446f4.jpg', 'eba49690-5636-496f-8d72-f8d95a52ebda.jpg', 'image/jpeg', 1410920, 1, '2026-04-14 20:07:31.848', '2026-04-14 20:07:31.848');
INSERT INTO `opening_stock_item_documents` VALUES (17, 23, 'COA', 'uploads/opening-stock/32f07f90-fc2c-4427-a978-6152fd5d6a1d.xlsx', 'products_export_1774918514946.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 17964, 1, '2026-04-14 20:07:31.887', '2026-04-14 20:07:31.887');
INSERT INTO `opening_stock_item_documents` VALUES (18, 23, 'Invoice', 'uploads/opening-stock/f2dd71f3-b767-490c-8bdf-571f77a6557c.pdf', 'Visily-Export-Đơn Hàng Sản Xuất-2026-03-23.pdf', 'application/pdf', 248368, 1, '2026-04-14 20:07:31.930', '2026-04-14 20:07:31.930');

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
  INDEX `idx_opening_stock_items_posting_status`(`posting_status` ASC) USING BTREE,
  INDEX `idx_opening_stock_items_posted_batch_id`(`posted_batch_id` ASC) USING BTREE,
  INDEX `idx_opening_stock_items_posted_tx_id`(`posted_tx_id` ASC) USING BTREE,
  CONSTRAINT `opening_stock_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `opening_stock_declarations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_unit_price_unit_id_fkey` FOREIGN KEY (`unit_price_unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of opening_stock_items
-- ----------------------------
INSERT INTO `opening_stock_items` VALUES (19, 1, 14, '1122', '2026-04-07', '1122/26', '2026-04-01', 2, '2026-02-01', '2026-11-30', 600.0000, 'GR', 600.0000, 10000.00, 10000.00, 2, 1.0000, 6000000.00, 0, 'posted', 5, 9, '2026-04-07 20:58:10.728', NULL, NULL, '2026-04-07 20:58:10.687', '2026-04-09 10:34:48.492');
INSERT INTO `opening_stock_items` VALUES (20, 1, 4, '1124', '2026-04-07', '1124/26', '2026-04-02', 1, '2026-01-01', '2026-05-31', 1000.0000, 'GR', 1000.0000, 500000.00, 500000.00, 1, 1000.0000, 500000.00, 0, 'posted', 6, 10, '2026-04-07 21:30:39.575', NULL, NULL, '2026-04-07 21:30:39.536', '2026-04-09 15:42:28.681');
INSERT INTO `opening_stock_items` VALUES (23, 1, 1, '1144', '2026-04-08', '1144/26', '2026-04-01', 1, '2026-01-01', '2026-11-29', 1000.0000, 'ml', 1000.0000, 25000.00, 25000.00, 3, 1000.0000, 25000.00, 1, 'posted', 9, 13, '2026-04-08 22:32:17.055', NULL, NULL, '2026-04-08 22:32:17.009', '2026-04-14 20:07:31.941');

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
INSERT INTO `product_units` VALUES (3, NULL, 4, 'L', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1000.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:38.219');
INSERT INTO `product_units` VALUES (4, NULL, NULL, 'ml', 'Mili lít', 'test test', 1.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:29.255');
INSERT INTO `product_units` VALUES (6, NULL, 4, 'Ll', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1000.0000, 0, 0, '2026-04-01 21:10:44.457', '2026-04-06 16:18:36.652');

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
  CONSTRAINT `products_order_unit_fkey` FOREIGN KEY (`order_unit`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_product_type_fkey` FOREIGN KEY (`product_type`) REFERENCES `product_classifications` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_product_units_fkey` FOREIGN KEY (`base_unit`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 33 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 'R_Glycerin', 'Glycerin 99.5%', 'Glycerin', 1, 1, 00000000000000000004, 3, 2000.0000, '', NULL, '2026-03-30 14:30:07.305', '2026-04-08 22:03:44.885', 1);
INSERT INTO `products` VALUES (2, 'NVL-002', 'Vitamin E BASE', 'Vitamin E', 0, 0, 00000000000000000002, 2, 0.0000, '', '2026-03-31 10:58:16.167', '2026-03-30 14:40:09.253', '2026-03-31 10:58:16.167', 5);
INSERT INTO `products` VALUES (3, 'NVL-003', 'havchavc', 'hhhh', 0, 0, 00000000000000000002, 2, 0.0000, '', '2026-03-31 10:44:25.442', '2026-03-30 17:30:01.086', '2026-03-31 10:44:25.442', 5);
INSERT INTO `products` VALUES (4, 'NVL-004', 'Vitamin D', 'Vitamin D1', 1, 1, 00000000000000000002, 1, 100.0000, '', NULL, '2026-03-30 17:30:23.627', '2026-04-09 11:15:23.067', 1);
INSERT INTO `products` VALUES (5, 'NVL-005', 'bbbbb', 'bbbb', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-30 17:32:13.503', '2026-03-30 17:30:39.499', '2026-03-30 17:32:13.503', 1);
INSERT INTO `products` VALUES (8, 'NVL-001', 'sdfsdf', 'sdfsf', 1, 1, 00000000000000000004, 4, 0.0000, '', NULL, '2026-03-31 11:19:07.937', '2026-04-08 22:02:43.318', 5);
INSERT INTO `products` VALUES (11, 'NVL-006', 'aaa aaa', 'aaa', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-31 14:40:43.653', '2026-03-31 11:33:06.095', '2026-03-31 14:40:43.653', 1);
INSERT INTO `products` VALUES (13, 'NVL-007', 'Acid HCL 95%', 'Acid Clohydric', 1, 1, 00000000000000000004, 3, 0.0000, '', NULL, '2026-03-31 11:40:14.182', '2026-04-14 11:20:14.052', 1);
INSERT INTO `products` VALUES (14, 'NVL-008', 'Vitamin E - BASF', 'Vitamin E3', 1, 1, 00000000000000000002, 2, 500.0000, '', NULL, '2026-03-31 14:59:45.264', '2026-04-09 11:15:18.950', 1);
INSERT INTO `products` VALUES (15, 'NVL-009', 'VitaC', 'Vitamin C', 1, 1, 00000000000000000002, 2, 0.0000, '', '2026-03-31 16:17:14.181', '2026-03-31 16:17:04.966', '2026-03-31 16:17:14.181', 1);
INSERT INTO `products` VALUES (16, 'NVL-011', 'Vitamin E - BASF', 'Vitamin E', 1, 1, 00000000000000000002, 1, 0.0000, '', NULL, '2026-04-01 20:56:29.292', '2026-04-09 11:15:19.523', 1);
INSERT INTO `products` VALUES (23, 'NVL-012', 'Dầu hạt nho tinh khiết', 'Vitis Vinifera Seed Oil', 1, 1, 00000000000000000004, 6, 0.0000, '', NULL, '2026-04-03 22:40:47.421', '2026-04-18 10:16:25.564', 10);
INSERT INTO `products` VALUES (24, 'NVL-014', 'AAAA BBB CCC', 'ABC', 1, 1, 00000000000000000004, 6, 0.0000, '', NULL, '2026-04-03 22:51:01.600', '2026-04-09 21:54:40.024', 10);

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
) ENGINE = InnoDB AUTO_INCREMENT = 77 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of purchase_request_items
-- ----------------------------
INSERT INTO `purchase_request_items` VALUES (56, 9, 1, NULL, 2.0000, 0.0000, 'L', 2.0000, 5000.00, NULL, '2026-04-10 08:24:52.934', '2026-04-10 08:24:52.934');
INSERT INTO `purchase_request_items` VALUES (57, 9, 13, NULL, 1.0000, 0.0000, 'L', 1.0000, 50000.00, NULL, '2026-04-10 08:24:52.934', '2026-04-10 08:24:52.934');
INSERT INTO `purchase_request_items` VALUES (58, 8, 16, NULL, 5000.0000, 0.0000, 'GR', 5000.0000, 0.00, NULL, '2026-04-12 08:13:46.575', '2026-04-12 08:13:46.575');
INSERT INTO `purchase_request_items` VALUES (59, 8, 14, NULL, 100.0000, 500.0000, 'GR', 100.0000, 0.00, NULL, '2026-04-12 08:13:46.575', '2026-04-14 02:54:29.688');
INSERT INTO `purchase_request_items` VALUES (60, 8, 24, NULL, 100.0000, 0.0000, 'ml', 100.0000, 0.00, NULL, '2026-04-12 08:13:46.575', '2026-04-12 08:13:46.575');
INSERT INTO `purchase_request_items` VALUES (61, 11, 13, NULL, 1000.0000, 1000.0000, 'ml', 1000.0000, 0.00, NULL, '2026-04-14 03:21:59.304', '2026-04-15 13:53:32.195');
INSERT INTO `purchase_request_items` VALUES (62, 12, 13, NULL, 1000.0000, 0.0000, 'L', 1.0000, 5000000.00, NULL, '2026-04-15 11:46:13.478', '2026-04-15 11:46:13.478');
INSERT INTO `purchase_request_items` VALUES (63, 12, 4, NULL, 1000.0000, 500.0000, 'KG', 1.0000, 4000000.00, NULL, '2026-04-15 11:46:13.478', '2026-04-15 11:49:01.596');
INSERT INTO `purchase_request_items` VALUES (65, 13, 23, NULL, 1000.0000, 1000.0000, 'Ll', 1.0000, 3600000.00, NULL, '2026-04-15 13:17:20.661', '2026-04-15 13:51:07.147');
INSERT INTO `purchase_request_items` VALUES (66, 14, 1, NULL, 1000.0000, 1000.0000, 'L', 1.0000, 2800000.00, NULL, '2026-04-15 14:01:20.907', '2026-04-15 14:02:26.332');
INSERT INTO `purchase_request_items` VALUES (75, 21, 23, NULL, 1000.0000, 1000.0000, 'Ll', 1.0000, 2000000.00, NULL, '2026-04-18 01:30:11.873', '2026-04-18 01:31:21.929');

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
  CONSTRAINT `fk_purchase_requests_receiving_location` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of purchase_requests
-- ----------------------------
INSERT INTO `purchase_requests` VALUES (8, NULL, 'PO-20260408-224113', 1, NULL, 3, 1, 'partially_received', '2026-04-12', 'NCC dự kiến: SUP-003 - AAA\nKho nhận hàng: LOC-002 - Kho Vĩnh Long', '2026-04-12 08:13:49.090', NULL, NULL, NULL, '2026-04-08 15:41:13.011', '2026-04-14 02:54:29.697');
INSERT INTO `purchase_requests` VALUES (9, NULL, 'PO-123', 1, NULL, 1, 3, 'draft', '2026-04-19', NULL, NULL, NULL, NULL, NULL, '2026-04-09 14:52:20.492', '2026-04-10 08:24:52.934');
INSERT INTO `purchase_requests` VALUES (11, NULL, 'PO-20260414-102152', 1, NULL, 2, NULL, 'received', '2026-04-16', NULL, '2026-04-14 03:21:59.493', NULL, NULL, '2026-04-15 13:53:32.165', '2026-04-14 03:21:59.304', '2026-04-15 13:53:32.203');
INSERT INTO `purchase_requests` VALUES (12, NULL, 'PO-20260415-184519', 1, NULL, 3, 1, 'partially_received', '2026-04-29', NULL, '2026-04-15 11:46:13.668', NULL, NULL, NULL, '2026-04-15 11:46:13.478', '2026-04-15 11:49:01.604');
INSERT INTO `purchase_requests` VALUES (13, NULL, 'PO-20260415-201654', 1, NULL, 3, 1, 'received', '2026-04-29', NULL, '2026-04-15 13:17:23.790', NULL, NULL, '2026-04-15 13:51:07.113', '2026-04-15 13:17:06.548', '2026-04-15 13:51:07.156');
INSERT INTO `purchase_requests` VALUES (14, NULL, 'PO-test-del', 1, NULL, 3, 1, 'received', '2026-04-29', NULL, '2026-04-15 14:01:21.062', NULL, NULL, '2026-04-15 14:02:26.303', '2026-04-15 14:01:20.907', '2026-04-15 14:02:26.340');
INSERT INTO `purchase_requests` VALUES (21, NULL, 'PO-20260418-082940', 1, NULL, 3, 1, 'received', '2026-04-17', NULL, '2026-04-18 01:30:12.038', NULL, NULL, '2026-04-18 01:31:21.895', '2026-04-18 01:30:11.873', '2026-04-18 01:31:21.938');

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
INSERT INTO `suppliers` VALUES (1, 'RAW_MATERIAL', 'ChemSource Vietnam', '', '0900000001', 'HCM', 'Demo', NULL, '2026-03-30 14:30:07.321', '2026-04-06 15:29:08.269');
INSERT INTO `suppliers` VALUES (2, 'SUP-2', 'BASF', '', '', '', 'Demo', NULL, '2026-03-30 14:40:33.230', '2026-04-06 15:29:08.586');
INSERT INTO `suppliers` VALUES (3, 'SUP-003', 'AAA', '', '', '', '', NULL, '2026-03-31 11:40:59.480', '2026-04-06 15:46:43.023');

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
