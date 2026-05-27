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

 Date: 23/05/2026 12:16:19
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
) ENGINE = InnoDB AUTO_INCREMENT = 70 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of batches
-- ----------------------------
INSERT INTO `batches` VALUES (5, 14, 2, NULL, '1122', '1122/26', '2026-04-01', 10000.00, 1000.0000, 1600.0000, 'GR', 1000.0000, '2026-02-01', '2026-11-30', 'available', 'Auto-posted from opening_stock_item #19', NULL, '2026-04-07 13:58:10.710', '2026-04-21 06:47:53.140', NULL);
INSERT INTO `batches` VALUES (6, 4, 1, NULL, '1124', '1124/26', '2026-04-02', 500000.00, 1000.0000, 0.0000, 'GR', 1000.0000, '2026-01-01', '2026-05-31', 'available', 'Auto-posted from opening_stock_item #20', NULL, '2026-04-07 14:30:39.558', '2026-04-21 06:47:53.539', NULL);
INSERT INTO `batches` VALUES (7, 24, 2, NULL, '1133', '1133/26', '2026-04-01', 10000.00, 500.0000, 500.0000, 'ml', 500.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #21', NULL, '2026-04-08 15:01:48.624', '2026-04-09 02:50:35.626', NULL);
INSERT INTO `batches` VALUES (8, 24, NULL, NULL, '', NULL, NULL, 0.00, 0.0000, 0.0000, 'ml', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #22', NULL, '2026-04-08 15:29:03.453', '2026-04-08 15:29:03.463', NULL);
INSERT INTO `batches` VALUES (9, 1, 1, NULL, '1144', '1144/26', '2026-04-01', 25000.00, 1000.0000, 2000.0000, 'ml', 1000.0000, '2026-01-01', '2026-11-29', 'available', 'Auto-posted from opening_stock_item #23', NULL, '2026-04-08 15:32:17.029', '2026-04-21 06:47:52.166', NULL);
INSERT INTO `batches` VALUES (10, 14, 3, 12, 'LOT-NVL-008-260412', 'hd25', '2026-04-12', 5000000.00, 500.0000, 400.0000, 'GR', 500.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260412-9213', NULL, '2026-04-14 02:54:29.662', '2026-04-18 07:33:14.788', NULL);
INSERT INTO `batches` VALUES (14, 13, 2, 24, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', 3000000.00, 550.0000, 0.0000, 'ml', 550.0000, '2026-04-01', '2026-04-30', 'rejected', 'Auto-posted từ phiếu nhập NK-20260414-9031', NULL, '2026-04-14 14:58:01.087', '2026-04-14 15:08:54.258', NULL);
INSERT INTO `batches` VALUES (15, 13, 2, 25, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', 3000000.00, 0.0000, -400.0000, 'ml', 0.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260414-9031-ADJ', NULL, '2026-04-14 15:08:54.273', '2026-05-19 06:55:33.304', NULL);
INSERT INTO `batches` VALUES (16, 13, 2, 26, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', 3000000.00, 600.0000, 0.0000, 'ml', 600.0000, '2026-04-01', '2026-04-30', 'rejected', 'Auto-posted từ phiếu nhập NK-20260414-9953', NULL, '2026-04-14 15:13:05.925', '2026-04-14 15:13:33.301', NULL);
INSERT INTO `batches` VALUES (17, 13, 2, 27, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', 3000000.00, 0.0000, 0.0000, 'ml', 0.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260414-9953-ADJ', NULL, '2026-04-14 15:13:33.324', '2026-04-14 15:13:33.329', NULL);
INSERT INTO `batches` VALUES (18, 4, 3, 28, 'LOT-NVL-004-260429', 'hd33456', '2026-04-30', 4000000.00, 500.0000, 0.0000, 'KG', 0.5000, '2026-04-30', '2026-08-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-7641', NULL, '2026-04-15 11:49:01.560', '2026-04-18 15:46:57.287', NULL);
INSERT INTO `batches` VALUES (19, 23, 3, 31, 'LOT-NVL-012-260429', 'hd-20026', '2026-04-15', 3600000.00, 1000.0000, 200.0000, 'ml', 1000.0000, '2026-04-01', '2026-10-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-4245', NULL, '2026-04-15 13:51:07.116', '2026-04-18 07:48:16.650', NULL);
INSERT INTO `batches` VALUES (20, 13, 2, 32, 'LOT-NVL-007-260416', 'hd-2026-abc', '2026-04-14', 4000000.00, 1000.0000, 500.0000, 'ml', 1000.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260415-5159', NULL, '2026-04-15 13:53:32.167', '2026-04-18 07:48:16.671', NULL);
INSERT INTO `batches` VALUES (21, 1, 3, 33, 'LOT-R_GLYCERIN-260429', 'hd345', '2026-04-16', 2800000.00, 1000.0000, 998.0000, 'ml', 1000.0000, '2026-04-01', '2026-05-31', 'available', 'Auto-posted từ phiếu nhập NK-20260415-5696', NULL, '2026-04-15 14:02:26.306', '2026-04-18 04:09:36.638', NULL);
INSERT INTO `batches` VALUES (22, 23, 3, 37, 'LOT-NVL-012-260417', 'hd6650', '2026-04-18', 2000000.00, 1000.0000, 0.0000, 'ml', 1000.0000, '2026-03-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260418-0619', NULL, '2026-04-18 01:31:21.898', '2026-04-18 03:16:58.409', NULL);
INSERT INTO `batches` VALUES (23, 33, 18, NULL, 'GX250204L1', '1361', '2026-03-06', 34100.00, 202000.0000, 0.0000, 'g', 202000.0000, '2024-11-24', '2026-11-24', 'available', 'Auto-posted from opening_stock_item #24', NULL, '2026-04-21 09:33:11.531', '2026-04-21 09:35:22.608', NULL);
INSERT INTO `batches` VALUES (24, 34, 19, NULL, '014125IND3C5L', '11', '2026-01-21', 33000.00, 50401.0000, 0.0000, 'g', 50401.0000, '2025-09-26', '2027-03-26', 'available', 'Auto-posted from opening_stock_item #25', NULL, '2026-04-21 09:33:11.811', '2026-04-21 09:35:29.947', NULL);
INSERT INTO `batches` VALUES (25, 34, 18, NULL, 'TEST REPORT', '1361', '2026-03-06', 34000.00, 117000.0000, 0.0000, 'g', 117000.0000, '2024-12-23', '2026-12-22', 'available', 'Auto-posted from opening_stock_item #26', NULL, '2026-04-21 09:33:12.013', '2026-04-21 09:35:21.668', NULL);
INSERT INTO `batches` VALUES (26, 36, 19, NULL, '25LOT01156', '11', '2026-01-21', 260000.00, 5187.0000, 0.0000, 'g', 5187.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #27', NULL, '2026-04-21 09:33:12.168', '2026-05-20 13:20:50.821', NULL);
INSERT INTO `batches` VALUES (27, 37, 18, NULL, 'TL02409085', '1361', '2026-03-06', 430556.00, 35572.0000, -72.0000, 'g', 35572.0000, '2024-09-19', '2027-09-19', 'available', 'Auto-posted from opening_stock_item #28', NULL, '2026-04-21 09:33:12.343', '2026-05-19 06:44:04.994', NULL);
INSERT INTO `batches` VALUES (28, 38, 20, NULL, 'EI2501', '997', '2026-03-06', 2450000.00, 200.0000, -80.0000, 'g', 200.0000, '2025-09-25', '2027-09-24', 'available', 'Auto-posted from opening_stock_item #29', NULL, '2026-04-21 09:33:12.501', '2026-05-19 06:40:20.377', NULL);
INSERT INTO `batches` VALUES (29, 39, 21, NULL, '25091685', '723', '2026-03-06', 3000000.00, 192.0000, 0.0000, 'g', 192.0000, '2025-09-16', '2027-09-15', 'available', 'Auto-posted from opening_stock_item #30', NULL, '2026-04-21 09:33:12.662', '2026-04-21 09:35:17.177', NULL);
INSERT INTO `batches` VALUES (30, 40, 22, NULL, 'B2E04349', '9911', '2025-10-07', 351852.00, 2000.0000, -990.0000, 'g', 2000.0000, '2025-01-14', '2027-01-31', 'available', 'Auto-posted from opening_stock_item #31', NULL, '2026-04-21 09:33:12.830', '2026-05-18 06:42:44.518', NULL);
INSERT INTO `batches` VALUES (31, 40, 22, NULL, 'B2F04120', '12118', '2025-11-24', 333333.00, 8300.0000, 0.0000, 'g', 8300.0000, '2025-05-05', '2027-05-31', 'available', 'Auto-posted from opening_stock_item #32', NULL, '2026-04-21 09:33:13.000', '2026-05-18 07:44:10.192', NULL);
INSERT INTO `batches` VALUES (32, 40, 23, NULL, '', '35', '2025-12-31', 302400.00, 0.0000, 0.0000, 'g', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #33', NULL, '2026-04-21 09:33:13.164', '2026-04-21 09:33:13.169', NULL);
INSERT INTO `batches` VALUES (33, 41, 18, NULL, '32666436W0', '1361', '2026-03-06', 584259.00, 32675.0000, -650.0000, 'g', 32675.0000, '2024-02-06', '2027-02-05', 'available', 'Auto-posted from opening_stock_item #34', NULL, '2026-04-21 09:33:13.251', '2026-05-20 13:44:18.766', NULL);
INSERT INTO `batches` VALUES (34, 41, 19, NULL, 'UT25100294', '24', '2026-03-10', 800000.00, 20000.0000, -1000.0000, 'g', 20000.0000, '2025-09-28', '2029-09-27', 'available', 'Auto-posted from opening_stock_item #35', NULL, '2026-04-21 09:33:13.426', '2026-05-20 14:01:16.799', NULL);
INSERT INTO `batches` VALUES (35, 42, 22, NULL, '2502009', '12118', '2025-11-24', 180556.00, 4000.0000, 0.0000, 'g', 4000.0000, '2025-02-07', '2028-02-06', 'available', 'Auto-posted from opening_stock_item #36', NULL, '2026-04-21 09:33:13.618', '2026-04-21 09:35:09.510', NULL);
INSERT INTO `batches` VALUES (36, 43, 24, NULL, 'AT117926', '2911', '2025-11-24', 10296390.00, 6000.0000, 0.0000, 'g', 6000.0000, '2025-11-07', '2027-05-07', 'available', 'Auto-posted from opening_stock_item #37', NULL, '2026-04-21 09:33:13.868', '2026-05-20 14:20:36.034', NULL);
INSERT INTO `batches` VALUES (37, 43, 24, NULL, 'AT115815', '3120', '2025-12-16', 10427210.00, 2000.0000, 0.0000, 'g', 2000.0000, '2025-07-23', '2027-07-23', 'available', 'Auto-posted from opening_stock_item #38', NULL, '2026-04-21 09:33:14.026', '2026-04-21 09:35:08.281', NULL);
INSERT INTO `batches` VALUES (38, 44, 24, NULL, 'CZ5I165-2703', '2557', '2025-10-16', 250506.00, 31369.0000, 0.0000, 'g', 31369.0000, '2025-09-13', '2027-03-13', 'available', 'Auto-posted from opening_stock_item #39', NULL, '2026-04-21 09:33:14.185', '2026-04-21 09:35:02.756', NULL);
INSERT INTO `batches` VALUES (39, 44, 18, NULL, 'IP13130', '1361', '2026-03-06', 257000.00, 12000.0000, -1000.0000, 'g', 12000.0000, '2024-07-20', '2026-07-20', 'available', 'Auto-posted from opening_stock_item #40', NULL, '2026-04-21 09:33:14.346', '2026-05-20 13:20:50.813', NULL);
INSERT INTO `batches` VALUES (40, 45, NULL, NULL, '', NULL, NULL, 0.00, 0.0000, 0.0000, 'g', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #41', NULL, '2026-04-21 09:33:14.509', '2026-04-21 09:33:14.515', NULL);
INSERT INTO `batches` VALUES (41, 46, 25, NULL, '20250228', '1829', '2026-02-09', 800000.00, 1000.0000, 0.0000, 'g', 1000.0000, '2025-02-28', '2027-02-27', 'available', 'Auto-posted from opening_stock_item #42', NULL, '2026-04-21 09:33:14.561', '2026-04-21 09:34:57.925', NULL);
INSERT INTO `batches` VALUES (42, 47, 26, NULL, '71353A', '8164', '2025-11-24', 50926.00, 13991.0000, 50.0000, 'g', 13991.0000, '2025-06-20', '2027-06-20', 'available', 'Auto-posted from opening_stock_item #43', NULL, '2026-04-21 09:33:14.729', '2026-05-19 14:25:23.284', NULL);
INSERT INTO `batches` VALUES (43, 33, 18, NULL, 'GX250204L1', '1361', '2026-03-06', 34100.00, 202000.0000, 202000.0000, 'g', 202000.0000, '2024-11-24', '2026-11-24', 'available', 'Auto-posted from opening_stock_item #44', NULL, '2026-04-21 09:36:17.643', '2026-04-21 09:36:17.651', NULL);
INSERT INTO `batches` VALUES (44, 34, 19, NULL, '014125IND3C5L', '11', '2026-01-21', 33000.00, 50401.0000, 50401.0000, 'g', 50401.0000, '2025-09-26', '2027-03-26', 'available', 'Auto-posted from opening_stock_item #45', NULL, '2026-04-21 09:36:17.991', '2026-04-21 09:36:17.997', NULL);
INSERT INTO `batches` VALUES (45, 34, 18, NULL, 'TEST REPORT', '1361', '2026-03-06', 34000.00, 117000.0000, 117000.0000, 'g', 117000.0000, '2024-12-23', '2026-12-22', 'available', 'Auto-posted from opening_stock_item #46', NULL, '2026-04-21 09:36:18.156', '2026-04-21 09:36:18.161', NULL);
INSERT INTO `batches` VALUES (46, 36, 19, NULL, '25LOT01156', '11', '2026-01-21', 260000.00, 5187.0000, 5187.0000, 'g', 5187.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #47', NULL, '2026-04-21 09:36:18.302', '2026-04-21 09:36:18.309', NULL);
INSERT INTO `batches` VALUES (47, 37, 18, NULL, 'TL02409085', '1361', '2026-03-06', 430556.00, 35572.0000, 35572.0000, 'g', 35572.0000, '2024-09-19', '2027-09-19', 'available', 'Auto-posted from opening_stock_item #48', NULL, '2026-04-21 09:36:18.459', '2026-04-21 09:36:18.464', NULL);
INSERT INTO `batches` VALUES (48, 38, 20, NULL, 'EI2501', '997', '2026-03-06', 2450000.00, 200.0000, 200.0000, 'g', 200.0000, '2025-09-25', '2027-09-24', 'available', 'Auto-posted from opening_stock_item #49', NULL, '2026-04-21 09:36:18.615', '2026-04-21 09:36:18.620', NULL);
INSERT INTO `batches` VALUES (49, 39, 21, NULL, '25091685', '723', '2026-03-06', 3000000.00, 192.0000, 192.0000, 'g', 192.0000, '2025-09-16', '2027-09-15', 'available', 'Auto-posted from opening_stock_item #50', NULL, '2026-04-21 09:36:18.764', '2026-04-21 09:36:18.769', NULL);
INSERT INTO `batches` VALUES (50, 40, 22, NULL, 'B2E04349', '9911', '2025-10-07', 351852.00, 2000.0000, 2000.0000, 'g', 2000.0000, '2025-01-14', '2027-01-31', 'available', 'Auto-posted from opening_stock_item #51', NULL, '2026-04-21 09:36:18.917', '2026-04-21 09:36:18.922', NULL);
INSERT INTO `batches` VALUES (51, 40, 22, NULL, 'B2F04120', '12118', '2025-11-24', 333333.00, 8300.0000, 8300.0000, 'g', 8300.0000, '2025-05-05', '2027-05-31', 'available', 'Auto-posted from opening_stock_item #52', NULL, '2026-04-21 09:36:19.066', '2026-04-21 09:36:19.070', NULL);
INSERT INTO `batches` VALUES (52, 40, 23, NULL, '', '35', '2025-12-31', 302400.00, 0.0000, 0.0000, 'g', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #53', NULL, '2026-04-21 09:36:19.212', '2026-04-21 09:36:19.216', NULL);
INSERT INTO `batches` VALUES (53, 41, 18, NULL, '32666436W0', '1361', '2026-03-06', 584259.00, 32675.0000, 32675.0000, 'g', 32675.0000, '2024-02-06', '2027-02-05', 'available', 'Auto-posted from opening_stock_item #54', NULL, '2026-04-21 09:36:19.297', '2026-04-21 09:36:19.301', NULL);
INSERT INTO `batches` VALUES (54, 41, 19, NULL, 'UT25100294', '24', '2026-03-10', 800000.00, 20000.0000, 20000.0000, 'g', 20000.0000, '2025-09-28', '2029-09-27', 'available', 'Auto-posted from opening_stock_item #55', NULL, '2026-04-21 09:36:19.465', '2026-04-21 09:36:19.470', NULL);
INSERT INTO `batches` VALUES (55, 42, 22, NULL, '2502009', '12118', '2025-11-24', 180556.00, 4000.0000, 4000.0000, 'g', 4000.0000, '2025-02-07', '2028-02-06', 'available', 'Auto-posted from opening_stock_item #56', NULL, '2026-04-21 09:36:19.621', '2026-04-21 09:36:19.626', NULL);
INSERT INTO `batches` VALUES (56, 43, 24, NULL, 'AT117926', '2911', '2025-11-24', 10296390.00, 6000.0000, 6000.0000, 'g', 6000.0000, '2025-11-07', '2027-05-07', 'available', 'Auto-posted from opening_stock_item #57', NULL, '2026-04-21 09:36:19.797', '2026-04-22 09:51:37.019', NULL);
INSERT INTO `batches` VALUES (57, 43, 24, NULL, 'AT115815', '3120', '2025-12-16', 10427210.00, 2000.0000, 2000.0000, 'g', 2000.0000, '2025-07-23', '2027-07-23', 'available', 'Auto-posted from opening_stock_item #58', NULL, '2026-04-21 09:36:19.950', '2026-05-08 13:03:10.658', NULL);
INSERT INTO `batches` VALUES (58, 44, 24, NULL, 'CZ5I165-2703', '2557', '2025-10-16', 250506.00, 31369.0000, 31369.0000, 'g', 31369.0000, '2025-09-13', '2027-03-13', 'available', 'Auto-posted from opening_stock_item #59', NULL, '2026-04-21 09:36:20.093', '2026-05-08 14:37:25.013', NULL);
INSERT INTO `batches` VALUES (59, 44, 18, NULL, 'IP13130', '1361', '2026-03-06', 257000.00, 12000.0000, 12000.0000, 'g', 12000.0000, '2024-07-20', '2026-07-20', 'available', 'Auto-posted from opening_stock_item #60', NULL, '2026-04-21 09:36:20.229', '2026-05-08 14:37:24.054', NULL);
INSERT INTO `batches` VALUES (60, 45, NULL, NULL, '', NULL, NULL, 0.00, 0.0000, 0.0000, 'g', 0.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #61', NULL, '2026-04-21 09:36:20.370', '2026-04-21 09:36:20.376', NULL);
INSERT INTO `batches` VALUES (61, 46, 25, NULL, '20250228', '1829', '2026-02-09', 800000.00, 1000.0000, 900.0000, 'g', 1000.0000, '2025-02-28', '2027-02-27', 'available', 'Auto-posted from opening_stock_item #62', NULL, '2026-04-21 09:36:20.417', '2026-05-05 08:06:41.557', NULL);
INSERT INTO `batches` VALUES (62, 47, 26, NULL, '71353A', '8164', '2025-11-24', 50926.00, 13991.0000, 13991.0000, 'g', 13991.0000, '2025-06-20', '2027-06-20', 'available', 'Auto-posted from opening_stock_item #63', NULL, '2026-04-21 09:36:20.564', '2026-04-22 09:26:52.589', NULL);
INSERT INTO `batches` VALUES (63, 47, 22, 38, 'LOT-NL-PGI-040-260422', 'hd1234', '2026-04-22', 500000.00, 1000.0000, 0.0000, 'g', 1000.0000, '2026-04-01', '2026-08-31', 'rejected', 'Auto-posted từ phiếu nhập NK-20260421-7093', NULL, '2026-04-21 15:02:18.529', '2026-04-21 15:04:02.150', 7);
INSERT INTO `batches` VALUES (64, 47, 22, 40, 'LOT-NL-PGI-040-260422', 'hd1234', '2026-04-22', 50000.00, 0.0000, -300.0000, 'g', 0.0000, '2026-04-01', '2026-08-31', 'available', 'Auto-posted từ phiếu nhập NK-20260421-7093-ADJ', NULL, '2026-04-21 15:04:02.166', '2026-05-20 13:44:18.747', 7);
INSERT INTO `batches` VALUES (65, 23, 9, 42, 'LOT-NVL-012-260423', 'hd1234567', '2026-04-24', 2000000.00, 300.0000, 300.0000, 'ml', 300.0000, '2026-04-01', '2026-04-30', 'available', 'Auto-posted từ phiếu nhập NK-20260423-0636', NULL, '2026-04-23 01:33:50.827', '2026-04-23 01:33:50.840', NULL);
INSERT INTO `batches` VALUES (66, 47, 22, 41, 'LOT-NL-PGI-040-260422', 'hd1121', '2026-04-22', 50000.00, 1000.0000, 1000.0000, 'g', 1000.0000, '2026-04-01', '2026-08-31', 'available', 'Auto-posted từ phiếu nhập NK-20260421-9494', NULL, '2026-05-05 08:49:06.493', '2026-05-05 08:49:06.511', 7);
INSERT INTO `batches` VALUES (67, 69, NULL, NULL, '1131', 'hd453', '2026-05-01', 3000.00, 1000.0000, 860.0000, 'g', 1000.0000, NULL, NULL, 'available', 'Auto-posted from opening_stock_item #64', NULL, '2026-05-08 14:08:21.197', '2026-05-23 04:59:29.902', NULL);
INSERT INTO `batches` VALUES (68, 44, 14, 44, 'LOT-NL-BQU-035-260515', 'hd2026-12315', '2026-05-08', 2000000.00, 1000.0000, 1000.0000, 'g', 1000.0000, '2026-05-01', '2026-11-30', 'available', 'Auto-posted từ phiếu nhập NK-20260508-8217', NULL, '2026-05-08 14:51:58.305', '2026-05-08 14:51:58.316', NULL);
INSERT INTO `batches` VALUES (69, 74, 24, NULL, 'lot-nvl-test1', 'hd2026', '2026-01-01', 5000.00, 100.0000, 100.0000, 'g', 100.0000, '2025-12-01', '2027-01-31', 'available', 'Auto-posted from opening_stock_item #65', NULL, '2026-05-20 07:22:16.286', '2026-05-20 07:22:35.779', NULL);

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
) ENGINE = InnoDB AUTO_INCREMENT = 43 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `export_order_history` VALUES (25, 18, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-223452\", \"itemCount\": 2}', '2026-04-18 15:35:06.705');
INSERT INTO `export_order_history` VALUES (26, 19, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-224559\", \"itemCount\": 3}', '2026-04-18 15:46:45.807');
INSERT INTO `export_order_history` VALUES (27, 19, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"XK-20260418-224559\"}', '2026-04-18 15:46:57.301');
INSERT INTO `export_order_history` VALUES (28, 20, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260420-110856\", \"itemCount\": 2}', '2026-04-20 04:10:28.331');
INSERT INTO `export_order_history` VALUES (29, 21, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260423-080859\", \"itemCount\": 2}', '2026-04-23 01:12:27.468');
INSERT INTO `export_order_history` VALUES (30, 19, 'adjustment_created', 'Tạo phiếu điều chỉnh XK-20260418-224559-ADJ', 1, '{\"adjustmentOrderId\": \"22\", \"adjustmentOrderRef\": \"XK-20260418-224559-ADJ\"}', '2026-04-23 01:25:14.098');
INSERT INTO `export_order_history` VALUES (31, 22, 'created', 'Tạo phiếu xuất điều chỉnh', 1, '{\"sourceOrderId\": \"19\", \"sourceOrderRef\": \"XK-20260418-224559\"}', '2026-04-23 01:25:14.106');
INSERT INTO `export_order_history` VALUES (32, 19, 'adjustment_restored', 'Phục hồi phiếu gốc do hủy phiếu điều chỉnh XK-20260418-224559-ADJ', 1, '{\"restoredBecause\": \"adjustment_cancelled\", \"adjustmentOrderId\": \"22\", \"adjustmentOrderRef\": \"XK-20260418-224559-ADJ\"}', '2026-04-23 01:26:50.297');
INSERT INTO `export_order_history` VALUES (33, 22, 'cancelled', 'Hủy lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260418-224559-ADJ\", \"restoredItemCount\": 0}', '2026-04-23 01:26:50.317');
INSERT INTO `export_order_history` VALUES (34, 23, 'created', 'Tạo lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260505-145453\", \"itemCount\": 2}', '2026-05-05 07:55:08.351');
INSERT INTO `export_order_history` VALUES (35, 23, 'updated', 'Cập nhật lệnh xuất kho', 1, '{\"orderRef\": \"XK-20260505-145453\", \"itemCount\": 2}', '2026-05-05 08:06:12.753');
INSERT INTO `export_order_history` VALUES (36, 23, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 1, '{\"orderRef\": \"XK-20260505-145453\"}', '2026-05-05 08:06:41.579');
INSERT INTO `export_order_history` VALUES (37, 24, 'created', 'Tạo lệnh xuất kho', 2, '{\"orderRef\": \"XK-20260508-212334\", \"itemCount\": 2}', '2026-05-08 14:24:10.701');
INSERT INTO `export_order_history` VALUES (38, 24, 'cancelled', 'Hủy lệnh xuất kho', 2, '{\"orderRef\": \"XK-20260508-212334\", \"restoredItemCount\": 0}', '2026-05-08 14:24:26.642');
INSERT INTO `export_order_history` VALUES (39, 25, 'created', 'Tạo lệnh xuất kho', 2, '{\"orderRef\": \"XK-20260520-150912\", \"itemCount\": 2}', '2026-05-20 08:09:46.991');
INSERT INTO `export_order_history` VALUES (40, 25, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 2, '{\"orderRef\": \"XK-20260520-150912\"}', '2026-05-20 08:09:48.670');
INSERT INTO `export_order_history` VALUES (41, 26, 'created', 'Tạo lệnh xuất kho', 2, '{\"orderRef\": \"XK-20260520-162918\", \"itemCount\": 2}', '2026-05-20 09:29:42.677');
INSERT INTO `export_order_history` VALUES (42, 26, 'fulfilled', 'Đánh dấu hoàn thành xuất kho', 2, '{\"orderRef\": \"XK-20260520-162918\"}', '2026-05-20 09:29:43.562');

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
INSERT INTO `export_order_items` VALUES (47, 18, NULL, 14, 100.0000, 'GR', 100.0000, 0.00, 'pending', '2026-04-18 15:35:06.684', '2026-04-18 15:35:06.684');
INSERT INTO `export_order_items` VALUES (48, 18, 10, 14, 100.0000, 'GR', 100.0000, 0.00, 'pending', '2026-04-18 15:35:06.684', '2026-04-18 15:35:06.684');
INSERT INTO `export_order_items` VALUES (49, 19, NULL, 4, 2500.0000, 'GR', 2500.0000, 0.00, 'fulfilled', '2026-04-18 15:46:45.791', '2026-04-18 15:46:57.291');
INSERT INTO `export_order_items` VALUES (50, 19, 6, 4, 2000.0000, 'GR', 2000.0000, 0.00, 'fulfilled', '2026-04-18 15:46:45.791', '2026-04-18 15:46:57.291');
INSERT INTO `export_order_items` VALUES (51, 19, 18, 4, 500.0000, 'GR', 500.0000, 0.00, 'fulfilled', '2026-04-18 15:46:45.791', '2026-04-18 15:46:57.291');
INSERT INTO `export_order_items` VALUES (52, 20, NULL, 23, 500.0000, 'ml', 500.0000, 0.00, 'pending', '2026-04-20 04:10:28.238', '2026-04-20 04:10:28.238');
INSERT INTO `export_order_items` VALUES (53, 20, 19, 23, 200.0000, 'ml', 200.0000, 0.00, 'pending', '2026-04-20 04:10:28.238', '2026-04-20 04:10:28.238');
INSERT INTO `export_order_items` VALUES (54, 21, NULL, 42, 6000.0000, 'g', 6000.0000, 0.00, 'pending', '2026-04-23 01:12:27.412', '2026-04-23 01:12:27.412');
INSERT INTO `export_order_items` VALUES (55, 21, 55, 42, 4000.0000, 'g', 4000.0000, 0.00, 'pending', '2026-04-23 01:12:27.412', '2026-04-23 01:12:27.412');
INSERT INTO `export_order_items` VALUES (56, 22, NULL, 4, 2500.0000, 'GR', 2500.0000, 0.00, 'cancelled', '2026-04-23 01:25:14.074', '2026-04-23 01:26:50.287');
INSERT INTO `export_order_items` VALUES (57, 22, 6, 4, 2000.0000, 'GR', 2000.0000, 0.00, 'cancelled', '2026-04-23 01:25:14.074', '2026-04-23 01:26:50.287');
INSERT INTO `export_order_items` VALUES (58, 22, 18, 4, 500.0000, 'GR', 500.0000, 0.00, 'cancelled', '2026-04-23 01:25:14.074', '2026-04-23 01:26:50.287');
INSERT INTO `export_order_items` VALUES (61, 23, NULL, 46, 100.0000, 'g', 100.0000, 0.00, 'fulfilled', '2026-05-05 08:06:12.714', '2026-05-05 08:06:41.568');
INSERT INTO `export_order_items` VALUES (62, 23, 61, 46, 100.0000, 'g', 100.0000, 0.00, 'fulfilled', '2026-05-05 08:06:12.714', '2026-05-05 08:06:41.568');
INSERT INTO `export_order_items` VALUES (63, 24, NULL, 42, 100.0000, 'g', 100.0000, 0.00, 'cancelled', '2026-05-08 14:24:10.677', '2026-05-08 14:24:26.636');
INSERT INTO `export_order_items` VALUES (64, 24, 55, 42, 100.0000, 'g', 100.0000, 0.00, 'cancelled', '2026-05-08 14:24:10.677', '2026-05-08 14:24:26.636');
INSERT INTO `export_order_items` VALUES (65, 25, NULL, 69, 25.0000, 'Cái', 25.0000, 0.00, 'fulfilled', '2026-05-20 08:09:46.966', '2026-05-20 08:09:48.648');
INSERT INTO `export_order_items` VALUES (66, 25, 67, 69, 25.0000, 'Cái', 25.0000, 0.00, 'fulfilled', '2026-05-20 08:09:46.966', '2026-05-20 08:09:48.648');
INSERT INTO `export_order_items` VALUES (67, 26, NULL, 69, 5.0000, 'Cái', 5.0000, 0.00, 'fulfilled', '2026-05-20 09:29:42.644', '2026-05-20 09:29:43.552');
INSERT INTO `export_order_items` VALUES (68, 26, 67, 69, 5.0000, 'Cái', 5.0000, 0.00, 'fulfilled', '2026-05-20 09:29:42.644', '2026-05-20 09:29:43.552');

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
INSERT INTO `export_orders` VALUES (8, 7, NULL, NULL, 'XK-20260418-101640', '2026-04-18 03:16:40.451', 1, 'fulfilled', NULL, NULL, '2026-04-18 03:16:40.458', '2026-04-18 03:16:58.445', 1);
INSERT INTO `export_orders` VALUES (11, 9, NULL, 12, 'SMOKE-XK-20260418-110137', '2026-04-18 04:01:37.549', 1, 'cancelled', 'Smoke test void-adjust outbound', NULL, '2026-04-18 04:01:37.553', '2026-04-18 04:01:37.763', 1);
INSERT INTO `export_orders` VALUES (12, 9, 11, NULL, 'SMOKE-XK-20260418-110137-ADJ', '2026-04-18 04:01:37.777', 1, 'fulfilled', 'Phiếu điều chỉnh theo hướng Void & re-export từ SMOKE-XK-20260418-110137', NULL, '2026-04-18 04:01:37.685', '2026-04-18 04:01:37.778', 1);
INSERT INTO `export_orders` VALUES (13, 9, NULL, NULL, 'SMOKE-XK-CANCEL-20260418-110936', '2026-04-18 04:09:36.585', 1, 'fulfilled', 'Smoke test cancel pending adjustment outbound', NULL, '2026-04-18 04:09:36.589', '2026-04-18 04:09:36.771', 1);
INSERT INTO `export_orders` VALUES (14, 9, 13, NULL, 'SMOKE-XK-CANCEL-20260418-110936-ADJ', NULL, 1, 'cancelled', 'Phiếu điều chỉnh theo hướng Void & re-export từ SMOKE-XK-CANCEL-20260418-110936', NULL, '2026-04-18 04:09:36.707', '2026-04-18 04:09:36.766', 1);
INSERT INTO `export_orders` VALUES (15, 3, NULL, NULL, 'XK-20260418-1427AA', '2026-04-18 07:28:15.117', 1, 'cancelled', NULL, NULL, '2026-04-18 07:28:15.210', '2026-04-18 07:29:42.033', 1);
INSERT INTO `export_orders` VALUES (16, 9, NULL, NULL, 'XK-20260418-143233', '2026-04-18 07:33:10.802', 1, 'fulfilled', NULL, NULL, '2026-04-18 07:33:10.811', '2026-04-18 07:33:14.804', 1);
INSERT INTO `export_orders` VALUES (17, 9, NULL, NULL, 'XK-20260418-144620', '2026-04-18 07:48:08.748', 1, 'fulfilled', NULL, NULL, '2026-04-18 07:48:08.758', '2026-04-18 07:48:16.680', 1);
INSERT INTO `export_orders` VALUES (18, 9, NULL, NULL, 'XK-20260418-223452', '2026-04-18 15:35:06.651', 1, 'pending', NULL, NULL, '2026-04-18 15:35:06.684', '2026-04-18 15:35:06.684', 1);
INSERT INTO `export_orders` VALUES (19, 2, NULL, NULL, 'XK-20260418-224559', '2026-04-18 15:46:45.771', 1, 'fulfilled', NULL, NULL, '2026-04-18 15:46:45.791', '2026-04-23 01:26:50.293', 1);
INSERT INTO `export_orders` VALUES (20, 2, NULL, NULL, 'XK-20260420-110856', '2026-04-20 04:10:28.224', 1, 'pending', '[XUẤT THIẾU] Dầu hạt nho tinh khiết: YC 500, Tồn 200, Thiếu 300 ml', NULL, '2026-04-20 04:10:28.238', '2026-04-20 04:10:28.238', 1);
INSERT INTO `export_orders` VALUES (21, 9, NULL, NULL, 'XK-20260423-080859', '2026-04-23 01:12:27.348', 1, 'pending', '[XUẤT THIẾU] METHYL SALICYLATE: YC 6.000, Tồn 4.000, Thiếu 2.000 g', NULL, '2026-04-23 01:12:27.412', '2026-04-23 01:12:27.412', 1);
INSERT INTO `export_orders` VALUES (22, 2, 19, NULL, 'XK-20260418-224559-ADJ', NULL, 1, 'cancelled', 'Phiếu điều chỉnh theo hướng Void & re-export từ XK-20260418-224559', NULL, '2026-04-23 01:25:14.074', '2026-04-23 01:26:50.278', 1);
INSERT INTO `export_orders` VALUES (23, 7, NULL, NULL, 'XK-20260505-145453', '2026-05-05 08:06:12.632', 1, 'fulfilled', NULL, NULL, '2026-05-05 07:55:08.295', '2026-05-05 08:06:41.571', 1);
INSERT INTO `export_orders` VALUES (24, 3, NULL, NULL, 'XK-20260508-212334', '2026-05-08 14:24:10.669', 2, 'cancelled', NULL, NULL, '2026-05-08 14:24:10.677', '2026-05-08 14:24:26.625', 9);
INSERT INTO `export_orders` VALUES (25, 8, NULL, NULL, 'XK-20260520-150912', '2026-05-20 08:09:46.922', 2, 'fulfilled', NULL, NULL, '2026-05-20 08:09:46.966', '2026-05-20 08:09:48.655', 1);
INSERT INTO `export_orders` VALUES (26, 9, NULL, NULL, 'XK-20260520-162918', '2026-05-20 09:29:18.118', 2, 'fulfilled', NULL, 'test xk', '2026-05-20 09:29:42.644', '2026-05-20 09:29:43.556', 1);

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
) ENGINE = InnoDB AUTO_INCREMENT = 162 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `inbound_receipt_history` VALUES (121, 36, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260420-4206\"}', '2026-04-20 02:30:28.771');
INSERT INTO `inbound_receipt_history` VALUES (122, 37, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260420-9388\"}', '2026-04-20 03:56:33.628');
INSERT INTO `inbound_receipt_history` VALUES (123, 37, 'updated', 'Cập nhật phiếu nháp (Bước 2)', 1, '{\"step\": 2, \"hasItemPayload\": false}', '2026-04-20 03:56:51.697');
INSERT INTO `inbound_receipt_history` VALUES (126, 39, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260421-7093\"}', '2026-04-21 14:24:59.036');
INSERT INTO `inbound_receipt_history` VALUES (127, 39, 'updated', 'Cập nhật phiếu nháp (Bước 2)', 1, '{\"step\": 2, \"hasItemPayload\": false}', '2026-04-21 14:26:15.889');
INSERT INTO `inbound_receipt_history` VALUES (128, 39, 'updated', 'Cập nhật phiếu nháp (Bước 2)', 1, '{\"step\": 2, \"hasItemPayload\": false}', '2026-04-21 14:26:22.289');
INSERT INTO `inbound_receipt_history` VALUES (129, 39, 'updated', 'Cập nhật phiếu nháp (Bước 3)', 1, '{\"step\": 3, \"hasItemPayload\": true}', '2026-04-21 14:43:53.036');
INSERT INTO `inbound_receipt_history` VALUES (130, 39, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-21 14:48:52.318');
INSERT INTO `inbound_receipt_history` VALUES (131, 39, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-21 14:49:32.286');
INSERT INTO `inbound_receipt_history` VALUES (132, 39, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-21T15:02:18.480Z\", \"itemCount\": 1}', '2026-04-21 15:02:18.501');
INSERT INTO `inbound_receipt_history` VALUES (133, 39, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-21T15:02:18.526Z\", \"itemCount\": 1}', '2026-04-21 15:02:18.604');
INSERT INTO `inbound_receipt_history` VALUES (135, 39, 'adjustment_created', 'Tạo phiếu điều chỉnh nháp NK-20260421-7093-ADJ', 1, '{\"adjustmentReceiptId\": \"40\", \"adjustmentReceiptRef\": \"NK-20260421-7093-ADJ\"}', '2026-04-21 15:03:02.326');
INSERT INTO `inbound_receipt_history` VALUES (136, 39, 'adjustment_restored', 'Phục hồi phiếu gốc do hủy phiếu điều chỉnh NK-20260421-7093-ADJ', 1, '{\"restoredBecause\": \"adjustment_cancelled\", \"adjustmentReceiptId\": \"40\", \"adjustmentReceiptRef\": \"NK-20260421-7093-ADJ\"}', '2026-04-21 15:03:06.433');
INSERT INTO `inbound_receipt_history` VALUES (137, 41, 'created_adjustment', 'Khởi tạo phiếu điều chỉnh từ NK-20260421-7093', 1, '{\"sourceReceiptId\": \"39\", \"sourceReceiptRef\": \"NK-20260421-7093\"}', '2026-04-21 15:03:24.240');
INSERT INTO `inbound_receipt_history` VALUES (138, 39, 'adjustment_created', 'Tạo phiếu điều chỉnh nháp NK-20260421-7093-ADJ', 1, '{\"adjustmentReceiptId\": \"41\", \"adjustmentReceiptRef\": \"NK-20260421-7093-ADJ\"}', '2026-04-21 15:03:24.240');
INSERT INTO `inbound_receipt_history` VALUES (139, 41, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-21 15:03:59.171');
INSERT INTO `inbound_receipt_history` VALUES (140, 41, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-21T15:04:02.088Z\", \"itemCount\": 1}', '2026-04-21 15:04:02.101');
INSERT INTO `inbound_receipt_history` VALUES (141, 39, 'voided_for_rereceive', 'Void batch gốc bởi phiếu điều chỉnh NK-20260421-7093-ADJ', 1, '{\"adjustedAt\": \"2026-04-21T15:04:02.139Z\", \"adjustmentReceiptId\": \"41\", \"adjustmentReceiptRef\": \"NK-20260421-7093-ADJ\"}', '2026-04-21 15:04:02.164');
INSERT INTO `inbound_receipt_history` VALUES (142, 41, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-21T15:04:02.139Z\", \"itemCount\": 1}', '2026-04-21 15:04:02.201');
INSERT INTO `inbound_receipt_history` VALUES (143, 42, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260421-9494\"}', '2026-04-21 15:04:57.614');
INSERT INTO `inbound_receipt_history` VALUES (144, 42, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-21 15:05:48.557');
INSERT INTO `inbound_receipt_history` VALUES (145, 43, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260422-4245\"}', '2026-04-22 13:37:29.696');
INSERT INTO `inbound_receipt_history` VALUES (146, 44, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260422-4270\"}', '2026-04-22 13:38:07.785');
INSERT INTO `inbound_receipt_history` VALUES (147, 45, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260423-0636\"}', '2026-04-23 01:31:06.462');
INSERT INTO `inbound_receipt_history` VALUES (148, 45, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-23 01:33:12.660');
INSERT INTO `inbound_receipt_history` VALUES (149, 45, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-04-23T01:33:50.752Z\", \"itemCount\": 1}', '2026-04-23 01:33:50.772');
INSERT INTO `inbound_receipt_history` VALUES (150, 45, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-04-23T01:33:50.824Z\", \"itemCount\": 1}', '2026-04-23 01:33:50.915');
INSERT INTO `inbound_receipt_history` VALUES (151, 46, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260424-0973\"}', '2026-04-24 07:09:42.353');
INSERT INTO `inbound_receipt_history` VALUES (152, 46, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-24 07:11:09.885');
INSERT INTO `inbound_receipt_history` VALUES (153, 46, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-04-24 07:11:19.128');
INSERT INTO `inbound_receipt_history` VALUES (154, 42, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-05-05T08:49:06.414Z\", \"itemCount\": 1}', '2026-05-05 08:49:06.454');
INSERT INTO `inbound_receipt_history` VALUES (155, 42, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-05-05T08:49:06.490Z\", \"itemCount\": 1}', '2026-05-05 08:49:06.574');
INSERT INTO `inbound_receipt_history` VALUES (156, 47, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260505-7030\"}', '2026-05-05 14:23:53.120');
INSERT INTO `inbound_receipt_history` VALUES (157, 48, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260508-8217\"}', '2026-05-08 14:43:44.505');
INSERT INTO `inbound_receipt_history` VALUES (158, 48, 'updated', 'Cập nhật phiếu nháp (Bước 4)', 1, '{\"step\": 4, \"hasItemPayload\": true}', '2026-05-08 14:51:47.403');
INSERT INTO `inbound_receipt_history` VALUES (159, 48, 'qc_reviewed', 'Cập nhật kết quả QC', 1, '{\"checkedAt\": \"2026-05-08T14:51:58.259Z\", \"itemCount\": 1}', '2026-05-08 14:51:58.277');
INSERT INTO `inbound_receipt_history` VALUES (160, 48, 'posted', 'Posted phiếu nhập kho', 1, '{\"postedAt\": \"2026-05-08T14:51:58.302Z\", \"itemCount\": 1}', '2026-05-08 14:51:58.381');
INSERT INTO `inbound_receipt_history` VALUES (161, 49, 'created', 'Khởi tạo phiếu nhập kho', 1, '{\"step\": 2, \"receiptRef\": \"NK-20260518-9706\"}', '2026-05-18 06:48:30.632');

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
) ENGINE = InnoDB AUTO_INCREMENT = 81 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `inbound_receipt_item_documents` VALUES (64, 38, 'COA', 'uploads/inbound-drafts/39/f1740bde-fba6-4886-8e03-e40b015fa931.pdf', 'COA_HOT FLUX_AT117926.pdf', 'application/pdf', 409813, 1, '2026-04-21 21:44:17.260', '2026-04-21 21:48:45.496');
INSERT INTO `inbound_receipt_item_documents` VALUES (65, 38, 'MSDS', 'uploads/inbound-drafts/39/31e2f57d-084a-460b-9255-77c7125231f7.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-21 21:44:17.297', '2026-04-21 21:44:23.358');
INSERT INTO `inbound_receipt_item_documents` VALUES (68, 40, 'COA', 'uploads/inbound-drafts/39/f1740bde-fba6-4886-8e03-e40b015fa931.pdf', 'COA_HOT FLUX_AT117926.pdf', 'application/pdf', 409813, 1, '2026-04-21 15:03:24.237', '2026-04-21 15:03:24.237');
INSERT INTO `inbound_receipt_item_documents` VALUES (69, 40, 'MSDS', 'uploads/inbound-drafts/39/31e2f57d-084a-460b-9255-77c7125231f7.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-21 15:03:24.237', '2026-04-21 15:03:24.237');
INSERT INTO `inbound_receipt_item_documents` VALUES (70, 41, 'Invoice', 'uploads/inbound-drafts/42/5ee98c1c-ed02-4fcc-bdb6-f539ad4f464e.pdf', 'HD_3H_723.pdf', 'application/pdf', 272373, 1, '2026-04-21 22:05:33.786', '2026-04-21 22:05:37.141');
INSERT INTO `inbound_receipt_item_documents` VALUES (71, 41, 'COA', 'uploads/inbound-drafts/42/83bb0f31-ae22-4ea0-abc8-4d0fc8cfdb52.pdf', 'COA_CS-GINGER EXT_EI2501.pdf', 'application/pdf', 63898, 1, '2026-04-21 22:05:39.193', '2026-04-21 22:05:39.193');
INSERT INTO `inbound_receipt_item_documents` VALUES (72, 41, 'MSDS', 'uploads/inbound-drafts/42/ac50eb56-72d3-41ca-8740-1949d1787c0d.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-21 22:05:45.012', '2026-04-21 22:05:46.904');
INSERT INTO `inbound_receipt_item_documents` VALUES (73, 42, 'COA', 'uploads/inbound-drafts/45/72c3f3d3-b1b4-439e-ad51-2a4825052ff5.pdf', 'COA_EHGP_AT115815.pdf', 'application/pdf', 487755, 1, '2026-04-23 08:32:26.551', '2026-04-23 08:32:26.551');
INSERT INTO `inbound_receipt_item_documents` VALUES (74, 42, 'MSDS', 'uploads/inbound-drafts/45/31feedcc-11eb-4aa2-9420-c628e5b73c7b.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-23 08:32:31.991', '2026-04-23 08:32:35.575');
INSERT INTO `inbound_receipt_item_documents` VALUES (75, 43, 'COA', 'uploads/inbound-drafts/46/4b3249e9-77ed-4ef6-b329-4a7d8cb86355.pdf', 'COA_EHGP_IP13130.pdf', 'application/pdf', 148166, 1, '2026-04-24 14:10:32.245', '2026-04-24 14:11:05.458');
INSERT INTO `inbound_receipt_item_documents` VALUES (76, 43, 'MSDS', 'uploads/inbound-drafts/46/531daf78-ea79-43e0-aac8-2d78a8583c85.pdf', 'MSDS_TRIETHANOLAMINE.pdf', 'application/pdf', 329963, 1, '2026-04-24 14:10:56.748', '2026-04-24 14:11:07.008');
INSERT INTO `inbound_receipt_item_documents` VALUES (79, 44, 'COA', 'uploads/inbound-drafts/48/d71e5238-a8a1-4a11-9b47-4abf3fbb026d.png', 'Gemini_Generated_Image_y4berdy4berdy4be.png', 'image/png', 1721546, 1, '2026-05-08 21:45:55.973', '2026-05-08 21:45:55.973');
INSERT INTO `inbound_receipt_item_documents` VALUES (80, 44, 'MSDS', 'uploads/inbound-drafts/48/6be18c72-5708-4b2f-9158-8d24297eb909.png', 'newplot.png', 'image/png', 111486, 1, '2026-05-08 21:46:01.639', '2026-05-08 21:46:04.952');

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
) ENGINE = InnoDB AUTO_INCREMENT = 45 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipt_items
-- ----------------------------
INSERT INTO `inbound_receipt_items` VALUES (12, 4, 59, 14, 'LOT-NVL-008-260412', 'hd25', '2026-04-12', '2026-04-01', '2026-04-30', 500.0000, 'GR', 500.0000, 5000000.00, 2500000.00, 'passed', 1, 10, 17, 'Auto-created from wizard Step 3 upload', '2026-04-12 22:00:41.245', '2026-04-14 02:54:29.683', NULL);
INSERT INTO `inbound_receipt_items` VALUES (24, 18, 61, 13, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', '2026-04-01', '2026-04-30', 550.0000, 'ml', 550.0000, 3000000.00, 1650000.00, 'passed', 1, 14, 23, 'Auto-created from wizard Step 3 upload', '2026-04-14 21:57:46.015', '2026-04-14 14:58:01.100', NULL);
INSERT INTO `inbound_receipt_items` VALUES (25, 19, 61, 13, 'LOT-NVL-007-260416', 'hd2223', '2026-04-21', '2026-04-01', '2026-04-30', 0.0000, 'ml', 0.0000, 3000000.00, 0.00, 'passed', 1, 15, 25, 'Auto-created from wizard Step 3 upload', '2026-04-14 15:00:45.006', '2026-04-14 15:08:54.284', NULL);
INSERT INTO `inbound_receipt_items` VALUES (26, 20, 61, 13, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', '2026-04-01', '2026-04-30', 600.0000, 'ml', 600.0000, 3000000.00, 1800000.00, 'passed', 1, 16, 26, 'Auto-created from wizard Step 3 upload', '2026-04-14 22:12:55.135', '2026-04-14 15:13:05.939', NULL);
INSERT INTO `inbound_receipt_items` VALUES (27, 21, 61, 13, 'LOT-NVL-007-260416', 'hd333333', '2026-04-14', '2026-04-01', '2026-04-30', 0.0000, 'ml', 0.0000, 3000000.00, 0.00, 'passed', 1, 17, 28, 'Auto-created from wizard Step 3 upload', '2026-04-14 15:13:19.358', '2026-04-14 15:13:33.333', NULL);
INSERT INTO `inbound_receipt_items` VALUES (28, 25, 63, 4, 'LOT-NVL-004-260429', 'hd33456', '2026-04-30', '2026-04-30', '2026-08-31', 500.0000, 'KG', 0.5000, 4000000.00, 2000000.00, 'passed', 1, 18, 29, 'Auto-created from wizard Step 3 upload', '2026-04-15 18:48:35.760', '2026-04-15 11:49:01.585', NULL);
INSERT INTO `inbound_receipt_items` VALUES (31, 29, 65, 23, 'LOT-NVL-012-260429', 'hd-20026', '2026-04-15', '2026-04-01', '2026-10-31', 1000.0000, 'ml', 1000.0000, 3600000.00, 3600000.00, 'passed', 1, 19, 30, 'Auto-created from wizard Step 3 upload', '2026-04-15 20:38:12.280', '2026-04-15 13:51:07.135', NULL);
INSERT INTO `inbound_receipt_items` VALUES (32, 30, 61, 13, 'LOT-NVL-007-260416', 'hd-2026-abc', '2026-04-14', '2026-04-01', '2026-04-30', 1000.0000, 'ml', 1000.0000, 4000000.00, 4000000.00, 'passed', 1, 20, 31, 'Auto-created from wizard Step 3 upload', '2026-04-15 20:53:16.778', '2026-04-15 13:53:32.184', NULL);
INSERT INTO `inbound_receipt_items` VALUES (33, 31, 66, 1, 'LOT-R_GLYCERIN-260429', 'hd345', '2026-04-16', '2026-04-01', '2026-05-31', 1000.0000, 'ml', 1000.0000, 2800000.00, 2800000.00, 'passed', 1, 21, 32, 'Auto-created from wizard Step 3 upload', '2026-04-15 21:02:08.418', '2026-04-15 14:02:26.322', NULL);
INSERT INTO `inbound_receipt_items` VALUES (37, 35, 75, 23, 'LOT-NVL-012-260417', 'hd6650', '2026-04-18', '2026-03-01', '2026-04-30', 1000.0000, 'ml', 1000.0000, 2000000.00, 2000000.00, 'passed', 1, 22, 43, 'Auto-created from wizard Step 3 upload', '2026-04-18 08:30:59.892', '2026-04-18 01:31:21.917', NULL);
INSERT INTO `inbound_receipt_items` VALUES (38, 39, 81, 47, 'LOT-NL-PGI-040-260422', 'hd1234', '2026-04-22', '2026-04-01', '2026-08-31', 1000.0000, 'g', 1000.0000, 500000.00, 500000.00, 'passed', 1, 63, 121, NULL, '2026-04-21 14:43:53.019', '2026-04-21 15:02:18.575', 7);
INSERT INTO `inbound_receipt_items` VALUES (40, 41, 81, 47, 'LOT-NL-PGI-040-260422', 'hd1234', '2026-04-22', '2026-04-01', '2026-08-31', 0.0000, 'g', 0.0000, 50000.00, 0.00, 'passed', 1, 64, 123, NULL, '2026-04-21 15:03:24.234', '2026-04-21 15:04:02.176', 7);
INSERT INTO `inbound_receipt_items` VALUES (41, 42, 81, 47, 'LOT-NL-PGI-040-260422', 'hd1121', '2026-04-22', '2026-04-01', '2026-08-31', 1000.0000, 'g', 1000.0000, 50000.00, 50000.00, 'passed', 1, 66, 126, 'Auto-created from wizard Step 3 upload', '2026-04-21 22:05:33.780', '2026-05-05 08:49:06.521', 7);
INSERT INTO `inbound_receipt_items` VALUES (42, 45, 85, 23, 'LOT-NVL-012-260423', 'hd1234567', '2026-04-24', '2026-04-01', '2026-04-30', 300.0000, 'ml', 300.0000, 2000000.00, 600000.00, 'passed', 1, 65, 124, 'Auto-created from wizard Step 3 upload', '2026-04-23 08:32:26.542', '2026-04-23 01:33:50.872', NULL);
INSERT INTO `inbound_receipt_items` VALUES (43, 46, 86, 13, 'LOT-NVL-007-260423', 'dhghgfh', '2026-04-24', '2026-04-01', '2026-04-30', 500.0000, 'ml', 500.0000, 5000000.00, 2500000.00, 'pending', 1, NULL, NULL, 'Auto-created from wizard Step 3 upload', '2026-04-24 14:10:32.226', '2026-04-24 07:11:19.073', NULL);
INSERT INTO `inbound_receipt_items` VALUES (44, 48, 87, 44, 'LOT-NL-BQU-035-260515', 'hd2026-12315', '2026-05-08', '2026-05-01', '2026-11-30', 1000.0000, 'g', 1000.0000, 2000000.00, 2000000.00, 'passed', 1, 68, 128, 'Auto-created from wizard Step 3 upload', '2026-05-08 21:44:46.477', '2026-05-08 14:51:58.322', NULL);

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
) ENGINE = InnoDB AUTO_INCREMENT = 50 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inbound_receipts
-- ----------------------------
INSERT INTO `inbound_receipts` VALUES (4, 'NK-20260412-9213', 8, NULL, NULL, 3, 1, 'posted', '2026-04-12', '2026-04-14 02:54:29.660', '2026-04-14 02:54:29.618', 4, 1, 1, 'Auto-created from wizard Step 3 upload', NULL, '2026-04-12 22:00:41.232', '2026-04-14 02:54:29.703');
INSERT INTO `inbound_receipts` VALUES (18, 'NK-20260414-9031', 11, NULL, 19, 2, 1, 'posted', '2026-04-16', '2026-04-14 14:58:01.084', '2026-04-14 14:58:01.049', 4, 1, 1, NULL, NULL, '2026-04-14 14:57:11.668', '2026-04-14 15:08:54.264');
INSERT INTO `inbound_receipts` VALUES (19, 'NK-20260414-9031-ADJ', 11, 18, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.201', 4, 1, 1, 'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260414-9031', NULL, '2026-04-14 15:00:44.988', '2026-04-14 15:08:54.305');
INSERT INTO `inbound_receipts` VALUES (20, 'NK-20260414-9953', 11, NULL, 21, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:13:05.914', '2026-04-14 15:13:05.871', 4, 1, 1, NULL, NULL, '2026-04-14 15:12:32.191', '2026-04-14 15:13:33.316');
INSERT INTO `inbound_receipts` VALUES (21, 'NK-20260414-9953-ADJ', 11, 20, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.237', 4, 1, 1, 'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260414-9953', NULL, '2026-04-14 15:13:19.346', '2026-04-14 15:13:33.348');
INSERT INTO `inbound_receipts` VALUES (23, 'NK-20260415-7320', 11, NULL, NULL, 2, 3, 'draft', '2026-04-16', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-15 11:42:22.203', '2026-04-15 11:42:22.203');
INSERT INTO `inbound_receipts` VALUES (24, 'NK-20260415-7602', 12, NULL, NULL, 3, 1, 'draft', '2026-04-29', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-15 11:46:43.601', '2026-04-15 11:46:43.601');
INSERT INTO `inbound_receipts` VALUES (25, 'NK-20260415-7641', 12, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 11:49:01.556', '2026-04-15 11:49:01.519', 4, 1, 1, NULL, NULL, '2026-04-15 11:47:20.082', '2026-04-15 11:49:01.610');
INSERT INTO `inbound_receipts` VALUES (29, 'NK-20260415-4245', 13, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 13:51:07.113', '2026-04-15 13:51:07.063', 4, 1, 1, NULL, NULL, '2026-04-15 13:37:33.766', '2026-04-15 13:51:07.163');
INSERT INTO `inbound_receipts` VALUES (30, 'NK-20260415-5159', 11, NULL, NULL, 2, 1, 'posted', '2026-04-16', '2026-04-15 13:53:32.165', '2026-04-15 13:53:32.121', 4, 1, 1, NULL, NULL, '2026-04-15 13:52:42.786', '2026-04-15 13:53:32.210');
INSERT INTO `inbound_receipts` VALUES (31, 'NK-20260415-5696', 14, NULL, NULL, 3, 1, 'posted', '2026-04-29', '2026-04-15 14:02:26.303', '2026-04-15 14:02:26.258', 4, 1, 1, NULL, NULL, '2026-04-15 14:01:39.212', '2026-04-15 14:10:52.303');
INSERT INTO `inbound_receipts` VALUES (35, 'NK-20260418-0619', 21, NULL, NULL, 3, 1, 'posted', '2026-04-17', '2026-04-18 01:31:21.895', '2026-04-18 01:31:21.853', 4, 1, 1, NULL, NULL, '2026-04-18 01:30:23.568', '2026-04-18 01:31:21.943');
INSERT INTO `inbound_receipts` VALUES (36, 'NK-20260420-4206', 12, NULL, NULL, 3, 1, 'draft', '2026-04-29', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-20 02:30:28.728', '2026-04-20 02:30:28.728');
INSERT INTO `inbound_receipts` VALUES (37, 'NK-20260420-9388', 12, NULL, NULL, 3, 1, 'draft', '2026-04-29', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-20 03:56:33.579', '2026-04-20 03:56:51.624');
INSERT INTO `inbound_receipts` VALUES (39, 'NK-20260421-7093', 24, NULL, 41, 22, 1, 'posted', '2026-04-22', '2026-04-21 15:02:18.526', '2026-04-21 15:02:18.480', 4, 1, 1, NULL, NULL, '2026-04-21 14:24:59.031', '2026-04-21 15:04:02.159');
INSERT INTO `inbound_receipts` VALUES (41, 'NK-20260421-7093-ADJ', 24, 39, NULL, 22, 1, 'posted', '2026-04-22', '2026-04-21 15:04:02.139', '2026-04-21 15:04:02.088', 4, 1, 1, 'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260421-7093', NULL, '2026-04-21 15:03:24.230', '2026-04-21 15:04:02.197');
INSERT INTO `inbound_receipts` VALUES (42, 'NK-20260421-9494', 24, NULL, NULL, 22, 1, 'posted', '2026-04-22', '2026-05-05 08:49:06.490', '2026-05-05 08:49:06.414', 4, 1, 1, NULL, NULL, '2026-04-21 15:04:57.610', '2026-05-05 08:49:06.565');
INSERT INTO `inbound_receipts` VALUES (43, 'NK-20260422-4245', 24, NULL, NULL, 14, 1, 'draft', '2026-04-23', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-22 13:37:29.683', '2026-04-22 13:37:29.683');
INSERT INTO `inbound_receipts` VALUES (44, 'NK-20260422-4270', 24, NULL, NULL, 23, 1, 'draft', '2026-04-23', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-04-22 13:38:07.778', '2026-04-22 13:38:07.778');
INSERT INTO `inbound_receipts` VALUES (45, 'NK-20260423-0636', 26, NULL, NULL, 9, 1, 'posted', '2026-04-23', '2026-04-23 01:33:50.824', '2026-04-23 01:33:50.752', 4, 1, 1, NULL, NULL, '2026-04-23 01:31:06.454', '2026-04-23 01:33:50.908');
INSERT INTO `inbound_receipts` VALUES (46, 'NK-20260424-0973', 26, NULL, NULL, 9, 1, 'draft', '2026-04-23', NULL, NULL, 4, 1, NULL, NULL, NULL, '2026-04-24 07:09:42.304', '2026-04-24 07:11:19.004');
INSERT INTO `inbound_receipts` VALUES (47, 'NK-20260505-7030', 26, NULL, NULL, 9, 1, 'draft', '2026-04-23', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-05-05 14:23:53.111', '2026-05-05 14:23:53.111');
INSERT INTO `inbound_receipts` VALUES (48, 'NK-20260508-8217', 27, NULL, NULL, 14, 1, 'posted', '2026-05-15', '2026-05-08 14:51:58.302', '2026-05-08 14:51:58.259', 4, 1, 1, NULL, NULL, '2026-05-08 14:43:44.497', '2026-05-08 14:51:58.374');
INSERT INTO `inbound_receipts` VALUES (49, 'NK-20260518-9706', 26, NULL, NULL, 9, 1, 'draft', '2026-04-23', NULL, NULL, 2, 1, NULL, NULL, NULL, '2026-05-18 06:48:30.614', '2026-05-18 06:48:30.614');

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
INSERT INTO `inventory_locations` VALUES (2, 'LOC-TEST', 'Vi tri test', 'updated', '2026-03-30 14:38:15.175', '2026-03-30 14:38:15.115', '2026-03-30 14:38:15.175');
INSERT INTO `inventory_locations` VALUES (3, 'LOC-002', 'Kho Vĩnh Long', 'Không sử dụng', NULL, '2026-03-31 21:50:14.736', '2026-05-05 16:52:25.336');
INSERT INTO `inventory_locations` VALUES (6, 'LOC-002a', 'Kho Vĩnh Long', 'Không sử dụng', '2026-04-01 21:09:54.129', '2026-04-01 21:09:48.471', '2026-04-01 21:09:54.129');
INSERT INTO `inventory_locations` VALUES (7, 'LOC-001a', 'Kho Long An', 'Kho mặc định', '2026-04-01 21:09:53.359', '2026-04-01 21:09:48.491', '2026-04-01 21:09:53.359');
INSERT INTO `inventory_locations` VALUES (8, 'LOC-001BTP', 'KHO BÁN THÀNH PHẨM', '', NULL, '2026-05-05 20:01:21.612', '2026-05-05 20:01:21.612');
INSERT INTO `inventory_locations` VALUES (9, 'LOC-001TP', 'KHO THÀNH PHẨM', '', NULL, '2026-05-05 20:01:35.578', '2026-05-05 20:01:35.578');

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
) ENGINE = InnoDB AUTO_INCREMENT = 180 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of inventory_transactions
-- ----------------------------
INSERT INTO `inventory_transactions` VALUES (9, 5, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #19', 0, '2026-04-07 00:00:00.000', '2026-04-07 13:58:10.716', '2026-04-07 13:58:10.716');
INSERT INTO `inventory_transactions` VALUES (10, 6, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #20', 0, '2026-04-07 00:00:00.000', '2026-04-07 14:30:39.563', '2026-04-07 14:30:39.563');
INSERT INTO `inventory_transactions` VALUES (13, 9, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #23', 0, '2026-04-08 00:00:00.000', '2026-04-08 15:32:17.034', '2026-04-08 15:32:17.034');
INSERT INTO `inventory_transactions` VALUES (14, 5, 1, NULL, NULL, NULL, 1, 'adjustment', -600.0000, 'Opening stock item #19 edited: quantity 1000 -> 400', 0, '2026-04-09 02:49:58.327', '2026-04-09 02:49:58.328', '2026-04-09 02:49:58.328');
INSERT INTO `inventory_transactions` VALUES (16, 5, 1, NULL, NULL, NULL, 1, 'adjustment', 200.0000, 'Opening stock item #19 edited: quantity 400 -> 600', 0, '2026-04-09 03:34:48.525', '2026-04-09 03:34:48.527', '2026-04-09 03:34:48.527');
INSERT INTO `inventory_transactions` VALUES (17, 10, 1, NULL, 12, NULL, 1, 'import', 500.0000, 'Nhập kho từ phiếu NK-20260412-9213', 0, '2026-04-14 02:54:29.660', '2026-04-14 02:54:29.669', '2026-04-14 02:54:29.669');
INSERT INTO `inventory_transactions` VALUES (23, 14, 1, NULL, 24, NULL, 1, 'import', 550.0000, 'Nhập kho từ phiếu NK-20260414-9031', 0, '2026-04-14 14:58:01.084', '2026-04-14 14:58:01.092', '2026-04-14 14:58:01.092');
INSERT INTO `inventory_transactions` VALUES (24, 14, 1, NULL, 24, NULL, 1, 'adjustment', -550.0000, 'Void & re-receive từ phiếu NK-20260414-9031-ADJ', 0, '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.253', '2026-04-14 15:08:54.253');
INSERT INTO `inventory_transactions` VALUES (25, 15, 1, NULL, 25, NULL, 1, 'import', 0.0000, 'Nhập kho từ phiếu NK-20260414-9031-ADJ', 0, '2026-04-14 15:08:54.242', '2026-04-14 15:08:54.276', '2026-04-14 15:08:54.276');
INSERT INTO `inventory_transactions` VALUES (26, 16, 1, NULL, 26, NULL, 1, 'import', 600.0000, 'Nhập kho từ phiếu NK-20260414-9953', 0, '2026-04-14 15:13:05.914', '2026-04-14 15:13:05.930', '2026-04-14 15:13:05.930');
INSERT INTO `inventory_transactions` VALUES (27, 16, 1, NULL, 26, NULL, 1, 'adjustment', -600.0000, 'Void & re-receive từ phiếu NK-20260414-9953-ADJ', 0, '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.297', '2026-04-14 15:13:33.297');
INSERT INTO `inventory_transactions` VALUES (28, 17, 1, NULL, 27, NULL, 1, 'import', 0.0000, 'Nhập kho từ phiếu NK-20260414-9953-ADJ', 0, '2026-04-14 15:13:33.281', '2026-04-14 15:13:33.327', '2026-04-14 15:13:33.327');
INSERT INTO `inventory_transactions` VALUES (29, 18, 1, NULL, 28, NULL, 1, 'import', 500.0000, 'Nhập kho từ phiếu NK-20260415-7641', 0, '2026-04-15 11:49:01.556', '2026-04-15 11:49:01.566', '2026-04-15 11:49:01.566');
INSERT INTO `inventory_transactions` VALUES (30, 19, 1, NULL, 31, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-4245', 0, '2026-04-15 13:51:07.113', '2026-04-15 13:51:07.123', '2026-04-15 13:51:07.123');
INSERT INTO `inventory_transactions` VALUES (31, 20, 1, NULL, 32, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-5159', 0, '2026-04-15 13:53:32.165', '2026-04-15 13:53:32.173', '2026-04-15 13:53:32.173');
INSERT INTO `inventory_transactions` VALUES (32, 21, 1, NULL, 33, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260415-5696', 0, '2026-04-15 14:02:26.303', '2026-04-15 14:02:26.311', '2026-04-15 14:02:26.311');
INSERT INTO `inventory_transactions` VALUES (35, 19, 1, NULL, NULL, NULL, 1, 'export', 100.0000, NULL, 0, '2026-04-17 15:21:00.686', '2026-04-17 15:21:00.748', '2026-04-17 15:21:00.748');
INSERT INTO `inventory_transactions` VALUES (36, 20, 1, NULL, NULL, NULL, 1, 'export', 200.0000, NULL, 0, '2026-04-17 15:21:00.686', '2026-04-17 15:21:00.764', '2026-04-17 15:21:00.764');
INSERT INTO `inventory_transactions` VALUES (37, 19, 1, NULL, NULL, NULL, 1, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', 0, '2026-04-17 15:22:45.087', '2026-04-17 15:22:45.088', '2026-04-17 15:22:45.088');
INSERT INTO `inventory_transactions` VALUES (38, 20, 1, NULL, NULL, NULL, 1, 'adjustment', 200.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', 0, '2026-04-17 15:22:45.104', '2026-04-17 15:22:45.105', '2026-04-17 15:22:45.105');
INSERT INTO `inventory_transactions` VALUES (39, 19, 1, NULL, NULL, NULL, 1, 'export', 100.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', 0, '2026-04-17 15:22:45.077', '2026-04-17 15:22:45.125', '2026-04-17 15:22:45.125');
INSERT INTO `inventory_transactions` VALUES (40, 19, 1, NULL, NULL, NULL, 1, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', 0, '2026-04-17 15:23:08.808', '2026-04-17 15:23:08.809', '2026-04-17 15:23:08.809');
INSERT INTO `inventory_transactions` VALUES (41, 19, 1, NULL, NULL, NULL, 1, 'export', 100.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', 0, '2026-04-17 15:23:08.800', '2026-04-17 15:23:08.826', '2026-04-17 15:23:08.826');
INSERT INTO `inventory_transactions` VALUES (42, 20, 1, NULL, NULL, NULL, 1, 'export', 200.0000, 'Xuất kho (cập nhật) – XK-20260417-222100', 0, '2026-04-17 15:23:08.800', '2026-04-17 15:23:08.834', '2026-04-17 15:23:08.834');
INSERT INTO `inventory_transactions` VALUES (43, 22, 1, NULL, 37, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260418-0619', 0, '2026-04-18 01:31:21.895', '2026-04-18 01:31:21.904', '2026-04-18 01:31:21.904');
INSERT INTO `inventory_transactions` VALUES (44, 19, 1, NULL, NULL, NULL, 1, 'adjustment', 100.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', 0, '2026-04-18 01:33:30.957', '2026-04-18 01:33:30.958', '2026-04-18 01:33:30.958');
INSERT INTO `inventory_transactions` VALUES (45, 20, 1, NULL, NULL, NULL, 1, 'adjustment', 200.0000, 'Hoàn trả tồn kho do chỉnh sửa phiếu xuất XK-20260417-222100', 0, '2026-04-18 01:33:30.972', '2026-04-18 01:33:30.973', '2026-04-18 01:33:30.973');
INSERT INTO `inventory_transactions` VALUES (51, 22, 1, 27, NULL, NULL, 1, 'export', 1000.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-101640', 0, '2026-04-18 03:16:40.451', '2026-04-18 03:16:58.404', '2026-04-18 03:16:58.404');
INSERT INTO `inventory_transactions` VALUES (52, 19, 1, 28, NULL, NULL, 1, 'export', 500.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-101640', 0, '2026-04-18 03:16:40.451', '2026-04-18 03:16:58.436', '2026-04-18 03:16:58.436');
INSERT INTO `inventory_transactions` VALUES (53, 21, 1, 31, NULL, NULL, 1, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-20260418-110137', 0, '2026-04-18 04:01:37.549', '2026-04-18 04:01:37.621', '2026-04-18 04:01:37.621');
INSERT INTO `inventory_transactions` VALUES (54, 21, 1, 31, NULL, NULL, 1, 'adjustment', 1.0000, 'Void phiếu gốc SMOKE-XK-20260418-110137 do điều chỉnh SMOKE-XK-20260418-110137-ADJ', 0, '2026-04-18 04:01:37.753', '2026-04-18 04:01:37.754', '2026-04-18 04:01:37.754');
INSERT INTO `inventory_transactions` VALUES (55, 21, 1, 32, NULL, NULL, 1, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-20260418-110137-ADJ', 0, '2026-04-18 04:01:37.770', '2026-04-18 04:01:37.771', '2026-04-18 04:01:37.771');
INSERT INTO `inventory_transactions` VALUES (56, 21, 1, 33, NULL, NULL, 1, 'export', 1.0000, 'Xuất kho khi hoàn thành phiếu SMOKE-XK-CANCEL-20260418-110936', 0, '2026-04-18 04:09:36.585', '2026-04-18 04:09:36.634', '2026-04-18 04:09:36.634');
INSERT INTO `inventory_transactions` VALUES (57, 19, 1, 40, NULL, NULL, 1, 'export', 250.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-143233', 0, '2026-04-18 07:33:10.802', '2026-04-18 07:33:14.727', '2026-04-18 07:33:14.727');
INSERT INTO `inventory_transactions` VALUES (58, 10, 1, 42, NULL, NULL, 1, 'export', 100.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-143233', 0, '2026-04-18 07:33:10.802', '2026-04-18 07:33:14.781', '2026-04-18 07:33:14.781');
INSERT INTO `inventory_transactions` VALUES (59, 19, 1, 44, NULL, NULL, 1, 'export', 50.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-144620', 0, '2026-04-18 07:48:08.748', '2026-04-18 07:48:16.640', '2026-04-18 07:48:16.640');
INSERT INTO `inventory_transactions` VALUES (60, 20, 1, 46, NULL, NULL, 1, 'export', 500.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-144620', 0, '2026-04-18 07:48:08.748', '2026-04-18 07:48:16.667', '2026-04-18 07:48:16.667');
INSERT INTO `inventory_transactions` VALUES (61, 6, 1, 50, NULL, NULL, 1, 'export', 2000.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-224559', 0, '2026-04-18 15:46:45.771', '2026-04-18 15:46:57.262', '2026-04-18 15:46:57.262');
INSERT INTO `inventory_transactions` VALUES (62, 18, 1, 51, NULL, NULL, 1, 'export', 500.0000, 'Xuất kho khi hoàn thành phiếu XK-20260418-224559', 0, '2026-04-18 15:46:45.771', '2026-04-18 15:46:57.283', '2026-04-18 15:46:57.283');
INSERT INTO `inventory_transactions` VALUES (63, 23, 1, NULL, NULL, NULL, 1, 'import', 202000.0000, 'Opening stock auto-post from item #24', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:11.543', '2026-04-21 09:33:11.543');
INSERT INTO `inventory_transactions` VALUES (64, 24, 1, NULL, NULL, NULL, 1, 'import', 50401.0000, 'Opening stock auto-post from item #25', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:11.814', '2026-04-21 09:33:11.814');
INSERT INTO `inventory_transactions` VALUES (65, 25, 1, NULL, NULL, NULL, 1, 'import', 117000.0000, 'Opening stock auto-post from item #26', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.016', '2026-04-21 09:33:12.016');
INSERT INTO `inventory_transactions` VALUES (66, 26, 1, NULL, NULL, NULL, 1, 'import', 5187.0000, 'Opening stock auto-post from item #27', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.173', '2026-04-21 09:33:12.173');
INSERT INTO `inventory_transactions` VALUES (67, 27, 1, NULL, NULL, NULL, 1, 'import', 35572.0000, 'Opening stock auto-post from item #28', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.346', '2026-04-21 09:33:12.346');
INSERT INTO `inventory_transactions` VALUES (68, 28, 1, NULL, NULL, NULL, 1, 'import', 200.0000, 'Opening stock auto-post from item #29', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.506', '2026-04-21 09:33:12.506');
INSERT INTO `inventory_transactions` VALUES (69, 29, 1, NULL, NULL, NULL, 1, 'import', 192.0000, 'Opening stock auto-post from item #30', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.665', '2026-04-21 09:33:12.665');
INSERT INTO `inventory_transactions` VALUES (70, 30, 1, NULL, NULL, NULL, 1, 'import', 2000.0000, 'Opening stock auto-post from item #31', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:12.833', '2026-04-21 09:33:12.833');
INSERT INTO `inventory_transactions` VALUES (71, 31, 1, NULL, NULL, NULL, 1, 'import', 8300.0000, 'Opening stock auto-post from item #32', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.003', '2026-04-21 09:33:13.003');
INSERT INTO `inventory_transactions` VALUES (72, 32, 1, NULL, NULL, NULL, 1, 'import', 0.0000, 'Opening stock auto-post from item #33', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.167', '2026-04-21 09:33:13.167');
INSERT INTO `inventory_transactions` VALUES (73, 33, 1, NULL, NULL, NULL, 1, 'import', 32675.0000, 'Opening stock auto-post from item #34', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.254', '2026-04-21 09:33:13.254');
INSERT INTO `inventory_transactions` VALUES (74, 34, 1, NULL, NULL, NULL, 1, 'import', 20000.0000, 'Opening stock auto-post from item #35', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.428', '2026-04-21 09:33:13.428');
INSERT INTO `inventory_transactions` VALUES (75, 35, 1, NULL, NULL, NULL, 1, 'import', 4000.0000, 'Opening stock auto-post from item #36', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.621', '2026-04-21 09:33:13.621');
INSERT INTO `inventory_transactions` VALUES (76, 36, 1, NULL, NULL, NULL, 1, 'import', 6000.0000, 'Opening stock auto-post from item #37', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:13.871', '2026-04-21 09:33:13.871');
INSERT INTO `inventory_transactions` VALUES (77, 37, 1, NULL, NULL, NULL, 1, 'import', 2000.0000, 'Opening stock auto-post from item #38', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.029', '2026-04-21 09:33:14.029');
INSERT INTO `inventory_transactions` VALUES (78, 38, 1, NULL, NULL, NULL, 1, 'import', 31369.0000, 'Opening stock auto-post from item #39', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.189', '2026-04-21 09:33:14.189');
INSERT INTO `inventory_transactions` VALUES (79, 39, 1, NULL, NULL, NULL, 1, 'import', 12000.0000, 'Opening stock auto-post from item #40', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.349', '2026-04-21 09:33:14.349');
INSERT INTO `inventory_transactions` VALUES (80, 40, 1, NULL, NULL, NULL, 1, 'import', 0.0000, 'Opening stock auto-post from item #41', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.513', '2026-04-21 09:33:14.513');
INSERT INTO `inventory_transactions` VALUES (81, 41, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #42', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.566', '2026-04-21 09:33:14.566');
INSERT INTO `inventory_transactions` VALUES (82, 42, 1, NULL, NULL, NULL, 1, 'import', 13991.0000, 'Opening stock auto-post from item #43', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:33:14.731', '2026-04-21 09:33:14.731');
INSERT INTO `inventory_transactions` VALUES (83, 42, 1, NULL, NULL, NULL, 1, 'adjustment', -13991.0000, 'Reversal delete opening stock item #43', 0, '2026-04-21 09:34:56.681', '2026-04-21 09:34:56.682', '2026-04-21 09:34:56.682');
INSERT INTO `inventory_transactions` VALUES (84, 41, 1, NULL, NULL, NULL, 1, 'adjustment', -1000.0000, 'Reversal delete opening stock item #42', 0, '2026-04-21 09:34:57.922', '2026-04-21 09:34:57.923', '2026-04-21 09:34:57.923');
INSERT INTO `inventory_transactions` VALUES (85, 39, 1, NULL, NULL, NULL, 1, 'adjustment', -12000.0000, 'Reversal delete opening stock item #40', 0, '2026-04-21 09:35:01.912', '2026-04-21 09:35:01.913', '2026-04-21 09:35:01.913');
INSERT INTO `inventory_transactions` VALUES (86, 38, 1, NULL, NULL, NULL, 1, 'adjustment', -31369.0000, 'Reversal delete opening stock item #39', 0, '2026-04-21 09:35:02.752', '2026-04-21 09:35:02.753', '2026-04-21 09:35:02.753');
INSERT INTO `inventory_transactions` VALUES (87, 36, 1, NULL, NULL, NULL, 1, 'adjustment', -6000.0000, 'Reversal delete opening stock item #37', 0, '2026-04-21 09:35:04.304', '2026-04-21 09:35:04.305', '2026-04-21 09:35:04.305');
INSERT INTO `inventory_transactions` VALUES (88, 33, 1, NULL, NULL, NULL, 1, 'adjustment', -32675.0000, 'Reversal delete opening stock item #34', 0, '2026-04-21 09:35:05.265', '2026-04-21 09:35:05.266', '2026-04-21 09:35:05.266');
INSERT INTO `inventory_transactions` VALUES (89, 31, 1, NULL, NULL, NULL, 1, 'adjustment', -8300.0000, 'Reversal delete opening stock item #32', 0, '2026-04-21 09:35:05.776', '2026-04-21 09:35:05.778', '2026-04-21 09:35:05.778');
INSERT INTO `inventory_transactions` VALUES (90, 37, 1, NULL, NULL, NULL, 1, 'adjustment', -2000.0000, 'Reversal delete opening stock item #38', 0, '2026-04-21 09:35:08.277', '2026-04-21 09:35:08.278', '2026-04-21 09:35:08.278');
INSERT INTO `inventory_transactions` VALUES (91, 35, 1, NULL, NULL, NULL, 1, 'adjustment', -4000.0000, 'Reversal delete opening stock item #36', 0, '2026-04-21 09:35:09.507', '2026-04-21 09:35:09.508', '2026-04-21 09:35:09.508');
INSERT INTO `inventory_transactions` VALUES (92, 34, 1, NULL, NULL, NULL, 1, 'adjustment', -20000.0000, 'Reversal delete opening stock item #35', 0, '2026-04-21 09:35:12.351', '2026-04-21 09:35:12.352', '2026-04-21 09:35:12.352');
INSERT INTO `inventory_transactions` VALUES (93, 30, 1, NULL, NULL, NULL, 1, 'adjustment', -2000.0000, 'Reversal delete opening stock item #31', 0, '2026-04-21 09:35:14.540', '2026-04-21 09:35:14.542', '2026-04-21 09:35:14.542');
INSERT INTO `inventory_transactions` VALUES (94, 29, 1, NULL, NULL, NULL, 1, 'adjustment', -192.0000, 'Reversal delete opening stock item #30', 0, '2026-04-21 09:35:17.174', '2026-04-21 09:35:17.175', '2026-04-21 09:35:17.175');
INSERT INTO `inventory_transactions` VALUES (95, 28, 1, NULL, NULL, NULL, 1, 'adjustment', -200.0000, 'Reversal delete opening stock item #29', 0, '2026-04-21 09:35:18.186', '2026-04-21 09:35:18.188', '2026-04-21 09:35:18.188');
INSERT INTO `inventory_transactions` VALUES (96, 27, 1, NULL, NULL, NULL, 1, 'adjustment', -35572.0000, 'Reversal delete opening stock item #28', 0, '2026-04-21 09:35:20.727', '2026-04-21 09:35:20.728', '2026-04-21 09:35:20.728');
INSERT INTO `inventory_transactions` VALUES (97, 25, 1, NULL, NULL, NULL, 1, 'adjustment', -117000.0000, 'Reversal delete opening stock item #26', 0, '2026-04-21 09:35:21.665', '2026-04-21 09:35:21.666', '2026-04-21 09:35:21.666');
INSERT INTO `inventory_transactions` VALUES (98, 23, 1, NULL, NULL, NULL, 1, 'adjustment', -202000.0000, 'Reversal delete opening stock item #24', 0, '2026-04-21 09:35:22.604', '2026-04-21 09:35:22.605', '2026-04-21 09:35:22.605');
INSERT INTO `inventory_transactions` VALUES (99, 26, 1, NULL, NULL, NULL, 1, 'adjustment', -5187.0000, 'Reversal delete opening stock item #27', 0, '2026-04-21 09:35:27.763', '2026-04-21 09:35:27.764', '2026-04-21 09:35:27.764');
INSERT INTO `inventory_transactions` VALUES (100, 24, 1, NULL, NULL, NULL, 1, 'adjustment', -50401.0000, 'Reversal delete opening stock item #25', 0, '2026-04-21 09:35:29.943', '2026-04-21 09:35:29.944', '2026-04-21 09:35:29.944');
INSERT INTO `inventory_transactions` VALUES (101, 43, 1, NULL, NULL, NULL, 1, 'import', 202000.0000, 'Opening stock auto-post from item #44', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:17.647', '2026-04-21 09:36:17.647');
INSERT INTO `inventory_transactions` VALUES (102, 44, 1, NULL, NULL, NULL, 1, 'import', 50401.0000, 'Opening stock auto-post from item #45', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:17.994', '2026-04-21 09:36:17.994');
INSERT INTO `inventory_transactions` VALUES (103, 45, 1, NULL, NULL, NULL, 1, 'import', 117000.0000, 'Opening stock auto-post from item #46', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.159', '2026-04-21 09:36:18.159');
INSERT INTO `inventory_transactions` VALUES (104, 46, 1, NULL, NULL, NULL, 1, 'import', 5187.0000, 'Opening stock auto-post from item #47', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.306', '2026-04-21 09:36:18.306');
INSERT INTO `inventory_transactions` VALUES (105, 47, 1, NULL, NULL, NULL, 1, 'import', 35572.0000, 'Opening stock auto-post from item #48', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.462', '2026-04-21 09:36:18.462');
INSERT INTO `inventory_transactions` VALUES (106, 48, 1, NULL, NULL, NULL, 1, 'import', 200.0000, 'Opening stock auto-post from item #49', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.618', '2026-04-21 09:36:18.618');
INSERT INTO `inventory_transactions` VALUES (107, 49, 1, NULL, NULL, NULL, 1, 'import', 192.0000, 'Opening stock auto-post from item #50', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.766', '2026-04-21 09:36:18.766');
INSERT INTO `inventory_transactions` VALUES (108, 50, 1, NULL, NULL, NULL, 1, 'import', 2000.0000, 'Opening stock auto-post from item #51', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:18.920', '2026-04-21 09:36:18.920');
INSERT INTO `inventory_transactions` VALUES (109, 51, 1, NULL, NULL, NULL, 1, 'import', 8300.0000, 'Opening stock auto-post from item #52', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.069', '2026-04-21 09:36:19.069');
INSERT INTO `inventory_transactions` VALUES (110, 52, 1, NULL, NULL, NULL, 1, 'import', 0.0000, 'Opening stock auto-post from item #53', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.214', '2026-04-21 09:36:19.214');
INSERT INTO `inventory_transactions` VALUES (111, 53, 1, NULL, NULL, NULL, 1, 'import', 32675.0000, 'Opening stock auto-post from item #54', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.299', '2026-04-21 09:36:19.299');
INSERT INTO `inventory_transactions` VALUES (112, 54, 1, NULL, NULL, NULL, 1, 'import', 20000.0000, 'Opening stock auto-post from item #55', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.468', '2026-04-21 09:36:19.468');
INSERT INTO `inventory_transactions` VALUES (113, 55, 1, NULL, NULL, NULL, 1, 'import', 4000.0000, 'Opening stock auto-post from item #56', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.623', '2026-04-21 09:36:19.623');
INSERT INTO `inventory_transactions` VALUES (114, 56, 1, NULL, NULL, NULL, 1, 'import', 6000.0000, 'Opening stock auto-post from item #57', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.799', '2026-04-21 09:36:19.799');
INSERT INTO `inventory_transactions` VALUES (115, 57, 1, NULL, NULL, NULL, 1, 'import', 2000.0000, 'Opening stock auto-post from item #58', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:19.952', '2026-04-21 09:36:19.952');
INSERT INTO `inventory_transactions` VALUES (116, 58, 1, NULL, NULL, NULL, 1, 'import', 31369.0000, 'Opening stock auto-post from item #59', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:20.096', '2026-04-21 09:36:20.096');
INSERT INTO `inventory_transactions` VALUES (117, 59, 1, NULL, NULL, NULL, 1, 'import', 12000.0000, 'Opening stock auto-post from item #60', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:20.232', '2026-04-21 09:36:20.232');
INSERT INTO `inventory_transactions` VALUES (118, 60, 1, NULL, NULL, NULL, 1, 'import', 0.0000, 'Opening stock auto-post from item #61', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:20.373', '2026-04-21 09:36:20.373');
INSERT INTO `inventory_transactions` VALUES (119, 61, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #62', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:20.419', '2026-04-21 09:36:20.419');
INSERT INTO `inventory_transactions` VALUES (120, 62, 1, NULL, NULL, NULL, 1, 'import', 13991.0000, 'Opening stock auto-post from item #63', 0, '2026-04-21 00:00:00.000', '2026-04-21 09:36:20.567', '2026-04-21 09:36:20.567');
INSERT INTO `inventory_transactions` VALUES (121, 63, 1, NULL, 38, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260421-7093', 0, '2026-04-21 15:02:18.526', '2026-04-21 15:02:18.537', '2026-04-21 15:02:18.537');
INSERT INTO `inventory_transactions` VALUES (122, 63, 1, NULL, 38, NULL, 1, 'adjustment', -1000.0000, 'Void & re-receive từ phiếu NK-20260421-7093-ADJ', 0, '2026-04-21 15:04:02.139', '2026-04-21 15:04:02.146', '2026-04-21 15:04:02.146');
INSERT INTO `inventory_transactions` VALUES (123, 64, 1, NULL, 40, NULL, 1, 'import', 0.0000, 'Nhập kho từ phiếu NK-20260421-7093-ADJ', 0, '2026-04-21 15:04:02.139', '2026-04-21 15:04:02.170', '2026-04-21 15:04:02.170');
INSERT INTO `inventory_transactions` VALUES (124, 65, 1, NULL, 42, NULL, 1, 'import', 300.0000, 'Nhập kho từ phiếu NK-20260423-0636', 0, '2026-04-23 01:33:50.824', '2026-04-23 01:33:50.834', '2026-04-23 01:33:50.834');
INSERT INTO `inventory_transactions` VALUES (125, 61, 1, 62, NULL, NULL, 1, 'export', 100.0000, 'Xuất kho khi hoàn thành phiếu XK-20260505-145453', 0, '2026-05-05 08:06:12.632', '2026-05-05 08:06:41.548', '2026-05-05 08:06:41.548');
INSERT INTO `inventory_transactions` VALUES (126, 66, 1, NULL, 41, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260421-9494', 0, '2026-05-05 08:49:06.490', '2026-05-05 08:49:06.504', '2026-05-05 08:49:06.504');
INSERT INTO `inventory_transactions` VALUES (127, 67, 1, NULL, NULL, NULL, 1, 'import', 1000.0000, 'Opening stock auto-post from item #64', 0, '2026-05-01 00:00:00.000', '2026-05-08 14:08:21.205', '2026-05-08 14:08:21.205');
INSERT INTO `inventory_transactions` VALUES (128, 68, 1, NULL, 44, NULL, 1, 'import', 1000.0000, 'Nhập kho từ phiếu NK-20260508-8217', 0, '2026-05-08 14:51:58.302', '2026-05-08 14:51:58.311', '2026-05-08 14:51:58.311');
INSERT INTO `inventory_transactions` VALUES (129, 67, 2, NULL, NULL, 8, 1, 'export', 10.0000, 'Xuất NVL cho lệnh PSX-20260516-8576', 1, '2026-05-16 14:14:54.042', '2026-05-16 14:14:54.055', '2026-05-16 14:23:21.024');
INSERT INTO `inventory_transactions` VALUES (130, 64, 2, NULL, NULL, 8, 1, 'export', 1000.0000, 'Xuất NVL cho lệnh PSX-20260516-8576', 1, '2026-05-16 14:22:38.983', '2026-05-16 14:22:38.992', '2026-05-16 14:23:21.039');
INSERT INTO `inventory_transactions` VALUES (131, 67, 2, NULL, NULL, 8, 1, 'import', 10.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260516-8576', 0, '2026-05-16 14:23:21.008', '2026-05-16 14:23:21.019', '2026-05-16 14:23:21.019');
INSERT INTO `inventory_transactions` VALUES (132, 64, 2, NULL, NULL, 8, 1, 'import', 1000.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260516-8576', 0, '2026-05-16 14:23:21.008', '2026-05-16 14:23:21.037', '2026-05-16 14:23:21.037');
INSERT INTO `inventory_transactions` VALUES (133, 30, 2, NULL, NULL, 9, 1, 'export', 1000.0000, 'Xuất NVL cho lệnh PSX-20260518-7925', 0, '2026-05-18 02:11:36.849', '2026-05-18 02:11:36.859', '2026-05-18 02:11:36.859');
INSERT INTO `inventory_transactions` VALUES (134, 67, 2, NULL, NULL, 9, 1, 'export', 50.0000, 'Xuất NVL cho lệnh PSX-20260518-7925', 0, '2026-05-18 02:11:36.849', '2026-05-18 02:11:36.870', '2026-05-18 02:11:36.870');
INSERT INTO `inventory_transactions` VALUES (135, 30, 2, NULL, NULL, 9, 1, 'import', 10.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260518-7925', 0, '2026-05-18 06:42:44.507', '2026-05-18 06:42:44.512', '2026-05-18 06:42:44.512');
INSERT INTO `inventory_transactions` VALUES (136, 31, 2, NULL, NULL, 9, 1, 'export', 500.0000, 'Xuất NVL cho lệnh PSX-20260518-7925', 0, '2026-05-18 07:21:36.647', '2026-05-18 07:21:36.660', '2026-05-18 07:21:36.660');
INSERT INTO `inventory_transactions` VALUES (137, 64, 2, NULL, NULL, 9, 1, 'export', 400.0000, 'Xuất NVL cho lệnh PSX-20260518-7925', 0, '2026-05-18 07:30:27.200', '2026-05-18 07:30:27.215', '2026-05-18 07:30:27.215');
INSERT INTO `inventory_transactions` VALUES (138, 31, 2, NULL, NULL, 9, 1, 'import', 500.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260518-7925', 0, '2026-05-18 07:44:10.181', '2026-05-18 07:44:10.186', '2026-05-18 07:44:10.186');
INSERT INTO `inventory_transactions` VALUES (139, 67, 2, NULL, NULL, 9, 1, 'import', 10.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260518-7925', 0, '2026-05-18 07:44:10.181', '2026-05-18 07:44:10.203', '2026-05-18 07:44:10.203');
INSERT INTO `inventory_transactions` VALUES (140, 64, 2, NULL, NULL, 9, 1, 'import', 100.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260518-7925', 0, '2026-05-18 07:44:10.181', '2026-05-18 07:44:10.213', '2026-05-18 07:44:10.213');
INSERT INTO `inventory_transactions` VALUES (141, 67, 2, NULL, NULL, 10, 1, 'export', 50.0000, 'Xuất NVL cho lệnh PSX-20260519-2243', 0, '2026-05-19 06:36:13.500', '2026-05-19 06:36:13.510', '2026-05-19 06:36:13.510');
INSERT INTO `inventory_transactions` VALUES (142, 28, 2, NULL, NULL, 10, 1, 'export', 100.0000, 'Xuất NVL cho lệnh PSX-20260519-2243', 0, '2026-05-19 06:36:13.500', '2026-05-19 06:36:13.521', '2026-05-19 06:36:13.521');
INSERT INTO `inventory_transactions` VALUES (143, 67, 2, NULL, NULL, 10, 1, 'import', 50.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-2243', 0, '2026-05-19 06:40:20.349', '2026-05-19 06:40:20.354', '2026-05-19 06:40:20.354');
INSERT INTO `inventory_transactions` VALUES (144, 28, 2, NULL, NULL, 10, 1, 'import', 20.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-2243', 0, '2026-05-19 06:40:20.349', '2026-05-19 06:40:20.373', '2026-05-19 06:40:20.373');
INSERT INTO `inventory_transactions` VALUES (145, 67, 2, NULL, NULL, 11, 1, 'export', 60.0000, 'Xuất NVL cho lệnh PSX-20260519-9457', 0, '2026-05-19 06:44:04.977', '2026-05-19 06:44:04.988', '2026-05-19 06:44:04.988');
INSERT INTO `inventory_transactions` VALUES (146, 27, 2, NULL, NULL, 11, 1, 'export', 72.0000, 'Xuất NVL cho lệnh PSX-20260519-9457', 0, '2026-05-19 06:44:04.977', '2026-05-19 06:44:05.000', '2026-05-19 06:44:05.000');
INSERT INTO `inventory_transactions` VALUES (147, 67, 2, NULL, NULL, 11, 1, 'import', 25.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-9457', 0, '2026-05-19 06:46:07.767', '2026-05-19 06:46:07.772', '2026-05-19 06:46:07.772');
INSERT INTO `inventory_transactions` VALUES (148, 67, 2, NULL, NULL, 12, 1, 'export', 50.0000, 'Xuất NVL cho lệnh PSX-20260519-0781', 0, '2026-05-19 06:53:41.845', '2026-05-19 06:53:41.877', '2026-05-19 06:53:41.877');
INSERT INTO `inventory_transactions` VALUES (149, 15, 2, NULL, NULL, 12, 1, 'export', 500.0000, 'Xuất NVL cho lệnh PSX-20260519-0781', 0, '2026-05-19 06:53:41.845', '2026-05-19 06:53:41.890', '2026-05-19 06:53:41.890');
INSERT INTO `inventory_transactions` VALUES (150, 67, 2, NULL, NULL, 12, 1, 'import', 50.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-0781', 0, '2026-05-19 06:55:33.252', '2026-05-19 06:55:33.256', '2026-05-19 06:55:33.256');
INSERT INTO `inventory_transactions` VALUES (151, 15, 2, NULL, NULL, 12, 1, 'import', 100.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-0781', 0, '2026-05-19 06:55:33.252', '2026-05-19 06:55:33.301', '2026-05-19 06:55:33.301');
INSERT INTO `inventory_transactions` VALUES (152, 42, 2, NULL, NULL, 13, 8, 'import', 50.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260519-1553', 0, '2026-05-19 14:25:23.274', '2026-05-19 14:25:23.278', '2026-05-19 14:25:23.278');
INSERT INTO `inventory_transactions` VALUES (153, 39, 2, NULL, NULL, 14, 1, 'export', 1000.0000, 'Xuất NVL cho lệnh PSX-20260520-9916', 0, '2026-05-20 02:33:03.846', '2026-05-20 02:33:03.855', '2026-05-20 02:33:03.855');
INSERT INTO `inventory_transactions` VALUES (154, 69, 1, NULL, NULL, NULL, 3, 'import', 100.0000, 'Opening stock auto-post from item #65', 0, '2026-05-20 00:00:00.000', '2026-05-20 07:22:16.293', '2026-05-20 07:22:16.293');
INSERT INTO `inventory_transactions` VALUES (155, 67, 2, 66, NULL, NULL, 1, 'export', 25.0000, 'Xuất kho khi hoàn thành phiếu XK-20260520-150912', 0, '2026-05-20 08:09:46.922', '2026-05-20 08:09:48.589', '2026-05-20 08:09:48.589');
INSERT INTO `inventory_transactions` VALUES (156, 67, 2, NULL, NULL, 15, 1, 'export', 10.0000, 'Xuất NVL cho lệnh PSX-20260520-1873', 1, '2026-05-20 08:23:45.739', '2026-05-20 08:23:45.754', '2026-05-20 08:26:23.920');
INSERT INTO `inventory_transactions` VALUES (157, 39, 2, NULL, NULL, 15, 1, 'export', 300.0000, 'Xuất NVL cho lệnh PSX-20260520-1873', 1, '2026-05-20 08:23:45.739', '2026-05-20 08:23:45.767', '2026-05-20 08:26:23.936');
INSERT INTO `inventory_transactions` VALUES (158, 67, 2, NULL, NULL, 15, 1, 'import', 10.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-1873', 0, '2026-05-20 08:26:23.900', '2026-05-20 08:26:23.913', '2026-05-20 08:26:23.913');
INSERT INTO `inventory_transactions` VALUES (159, 39, 2, NULL, NULL, 15, 1, 'import', 300.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-1873', 0, '2026-05-20 08:26:23.900', '2026-05-20 08:26:23.934', '2026-05-20 08:26:23.934');
INSERT INTO `inventory_transactions` VALUES (160, 67, 2, NULL, NULL, 16, 1, 'export', 15.0000, 'Xuất NVL cho lệnh PSX-20260520-2380', 0, '2026-05-20 08:42:46.461', '2026-05-20 08:42:46.486', '2026-05-20 08:42:46.486');
INSERT INTO `inventory_transactions` VALUES (161, 33, 2, NULL, NULL, 16, 1, 'export', 675.0000, 'Xuất NVL cho lệnh PSX-20260520-2380', 0, '2026-05-20 08:43:22.097', '2026-05-20 08:43:22.105', '2026-05-20 08:43:22.105');
INSERT INTO `inventory_transactions` VALUES (162, 67, 2, NULL, NULL, 16, 1, 'import', 5.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260520-2380', 0, '2026-05-20 08:46:25.770', '2026-05-20 08:46:25.777', '2026-05-20 08:46:25.777');
INSERT INTO `inventory_transactions` VALUES (163, 33, 2, NULL, NULL, 16, 1, 'import', 25.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260520-2380', 0, '2026-05-20 08:46:25.770', '2026-05-20 08:46:25.800', '2026-05-20 08:46:25.800');
INSERT INTO `inventory_transactions` VALUES (164, 67, 2, 68, NULL, NULL, 1, 'export', 5.0000, 'Xuất kho khi hoàn thành phiếu XK-20260520-162918', 0, '2026-05-20 09:29:18.118', '2026-05-20 09:29:43.542', '2026-05-20 09:29:43.542');
INSERT INTO `inventory_transactions` VALUES (165, 67, 2, NULL, NULL, 17, 1, 'export', 85.0000, 'Xuất NVL cho lệnh PSX-20260520-5092', 0, '2026-05-20 13:13:05.766', '2026-05-20 13:13:05.776', '2026-05-20 13:13:05.776');
INSERT INTO `inventory_transactions` VALUES (166, 39, 2, NULL, NULL, 17, 1, 'export', 369.0000, 'Xuất NVL cho lệnh PSX-20260520-5092', 0, '2026-05-20 13:14:37.373', '2026-05-20 13:14:37.380', '2026-05-20 13:14:37.380');
INSERT INTO `inventory_transactions` VALUES (167, 26, 2, NULL, NULL, 17, 1, 'export', 87.0000, 'Xuất NVL cho lệnh PSX-20260520-5092', 0, '2026-05-18 17:00:00.000', '2026-05-20 13:18:50.062', '2026-05-20 13:18:50.062');
INSERT INTO `inventory_transactions` VALUES (168, 67, 2, NULL, NULL, 17, 1, 'import', 85.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260520-5092', 0, '2026-05-20 13:20:50.781', '2026-05-20 13:20:50.792', '2026-05-20 13:20:50.792');
INSERT INTO `inventory_transactions` VALUES (169, 39, 2, NULL, NULL, 17, 1, 'import', 369.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260520-5092', 0, '2026-05-20 13:20:50.781', '2026-05-20 13:20:50.809', '2026-05-20 13:20:50.809');
INSERT INTO `inventory_transactions` VALUES (170, 26, 2, NULL, NULL, 17, 1, 'import', 87.0000, 'Hoàn nhập NVL thừa – lệnh PSX-20260520-5092', 0, '2026-05-20 13:20:50.781', '2026-05-20 13:20:50.818', '2026-05-20 13:20:50.818');
INSERT INTO `inventory_transactions` VALUES (171, 64, 2, NULL, NULL, 18, 1, 'export', 100.0000, 'Xuất NVL cho lệnh PSX-20260520-8470', 1, '2026-05-18 17:00:00.000', '2026-05-20 13:41:03.874', '2026-05-20 13:44:18.760');
INSERT INTO `inventory_transactions` VALUES (172, 33, 2, NULL, NULL, 18, 1, 'export', 100.0000, 'Xuất NVL cho lệnh PSX-20260520-8470', 1, '2026-05-19 17:00:00.000', '2026-05-20 13:41:16.706', '2026-05-20 13:44:18.772');
INSERT INTO `inventory_transactions` VALUES (173, 64, 2, NULL, NULL, 18, 1, 'import', 100.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-8470', 0, '2026-05-20 13:44:18.742', '2026-05-20 13:44:18.754', '2026-05-20 13:44:18.754');
INSERT INTO `inventory_transactions` VALUES (174, 33, 2, NULL, NULL, 18, 1, 'import', 100.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-8470', 0, '2026-05-20 13:44:18.742', '2026-05-20 13:44:18.769', '2026-05-20 13:44:18.769');
INSERT INTO `inventory_transactions` VALUES (175, 67, 2, NULL, NULL, 19, 1, 'export', 90.0000, 'Xuất NVL cho lệnh PSX-20260520-4125', 1, '2026-05-17 17:00:00.000', '2026-05-20 13:45:48.767', '2026-05-20 14:20:36.030');
INSERT INTO `inventory_transactions` VALUES (176, 36, 2, NULL, NULL, 19, 1, 'export', 100.0000, 'Xuất NVL cho lệnh PSX-20260520-4125', 1, '2026-05-18 17:00:00.000', '2026-05-20 13:46:14.950', '2026-05-20 14:20:36.041');
INSERT INTO `inventory_transactions` VALUES (177, 34, 2, NULL, NULL, 20, 1, 'export', 1000.0000, 'Xuất NVL cho lệnh PSX-20260520-6833', 0, '2026-05-18 17:00:00.000', '2026-05-20 14:01:16.803', '2026-05-20 14:01:16.803');
INSERT INTO `inventory_transactions` VALUES (178, 67, 2, NULL, NULL, 19, 1, 'import', 90.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-4125', 0, '2026-05-20 14:20:36.012', '2026-05-20 14:20:36.024', '2026-05-20 14:20:36.024');
INSERT INTO `inventory_transactions` VALUES (179, 36, 2, NULL, NULL, 19, 1, 'import', 100.0000, 'Hoàn kho NVL – hủy lệnh PSX-20260520-4125', 0, '2026-05-20 14:20:36.012', '2026-05-20 14:20:36.038', '2026-05-20 14:20:36.038');
INSERT INTO `inventory_transactions` VALUES (180, 67, 2, NULL, NULL, 21, 1, 'export', 25.0000, 'Xuất NVL cho lệnh PSX-20260523-2893', 0, '2026-05-19 17:00:00.000', '2026-05-23 04:59:29.910', '2026-05-23 04:59:29.910');

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
) ENGINE = InnoDB AUTO_INCREMENT = 54 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `notifications` VALUES (37, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 13:57:46.484', '2026-04-21 13:57:46.484');
INSERT INTO `notifications` VALUES (38, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"23\", \"actionType\": \"submitted\"}', NULL, '2026-04-21 13:58:28.635', '2026-04-21 13:58:28.635');
INSERT INTO `notifications` VALUES (39, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 13:59:19.400', '2026-04-21 13:59:19.400');
INSERT INTO `notifications` VALUES (40, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"23\", \"actionType\": \"submitted\"}', NULL, '2026-04-21 14:00:58.555', '2026-04-21 14:00:58.555');
INSERT INTO `notifications` VALUES (41, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 14:01:11.183', '2026-04-21 14:01:11.183');
INSERT INTO `notifications` VALUES (42, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"23\", \"actionType\": \"submitted\"}', NULL, '2026-04-21 14:01:26.935', '2026-04-21 14:01:26.935');
INSERT INTO `notifications` VALUES (43, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 14:01:33.638', '2026-04-21 14:01:33.638');
INSERT INTO `notifications` VALUES (44, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 14:01:41.661', '2026-04-21 14:01:41.661');
INSERT INTO `notifications` VALUES (45, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 14:03:39.046', '2026-04-21 14:03:39.046');
INSERT INTO `notifications` VALUES (46, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"23\", \"actionType\": \"submitted\"}', NULL, '2026-04-21 14:03:39.244', '2026-04-21 14:03:39.244');
INSERT INTO `notifications` VALUES (47, 1, 'purchase_request_event', '{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"23\", \"actionType\": \"updated\"}', NULL, '2026-04-21 14:09:20.359', '2026-04-21 14:09:20.359');
INSERT INTO `notifications` VALUES (48, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"24\", \"actionType\": \"created\"}', NULL, '2026-04-21 14:10:50.432', '2026-04-21 14:10:50.432');
INSERT INTO `notifications` VALUES (49, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"24\", \"actionType\": \"submitted\"}', NULL, '2026-04-21 14:10:50.746', '2026-04-21 14:10:50.746');
INSERT INTO `notifications` VALUES (50, 1, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"26\", \"actionType\": \"created\"}', NULL, '2026-04-23 01:30:20.291', '2026-04-23 01:30:20.291');
INSERT INTO `notifications` VALUES (51, 1, 'purchase_request_event', '{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"26\", \"actionType\": \"updated\"}', NULL, '2026-04-23 01:30:24.181', '2026-04-23 01:30:24.181');
INSERT INTO `notifications` VALUES (52, 1, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"26\", \"actionType\": \"submitted\"}', NULL, '2026-04-23 01:30:24.628', '2026-04-23 01:30:24.628');
INSERT INTO `notifications` VALUES (53, 2, 'purchase_request_event', '{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"27\", \"actionType\": \"created\"}', NULL, '2026-05-08 14:43:23.839', '2026-05-08 14:43:23.839');
INSERT INTO `notifications` VALUES (54, 2, 'purchase_request_event', '{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"27\", \"actionType\": \"submitted\"}', NULL, '2026-05-08 14:43:24.037', '2026-05-08 14:43:24.037');

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
INSERT INTO `opening_stock_item_documents` VALUES (16, 23, 'MSDS', 'uploads/opening-stock/b8145156-a454-45fa-8153-91cafca446f4.jpg', 'eba49690-5636-496f-8d72-f8d95a52ebda.jpg', 'image/jpeg', 1410920, 1, '2026-04-14 20:07:31.848', '2026-04-14 20:07:31.848');
INSERT INTO `opening_stock_item_documents` VALUES (17, 23, 'COA', 'uploads/opening-stock/32f07f90-fc2c-4427-a978-6152fd5d6a1d.xlsx', 'products_export_1774918514946.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 17964, 1, '2026-04-14 20:07:31.887', '2026-04-14 20:07:31.887');
INSERT INTO `opening_stock_item_documents` VALUES (18, 23, 'Invoice', 'uploads/opening-stock/f2dd71f3-b767-490c-8bdf-571f77a6557c.pdf', 'Visily-Export-Đơn Hàng Sản Xuất-2026-03-23.pdf', 'application/pdf', 248368, 1, '2026-04-14 20:07:31.930', '2026-04-14 20:07:31.930');
INSERT INTO `opening_stock_item_documents` VALUES (19, 23, 'MSDS', 'uploads/opening-stock/b9b6601c-ab7b-455e-942e-7139182ef6e5.jpg', 'msds_tmp.jpg', 'image/jpeg', 215960, 1, '2026-04-21 14:11:59.948', '2026-04-21 14:11:59.948');
INSERT INTO `opening_stock_item_documents` VALUES (75, 44, 'MSDS', 'uploads/opening-stock/6eabfcac-bdfb-4548-bb41-c2265ea911c2.pdf', 'MSDS_COA_PROPYLENE GLYCOL.pdf', 'application/pdf', 326307, 1, '2026-04-21 16:36:17.832', '2026-04-21 16:36:17.832');
INSERT INTO `opening_stock_item_documents` VALUES (76, 44, 'COA', 'uploads/opening-stock/c75b01f7-f252-4448-bbe5-ff97faea888e.pdf', 'COA_PROPYLENE GLYCOL_GX250204L1.pdf', 'application/pdf', 740802, 1, '2026-04-21 16:36:17.869', '2026-04-21 16:36:17.869');
INSERT INTO `opening_stock_item_documents` VALUES (77, 44, 'Invoice', 'uploads/opening-stock/01064d54-9e39-441c-ba40-9b48387fcdc7.pdf', 'HD_MIFA_1361.pdf', 'application/pdf', 188386, 1, '2026-04-21 16:36:17.908', '2026-04-21 16:36:17.908');
INSERT INTO `opening_stock_item_documents` VALUES (78, 45, 'MSDS', 'uploads/opening-stock/d587fe23-f34b-4d26-82f6-54ebbc92f4e9.pdf', 'MSDS_GLYCERIN.pdf', 'application/pdf', 69260, 1, '2026-04-21 16:36:18.016', '2026-04-21 16:36:18.016');
INSERT INTO `opening_stock_item_documents` VALUES (79, 45, 'COA', 'uploads/opening-stock/4022d67b-4413-4ba1-b19f-7d159a4ad0ba.jpg', 'COA_GLYCERIN_014125IND3C5L.jpg', 'image/jpeg', 215960, 1, '2026-04-21 16:36:18.049', '2026-04-21 16:36:18.049');
INSERT INTO `opening_stock_item_documents` VALUES (80, 45, 'Invoice', 'uploads/opening-stock/ba6701f0-1645-4131-a4b9-c8161919e61c.pdf', 'HD_HOAN VU_11.pdf', 'application/pdf', 2899494, 1, '2026-04-21 16:36:18.092', '2026-04-21 16:36:18.092');
INSERT INTO `opening_stock_item_documents` VALUES (81, 46, 'MSDS', 'uploads/opening-stock/f27dbb77-27d0-4bbe-b221-dbbcd7f4d012.pdf', 'MSDS_GLYCERIN.pdf', 'application/pdf', 69260, 1, '2026-04-21 16:36:18.179', '2026-04-21 16:36:18.179');
INSERT INTO `opening_stock_item_documents` VALUES (82, 46, 'Invoice', 'uploads/opening-stock/2c9c5270-e1d1-4269-9435-a49fbffc8213.pdf', 'HD_MIFA_1361.pdf', 'application/pdf', 188386, 1, '2026-04-21 16:36:18.213', '2026-04-21 16:36:18.213');
INSERT INTO `opening_stock_item_documents` VALUES (83, 46, 'Other', 'uploads/opening-stock/c79f99dc-dd29-4539-8900-f65d0550d2c9.pdf', 'TEST REPORT_GLYCERIN.pdf', 'application/pdf', 164447, 1, '2026-04-21 16:36:18.249', '2026-04-21 16:36:18.249');
INSERT INTO `opening_stock_item_documents` VALUES (84, 47, 'MSDS', 'uploads/opening-stock/290d2bd1-4bd8-4d82-b476-65ff329f949a.pdf', 'MSDS_ALLANTOIN.pdf', 'application/pdf', 120632, 1, '2026-04-21 16:36:18.334', '2026-04-21 16:36:18.334');
INSERT INTO `opening_stock_item_documents` VALUES (85, 47, 'COA', 'uploads/opening-stock/d2fef2f0-1f19-4333-a166-0b070655cac1.pdf', 'COA_ALLANTOIN_25LOT01156.pdf', 'application/pdf', 115630, 1, '2026-04-21 16:36:18.360', '2026-04-21 16:36:18.360');
INSERT INTO `opening_stock_item_documents` VALUES (86, 47, 'Invoice', 'uploads/opening-stock/cf1b3e5c-e211-413c-bf71-12736921dc39.pdf', 'HD_HOAN VU_11.pdf', 'application/pdf', 2899494, 1, '2026-04-21 16:36:18.408', '2026-04-21 16:36:18.408');
INSERT INTO `opening_stock_item_documents` VALUES (87, 48, 'COA', 'uploads/opening-stock/c01bdadc-a818-4e3e-a348-18e14e8dadac.pdf', 'COA_D-PANTHENOL_TL02409085.pdf', 'application/pdf', 800815, 1, '2026-04-21 16:36:18.491', '2026-04-21 16:36:18.491');
INSERT INTO `opening_stock_item_documents` VALUES (88, 48, 'COA', 'uploads/opening-stock/f979e43e-b73a-4013-a868-119328a9d0e0.pdf', 'COA_D-PANTHENOL_TL02409085.pdf', 'application/pdf', 800815, 1, '2026-04-21 16:36:18.528', '2026-04-21 16:36:18.528');
INSERT INTO `opening_stock_item_documents` VALUES (89, 48, 'Invoice', 'uploads/opening-stock/d530db4e-b307-4fa6-a86c-a88156733855.pdf', 'HD_MIFA_1361.pdf', 'application/pdf', 188386, 1, '2026-04-21 16:36:18.565', '2026-04-21 16:36:18.565');
INSERT INTO `opening_stock_item_documents` VALUES (90, 49, 'MSDS', 'uploads/opening-stock/6b4bcf4e-e178-4c4f-9e4b-be9cd9813a75.pdf', 'MSDS_CS-GINGER EXT.pdf', 'application/pdf', 109510, 1, '2026-04-21 16:36:18.643', '2026-04-21 16:36:18.643');
INSERT INTO `opening_stock_item_documents` VALUES (91, 49, 'COA', 'uploads/opening-stock/83447ad2-774b-4f43-81f6-896bbfa2a9ae.pdf', 'COA_CS-GINGER EXT_EI2501.pdf', 'application/pdf', 63898, 1, '2026-04-21 16:36:18.676', '2026-04-21 16:36:18.676');
INSERT INTO `opening_stock_item_documents` VALUES (92, 49, 'Invoice', 'uploads/opening-stock/83a3ff8c-8b13-477c-b109-5b230c348164.jpg', 'HD_KHANGNGOC_997.jpg', 'image/jpeg', 76916, 1, '2026-04-21 16:36:18.699', '2026-04-21 16:36:18.699');
INSERT INTO `opening_stock_item_documents` VALUES (93, 50, 'MSDS', 'uploads/opening-stock/c0e11768-cc6d-4f55-a151-6a64251b2536.pdf', 'MSDS_RICOBIO JA7.pdf', 'application/pdf', 231970, 1, '2026-04-21 16:36:18.792', '2026-04-21 16:36:18.792');
INSERT INTO `opening_stock_item_documents` VALUES (94, 50, 'COA', 'uploads/opening-stock/d97478c8-438f-4236-bf18-623ee4ec9e67.pdf', 'COA_RICOBIO JA7_25091685.pdf', 'application/pdf', 116087, 1, '2026-04-21 16:36:18.828', '2026-04-21 16:36:18.828');
INSERT INTO `opening_stock_item_documents` VALUES (95, 50, 'Invoice', 'uploads/opening-stock/d3a53e79-aea3-448f-a522-29692bae05ed.pdf', 'HD_3H_723.pdf', 'application/pdf', 272373, 1, '2026-04-21 16:36:18.864', '2026-04-21 16:36:18.864');
INSERT INTO `opening_stock_item_documents` VALUES (96, 51, 'MSDS', 'uploads/opening-stock/0cb4ee46-23bb-4bb9-b3e4-9b2b7026c4f9.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-21 16:36:18.947', '2026-04-21 16:36:18.947');
INSERT INTO `opening_stock_item_documents` VALUES (97, 51, 'COA', 'uploads/opening-stock/7ed7d5b3-4e6f-4611-912c-95c1e97946b7.pdf', 'COA_CARBOMER_B2E04349.pdf', 'application/pdf', 136432, 1, '2026-04-21 16:36:18.979', '2026-04-21 16:36:18.979');
INSERT INTO `opening_stock_item_documents` VALUES (98, 51, 'Invoice', 'uploads/opening-stock/a916429b-7b06-4aeb-a05c-5a50714ac1ec.jpg', 'HD_NGUYENBA_9911.jpg', 'image/jpeg', 84276, 1, '2026-04-21 16:36:19.013', '2026-04-21 16:36:19.013');
INSERT INTO `opening_stock_item_documents` VALUES (99, 52, 'MSDS', 'uploads/opening-stock/dcf7efca-a701-4478-a766-e9165454cc80.pdf', 'MSDS_CARBOMER.pdf', 'application/pdf', 186415, 1, '2026-04-21 16:36:19.094', '2026-04-21 16:36:19.094');
INSERT INTO `opening_stock_item_documents` VALUES (100, 52, 'COA', 'uploads/opening-stock/d7159425-454d-4394-af35-148f4b3c8a97.pdf', 'COA_CARBOMER_B2F04120.pdf', 'application/pdf', 720632, 1, '2026-04-21 16:36:19.129', '2026-04-21 16:36:19.129');
INSERT INTO `opening_stock_item_documents` VALUES (101, 52, 'Invoice', 'uploads/opening-stock/5fe77723-6d66-4b63-b7e5-b3076e5f0a84.png', 'HD_NGUYENBA_12118.png', 'image/png', 128152, 1, '2026-04-21 16:36:19.162', '2026-04-21 16:36:19.162');
INSERT INTO `opening_stock_item_documents` VALUES (102, 53, 'Invoice', 'uploads/opening-stock/86f5a28d-e305-4917-b5a9-54076ac830b6.pdf', 'HD_DERMATRIX_35.pdf', 'application/pdf', 111221, 1, '2026-04-21 16:36:19.243', '2026-04-21 16:36:19.243');
INSERT INTO `opening_stock_item_documents` VALUES (103, 54, 'MSDS', 'uploads/opening-stock/67650372-8765-4707-ad19-419f597aaed8.pdf', 'MSDS_VITAMINE.pdf', 'application/pdf', 173415, 1, '2026-04-21 16:36:19.332', '2026-04-21 16:36:19.332');
INSERT INTO `opening_stock_item_documents` VALUES (104, 54, 'COA', 'uploads/opening-stock/94de8b04-e865-41fc-a6cf-12550ec8b553.pdf', 'COA_VITAMIN E_32666436W0.pdf', 'application/pdf', 1766122, 1, '2026-04-21 16:36:19.376', '2026-04-21 16:36:19.376');
INSERT INTO `opening_stock_item_documents` VALUES (105, 54, 'Invoice', 'uploads/opening-stock/351d4e7a-48f3-4000-a2b2-24f14dc58230.pdf', 'HD_MIFA_1361.pdf', 'application/pdf', 188386, 1, '2026-04-21 16:36:19.408', '2026-04-21 16:36:19.408');
INSERT INTO `opening_stock_item_documents` VALUES (106, 55, 'MSDS', 'uploads/opening-stock/0607528a-48b6-49f9-b7ab-079330fee257.pdf', 'MSDS_TOCOPHERYL ACETATE.pdf', 'application/pdf', 248675, 1, '2026-04-21 16:36:19.494', '2026-04-21 16:36:19.494');
INSERT INTO `opening_stock_item_documents` VALUES (107, 55, 'COA', 'uploads/opening-stock/6a1231ea-04f4-44d6-8298-3311579eeb5c.pdf', 'COA_TOCOPHERYL ACETATE_UT25100294.pdf', 'application/pdf', 391453, 1, '2026-04-21 16:36:19.528', '2026-04-21 16:36:19.528');
INSERT INTO `opening_stock_item_documents` VALUES (108, 55, 'Invoice', 'uploads/opening-stock/4eb9386c-a8c8-44d9-b761-a0909a125e77.pdf', 'HD_HOANVU_24.pdf', 'application/pdf', 2788237, 1, '2026-04-21 16:36:19.564', '2026-04-21 16:36:19.564');
INSERT INTO `opening_stock_item_documents` VALUES (109, 56, 'MSDS', 'uploads/opening-stock/2c755eb7-aef0-4c6a-a86b-f59da13f6316.pdf', 'MSDS_METHYL SALICYLATE.pdf', 'application/pdf', 5997456, 1, '2026-04-21 16:36:19.676', '2026-04-21 16:36:19.676');
INSERT INTO `opening_stock_item_documents` VALUES (110, 56, 'COA', 'uploads/opening-stock/81b63197-c6d2-4c2c-bcda-4b3c94126aa9.pdf', 'COA_METHYL SALICYLATE_2502009.pdf', 'application/pdf', 856414, 1, '2026-04-21 16:36:19.712', '2026-04-21 16:36:19.712');
INSERT INTO `opening_stock_item_documents` VALUES (111, 56, 'Invoice', 'uploads/opening-stock/bfa69a19-6742-4cd8-8cf7-7cad2ced7c1f.png', 'HD_NGUYENBA_12118.png', 'image/png', 128152, 1, '2026-04-21 16:36:19.745', '2026-04-21 16:36:19.745');
INSERT INTO `opening_stock_item_documents` VALUES (112, 57, 'MSDS', 'uploads/opening-stock/40b1867c-2c1f-4a0b-9355-250ec9f39146.pdf', 'MSDS_HOT FLUX.pdf', 'application/pdf', 517406, 1, '2026-04-21 16:36:19.829', '2026-04-21 16:36:19.829');
INSERT INTO `opening_stock_item_documents` VALUES (113, 57, 'COA', 'uploads/opening-stock/284b6969-3a87-4789-937c-70d90a290f21.pdf', 'COA_HOT FLUX_AT117926.pdf', 'application/pdf', 409813, 1, '2026-04-21 16:36:19.869', '2026-04-21 16:36:19.869');
INSERT INTO `opening_stock_item_documents` VALUES (114, 57, 'Invoice', 'uploads/opening-stock/62512529-c6c9-4e57-8949-cc7ef5cf49ce.jpg', 'HD_CHEMICO_2911.jpg', 'image/jpeg', 80614, 1, '2026-04-21 16:36:19.892', '2026-04-21 16:36:19.892');
INSERT INTO `opening_stock_item_documents` VALUES (115, 58, 'MSDS', 'uploads/opening-stock/618e3268-527b-4e1f-8e48-4a9a2bcc8ec4.pdf', 'MSDS_HOT FLUX.pdf', 'application/pdf', 517406, 1, '2026-04-21 16:36:19.973', '2026-04-21 16:36:19.973');
INSERT INTO `opening_stock_item_documents` VALUES (116, 58, 'COA', 'uploads/opening-stock/6fba362c-d0cb-4d66-8dea-aa6ff2191524.pdf', 'COA_HOT FLUX_AT115815.pdf', 'application/pdf', 433404, 1, '2026-04-21 16:36:20.008', '2026-04-21 16:36:20.008');
INSERT INTO `opening_stock_item_documents` VALUES (117, 58, 'Invoice', 'uploads/opening-stock/54f4fe99-2984-4cb5-be60-86bce79b4d74.jpg', 'HD_CHEMICO_3120.jpg', 'image/jpeg', 70843, 1, '2026-04-21 16:36:20.042', '2026-04-21 16:36:20.042');
INSERT INTO `opening_stock_item_documents` VALUES (118, 59, 'MSDS', 'uploads/opening-stock/efe0bf79-f690-41e9-a5bc-4176387280ab.pdf', 'MSDS_EHGP_THOR.pdf', 'application/pdf', 211998, 1, '2026-04-21 16:36:20.120', '2026-04-21 16:36:20.120');
INSERT INTO `opening_stock_item_documents` VALUES (119, 59, 'COA', 'uploads/opening-stock/430d46e5-a5c4-499d-9584-a37e27f195c5.pdf', 'COA_EHGP_AT115815.pdf', 'application/pdf', 487755, 1, '2026-04-21 16:36:20.147', '2026-04-21 16:36:20.147');
INSERT INTO `opening_stock_item_documents` VALUES (120, 59, 'Invoice', 'uploads/opening-stock/d6c2278e-d117-4711-80b0-41d099319541.jpg', 'HD_CHEMICO_2557.jpg', 'image/jpeg', 81515, 1, '2026-04-21 16:36:20.179', '2026-04-21 16:36:20.179');
INSERT INTO `opening_stock_item_documents` VALUES (121, 60, 'MSDS', 'uploads/opening-stock/242c0858-e843-44dd-b2e3-e13398691dad.pdf', 'MSDS_EHGP_ISCA.pdf', 'application/pdf', 295144, 1, '2026-04-21 16:36:20.255', '2026-04-21 16:36:20.255');
INSERT INTO `opening_stock_item_documents` VALUES (122, 60, 'COA', 'uploads/opening-stock/9426b3c3-17fd-47e6-82ba-c1f6f4f5de41.pdf', 'COA_EHGP_IP13130.pdf', 'application/pdf', 148166, 1, '2026-04-21 16:36:20.286', '2026-04-21 16:36:20.286');
INSERT INTO `opening_stock_item_documents` VALUES (123, 60, 'Invoice', 'uploads/opening-stock/9e78c5b1-ee54-4a2e-b0b0-853a2e6428a5.pdf', 'HD_MIFA_1361.pdf', 'application/pdf', 188386, 1, '2026-04-21 16:36:20.320', '2026-04-21 16:36:20.320');
INSERT INTO `opening_stock_item_documents` VALUES (124, 62, 'MSDS', 'uploads/opening-stock/89d4764b-f15f-4331-9921-ea8b685d352c.pdf', 'MSDS_COSMAN CR530.pdf', 'application/pdf', 311622, 1, '2026-04-21 16:36:20.451', '2026-04-21 16:36:20.451');
INSERT INTO `opening_stock_item_documents` VALUES (125, 62, 'COA', 'uploads/opening-stock/4bdd34a5-c525-419e-9aa5-e7b5a80dad7b.pdf', 'COA_COSMAN CR530_20250228.pdf', 'application/pdf', 133508, 1, '2026-04-21 16:36:20.484', '2026-04-21 16:36:20.484');
INSERT INTO `opening_stock_item_documents` VALUES (126, 62, 'Invoice', 'uploads/opening-stock/da4379ab-cc80-45f2-a0e2-c10cd73516a3.pdf', 'HD_NGUYENBA_1829.pdf', 'application/pdf', 290441, 1, '2026-04-21 16:36:20.509', '2026-04-21 16:36:20.509');
INSERT INTO `opening_stock_item_documents` VALUES (127, 63, 'MSDS', 'uploads/opening-stock/b400cf45-f467-4118-ab75-85b1181df409.pdf', 'MSDS_TRIETHANOLAMINE.pdf', 'application/pdf', 329963, 1, '2026-04-21 16:36:20.586', '2026-04-21 16:36:20.586');
INSERT INTO `opening_stock_item_documents` VALUES (128, 63, 'COA', 'uploads/opening-stock/f6b4228d-386f-4eb5-bcb2-fb7a812497d6.pdf', 'COA_TRIETHANOLAMINE_71353A.pdf', 'application/pdf', 256997, 1, '2026-04-21 16:36:20.618', '2026-04-21 16:36:20.618');
INSERT INTO `opening_stock_item_documents` VALUES (129, 63, 'Invoice', 'uploads/opening-stock/ae6f8904-a10a-4540-a045-cf70a0a6d304.pdf', 'HD_SMALLFORTUNE_8164.pdf', 'application/pdf', 183044, 1, '2026-04-21 16:36:20.654', '2026-04-21 16:36:20.654');

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
INSERT INTO `opening_stock_items` VALUES (19, 1, 14, '1122', '2026-04-07', '1122/26', '2026-04-01', 2, '2026-02-01', '2026-11-30', 600.0000, 'GR', 600.0000, 10000.00, 10000.00, 2, 1.0000, 6000000.00, 0, 'posted', 5, 9, '2026-04-07 20:58:10.728', 1, NULL, '2026-04-07 20:58:10.687', '2026-04-21 13:47:53.137');
INSERT INTO `opening_stock_items` VALUES (20, 1, 4, '1124', '2026-04-07', '1124/26', '2026-04-02', 1, '2026-01-01', '2026-05-31', 1000.0000, 'GR', 1000.0000, 500000.00, 500000.00, 1, 1000.0000, 500000.00, 0, 'posted', 6, 10, '2026-04-07 21:30:39.575', 1, NULL, '2026-04-07 21:30:39.536', '2026-04-21 13:47:53.536');
INSERT INTO `opening_stock_items` VALUES (23, 1, 1, '1144', '2026-04-08', '1144/26', '2026-04-01', 1, '2026-01-01', '2026-11-29', 1000.0000, 'ml', 1000.0000, 25000.00, 25000.00, 3, 1000.0000, 25000.00, 1, 'posted', 9, 13, '2026-04-08 22:32:17.055', 1, NULL, '2026-04-08 22:32:17.009', '2026-04-21 14:11:59.963');
INSERT INTO `opening_stock_items` VALUES (44, 1, 33, 'GX250204L1', '2026-04-21', '1361', '2026-03-06', 18, '2024-11-24', '2026-11-24', 202000.0000, 'g', 202000.0000, 34100.00, 34100.00, 1, 1000.0000, 6888200.00, 1, 'posted', 43, 101, '2026-04-21 16:36:17.655', 1, NULL, '2026-04-21 16:36:17.617', '2026-04-21 16:36:17.919');
INSERT INTO `opening_stock_items` VALUES (45, 1, 34, '014125IND3C5L', '2026-04-21', '11', '2026-01-21', 19, '2025-09-26', '2027-03-26', 50401.0000, 'g', 50401.0000, 33000.00, 33000.00, 1, 1000.0000, 1663233.00, 1, 'posted', 44, 102, '2026-04-21 16:36:17.999', 1, NULL, '2026-04-21 16:36:17.939', '2026-04-21 16:36:18.100');
INSERT INTO `opening_stock_items` VALUES (46, 1, 34, 'TEST REPORT', '2026-04-21', '1361', '2026-03-06', 18, '2024-12-23', '2026-12-22', 117000.0000, 'g', 117000.0000, 34000.00, 34000.00, 1, 1000.0000, 3978000.00, 1, 'posted', 45, 103, '2026-04-21 16:36:18.162', 1, NULL, '2026-04-21 16:36:18.127', '2026-04-21 16:36:18.257');
INSERT INTO `opening_stock_items` VALUES (47, 1, 36, '25LOT01156', '2026-04-21', '11', '2026-01-21', 19, NULL, NULL, 5187.0000, 'g', 5187.0000, 260000.00, 260000.00, 1, 1000.0000, 1348620.00, 1, 'posted', 46, 104, '2026-04-21 16:36:18.311', 1, NULL, '2026-04-21 16:36:18.284', '2026-04-21 16:36:18.422');
INSERT INTO `opening_stock_items` VALUES (48, 1, 37, 'TL02409085', '2026-04-21', '1361', '2026-03-06', 18, '2024-09-19', '2027-09-19', 35572.0000, 'g', 35572.0000, 430556.00, 430556.00, 1, 1000.0000, 15315738.03, 1, 'posted', 47, 105, '2026-04-21 16:36:18.466', 1, NULL, '2026-04-21 16:36:18.441', '2026-04-21 16:36:18.576');
INSERT INTO `opening_stock_items` VALUES (49, 1, 38, 'EI2501', '2026-04-21', '997', '2026-03-06', 20, '2025-09-25', '2027-09-24', 200.0000, 'g', 200.0000, 2450000.00, 2450000.00, 1, 1000.0000, 490000.00, 1, 'posted', 48, 106, '2026-04-21 16:36:18.621', 1, NULL, '2026-04-21 16:36:18.599', '2026-04-21 16:36:18.712');
INSERT INTO `opening_stock_items` VALUES (50, 1, 39, '25091685', '2026-04-21', '723', '2026-03-06', 21, '2025-09-16', '2027-09-15', 192.0000, 'g', 192.0000, 3000000.00, 3000000.00, 1, 1000.0000, 576000.00, 1, 'posted', 49, 107, '2026-04-21 16:36:18.771', 1, NULL, '2026-04-21 16:36:18.742', '2026-04-21 16:36:18.875');
INSERT INTO `opening_stock_items` VALUES (51, 1, 40, 'B2E04349', '2026-04-21', '9911', '2025-10-07', 22, '2025-01-14', '2027-01-31', 2000.0000, 'g', 2000.0000, 351852.00, 351852.00, 1, 1000.0000, 703704.00, 1, 'posted', 50, 108, '2026-04-21 16:36:18.923', 1, NULL, '2026-04-21 16:36:18.900', '2026-04-21 16:36:19.023');
INSERT INTO `opening_stock_items` VALUES (52, 1, 40, 'B2F04120', '2026-04-21', '12118', '2025-11-24', 22, '2025-05-05', '2027-05-31', 8300.0000, 'g', 8300.0000, 333333.00, 333333.00, 1, 1000.0000, 2766663.90, 1, 'posted', 51, 109, '2026-04-21 16:36:19.072', 1, NULL, '2026-04-21 16:36:19.044', '2026-04-21 16:36:19.174');
INSERT INTO `opening_stock_items` VALUES (53, 1, 40, '', '2026-04-21', '35', '2025-12-31', 23, NULL, NULL, 0.0000, 'g', 0.0000, 302400.00, 302400.00, 1, 1000.0000, 0.00, 1, 'posted', 52, 110, '2026-04-21 16:36:19.218', 1, NULL, '2026-04-21 16:36:19.198', '2026-04-21 16:36:19.257');
INSERT INTO `opening_stock_items` VALUES (54, 1, 41, '32666436W0', '2026-04-21', '1361', '2026-03-06', 18, '2024-02-06', '2027-02-05', 32675.0000, 'g', 32675.0000, 584259.00, 584259.00, 1, 1000.0000, 19090662.83, 1, 'posted', 53, 111, '2026-04-21 16:36:19.305', 1, NULL, '2026-04-21 16:36:19.281', '2026-04-21 16:36:19.419');
INSERT INTO `opening_stock_items` VALUES (55, 1, 41, 'UT25100294', '2026-04-21', '24', '2026-03-10', 19, '2025-09-28', '2029-09-27', 20000.0000, 'g', 20000.0000, 800000.00, 800000.00, 1, 1000.0000, 16000000.00, 1, 'posted', 54, 112, '2026-04-21 16:36:19.472', 1, NULL, '2026-04-21 16:36:19.448', '2026-04-21 16:36:19.575');
INSERT INTO `opening_stock_items` VALUES (56, 1, 42, '2502009', '2026-04-21', '12118', '2025-11-24', 22, '2025-02-07', '2028-02-06', 4000.0000, 'g', 4000.0000, 180556.00, 180556.00, 1, 1000.0000, 722224.00, 1, 'posted', 55, 113, '2026-04-21 16:36:19.627', 1, NULL, '2026-04-21 16:36:19.604', '2026-04-21 16:36:19.757');
INSERT INTO `opening_stock_items` VALUES (57, 1, 43, 'AT117926', '2026-04-21', '2911', '2025-11-24', 24, '2025-11-07', '2027-05-07', 6000.0000, 'g', 6000.0000, 10296390.00, 10296390.00, 1, 1000.0000, 61778340.00, 1, 'posted', 56, 114, '2026-04-21 16:36:19.805', 1, NULL, '2026-04-21 16:36:19.781', '2026-04-22 16:51:37.015');
INSERT INTO `opening_stock_items` VALUES (58, 1, 43, 'AT115815', '2026-04-21', '3120', '2025-12-16', 24, '2025-07-23', '2027-07-23', 2000.0000, 'g', 2000.0000, 10427210.00, 10427210.00, 1, 1000.0000, 20854420.00, 1, 'posted', 57, 115, '2026-04-21 16:36:19.956', 1, NULL, '2026-04-21 16:36:19.928', '2026-05-08 20:03:10.653');
INSERT INTO `opening_stock_items` VALUES (59, 1, 44, 'CZ5I165-2703', '2026-04-21', '2557', '2025-10-16', 24, '2025-09-13', '2027-03-13', 31369.0000, 'g', 31369.0000, 250506.00, 250506.00, 1, 1000.0000, 7858122.71, 1, 'posted', 58, 116, '2026-04-21 16:36:20.099', 1, NULL, '2026-04-21 16:36:20.075', '2026-05-08 21:37:25.006');
INSERT INTO `opening_stock_items` VALUES (60, 1, 44, 'IP13130', '2026-04-21', '1361', '2026-03-06', 18, '2024-07-20', '2026-07-20', 12000.0000, 'g', 12000.0000, 257000.00, 257000.00, 1, 1000.0000, 3084000.00, 1, 'posted', 59, 117, '2026-04-21 16:36:20.235', 1, NULL, '2026-04-21 16:36:20.215', '2026-05-08 21:37:24.046');
INSERT INTO `opening_stock_items` VALUES (61, 1, 45, '', '2026-04-21', NULL, NULL, NULL, NULL, NULL, 0.0000, 'g', 0.0000, 0.00, 0.00, 1, 1000.0000, 0.00, 0, 'posted', 60, 118, '2026-04-21 16:36:20.378', 1, NULL, '2026-04-21 16:36:20.351', '2026-04-21 16:36:20.378');
INSERT INTO `opening_stock_items` VALUES (62, 1, 46, '20250228', '2026-04-21', '1829', '2026-02-09', 25, '2025-02-28', '2027-02-27', 1000.0000, 'g', 1000.0000, 800000.00, 800000.00, 1, 1000.0000, 800000.00, 1, 'posted', 61, 119, '2026-04-21 16:36:20.425', 1, NULL, '2026-04-21 16:36:20.402', '2026-04-22 16:26:53.222');
INSERT INTO `opening_stock_items` VALUES (63, 1, 47, '71353A', '2026-04-21', '8164', '2025-11-24', 26, '2025-06-20', '2027-06-20', 13991.0000, 'g', 13991.0000, 50926.00, 50926.00, 1, 1000.0000, 712505.67, 1, 'posted', 62, 120, '2026-04-21 16:36:20.570', 1, NULL, '2026-04-21 16:36:20.546', '2026-04-22 16:26:52.586');
INSERT INTO `opening_stock_items` VALUES (64, 1, 69, '1131', '2026-05-01', 'hd453', '2026-05-01', NULL, NULL, NULL, 1000.0000, 'g', 1000.0000, 3000.00, 3000.00, 7, 1.0000, 3000000.00, 0, 'posted', 67, 127, '2026-05-08 21:08:21.241', 1, NULL, '2026-05-08 21:08:21.171', '2026-05-08 21:08:21.241');
INSERT INTO `opening_stock_items` VALUES (65, 1, 74, 'lot-nvl-test1', '2026-05-20', 'hd2026', '2026-01-01', 24, '2025-12-01', '2027-01-31', 100.0000, 'g', 100.0000, 5000.00, 5000.00, 2, 1.0000, 500000.00, 0, 'posted', 69, 154, '2026-05-20 14:22:16.339', 3, NULL, '2026-05-20 14:22:16.249', '2026-05-20 14:22:35.771');

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `product_classifications` VALUES (7, 'RAW2', 'NVL loại 2', 'test NVL', NULL, '2026-04-01 13:36:00.039', '2026-04-02 21:41:22.532');
INSERT INTO `product_classifications` VALUES (10, 'WATER', 'NƯỚC TINH KHIẾT', '', NULL, '2026-04-01 20:57:51.778', '2026-04-01 20:57:51.778');
INSERT INTO `product_classifications` VALUES (23, 'BTP', 'Bán thành phẩm', '', NULL, '2026-05-05 21:08:55.449', '2026-05-05 21:08:55.449');
INSERT INTO `product_classifications` VALUES (24, 'TP', 'Thành phẩm', '', NULL, '2026-05-05 21:09:09.710', '2026-05-05 21:09:09.710');

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
) ENGINE = InnoDB AUTO_INCREMENT = 40 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_inci_names
-- ----------------------------
INSERT INTO `product_inci_names` VALUES (1, 1, 'Glycerin', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (2, 2, 'Vitamin E', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (3, 3, 'hhhh', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (4, 4, 'Vitamin D1', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (5, 5, 'bbbb', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (6, 8, 'sdfsf', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (7, 11, 'aaa', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (8, 13, 'Acid Clohydric', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (9, 14, 'Vitamin E2', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-21 14:19:51.796');
INSERT INTO `product_inci_names` VALUES (10, 15, 'Vitamin C', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-20 16:35:16.117');
INSERT INTO `product_inci_names` VALUES (11, 16, 'Vitamin E1, Vitamin E1A', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-21 14:04:39.066');
INSERT INTO `product_inci_names` VALUES (12, 23, 'Vitis Vinifera Seed Oil', 1, NULL, '2026-04-20 16:35:16.117', '2026-04-21 15:58:03.507');
INSERT INTO `product_inci_names` VALUES (16, 24, 'INCI-1, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2, INCI-2', 1, NULL, '2026-04-20 17:09:31.192', '2026-05-05 20:14:13.801');
INSERT INTO `product_inci_names` VALUES (17, 24, 'INCI-2', 0, NULL, '2026-04-20 17:09:40.837', '2026-04-20 17:09:40.837');
INSERT INTO `product_inci_names` VALUES (20, 16, 'Vitamin E1A', 1, NULL, '2026-04-21 13:38:13.515', '2026-04-21 13:38:13.515');
INSERT INTO `product_inci_names` VALUES (21, 14, 'Vita E', 0, NULL, '2026-04-21 14:20:00.949', '2026-04-21 14:20:00.949');
INSERT INTO `product_inci_names` VALUES (22, 33, 'PROPYLENE GLYCOL', 1, NULL, '2026-04-21 15:58:23.187', '2026-05-05 20:14:14.254');
INSERT INTO `product_inci_names` VALUES (23, 34, 'GLYCERIN', 1, NULL, '2026-04-21 15:59:48.957', '2026-05-05 20:14:14.622');
INSERT INTO `product_inci_names` VALUES (24, 35, 'TETRASODIUM EDTA', 1, NULL, '2026-04-21 15:59:49.169', '2026-05-05 20:14:14.919');
INSERT INTO `product_inci_names` VALUES (25, 36, 'ALLANTOIN', 1, NULL, '2026-04-21 15:59:49.204', '2026-04-21 15:59:49.204');
INSERT INTO `product_inci_names` VALUES (26, 37, 'D-PANTHENOL', 1, NULL, '2026-04-21 15:59:49.237', '2026-05-20 15:44:47.796');
INSERT INTO `product_inci_names` VALUES (27, 38, 'WATER, BUTYLENE GLYCOL, GLYCERIN, ZINGIBER OFFICINALE (GINGER) ROOT EXTRACT, \r\n1,2-HEXANEDIOL, ETHYL HEXANEDIOL', 1, NULL, '2026-04-21 15:59:49.266', '2026-04-24 14:07:24.382');
INSERT INTO `product_inci_names` VALUES (28, 39, 'DIPROPYLENE GLYCOL, HOUTTUYNIACORDATA EXTRACT, ECLIPTA PROSTRATA EXTRACT, POLYGONUM MULTIFLORUM ROOT EXTRACT, PHYLLOSTACHYS NIGRA LEAF EXTRACT, URTICA DIOICA (NETTLE) EXTRACT, PASSIFLORA INCARNATA EXTRACT, CENTELLA ASIATICA EXTRACT', 1, NULL, '2026-04-21 15:59:49.298', '2026-04-24 14:06:38.414');
INSERT INTO `product_inci_names` VALUES (29, 40, 'CARBOMER', 1, NULL, '2026-04-21 15:59:49.329', '2026-04-21 15:59:49.329');
INSERT INTO `product_inci_names` VALUES (30, 41, 'TOCOPHERYL ACETATE', 1, NULL, '2026-04-21 15:59:49.362', '2026-05-20 15:44:51.976');
INSERT INTO `product_inci_names` VALUES (31, 42, 'METHYL SALICYLATE', 1, NULL, '2026-04-21 15:59:49.394', '2026-05-17 10:07:41.346');
INSERT INTO `product_inci_names` VALUES (32, 43, 'VANILLYL BUTYL ETHER', 1, NULL, '2026-04-21 15:59:49.427', '2026-05-17 10:08:24.818');
INSERT INTO `product_inci_names` VALUES (33, 44, 'PHENOXYETHANOL, ETHYLHEXYLGLYCERIN', 1, NULL, '2026-04-21 15:59:49.458', '2026-05-23 12:01:14.347');
INSERT INTO `product_inci_names` VALUES (34, 45, 'FRAGRANCE', 1, NULL, '2026-04-21 15:59:49.492', '2026-05-08 20:02:35.054');
INSERT INTO `product_inci_names` VALUES (35, 46, 'MICA, CI 77891, CI 77491, TIN OXIDE', 1, NULL, '2026-04-21 15:59:49.522', '2026-05-08 20:02:28.054');
INSERT INTO `product_inci_names` VALUES (36, 47, 'TRIETHANOLAMINE', 1, NULL, '2026-04-21 15:59:49.551', '2026-05-08 20:03:51.197');
INSERT INTO `product_inci_names` VALUES (38, 69, 'box', 1, NULL, '2026-05-08 21:06:28.053', '2026-05-17 10:07:50.184');
INSERT INTO `product_inci_names` VALUES (39, 74, 'Vitamin E3T', 1, NULL, '2026-05-20 14:21:10.525', '2026-05-20 14:21:10.525');

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
INSERT INTO `product_manufacturers` VALUES (1, 24, 'abc', NULL, NULL, 0, NULL, '2026-04-20 17:07:52.785', '2026-04-20 17:06:42.757', '2026-04-20 17:07:52.785');
INSERT INTO `product_manufacturers` VALUES (2, 24, 'xxx', 'VN', NULL, 0, NULL, '2026-04-20 17:06:58.246', '2026-04-20 17:06:51.594', '2026-04-20 17:06:58.246');
INSERT INTO `product_manufacturers` VALUES (3, 24, 'HHHH', 'VN', NULL, 1, NULL, NULL, '2026-04-20 17:07:06.454', '2026-04-20 17:07:06.454');
INSERT INTO `product_manufacturers` VALUES (4, 24, 'xyz', 'USA', NULL, 0, NULL, NULL, '2026-04-20 17:31:12.224', '2026-04-20 17:31:12.224');
INSERT INTO `product_manufacturers` VALUES (5, 16, 'Trung Quốc', NULL, NULL, 0, NULL, '2026-04-21 13:44:48.090', '2026-04-21 13:44:43.463', '2026-04-21 13:44:48.090');
INSERT INTO `product_manufacturers` VALUES (6, 16, 'Trung Quốc', NULL, NULL, 0, NULL, NULL, '2026-04-21 13:44:50.789', '2026-04-21 13:44:50.789');
INSERT INTO `product_manufacturers` VALUES (7, 47, 'TQ', NULL, NULL, 0, NULL, NULL, '2026-04-21 20:31:37.040', '2026-04-21 20:31:37.040');

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
INSERT INTO `product_suppliers` VALUES (1, 24, 2, 0, NULL, '2026-04-20 17:37:50.552', '2026-04-20 17:37:50.552');
INSERT INTO `product_suppliers` VALUES (2, 24, 1, 0, NULL, '2026-04-20 17:37:57.077', '2026-04-20 17:37:57.077');
INSERT INTO `product_suppliers` VALUES (3, 16, 1, 0, NULL, '2026-04-21 13:44:58.038', '2026-04-21 13:44:58.038');
INSERT INTO `product_suppliers` VALUES (4, 16, 2, 0, NULL, '2026-04-21 13:45:00.651', '2026-04-21 13:45:00.651');

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
INSERT INTO `product_units` VALUES (1, NULL, 2, 'kg', 'Kilogram', 'thể rắn', 1000.0000, 1, 0, '2026-03-31 20:48:31.312', '2026-04-21 15:16:08.747');
INSERT INTO `product_units` VALUES (2, NULL, NULL, 'g', 'Gram', 'Dạng bột', 1.0000, 0, 1, '2026-03-31 20:49:00.670', '2026-04-21 15:16:05.866');
INSERT INTO `product_units` VALUES (3, NULL, 4, 'L', 'Lít', 'Dùng cho dạng dung dịch lỏng', 1000.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:38.219');
INSERT INTO `product_units` VALUES (4, NULL, NULL, 'ml', 'Mili lít', 'test test', 1.0000, 0, 0, '2026-03-31 21:06:52.840', '2026-04-06 16:18:29.255');
INSERT INTO `product_units` VALUES (7, NULL, NULL, NULL, 'Cái', NULL, 1.0000, 0, 0, '2026-05-05 13:31:15.463', '2026-05-05 13:31:15.463');
INSERT INTO `product_units` VALUES (8, NULL, NULL, NULL, 'Hộp', NULL, 1.0000, 0, 0, '2026-05-05 13:31:15.486', '2026-05-05 13:31:15.486');
INSERT INTO `product_units` VALUES (9, NULL, NULL, NULL, 'Bộ', NULL, 1.0000, 0, 0, '2026-05-05 13:31:15.501', '2026-05-05 13:31:15.501');

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
) ENGINE = InnoDB AUTO_INCREMENT = 523 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_order_lines
-- ----------------------------
INSERT INTO `production_order_lines` VALUES (59, 5, 1, 'out', 47, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', '2026-08-31', NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-08 14:09:39.134', '2026-05-08 14:09:39.134', NULL);
INSERT INTO `production_order_lines` VALUES (60, 5, 1, 'out', 42, 'NL-PGI-033', 'METHYL SALICYLATE', '2502009', '2028-02-06', NULL, 500.0000, 500.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-08 14:09:39.134', '2026-05-08 14:09:39.134', NULL);
INSERT INTO `production_order_lines` VALUES (61, 5, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-08 14:09:39.134', '2026-05-08 14:09:39.134', NULL);
INSERT INTO `production_order_lines` VALUES (92, 5, 2, 'in', NULL, 'NL-PGI-033', 'METHYL SALICYLATE', '2502009', NULL, NULL, 1500.0000, 1400.0000, 100.0000, 'gr', NULL, NULL, 'ok', '2026-05-10 04:20:56.974', '2026-05-10 04:20:56.974', 2);
INSERT INTO `production_order_lines` VALUES (93, 5, 2, 'in', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 1500.0000, 1500.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-10 04:20:56.974', '2026-05-10 04:20:56.974', 2);
INSERT INTO `production_order_lines` VALUES (94, 5, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-10 04:20:56.974', '2026-05-10 04:20:56.974', 3);
INSERT INTO `production_order_lines` VALUES (167, 5, 3, 'out', NULL, 'NL-PGI-033', 'METHYL SALICYLATE', '2502009', NULL, NULL, 1500.0000, 1400.0000, 0.0000, 'gr', NULL, NULL, 'ok', '2026-05-10 09:26:49.466', '2026-05-10 09:26:49.466', 2);
INSERT INTO `production_order_lines` VALUES (168, 5, 3, 'out', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 1500.0000, 1500.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-10 09:26:49.466', '2026-05-10 09:26:49.466', 2);
INSERT INTO `production_order_lines` VALUES (169, 5, 3, 'out', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-10 09:26:49.466', '2026-05-10 09:26:49.466', 3);
INSERT INTO `production_order_lines` VALUES (170, 6, 1, 'out', 47, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', '2026-08-31', NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:00:20.402', '2026-05-12 01:00:20.402', NULL);
INSERT INTO `production_order_lines` VALUES (171, 6, 1, 'out', 40, 'NL-TDA-012', 'CARBOMER', 'B2E04349', '2027-01-31', NULL, 4000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:00:20.402', '2026-05-12 01:00:20.402', NULL);
INSERT INTO `production_order_lines` VALUES (172, 6, 1, 'out', 40, 'NL-TDA-012', 'CARBOMER', 'B2F04120', '2027-05-31', NULL, 4000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:00:20.402', '2026-05-12 01:00:20.402', NULL);
INSERT INTO `production_order_lines` VALUES (173, 6, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 500.0000, 500.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-12 01:00:20.402', '2026-05-12 01:00:20.402', NULL);
INSERT INTO `production_order_lines` VALUES (174, 6, 2, 'in', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:03:18.943', '2026-05-12 01:03:18.943', 2);
INSERT INTO `production_order_lines` VALUES (175, 6, 2, 'in', NULL, 'NL-TDA-012', 'CARBOMER', 'B2E04349', NULL, NULL, 2000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:03:18.943', '2026-05-12 01:03:18.943', 2);
INSERT INTO `production_order_lines` VALUES (176, 6, 2, 'in', NULL, 'NL-TDA-012', 'CARBOMER', 'B2F04120', NULL, NULL, 2000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:03:18.943', '2026-05-12 01:03:18.943', 2);
INSERT INTO `production_order_lines` VALUES (177, 6, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 500.0000, 499.0000, 1.0000, 'Cái', NULL, NULL, NULL, '2026-05-12 01:03:18.943', '2026-05-12 01:03:18.943', 3);
INSERT INTO `production_order_lines` VALUES (182, 6, 3, 'out', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:04:57.411', '2026-05-12 01:04:57.411', 2);
INSERT INTO `production_order_lines` VALUES (183, 6, 3, 'out', NULL, 'NL-TDA-012', 'CARBOMER', 'B2E04349', NULL, NULL, 2000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:04:57.411', '2026-05-12 01:04:57.411', 2);
INSERT INTO `production_order_lines` VALUES (184, 6, 3, 'out', NULL, 'NL-TDA-012', 'CARBOMER', 'B2F04120', NULL, NULL, 2000.0000, 2000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-12 01:04:57.411', '2026-05-12 01:04:57.411', 2);
INSERT INTO `production_order_lines` VALUES (185, 6, 3, 'out', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 500.0000, 499.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-12 01:04:57.411', '2026-05-12 01:04:57.411', 3);
INSERT INTO `production_order_lines` VALUES (187, 6, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'LOT-TP-ABC2026', '2026-05-31', NULL, 500.0000, 499.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-12 01:07:17.123', '2026-05-12 01:07:17.123', 1);
INSERT INTO `production_order_lines` VALUES (188, 5, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-abc', '2026-08-31', NULL, 1550.0000, 1500.0000, 0.0000, 'hủ', NULL, 'pending', 'g dfgdg', '2026-05-15 08:15:05.490', '2026-05-15 08:15:05.490', 1);
INSERT INTO `production_order_lines` VALUES (207, 7, 1, 'out', 43, 'NL-HCH-034', 'HOT FLUX', 'AT117926', '2027-05-07', NULL, 500.0000, 500.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 01:05:19.769', '2026-05-16 01:05:19.769', NULL);
INSERT INTO `production_order_lines` VALUES (208, 7, 1, 'out', 42, 'NL-PGI-033', 'METHYL SALICYLATE', '2502009', '2028-02-06', NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 01:05:19.769', '2026-05-16 01:05:19.769', NULL);
INSERT INTO `production_order_lines` VALUES (209, 7, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 400.0000, 400.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-16 01:05:19.769', '2026-05-16 01:05:19.769', NULL);
INSERT INTO `production_order_lines` VALUES (247, 7, 2, 'in', NULL, 'NL-HCH-034', 'HOT FLUX', 'AT117926', NULL, NULL, 500.0000, 500.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 12:59:20.693', '2026-05-16 12:59:20.693', 2);
INSERT INTO `production_order_lines` VALUES (248, 7, 2, 'in', NULL, 'NL-PGI-033', 'METHYL SALICYLATE', '2502009', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 12:59:20.693', '2026-05-16 12:59:20.693', 2);
INSERT INTO `production_order_lines` VALUES (249, 7, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 400.0000, 400.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-16 12:59:20.693', '2026-05-16 12:59:20.693', 3);
INSERT INTO `production_order_lines` VALUES (250, 7, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'btp-lot-aa1', NULL, NULL, 400.0000, 390.0000, 10.0000, 'g', NULL, NULL, NULL, '2026-05-16 12:59:20.693', '2026-05-16 12:59:20.693', 2);
INSERT INTO `production_order_lines` VALUES (251, 7, 2, 'out', NULL, 'BTP-002', 'Vỏ hộp MESLAS - bán thành phầm', 'btp-lot-aa2', NULL, NULL, 400.0000, 390.0000, 10.0000, 'hộp', NULL, NULL, NULL, '2026-05-16 12:59:20.693', '2026-05-16 12:59:20.693', 3);
INSERT INTO `production_order_lines` VALUES (264, 7, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'btp-lot-aa1', NULL, NULL, 400.0000, 390.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 13:05:02.158', '2026-05-16 13:05:02.158', 2);
INSERT INTO `production_order_lines` VALUES (265, 7, 3, 'out', 3, 'BTP-002', 'Vỏ hộp MESLAS - bán thành phầm', 'btp-lot-aa2', NULL, NULL, 400.0000, 390.0000, 0.0000, 'hộp', NULL, NULL, NULL, '2026-05-16 13:05:02.158', '2026-05-16 13:05:02.158', 3);
INSERT INTO `production_order_lines` VALUES (267, 7, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'tp_lot7', '2026-12-31', NULL, 400.0000, 390.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-16 13:06:00.013', '2026-05-16 13:06:00.013', 1);
INSERT INTO `production_order_lines` VALUES (271, 8, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 10.0000, 10.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-16 13:14:19.879', '2026-05-16 13:14:19.879', 2);
INSERT INTO `production_order_lines` VALUES (272, 8, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-abc', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-16 13:14:19.879', '2026-05-16 13:14:19.879', 2);
INSERT INTO `production_order_lines` VALUES (273, 8, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-abc', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-16 13:14:42.681', '2026-05-16 13:14:42.681', 2);
INSERT INTO `production_order_lines` VALUES (274, 8, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'tp-melas-lot-aaa', '2026-09-30', NULL, 0.0000, 10.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-16 13:15:25.798', '2026-05-16 13:15:25.798', 1);
INSERT INTO `production_order_lines` VALUES (278, 8, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 10.0000, 10.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-16 14:22:37.376', '2026-05-16 14:22:37.376', NULL);
INSERT INTO `production_order_lines` VALUES (279, 8, 1, 'out', 47, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', '2026-08-31', NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-16 14:22:37.376', '2026-05-16 14:22:37.376', NULL);
INSERT INTO `production_order_lines` VALUES (338, 9, 2, 'in', NULL, 'NL-TDA-012', 'CARBOMER', 'B2E04349', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-18 07:40:34.284', '2026-05-18 07:40:34.284', 2);
INSERT INTO `production_order_lines` VALUES (339, 9, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 50.0000, 50.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-18 07:40:34.284', '2026-05-18 07:40:34.284', 2);
INSERT INTO `production_order_lines` VALUES (340, 9, 2, 'in', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 400.0000, 300.0000, 100.0000, 'g', NULL, NULL, NULL, '2026-05-18 07:40:34.284', '2026-05-18 07:40:34.284', 2);
INSERT INTO `production_order_lines` VALUES (341, 9, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot_sdfsdf_111', NULL, NULL, 1000.0000, 985.0000, 15.0000, 'gr', NULL, NULL, NULL, '2026-05-18 07:40:34.284', '2026-05-18 07:40:34.284', 2);
INSERT INTO `production_order_lines` VALUES (342, 9, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot_sdfsdf_111', NULL, NULL, 1000.0000, 985.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-18 07:40:37.232', '2026-05-18 07:40:37.232', 2);
INSERT INTO `production_order_lines` VALUES (355, 9, 1, 'out', 40, 'NL-TDA-012', 'CARBOMER', 'B2E04349', '2027-01-31', NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-18 07:44:10.251', '2026-05-18 07:44:10.251', NULL);
INSERT INTO `production_order_lines` VALUES (356, 9, 1, 'out', 40, 'NL-TDA-012', 'CARBOMER', 'B2F04120', '2027-05-31', NULL, 1000.0000, 500.0000, 500.0000, 'g', NULL, NULL, NULL, '2026-05-18 07:44:10.251', '2026-05-18 07:44:10.251', NULL);
INSERT INTO `production_order_lines` VALUES (357, 9, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 50.0000, 50.0000, 10.0000, 'Cái', NULL, NULL, NULL, '2026-05-18 07:44:10.251', '2026-05-18 07:44:10.251', NULL);
INSERT INTO `production_order_lines` VALUES (358, 9, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 50.0000, 10.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-18 07:44:10.251', '2026-05-18 07:44:10.251', NULL);
INSERT INTO `production_order_lines` VALUES (359, 9, 1, 'out', 47, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', '2026-08-31', NULL, 400.0000, 400.0000, 100.0000, 'g', NULL, NULL, NULL, '2026-05-18 07:44:10.251', '2026-05-18 07:44:10.251', NULL);
INSERT INTO `production_order_lines` VALUES (360, 9, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'tp_lot_aaa222', '2027-01-31', NULL, 1000.0000, 985.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-18 07:44:10.313', '2026-05-18 07:44:10.313', 1);
INSERT INTO `production_order_lines` VALUES (363, 10, 2, 'in', NULL, 'NL-CXU-036', 'CS-GINGER EXT', 'EI2501', NULL, NULL, 100.0000, 90.0000, 10.0000, 'ml', NULL, NULL, NULL, '2026-05-19 06:37:02.119', '2026-05-19 06:37:02.119', 2);
INSERT INTO `production_order_lines` VALUES (364, 10, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'btp_lot_fdsfsf', NULL, NULL, 100.0000, 100.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:37:02.119', '2026-05-19 06:37:02.119', 2);
INSERT INTO `production_order_lines` VALUES (366, 10, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'btp_lot_fdsfsf', NULL, NULL, 100.0000, 100.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:37:15.861', '2026-05-19 06:37:15.861', 2);
INSERT INTO `production_order_lines` VALUES (370, 10, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 50.0000, 50.0000, 50.0000, 'Cái', NULL, NULL, NULL, '2026-05-19 06:40:20.412', '2026-05-19 06:40:20.412', NULL);
INSERT INTO `production_order_lines` VALUES (371, 10, 1, 'out', 38, 'NL-CXU-036', 'CS-GINGER EXT', 'EI2501', '2027-09-24', NULL, 100.0000, 100.0000, 20.0000, 'ml', NULL, NULL, NULL, '2026-05-19 06:40:20.412', '2026-05-19 06:40:20.412', NULL);
INSERT INTO `production_order_lines` VALUES (372, 10, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'sdfsf', '2026-05-20', NULL, 50.0000, 50.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-19 06:40:20.474', '2026-05-19 06:40:20.474', 1);
INSERT INTO `production_order_lines` VALUES (382, 11, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 60.0000, 50.0000, 10.0000, 'Cái', NULL, NULL, NULL, '2026-05-19 06:45:22.543', '2026-05-19 06:45:22.543', 2);
INSERT INTO `production_order_lines` VALUES (383, 11, 2, 'in', NULL, 'NL-HCH-031', 'VITAMIN B5', 'TL02409085', NULL, NULL, 72.0000, 72.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-19 06:45:22.543', '2026-05-19 06:45:22.543', 2);
INSERT INTO `production_order_lines` VALUES (384, 11, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot_btp_abc', NULL, NULL, 50.0000, 50.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:45:22.543', '2026-05-19 06:45:22.543', 2);
INSERT INTO `production_order_lines` VALUES (385, 11, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot_btp_abc', NULL, NULL, 50.0000, 50.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:45:32.375', '2026-05-19 06:45:32.375', 2);
INSERT INTO `production_order_lines` VALUES (392, 11, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 60.0000, 60.0000, 25.0000, 'Cái', NULL, NULL, NULL, '2026-05-19 06:46:07.827', '2026-05-19 06:46:07.827', NULL);
INSERT INTO `production_order_lines` VALUES (393, 11, 1, 'out', 37, 'NL-HCH-031', 'VITAMIN B5', 'TL02409085', '2027-09-19', NULL, 72.0000, 72.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-19 06:46:07.827', '2026-05-19 06:46:07.827', NULL);
INSERT INTO `production_order_lines` VALUES (394, 11, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot_tp_abc', '2026-05-31', NULL, 50.0000, 50.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-19 06:46:07.871', '2026-05-19 06:46:07.871', 1);
INSERT INTO `production_order_lines` VALUES (397, 12, 2, 'in', NULL, 'NVL-007', 'Acid HCL 95%', 'LOT-NVL-007-260416', NULL, NULL, 500.0000, 400.0000, 100.0000, 'ml', NULL, NULL, NULL, '2026-05-19 06:54:11.562', '2026-05-19 06:54:11.562', 2);
INSERT INTO `production_order_lines` VALUES (398, 12, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-aaa11', NULL, NULL, 50.0000, 50.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:54:11.562', '2026-05-19 06:54:11.562', 2);
INSERT INTO `production_order_lines` VALUES (399, 12, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-aaa11', NULL, NULL, 50.0000, 50.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 06:54:35.722', '2026-05-19 06:54:35.722', 2);
INSERT INTO `production_order_lines` VALUES (412, 12, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 50.0000, 50.0000, 50.0000, 'Cái', NULL, NULL, NULL, '2026-05-19 06:55:33.339', '2026-05-19 06:55:33.339', NULL);
INSERT INTO `production_order_lines` VALUES (413, 12, 1, 'out', 13, 'NVL-007', 'Acid HCL 95%', 'LOT-NVL-007-260416', '2026-04-30', NULL, 500.0000, 500.0000, 100.0000, 'ml', NULL, NULL, NULL, '2026-05-19 06:55:33.339', '2026-05-19 06:55:33.339', NULL);
INSERT INTO `production_order_lines` VALUES (414, 12, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'tp-lot-aab11', '2026-08-31', NULL, 50.0000, 50.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-19 06:55:33.403', '2026-05-19 06:55:33.403', 1);
INSERT INTO `production_order_lines` VALUES (421, 13, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 25.0000, 25.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-19 14:17:54.444', '2026-05-19 14:17:54.444', 2);
INSERT INTO `production_order_lines` VALUES (422, 13, 2, 'in', NULL, 'NL-PGI-040', 'TEA', '71353A', NULL, NULL, 1000.0000, 950.0000, 50.0000, 'g', NULL, NULL, NULL, '2026-05-19 14:17:54.444', '2026-05-19 14:17:54.444', 2);
INSERT INTO `production_order_lines` VALUES (423, 13, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-190526', NULL, NULL, 25.0000, 25.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 14:17:54.444', '2026-05-19 14:17:54.444', 2);
INSERT INTO `production_order_lines` VALUES (424, 13, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-190526', NULL, NULL, 25.0000, 25.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-19 14:17:56.115', '2026-05-19 14:17:56.115', 2);
INSERT INTO `production_order_lines` VALUES (428, 13, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 25.0000, 25.0000, 0.0000, 'Cái', 8, NULL, NULL, '2026-05-19 14:25:23.331', '2026-05-19 14:25:23.331', NULL);
INSERT INTO `production_order_lines` VALUES (429, 13, 1, 'out', 47, 'NL-PGI-040', 'TEA', '71353A', '2027-06-20', NULL, 0.0000, 1000.0000, 50.0000, 'g', 8, NULL, NULL, '2026-05-19 14:25:23.331', '2026-05-19 14:25:23.331', NULL);
INSERT INTO `production_order_lines` VALUES (430, 13, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp19052026', '2026-12-31', NULL, 25.0000, 25.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-19 14:25:23.371', '2026-05-19 14:25:23.371', 1);
INSERT INTO `production_order_lines` VALUES (432, 14, 2, 'in', NULL, 'NL-BQU-035', 'EHGP', 'IP13130', NULL, NULL, 1000.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-20 02:33:51.986', '2026-05-20 02:33:51.986', 2);
INSERT INTO `production_order_lines` VALUES (433, 14, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-05202026', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 02:33:51.986', '2026-05-20 02:33:51.986', 2);
INSERT INTO `production_order_lines` VALUES (434, 14, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-05202026', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 02:34:00.679', '2026-05-20 02:34:00.679', 2);
INSERT INTO `production_order_lines` VALUES (437, 14, 1, 'out', 44, 'NL-BQU-035', 'EHGP', 'IP13130', '2026-07-20', NULL, 0.0000, 1000.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-20 02:34:54.508', '2026-05-20 02:34:54.508', NULL);
INSERT INTO `production_order_lines` VALUES (438, 14, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-20052026', '2026-12-31', NULL, 10.0000, 10.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-20 02:34:54.553', '2026-05-20 02:34:54.553', 1);
INSERT INTO `production_order_lines` VALUES (439, 15, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 10.0000, 10.0000, 0.0000, 'Cái', 1, NULL, NULL, '2026-05-20 08:23:43.634', '2026-05-20 08:23:43.634', NULL);
INSERT INTO `production_order_lines` VALUES (440, 15, 1, 'out', 44, 'NL-BQU-035', 'EHGP', 'IP13130', '2026-07-20', NULL, 300.0000, 300.0000, 0.0000, 'g', 1, NULL, NULL, '2026-05-20 08:23:43.634', '2026-05-20 08:23:43.634', NULL);
INSERT INTO `production_order_lines` VALUES (441, 15, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 10.0000, 10.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-20 08:24:31.497', '2026-05-20 08:24:31.497', 2);
INSERT INTO `production_order_lines` VALUES (442, 15, 2, 'in', NULL, 'NL-BQU-035', 'EHGP', 'IP13130', NULL, NULL, 300.0000, 290.0000, 10.0000, 'g', NULL, NULL, NULL, '2026-05-20 08:24:31.497', '2026-05-20 08:24:31.497', 2);
INSERT INTO `production_order_lines` VALUES (443, 15, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-abc', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 08:24:31.497', '2026-05-20 08:24:31.497', 2);
INSERT INTO `production_order_lines` VALUES (447, 15, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-abc', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 08:25:04.097', '2026-05-20 08:25:04.097', 2);
INSERT INTO `production_order_lines` VALUES (451, 16, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 15.0000, 10.0000, 5.0000, 'Cái', NULL, NULL, NULL, '2026-05-20 08:45:48.340', '2026-05-20 08:45:48.340', 2);
INSERT INTO `production_order_lines` VALUES (452, 16, 2, 'in', NULL, 'NL-HCH-032', 'VITAMIN E', '32666436W0', NULL, NULL, 675.0000, 650.0000, 25.0000, 'g', NULL, NULL, NULL, '2026-05-20 08:45:48.340', '2026-05-20 08:45:48.340', 2);
INSERT INTO `production_order_lines` VALUES (453, 16, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-test200526', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 08:45:48.340', '2026-05-20 08:45:48.340', 2);
INSERT INTO `production_order_lines` VALUES (454, 16, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-test200526', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 08:45:54.946', '2026-05-20 08:45:54.946', 2);
INSERT INTO `production_order_lines` VALUES (458, 16, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 15.0000, 15.0000, 5.0000, 'Cái', 1, NULL, NULL, '2026-05-20 08:46:25.844', '2026-05-20 08:46:25.844', NULL);
INSERT INTO `production_order_lines` VALUES (459, 16, 1, 'out', 41, 'NL-HCH-032', 'VITAMIN E', '32666436W0', '2027-02-05', NULL, 675.0000, 675.0000, 25.0000, 'g', 1, NULL, NULL, '2026-05-20 08:46:25.844', '2026-05-20 08:46:25.844', NULL);
INSERT INTO `production_order_lines` VALUES (460, 16, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-test200526', '2026-10-31', NULL, 10.0000, 10.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-20 08:46:25.909', '2026-05-20 08:46:25.909', 1);
INSERT INTO `production_order_lines` VALUES (467, 17, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 85.0000, 0.0000, 85.0000, 'Cái', NULL, NULL, NULL, '2026-05-20 13:19:53.821', '2026-05-20 13:19:53.821', 2);
INSERT INTO `production_order_lines` VALUES (468, 17, 2, 'in', NULL, 'NL-BQU-035', 'EHGP', 'IP13130', NULL, NULL, 369.0000, 0.0000, 369.0000, 'g', NULL, NULL, NULL, '2026-05-20 13:19:53.821', '2026-05-20 13:19:53.821', 2);
INSERT INTO `production_order_lines` VALUES (469, 17, 2, 'in', NULL, 'NL-HCH-001', 'ALLANTOIN', '25LOT01156', NULL, NULL, 87.0000, 0.0000, 87.0000, 'g', NULL, NULL, NULL, '2026-05-20 13:19:53.821', '2026-05-20 13:19:53.821', 2);
INSERT INTO `production_order_lines` VALUES (470, 17, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-test-xnvl', NULL, NULL, 85.0000, 85.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:19:53.821', '2026-05-20 13:19:53.821', 2);
INSERT INTO `production_order_lines` VALUES (471, 17, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-test-xnvl', NULL, NULL, 85.0000, 85.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:20:00.056', '2026-05-20 13:20:00.056', 2);
INSERT INTO `production_order_lines` VALUES (476, 17, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 85.0000, 85.0000, 85.0000, 'Cái', 1, NULL, NULL, '2026-05-20 13:20:50.849', '2026-05-20 13:20:50.849', NULL);
INSERT INTO `production_order_lines` VALUES (477, 17, 1, 'out', 44, 'NL-BQU-035', 'EHGP', 'IP13130', '2026-07-20', NULL, 369.0000, 369.0000, 369.0000, 'g', 1, NULL, NULL, '2026-05-20 13:20:50.849', '2026-05-20 13:20:50.849', NULL);
INSERT INTO `production_order_lines` VALUES (478, 17, 1, 'out', 36, 'NL-HCH-001', 'ALLANTOIN', '25LOT01156', NULL, NULL, 87.0000, 87.0000, 87.0000, 'g', 1, NULL, NULL, '2026-05-20 13:20:50.849', '2026-05-20 13:20:50.849', NULL);
INSERT INTO `production_order_lines` VALUES (479, 17, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-test-xnvl', '2026-10-31', NULL, 85.0000, 85.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-20 13:20:50.889', '2026-05-20 13:20:50.889', 1);
INSERT INTO `production_order_lines` VALUES (488, 18, 2, 'in', NULL, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', NULL, NULL, 100.0000, 100.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-20 13:43:26.634', '2026-05-20 13:43:26.634', 2);
INSERT INTO `production_order_lines` VALUES (489, 18, 2, 'in', NULL, 'NL-HCH-032', 'VITAMIN E', '32666436W0', NULL, NULL, 100.0000, 100.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-20 13:43:26.634', '2026-05-20 13:43:26.634', 2);
INSERT INTO `production_order_lines` VALUES (490, 18, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-xnvl2', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:43:26.634', '2026-05-20 13:43:26.634', 2);
INSERT INTO `production_order_lines` VALUES (491, 18, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-xnvl2', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:43:31.366', '2026-05-20 13:43:31.366', 2);
INSERT INTO `production_order_lines` VALUES (492, 18, 1, 'out', 47, 'NL-PGI-040', 'TEA', 'LOT-NL-PGI-040-260422', '2026-08-31', NULL, 100.0000, 100.0000, 0.0000, 'g', 1, NULL, NULL, '2026-05-20 13:43:53.814', '2026-05-20 13:43:53.814', NULL);
INSERT INTO `production_order_lines` VALUES (493, 18, 1, 'out', 41, 'NL-HCH-032', 'VITAMIN E', '32666436W0', '2027-02-05', NULL, 100.0000, 100.0000, 0.0000, 'g', 1, NULL, NULL, '2026-05-20 13:43:53.814', '2026-05-20 13:43:53.814', NULL);
INSERT INTO `production_order_lines` VALUES (494, 18, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-xnvl2', '2026-05-31', NULL, 10.0000, 10.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-20 13:43:53.848', '2026-05-20 13:43:53.848', 1);
INSERT INTO `production_order_lines` VALUES (505, 19, 2, 'in', NULL, 'NL-HCH-034', 'HOT FLUX', 'AT117926', NULL, NULL, 100.0000, 100.0000, 0.0000, 'g', NULL, NULL, NULL, '2026-05-20 13:47:25.948', '2026-05-20 13:47:25.948', 2);
INSERT INTO `production_order_lines` VALUES (506, 19, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 90.0000, 90.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-20 13:47:25.948', '2026-05-20 13:47:25.948', 2);
INSERT INTO `production_order_lines` VALUES (507, 19, 2, 'out', NULL, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-xnvl3', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:47:25.948', '2026-05-20 13:47:25.948', 2);
INSERT INTO `production_order_lines` VALUES (509, 19, 3, 'out', 2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'lot-btp-xnvl3', NULL, NULL, 10.0000, 10.0000, 0.0000, 'gr', NULL, NULL, NULL, '2026-05-20 13:47:51.359', '2026-05-20 13:47:51.359', 2);
INSERT INTO `production_order_lines` VALUES (516, 19, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, '2026-05-17 17:00:00.000', 90.0000, 90.0000, 0.0000, 'Cái', 1, NULL, NULL, '2026-05-20 13:57:30.842', '2026-05-20 13:57:30.842', NULL);
INSERT INTO `production_order_lines` VALUES (517, 19, 1, 'out', 43, 'NL-HCH-034', 'HOT FLUX', 'AT117926', '2027-05-07', '2026-05-18 17:00:00.000', 100.0000, 100.0000, 0.0000, 'g', 1, NULL, NULL, '2026-05-20 13:57:30.842', '2026-05-20 13:57:30.842', NULL);
INSERT INTO `production_order_lines` VALUES (518, 19, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-tp-xnvl3', '2026-05-31', NULL, 12.0000, 12.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-20 13:57:30.886', '2026-05-20 13:57:30.886', 1);
INSERT INTO `production_order_lines` VALUES (522, 20, 1, 'out', 41, 'NL-HCH-032', 'VITAMIN E', 'UT25100294', '2029-09-27', '2026-05-18 17:00:00.000', 1000.0000, 1000.0000, 0.0000, 'g', 1, NULL, NULL, '2026-05-20 14:01:15.991', '2026-05-20 14:01:15.991', NULL);
INSERT INTO `production_order_lines` VALUES (524, 21, 2, 'in', NULL, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, NULL, 25.0000, 25.0000, 0.0000, 'Cái', NULL, NULL, NULL, '2026-05-23 05:00:16.046', '2026-05-23 05:00:16.046', 3);
INSERT INTO `production_order_lines` VALUES (525, 21, 2, 'out', NULL, 'BTP-002', 'Vỏ hộp MESLAS - bán thành phầm', 'lot-btp-aaavh', NULL, NULL, 25.0000, 25.0000, 0.0000, 'hộp', NULL, NULL, NULL, '2026-05-23 05:00:16.046', '2026-05-23 05:00:16.046', 3);
INSERT INTO `production_order_lines` VALUES (526, 21, 3, 'out', 3, 'BTP-002', 'Vỏ hộp MESLAS - bán thành phầm', 'lot-btp-aaavh', NULL, NULL, 25.0000, 25.0000, 0.0000, 'hộp', NULL, NULL, NULL, '2026-05-23 05:00:27.129', '2026-05-23 05:00:27.129', 3);
INSERT INTO `production_order_lines` VALUES (527, 21, 1, 'out', 69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', '1131', NULL, '2026-05-19 17:00:00.000', 25.0000, 25.0000, 0.0000, 'Cái', 1, NULL, NULL, '2026-05-23 05:00:51.716', '2026-05-23 05:00:51.716', NULL);
INSERT INTO `production_order_lines` VALUES (528, 21, 4, 'in', NULL, 'TP-001', 'Kem MELAS 10g', 'lot-btp-vhm', '2026-12-31', NULL, 25.0000, 25.0000, 0.0000, 'hủ', NULL, 'pending', NULL, '2026-05-23 05:00:51.754', '2026-05-23 05:00:51.754', 1);

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
) ENGINE = InnoDB AUTO_INCREMENT = 370 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_order_logs
-- ----------------------------
INSERT INTO `production_order_logs` VALUES (16, 5, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260506-5907', 'system', NULL, '2026-05-06 13:50:15.909');
INSERT INTO `production_order_logs` VALUES (17, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-06 13:52:12.627');
INSERT INTO `production_order_logs` VALUES (18, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 1 dòng', 'update', NULL, '2026-05-06 14:02:11.134');
INSERT INTO `production_order_logs` VALUES (19, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 1 dòng', 'update', NULL, '2026-05-06 14:02:12.262');
INSERT INTO `production_order_logs` VALUES (20, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 0 dòng', 'update', NULL, '2026-05-07 13:37:58.208');
INSERT INTO `production_order_logs` VALUES (21, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 1 dòng', 'update', NULL, '2026-05-07 13:52:12.276');
INSERT INTO `production_order_logs` VALUES (22, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-07 13:55:56.497');
INSERT INTO `production_order_logs` VALUES (23, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-07 14:22:09.723');
INSERT INTO `production_order_logs` VALUES (24, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-07 14:27:21.190');
INSERT INTO `production_order_logs` VALUES (25, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-07 14:34:37.638');
INSERT INTO `production_order_logs` VALUES (26, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-07 14:53:16.924');
INSERT INTO `production_order_logs` VALUES (27, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-07 14:54:15.157');
INSERT INTO `production_order_logs` VALUES (28, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:29:28.418');
INSERT INTO `production_order_logs` VALUES (29, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:29:32.325');
INSERT INTO `production_order_logs` VALUES (30, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:29:39.496');
INSERT INTO `production_order_logs` VALUES (31, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:40:35.347');
INSERT INTO `production_order_logs` VALUES (32, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:40:43.679');
INSERT INTO `production_order_logs` VALUES (33, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 13:56:34.904');
INSERT INTO `production_order_logs` VALUES (34, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 14:02:59.131');
INSERT INTO `production_order_logs` VALUES (35, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-08 14:09:39.134');
INSERT INTO `production_order_logs` VALUES (36, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 14:17:50.527');
INSERT INTO `production_order_logs` VALUES (37, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 14:17:53.627');
INSERT INTO `production_order_logs` VALUES (38, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 14:18:04.092');
INSERT INTO `production_order_logs` VALUES (39, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-08 14:23:13.137');
INSERT INTO `production_order_logs` VALUES (40, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-10 04:14:32.088');
INSERT INTO `production_order_logs` VALUES (41, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-10 04:17:01.156');
INSERT INTO `production_order_logs` VALUES (42, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:17:04.632');
INSERT INTO `production_order_logs` VALUES (43, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:19:34.364');
INSERT INTO `production_order_logs` VALUES (44, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-10 04:20:28.039');
INSERT INTO `production_order_logs` VALUES (45, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-10 04:20:36.838');
INSERT INTO `production_order_logs` VALUES (46, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-10 04:20:56.974');
INSERT INTO `production_order_logs` VALUES (47, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:24:28.703');
INSERT INTO `production_order_logs` VALUES (48, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:24:33.965');
INSERT INTO `production_order_logs` VALUES (49, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:24:45.150');
INSERT INTO `production_order_logs` VALUES (50, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:25:25.145');
INSERT INTO `production_order_logs` VALUES (51, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:26:22.500');
INSERT INTO `production_order_logs` VALUES (52, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:29:21.420');
INSERT INTO `production_order_logs` VALUES (53, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:30:28.439');
INSERT INTO `production_order_logs` VALUES (54, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:38:54.215');
INSERT INTO `production_order_logs` VALUES (55, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:43:39.676');
INSERT INTO `production_order_logs` VALUES (56, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 04:54:01.995');
INSERT INTO `production_order_logs` VALUES (57, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 04:57:00.856');
INSERT INTO `production_order_logs` VALUES (58, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 04:57:12.166');
INSERT INTO `production_order_logs` VALUES (59, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:00:03.509');
INSERT INTO `production_order_logs` VALUES (60, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 05:00:05.338');
INSERT INTO `production_order_logs` VALUES (61, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:00:39.100');
INSERT INTO `production_order_logs` VALUES (63, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:00:41.534');
INSERT INTO `production_order_logs` VALUES (64, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 05:00:50.023');
INSERT INTO `production_order_logs` VALUES (65, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:01:46.096');
INSERT INTO `production_order_logs` VALUES (66, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 05:01:48.569');
INSERT INTO `production_order_logs` VALUES (67, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:02:27.104');
INSERT INTO `production_order_logs` VALUES (68, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 05:02:28.971');
INSERT INTO `production_order_logs` VALUES (69, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:02:39.974');
INSERT INTO `production_order_logs` VALUES (70, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:02:42.071');
INSERT INTO `production_order_logs` VALUES (71, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:02:44.044');
INSERT INTO `production_order_logs` VALUES (72, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:02:45.681');
INSERT INTO `production_order_logs` VALUES (73, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:04:16.185');
INSERT INTO `production_order_logs` VALUES (74, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:05:33.635');
INSERT INTO `production_order_logs` VALUES (75, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:06:17.116');
INSERT INTO `production_order_logs` VALUES (77, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:08:51.457');
INSERT INTO `production_order_logs` VALUES (79, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:08:57.259');
INSERT INTO `production_order_logs` VALUES (81, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:09:36.196');
INSERT INTO `production_order_logs` VALUES (83, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:09:41.203');
INSERT INTO `production_order_logs` VALUES (85, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 05:09:51.554');
INSERT INTO `production_order_logs` VALUES (86, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:09:52.093');
INSERT INTO `production_order_logs` VALUES (87, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:09:53.860');
INSERT INTO `production_order_logs` VALUES (89, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-10 05:12:33.422');
INSERT INTO `production_order_logs` VALUES (90, 5, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-10 05:12:33.495');
INSERT INTO `production_order_logs` VALUES (91, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 09:20:57.279');
INSERT INTO `production_order_logs` VALUES (92, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 09:21:13.140');
INSERT INTO `production_order_logs` VALUES (93, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 3 dòng', 'update', NULL, '2026-05-10 09:26:49.466');
INSERT INTO `production_order_logs` VALUES (94, 6, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260512-1919', 'system', NULL, '2026-05-12 00:58:31.941');
INSERT INTO `production_order_logs` VALUES (95, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 4 dòng', 'update', NULL, '2026-05-12 01:00:20.402');
INSERT INTO `production_order_logs` VALUES (96, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 4 dòng', 'update', NULL, '2026-05-12 01:03:18.943');
INSERT INTO `production_order_logs` VALUES (97, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 4 dòng', 'update', NULL, '2026-05-12 01:04:49.772');
INSERT INTO `production_order_logs` VALUES (98, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 4 dòng', 'update', NULL, '2026-05-12 01:04:57.411');
INSERT INTO `production_order_logs` VALUES (99, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-12 01:07:13.043');
INSERT INTO `production_order_logs` VALUES (100, 6, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-12 01:07:17.123');
INSERT INTO `production_order_logs` VALUES (101, 6, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-12 01:07:17.226');
INSERT INTO `production_order_logs` VALUES (102, 5, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-15 08:15:05.490');
INSERT INTO `production_order_logs` VALUES (103, 7, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260515-0178', 'system', NULL, '2026-05-15 08:25:20.180');
INSERT INTO `production_order_logs` VALUES (104, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-15 08:25:36.276');
INSERT INTO `production_order_logs` VALUES (105, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 1 dòng', 'update', NULL, '2026-05-15 08:26:03.589');
INSERT INTO `production_order_logs` VALUES (106, 7, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-15 08:28:45.062');
INSERT INTO `production_order_logs` VALUES (107, 7, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-15 08:28:53.454');
INSERT INTO `production_order_logs` VALUES (108, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-15 08:29:44.583');
INSERT INTO `production_order_logs` VALUES (109, 7, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-15 08:29:44.618');
INSERT INTO `production_order_logs` VALUES (110, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-15 08:33:10.370');
INSERT INTO `production_order_logs` VALUES (111, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-15 08:47:47.388');
INSERT INTO `production_order_logs` VALUES (112, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-15 08:48:11.602');
INSERT INTO `production_order_logs` VALUES (113, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-15 09:05:28.250');
INSERT INTO `production_order_logs` VALUES (114, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-15 09:05:57.777');
INSERT INTO `production_order_logs` VALUES (115, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-16 01:04:51.004');
INSERT INTO `production_order_logs` VALUES (116, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-16 01:05:19.769');
INSERT INTO `production_order_logs` VALUES (117, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:06:01.965');
INSERT INTO `production_order_logs` VALUES (118, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:06:05.755');
INSERT INTO `production_order_logs` VALUES (119, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:06:09.952');
INSERT INTO `production_order_logs` VALUES (120, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:12:10.431');
INSERT INTO `production_order_logs` VALUES (121, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-16 01:13:54.283');
INSERT INTO `production_order_logs` VALUES (122, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-16 01:13:54.694');
INSERT INTO `production_order_logs` VALUES (123, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-16 01:14:06.687');
INSERT INTO `production_order_logs` VALUES (124, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:18:13.400');
INSERT INTO `production_order_logs` VALUES (125, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 01:56:24.438');
INSERT INTO `production_order_logs` VALUES (126, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 12:58:31.549');
INSERT INTO `production_order_logs` VALUES (127, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 12:58:37.488');
INSERT INTO `production_order_logs` VALUES (128, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 5 dòng', 'update', NULL, '2026-05-16 12:59:20.693');
INSERT INTO `production_order_logs` VALUES (129, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 12:59:41.821');
INSERT INTO `production_order_logs` VALUES (130, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:00:14.494');
INSERT INTO `production_order_logs` VALUES (131, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:00:45.661');
INSERT INTO `production_order_logs` VALUES (132, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:01:50.978');
INSERT INTO `production_order_logs` VALUES (133, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:04:01.076');
INSERT INTO `production_order_logs` VALUES (134, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:05:01.651');
INSERT INTO `production_order_logs` VALUES (135, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 2 dòng', 'update', NULL, '2026-05-16 13:05:02.158');
INSERT INTO `production_order_logs` VALUES (136, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-16 13:05:55.763');
INSERT INTO `production_order_logs` VALUES (137, 7, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-16 13:06:00.013');
INSERT INTO `production_order_logs` VALUES (138, 7, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-16 13:06:00.070');
INSERT INTO `production_order_logs` VALUES (139, 8, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260516-8576', 'system', NULL, '2026-05-16 13:11:58.578');
INSERT INTO `production_order_logs` VALUES (140, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-16 13:12:38.054');
INSERT INTO `production_order_logs` VALUES (141, 8, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-16 13:12:42.440');
INSERT INTO `production_order_logs` VALUES (142, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-16 13:14:03.183');
INSERT INTO `production_order_logs` VALUES (143, 8, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-16 13:14:04.153');
INSERT INTO `production_order_logs` VALUES (144, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-16 13:14:19.879');
INSERT INTO `production_order_logs` VALUES (145, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-16 13:14:42.681');
INSERT INTO `production_order_logs` VALUES (146, 8, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-16 13:14:42.709');
INSERT INTO `production_order_logs` VALUES (147, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-16 13:15:25.798');
INSERT INTO `production_order_logs` VALUES (148, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-16 13:16:44.068');
INSERT INTO `production_order_logs` VALUES (149, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-16 13:17:27.096');
INSERT INTO `production_order_logs` VALUES (150, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-16 14:14:50.759');
INSERT INTO `production_order_logs` VALUES (151, 8, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-16 14:14:54.059');
INSERT INTO `production_order_logs` VALUES (152, 8, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-16 14:22:37.376');
INSERT INTO `production_order_logs` VALUES (153, 8, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-16 14:22:38.997');
INSERT INTO `production_order_logs` VALUES (154, 8, 2, 'admin@zencos.vn', 'Hủy phiếu – đã hoàn trả 2 giao dịch xuất NVL vào kho', 'process', 1, '2026-05-16 14:23:21.044');
INSERT INTO `production_order_logs` VALUES (155, 9, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260518-7925', 'system', 1, '2026-05-18 02:05:47.927');
INSERT INTO `production_order_logs` VALUES (156, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-18 02:11:34.233');
INSERT INTO `production_order_logs` VALUES (157, 9, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 2 lô hàng đã trừ kho', 'process', 1, '2026-05-18 02:11:36.872');
INSERT INTO `production_order_logs` VALUES (158, 9, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-18 02:11:47.942');
INSERT INTO `production_order_logs` VALUES (159, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-18 02:12:16.376');
INSERT INTO `production_order_logs` VALUES (160, 9, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-18 02:12:18.868');
INSERT INTO `production_order_logs` VALUES (161, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-18 02:12:26.105');
INSERT INTO `production_order_logs` VALUES (162, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-18 02:23:19.636');
INSERT INTO `production_order_logs` VALUES (163, 9, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-18 02:23:19.680');
INSERT INTO `production_order_logs` VALUES (164, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 06:42:34.234');
INSERT INTO `production_order_logs` VALUES (165, 9, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 1 dòng, tổng 10.000 đơn vị', 'process', NULL, '2026-05-18 06:42:44.527');
INSERT INTO `production_order_logs` VALUES (166, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 06:52:01.999');
INSERT INTO `production_order_logs` VALUES (167, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-18 06:59:52.326');
INSERT INTO `production_order_logs` VALUES (168, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 06:59:52.396');
INSERT INTO `production_order_logs` VALUES (169, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-18 07:05:32.447');
INSERT INTO `production_order_logs` VALUES (170, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-18 07:06:58.708');
INSERT INTO `production_order_logs` VALUES (171, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:06:58.816');
INSERT INTO `production_order_logs` VALUES (172, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 4 dòng', 'update', NULL, '2026-05-18 07:21:35.594');
INSERT INTO `production_order_logs` VALUES (173, 9, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-18 07:21:36.667');
INSERT INTO `production_order_logs` VALUES (174, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 4 dòng', 'update', NULL, '2026-05-18 07:22:21.033');
INSERT INTO `production_order_logs` VALUES (175, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:22:21.083');
INSERT INTO `production_order_logs` VALUES (176, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 4 dòng', 'update', NULL, '2026-05-18 07:22:33.140');
INSERT INTO `production_order_logs` VALUES (177, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:22:33.196');
INSERT INTO `production_order_logs` VALUES (178, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:30:26.128');
INSERT INTO `production_order_logs` VALUES (179, 9, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-18 07:30:27.223');
INSERT INTO `production_order_logs` VALUES (180, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:30:33.005');
INSERT INTO `production_order_logs` VALUES (181, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 4 dòng', 'update', NULL, '2026-05-18 07:31:24.723');
INSERT INTO `production_order_logs` VALUES (182, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-18 07:31:29.171');
INSERT INTO `production_order_logs` VALUES (183, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:31:35.472');
INSERT INTO `production_order_logs` VALUES (184, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:31:35.519');
INSERT INTO `production_order_logs` VALUES (185, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 4 dòng', 'update', NULL, '2026-05-18 07:40:33.098');
INSERT INTO `production_order_logs` VALUES (186, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 4 dòng', 'update', NULL, '2026-05-18 07:40:34.284');
INSERT INTO `production_order_logs` VALUES (187, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-18 07:40:37.232');
INSERT INTO `production_order_logs` VALUES (188, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:41:38.893');
INSERT INTO `production_order_logs` VALUES (189, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:41:38.950');
INSERT INTO `production_order_logs` VALUES (190, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:41:56.436');
INSERT INTO `production_order_logs` VALUES (191, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:41:56.508');
INSERT INTO `production_order_logs` VALUES (192, 9, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 3 dòng, tổng 610.000 đơn vị', 'process', NULL, '2026-05-18 07:44:10.221');
INSERT INTO `production_order_logs` VALUES (193, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 5 dòng', 'update', NULL, '2026-05-18 07:44:10.251');
INSERT INTO `production_order_logs` VALUES (194, 9, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-18 07:44:10.313');
INSERT INTO `production_order_logs` VALUES (195, 9, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-18 07:44:10.427');
INSERT INTO `production_order_logs` VALUES (196, 10, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260519-2243', 'system', 1, '2026-05-19 06:35:42.245');
INSERT INTO `production_order_logs` VALUES (197, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:36:10.367');
INSERT INTO `production_order_logs` VALUES (198, 10, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 2 lô hàng đã trừ kho', 'process', 1, '2026-05-19 06:36:13.524');
INSERT INTO `production_order_logs` VALUES (199, 10, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-19 06:36:16.133');
INSERT INTO `production_order_logs` VALUES (200, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-19 06:37:02.119');
INSERT INTO `production_order_logs` VALUES (201, 10, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-19 06:37:02.969');
INSERT INTO `production_order_logs` VALUES (202, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 06:37:15.374');
INSERT INTO `production_order_logs` VALUES (203, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 06:37:15.861');
INSERT INTO `production_order_logs` VALUES (204, 10, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-19 06:37:15.895');
INSERT INTO `production_order_logs` VALUES (205, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:37:32.017');
INSERT INTO `production_order_logs` VALUES (206, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:37:32.067');
INSERT INTO `production_order_logs` VALUES (207, 10, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 2 dòng, tổng 70.000 đơn vị', 'process', NULL, '2026-05-19 06:40:20.383');
INSERT INTO `production_order_logs` VALUES (208, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:40:20.412');
INSERT INTO `production_order_logs` VALUES (209, 10, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:40:20.474');
INSERT INTO `production_order_logs` VALUES (210, 10, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-19 06:40:20.565');
INSERT INTO `production_order_logs` VALUES (211, 11, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260519-9457', 'system', 1, '2026-05-19 06:42:19.461');
INSERT INTO `production_order_logs` VALUES (212, 11, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-19 06:42:53.194');
INSERT INTO `production_order_logs` VALUES (213, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:44:04.020');
INSERT INTO `production_order_logs` VALUES (214, 11, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 2 lô hàng đã trừ kho', 'process', 1, '2026-05-19 06:44:05.004');
INSERT INTO `production_order_logs` VALUES (215, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:44:25.570');
INSERT INTO `production_order_logs` VALUES (216, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:44:28.791');
INSERT INTO `production_order_logs` VALUES (217, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-19 06:45:05.965');
INSERT INTO `production_order_logs` VALUES (218, 11, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-19 06:45:10.126');
INSERT INTO `production_order_logs` VALUES (219, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-19 06:45:22.543');
INSERT INTO `production_order_logs` VALUES (220, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 06:45:32.375');
INSERT INTO `production_order_logs` VALUES (221, 11, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-19 06:45:32.419');
INSERT INTO `production_order_logs` VALUES (222, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:45:41.411');
INSERT INTO `production_order_logs` VALUES (223, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:45:41.455');
INSERT INTO `production_order_logs` VALUES (224, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:46:04.603');
INSERT INTO `production_order_logs` VALUES (225, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:46:04.656');
INSERT INTO `production_order_logs` VALUES (226, 11, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 1 dòng, tổng 25.000 đơn vị', 'process', NULL, '2026-05-19 06:46:07.807');
INSERT INTO `production_order_logs` VALUES (227, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:46:07.827');
INSERT INTO `production_order_logs` VALUES (228, 11, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:46:07.871');
INSERT INTO `production_order_logs` VALUES (229, 11, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-19 06:46:07.960');
INSERT INTO `production_order_logs` VALUES (230, 12, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260519-0781', 'system', 1, '2026-05-19 06:53:20.783');
INSERT INTO `production_order_logs` VALUES (231, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:53:40.922');
INSERT INTO `production_order_logs` VALUES (232, 12, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 2 lô hàng đã trừ kho', 'process', 1, '2026-05-19 06:53:41.893');
INSERT INTO `production_order_logs` VALUES (233, 12, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-19 06:53:44.532');
INSERT INTO `production_order_logs` VALUES (234, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-19 06:54:11.562');
INSERT INTO `production_order_logs` VALUES (235, 12, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-19 06:54:15.140');
INSERT INTO `production_order_logs` VALUES (236, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 06:54:35.722');
INSERT INTO `production_order_logs` VALUES (237, 12, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-19 06:54:35.777');
INSERT INTO `production_order_logs` VALUES (238, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:54:52.988');
INSERT INTO `production_order_logs` VALUES (239, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:54:53.048');
INSERT INTO `production_order_logs` VALUES (240, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:55:16.031');
INSERT INTO `production_order_logs` VALUES (241, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:55:16.077');
INSERT INTO `production_order_logs` VALUES (242, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:55:17.853');
INSERT INTO `production_order_logs` VALUES (243, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:55:17.917');
INSERT INTO `production_order_logs` VALUES (244, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:55:31.454');
INSERT INTO `production_order_logs` VALUES (245, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:55:31.512');
INSERT INTO `production_order_logs` VALUES (246, 12, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 2 dòng, tổng 150.000 đơn vị', 'process', NULL, '2026-05-19 06:55:33.309');
INSERT INTO `production_order_logs` VALUES (247, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 06:55:33.339');
INSERT INTO `production_order_logs` VALUES (248, 12, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 06:55:33.403');
INSERT INTO `production_order_logs` VALUES (249, 12, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-19 06:55:33.504');
INSERT INTO `production_order_logs` VALUES (250, 13, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260519-1553', 'system', 1, '2026-05-19 14:15:11.555');
INSERT INTO `production_order_logs` VALUES (251, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 14:16:01.353');
INSERT INTO `production_order_logs` VALUES (252, 13, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-19 14:16:16.091');
INSERT INTO `production_order_logs` VALUES (253, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-19 14:17:05.305');
INSERT INTO `production_order_logs` VALUES (254, 13, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-19 14:17:09.325');
INSERT INTO `production_order_logs` VALUES (255, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 14:17:19.804');
INSERT INTO `production_order_logs` VALUES (256, 13, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-19 14:17:19.838');
INSERT INTO `production_order_logs` VALUES (257, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-19 14:17:54.444');
INSERT INTO `production_order_logs` VALUES (258, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-19 14:17:56.115');
INSERT INTO `production_order_logs` VALUES (259, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 14:18:40.431');
INSERT INTO `production_order_logs` VALUES (260, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 14:18:40.468');
INSERT INTO `production_order_logs` VALUES (261, 13, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 1 dòng, tổng 50.000 đơn vị', 'process', NULL, '2026-05-19 14:25:23.293');
INSERT INTO `production_order_logs` VALUES (262, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-19 14:25:23.331');
INSERT INTO `production_order_logs` VALUES (263, 13, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-19 14:25:23.371');
INSERT INTO `production_order_logs` VALUES (264, 13, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-19 14:25:23.424');
INSERT INTO `production_order_logs` VALUES (265, 14, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-9916', 'system', 1, '2026-05-20 02:28:49.918');
INSERT INTO `production_order_logs` VALUES (266, 14, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 02:29:02.446');
INSERT INTO `production_order_logs` VALUES (267, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 02:33:02.662');
INSERT INTO `production_order_logs` VALUES (268, 14, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 02:33:03.864');
INSERT INTO `production_order_logs` VALUES (269, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-20 02:33:51.986');
INSERT INTO `production_order_logs` VALUES (270, 14, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 02:33:52.760');
INSERT INTO `production_order_logs` VALUES (271, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 02:34:00.679');
INSERT INTO `production_order_logs` VALUES (272, 14, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 02:34:00.720');
INSERT INTO `production_order_logs` VALUES (273, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 02:34:36.356');
INSERT INTO `production_order_logs` VALUES (274, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 02:34:36.386');
INSERT INTO `production_order_logs` VALUES (275, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 02:34:54.508');
INSERT INTO `production_order_logs` VALUES (276, 14, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 02:34:54.553');
INSERT INTO `production_order_logs` VALUES (277, 14, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-20 02:34:54.609');
INSERT INTO `production_order_logs` VALUES (278, 15, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-1873', 'system', 1, '2026-05-20 08:16:41.874');
INSERT INTO `production_order_logs` VALUES (279, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 08:23:43.634');
INSERT INTO `production_order_logs` VALUES (280, 15, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 2 lô hàng đã trừ kho', 'process', 1, '2026-05-20 08:23:45.771');
INSERT INTO `production_order_logs` VALUES (281, 15, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 08:24:03.479');
INSERT INTO `production_order_logs` VALUES (282, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 08:24:31.497');
INSERT INTO `production_order_logs` VALUES (283, 15, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 08:24:32.417');
INSERT INTO `production_order_logs` VALUES (284, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 08:24:40.076');
INSERT INTO `production_order_logs` VALUES (285, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 08:24:40.502');
INSERT INTO `production_order_logs` VALUES (286, 15, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 08:24:40.545');
INSERT INTO `production_order_logs` VALUES (287, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 08:25:03.595');
INSERT INTO `production_order_logs` VALUES (288, 15, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 08:25:04.097');
INSERT INTO `production_order_logs` VALUES (289, 15, 2, 'admin@zencos.vn', 'Hủy phiếu – đã hoàn trả 2 giao dịch xuất NVL vào kho', 'process', 1, '2026-05-20 08:26:23.940');
INSERT INTO `production_order_logs` VALUES (290, 16, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-2380', 'system', 1, '2026-05-20 08:31:22.386');
INSERT INTO `production_order_logs` VALUES (291, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 08:42:45.376');
INSERT INTO `production_order_logs` VALUES (292, 16, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 08:42:46.500');
INSERT INTO `production_order_logs` VALUES (293, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 08:43:21.181');
INSERT INTO `production_order_logs` VALUES (294, 16, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 08:43:22.108');
INSERT INTO `production_order_logs` VALUES (295, 16, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 08:45:19.992');
INSERT INTO `production_order_logs` VALUES (296, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 08:45:48.340');
INSERT INTO `production_order_logs` VALUES (297, 16, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 08:45:48.966');
INSERT INTO `production_order_logs` VALUES (298, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 08:45:54.946');
INSERT INTO `production_order_logs` VALUES (299, 16, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 08:45:54.986');
INSERT INTO `production_order_logs` VALUES (300, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 08:46:22.515');
INSERT INTO `production_order_logs` VALUES (301, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 08:46:22.557');
INSERT INTO `production_order_logs` VALUES (302, 16, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 2 dòng, tổng 30.000 đơn vị', 'process', NULL, '2026-05-20 08:46:25.807');
INSERT INTO `production_order_logs` VALUES (303, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 08:46:25.844');
INSERT INTO `production_order_logs` VALUES (304, 16, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 08:46:25.909');
INSERT INTO `production_order_logs` VALUES (305, 16, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-20 08:46:26.007');
INSERT INTO `production_order_logs` VALUES (306, 17, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-5092', 'system', 1, '2026-05-20 13:12:35.096');
INSERT INTO `production_order_logs` VALUES (307, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 13:13:03.843');
INSERT INTO `production_order_logs` VALUES (308, 17, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:13:05.783');
INSERT INTO `production_order_logs` VALUES (309, 17, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 13:13:10.543');
INSERT INTO `production_order_logs` VALUES (310, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 0 dòng', 'update', NULL, '2026-05-20 13:13:11.847');
INSERT INTO `production_order_logs` VALUES (311, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 0 dòng', 'update', NULL, '2026-05-20 13:13:14.824');
INSERT INTO `production_order_logs` VALUES (312, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:14:36.171');
INSERT INTO `production_order_logs` VALUES (313, 17, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:14:37.384');
INSERT INTO `production_order_logs` VALUES (314, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-20 13:18:46.268');
INSERT INTO `production_order_logs` VALUES (315, 17, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:18:50.067');
INSERT INTO `production_order_logs` VALUES (316, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 4 dòng', 'update', NULL, '2026-05-20 13:19:53.821');
INSERT INTO `production_order_logs` VALUES (317, 17, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 13:19:54.259');
INSERT INTO `production_order_logs` VALUES (318, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 13:20:00.056');
INSERT INTO `production_order_logs` VALUES (319, 17, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 13:20:00.082');
INSERT INTO `production_order_logs` VALUES (320, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-20 13:20:31.943');
INSERT INTO `production_order_logs` VALUES (321, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:20:31.982');
INSERT INTO `production_order_logs` VALUES (322, 17, 2, 'admin@zencos.vn', 'Hoàn nhập NVL thừa – 3 dòng, tổng 541.000 đơn vị', 'process', NULL, '2026-05-20 13:20:50.825');
INSERT INTO `production_order_logs` VALUES (323, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 3 dòng', 'update', NULL, '2026-05-20 13:20:50.849');
INSERT INTO `production_order_logs` VALUES (324, 17, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:20:50.889');
INSERT INTO `production_order_logs` VALUES (325, 17, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-20 13:20:50.945');
INSERT INTO `production_order_logs` VALUES (326, 18, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-8470', 'system', 1, '2026-05-20 13:40:38.472');
INSERT INTO `production_order_logs` VALUES (327, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 13:41:02.757');
INSERT INTO `production_order_logs` VALUES (328, 18, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:41:03.878');
INSERT INTO `production_order_logs` VALUES (329, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:41:15.931');
INSERT INTO `production_order_logs` VALUES (330, 18, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:41:16.711');
INSERT INTO `production_order_logs` VALUES (331, 18, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 13:41:36.997');
INSERT INTO `production_order_logs` VALUES (332, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:42:53.049');
INSERT INTO `production_order_logs` VALUES (333, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 13:43:20.412');
INSERT INTO `production_order_logs` VALUES (334, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 13:43:26.634');
INSERT INTO `production_order_logs` VALUES (335, 18, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 13:43:26.887');
INSERT INTO `production_order_logs` VALUES (336, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 13:43:31.366');
INSERT INTO `production_order_logs` VALUES (337, 18, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 13:43:31.395');
INSERT INTO `production_order_logs` VALUES (338, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:43:53.814');
INSERT INTO `production_order_logs` VALUES (339, 18, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:43:53.848');
INSERT INTO `production_order_logs` VALUES (340, 18, 2, 'admin@zencos.vn', 'Hủy phiếu – đã hoàn trả 2 giao dịch xuất NVL vào kho', 'process', 1, '2026-05-20 13:44:18.775');
INSERT INTO `production_order_logs` VALUES (341, 19, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-4125', 'system', 1, '2026-05-20 13:44:44.130');
INSERT INTO `production_order_logs` VALUES (342, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 13:45:47.829');
INSERT INTO `production_order_logs` VALUES (343, 19, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:45:48.772');
INSERT INTO `production_order_logs` VALUES (344, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:46:14.138');
INSERT INTO `production_order_logs` VALUES (345, 19, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 13:46:14.954');
INSERT INTO `production_order_logs` VALUES (346, 19, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 13:46:19.672');
INSERT INTO `production_order_logs` VALUES (347, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-20 13:46:56.786');
INSERT INTO `production_order_logs` VALUES (348, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:47:01.736');
INSERT INTO `production_order_logs` VALUES (349, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 13:47:22.064');
INSERT INTO `production_order_logs` VALUES (350, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 3 dòng', 'update', NULL, '2026-05-20 13:47:25.948');
INSERT INTO `production_order_logs` VALUES (351, 19, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-20 13:47:35.161');
INSERT INTO `production_order_logs` VALUES (352, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 13:47:45.534');
INSERT INTO `production_order_logs` VALUES (353, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-20 13:47:51.359');
INSERT INTO `production_order_logs` VALUES (354, 19, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-20 13:47:51.398');
INSERT INTO `production_order_logs` VALUES (355, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:55:21.995');
INSERT INTO `production_order_logs` VALUES (356, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:55:22.038');
INSERT INTO `production_order_logs` VALUES (357, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:56:44.571');
INSERT INTO `production_order_logs` VALUES (358, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:56:44.623');
INSERT INTO `production_order_logs` VALUES (359, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 2 dòng', 'update', NULL, '2026-05-20 13:57:30.842');
INSERT INTO `production_order_logs` VALUES (360, 19, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-20 13:57:30.886');
INSERT INTO `production_order_logs` VALUES (361, 19, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-20 13:57:30.935');
INSERT INTO `production_order_logs` VALUES (362, 20, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260520-6833', 'system', 1, '2026-05-20 13:59:06.834');
INSERT INTO `production_order_logs` VALUES (363, 20, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-20 13:59:48.837');
INSERT INTO `production_order_logs` VALUES (364, 20, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 14:00:06.957');
INSERT INTO `production_order_logs` VALUES (365, 20, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 14:00:31.165');
INSERT INTO `production_order_logs` VALUES (366, 20, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 14:00:51.408');
INSERT INTO `production_order_logs` VALUES (367, 20, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-20 14:01:15.991');
INSERT INTO `production_order_logs` VALUES (368, 20, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-20 14:01:16.809');
INSERT INTO `production_order_logs` VALUES (369, 19, 2, 'admin@zencos.vn', 'Hủy phiếu – hoàn trả 2 giao dịch xuất NVL vào kho, hủy 1 giao dịch nhập TP', 'process', 1, '2026-05-20 14:20:36.066');
INSERT INTO `production_order_logs` VALUES (370, 21, 2, 'admin@zencos.vn', 'Khởi tạo phiếu sản xuất PSX-20260523-2893', 'system', 1, '2026-05-23 04:59:02.898');
INSERT INTO `production_order_logs` VALUES (371, 21, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-23 04:59:28.804');
INSERT INTO `production_order_logs` VALUES (372, 21, 2, 'admin@zencos.vn', 'Xác nhận xuất kho NVL – 1 lô hàng đã trừ kho', 'process', 1, '2026-05-23 04:59:29.914');
INSERT INTO `production_order_logs` VALUES (373, 21, 2, 'admin@zencos.vn', 'Chuyển sang Bước 2 – Nhập BTP', 'process', NULL, '2026-05-23 04:59:50.780');
INSERT INTO `production_order_logs` VALUES (374, 21, 2, 'admin@zencos.vn', 'Cập nhật Bước 2 – Nhập BTP – 2 dòng', 'update', NULL, '2026-05-23 05:00:16.046');
INSERT INTO `production_order_logs` VALUES (375, 21, 2, 'admin@zencos.vn', 'Chuyển sang Bước 3 – Xuất BTP', 'process', NULL, '2026-05-23 05:00:17.373');
INSERT INTO `production_order_logs` VALUES (376, 21, 2, 'admin@zencos.vn', 'Cập nhật Bước 3 – Xuất BTP – 1 dòng', 'update', NULL, '2026-05-23 05:00:27.129');
INSERT INTO `production_order_logs` VALUES (377, 21, 2, 'admin@zencos.vn', 'Chuyển sang Bước 4 – Nhập TP', 'process', NULL, '2026-05-23 05:00:27.181');
INSERT INTO `production_order_logs` VALUES (378, 21, 2, 'admin@zencos.vn', 'Cập nhật Bước 1 – Xuất NVL – 1 dòng', 'update', NULL, '2026-05-23 05:00:51.716');
INSERT INTO `production_order_logs` VALUES (379, 21, 2, 'admin@zencos.vn', 'Cập nhật Bước 4 – Nhập TP – 1 dòng', 'update', NULL, '2026-05-23 05:00:51.754');
INSERT INTO `production_order_logs` VALUES (380, 21, 2, 'admin@zencos.vn', 'Hoàn tất toàn bộ quy trình sản xuất – nhập TP vào kho', 'process', NULL, '2026-05-23 05:00:51.818');

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
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_orders
-- ----------------------------
INSERT INTO `production_orders` VALUES (5, 'PSX-20260506-5907', '2026-05-06 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', 'test quy trình', 2, '2026-05-06 13:50:15.909', '2026-05-10 05:12:33.495', 1, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `production_orders` VALUES (6, 'PSX-20260512-1919', '2026-05-12 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', 'sdsdf', 2, '2026-05-12 00:58:31.941', '2026-05-12 01:07:17.226', 1, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `production_orders` VALUES (7, 'PSX-20260515-0178', '2026-05-15 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', 'test test', 2, '2026-05-15 08:25:20.180', '2026-05-16 13:06:00.070', 1, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `production_orders` VALUES (8, 'PSX-20260516-8576', '2026-05-16 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'cancelled', NULL, 2, '2026-05-16 13:11:58.578', '2026-05-16 14:23:21.044', 1, '2026-05-16 14:14:54.042', NULL, NULL, NULL, NULL);
INSERT INTO `production_orders` VALUES (9, 'PSX-20260518-7925', '2026-05-18 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', 'test tiến độ', 2, '2026-05-18 02:05:47.927', '2026-05-18 07:44:10.427', 1, '2026-05-18 02:11:36.849', NULL, '2026-05-19 17:00:00', '2026-05-19 17:00:00', NULL);
INSERT INTO `production_orders` VALUES (10, 'PSX-20260519-2243', '2026-05-17 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-19 06:35:42.245', '2026-05-19 06:40:20.565', 1, '2026-05-19 06:36:13.500', NULL, '2026-05-18 17:00:00', '2026-05-18 17:00:00', NULL);
INSERT INTO `production_orders` VALUES (11, 'PSX-20260519-9457', '2026-05-17 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-19 06:42:19.461', '2026-05-19 06:46:07.960', 1, '2026-05-19 06:44:04.977', NULL, '2026-05-17 17:00:00', '2026-05-18 17:00:00', NULL);
INSERT INTO `production_orders` VALUES (12, 'PSX-20260519-0781', '2026-05-16 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-19 06:53:20.783', '2026-05-19 06:55:33.504', 1, '2026-05-19 06:53:41.845', NULL, '2026-05-17 17:00:00', '2026-05-18 17:00:00', '2026-05-18 17:00:00');
INSERT INTO `production_orders` VALUES (13, 'PSX-20260519-1553', '2026-05-19 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-19 14:15:11.555', '2026-05-19 14:25:23.424', 1, NULL, NULL, '2026-05-17 17:00:00', '2026-05-18 17:00:00', '2026-05-19 17:00:00');
INSERT INTO `production_orders` VALUES (14, 'PSX-20260520-9916', '2026-05-20 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-20 02:28:49.918', '2026-05-20 02:34:54.609', 1, '2026-05-20 02:33:03.846', NULL, '2026-04-30 17:00:00', '2026-05-18 17:00:00', '2026-05-19 17:00:00');
INSERT INTO `production_orders` VALUES (15, 'PSX-20260520-1873', '2026-05-20 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'cancelled', NULL, 2, '2026-05-20 08:16:41.874', '2026-05-20 08:26:23.940', NULL, '2026-05-20 08:23:45.739', '2026-05-18 17:00:00', '2026-05-19 17:00:00', '2026-05-19 17:00:00', NULL);
INSERT INTO `production_orders` VALUES (16, 'PSX-20260520-2380', '2026-05-20 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-20 08:31:22.386', '2026-05-20 08:46:26.007', 1, '2026-05-20 08:42:46.461', NULL, '2026-05-19 17:00:00', '2026-05-19 17:00:00', '2026-05-19 17:00:00');
INSERT INTO `production_orders` VALUES (17, 'PSX-20260520-5092', '2026-05-20 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', 'test các ngày xuất kho nvl khác nhau', 2, '2026-05-20 13:12:35.096', '2026-05-20 13:20:50.945', 1, '2026-05-20 13:13:05.766', NULL, '2026-05-20 17:00:00', '2026-05-20 17:00:00', '2026-05-21 17:00:00');
INSERT INTO `production_orders` VALUES (18, 'PSX-20260520-8470', '2026-05-20 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'cancelled', NULL, 2, '2026-05-20 13:40:38.472', '2026-05-20 13:44:18.775', 1, '2026-05-20 13:41:03.866', NULL, '2026-05-19 17:00:00', '2026-05-19 17:00:00', '2026-05-20 17:00:00');
INSERT INTO `production_orders` VALUES (19, 'PSX-20260520-4125', '2026-05-17 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'cancelled', 'test xuất nhiều nvl khác ngày', 2, '2026-05-20 13:44:44.130', '2026-05-20 14:20:36.066', 1, '2026-05-20 13:45:48.755', NULL, '2026-05-18 17:00:00', '2026-05-18 17:00:00', '2026-05-19 17:00:00');
INSERT INTO `production_orders` VALUES (20, 'PSX-20260520-6833', '2026-05-18 00:00:00.000', NULL, NULL, NULL, NULL, 2, 'in_progress', NULL, 2, '2026-05-20 13:59:06.834', '2026-05-20 14:01:16.809', 1, '2026-05-20 14:01:16.794', '2026-05-18 17:00:00', NULL, NULL, NULL);
INSERT INTO `production_orders` VALUES (21, 'PSX-20260523-2893', '2026-05-19 00:00:00.000', NULL, NULL, NULL, NULL, 4, 'completed', NULL, 2, '2026-05-23 04:59:02.898', '2026-05-23 05:00:51.818', 1, '2026-05-23 04:59:29.897', NULL, '2026-05-20 17:00:00', '2026-05-21 17:00:00', '2026-05-21 17:00:00');

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
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of production_output_transactions
-- ----------------------------
INSERT INTO `production_output_transactions` VALUES (1, 5, NULL, 1, 'import_from_production', 1500.0000, NULL, 'lot-tp-abc', '2026-08-31', 2, NULL, '2026-05-10 05:12:33', '2026-05-10 05:12:34', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (2, 6, NULL, 1, 'import_from_production', 499.0000, NULL, 'LOT-TP-ABC2026', '2026-05-31', 2, NULL, '2026-05-12 01:07:17', '2026-05-12 01:07:17', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (3, 7, NULL, 1, 'import_from_production', 390.0000, NULL, 'tp_lot7', '2026-12-31', 2, NULL, '2026-05-16 13:06:00', '2026-05-16 13:06:00', '2026-05-19 20:56:52');
INSERT INTO `production_output_transactions` VALUES (5, 9, NULL, 1, 'import_from_production', 985.0000, NULL, 'tp_lot_aaa222', '2027-01-31', 2, NULL, '2026-05-18 07:44:10', '2026-05-18 07:44:10', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (6, 10, NULL, 1, 'import_from_production', 50.0000, NULL, 'sdfsf', '2026-05-20', 2, NULL, '2026-05-19 06:40:21', '2026-05-19 06:40:21', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (7, 11, NULL, 1, 'import_from_production', 50.0000, NULL, 'lot_tp_abc', '2026-05-31', 2, NULL, '2026-05-19 06:46:08', '2026-05-19 06:46:08', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (8, 12, NULL, 1, 'import_from_production', 50.0000, NULL, 'tp-lot-aab11', '2026-08-31', 2, NULL, '2026-05-19 06:55:34', '2026-05-19 06:55:34', '2026-05-19 20:47:56');
INSERT INTO `production_output_transactions` VALUES (9, 13, NULL, 1, 'import_from_production', 25.0000, NULL, 'lot-tp19052026', '2026-12-31', 2, NULL, '2026-05-19 14:25:23', '2026-05-19 14:25:23', '2026-05-19 14:25:23');
INSERT INTO `production_output_transactions` VALUES (10, 14, NULL, 1, 'import_from_production', 10.0000, NULL, 'lot-tp-20052026', '2026-12-31', 2, NULL, '2026-05-20 02:34:55', '2026-05-20 02:34:55', '2026-05-20 02:34:55');
INSERT INTO `production_output_transactions` VALUES (14, NULL, 2, 1, 'export_to_sale', 50.0000, NULL, 'sdfsf', '2026-05-20', 2, 'Xuất TP theo phiếu XKTP-20260520-100246', '2026-05-20 03:02:46', '2026-05-20 03:22:32', '2026-05-20 03:22:32');
INSERT INTO `production_output_transactions` VALUES (15, NULL, 3, 1, 'export_to_sale', 499.0000, NULL, 'LOT-TP-ABC2026', '2026-05-31', 2, 'Xuất TP theo phiếu XKTP-20260520-103439', '2026-05-20 03:34:40', '2026-05-20 03:34:51', '2026-05-20 03:34:51');
INSERT INTO `production_output_transactions` VALUES (16, 16, NULL, 1, 'import_from_production', 10.0000, NULL, 'lot-tp-test200526', '2026-10-31', 2, NULL, '2026-05-20 08:46:26', '2026-05-20 08:46:26', '2026-05-20 08:46:26');
INSERT INTO `production_output_transactions` VALUES (17, 17, NULL, 1, 'import_from_production', 85.0000, NULL, 'lot-tp-test-xnvl', '2026-10-31', 2, NULL, '2026-05-20 13:20:51', '2026-05-20 13:20:51', '2026-05-20 13:20:51');
INSERT INTO `production_output_transactions` VALUES (19, 21, NULL, 1, 'import_from_production', 25.0000, NULL, 'lot-btp-vhm', '2026-12-31', 2, NULL, '2026-05-23 05:00:52', '2026-05-23 05:00:52', '2026-05-23 05:00:52');

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
) ENGINE = InnoDB AUTO_INCREMENT = 75 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 'R_Glycerin', 'Glycerin 99.5%', 'Glycerin', 1, 1, 4, 3, 2000.0000, '', NULL, '2026-03-30 14:30:07.305', '2026-04-08 22:03:44.885', 1);
INSERT INTO `products` VALUES (2, 'NVL-002', 'Vitamin E BASE', 'Vitamin E', 0, 0, 2, 2, 0.0000, '', '2026-03-31 10:58:16.167', '2026-03-30 14:40:09.253', '2026-03-31 10:58:16.167', 5);
INSERT INTO `products` VALUES (3, 'NVL-003', 'havchavc', 'hhhh', 0, 0, 2, 2, 0.0000, '', '2026-03-31 10:44:25.442', '2026-03-30 17:30:01.086', '2026-03-31 10:44:25.442', 5);
INSERT INTO `products` VALUES (4, 'NVL-004', 'Vitamin D', 'Vitamin D1', 1, 1, 2, 1, 100.0000, '', NULL, '2026-03-30 17:30:23.627', '2026-04-09 11:15:23.067', 1);
INSERT INTO `products` VALUES (5, 'NVL-005', 'bbbbb', 'bbbb', 1, 1, 2, 2, 0.0000, '', '2026-03-30 17:32:13.503', '2026-03-30 17:30:39.499', '2026-03-30 17:32:13.503', 1);
INSERT INTO `products` VALUES (8, 'NVL-001', 'sdfsdf', 'sdfsf', 1, 1, 4, 4, 0.0000, '', NULL, '2026-03-31 11:19:07.937', '2026-04-08 22:02:43.318', 5);
INSERT INTO `products` VALUES (11, 'NVL-006', 'aaa aaa', 'aaa', 1, 1, 2, 2, 0.0000, '', '2026-03-31 14:40:43.653', '2026-03-31 11:33:06.095', '2026-03-31 14:40:43.653', 1);
INSERT INTO `products` VALUES (13, 'NVL-007', 'Acid HCL 95%', 'Acid Clohydric', 1, 1, 4, 3, 1000.0000, '', NULL, '2026-03-31 11:40:14.182', '2026-04-18 21:31:58.559', 1);
INSERT INTO `products` VALUES (14, 'VitE', 'Vitamin E - ABC', 'Vitamin E2', 1, 1, 2, 2, 500.0000, '', NULL, '2026-03-31 14:59:45.264', '2026-04-21 14:19:51.766', 1);
INSERT INTO `products` VALUES (15, 'NVL-009', 'VitaC', 'Vitamin C', 1, 1, 2, 2, 0.0000, '', '2026-03-31 16:17:14.181', '2026-03-31 16:17:04.966', '2026-03-31 16:17:14.181', 1);
INSERT INTO `products` VALUES (16, 'NVL-011', 'Vitamin E - BASF', 'Vitamin E1', 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-01 20:56:29.292', '2026-04-21 14:04:39.054', 1);
INSERT INTO `products` VALUES (23, 'NVL-012', 'Dầu hạt nho tinh khiết', 'Vitis Vinifera Seed Oil', 1, 1, 4, NULL, 500.0000, '', NULL, '2026-04-03 22:40:47.421', '2026-04-21 15:58:03.492', 10);
INSERT INTO `products` VALUES (24, 'NVL-014', 'AAAA BBB CCC', 'ABC', 1, 1, 4, 4, 100.0000, '', NULL, '2026-04-03 22:51:01.600', '2026-05-05 20:14:13.785', NULL);
INSERT INTO `products` VALUES (33, 'NL-DMO-030', 'PROPYLENE GLYCOL', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:58:23.165', '2026-05-05 20:14:14.242', NULL);
INSERT INTO `products` VALUES (34, 'NL-DMO-029', 'GLYCERIN', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:48.940', '2026-05-05 20:14:14.608', NULL);
INSERT INTO `products` VALUES (35, 'NL-PGI-028', 'EDTA.4NA', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.158', '2026-05-05 20:14:14.903', NULL);
INSERT INTO `products` VALUES (36, 'NL-HCH-001', 'ALLANTOIN', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.190', '2026-04-21 16:30:35.782', NULL);
INSERT INTO `products` VALUES (37, 'NL-HCH-031', 'VITAMIN B5', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.228', '2026-05-20 15:44:47.780', NULL);
INSERT INTO `products` VALUES (38, 'NL-CXU-036', 'CS-GINGER EXT', NULL, 1, 1, 4, 3, 0.0000, '', NULL, '2026-04-21 15:59:49.256', '2026-04-24 14:07:24.361', NULL);
INSERT INTO `products` VALUES (39, 'NL-CXU-037', 'RICOBIO JA7', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.285', '2026-04-24 14:06:38.398', NULL);
INSERT INTO `products` VALUES (40, 'NL-TDA-012', 'CARBOMER', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.319', '2026-04-21 16:30:35.876', NULL);
INSERT INTO `products` VALUES (41, 'NL-HCH-032', 'VITAMIN E', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.350', '2026-05-20 15:44:51.948', 1);
INSERT INTO `products` VALUES (42, 'NL-PGI-033', 'METHYL SALICYLATE', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.382', '2026-05-17 10:07:41.326', 1);
INSERT INTO `products` VALUES (43, 'NL-HCH-034', 'HOT FLUX', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.416', '2026-05-17 10:08:24.799', 1);
INSERT INTO `products` VALUES (44, 'NL-BQU-035', 'EHGP', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.444', '2026-05-23 12:01:14.324', 1);
INSERT INTO `products` VALUES (45, 'NL-HLI-038', 'HƯƠNG', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.475', '2026-05-08 20:02:35.041', 1);
INSERT INTO `products` VALUES (46, 'NL-THU-039', 'COSMAN CR530', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.513', '2026-05-08 20:02:28.033', 1);
INSERT INTO `products` VALUES (47, 'NL-PGI-040', 'TEA', NULL, 1, 1, 2, 1, 0.0000, '', NULL, '2026-04-21 15:59:49.539', '2026-05-08 20:03:51.175', 1);
INSERT INTO `products` VALUES (68, 'BOTTLE-30G', 'Hũ nhựa 30g cao cấp', NULL, 1, 1, 7, NULL, 0.0000, NULL, NULL, '2026-05-05 13:31:15.534', '2026-05-05 13:31:15.534', NULL);
INSERT INTO `products` VALUES (69, 'BOX-MELASMA', 'Vỏ hộp giấy Melasma', NULL, 1, 1, 7, 7, 0.0000, '', NULL, '2026-05-05 13:31:15.550', '2026-05-17 10:07:50.169', 5);
INSERT INTO `products` VALUES (70, 'LABEL-M30', 'Tên nhãn chống giả Melasma', NULL, 1, 1, 7, NULL, 0.0000, NULL, NULL, '2026-05-05 13:31:15.565', '2026-05-05 13:31:15.565', NULL);
INSERT INTO `products` VALUES (72, 'PKG-KIT-30G', 'Bộ kit đóng gói Melasma 30g', NULL, 1, 1, 9, NULL, 0.0000, NULL, NULL, '2026-05-05 13:31:15.597', '2026-05-05 13:31:15.597', NULL);
INSERT INTO `products` VALUES (74, 'NVL-008', 'Vitamin E - test', NULL, 1, 1, 2, 2, 0.0000, '', NULL, '2026-05-20 14:21:10.490', '2026-05-20 14:21:10.490', NULL);

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
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products_outputs
-- ----------------------------
INSERT INTO `products_outputs` VALUES (1, 'TP-001', 'Kem MELAS 10g', 'finished', 'hủ', '', NULL, '2026-05-06 20:43:29.830', '2026-05-07 20:53:31.764');
INSERT INTO `products_outputs` VALUES (2, 'BTP-001', 'Kem MELAS 10g - Bán thành phẩm', 'semi_finished', 'gr', '', NULL, '2026-05-06 20:44:52.799', '2026-05-07 20:55:03.999');
INSERT INTO `products_outputs` VALUES (3, 'BTP-002', 'Vỏ hộp MESLAS - bán thành phầm', 'semi_finished', 'hộp', '', NULL, '2026-05-07 20:54:57.871', '2026-05-07 20:55:01.839');

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
) ENGINE = InnoDB AUTO_INCREMENT = 88 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `purchase_request_items` VALUES (81, 24, 47, NULL, 1000.0000, 1000.0000, 'kg', 1.0000, 500000.00, NULL, '2026-04-21 14:10:50.399', '2026-05-05 08:49:06.540');
INSERT INTO `purchase_request_items` VALUES (82, 25, 42, NULL, 2000.0000, 0.0000, 'Kilogram', 2.0000, 0.00, NULL, '2026-04-23 01:12:27.457', '2026-04-23 01:12:27.457');
INSERT INTO `purchase_request_items` VALUES (85, 26, 23, NULL, 300.0000, 300.0000, 'Ll', 0.3000, 0.00, NULL, '2026-04-23 01:30:24.125', '2026-04-23 01:33:50.888');
INSERT INTO `purchase_request_items` VALUES (86, 26, 13, NULL, 500.0000, 0.0000, 'L', 0.5000, 5000000.00, NULL, '2026-04-23 01:30:24.125', '2026-04-23 01:30:24.125');
INSERT INTO `purchase_request_items` VALUES (87, 27, 44, NULL, 1000.0000, 1000.0000, 'kg', 1.0000, 0.00, NULL, '2026-05-08 14:43:23.787', '2026-05-08 14:51:58.355');

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
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of purchase_requests
-- ----------------------------
INSERT INTO `purchase_requests` VALUES (8, NULL, 'PO-20260408-224113', 1, NULL, 3, 1, 'partially_received', '2026-04-12', 'NCC dự kiến: SUP-003 - AAA\nKho nhận hàng: LOC-002 - Kho Vĩnh Long', NULL, '2026-04-12 08:13:49.090', NULL, NULL, NULL, '2026-04-08 15:41:13.011', '2026-04-14 02:54:29.697');
INSERT INTO `purchase_requests` VALUES (9, NULL, 'PO-123', 1, NULL, 1, 3, 'draft', '2026-04-19', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-09 14:52:20.492', '2026-04-10 08:24:52.934');
INSERT INTO `purchase_requests` VALUES (11, NULL, 'PO-20260414-102152', 1, NULL, 2, NULL, 'received', '2026-04-16', NULL, NULL, '2026-04-14 03:21:59.493', NULL, NULL, '2026-04-15 13:53:32.165', '2026-04-14 03:21:59.304', '2026-04-15 13:53:32.203');
INSERT INTO `purchase_requests` VALUES (12, NULL, 'PO-20260415-184519', 1, NULL, 3, 1, 'partially_received', '2026-04-29', NULL, NULL, '2026-04-15 11:46:13.668', NULL, NULL, NULL, '2026-04-15 11:46:13.478', '2026-04-15 11:49:01.604');
INSERT INTO `purchase_requests` VALUES (13, NULL, 'PO-20260415-201654', 1, NULL, 3, 1, 'received', '2026-04-29', NULL, NULL, '2026-04-15 13:17:23.790', NULL, NULL, '2026-04-15 13:51:07.113', '2026-04-15 13:17:06.548', '2026-04-15 13:51:07.156');
INSERT INTO `purchase_requests` VALUES (14, NULL, 'PO-test-del', 1, NULL, 3, 1, 'received', '2026-04-29', NULL, NULL, '2026-04-15 14:01:21.062', NULL, NULL, '2026-04-15 14:02:26.303', '2026-04-15 14:01:20.907', '2026-04-15 14:02:26.340');
INSERT INTO `purchase_requests` VALUES (21, NULL, 'PO-20260418-082940', 1, NULL, 3, 1, 'received', '2026-04-17', NULL, NULL, '2026-04-18 01:30:12.038', NULL, NULL, '2026-04-18 01:31:21.895', '2026-04-18 01:30:11.873', '2026-04-18 01:31:21.938');
INSERT INTO `purchase_requests` VALUES (24, NULL, 'PO-20260421-test', 1, NULL, NULL, NULL, 'received', NULL, NULL, NULL, '2026-04-21 14:10:50.717', NULL, NULL, '2026-05-05 08:49:06.490', '2026-04-21 14:10:50.399', '2026-05-05 08:49:06.554');
INSERT INTO `purchase_requests` VALUES (25, 21, 'PO-20260423-081227455', 1, NULL, NULL, NULL, 'draft', NULL, 'Tự tạo từ lệnh xuất kho XK-20260423-080859 – thiếu 2 Kilogram', NULL, NULL, NULL, NULL, NULL, '2026-04-23 01:12:27.457', '2026-04-23 01:12:27.457');
INSERT INTO `purchase_requests` VALUES (26, NULL, 'PO-20260423-082910', 1, NULL, 24, 1, 'partially_received', '2026-04-23', NULL, NULL, '2026-04-23 01:30:24.592', NULL, NULL, NULL, '2026-04-23 01:30:20.246', '2026-04-23 01:33:50.899');
INSERT INTO `purchase_requests` VALUES (27, NULL, 'PO-20260508-214217', 2, NULL, 25, 1, 'received', '2026-05-15', NULL, NULL, '2026-05-08 14:43:24.014', NULL, NULL, '2026-05-08 14:51:58.302', '2026-05-08 14:43:23.787', '2026-05-08 14:51:58.367');

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
) ENGINE = InnoDB AUTO_INCREMENT = 29 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of suppliers
-- ----------------------------
INSERT INTO `suppliers` VALUES (1, 'RAW_MATERIAL', 'ChemSource Vietnam', '', '0900000001', 'HCM', 'Demo', NULL, '2026-03-30 14:30:07.321', '2026-04-06 15:29:08.269');
INSERT INTO `suppliers` VALUES (2, 'SUP-2', 'BASF', '', '', '', 'Demo', NULL, '2026-03-30 14:40:33.230', '2026-04-06 15:29:08.586');
INSERT INTO `suppliers` VALUES (3, 'SUP-003', 'AAA', '', '', '', '', NULL, '2026-03-31 11:40:59.480', '2026-04-06 15:46:43.023');
INSERT INTO `suppliers` VALUES (7, 'TRT', 'Cty Cổ Phần In Trường Tín', '', '', '', '', '2026-04-21 14:51:17.685', '2026-04-21 14:37:03.732', '2026-04-21 14:51:17.685');
INSERT INTO `suppliers` VALUES (8, 'KHN', 'Cty TNHH Bao Bì Khôi Nguyên', '', '', '', '', '2026-04-21 14:51:16.394', '2026-04-21 14:37:03.782', '2026-04-21 14:51:16.394');
INSERT INTO `suppliers` VALUES (9, 'CMC', 'Cty TNHH Chemico Việt Nam', '', '', '', '', '2026-04-21 14:51:15.449', '2026-04-21 14:37:03.796', '2026-04-21 14:51:15.449');
INSERT INTO `suppliers` VALUES (10, 'KNG', 'Cty TNHH Khang Ngọc', '', '', '', '', '2026-04-21 14:51:14.909', '2026-04-21 14:37:03.820', '2026-04-21 14:51:14.909');
INSERT INTO `suppliers` VALUES (11, 'MIF', 'Cty TNHH MiFa', '', '', '', '', '2026-04-21 14:51:14.510', '2026-04-21 14:37:03.842', '2026-04-21 14:51:14.510');
INSERT INTO `suppliers` VALUES (12, 'SMF', 'Cty TNHH MTV Vật Liệu Smallfortune', '', '', '', '', '2026-04-21 14:51:14.297', '2026-04-21 14:37:03.866', '2026-04-21 14:51:14.297');
INSERT INTO `suppliers` VALUES (13, '3HV', 'Cty TNHH Mỹ Hóa Mỹ Phẩm 3H Việt Nam', '', '', '', '', '2026-04-21 14:51:14.127', '2026-04-21 14:37:03.891', '2026-04-21 14:51:14.127');
INSERT INTO `suppliers` VALUES (14, 'NBA', 'Cty TNHH Sản xuất & Thương Mại Nguyễn Bá', '', '', '', '', '2026-04-21 14:51:13.826', '2026-04-21 14:37:03.913', '2026-04-21 14:51:13.826');
INSERT INTO `suppliers` VALUES (15, 'STA', 'Cty TNHH Song Tạo', '', '', '', '', '2026-04-21 14:51:13.656', '2026-04-21 14:37:03.937', '2026-04-21 14:51:13.656');
INSERT INTO `suppliers` VALUES (16, 'KTP', 'Cty TNHH Thiết Kế In Ấn Bao Bao Bì Khang Thịnh Phát', '', '', '', '', '2026-04-21 14:51:13.108', '2026-04-21 14:37:03.962', '2026-04-21 14:51:13.108');
INSERT INTO `suppliers` VALUES (17, 'HVU', 'Cty TNHH Thương Mại và Sản Xuất Hoàn Vũ', '', '', '', '', '2026-04-21 14:51:12.316', '2026-04-21 14:37:03.987', '2026-04-21 14:51:12.316');
INSERT INTO `suppliers` VALUES (18, 'MIFA', 'Cty TNHH MiFa', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.538', '2026-04-21 15:04:54.538');
INSERT INTO `suppliers` VALUES (19, 'TMVS', 'Cty TNHH Thương Mại và Sản Xuất Hoàn Vũ', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.552', '2026-04-21 15:04:54.552');
INSERT INTO `suppliers` VALUES (20, 'KN', 'Cty TNHH Khang Ngọc', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.564', '2026-04-21 15:04:54.564');
INSERT INTO `suppliers` VALUES (21, 'MHMP', 'Cty TNHH Mỹ Hóa Mỹ Phẩm 3H Việt Nam', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.578', '2026-04-21 15:04:54.578');
INSERT INTO `suppliers` VALUES (22, 'SXVT', 'Cty TNHH Sản xuất và Thương mại Nguyễn Bá', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.594', '2026-04-21 15:04:54.594');
INSERT INTO `suppliers` VALUES (23, 'MPD', 'Cty CP Mỹ Phẩm Dermatrix', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.610', '2026-04-21 15:04:54.610');
INSERT INTO `suppliers` VALUES (24, 'CVN', 'Cty TNHH Chemico Việt Nam', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.625', '2026-04-21 15:04:54.625');
INSERT INTO `suppliers` VALUES (25, 'SXTM', 'Cty TNHH Sản xuất & Thương Mại Nguyễn Bá', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.643', '2026-04-21 15:04:54.643');
INSERT INTO `suppliers` VALUES (26, 'MVLS', 'Cty TNHH MTV Vật Liệu Smallfortune', NULL, NULL, NULL, '', NULL, '2026-04-21 15:04:54.656', '2026-04-21 16:25:20.133');

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
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_order_history
-- ----------------------------
INSERT INTO `tp_export_order_history` VALUES (1, 1, 'created', 'Tạo lệnh xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260517-175852\", \"itemCount\": 1}', '2026-05-17 10:59:43.157');
INSERT INTO `tp_export_order_history` VALUES (2, 1, 'cancelled', 'Hủy lệnh xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260517-175852\"}', '2026-05-20 03:02:41.043');
INSERT INTO `tp_export_order_history` VALUES (3, 2, 'created', 'Tạo lệnh xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260520-100246\", \"itemCount\": 1}', '2026-05-20 03:03:00.051');
INSERT INTO `tp_export_order_history` VALUES (4, 2, 'fulfilled', 'Đánh dấu hoàn thành xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260520-100246\"}', '2026-05-20 03:22:31.982');
INSERT INTO `tp_export_order_history` VALUES (5, 3, 'created', 'Tạo lệnh xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260520-103439\", \"itemCount\": 1}', '2026-05-20 03:34:50.965');
INSERT INTO `tp_export_order_history` VALUES (6, 3, 'fulfilled', 'Đánh dấu hoàn thành xuất thành phẩm', 2, '{\"orderRef\": \"XKTP-20260520-103439\"}', '2026-05-20 03:34:51.018');

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
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_order_items
-- ----------------------------
INSERT INTO `tp_export_order_items` VALUES (1, 1, 1, NULL, NULL, NULL, 2389.0000, 'hủ', 2389.0000, '2026-05-17 10:59:43.093', '2026-05-17 10:59:43.093');
INSERT INTO `tp_export_order_items` VALUES (2, 2, 1, 'sdfsf', '2026-05-20', NULL, 50.0000, 'hủ', 50.0000, '2026-05-20 03:03:00.042', '2026-05-20 03:03:00.042');
INSERT INTO `tp_export_order_items` VALUES (3, 3, 1, 'LOT-TP-ABC2026', '2026-05-31', NULL, 499.0000, 'hủ', 499.0000, '2026-05-20 03:34:50.951', '2026-05-20 03:34:50.951');

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
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tp_export_orders
-- ----------------------------
INSERT INTO `tp_export_orders` VALUES (1, 'XKTP-20260517-175852', 8, 9, NULL, NULL, '2026-05-17 10:58:52.066', 'cancelled', NULL, NULL, 2, '2026-05-17 10:59:43.093', '2026-05-20 03:02:41.035');
INSERT INTO `tp_export_orders` VALUES (2, 'XKTP-20260520-100246', 7, NULL, NULL, NULL, '2026-05-20 03:02:46.061', 'fulfilled', NULL, NULL, 2, '2026-05-20 03:03:00.042', '2026-05-20 03:22:31.973');
INSERT INTO `tp_export_orders` VALUES (3, 'XKTP-20260520-103439', 2, NULL, NULL, NULL, '2026-05-20 03:34:39.686', 'fulfilled', NULL, NULL, 2, '2026-05-20 03:34:50.951', '2026-05-20 03:34:51.014');

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
INSERT INTO `users` VALUES (2, 'admin@zencos.vn', '$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu', 'Administrator', 'admin', 1, '2026-05-05 09:28:51.700', '2026-05-05 09:28:51.700', NULL);
INSERT INTO `users` VALUES (4, 'muahang@zencos.vn', '$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu', 'Nguyen Van Mua Hang', 'warehouse_manager', 1, '2026-05-05 12:51:45.729', '2026-05-05 12:53:36.856', NULL);

SET FOREIGN_KEY_CHECKS = 1;
