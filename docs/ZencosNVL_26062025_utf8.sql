-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: ZencosNVL
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `batch_documents`
--

DROP TABLE IF EXISTS `batch_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` bigint unsigned NOT NULL,
  `doc_type` enum('Invoice','COA','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `batch_documents_batch_id_fkey` (`batch_id`) USING BTREE,
  KEY `batch_documents_uploaded_by_fkey` (`uploaded_by`) USING BTREE,
  CONSTRAINT `batch_documents_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `batch_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_documents`
--

LOCK TABLES `batch_documents` WRITE;
/*!40000 ALTER TABLE `batch_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `inbound_receipt_item_id` bigint unsigned DEFAULT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer_lot_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `unit_price_per_kg` decimal(15,2) NOT NULL DEFAULT '0.00',
  `received_qty_base` decimal(15,4) NOT NULL,
  `current_qty_base` decimal(15,4) NOT NULL DEFAULT '0.0000' COMMENT 'Running balance per batch. Initialized from received_qty_base + existing transactions. Updated atomically with inventory_transactions via prisma.$transaction.',
  `purchase_unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_qty` decimal(15,4) DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('available','quarantine','rejected','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `manufacturer_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `batches_product_id_status_expiry_date_idx` (`product_id`,`status`,`expiry_date`) USING BTREE,
  KEY `batches_supplier_id_fkey` (`supplier_id`) USING BTREE,
  KEY `batches_inbound_receipt_item_id_idx` (`inbound_receipt_item_id`) USING BTREE,
  KEY `batches_manufacturer_id_fkey` (`manufacturer_id`) USING BTREE,
  KEY `batches_manufacturer_lot_no_idx` (`manufacturer_lot_no`),
  CONSTRAINT `batches_inbound_receipt_item_id_fkey` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batches_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=174 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batches`
--

LOCK TABLES `batches` WRITE;
/*!40000 ALTER TABLE `batches` DISABLE KEYS */;
INSERT INTO `batches` VALUES (103,3618,138,NULL,'C815O7R31','C815O7R31','HĐ_8164','2025-11-24',46296.00,1178.0000,1178.0000,'Kg',1178.0000,'2024-07-14','2026-07-14','available','Auto-posted from opening_stock_item #97',NULL,'2026-06-12 08:27:57.532','2026-06-12 08:27:57.539',NULL),(104,3618,132,NULL,'GX250204L1','GX250204L1','HĐ_1361','2026-03-06',34100.00,202000.0000,202000.0000,'Kg',202000.0000,'2024-11-24','2026-11-24','available','Auto-posted from opening_stock_item #98',NULL,'2026-06-12 08:28:05.778','2026-06-12 08:28:05.783',NULL),(105,3774,133,NULL,'C815PBJR41','C815PBJR41','HĐ_4066','2026-04-08',115000.00,70000.0000,70000.0000,'Kg',70000.0000,'2025-11-19','2027-11-19','available','Auto-posted from opening_stock_item #99',NULL,'2026-06-12 08:28:06.542','2026-06-12 08:28:06.547',NULL),(106,3700,126,NULL,'014125IND3C5L','014125IND3C5L','HĐ_11','2026-01-21',33000.00,87391.0000,87391.0000,'Kg',87391.0000,'2025-09-26','2027-03-26','available','Auto-posted from opening_stock_item #100',NULL,'2026-06-12 08:28:11.658','2026-06-12 08:28:11.666',NULL),(107,3740,132,NULL,'TEST REPORT','TEST REPORT','HĐ_1361','2026-03-06',34000.00,117000.0000,117000.0000,'Kg',117000.0000,'2024-12-23','2026-12-22','available','Auto-posted from opening_stock_item #101',NULL,'2026-06-12 08:28:13.396','2026-06-12 08:28:13.402',NULL),(108,3769,133,NULL,'014125IND3C5L','014125IND3C5L','HĐ_3548','2026-03-27',65000.00,60000.0000,60000.0000,'Kg',60000.0000,'2025-09-26','2027-03-26','available','Auto-posted from opening_stock_item #102',NULL,'2026-06-12 08:28:16.427','2026-06-12 08:28:16.432',NULL),(109,3769,133,NULL,'014125IND3C5L-001','014125IND3C5L','HĐ_4125','2026-04-13',65000.00,20000.0000,20000.0000,'Kg',20000.0000,'2025-09-26','2027-03-26','available','Auto-posted from opening_stock_item #103',NULL,'2026-06-12 08:28:17.591','2026-06-12 08:28:17.596',NULL),(110,3725,129,NULL,'38322009T0','38322009T0','HĐ_638','2026-02-03',310000.00,11.0000,11.0000,'Kg',11.0000,'2025-07-05','2027-01-01','available','Auto-posted from opening_stock_item #104',NULL,'2026-06-12 08:28:18.713','2026-06-12 08:28:18.718',NULL),(111,3698,126,NULL,'25LOT01156','25LOT01156','HĐ_11','2026-01-21',260000.00,4712.0000,4712.0000,'Kg',4712.0000,'2000-02-25','2000-03-01','available','Auto-posted from opening_stock_item #105',NULL,'2026-06-12 08:28:19.277','2026-06-12 08:28:19.282',NULL),(112,3751,132,NULL,'20241227','20241227','HĐ_1390','2026-03-09',135185.00,41000.0000,41000.0000,'Kg',41000.0000,'2024-12-27','2027-12-26','available','Auto-posted from opening_stock_item #106',NULL,'2026-06-12 08:28:22.785','2026-06-12 08:28:22.790',NULL),(113,3768,133,NULL,'25LOT01156','25LOT01156','HĐ_3548','2026-03-27',365000.00,5000.0000,5000.0000,'Kg',5000.0000,'2025-02-01','2030-02-01','available','Auto-posted from opening_stock_item #107',NULL,'2026-06-12 08:28:23.781','2026-06-15 08:39:40.906',NULL),(114,3682,144,NULL,'PA2407019','PA2407019','HĐ_35','2025-12-31',766500.00,973.0000,973.0000,'Kg',973.0000,'2025-02-01','2030-02-01','available','Auto-posted from opening_stock_item #108',NULL,'2026-06-12 08:28:24.353','2026-06-15 08:42:21.376',NULL),(115,3747,132,NULL,'TL02409085','TL02409085','HĐ_1361','2026-03-06',430556.00,31300.0000,31300.0000,'Kg',31300.0000,'2024-09-19','2027-09-19','available','Auto-posted from opening_stock_item #109',NULL,'2026-06-12 08:28:25.458','2026-06-12 08:28:25.463',NULL),(116,3766,133,NULL,'PA2407019','PA2407019','HĐ_3306','2026-03-23',703704.00,10000.0000,10000.0000,'Kg',10000.0000,'2025-02-01','2030-02-01','available','Auto-posted from opening_stock_item #110',NULL,'2026-06-12 08:28:26.085','2026-06-15 08:47:17.168',NULL),(117,3766,133,NULL,'PA2407019-001','PA2407019','HĐ_3548','2026-03-27',722222.00,10000.0000,10000.0000,'Kg',10000.0000,'2025-02-01','2030-02-01','available','Auto-posted from opening_stock_item #111',NULL,'2026-06-12 08:28:26.832','2026-06-15 08:47:46.785',NULL),(118,3750,129,NULL,'EI2501','EI2501','HĐ_997','2026-03-06',2450000.00,200.0000,200.0000,'Kg',200.0000,'2025-09-25','2027-09-24','available','Auto-posted from opening_stock_item #112',NULL,'2026-06-12 08:28:27.495','2026-06-12 08:28:27.500',NULL),(119,3750,129,NULL,'EI2501-001','EI2501','HĐ_1760','2026-04-10',2450000.00,200.0000,200.0000,'Kg',200.0000,'2025-09-25','2027-09-24','available','Auto-posted from opening_stock_item #113',NULL,'2026-06-12 08:28:28.489','2026-06-12 08:28:28.495',NULL),(120,3690,113,NULL,'25091685-001','25091685','HĐ_1287','2026-04-10',3000000.00,300.0000,300.0000,'Kg',300.0000,'2025-09-16','2027-09-15','available','Auto-posted from opening_stock_item #114',NULL,'2026-06-12 08:28:28.830','2026-06-12 08:28:28.834',NULL),(121,3604,133,NULL,'B2E04349','B2E04349','HĐ_9911','2025-10-07',351852.00,2000.0000,2000.0000,'Kg',2000.0000,'2025-01-14','2027-01-31','available','Auto-posted from opening_stock_item #115',NULL,'2026-06-12 08:28:29.423','2026-06-12 08:28:29.428',NULL),(122,3604,133,NULL,'B2F04120-001','B2F04120','HĐ_12118','2025-11-24',333333.00,20000.0000,20000.0000,'Kg',20000.0000,'2025-05-05','2027-05-31','available','Auto-posted from opening_stock_item #116',NULL,'2026-06-12 08:28:29.850','2026-06-12 08:28:29.855',NULL),(123,3687,144,NULL,'B2F04120','B2F04120','HĐ_35','2025-12-31',302400.00,8300.0000,8300.0000,'Kg',8300.0000,'2025-05-05','2027-05-31','available','Auto-posted from opening_stock_item #117',NULL,'2026-06-12 08:28:31.020','2026-06-12 08:28:31.025',NULL),(124,3604,133,NULL,'B2F04120','B2F04120','HĐ_3548','2026-03-27',410000.00,10000.0000,10000.0000,'Kg',10000.0000,'2025-05-05','2027-05-31','available','Auto-posted from opening_stock_item #118',NULL,'2026-06-12 08:28:32.447','2026-06-12 08:28:32.451',NULL),(125,3746,132,NULL,'32666436W0','32666436W0','HĐ_1361','2026-03-06',584259.00,31873.0000,31873.0000,'Kg',31873.0000,'2024-02-06','2027-02-05','available','Auto-posted from opening_stock_item #119',NULL,'2026-06-12 08:28:33.367','2026-06-12 08:28:33.373',NULL),(126,3696,126,NULL,'UT25100294','UT25100294','HĐ_24','2026-03-10',800000.00,20000.0000,20000.0000,'Kg',20000.0000,'2025-09-28','2029-09-27','available','Auto-posted from opening_stock_item #120',NULL,'2026-06-12 08:28:34.962','2026-06-12 08:28:34.968',NULL),(127,3696,126,NULL,'UT24110283','UT24110283','HĐ_11','2026-01-21',820000.00,97.0000,97.0000,'Kg',97.0000,'2024-10-27','2028-10-26','available','Auto-posted from opening_stock_item #121',NULL,'2026-06-12 08:28:37.440','2026-06-12 08:28:37.446',NULL),(128,3620,118,NULL,'AT117926','AT117926','HĐ_2911','2025-11-24',10296390.00,6000.0000,6000.0000,'Kg',6000.0000,'2025-11-07','2027-05-07','available','Auto-posted from opening_stock_item #122',NULL,'2026-06-12 08:28:40.117','2026-06-15 03:54:04.643',NULL),(129,3620,118,NULL,'AT115815','AT115815','HĐ_3120','2025-12-16',10427210.00,2000.0000,2000.0000,'Kg',2000.0000,'2025-07-23','2027-07-23','available','Auto-posted from opening_stock_item #123',NULL,'2026-06-12 08:28:41.588','2026-06-12 08:28:41.594',NULL),(130,3620,118,NULL,'AT118027','AT118027','HĐ_775','2026-03-27',10410225.00,7000.0000,7000.0000,'Kg',7000.0000,'2025-11-11','2027-05-11','available','Auto-posted from opening_stock_item #124',NULL,'2026-06-12 08:28:42.556','2026-06-12 08:28:42.560',NULL),(131,3606,118,NULL,'CZ5I165-2703','CZ5I165-2703','HĐ_2557','2025-10-16',250506.00,36607.0000,36607.0000,'Kg',36607.0000,'2025-09-13','2027-03-13','available','Auto-posted from opening_stock_item #125',NULL,'2026-06-12 08:28:43.118','2026-06-12 08:28:43.122',NULL),(132,3739,132,NULL,'IP13130','IP13130','HĐ_1361','2026-03-06',257000.00,12000.0000,12000.0000,'Kg',12000.0000,'2024-07-20','2026-07-20','available','Auto-posted from opening_stock_item #126',NULL,'2026-06-12 08:28:45.015','2026-06-12 08:28:45.022',NULL),(133,3782,136,NULL,'2603071025','2603071025','HĐ_4164','2026-04-13',527777.77,25000.0000,25000.0000,'Kg',25000.0000,'2026-03-07','2027-09-07','available','Auto-posted from opening_stock_item #127',NULL,'2026-06-12 08:28:45.785','2026-06-12 08:28:45.790',NULL),(134,3733,133,NULL,'20250206','20250206','HĐ_3548','2026-03-27',800000.00,2000.0000,2000.0000,'Kg',2000.0000,'2025-02-06','2027-02-05','available','Auto-posted from opening_stock_item #128',NULL,'2026-06-12 08:28:46.737','2026-06-12 10:19:51.817',NULL),(135,3618,132,NULL,'GX250204L1-001','GX250204L1','HĐ_1361','2026-03-06',34100.00,202000.0000,202000.0000,'Kg',202000.0000,'2024-11-24','2026-11-24','available','Auto-posted from opening_stock_item #129',NULL,'2026-06-12 08:30:48.124','2026-06-24 12:58:45.728',NULL),(136,3617,133,NULL,'2502009','2502009','HĐ_12118','2025-11-24',180555.56,4000.0000,4000.0000,'Kg',4000.0000,'2025-02-07','2028-02-06','available','Auto-posted from opening_stock_item #130',NULL,'2026-06-12 08:30:49.541','2026-06-12 10:13:17.686',NULL),(137,3617,133,NULL,'2502009-001','2502009','HĐ_3548','2026-03-27',165000.00,4000.0000,4000.0000,'Kg',4000.0000,'2025-02-07','2028-02-06','available','Auto-posted from opening_stock_item #131',NULL,'2026-06-12 08:30:54.508','2026-06-12 10:13:12.947',NULL),(138,3733,133,NULL,'20250228','20250228','HĐ_1829','2026-02-09',800000.00,1000.0000,0.0000,'Kg',1000.0000,'2025-02-28','2027-02-27','available','Auto-posted from opening_stock_item #132',NULL,'2026-06-15 03:55:42.684','2026-06-15 04:00:35.655',NULL),(139,3690,113,NULL,'25091685','25091685','HĐ_723','2026-03-06',3000000.00,177.0000,177.0000,'Kg',177.0000,'2025-09-16','2027-09-15','available','Auto-posted from opening_stock_item #133',NULL,'2026-06-15 04:02:26.941','2026-06-15 04:02:26.948',NULL),(140,3690,113,NULL,'25091685-002','25091685','HĐ_1777','2026-05-14',3000000.00,300.0000,300.0000,'Kg',300.0000,'2025-09-16','2027-09-15','available','Auto-posted from opening_stock_item #134',NULL,'2026-06-15 04:02:28.556','2026-06-15 04:02:28.561',NULL),(141,3733,133,NULL,'20250228','20250228','HĐ_1829','2026-02-09',800000.00,1000.0000,1000.0000,'Kg',1000.0000,'2025-02-28','2027-02-27','available','Auto-posted from opening_stock_item #135',NULL,'2026-06-15 04:02:29.590','2026-06-15 04:02:29.595',NULL),(142,3733,133,NULL,'20250228-001','20250228','HĐ_3306','2026-03-23',800000.00,1000.0000,1000.0000,'Kg',1000.0000,'2025-02-28','2027-02-27','available','Auto-posted from opening_stock_item #136',NULL,'2026-06-15 04:02:31.920','2026-06-15 04:02:31.924',NULL),(143,3767,133,NULL,'UT25100294','UT25100294','HĐ_3306','2026-03-23',861111.11,5000.0000,5000.0000,'Kg',5000.0000,'2025-09-28','2029-09-27','available','Auto-posted from opening_stock_item #137',NULL,'2026-06-15 04:09:34.295','2026-06-15 04:09:34.303',NULL),(144,3767,133,NULL,'UT25100294-001','UT25100294','HĐ_3548','2026-03-27',861111.11,10000.0000,10000.0000,'Kg',10000.0000,'2025-09-28','2029-09-27','available','Auto-posted from opening_stock_item #138',NULL,'2026-06-15 04:09:37.983','2026-06-15 04:09:37.988',NULL),(146,3725,129,51,'LOT-NL-PGI-028-260405',NULL,'2242','2026-05-07',110000.00,5000.0000,0.0000,'Kg',5.0000,'2025-07-05','2027-01-01','rejected','Auto-posted từ phiếu nhập NK-20260616-2090',NULL,'2026-06-16 07:34:12.316','2026-06-16 08:43:32.631',NULL),(147,3818,133,54,'LOT-NL-LSA-091-2-260512',NULL,'5361','2026-05-12',105000.00,12000.0000,0.0000,'Kg',12.0000,'2025-10-01','2027-10-01','rejected','Auto-posted từ phiếu nhập NK-20260616-2877',NULL,'2026-06-16 07:52:12.443','2026-06-16 08:40:46.484',NULL),(148,3781,133,55,'LOT-NL-TDA-080-260512',NULL,'5361','2026-05-12',125000.00,11000.0000,0.0000,'Kg',11.0000,'2025-10-14','2027-10-13','rejected','Auto-posted từ phiếu nhập NK-20260616-3606',NULL,'2026-06-16 08:22:21.289','2026-06-16 08:38:15.721',NULL),(149,3814,208,47,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04',4965000.00,600.0000,0.0000,'Kg',600.0000,'2024-08-30','2026-08-29','rejected','Auto-posted từ phiếu nhập NK-20260616-0196',NULL,'2026-06-16 08:24:41.847','2026-06-16 08:33:37.268',NULL),(150,3814,208,57,'4082030',NULL,'3','2026-05-04',4965000.00,600.0000,0.0000,'Kg',0.6000,'2024-08-30','2026-08-29','rejected','Auto-posted từ phiếu nhập NK-20260616-0196-ADJ',NULL,'2026-06-16 08:33:37.278','2026-06-18 07:00:05.133',NULL),(151,3781,133,58,'20251014',NULL,'5361','2026-05-12',125000.00,11000.0000,0.0000,'Kg',11.0000,'2025-10-14','2027-10-13','rejected','Auto-posted từ phiếu nhập NK-20260616-3606-ADJ',NULL,'2026-06-16 08:38:15.739','2026-06-24 04:14:04.485',NULL),(152,3818,133,59,'N010272025',NULL,'5361','2026-05-12',105000.00,12000.0000,12000.0000,'Kg',12.0000,'2025-10-01','2027-10-01','available','Auto-posted từ phiếu nhập NK-20260616-2877-ADJ',NULL,'2026-06-16 08:40:46.495','2026-06-16 08:40:46.501',NULL),(153,3725,129,60,'38322009T0',NULL,'2242','2026-05-07',110000.00,5000.0000,0.0000,'Kg',5.0000,'2025-07-05','2027-01-01','rejected','Auto-posted từ phiếu nhập NK-20260616-2090-ADJ',NULL,'2026-06-16 08:43:32.648','2026-06-18 06:55:06.987',NULL),(154,3675,133,62,'2561376',NULL,'5361','2026-05-12',560000.00,500.0000,0.0000,'Kg',0.5000,'2025-03-22','2028-03-22','rejected','Auto-posted từ phiếu nhập NK-20260616-8008',NULL,'2026-06-16 09:17:22.725','2026-06-18 06:51:45.669',NULL),(155,3789,146,52,'LOT-BB-HOP-016-260417',NULL,'597','2026-05-11',1410.00,20000.0000,20000.0000,'Cái',20000.0000,NULL,NULL,'available','Auto-posted từ phiếu nhập NK-20260616-2464',NULL,'2026-06-16 09:20:52.601','2026-06-16 09:20:52.608',NULL),(156,3675,133,63,'LOT-NL-TDA-074-260512',NULL,'5361','2026-05-12',0.00,500.0000,0.0000,'Kg',0.5000,'2025-03-22','2028-03-22','rejected','Auto-posted từ phiếu nhập NK-20260616-8008-ADJ',NULL,'2026-06-18 06:51:45.708','2026-06-24 04:20:05.857',NULL),(157,3725,129,64,'LOT-NL-PGI-028-260405',NULL,'2242','2026-05-07',110000.00,5000.0000,5000.0000,'Kg',5.0000,'2025-07-05','2027-01-01','available','Auto-posted từ phiếu nhập NK-20260616-2090-ADJ-ADJ',NULL,'2026-06-18 06:55:07.005','2026-06-18 06:55:07.011',NULL),(158,3790,146,53,'LOT-BB-HOP-017-260413',NULL,'597','2026-05-11',2140.00,10000.0000,10000.0000,'Hộp',10000.0000,NULL,NULL,'available','Auto-posted từ phiếu nhập NK-20260616-2692',NULL,'2026-06-18 06:58:28.093','2026-06-18 06:58:28.100',NULL),(159,3814,208,65,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04',0.00,600.0000,0.0000,'Kg',0.6000,'2024-08-30','2026-08-29','rejected','Auto-posted từ phiếu nhập NK-20260616-0196-ADJ-ADJ',NULL,'2026-06-18 07:00:05.153','2026-06-18 07:03:01.038',NULL),(160,3814,208,66,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04',4965000.00,600.0000,600.0000,'Kg',0.6000,'2024-08-30','2026-08-29','available','Auto-posted từ phiếu nhập NK-20260616-0196-ADJ-ADJ-ADJ',NULL,'2026-06-18 07:03:01.050','2026-06-18 07:03:01.055',NULL),(161,3817,208,50,'LOT-BB-HOP-040-260504',NULL,'3','2026-05-04',4800.00,2500.0000,2500.0000,'Hộp',2500.0000,NULL,NULL,'available','Auto-posted từ phiếu nhập NK-20260616-2011',NULL,'2026-06-18 07:14:09.924','2026-06-18 07:14:09.933',NULL),(162,3816,208,49,'LOT-BB-TUYP-30ML-039-260504',NULL,'3','2026-05-04',4800.00,2500.0000,2500.0000,'tube',2500.0000,NULL,NULL,'available','Auto-posted từ phiếu nhập NK-20260616-1246',NULL,'2026-06-24 03:36:34.826','2026-06-24 03:36:34.835',NULL),(163,3807,208,69,'LOT-NL-NHO-137-1-260504',NULL,'3','2026-05-04',1800000.00,2200.0000,2200.0000,'Kg',2.2000,'2025-02-11','2027-02-01','available','Auto-posted từ phiếu nhập NK-20260624-9530',NULL,'2026-06-24 04:01:52.977','2026-06-24 04:01:52.984',NULL),(164,3818,133,68,'LOT-NL-LSA-091-2-260507',NULL,'5361','2026-05-12',105000.00,12000000.0000,12000000.0000,'Kg',12000.0000,'2025-10-01','2027-10-01','available','Auto-posted từ phiếu nhập NK-20260617-7002',NULL,'2026-06-24 04:10:08.185','2026-06-24 04:10:08.194',NULL),(165,3781,133,70,'LOT-NL-TDA-080-260512',NULL,'5361','2026-05-12',125000.00,11000000.0000,0.0000,'Kg',11000.0000,'2025-10-14','2027-10-13','rejected','Auto-posted từ phiếu nhập NK-20260616-3606-ADJ-ADJ',NULL,'2026-06-24 04:14:04.499','2026-06-24 04:15:13.336',NULL),(166,3781,133,71,'LOT-NL-TDA-080-260512',NULL,'5361','2026-05-12',125000.00,11000.0000,11000.0000,'Kg',11.0000,'2025-10-14','2027-10-13','available','Auto-posted từ phiếu nhập NK-20260616-3606-ADJ-ADJ-ADJ',NULL,'2026-06-24 04:15:13.348','2026-06-24 04:15:13.353',NULL),(167,3733,133,72,'LOT-NL-THU-039-260507',NULL,'5361','2026-05-12',800000.00,1000.0000,1000.0000,'Kg',1.0000,'2025-02-28','2027-02-27','available','Auto-posted từ phiếu nhập NK-20260624-0551',NULL,'2026-06-24 04:18:38.692','2026-06-24 04:18:38.702',NULL),(168,3675,133,73,'LOT-NL-TDA-074-260512',NULL,'5361','2026-05-12',560000.00,500.0000,500.0000,'Kg',0.5000,'2025-03-22','2028-03-22','available','Auto-posted từ phiếu nhập NK-20260616-8008-ADJ-ADJ',NULL,'2026-06-24 04:20:05.871','2026-06-24 04:20:05.878',NULL),(169,3819,133,74,'LOT-NL-PGI-060-260507',NULL,'5362','2026-05-12',10000.00,5000.0000,5000.0000,'Kg',5.0000,'2025-11-18','2028-11-18','available','Auto-posted từ phiếu nhập NK-20260624-0821',NULL,'2026-06-24 04:26:51.642','2026-06-24 04:26:51.650',NULL),(170,3820,113,76,'LOT-NL-PGI-052-260403',NULL,'1739','2026-05-12',120000.00,5000.0000,5000.0000,'Kg',5.0000,'2026-03-09','2028-03-09','available','Auto-posted từ phiếu nhập NK-20260624-2532',NULL,'2026-06-24 05:03:03.442','2026-06-24 05:03:03.449',NULL),(171,3690,113,77,'LOT-NL-CXU-037-260511',NULL,'1777','2026-05-14',3000000.00,300.0000,300.0000,'Kg',0.3000,'2025-09-16','2027-09-15','available','Auto-posted từ phiếu nhập NK-20260624-3452',NULL,'2026-06-24 05:07:12.281','2026-06-24 05:07:12.288',NULL),(172,3693,129,78,'LOT-NL-HCH-026-260518',NULL,'2408','2026-05-14',1730000.00,1500.0000,1500.0000,'Kg',1.5000,'2025-11-10','2027-11-09','available','Auto-posted từ phiếu nhập NK-20260624-3682',NULL,'2026-06-24 05:40:12.513','2026-06-24 05:40:12.520',NULL),(173,3815,208,79,'LOT-NL-DBO-210-260503',NULL,'3','2026-05-04',9540000.00,200.0000,200.0000,'Kg',0.2000,'2025-02-06','2027-02-04','available','Auto-posted từ phiếu nhập NK-20260624-6911',NULL,'2026-06-24 06:07:19.739','2026-06-24 06:07:19.746',NULL);
/*!40000 ALTER TABLE `batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `customers_code_key` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (29,'KH_001','CÔNG TY TNHH PERFECT PRO','','','','',NULL,'2026-06-12 14:02:33.777','2026-06-18 14:24:38.867'),(30,'KH_002','CÔNG TY TNHH CL GROOMING','','','','',NULL,'2026-06-12 14:02:33.823','2026-06-12 14:02:33.823'),(31,'KH_003','CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ MILANCOS','','','','',NULL,'2026-06-12 14:02:33.889','2026-06-12 14:02:33.889'),(32,'KH_004','CÔNG TY TNHH WINKOREA VIỆT NAM','','','','',NULL,'2026-06-12 14:02:33.993','2026-06-12 14:02:33.993');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `export_order_history`
--

DROP TABLE IF EXISTS `export_order_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_order_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint unsigned NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `data` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `export_order_history_export_order_id_idx` (`export_order_id`) USING BTREE,
  KEY `export_order_history_created_at_idx` (`created_at`) USING BTREE,
  KEY `export_order_history_actor_id_fkey` (`actor_id`) USING BTREE,
  CONSTRAINT `export_order_history_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_order_history_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `export_order_history`
--

LOCK TABLES `export_order_history` WRITE;
/*!40000 ALTER TABLE `export_order_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_order_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `export_order_items`
--

DROP TABLE IF EXISTS `export_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint unsigned NOT NULL,
  `batch_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15,4) NOT NULL,
  `unit_price_snapshot` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `export_order_items_export_order_id_fkey` (`export_order_id`) USING BTREE,
  KEY `export_order_items_batch_id_fkey` (`batch_id`) USING BTREE,
  KEY `export_order_items_product_id_fkey` (`product_id`) USING BTREE,
  CONSTRAINT `export_order_items_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_order_items_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `export_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `export_order_items`
--

LOCK TABLES `export_order_items` WRITE;
/*!40000 ALTER TABLE `export_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `export_orders`
--

DROP TABLE IF EXISTS `export_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `source_order_id` bigint unsigned DEFAULT NULL,
  `adjusted_by_order_id` bigint unsigned DEFAULT NULL,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exported_at` datetime(3) DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `source_location_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `export_orders_source_order_id_key` (`source_order_id`) USING BTREE,
  UNIQUE KEY `export_orders_adjusted_by_order_id_key` (`adjusted_by_order_id`) USING BTREE,
  KEY `export_orders_customer_id_fkey` (`customer_id`) USING BTREE,
  KEY `export_orders_created_by_fkey` (`created_by`) USING BTREE,
  KEY `export_orders_source_order_id_idx` (`source_order_id`) USING BTREE,
  KEY `export_orders_adjusted_by_order_id_idx` (`adjusted_by_order_id`) USING BTREE,
  KEY `export_orders_source_location_id_idx` (`source_location_id`) USING BTREE,
  CONSTRAINT `export_orders_adjusted_by_order_id_fkey` FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `export_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_source_location_id_fkey` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_orders_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `export_orders`
--

LOCK TABLES `export_orders` WRITE;
/*!40000 ALTER TABLE `export_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inbound_receipt_history`
--

DROP TABLE IF EXISTS `inbound_receipt_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inbound_receipt_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` bigint unsigned NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `data` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `inbound_receipt_history_inbound_receipt_id_idx` (`inbound_receipt_id`) USING BTREE,
  KEY `inbound_receipt_history_created_at_idx` (`created_at`) USING BTREE,
  KEY `inbound_receipt_history_actor_id_fkey` (`actor_id`) USING BTREE,
  CONSTRAINT `inbound_receipt_history_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_history_inbound_receipt_id_fkey` FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=349 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inbound_receipt_history`
--

LOCK TABLES `inbound_receipt_history` WRITE;
/*!40000 ALTER TABLE `inbound_receipt_history` DISABLE KEYS */;
INSERT INTO `inbound_receipt_history` VALUES (181,57,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-0196\"}','2026-06-16 06:57:23.173'),(182,57,'updated','Cập nhật phiếu nháp (Bước 3)',5,'{\"step\": 3, \"hasItemPayload\": true}','2026-06-16 07:03:35.178'),(185,59,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-1246\"}','2026-06-16 07:14:26.162'),(186,59,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-16 07:26:32.337'),(187,60,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-2011\"}','2026-06-16 07:27:06.852'),(188,60,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-16 07:27:31.089'),(189,61,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-2090\"}','2026-06-16 07:28:48.503'),(190,61,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 07:33:51.105'),(191,61,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T07:34:12.141Z\", \"itemCount\": 1}','2026-06-16 07:34:12.152'),(192,61,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T07:34:12.313Z\", \"itemCount\": 1}','2026-06-16 07:34:12.370'),(193,62,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-2464\"}','2026-06-16 07:36:50.530'),(194,62,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-16 07:37:57.891'),(195,63,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-2692\"}','2026-06-16 07:38:19.992'),(196,63,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-16 07:38:51.043'),(197,63,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": false}','2026-06-16 07:40:05.712'),(198,63,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": false}','2026-06-16 07:40:22.108'),(199,63,'updated','Cập nhật phiếu nháp (Bước 2)',5,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-16 07:40:37.594'),(200,64,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-2877\"}','2026-06-16 07:41:30.332'),(201,64,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 07:52:01.095'),(202,64,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T07:52:12.386Z\", \"itemCount\": 1}','2026-06-16 07:52:12.396'),(203,64,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T07:52:12.441Z\", \"itemCount\": 1}','2026-06-16 07:52:12.480'),(204,65,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-3606\"}','2026-06-16 07:53:59.192'),(206,65,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:22:03.079'),(207,65,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:22:15.104Z\", \"itemCount\": 1}','2026-06-16 08:22:15.116'),(208,65,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:22:21.108Z\", \"itemCount\": 1}','2026-06-16 08:22:21.116'),(209,65,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:22:21.287Z\", \"itemCount\": 1}','2026-06-16 08:22:21.324'),(210,57,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:24:36.808'),(211,57,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:24:41.717Z\", \"itemCount\": 1}','2026-06-16 08:24:41.726'),(212,57,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:24:41.845Z\", \"itemCount\": 1}','2026-06-16 08:24:41.880'),(215,68,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-0196',5,'{\"sourceReceiptId\": \"57\", \"sourceReceiptRef\": \"NK-20260616-0196\"}','2026-06-16 08:30:50.940'),(216,57,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-0196-ADJ',5,'{\"adjustmentReceiptId\": \"68\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ\"}','2026-06-16 08:30:50.940'),(217,68,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:33:30.721'),(218,68,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:33:37.079Z\", \"itemCount\": 1}','2026-06-16 08:33:37.089'),(219,57,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-0196-ADJ',5,'{\"adjustedAt\": \"2026-06-16T08:33:37.257Z\", \"adjustmentReceiptId\": \"68\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ\"}','2026-06-16 08:33:37.276'),(220,68,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:33:37.257Z\", \"itemCount\": 1}','2026-06-16 08:33:37.312'),(221,69,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-3606',5,'{\"sourceReceiptId\": \"65\", \"sourceReceiptRef\": \"NK-20260616-3606\"}','2026-06-16 08:36:21.179'),(222,65,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-3606-ADJ',5,'{\"adjustmentReceiptId\": \"69\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ\"}','2026-06-16 08:36:21.179'),(223,69,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:37:57.552'),(224,69,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:38:15.344Z\", \"itemCount\": 1}','2026-06-16 08:38:15.353'),(225,65,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-3606-ADJ',5,'{\"adjustedAt\": \"2026-06-16T08:38:15.710Z\", \"adjustmentReceiptId\": \"69\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ\"}','2026-06-16 08:38:15.736'),(226,69,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:38:15.710Z\", \"itemCount\": 1}','2026-06-16 08:38:15.782'),(227,70,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-2877',5,'{\"sourceReceiptId\": \"64\", \"sourceReceiptRef\": \"NK-20260616-2877\"}','2026-06-16 08:38:41.680'),(228,64,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-2877-ADJ',5,'{\"adjustmentReceiptId\": \"70\", \"adjustmentReceiptRef\": \"NK-20260616-2877-ADJ\"}','2026-06-16 08:38:41.680'),(229,70,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:40:42.376'),(230,70,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:40:46.291Z\", \"itemCount\": 1}','2026-06-16 08:40:46.301'),(231,64,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-2877-ADJ',5,'{\"adjustedAt\": \"2026-06-16T08:40:46.474Z\", \"adjustmentReceiptId\": \"70\", \"adjustmentReceiptRef\": \"NK-20260616-2877-ADJ\"}','2026-06-16 08:40:46.492'),(232,70,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:40:46.474Z\", \"itemCount\": 1}','2026-06-16 08:40:46.534'),(233,71,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-2090',5,'{\"sourceReceiptId\": \"61\", \"sourceReceiptRef\": \"NK-20260616-2090\"}','2026-06-16 08:40:57.108'),(234,61,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-2090-ADJ',5,'{\"adjustmentReceiptId\": \"71\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ\"}','2026-06-16 08:40:57.108'),(235,71,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:42:37.200'),(236,71,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 08:43:27.085'),(237,71,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T08:43:32.526Z\", \"itemCount\": 1}','2026-06-16 08:43:32.558'),(238,61,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-2090-ADJ',5,'{\"adjustedAt\": \"2026-06-16T08:43:32.618Z\", \"adjustmentReceiptId\": \"71\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ\"}','2026-06-16 08:43:32.645'),(239,71,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-06-16T08:43:32.618Z\", \"itemCount\": 1}','2026-06-16 08:43:32.688'),(241,71,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-2090-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"72\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ-ADJ\"}','2026-06-16 08:46:43.819'),(244,71,'adjustment_restored','Phục hồi phiếu gốc do hủy phiếu điều chỉnh NK-20260616-2090-ADJ-ADJ',5,'{\"restoredBecause\": \"adjustment_cancelled\", \"adjustmentReceiptId\": \"72\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ-ADJ\"}','2026-06-16 08:47:19.745'),(245,73,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260616-8008\"}','2026-06-16 09:07:23.282'),(246,73,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 09:11:43.526'),(247,73,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 09:11:59.283'),(248,73,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T09:17:22.473Z\", \"itemCount\": 1}','2026-06-16 09:17:22.487'),(249,73,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-12T00:00:00.000Z\", \"itemCount\": 1}','2026-06-16 09:17:22.777'),(250,62,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-16 09:20:45.980'),(251,62,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-16T09:20:52.426Z\", \"itemCount\": 1}','2026-06-16 09:20:52.444'),(252,62,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-04-17T00:00:00.000Z\", \"itemCount\": 1}','2026-06-16 09:20:52.652'),(253,74,'created','Khởi tạo phiếu nhập kho',2,'{\"step\": 2, \"receiptRef\": \"NK-20260617-7002\"}','2026-06-17 03:16:46.752'),(254,75,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-8008',5,'{\"sourceReceiptId\": \"73\", \"sourceReceiptRef\": \"NK-20260616-8008\"}','2026-06-18 06:14:42.680'),(255,73,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-8008-ADJ',5,'{\"adjustmentReceiptId\": \"75\", \"adjustmentReceiptRef\": \"NK-20260616-8008-ADJ\"}','2026-06-18 06:14:42.680'),(256,75,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 06:50:55.868'),(257,75,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T06:51:45.346Z\", \"itemCount\": 1}','2026-06-18 06:51:45.356'),(258,73,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-8008-ADJ',5,'{\"adjustedAt\": \"2026-05-12T00:00:00.000Z\", \"adjustmentReceiptId\": \"75\", \"adjustmentReceiptRef\": \"NK-20260616-8008-ADJ\"}','2026-06-18 06:51:45.687'),(259,75,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-12T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 06:51:45.795'),(260,76,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-2090-ADJ',5,'{\"sourceReceiptId\": \"71\", \"sourceReceiptRef\": \"NK-20260616-2090-ADJ\"}','2026-06-18 06:53:47.900'),(261,71,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-2090-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"76\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ-ADJ\"}','2026-06-18 06:53:47.900'),(262,76,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 06:55:01.459'),(263,76,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T06:55:06.868Z\", \"itemCount\": 1}','2026-06-18 06:55:06.879'),(264,71,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-2090-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-04-05T00:00:00.000Z\", \"adjustmentReceiptId\": \"76\", \"adjustmentReceiptRef\": \"NK-20260616-2090-ADJ-ADJ\"}','2026-06-18 06:55:07.001'),(265,76,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-04-05T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 06:55:07.041'),(266,63,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 06:58:21.170'),(267,63,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T06:58:27.874Z\", \"itemCount\": 1}','2026-06-18 06:58:27.883'),(268,63,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-04-17T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 06:58:28.129'),(269,77,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-0196-ADJ',5,'{\"sourceReceiptId\": \"68\", \"sourceReceiptRef\": \"NK-20260616-0196-ADJ\"}','2026-06-18 06:59:28.750'),(270,68,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-0196-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"77\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ-ADJ\"}','2026-06-18 06:59:28.750'),(271,77,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 07:00:01.575'),(272,77,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T07:00:04.725Z\", \"itemCount\": 1}','2026-06-18 07:00:04.733'),(273,68,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-0196-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-05-03T00:00:00.000Z\", \"adjustmentReceiptId\": \"77\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ-ADJ\"}','2026-06-18 07:00:05.145'),(274,77,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-03T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 07:00:05.181'),(275,78,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-0196-ADJ-ADJ',5,'{\"sourceReceiptId\": \"77\", \"sourceReceiptRef\": \"NK-20260616-0196-ADJ-ADJ\"}','2026-06-18 07:00:57.354'),(276,77,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-0196-ADJ-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"78\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ-ADJ-ADJ\"}','2026-06-18 07:00:57.354'),(277,78,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 07:02:54.478'),(278,78,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T07:03:00.935Z\", \"itemCount\": 1}','2026-06-18 07:03:00.946'),(279,77,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-0196-ADJ-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-05-03T00:00:00.000Z\", \"adjustmentReceiptId\": \"78\", \"adjustmentReceiptRef\": \"NK-20260616-0196-ADJ-ADJ-ADJ\"}','2026-06-18 07:03:01.048'),(280,78,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-03T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 07:03:01.084'),(281,60,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-18 07:13:55.617'),(282,60,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-18T07:14:09.854Z\", \"itemCount\": 1}','2026-06-18 07:14:09.863'),(283,60,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-04T00:00:00.000Z\", \"itemCount\": 1}','2026-06-18 07:14:09.962'),(285,74,'updated','Cập nhật phiếu nháp (Bước 2)',2,'{\"step\": 2, \"hasItemPayload\": true}','2026-06-18 08:49:13.644'),(295,59,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 03:36:29.300'),(296,59,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T03:36:34.707Z\", \"itemCount\": 1}','2026-06-24 03:36:34.719'),(297,59,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-04T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 03:36:34.878'),(299,80,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-9530\"}','2026-06-24 03:59:12.151'),(300,80,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:01:48.379'),(301,80,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:01:52.761Z\", \"itemCount\": 1}','2026-06-24 04:01:52.771'),(302,80,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-04T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:01:53.013'),(303,74,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:09:58.553'),(304,74,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:10:08.075Z\", \"itemCount\": 1}','2026-06-24 04:10:08.085'),(305,74,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-07T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:10:08.226'),(306,81,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-3606-ADJ',5,'{\"sourceReceiptId\": \"69\", \"sourceReceiptRef\": \"NK-20260616-3606-ADJ\"}','2026-06-24 04:11:47.383'),(307,69,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-3606-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"81\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ-ADJ\"}','2026-06-24 04:11:47.383'),(308,81,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:14:00.064'),(309,81,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:14:04.415Z\", \"itemCount\": 1}','2026-06-24 04:14:04.425'),(310,69,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-3606-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-05-12T00:00:00.000Z\", \"adjustmentReceiptId\": \"81\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ-ADJ\"}','2026-06-24 04:14:04.496'),(311,81,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-12T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:14:04.533'),(312,82,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-3606-ADJ-ADJ',5,'{\"sourceReceiptId\": \"81\", \"sourceReceiptRef\": \"NK-20260616-3606-ADJ-ADJ\"}','2026-06-24 04:14:36.253'),(313,81,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-3606-ADJ-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"82\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ-ADJ-ADJ\"}','2026-06-24 04:14:36.253'),(314,82,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:15:07.294'),(315,82,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:15:13.175Z\", \"itemCount\": 1}','2026-06-24 04:15:13.185'),(316,81,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-3606-ADJ-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-05-12T00:00:00.000Z\", \"adjustmentReceiptId\": \"82\", \"adjustmentReceiptRef\": \"NK-20260616-3606-ADJ-ADJ-ADJ\"}','2026-06-24 04:15:13.346'),(317,82,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-12T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:15:13.401'),(318,83,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-0551\"}','2026-06-24 04:16:09.553'),(319,83,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:18:22.701'),(320,83,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:18:38.615Z\", \"itemCount\": 1}','2026-06-24 04:18:38.625'),(321,83,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-07T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:18:38.732'),(322,84,'created_adjustment','Khởi tạo phiếu điều chỉnh từ NK-20260616-8008-ADJ',5,'{\"sourceReceiptId\": \"75\", \"sourceReceiptRef\": \"NK-20260616-8008-ADJ\"}','2026-06-24 04:19:03.700'),(323,75,'adjustment_created','Tạo phiếu điều chỉnh nháp NK-20260616-8008-ADJ-ADJ',5,'{\"adjustmentReceiptId\": \"84\", \"adjustmentReceiptRef\": \"NK-20260616-8008-ADJ-ADJ\"}','2026-06-24 04:19:03.700'),(324,84,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:20:00.750'),(325,84,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:20:05.765Z\", \"itemCount\": 1}','2026-06-24 04:20:05.775'),(326,75,'voided_for_rereceive','Void batch gốc bởi phiếu điều chỉnh NK-20260616-8008-ADJ-ADJ',5,'{\"adjustedAt\": \"2026-05-12T00:00:00.000Z\", \"adjustmentReceiptId\": \"84\", \"adjustmentReceiptRef\": \"NK-20260616-8008-ADJ-ADJ\"}','2026-06-24 04:20:05.869'),(327,84,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-12T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:20:05.905'),(328,85,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-0821\"}','2026-06-24 04:20:29.920'),(329,85,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 04:26:44.283'),(330,85,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T04:26:51.547Z\", \"itemCount\": 1}','2026-06-24 04:26:51.556'),(331,85,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-07T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 04:26:51.678'),(333,87,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-2532\"}','2026-06-24 04:49:03.048'),(334,87,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 05:02:52.589'),(335,87,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T05:03:03.347Z\", \"itemCount\": 1}','2026-06-24 05:03:03.356'),(336,87,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-04-03T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 05:03:03.475'),(337,88,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-3452\"}','2026-06-24 05:04:29.343'),(338,88,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 05:07:00.737'),(339,88,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T05:07:12.207Z\", \"itemCount\": 1}','2026-06-24 05:07:12.218'),(340,88,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-11T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 05:07:12.314'),(341,89,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-3682\"}','2026-06-24 05:08:09.173'),(342,89,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 05:40:06.413'),(343,89,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T05:40:12.457Z\", \"itemCount\": 1}','2026-06-24 05:40:12.467'),(344,89,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-18T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 05:40:12.555'),(345,90,'created','Khởi tạo phiếu nhập kho',5,'{\"step\": 2, \"receiptRef\": \"NK-20260624-6911\"}','2026-06-24 06:01:58.137'),(346,90,'updated','Cập nhật phiếu nháp (Bước 4)',5,'{\"step\": 4, \"hasItemPayload\": true}','2026-06-24 06:07:14.877'),(347,90,'qc_reviewed','Cập nhật kết quả QC',5,'{\"checkedAt\": \"2026-06-24T06:07:19.369Z\", \"itemCount\": 1}','2026-06-24 06:07:19.378'),(348,90,'posted','Posted phiếu nhập kho',5,'{\"postedAt\": \"2026-05-03T00:00:00.000Z\", \"itemCount\": 1}','2026-06-24 06:07:19.781');
/*!40000 ALTER TABLE `inbound_receipt_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inbound_receipt_item_documents`
--

DROP TABLE IF EXISTS `inbound_receipt_item_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inbound_receipt_item_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `inbound_receipt_item_documents_item_id_idx` (`item_id`) USING BTREE,
  KEY `inbound_receipt_item_documents_uploaded_by_fkey` (`uploaded_by`) USING BTREE,
  CONSTRAINT `inbound_receipt_item_documents_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_item_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=170 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inbound_receipt_item_documents`
--

LOCK TABLES `inbound_receipt_item_documents` WRITE;
/*!40000 ALTER TABLE `inbound_receipt_item_documents` DISABLE KEYS */;
INSERT INTO `inbound_receipt_item_documents` VALUES (85,47,'COA','uploads/inbound-drafts/57/8a3cf05e-5572-4b35-bb67-e11bc9a47921.pdf','COA - Dextrin Palmitate_2026.pdf','application/pdf',419692,1,'2026-06-16 14:01:48.502','2026-06-16 14:01:48.502'),(86,51,'COA','uploads/inbound-drafts/61/9019aa2d-00f4-48c8-9246-410fdac62673.jpg','COA_Trilon B Powder - Tetrasodium EDTA_ Batch 3832299109 - 2025-2027.jpg','image/jpeg',195861,1,'2026-06-16 14:33:36.762','2026-06-16 14:33:36.762'),(87,51,'MSDS','uploads/inbound-drafts/61/95fb7a6f-4597-4dbe-9725-049e4ece0574.pdf','MSDS-Trilon B Powder - Tetrasodium EDTA_2006.pdf','application/pdf',22280,1,'2026-06-16 14:33:44.337','2026-06-16 14:33:48.925'),(88,54,'COA','uploads/inbound-drafts/64/70b67df9-97ce-40a6-8ff1-643700d3f9ab.pdf','COA PKDE 90 N010272025 10.25 10.27.pdf','application/pdf',346328,1,'2026-06-16 14:50:21.400','2026-06-16 14:50:21.400'),(89,54,'MSDS','uploads/inbound-drafts/64/479c2942-5d39-4697-9b3c-db7a541b9b3c.pdf','CDS - PKDE 90 -DURAMIDE ( HUNKA ) SDS NEW.pdf','application/pdf',186494,1,'2026-06-16 14:50:47.660','2026-06-16 14:50:51.881'),(90,54,'Invoice','uploads/inbound-drafts/64/58caf152-718d-499a-925c-ccb050f9837f.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-16 14:51:55.704','2026-06-16 14:51:58.297'),(92,55,'COA','uploads/inbound-drafts/65/8fb9036f-eee9-4d7d-875a-777bbb7351d0.pdf','COA COSMAN NB1 20251014 14.10.25 13.10.27.pdf','application/pdf',359124,1,'2026-06-16 14:59:19.137','2026-06-16 14:59:19.137'),(97,55,'MSDS','uploads/inbound-drafts/65/8f5f4f32-5c49-465b-9865-0754d1831111.pdf','SDS COSMAN NB1-compressed.pdf','application/pdf',286368,1,'2026-06-16 15:21:17.486','2026-06-16 15:21:20.204'),(98,55,'Invoice','uploads/inbound-drafts/65/7c6f70dd-182b-4d50-b502-41a938a1b459.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-16 15:21:59.363','2026-06-16 15:22:01.745'),(99,47,'MSDS','uploads/inbound-drafts/57/2202e77b-2aa2-4ff2-829e-26ea7555846d.pdf','SDS_Dextrin Palmitate_Rheopearl_KL2@20171124.pdf','application/pdf',296460,1,'2026-06-16 15:23:34.998','2026-06-16 15:23:38.128'),(100,47,'Invoice','uploads/inbound-drafts/57/07edb856-2908-4683-b104-efef1b4dd006.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-16 15:24:28.633','2026-06-16 15:24:32.255'),(101,57,'COA','uploads/inbound-drafts/57/8a3cf05e-5572-4b35-bb67-e11bc9a47921.pdf','COA - Dextrin Palmitate_2026.pdf','application/pdf',419692,1,'2026-06-16 08:30:50.938','2026-06-16 08:30:50.938'),(102,57,'MSDS','uploads/inbound-drafts/57/2202e77b-2aa2-4ff2-829e-26ea7555846d.pdf','SDS_Dextrin Palmitate_Rheopearl_KL2@20171124.pdf','application/pdf',296460,1,'2026-06-16 08:30:50.938','2026-06-16 08:30:50.938'),(103,57,'Invoice','uploads/inbound-drafts/57/07edb856-2908-4683-b104-efef1b4dd006.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-16 08:30:50.938','2026-06-16 08:30:50.938'),(104,58,'COA','uploads/inbound-drafts/65/8fb9036f-eee9-4d7d-875a-777bbb7351d0.pdf','COA COSMAN NB1 20251014 14.10.25 13.10.27.pdf','application/pdf',359124,1,'2026-06-16 08:36:21.177','2026-06-16 08:36:21.177'),(105,58,'MSDS','uploads/inbound-drafts/65/8f5f4f32-5c49-465b-9865-0754d1831111.pdf','SDS COSMAN NB1-compressed.pdf','application/pdf',286368,1,'2026-06-16 08:36:21.177','2026-06-16 08:36:21.177'),(106,58,'Invoice','uploads/inbound-drafts/65/7c6f70dd-182b-4d50-b502-41a938a1b459.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-16 08:36:21.177','2026-06-16 08:36:21.177'),(107,59,'COA','uploads/inbound-drafts/64/70b67df9-97ce-40a6-8ff1-643700d3f9ab.pdf','COA PKDE 90 N010272025 10.25 10.27.pdf','application/pdf',346328,1,'2026-06-16 08:38:41.677','2026-06-16 08:38:41.677'),(108,59,'MSDS','uploads/inbound-drafts/64/479c2942-5d39-4697-9b3c-db7a541b9b3c.pdf','CDS - PKDE 90 -DURAMIDE ( HUNKA ) SDS NEW.pdf','application/pdf',186494,1,'2026-06-16 08:38:41.677','2026-06-16 08:38:41.677'),(109,59,'Invoice','uploads/inbound-drafts/64/58caf152-718d-499a-925c-ccb050f9837f.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-16 08:38:41.677','2026-06-16 08:38:41.677'),(110,60,'COA','uploads/inbound-drafts/61/9019aa2d-00f4-48c8-9246-410fdac62673.jpg','COA_Trilon B Powder - Tetrasodium EDTA_ Batch 3832299109 - 2025-2027.jpg','image/jpeg',195861,1,'2026-06-16 08:40:57.106','2026-06-16 08:40:57.106'),(111,60,'MSDS','uploads/inbound-drafts/61/95fb7a6f-4597-4dbe-9725-049e4ece0574.pdf','MSDS-Trilon B Powder - Tetrasodium EDTA_2006.pdf','application/pdf',22280,1,'2026-06-16 08:40:57.106','2026-06-16 08:40:57.106'),(112,60,'Invoice','uploads/inbound-drafts/71/827bfce7-8b84-4b31-ad5e-a5901dc648e6.pdf','1C26TKN_00002242_0318589330-002.pdf','application/pdf',272872,1,'2026-06-16 15:43:19.936','2026-06-16 15:43:22.127'),(116,62,'COA','uploads/inbound-drafts/73/00d34dd8-acc3-48b9-83c7-e5648f959364.pdf','COA XANTHAN GUM 2561376 22.3.25 22.3.28.pdf','application/pdf',504954,1,'2026-06-16 16:09:59.621','2026-06-16 16:09:59.621'),(117,62,'MSDS','uploads/inbound-drafts/73/b348b895-11f1-4ae7-95f8-55d61b03a63b.pdf','Xanthan Trong ( JUNGBUNZLA ) MSDS 2025.pdf','application/pdf',160786,1,'2026-06-16 16:10:27.010','2026-06-16 16:11:40.932'),(118,62,'Invoice','uploads/inbound-drafts/73/f52476e9-2e37-4c6c-adf9-4285e039b0bc.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-16 16:11:15.229','2026-06-16 16:11:17.676'),(119,63,'COA','uploads/inbound-drafts/73/00d34dd8-acc3-48b9-83c7-e5648f959364.pdf','COA XANTHAN GUM 2561376 22.3.25 22.3.28.pdf','application/pdf',504954,1,'2026-06-18 06:14:42.677','2026-06-18 06:14:42.677'),(120,63,'MSDS','uploads/inbound-drafts/73/b348b895-11f1-4ae7-95f8-55d61b03a63b.pdf','Xanthan Trong ( JUNGBUNZLA ) MSDS 2025.pdf','application/pdf',160786,1,'2026-06-18 06:14:42.677','2026-06-18 06:14:42.677'),(121,63,'Invoice','uploads/inbound-drafts/73/f52476e9-2e37-4c6c-adf9-4285e039b0bc.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-18 06:14:42.677','2026-06-18 06:14:42.677'),(122,64,'COA','uploads/inbound-drafts/61/9019aa2d-00f4-48c8-9246-410fdac62673.jpg','COA_Trilon B Powder - Tetrasodium EDTA_ Batch 3832299109 - 2025-2027.jpg','image/jpeg',195861,1,'2026-06-18 06:53:47.898','2026-06-18 06:53:47.898'),(123,64,'MSDS','uploads/inbound-drafts/61/95fb7a6f-4597-4dbe-9725-049e4ece0574.pdf','MSDS-Trilon B Powder - Tetrasodium EDTA_2006.pdf','application/pdf',22280,1,'2026-06-18 06:53:47.898','2026-06-18 06:53:47.898'),(124,64,'Invoice','uploads/inbound-drafts/71/827bfce7-8b84-4b31-ad5e-a5901dc648e6.pdf','1C26TKN_00002242_0318589330-002.pdf','application/pdf',272872,1,'2026-06-18 06:53:47.898','2026-06-18 06:53:47.898'),(125,65,'COA','uploads/inbound-drafts/57/8a3cf05e-5572-4b35-bb67-e11bc9a47921.pdf','COA - Dextrin Palmitate_2026.pdf','application/pdf',419692,1,'2026-06-18 06:59:28.748','2026-06-18 06:59:28.748'),(126,65,'MSDS','uploads/inbound-drafts/57/2202e77b-2aa2-4ff2-829e-26ea7555846d.pdf','SDS_Dextrin Palmitate_Rheopearl_KL2@20171124.pdf','application/pdf',296460,1,'2026-06-18 06:59:28.748','2026-06-18 06:59:28.748'),(127,65,'Invoice','uploads/inbound-drafts/57/07edb856-2908-4683-b104-efef1b4dd006.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-18 06:59:28.748','2026-06-18 06:59:28.748'),(128,66,'COA','uploads/inbound-drafts/57/8a3cf05e-5572-4b35-bb67-e11bc9a47921.pdf','COA - Dextrin Palmitate_2026.pdf','application/pdf',419692,1,'2026-06-18 07:00:57.352','2026-06-18 07:00:57.352'),(129,66,'MSDS','uploads/inbound-drafts/57/2202e77b-2aa2-4ff2-829e-26ea7555846d.pdf','SDS_Dextrin Palmitate_Rheopearl_KL2@20171124.pdf','application/pdf',296460,1,'2026-06-18 07:00:57.352','2026-06-18 07:00:57.352'),(130,66,'Invoice','uploads/inbound-drafts/57/07edb856-2908-4683-b104-efef1b4dd006.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-18 07:00:57.352','2026-06-18 07:00:57.352'),(132,49,'Invoice','uploads/inbound-drafts/59/68940ce5-49fa-476d-9dee-bf01f355d597.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-24 10:36:23.647','2026-06-24 10:36:26.383'),(136,69,'COA','uploads/inbound-drafts/80/d5b4166d-81e1-45a0-a552-f4a49265df2a.pdf','COA_ 145301 - SILSOFT 1540 fluid-Cyclopentasiloxane (and) PEG-PPG-20-15 Dimethicone_ Batch 25GNTA009_11-02-2025.pdf','application/pdf',107846,1,'2026-06-24 11:00:48.698','2026-06-24 11:00:48.698'),(137,69,'MSDS','uploads/inbound-drafts/80/f445f9bd-ebc1-44e8-93db-20a9af9372c3.pdf','MSDS_SILSOFT 1540 fluid-Cyclopentasiloxane (and) PEG-PPG-20-15 Dimethicone_04-2025.pdf','application/pdf',654138,1,'2026-06-24 11:01:10.254','2026-06-24 11:01:12.933'),(138,69,'Invoice','uploads/inbound-drafts/80/ee90b274-2d22-41bb-8c52-a6eed9803511.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-24 11:01:44.417','2026-06-24 11:01:46.669'),(139,68,'MSDS','uploads/inbound-drafts/74/95f92dbb-914a-4b69-bc54-5cdc58723ebd.pdf','CDS - PKDE 90 -DURAMIDE ( HUNKA ) SDS NEW.pdf','application/pdf',186494,1,'2026-06-24 11:09:00.246','2026-06-24 11:09:03.549'),(140,68,'COA','uploads/inbound-drafts/74/9fa04dcf-30d1-4655-8aee-b9022364372c.pdf','COA PKDE 90 N010272025 10.25 10.27.pdf','application/pdf',346328,1,'2026-06-24 11:09:15.717','2026-06-24 11:09:15.717'),(141,68,'Invoice','uploads/inbound-drafts/74/bf52a01c-8099-4bad-8233-c527dc0b86f6.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 11:09:54.480','2026-06-24 11:09:57.063'),(142,70,'COA','uploads/inbound-drafts/65/8fb9036f-eee9-4d7d-875a-777bbb7351d0.pdf','COA COSMAN NB1 20251014 14.10.25 13.10.27.pdf','application/pdf',359124,1,'2026-06-24 04:11:47.379','2026-06-24 04:11:47.379'),(143,70,'MSDS','uploads/inbound-drafts/65/8f5f4f32-5c49-465b-9865-0754d1831111.pdf','SDS COSMAN NB1-compressed.pdf','application/pdf',286368,1,'2026-06-24 04:11:47.379','2026-06-24 04:11:47.379'),(144,70,'Invoice','uploads/inbound-drafts/65/7c6f70dd-182b-4d50-b502-41a938a1b459.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 04:11:47.379','2026-06-24 04:11:47.379'),(145,71,'COA','uploads/inbound-drafts/65/8fb9036f-eee9-4d7d-875a-777bbb7351d0.pdf','COA COSMAN NB1 20251014 14.10.25 13.10.27.pdf','application/pdf',359124,1,'2026-06-24 04:14:36.250','2026-06-24 04:14:36.250'),(146,71,'MSDS','uploads/inbound-drafts/65/8f5f4f32-5c49-465b-9865-0754d1831111.pdf','SDS COSMAN NB1-compressed.pdf','application/pdf',286368,1,'2026-06-24 04:14:36.250','2026-06-24 04:14:36.250'),(147,71,'Invoice','uploads/inbound-drafts/65/7c6f70dd-182b-4d50-b502-41a938a1b459.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 04:14:36.250','2026-06-24 04:14:36.250'),(148,72,'Invoice','uploads/inbound-drafts/83/d2ba17bc-bc4c-49b0-ac73-02003710ea8e.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 11:17:36.660','2026-06-24 11:17:40.731'),(149,72,'COA','uploads/inbound-drafts/83/d6750870-9d28-4fd9-939d-c81a6da3ab67.pdf','COA_Cosman CR530_20250206.pdf','application/pdf',351048,1,'2026-06-24 11:18:00.153','2026-06-24 11:18:00.153'),(150,72,'MSDS','uploads/inbound-drafts/83/f33739a3-84ff-473c-9e5a-d9c648bcec38.pdf','MSDS_Cosman CR530_20250206.pdf','application/pdf',244275,1,'2026-06-24 11:18:08.597','2026-06-24 11:18:21.456'),(151,73,'COA','uploads/inbound-drafts/73/00d34dd8-acc3-48b9-83c7-e5648f959364.pdf','COA XANTHAN GUM 2561376 22.3.25 22.3.28.pdf','application/pdf',504954,1,'2026-06-24 04:19:03.698','2026-06-24 04:19:03.698'),(152,73,'MSDS','uploads/inbound-drafts/73/b348b895-11f1-4ae7-95f8-55d61b03a63b.pdf','Xanthan Trong ( JUNGBUNZLA ) MSDS 2025.pdf','application/pdf',160786,1,'2026-06-24 04:19:03.698','2026-06-24 04:19:03.698'),(153,73,'Invoice','uploads/inbound-drafts/73/f52476e9-2e37-4c6c-adf9-4285e039b0bc.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 04:19:03.698','2026-06-24 04:19:03.698'),(154,74,'COA','uploads/inbound-drafts/85/cd20a490-f774-4adc-8a32-f10f91bd788b.pdf','COA NACL K.C 18.11.25 18.11.28.pdf','application/pdf',435685,1,'2026-06-24 11:24:36.913','2026-06-24 11:24:36.913'),(155,74,'MSDS','uploads/inbound-drafts/85/4fd73434-5b5e-4747-be94-3fbf8899cddb.pdf','MSDS- NaCl K.C.pdf','application/pdf',229353,1,'2026-06-24 11:26:11.468','2026-06-24 11:26:40.818'),(156,74,'Invoice','uploads/inbound-drafts/85/535db3d3-6e02-434b-a75d-63a23ac0e7f6.pdf','1C26TNB_00005361_0318589330-002.pdf','application/pdf',293089,1,'2026-06-24 11:26:37.922','2026-06-24 11:26:42.651'),(158,76,'Invoice','uploads/inbound-drafts/87/87e48f58-38d0-4088-97a9-c0d8928fc9fd.pdf','1C26THH_00001739_0318589330-002.pdf','application/pdf',272003,1,'2026-06-24 11:59:48.227','2026-06-24 11:59:52.389'),(159,76,'COA','uploads/inbound-drafts/87/b871304b-2dfd-4185-9b5b-ab9490eadb02.pdf','15. COA KOH -260309C138.pdf','application/pdf',29032,1,'2026-06-24 12:02:38.450','2026-06-24 12:02:38.450'),(160,76,'MSDS','uploads/inbound-drafts/87/fc2b56a4-ab87-4698-8b9f-06ffe675f655.pdf','15.MSDS KOH (UNID)- POTASSIUM HYDROXIDE.pdf','application/pdf',181193,1,'2026-06-24 12:02:45.485','2026-06-24 12:02:51.137'),(161,77,'Invoice','uploads/inbound-drafts/88/ece9d378-6da7-4565-9b9e-2b45793cd42b.pdf','1C26THH_00001777_0318589330-002.pdf','application/pdf',271566,1,'2026-06-24 12:06:20.806','2026-06-24 12:06:23.257'),(162,77,'COA','uploads/inbound-drafts/88/ae987dce-3c26-402b-92c3-59adf6905d38.pdf','RICOBIO JA7_25091685_1.pdf','application/pdf',120352,1,'2026-06-24 12:06:45.559','2026-06-24 12:06:45.559'),(163,77,'MSDS','uploads/inbound-drafts/88/b9990aea-afe5-451b-a34d-0e8bdf9caf62.pdf','RICOBIO JA7_MSDS.pdf','application/pdf',221185,1,'2026-06-24 12:06:52.417','2026-06-24 12:06:55.913'),(164,78,'COA','uploads/inbound-drafts/89/7660aabd-096c-4cdf-ac4d-a1f4e2d3aeca.pdf','2. COA_ HYALURONIC ACID 1%_ EK2101_ 2025-2027.pdf','application/pdf',342019,1,'2026-06-24 12:10:49.798','2026-06-24 12:10:49.798'),(165,78,'MSDS','uploads/inbound-drafts/89/da1ea020-b4b6-4f18-9b81-35673b6e60d0.pdf','2. Hyaluronic acid 1%(GHS MSDS_E).pdf','application/pdf',109206,1,'2026-06-24 12:39:05.545','2026-06-24 12:39:11.275'),(166,78,'Invoice','uploads/inbound-drafts/89/6d8e5650-1cfc-45d8-9766-ecd726f2e357.pdf','1C26TKN_00002408_0318589330-002.pdf','application/pdf',274015,1,'2026-06-24 12:40:01.737','2026-06-24 12:40:04.150'),(167,79,'COA','uploads/inbound-drafts/90/3ce9aca7-3ba9-4c4c-a535-8a74d41a8242.pdf','IWAHVY_14798.pdf','application/pdf',23793,1,'2026-06-24 13:06:31.061','2026-06-24 13:06:31.061'),(168,79,'MSDS','uploads/inbound-drafts/90/2d187282-a27e-4d14-91fc-6e8a39de7822.pdf','SDS_UNIFILMA HVY@20251105.pdf','application/pdf',60824,1,'2026-06-24 13:06:36.787','2026-06-24 13:06:39.413'),(169,79,'Invoice','uploads/inbound-drafts/90/1a64bba0-7917-4423-952d-4a8594a1adc3.pdf','0318589330-001-C26TVL3.pdf','application/pdf',286626,1,'2026-06-24 13:07:11.433','2026-06-24 13:07:13.472');
/*!40000 ALTER TABLE `inbound_receipt_item_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inbound_receipt_items`
--

DROP TABLE IF EXISTS `inbound_receipt_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inbound_receipt_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inbound_receipt_id` bigint unsigned NOT NULL,
  `purchase_request_item_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer_lot_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15,4) NOT NULL,
  `unit_price_per_kg` decimal(15,2) NOT NULL DEFAULT '0.00',
  `line_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `qc_status` enum('pending','passed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `has_document` tinyint(1) NOT NULL DEFAULT '0',
  `posted_batch_id` bigint unsigned DEFAULT NULL,
  `posted_tx_id` bigint unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `manufacturer_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `inbound_receipt_items_inbound_receipt_id_product_id_lot_no_key` (`inbound_receipt_id`,`product_id`,`lot_no`) USING BTREE,
  KEY `inbound_receipt_items_product_id_idx` (`product_id`) USING BTREE,
  KEY `inbound_receipt_items_purchase_request_item_id_idx` (`purchase_request_item_id`) USING BTREE,
  KEY `inbound_receipt_items_posted_batch_id_idx` (`posted_batch_id`) USING BTREE,
  KEY `inbound_receipt_items_posted_tx_id_idx` (`posted_tx_id`) USING BTREE,
  KEY `inbound_receipt_items_expiry_date_idx` (`expiry_date`) USING BTREE,
  KEY `inbound_receipt_items_manufacturer_id_fkey` (`manufacturer_id`) USING BTREE,
  CONSTRAINT `inbound_receipt_items_inbound_receipt_id_fkey` FOREIGN KEY (`inbound_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `product_manufacturers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_batch_id_fkey` FOREIGN KEY (`posted_batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_posted_tx_id_fkey` FOREIGN KEY (`posted_tx_id`) REFERENCES `inventory_transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipt_items_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inbound_receipt_items`
--

LOCK TABLES `inbound_receipt_items` WRITE;
/*!40000 ALTER TABLE `inbound_receipt_items` DISABLE KEYS */;
INSERT INTO `inbound_receipt_items` VALUES (47,57,94,3814,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04','2024-08-30','2026-08-29',600.0000,'Kg',600.0000,4965000.00,2979000.00,'passed',1,149,293,'Auto-created from wizard Step 3 upload','2026-06-16 14:01:48.492','2026-06-16 08:24:41.858',NULL),(49,59,96,3816,'LOT-BB-TUYP-30ML-039-260504',NULL,'3','2026-05-04',NULL,NULL,2500.0000,'tube',2500.0000,4800.00,12000000.00,'passed',1,162,314,NULL,'2026-06-16 07:26:32.326','2026-06-24 03:36:34.839',NULL),(50,60,97,3817,'LOT-BB-HOP-040-260504',NULL,'3','2026-05-04',NULL,NULL,2500.0000,'Hộp',2500.0000,4800.00,12000000.00,'passed',0,161,313,NULL,'2026-06-16 07:27:31.080','2026-06-18 07:14:09.938',NULL),(51,61,98,3725,'LOT-NL-PGI-028-260405',NULL,'2242','2026-05-07','2025-07-05','2027-01-01',5000.0000,'Kg',5.0000,110000.00,550000.00,'passed',1,146,290,'Auto-created from wizard Step 3 upload','2026-06-16 14:33:36.757','2026-06-16 07:34:12.328',NULL),(52,62,101,3789,'LOT-BB-HOP-016-260417',NULL,'597','2026-05-11',NULL,NULL,20000.0000,'Cái',20000.0000,1410.00,28200000.00,'passed',0,155,303,NULL,'2026-06-16 07:37:57.881','2026-06-16 09:20:52.615',NULL),(53,63,102,3790,'LOT-BB-HOP-017-260413',NULL,'597','2026-05-11',NULL,NULL,10000.0000,'Hộp',10000.0000,2140.00,21400000.00,'passed',0,158,308,NULL,'2026-06-16 07:38:51.032','2026-06-18 06:58:28.104',NULL),(54,64,103,3818,'LOT-NL-LSA-091-2-260512',NULL,'5361','2026-05-12','2025-10-01','2027-10-01',12000.0000,'Kg',12.0000,105000.00,1260000.00,'passed',1,147,291,'Auto-created from wizard Step 3 upload','2026-06-16 14:50:21.394','2026-06-16 07:52:12.457',NULL),(55,65,104,3781,'LOT-NL-TDA-080-260512',NULL,'5361','2026-05-12','2025-10-14','2027-10-13',11000.0000,'Kg',11.0000,125000.00,1375000.00,'passed',1,148,292,'Auto-created from wizard Step 3 upload','2026-06-16 14:57:51.802','2026-06-16 08:22:21.300',NULL),(57,68,94,3814,'4082030',NULL,'3','2026-05-04','2024-08-30','2026-08-29',600.0000,'Kg',0.6000,4965000.00,2979000.00,'passed',1,150,295,'Auto-created from wizard Step 3 upload','2026-06-16 08:30:50.934','2026-06-16 08:33:37.288',NULL),(58,69,104,3781,'20251014',NULL,'5361','2026-05-12','2025-10-14','2027-10-13',11000.0000,'Kg',11.0000,125000.00,1375000.00,'passed',1,151,297,'Auto-created from wizard Step 3 upload','2026-06-16 08:36:21.173','2026-06-16 08:38:15.750',NULL),(59,70,103,3818,'N010272025',NULL,'5361','2026-05-12','2025-10-01','2027-10-01',12000.0000,'Kg',12.0000,105000.00,1260000.00,'passed',1,152,299,'Auto-created from wizard Step 3 upload','2026-06-16 08:38:41.673','2026-06-16 08:40:46.504',NULL),(60,71,98,3725,'38322009T0',NULL,'2242','2026-05-07','2025-07-05','2027-01-01',5000.0000,'Kg',5.0000,110000.00,550000.00,'passed',1,153,301,'Auto-created from wizard Step 3 upload','2026-06-16 08:40:57.103','2026-06-16 08:43:32.661',NULL),(62,73,106,3675,'2561376',NULL,'5361','2026-05-12','2025-03-22','2028-03-22',500.0000,'Kg',0.5000,560000.00,280000.00,'passed',1,154,302,'Auto-created from wizard Step 3 upload','2026-06-16 16:09:59.616','2026-06-16 09:17:22.746',NULL),(63,75,106,3675,'LOT-NL-TDA-074-260512',NULL,'5361','2026-05-12','2025-03-22','2028-03-22',500.0000,'Kg',0.5000,0.00,0.00,'passed',1,156,305,'Auto-created from wizard Step 3 upload','2026-06-18 06:14:42.673','2026-06-18 06:51:45.741',NULL),(64,76,98,3725,'LOT-NL-PGI-028-260405',NULL,'2242','2026-05-07','2025-07-05','2027-01-01',5000.0000,'Kg',5.0000,110000.00,550000.00,'passed',1,157,307,'Auto-created from wizard Step 3 upload','2026-06-18 06:53:47.894','2026-06-18 06:55:07.014',NULL),(65,77,94,3814,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04','2024-08-30','2026-08-29',600.0000,'Kg',0.6000,0.00,0.00,'passed',1,159,310,'Auto-created from wizard Step 3 upload','2026-06-18 06:59:28.744','2026-06-18 07:00:05.163',NULL),(66,78,94,3814,'LOT-NL-TDA-017-260503',NULL,'3','2026-05-04','2024-08-30','2026-08-29',600.0000,'Kg',0.6000,4965000.00,2979000.00,'passed',1,160,312,'Auto-created from wizard Step 3 upload','2026-06-18 07:00:57.349','2026-06-18 07:03:01.059',NULL),(68,74,103,3818,'LOT-NL-LSA-091-2-260507','N010272025','5361','2026-05-12','2025-10-01','2027-10-01',12000000.0000,'Kg',12000.0000,105000.00,1260000000.00,'passed',1,164,316,NULL,'2026-06-18 08:49:13.635','2026-06-24 04:10:08.198',NULL),(69,80,112,3807,'LOT-NL-NHO-137-1-260504','25GNTA009','3','2026-05-04','2025-02-11','2027-02-01',2200.0000,'Kg',2.2000,1800000.00,3960000.00,'passed',1,163,315,'Auto-created from wizard Step 3 upload','2026-06-24 11:00:48.691','2026-06-24 04:01:52.989',NULL),(70,81,104,3781,'LOT-NL-TDA-080-260512','20251014','5361','2026-05-12','2025-10-14','2027-10-13',11000000.0000,'Kg',11000.0000,125000.00,1375000000.00,'passed',1,165,318,'Auto-created from wizard Step 3 upload','2026-06-24 04:11:47.375','2026-06-24 04:14:04.509',NULL),(71,82,104,3781,'LOT-NL-TDA-080-260512',NULL,'5361','2026-05-12','2025-10-14','2027-10-13',11000.0000,'Kg',11.0000,125000.00,1375000.00,'passed',1,166,320,'Auto-created from wizard Step 3 upload','2026-06-24 04:14:36.245','2026-06-24 04:15:13.357',NULL),(72,83,105,3733,'LOT-NL-THU-039-260507','20250228','5361','2026-05-12','2025-02-28','2027-02-27',1000.0000,'Kg',1.0000,800000.00,800000.00,'passed',1,167,321,'Auto-created from wizard Step 3 upload','2026-06-24 11:17:36.655','2026-06-24 04:18:38.707',NULL),(73,84,106,3675,'LOT-NL-TDA-074-260512','2561376','5361','2026-05-12','2025-03-22','2028-03-22',500.0000,'Kg',0.5000,560000.00,280000.00,'passed',1,168,323,'Auto-created from wizard Step 3 upload','2026-06-24 04:19:03.694','2026-06-24 04:20:05.883',NULL),(74,85,107,3819,'LOT-NL-PGI-060-260507','INVOICENO.699/2025','5362','2026-05-12','2025-11-18','2028-11-18',5000.0000,'Kg',5.0000,10000.00,50000.00,'passed',1,169,324,'Auto-created from wizard Step 3 upload','2026-06-24 11:24:36.906','2026-06-24 04:26:51.654',NULL),(76,87,113,3820,'LOT-NL-PGI-052-260403','260309C138','1739','2026-05-12','2026-03-09','2028-03-09',5000.0000,'Kg',5.0000,120000.00,600000.00,'passed',1,170,325,'Auto-created from wizard Step 3 upload','2026-06-24 11:59:48.218','2026-06-24 05:03:03.453',NULL),(77,88,110,3690,'LOT-NL-CXU-037-260511','25091685','1777','2026-05-14','2025-09-16','2027-09-15',300.0000,'Kg',0.3000,3000000.00,900000.00,'passed',1,171,326,'Auto-created from wizard Step 3 upload','2026-06-24 12:06:20.801','2026-06-24 05:07:12.292',NULL),(78,89,111,3693,'LOT-NL-HCH-026-260518','EK1001','2408','2026-05-14','2025-11-10','2027-11-09',1500.0000,'Kg',1.5000,1730000.00,2595000.00,'passed',1,172,327,'Auto-created from wizard Step 3 upload','2026-06-24 12:10:49.793','2026-06-24 05:40:12.525',NULL),(79,90,95,3815,'LOT-NL-DBO-210-260503','50205','3','2026-05-04','2025-02-06','2027-02-04',200.0000,'Kg',0.2000,9540000.00,1908000.00,'passed',1,173,328,'Auto-created from wizard Step 3 upload','2026-06-24 13:06:31.053','2026-06-24 06:07:19.751',NULL);
/*!40000 ALTER TABLE `inbound_receipt_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inbound_receipts`
--

DROP TABLE IF EXISTS `inbound_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inbound_receipts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receipt_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_request_id` bigint unsigned DEFAULT NULL,
  `source_receipt_id` bigint unsigned DEFAULT NULL,
  `adjusted_by_receipt_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `receiving_location_id` bigint unsigned DEFAULT NULL,
  `status` enum('draft','pending_qc','posted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `expected_date` date DEFAULT NULL,
  `received_at` datetime(3) DEFAULT NULL,
  `qc_checked_at` datetime(3) DEFAULT NULL,
  `current_step` tinyint unsigned NOT NULL DEFAULT '2',
  `created_by` bigint unsigned NOT NULL,
  `posted_by` bigint unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `inbound_receipts_receipt_ref_key` (`receipt_ref`) USING BTREE,
  UNIQUE KEY `inbound_receipts_source_receipt_id_key` (`source_receipt_id`) USING BTREE,
  UNIQUE KEY `inbound_receipts_adjusted_by_receipt_id_key` (`adjusted_by_receipt_id`) USING BTREE,
  KEY `inbound_receipts_status_idx` (`status`) USING BTREE,
  KEY `inbound_receipts_purchase_request_id_idx` (`purchase_request_id`) USING BTREE,
  KEY `inbound_receipts_supplier_id_idx` (`supplier_id`) USING BTREE,
  KEY `inbound_receipts_receiving_location_id_idx` (`receiving_location_id`) USING BTREE,
  KEY `inbound_receipts_created_by_fkey` (`created_by`) USING BTREE,
  KEY `inbound_receipts_posted_by_fkey` (`posted_by`) USING BTREE,
  KEY `inbound_receipts_source_receipt_id_idx` (`source_receipt_id`) USING BTREE,
  KEY `inbound_receipts_adjusted_by_receipt_id_idx` (`adjusted_by_receipt_id`) USING BTREE,
  KEY `inbound_receipts_customer_id_idx` (`customer_id`),
  CONSTRAINT `inbound_receipts_adjusted_by_receipt_id_fkey` FOREIGN KEY (`adjusted_by_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_posted_by_fkey` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_receiving_location_id_fkey` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_source_receipt_id_fkey` FOREIGN KEY (`source_receipt_id`) REFERENCES `inbound_receipts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inbound_receipts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inbound_receipts`
--

LOCK TABLES `inbound_receipts` WRITE;
/*!40000 ALTER TABLE `inbound_receipts` DISABLE KEYS */;
INSERT INTO `inbound_receipts` VALUES (57,'NK-20260616-0196',30,NULL,68,NULL,208,10,'posted','2026-05-03','2026-05-03 00:00:00.000','2026-05-03 00:00:00.000',4,5,5,NULL,NULL,'2026-06-16 06:57:23.169','2026-06-16 16:26:59.768'),(59,'NK-20260616-1246',31,NULL,NULL,NULL,208,11,'posted','2026-05-04','2026-05-04 00:00:00.000','2026-06-24 03:36:34.707',4,5,5,NULL,NULL,'2026-06-16 07:14:26.159','2026-06-24 03:36:34.864'),(60,'NK-20260616-2011',31,NULL,NULL,NULL,208,11,'posted','2026-05-04','2026-05-04 00:00:00.000','2026-06-18 07:14:09.854',4,5,5,NULL,NULL,'2026-06-16 07:27:06.848','2026-06-18 07:14:09.959'),(61,'NK-20260616-2090',32,NULL,71,NULL,129,10,'posted','2026-04-05','2026-04-05 00:00:00.000','2026-04-05 00:00:00.000',4,5,5,NULL,NULL,'2026-06-16 07:28:48.500','2026-06-16 16:26:59.768'),(62,'NK-20260616-2464',33,NULL,NULL,NULL,146,11,'posted','2026-04-17','2026-04-17 00:00:00.000','2026-06-16 09:20:52.426',4,5,5,NULL,NULL,'2026-06-16 07:36:50.527','2026-06-16 09:20:52.646'),(63,'NK-20260616-2692',33,NULL,NULL,NULL,146,11,'posted','2026-04-17','2026-04-17 00:00:00.000','2026-06-18 06:58:27.874',4,5,5,NULL,NULL,'2026-06-16 07:38:19.989','2026-06-18 06:58:28.124'),(64,'NK-20260616-2877',34,NULL,70,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-05-12 00:00:00.000',4,5,5,NULL,NULL,'2026-06-16 07:41:30.329','2026-06-16 16:26:59.768'),(65,'NK-20260616-3606',34,NULL,69,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-05-12 00:00:00.000',4,5,5,NULL,NULL,'2026-06-16 07:53:59.189','2026-06-16 16:26:59.768'),(68,'NK-20260616-0196-ADJ',30,57,77,NULL,208,10,'posted','2026-05-03','2026-05-03 00:00:00.000','2026-05-03 00:00:00.000',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-0196',NULL,'2026-06-16 08:30:50.930','2026-06-18 07:00:05.141'),(69,'NK-20260616-3606-ADJ',34,65,81,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-05-12 00:00:00.000',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-3606',NULL,'2026-06-16 08:36:21.169','2026-06-24 04:14:04.491'),(70,'NK-20260616-2877-ADJ',34,64,NULL,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-05-12 00:00:00.000',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-2877',NULL,'2026-06-16 08:38:41.670','2026-06-16 16:26:59.768'),(71,'NK-20260616-2090-ADJ',32,61,76,NULL,129,10,'posted','2026-04-05','2026-04-05 00:00:00.000','2026-04-05 00:00:00.000',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-2090',NULL,'2026-06-16 08:40:57.100','2026-06-18 06:55:06.993'),(73,'NK-20260616-8008',34,NULL,75,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-06-16 09:17:22.473',4,5,5,NULL,NULL,'2026-06-16 09:07:23.278','2026-06-18 06:51:45.678'),(74,'NK-20260617-7002',34,NULL,NULL,NULL,133,12,'posted','2026-05-07','2026-05-07 00:00:00.000','2026-06-24 04:10:08.075',4,2,5,NULL,NULL,'2026-06-17 03:16:46.746','2026-06-24 04:10:08.221'),(75,'NK-20260616-8008-ADJ',34,73,84,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-06-18 06:51:45.346',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-8008',NULL,'2026-06-18 06:14:42.669','2026-06-24 04:20:05.864'),(76,'NK-20260616-2090-ADJ-ADJ',32,71,NULL,NULL,129,10,'posted','2026-04-05','2026-04-05 00:00:00.000','2026-06-18 06:55:06.868',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-2090-ADJ',NULL,'2026-06-18 06:53:47.889','2026-06-18 06:55:07.037'),(77,'NK-20260616-0196-ADJ-ADJ',30,68,78,NULL,208,10,'posted','2026-05-03','2026-05-03 00:00:00.000','2026-06-18 07:00:04.725',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-0196-ADJ',NULL,'2026-06-18 06:59:28.741','2026-06-18 07:03:01.043'),(78,'NK-20260616-0196-ADJ-ADJ-ADJ',30,77,NULL,NULL,208,10,'posted','2026-05-03','2026-05-03 00:00:00.000','2026-06-18 07:03:00.935',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-0196-ADJ-ADJ',NULL,'2026-06-18 07:00:57.345','2026-06-18 07:03:01.080'),(80,'NK-20260624-9530',38,NULL,NULL,NULL,208,10,'posted','2026-05-04','2026-05-04 00:00:00.000','2026-06-24 04:01:52.761',4,5,5,NULL,NULL,'2026-06-24 03:59:12.147','2026-06-24 04:01:53.009'),(81,'NK-20260616-3606-ADJ-ADJ',34,69,82,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-06-24 04:14:04.415',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-3606-ADJ',NULL,'2026-06-24 04:11:47.371','2026-06-24 04:15:13.342'),(82,'NK-20260616-3606-ADJ-ADJ-ADJ',34,81,NULL,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-06-24 04:15:13.175',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-3606-ADJ-ADJ',NULL,'2026-06-24 04:14:36.239','2026-06-24 04:15:13.397'),(83,'NK-20260624-0551',34,NULL,NULL,NULL,133,10,'posted','2026-05-07','2026-05-07 00:00:00.000','2026-06-24 04:18:38.615',4,5,5,NULL,NULL,'2026-06-24 04:16:09.550','2026-06-24 04:18:38.728'),(84,'NK-20260616-8008-ADJ-ADJ',34,75,NULL,NULL,133,10,'posted','2026-05-12','2026-05-12 00:00:00.000','2026-06-24 04:20:05.765',4,5,5,'Phiếu điều chỉnh theo hướng Void & re-receive từ NK-20260616-8008-ADJ',NULL,'2026-06-24 04:19:03.691','2026-06-24 04:20:05.901'),(85,'NK-20260624-0821',34,NULL,NULL,NULL,133,10,'posted','2026-05-07','2026-05-07 00:00:00.000','2026-06-24 04:26:51.547',4,5,5,NULL,NULL,'2026-06-24 04:20:29.917','2026-06-24 04:26:51.674'),(87,'NK-20260624-2532',39,NULL,NULL,NULL,113,10,'posted','2026-04-03','2026-04-03 00:00:00.000','2026-06-24 05:03:03.347',4,5,5,NULL,NULL,'2026-06-24 04:49:03.043','2026-06-24 05:03:03.472'),(88,'NK-20260624-3452',36,NULL,NULL,NULL,113,10,'posted','2026-05-11','2026-05-11 00:00:00.000','2026-06-24 05:07:12.207',4,5,5,NULL,NULL,'2026-06-24 05:04:29.339','2026-06-24 05:07:12.311'),(89,'NK-20260624-3682',37,NULL,NULL,NULL,129,10,'posted','2026-05-18','2026-05-18 00:00:00.000','2026-06-24 05:40:12.457',4,5,5,NULL,NULL,'2026-06-24 05:08:09.170','2026-06-24 05:40:12.550'),(90,'NK-20260624-6911',30,NULL,NULL,NULL,208,10,'posted','2026-05-03','2026-05-03 00:00:00.000','2026-06-24 06:07:19.369',4,5,5,NULL,NULL,'2026-06-24 06:01:58.134','2026-06-24 06:07:19.775');
/*!40000 ALTER TABLE `inbound_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_locations`
--

DROP TABLE IF EXISTS `inventory_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `inventory_locations_code_key` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_locations`
--

LOCK TABLES `inventory_locations` WRITE;
/*!40000 ALTER TABLE `inventory_locations` DISABLE KEYS */;
INSERT INTO `inventory_locations` VALUES (1,'LOC-001','Kho Long An','Kho mặc định',NULL,'2026-03-30 14:37:00.556','2026-06-05 15:26:00.334'),(3,'LOC-002','Kho Vĩnh Long','Không sử dụng',NULL,'2026-03-31 21:50:14.736','2026-06-05 15:26:12.254'),(10,'KNVL','Kho nguyên liệu','',NULL,'2026-06-03 13:46:18.226','2026-06-03 14:22:01.872'),(11,'KBBĐG','Kho Vật tư/Bao bì đóng gói','',NULL,'2026-06-03 13:46:18.930','2026-06-03 15:33:16.434'),(12,'KHO BTP/TP','Kho BTP/Thành phẩm','',NULL,'2026-06-03 13:46:18.974','2026-06-03 13:46:18.974');
/*!40000 ALTER TABLE `inventory_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `export_order_item_id` bigint unsigned DEFAULT NULL,
  `inbound_receipt_item_id` bigint unsigned DEFAULT NULL,
  `production_order_id` bigint unsigned DEFAULT NULL,
  `warehouse_location_id` bigint unsigned NOT NULL,
  `type` enum('import','export','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_cancelled` tinyint(1) NOT NULL DEFAULT '0',
  `transaction_date` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `inventory_transactions_user_id_fkey` (`user_id`) USING BTREE,
  KEY `inventory_transactions_export_order_item_id_fkey` (`export_order_item_id`) USING BTREE,
  KEY `inventory_transactions_inbound_receipt_item_id_idx` (`inbound_receipt_item_id`) USING BTREE,
  KEY `inventory_transactions_batch_id_transaction_date_type_idx` (`batch_id`,`transaction_date`,`type`) USING BTREE,
  KEY `inventory_transactions_production_order_id_idx` (`production_order_id`) USING BTREE,
  KEY `inventory_transactions_warehouse_location_id_idx` (`warehouse_location_id`) USING BTREE,
  CONSTRAINT `inventory_transactions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_inbound_receipt_item_id_fkey` FOREIGN KEY (`inbound_receipt_item_id`) REFERENCES `inbound_receipt_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_transactions`
--

LOCK TABLES `inventory_transactions` WRITE;
/*!40000 ALTER TABLE `inventory_transactions` DISABLE KEYS */;
INSERT INTO `inventory_transactions` VALUES (246,103,1,NULL,NULL,NULL,10,'import',1178.0000,'Opening stock auto-post from item #97',0,'2026-05-01 00:00:00.000','2026-06-12 08:27:57.536','2026-06-12 08:27:57.536'),(247,104,1,NULL,NULL,NULL,10,'import',202000.0000,'Opening stock auto-post from item #98',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:05.781','2026-06-12 08:28:05.781'),(248,105,1,NULL,NULL,NULL,10,'import',70000.0000,'Opening stock auto-post from item #99',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:06.544','2026-06-12 08:28:06.544'),(249,106,1,NULL,NULL,NULL,10,'import',87391.0000,'Opening stock auto-post from item #100',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:11.662','2026-06-12 08:28:11.662'),(250,107,1,NULL,NULL,NULL,10,'import',117000.0000,'Opening stock auto-post from item #101',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:13.399','2026-06-12 08:28:13.399'),(251,108,1,NULL,NULL,NULL,10,'import',60000.0000,'Opening stock auto-post from item #102',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:16.430','2026-06-12 08:28:16.430'),(252,109,1,NULL,NULL,NULL,10,'import',20000.0000,'Opening stock auto-post from item #103',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:17.594','2026-06-12 08:28:17.594'),(253,110,1,NULL,NULL,NULL,10,'import',11.0000,'Opening stock auto-post from item #104',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:18.715','2026-06-12 08:28:18.715'),(254,111,1,NULL,NULL,NULL,10,'import',4712.0000,'Opening stock auto-post from item #105',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:19.280','2026-06-12 08:28:19.280'),(255,112,1,NULL,NULL,NULL,10,'import',41000.0000,'Opening stock auto-post from item #106',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:22.788','2026-06-12 08:28:22.788'),(256,113,1,NULL,NULL,NULL,10,'import',5000.0000,'Opening stock auto-post from item #107',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:23.784','2026-06-12 08:28:23.784'),(257,114,1,NULL,NULL,NULL,10,'import',973.0000,'Opening stock auto-post from item #108',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:24.356','2026-06-12 08:28:24.356'),(258,115,1,NULL,NULL,NULL,10,'import',31300.0000,'Opening stock auto-post from item #109',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:25.461','2026-06-12 08:28:25.461'),(259,116,1,NULL,NULL,NULL,10,'import',10000.0000,'Opening stock auto-post from item #110',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:26.088','2026-06-12 08:28:26.088'),(260,117,1,NULL,NULL,NULL,10,'import',10000.0000,'Opening stock auto-post from item #111',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:26.834','2026-06-12 08:28:26.834'),(261,118,1,NULL,NULL,NULL,10,'import',200.0000,'Opening stock auto-post from item #112',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:27.498','2026-06-12 08:28:27.498'),(262,119,1,NULL,NULL,NULL,10,'import',200.0000,'Opening stock auto-post from item #113',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:28.492','2026-06-12 08:28:28.492'),(263,120,1,NULL,NULL,NULL,10,'import',300.0000,'Opening stock auto-post from item #114',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:28.832','2026-06-12 08:28:28.832'),(264,121,1,NULL,NULL,NULL,10,'import',2000.0000,'Opening stock auto-post from item #115',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:29.426','2026-06-12 08:28:29.426'),(265,122,1,NULL,NULL,NULL,10,'import',20000.0000,'Opening stock auto-post from item #116',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:29.853','2026-06-12 08:28:29.853'),(266,123,1,NULL,NULL,NULL,10,'import',8300.0000,'Opening stock auto-post from item #117',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:31.023','2026-06-12 08:28:31.023'),(267,124,1,NULL,NULL,NULL,10,'import',10000.0000,'Opening stock auto-post from item #118',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:32.449','2026-06-12 08:28:32.449'),(268,125,1,NULL,NULL,NULL,10,'import',31873.0000,'Opening stock auto-post from item #119',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:33.370','2026-06-12 08:28:33.370'),(269,126,1,NULL,NULL,NULL,10,'import',20000.0000,'Opening stock auto-post from item #120',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:34.965','2026-06-12 08:28:34.965'),(270,127,1,NULL,NULL,NULL,10,'import',97.0000,'Opening stock auto-post from item #121',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:37.443','2026-06-12 08:28:37.443'),(271,128,1,NULL,NULL,NULL,10,'import',6000.0000,'Opening stock auto-post from item #122',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:40.120','2026-06-12 08:28:40.120'),(272,129,1,NULL,NULL,NULL,10,'import',2000.0000,'Opening stock auto-post from item #123',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:41.590','2026-06-12 08:28:41.590'),(273,130,1,NULL,NULL,NULL,10,'import',7000.0000,'Opening stock auto-post from item #124',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:42.558','2026-06-12 08:28:42.558'),(274,131,1,NULL,NULL,NULL,10,'import',36607.0000,'Opening stock auto-post from item #125',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:43.120','2026-06-12 08:28:43.120'),(275,132,1,NULL,NULL,NULL,10,'import',12000.0000,'Opening stock auto-post from item #126',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:45.019','2026-06-12 08:28:45.019'),(276,133,1,NULL,NULL,NULL,10,'import',25000.0000,'Opening stock auto-post from item #127',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:45.787','2026-06-12 08:28:45.787'),(277,134,1,NULL,NULL,NULL,10,'import',2000.0000,'Opening stock auto-post from item #128',0,'2026-05-01 00:00:00.000','2026-06-12 08:28:46.740','2026-06-12 08:28:46.740'),(278,135,1,NULL,NULL,NULL,10,'import',202000.0000,'Opening stock auto-post from item #129',0,'2026-05-01 00:00:00.000','2026-06-12 08:30:48.127','2026-06-12 08:30:48.127'),(279,136,1,NULL,NULL,NULL,10,'import',4000.0000,'Opening stock auto-post from item #130',0,'2026-05-01 00:00:00.000','2026-06-12 08:30:49.543','2026-06-12 08:30:49.543'),(280,137,1,NULL,NULL,NULL,10,'import',4000.0000,'Opening stock auto-post from item #131',0,'2026-05-01 00:00:00.000','2026-06-12 08:30:54.511','2026-06-12 08:30:54.511'),(281,138,1,NULL,NULL,NULL,10,'import',1000.0000,'Opening stock auto-post from item #132',0,'2026-05-01 00:00:00.000','2026-06-15 03:55:42.691','2026-06-15 03:55:42.691'),(282,138,1,NULL,NULL,NULL,10,'adjustment',-1000.0000,'Reversal delete opening stock item #132',0,'2026-06-15 04:00:35.650','2026-06-15 04:00:35.651','2026-06-15 04:00:35.651'),(283,139,1,NULL,NULL,NULL,10,'import',177.0000,'Opening stock auto-post from item #133',0,'2026-05-01 00:00:00.000','2026-06-15 04:02:26.945','2026-06-15 04:02:26.945'),(284,140,1,NULL,NULL,NULL,10,'import',300.0000,'Opening stock auto-post from item #134',0,'2026-05-01 00:00:00.000','2026-06-15 04:02:28.559','2026-06-15 04:02:28.559'),(285,141,1,NULL,NULL,NULL,10,'import',1000.0000,'Opening stock auto-post from item #135',0,'2026-05-01 00:00:00.000','2026-06-15 04:02:29.592','2026-06-15 04:02:29.592'),(286,142,1,NULL,NULL,NULL,10,'import',1000.0000,'Opening stock auto-post from item #136',0,'2026-05-01 00:00:00.000','2026-06-15 04:02:31.922','2026-06-15 04:02:31.922'),(287,143,1,NULL,NULL,NULL,10,'import',5000.0000,'Opening stock auto-post from item #137',0,'2026-05-01 00:00:00.000','2026-06-15 04:09:34.299','2026-06-15 04:09:34.299'),(288,144,1,NULL,NULL,NULL,10,'import',10000.0000,'Opening stock auto-post from item #138',0,'2026-05-01 00:00:00.000','2026-06-15 04:09:37.986','2026-06-15 04:09:37.986'),(290,146,5,NULL,51,NULL,10,'import',5000.0000,'Nhập kho từ phiếu NK-20260616-2090',0,'2026-04-05 00:00:00.000','2026-06-16 07:34:12.320','2026-06-16 16:26:59.771'),(291,147,5,NULL,54,NULL,10,'import',12000.0000,'Nhập kho từ phiếu NK-20260616-2877',0,'2026-05-12 00:00:00.000','2026-06-16 07:52:12.448','2026-06-16 16:26:59.771'),(292,148,5,NULL,55,NULL,10,'import',11000.0000,'Nhập kho từ phiếu NK-20260616-3606',0,'2026-05-12 00:00:00.000','2026-06-16 08:22:21.293','2026-06-16 16:26:59.771'),(293,149,5,NULL,47,NULL,10,'import',600.0000,'Nhập kho từ phiếu NK-20260616-0196',0,'2026-05-03 00:00:00.000','2026-06-16 08:24:41.851','2026-06-16 16:26:59.771'),(294,149,5,NULL,47,NULL,10,'adjustment',-600.0000,'Void & re-receive từ phiếu NK-20260616-0196-ADJ',0,'2026-05-03 00:00:00.000','2026-06-16 08:33:37.264','2026-06-16 16:26:59.774'),(295,150,5,NULL,57,NULL,10,'import',600.0000,'Nhập kho từ phiếu NK-20260616-0196-ADJ',0,'2026-05-03 00:00:00.000','2026-06-16 08:33:37.281','2026-06-16 16:26:59.771'),(296,148,5,NULL,55,NULL,10,'adjustment',-11000.0000,'Void & re-receive từ phiếu NK-20260616-3606-ADJ',0,'2026-05-12 00:00:00.000','2026-06-16 08:38:15.718','2026-06-16 16:26:59.774'),(297,151,5,NULL,58,NULL,10,'import',11000.0000,'Nhập kho từ phiếu NK-20260616-3606-ADJ',0,'2026-05-12 00:00:00.000','2026-06-16 08:38:15.743','2026-06-16 16:26:59.771'),(298,147,5,NULL,54,NULL,10,'adjustment',-12000.0000,'Void & re-receive từ phiếu NK-20260616-2877-ADJ',0,'2026-05-12 00:00:00.000','2026-06-16 08:40:46.480','2026-06-16 16:26:59.774'),(299,152,5,NULL,59,NULL,10,'import',12000.0000,'Nhập kho từ phiếu NK-20260616-2877-ADJ',0,'2026-05-12 00:00:00.000','2026-06-16 08:40:46.498','2026-06-16 16:26:59.771'),(300,146,5,NULL,51,NULL,10,'adjustment',-5000.0000,'Void & re-receive từ phiếu NK-20260616-2090-ADJ',0,'2026-04-05 00:00:00.000','2026-06-16 08:43:32.627','2026-06-16 16:26:59.774'),(301,153,5,NULL,60,NULL,10,'import',5000.0000,'Nhập kho từ phiếu NK-20260616-2090-ADJ',0,'2026-04-05 00:00:00.000','2026-06-16 08:43:32.653','2026-06-16 16:26:59.771'),(302,154,5,NULL,62,NULL,10,'import',500.0000,'Nhập kho từ phiếu NK-20260616-8008',0,'2026-05-12 00:00:00.000','2026-06-16 09:17:22.731','2026-06-16 09:17:22.731'),(303,155,5,NULL,52,NULL,11,'import',20000.0000,'Nhập kho từ phiếu NK-20260616-2464',0,'2026-04-17 00:00:00.000','2026-06-16 09:20:52.605','2026-06-16 09:20:52.605'),(304,154,5,NULL,62,NULL,10,'adjustment',-500.0000,'Void & re-receive từ phiếu NK-20260616-8008-ADJ',0,'2026-05-12 00:00:00.000','2026-06-18 06:51:45.662','2026-06-18 06:51:45.662'),(305,156,5,NULL,63,NULL,10,'import',500.0000,'Nhập kho từ phiếu NK-20260616-8008-ADJ',0,'2026-05-12 00:00:00.000','2026-06-18 06:51:45.721','2026-06-18 06:51:45.721'),(306,153,5,NULL,60,NULL,10,'adjustment',-5000.0000,'Void & re-receive từ phiếu NK-20260616-2090-ADJ-ADJ',0,'2026-04-05 00:00:00.000','2026-06-18 06:55:06.983','2026-06-18 06:55:06.983'),(307,157,5,NULL,64,NULL,10,'import',5000.0000,'Nhập kho từ phiếu NK-20260616-2090-ADJ-ADJ',0,'2026-04-05 00:00:00.000','2026-06-18 06:55:07.008','2026-06-18 06:55:07.008'),(308,158,5,NULL,53,NULL,11,'import',10000.0000,'Nhập kho từ phiếu NK-20260616-2692',0,'2026-04-17 00:00:00.000','2026-06-18 06:58:28.096','2026-06-18 06:58:28.096'),(309,150,5,NULL,57,NULL,10,'adjustment',-600.0000,'Void & re-receive từ phiếu NK-20260616-0196-ADJ-ADJ',0,'2026-05-03 00:00:00.000','2026-06-18 07:00:05.130','2026-06-18 07:00:05.130'),(310,159,5,NULL,65,NULL,10,'import',600.0000,'Nhập kho từ phiếu NK-20260616-0196-ADJ-ADJ',0,'2026-05-03 00:00:00.000','2026-06-18 07:00:05.156','2026-06-18 07:00:05.156'),(311,159,5,NULL,65,NULL,10,'adjustment',-600.0000,'Void & re-receive từ phiếu NK-20260616-0196-ADJ-ADJ-ADJ',0,'2026-05-03 00:00:00.000','2026-06-18 07:03:01.035','2026-06-18 07:03:01.035'),(312,160,5,NULL,66,NULL,10,'import',600.0000,'Nhập kho từ phiếu NK-20260616-0196-ADJ-ADJ-ADJ',0,'2026-05-03 00:00:00.000','2026-06-18 07:03:01.053','2026-06-18 07:03:01.053'),(313,161,5,NULL,50,NULL,11,'import',2500.0000,'Nhập kho từ phiếu NK-20260616-2011',0,'2026-05-04 00:00:00.000','2026-06-18 07:14:09.929','2026-06-18 07:14:09.929'),(314,162,5,NULL,49,NULL,11,'import',2500.0000,'Nhập kho từ phiếu NK-20260616-1246',0,'2026-05-04 00:00:00.000','2026-06-24 03:36:34.831','2026-06-24 03:36:34.831'),(315,163,5,NULL,69,NULL,10,'import',2200.0000,'Nhập kho từ phiếu NK-20260624-9530',0,'2026-05-04 00:00:00.000','2026-06-24 04:01:52.980','2026-06-24 04:01:52.980'),(316,164,5,NULL,68,NULL,12,'import',12000000.0000,'Nhập kho từ phiếu NK-20260617-7002',0,'2026-05-07 00:00:00.000','2026-06-24 04:10:08.190','2026-06-24 04:10:08.190'),(317,151,5,NULL,58,NULL,10,'adjustment',-11000.0000,'Void & re-receive từ phiếu NK-20260616-3606-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:14:04.480','2026-06-24 04:14:04.480'),(318,165,5,NULL,70,NULL,10,'import',11000000.0000,'Nhập kho từ phiếu NK-20260616-3606-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:14:04.502','2026-06-24 04:14:04.502'),(319,165,5,NULL,70,NULL,10,'adjustment',-11000000.0000,'Void & re-receive từ phiếu NK-20260616-3606-ADJ-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:15:13.331','2026-06-24 04:15:13.331'),(320,166,5,NULL,71,NULL,10,'import',11000.0000,'Nhập kho từ phiếu NK-20260616-3606-ADJ-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:15:13.351','2026-06-24 04:15:13.351'),(321,167,5,NULL,72,NULL,10,'import',1000.0000,'Nhập kho từ phiếu NK-20260624-0551',0,'2026-05-07 00:00:00.000','2026-06-24 04:18:38.697','2026-06-24 04:18:38.697'),(322,156,5,NULL,63,NULL,10,'adjustment',-500.0000,'Void & re-receive từ phiếu NK-20260616-8008-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:20:05.851','2026-06-24 04:20:05.851'),(323,168,5,NULL,73,NULL,10,'import',500.0000,'Nhập kho từ phiếu NK-20260616-8008-ADJ-ADJ',0,'2026-05-12 00:00:00.000','2026-06-24 04:20:05.875','2026-06-24 04:20:05.875'),(324,169,5,NULL,74,NULL,10,'import',5000.0000,'Nhập kho từ phiếu NK-20260624-0821',0,'2026-05-07 00:00:00.000','2026-06-24 04:26:51.646','2026-06-24 04:26:51.646'),(325,170,5,NULL,76,NULL,10,'import',5000.0000,'Nhập kho từ phiếu NK-20260624-2532',0,'2026-04-03 00:00:00.000','2026-06-24 05:03:03.445','2026-06-24 05:03:03.445'),(326,171,5,NULL,77,NULL,10,'import',300.0000,'Nhập kho từ phiếu NK-20260624-3452',0,'2026-05-11 00:00:00.000','2026-06-24 05:07:12.284','2026-06-24 05:07:12.284'),(327,172,5,NULL,78,NULL,10,'import',1500.0000,'Nhập kho từ phiếu NK-20260624-3682',0,'2026-05-18 00:00:00.000','2026-06-24 05:40:12.517','2026-06-24 05:40:12.517'),(328,173,5,NULL,79,NULL,10,'import',200.0000,'Nhập kho từ phiếu NK-20260624-6911',0,'2026-05-03 00:00:00.000','2026-06-24 06:07:19.743','2026-06-24 06:07:19.743');
/*!40000 ALTER TABLE `inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json NOT NULL,
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `notifications_user_id_fkey` (`user_id`) USING BTREE,
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (57,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"29\", \"actionType\": \"created\"}',NULL,'2026-06-12 08:52:55.345','2026-06-12 08:52:55.345'),(58,5,'purchase_request_event','{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"29\", \"actionType\": \"updated\"}',NULL,'2026-06-12 08:57:43.175','2026-06-12 08:57:43.175'),(59,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"29\", \"actionType\": \"submitted\"}',NULL,'2026-06-12 08:57:43.715','2026-06-12 08:57:43.715'),(60,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"30\", \"actionType\": \"created\"}',NULL,'2026-06-15 09:31:33.315','2026-06-15 09:31:33.315'),(61,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"30\", \"actionType\": \"submitted\"}',NULL,'2026-06-15 09:31:33.569','2026-06-15 09:31:33.569'),(62,5,'purchase_request_event','{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 04:29:27.001','2026-06-16 04:29:27.001'),(63,5,'purchase_request_event','{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 04:29:49.485','2026-06-16 04:29:49.485'),(64,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"30\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 04:29:49.650','2026-06-16 04:29:49.650'),(65,5,'purchase_request_event','{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 04:30:32.409','2026-06-16 04:30:32.409'),(66,5,'purchase_request_event','{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 04:30:49.383','2026-06-16 04:30:49.383'),(67,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"30\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 04:30:49.572','2026-06-16 04:30:49.572'),(68,5,'purchase_request_event','{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 06:01:54.050','2026-06-16 06:01:54.050'),(69,5,'purchase_request_event','{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"30\", \"actionType\": \"updated\"}',NULL,'2026-06-16 06:02:35.578','2026-06-16 06:02:35.578'),(70,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"30\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:02:35.695','2026-06-16 06:02:35.695'),(71,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"31\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:09:33.264','2026-06-16 06:09:33.264'),(72,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"31\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:09:33.410','2026-06-16 06:09:33.410'),(73,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"32\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:12:19.614','2026-06-16 06:12:19.614'),(74,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"32\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:12:19.943','2026-06-16 06:12:19.943'),(75,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"33\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:14:03.691','2026-06-16 06:14:03.691'),(76,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"33\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:14:03.998','2026-06-16 06:14:03.998'),(77,5,'purchase_request_event','{\"action\": \"Thu hồi phiếu về bản nháp\", \"requestId\": \"33\", \"actionType\": \"updated\"}',NULL,'2026-06-16 06:15:37.283','2026-06-16 06:15:37.283'),(78,5,'purchase_request_event','{\"action\": \"Lưu cập nhật bản nháp\", \"requestId\": \"33\", \"actionType\": \"updated\"}',NULL,'2026-06-16 06:15:42.065','2026-06-16 06:15:42.065'),(79,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"33\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:15:42.330','2026-06-16 06:15:42.330'),(80,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"34\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:44:52.188','2026-06-16 06:44:52.188'),(81,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"34\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:44:52.518','2026-06-16 06:44:52.518'),(82,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"35\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:46:40.078','2026-06-16 06:46:40.078'),(83,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"35\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:46:42.475','2026-06-16 06:46:42.475'),(84,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"36\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:48:36.796','2026-06-16 06:48:36.796'),(85,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"36\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:48:37.023','2026-06-16 06:48:37.023'),(86,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"37\", \"actionType\": \"created\"}',NULL,'2026-06-16 06:56:09.455','2026-06-16 06:56:09.455'),(87,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"37\", \"actionType\": \"submitted\"}',NULL,'2026-06-16 06:56:09.697','2026-06-16 06:56:09.697'),(88,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"38\", \"actionType\": \"created\"}',NULL,'2026-06-24 03:58:41.258','2026-06-24 03:58:41.258'),(89,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"38\", \"actionType\": \"submitted\"}',NULL,'2026-06-24 03:58:41.419','2026-06-24 03:58:41.419'),(90,5,'purchase_request_event','{\"action\": \"Tạo bản nháp PO\", \"requestId\": \"39\", \"actionType\": \"created\"}',NULL,'2026-06-24 04:48:44.893','2026-06-24 04:48:44.893'),(91,5,'purchase_request_event','{\"action\": \"Gửi phiếu cho thu mua\", \"requestId\": \"39\", \"actionType\": \"submitted\"}',NULL,'2026-06-24 04:48:45.220','2026-06-24 04:48:45.220');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opening_stock_declarations`
--

DROP TABLE IF EXISTS `opening_stock_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opening_stock_declarations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `declaration_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','posted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `source` enum('manual','excel') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `posted_by` bigint unsigned DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `opening_stock_declarations_declaration_ref_key` (`declaration_ref`) USING BTREE,
  KEY `opening_stock_declarations_status_idx` (`status`) USING BTREE,
  KEY `opening_stock_declarations_created_by_fkey` (`created_by`) USING BTREE,
  KEY `opening_stock_declarations_posted_by_fkey` (`posted_by`) USING BTREE,
  CONSTRAINT `opening_stock_declarations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_declarations_posted_by_fkey` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opening_stock_declarations`
--

LOCK TABLES `opening_stock_declarations` WRITE;
/*!40000 ALTER TABLE `opening_stock_declarations` DISABLE KEYS */;
INSERT INTO `opening_stock_declarations` VALUES (2,'OPEN-20260608-1780892664818','draft','manual',NULL,NULL,1,NULL,NULL,'2026-06-08 11:24:24.819','2026-06-08 11:24:24.819');
/*!40000 ALTER TABLE `opening_stock_declarations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opening_stock_item_documents`
--

DROP TABLE IF EXISTS `opening_stock_item_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opening_stock_item_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `doc_type` enum('Invoice','COA','MSDS','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `opening_stock_item_documents_item_id_idx` (`item_id`) USING BTREE,
  KEY `opening_stock_item_documents_uploaded_by_fkey` (`uploaded_by`) USING BTREE,
  CONSTRAINT `opening_stock_item_documents_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `opening_stock_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_item_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=318 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opening_stock_item_documents`
--

LOCK TABLES `opening_stock_item_documents` WRITE;
/*!40000 ALTER TABLE `opening_stock_item_documents` DISABLE KEYS */;
INSERT INTO `opening_stock_item_documents` VALUES (210,97,'Invoice','uploads/opening-stock/c2375e33-328a-4006-ae82-82fdc104292b.pdf','HÄ_8164.pdf','application/pdf',319420,1,'2026-06-12 15:28:05.716','2026-06-12 15:28:05.716'),(211,98,'MSDS','uploads/opening-stock/043e0bac-57fe-4e09-8cfe-6497cccc9ec4.pdf','MSDS_Propylene Glycol_GX250204L1.pdf','application/pdf',324974,1,'2026-06-12 15:28:05.952','2026-06-12 15:28:05.952'),(212,98,'COA','uploads/opening-stock/98ce2d0a-6d75-4d49-947d-c0c1a97f970c.pdf','COA_Propylene Glycol_GX250204L1.pdf','application/pdf',740648,1,'2026-06-12 15:28:06.318','2026-06-12 15:28:06.318'),(213,98,'Invoice','uploads/opening-stock/e12c07b6-9e73-47e0-93ca-e1ed1c90f4d9.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:28:06.480','2026-06-12 15:28:06.480'),(214,99,'Invoice','uploads/opening-stock/aedc644b-2393-45bc-a365-eb049536868f.pdf','HÄ_4066.pdf','application/pdf',292883,1,'2026-06-12 15:28:11.584','2026-06-12 15:28:11.584'),(215,100,'MSDS','uploads/opening-stock/094c3e64-d1ba-4348-9319-61f411130970.pdf','MSDS_Glycerin_014125IND3C5L.pdf','application/pdf',110736,1,'2026-06-12 15:28:11.798','2026-06-12 15:28:11.798'),(216,100,'COA','uploads/opening-stock/b48a1718-7127-4ea2-ac39-35c63fe53125.pdf','COA_Glycerin_014125IND3C5L.pdf','application/pdf',489731,1,'2026-06-12 15:28:12.159','2026-06-12 15:28:12.159'),(217,101,'MSDS','uploads/opening-stock/036e0a76-4ae3-4dab-8429-842a65fabb39.pdf','MSDS_Glycerin_TEST REPORT.pdf','application/pdf',65334,1,'2026-06-12 15:28:13.663','2026-06-12 15:28:13.663'),(218,101,'COA','uploads/opening-stock/b829c75c-e0e7-4361-bce9-0c98417cd990.pdf','COA_Glycerin_TEST REPORT.pdf','application/pdf',236831,1,'2026-06-12 15:28:15.261','2026-06-12 15:28:15.261'),(219,101,'Invoice','uploads/opening-stock/c72844e1-6e4c-4540-b862-8fa939c4dc59.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:28:16.334','2026-06-12 15:28:16.334'),(220,102,'MSDS','uploads/opening-stock/61a324d8-633e-4ee9-aaeb-aac8a7bc425b.pdf','MSDS_Glycerin_014125IND3C5L.pdf','application/pdf',110736,1,'2026-06-12 15:28:16.661','2026-06-12 15:28:16.661'),(221,102,'COA','uploads/opening-stock/97b08d3e-b567-41fb-ba70-b028eeb7d57e.pdf','COA_Glycerin_014125IND3C5L.pdf','application/pdf',489731,1,'2026-06-12 15:28:17.168','2026-06-12 15:28:17.168'),(222,102,'Invoice','uploads/opening-stock/be1b6806-30a8-46a1-99a9-fcf1d7ba18f5.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:28:17.532','2026-06-12 15:28:17.532'),(223,103,'MSDS','uploads/opening-stock/7ed01c3e-ba54-4672-850e-fa4a277f0025.pdf','MSDS_Glycerin_014125IND3C5L.pdf','application/pdf',110736,1,'2026-06-12 15:28:17.781','2026-06-12 15:28:17.781'),(224,103,'COA','uploads/opening-stock/67cfb7cf-2043-4d3a-8d36-7f057f0ed36b.pdf','COA_Glycerin_014125IND3C5L.pdf','application/pdf',489731,1,'2026-06-12 15:28:18.308','2026-06-12 15:28:18.308'),(225,103,'Invoice','uploads/opening-stock/22bc1667-3cb8-41ef-8bce-bd06d65a1ac2.pdf','HÄ_4125.pdf','application/pdf',292142,1,'2026-06-12 15:28:18.650','2026-06-12 15:28:18.650'),(226,104,'MSDS','uploads/opening-stock/4b13a872-5c15-4803-8a78-ab38a160e541.pdf','MSDS_Tetrasodium EDTA_38322009T0.pdf','application/pdf',22280,1,'2026-06-12 15:28:18.809','2026-06-12 15:28:18.809'),(227,104,'COA','uploads/opening-stock/e0199e0f-12fc-4901-bc19-793eaa65ddf4.jpg','COA_Tetrasodium EDTA_38322009T0.jpg','image/jpeg',195896,1,'2026-06-12 15:28:18.989','2026-06-12 15:28:18.989'),(228,104,'Invoice','uploads/opening-stock/a584cdd0-6244-4354-b2d1-bd9dfac05683.jpg','HÄ_638.JPG','image/jpeg',93446,1,'2026-06-12 15:28:19.216','2026-06-12 15:28:19.216'),(229,105,'MSDS','uploads/opening-stock/0fd4c3b9-c32d-4e54-8760-a31eaabdb462.pdf','MSDS_Allantoin_25LOT01156.pdf','application/pdf',81979,1,'2026-06-12 15:28:19.476','2026-06-12 15:28:19.476'),(230,105,'COA','uploads/opening-stock/241830fe-b109-4538-9d60-ca9374054e77.pdf','COA_Allantoin_25LOT01156.pdf','application/pdf',113372,1,'2026-06-12 15:28:19.592','2026-06-12 15:28:19.592'),(231,106,'MSDS','uploads/opening-stock/05400366-5e66-481e-8fe2-a7467c24b9cb.pdf','MSDS_Allantoin_20241227.pdf','application/pdf',212621,1,'2026-06-12 15:28:23.060','2026-06-12 15:28:23.060'),(232,106,'COA','uploads/opening-stock/31828b6a-ae8e-4dc2-9cde-0dce8e77f15c.pdf','COA_Allantoin_20241227.pdf','application/pdf',551927,1,'2026-06-12 15:28:23.531','2026-06-12 15:28:23.531'),(233,106,'Invoice','uploads/opening-stock/694aeda2-90d2-42d1-8c1f-af2e4d7c4377.pdf','HÄ_1390.pdf','application/pdf',329286,1,'2026-06-12 15:28:23.715','2026-06-12 15:28:23.715'),(234,107,'MSDS','uploads/opening-stock/009f4a8c-a914-45f4-8daa-1178857c2bda.pdf','MSDS_Allantoin_25LOT01156.pdf','application/pdf',81979,1,'2026-06-12 15:28:23.930','2026-06-12 15:28:23.930'),(235,107,'COA','uploads/opening-stock/0f57b2f0-db74-45b5-af22-ff11415eb38c.pdf','COA_Allantoin_25LOT01156.pdf','application/pdf',113372,1,'2026-06-12 15:28:24.005','2026-06-12 15:28:24.005'),(236,107,'Invoice','uploads/opening-stock/6c8d52b7-045a-4491-a2a5-67c63f425980.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:28:24.222','2026-06-12 15:28:24.222'),(237,108,'MSDS','uploads/opening-stock/3420a416-a10c-49f1-af80-b4c489ba0abf.pdf','MSDS_D-Panthenol_PA2407019.pdf','application/pdf',233886,1,'2026-06-12 15:28:24.465','2026-06-12 15:28:24.465'),(238,108,'COA','uploads/opening-stock/fca51afa-bc73-4d00-aa7b-f9a3b8f63e0f.pdf','COA_D-Panthenol_PA2407019.pdf','application/pdf',375369,1,'2026-06-12 15:28:24.745','2026-06-12 15:28:24.745'),(239,108,'Invoice','uploads/opening-stock/ba29b702-bded-4c92-8a73-ce0cf17d6640.pdf','HÄ_35.pdf','application/pdf',111443,1,'2026-06-12 15:28:25.106','2026-06-12 15:28:25.106'),(240,109,'MSDS','uploads/opening-stock/6ce67fa1-e607-42f0-8dc3-4e3bb8ee278f.pdf','MSDS_D-Panthenol_TL02409085.pdf','application/pdf',116796,1,'2026-06-12 15:28:25.567','2026-06-12 15:28:25.567'),(241,109,'COA','uploads/opening-stock/bb2dabe7-b446-4897-9a2a-da96ff0e669b.pdf','COA_D-Panthenol_TL02409085.pdf','application/pdf',800829,1,'2026-06-12 15:28:25.878','2026-06-12 15:28:25.878'),(242,109,'Invoice','uploads/opening-stock/d6e37823-8a0c-4846-983c-4c6cddbf8144.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:28:26.024','2026-06-12 15:28:26.024'),(243,110,'MSDS','uploads/opening-stock/9fdd6e14-adbf-41fd-8ab4-54418b1bc16a.pdf','MSDS_D-Panthenol_PA2407019.pdf','application/pdf',233886,1,'2026-06-12 15:28:26.269','2026-06-12 15:28:26.269'),(244,110,'COA','uploads/opening-stock/c04c4ebf-8a7d-44ab-adad-34dbc99a13d8.pdf','COA_D-Panthenol_PA2407019.pdf','application/pdf',375369,1,'2026-06-12 15:28:26.496','2026-06-12 15:28:26.496'),(245,110,'Invoice','uploads/opening-stock/4eb3baa2-b6ea-4492-92e0-cc68ef9c5368.pdf','HÄ_3306.pdf','application/pdf',293530,1,'2026-06-12 15:28:26.717','2026-06-12 15:28:26.717'),(246,111,'MSDS','uploads/opening-stock/60e488d6-489a-46ea-af27-e25705b1ebca.pdf','MSDS_D-Panthenol_PA2407019.pdf','application/pdf',233886,1,'2026-06-12 15:28:27.007','2026-06-12 15:28:27.007'),(247,111,'COA','uploads/opening-stock/57780917-c514-4e99-b790-c8cdd8d9f7e5.pdf','COA_D-Panthenol_PA2407019.pdf','application/pdf',375369,1,'2026-06-12 15:28:27.272','2026-06-12 15:28:27.272'),(248,111,'Invoice','uploads/opening-stock/0c09fa29-a4d8-4ebd-83cb-32722430bae9.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:28:27.439','2026-06-12 15:28:27.439'),(249,112,'MSDS','uploads/opening-stock/4d1e0b94-02f1-467d-9e21-f3f55cde3d9a.pdf','MSDS_Ginger Ex_EI2501.pdf','application/pdf',109468,1,'2026-06-12 15:28:27.613','2026-06-12 15:28:27.613'),(250,112,'COA','uploads/opening-stock/e8f9674c-6b28-4c57-8f5e-8beb53cf21ae.pdf','COA_Ginger Ex_EI2501.pdf','application/pdf',63863,1,'2026-06-12 15:28:27.711','2026-06-12 15:28:27.711'),(251,112,'Invoice','uploads/opening-stock/4193ed30-7b19-4ce1-8609-413ef7a6417e.pdf','HÄ_997.pdf','application/pdf',272496,1,'2026-06-12 15:28:28.424','2026-06-12 15:28:28.424'),(252,113,'MSDS','uploads/opening-stock/574f318a-90d0-4b7d-82aa-d0d33a67cf09.pdf','MSDS_Ginger Ex_EI2501.pdf','application/pdf',109468,1,'2026-06-12 15:28:28.619','2026-06-12 15:28:28.619'),(253,113,'COA','uploads/opening-stock/5268f6f9-89d8-4f8e-8fcc-33da6a1ed441.pdf','COA_Ginger Ex_EI2501.pdf','application/pdf',63863,1,'2026-06-12 15:28:28.685','2026-06-12 15:28:28.685'),(254,113,'Invoice','uploads/opening-stock/1ec04ab0-48d0-4e66-bfc5-24554afac6cc.jpg','HÄ_1760.JPG','image/jpeg',79448,1,'2026-06-12 15:28:28.759','2026-06-12 15:28:28.759'),(255,114,'MSDS','uploads/opening-stock/4996cb17-bdf2-4087-a1d0-2323f19921e6.pdf','MSDS_Ricobio JA7_25091685.pdf','application/pdf',221185,1,'2026-06-12 15:28:28.982','2026-06-12 15:28:28.982'),(256,114,'COA','uploads/opening-stock/7de2d8d1-e27a-4c7a-871d-d0bad7ee4f44.pdf','COA_Ricobio JA7_25091685.pdf','application/pdf',120352,1,'2026-06-12 15:28:29.130','2026-06-12 15:28:29.130'),(257,114,'Invoice','uploads/opening-stock/75e7a79d-c4e6-417a-9a45-b4e271624a76.pdf','HÄ_1287.pdf','application/pdf',271606,1,'2026-06-12 15:28:29.360','2026-06-12 15:28:29.360'),(258,115,'MSDS','uploads/opening-stock/cbd4bdab-1f16-439e-9ee6-bdbb1bb21b1b.pdf','MSDS_Carbomer_B2E04349.pdf','application/pdf',188714,1,'2026-06-12 15:28:29.546','2026-06-12 15:28:29.546'),(259,115,'COA','uploads/opening-stock/8891dd70-3b08-418c-b610-71a870c73d65.pdf','COA_Carbomer_B2E04349.pdf','application/pdf',144826,1,'2026-06-12 15:28:29.654','2026-06-12 15:28:29.654'),(260,115,'Invoice','uploads/opening-stock/df52d100-1fdd-4c0d-bf45-606a0f63ca71.jpg','HÄ_9911.jpg','image/jpeg',84276,1,'2026-06-12 15:28:29.739','2026-06-12 15:28:29.739'),(261,116,'MSDS','uploads/opening-stock/47cc09c8-e4cd-4f41-b05e-ae8f45b576e0.pdf','MSDS_Carbomer_B2F04120.pdf','application/pdf',188714,1,'2026-06-12 15:28:30.006','2026-06-12 15:28:30.006'),(262,116,'COA','uploads/opening-stock/2847394e-dc6e-468c-9982-7e6ab6f9e602.pdf','COA_Carbomer_B2F04120.pdf','application/pdf',740864,1,'2026-06-12 15:28:30.806','2026-06-12 15:28:30.806'),(263,116,'Invoice','uploads/opening-stock/a74d3d7c-aba4-4bac-ab2b-5a0fc749aa11.png','HÄ_12118.PNG','image/png',143016,1,'2026-06-12 15:28:30.969','2026-06-12 15:28:30.969'),(264,117,'MSDS','uploads/opening-stock/881feed5-ce5f-46a0-ae9f-3bd489bdd91a.pdf','MSDS_Carbomer_B2F04120.pdf','application/pdf',188714,1,'2026-06-12 15:28:31.244','2026-06-12 15:28:31.244'),(265,117,'COA','uploads/opening-stock/0634c256-deef-498b-a17b-f4a87631258f.pdf','COA_Carbomer_B2F04120.pdf','application/pdf',740864,1,'2026-06-12 15:28:32.263','2026-06-12 15:28:32.263'),(266,117,'Invoice','uploads/opening-stock/05883763-67ca-40ac-9bba-12bbcdf18e16.pdf','HÄ_35.pdf','application/pdf',111443,1,'2026-06-12 15:28:32.377','2026-06-12 15:28:32.377'),(267,118,'MSDS','uploads/opening-stock/c8f119e1-ab3b-498c-9a83-a9fd45702837.pdf','MSDS_Carbomer_B2F04120.pdf','application/pdf',188714,1,'2026-06-12 15:28:32.692','2026-06-12 15:28:32.692'),(268,118,'COA','uploads/opening-stock/c7bfb5d7-28be-4148-8072-4ec057cec546.pdf','COA_Carbomer_B2F04120.pdf','application/pdf',740864,1,'2026-06-12 15:28:33.078','2026-06-12 15:28:33.078'),(269,118,'Invoice','uploads/opening-stock/0c935f5a-6f08-4c89-8b53-18f0215869ff.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:28:33.288','2026-06-12 15:28:33.288'),(270,119,'MSDS','uploads/opening-stock/8f83ce35-beb7-40b7-8d90-8f005611e0bc.pdf','MSDS_Tocopheryl Acetate_32666436W0.pdf','application/pdf',169447,1,'2026-06-12 15:28:33.507','2026-06-12 15:28:33.507'),(271,119,'Invoice','uploads/opening-stock/e8245a66-9514-4d62-b4b5-ddad1e7a2acb.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:28:34.862','2026-06-12 15:28:34.862'),(272,120,'MSDS','uploads/opening-stock/d4439444-6bfc-4fca-82c3-fa4876e5fe93.pdf','MSDS_Tocopheryl Acetate_UT25100294.pdf','application/pdf',229657,1,'2026-06-12 15:28:35.369','2026-06-12 15:28:35.369'),(273,121,'MSDS','uploads/opening-stock/0bfc38ba-3270-4f17-893b-936556a2b587.pdf','MSDS_Tocopheryl Acetate_UT24110283.pdf','application/pdf',229657,1,'2026-06-12 15:28:37.707','2026-06-12 15:28:37.707'),(274,122,'MSDS','uploads/opening-stock/4828fce1-5ce8-42e7-980a-58def5a0ae03.pdf','MSDS_Vanillyl Butyl Ether_AT117926.pdf','application/pdf',342384,1,'2026-06-12 15:28:41.154','2026-06-12 15:28:41.154'),(275,122,'COA','uploads/opening-stock/3dc49b61-264c-4278-8ab4-0c992fd6bd29.pdf','COA_Vanillyl Butyl Ether_AT117926.pdf','application/pdf',409738,1,'2026-06-12 15:28:41.374','2026-06-12 15:28:41.374'),(276,122,'Invoice','uploads/opening-stock/d0864b73-5e41-43fb-9477-c179d72d256f.jpg','HÄ_2911.jpg','image/jpeg',80614,1,'2026-06-12 15:28:41.499','2026-06-12 15:28:41.499'),(277,123,'MSDS','uploads/opening-stock/4000a762-9565-44ec-80b8-1f1641526cf2.pdf','MSDS_Vanillyl Butyl Ether_AT115815.pdf','application/pdf',342384,1,'2026-06-12 15:28:41.835','2026-06-12 15:28:41.835'),(278,123,'COA','uploads/opening-stock/77c327dc-b962-4cce-85ea-6d5170da1cb8.pdf','COA_Vanillyl Butyl Ether_AT115815.pdf','application/pdf',433329,1,'2026-06-12 15:28:42.423','2026-06-12 15:28:42.423'),(279,123,'Invoice','uploads/opening-stock/f7323000-b303-4d62-84f1-90964758c597.jpg','HÄ_3120.jpg','image/jpeg',81762,1,'2026-06-12 15:28:42.496','2026-06-12 15:28:42.496'),(280,124,'MSDS','uploads/opening-stock/4137b62d-7d41-46b7-9639-6f44bfee0810.pdf','MSDS_Vanillyl Butyl Ether_AT118027.pdf','application/pdf',342384,1,'2026-06-12 15:28:42.774','2026-06-12 15:28:42.774'),(281,124,'COA','uploads/opening-stock/7e5fe6bb-28d5-4448-9fbb-9ce6d49d369f.pdf','COA_Vanillyl Butyl Ether_AT118027.pdf','application/pdf',292296,1,'2026-06-12 15:28:42.914','2026-06-12 15:28:42.914'),(282,124,'Invoice','uploads/opening-stock/b891a2eb-00a0-4e75-bf43-97bfaa11b676.jpg','HÄ_775.JPG','image/jpeg',116381,1,'2026-06-12 15:28:43.026','2026-06-12 15:28:43.026'),(283,125,'MSDS','uploads/opening-stock/ff261877-0653-4b22-93ec-7e28d2996281.pdf','MSDS_PEHG_CZ5I165-2703.pdf','application/pdf',210306,1,'2026-06-12 15:28:43.309','2026-06-12 15:28:43.309'),(284,125,'COA','uploads/opening-stock/fc792498-d74b-4439-bc8c-4f62b8033bf7.pdf','COA_PEHG_CZ5I165-2703.pdf','application/pdf',487680,1,'2026-06-12 15:28:43.708','2026-06-12 15:28:43.708'),(285,125,'Invoice','uploads/opening-stock/04832e99-d3e3-4132-9e71-acc45229ba2c.pdf','HÄ_2557.pdf','application/pdf',151566,1,'2026-06-12 15:28:44.945','2026-06-12 15:28:44.945'),(286,126,'MSDS','uploads/opening-stock/dc1a2ab7-8338-4075-8d77-013e95e577a4.pdf','MSDS_PEHG_IP1313.pdf','application/pdf',264192,1,'2026-06-12 15:28:45.179','2026-06-12 15:28:45.179'),(287,126,'COA','uploads/opening-stock/406a1676-6c13-44e8-8d23-ddac444744c6.pdf','COA_PEHG_IP1313.pdf','application/pdf',154431,1,'2026-06-12 15:28:45.453','2026-06-12 15:28:45.453'),(288,126,'Invoice','uploads/opening-stock/8087670e-480a-4c6a-8468-3eb498be7dad.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:28:45.696','2026-06-12 15:28:45.696'),(289,127,'MSDS','uploads/opening-stock/8ee03bc2-afe6-42e4-a0a9-89e1e42f9a84.pdf','MSDS_CHANH SA_2603071025.pdf','application/pdf',309343,1,'2026-06-12 15:28:45.946','2026-06-12 15:28:45.946'),(290,127,'COA','uploads/opening-stock/6175fe7b-7cf9-479d-80f1-70d40e441344.pdf','COA_CHANH SA_2603071025.pdf','application/pdf',359993,1,'2026-06-12 15:28:46.419','2026-06-12 15:28:46.419'),(291,127,'Invoice','uploads/opening-stock/94f5ed95-e11d-4c52-8741-3f93e6e7fa80.pdf','HÄ_4164.pdf','application/pdf',264952,1,'2026-06-12 15:28:46.616','2026-06-12 15:28:46.616'),(292,128,'MSDS','uploads/opening-stock/44d5cdd3-028f-4069-8e81-41b3f79cbb0f.pdf','MSDS_Cosman CR530_20250206.pdf','application/pdf',244275,1,'2026-06-12 15:28:46.959','2026-06-12 15:28:46.959'),(293,128,'COA','uploads/opening-stock/bad30029-7461-4fb8-98b5-92cde26ae914.pdf','COA_Cosman CR530_20250206.pdf','application/pdf',351048,1,'2026-06-12 15:28:47.185','2026-06-12 15:28:47.185'),(294,128,'Invoice','uploads/opening-stock/5aa70469-4f37-4aeb-ab5c-298a6a8740b4.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:28:47.390','2026-06-12 15:28:47.390'),(295,129,'MSDS','uploads/opening-stock/8ebbfada-685e-4382-a314-adaef1c808bc.pdf','MSDS_Propylene Glycol_GX250204L1.pdf','application/pdf',324974,1,'2026-06-12 15:30:48.626','2026-06-12 15:30:48.626'),(296,129,'COA','uploads/opening-stock/6a8e9e13-dd1d-43c4-a749-d1b09925b4a9.pdf','COA_Propylene Glycol_GX250204L1.pdf','application/pdf',740648,1,'2026-06-12 15:30:49.277','2026-06-12 15:30:49.277'),(297,129,'Invoice','uploads/opening-stock/5d7d3eac-a41f-4847-a06d-0601d98c3dc1.pdf','HÄ_1361.pdf','application/pdf',325301,1,'2026-06-12 15:30:49.477','2026-06-12 15:30:49.477'),(298,130,'COA','uploads/opening-stock/9dc8d19b-1136-4cad-b33e-1791a6adc0c9.pdf','COA_Methyl Salicylate_2502009.pdf','application/pdf',774601,1,'2026-06-12 15:30:54.275','2026-06-12 15:30:54.275'),(299,130,'Invoice','uploads/opening-stock/9db11706-156b-4a5d-81c2-0365ef1849c1.png','HÄ_12118.PNG','image/png',143016,1,'2026-06-12 15:30:54.434','2026-06-12 15:30:54.434'),(300,131,'COA','uploads/opening-stock/bede5b2f-2cfd-4c77-8f08-847da8864698.pdf','COA_Methyl Salicylate_2502009.pdf','application/pdf',774601,1,'2026-06-12 15:30:58.304','2026-06-12 15:30:58.304'),(301,131,'Invoice','uploads/opening-stock/b6020936-35ff-421d-8604-a9fb033423f6.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-12 15:30:58.470','2026-06-12 15:30:58.470'),(302,133,'MSDS','uploads/opening-stock/e001300d-890e-449c-a716-37b21f904999.pdf','MSDS_Ricobio JA7_25091685.pdf','application/pdf',221185,1,'2026-06-15 11:02:27.790','2026-06-15 11:02:27.790'),(303,133,'COA','uploads/opening-stock/541d2a74-a71b-48fe-950c-0ad28187322f.pdf','COA_Ricobio JA7_25091685.pdf','application/pdf',120352,1,'2026-06-15 11:02:28.019','2026-06-15 11:02:28.019'),(304,133,'Invoice','uploads/opening-stock/807d15b9-8f07-46ac-aba5-ed4d72943f13.pdf','HÄ_723.pdf','application/pdf',273473,1,'2026-06-15 11:02:28.490','2026-06-15 11:02:28.490'),(305,134,'MSDS','uploads/opening-stock/e8525445-befd-444d-98a0-5275b96106f9.pdf','MSDS_Ricobio JA7_25091685.pdf','application/pdf',221185,1,'2026-06-15 11:02:28.823','2026-06-15 11:02:28.823'),(306,134,'COA','uploads/opening-stock/b654d179-a4a6-4d2d-bc7e-8a60a3dc9053.pdf','COA_Ricobio JA7_25091685.pdf','application/pdf',120352,1,'2026-06-15 11:02:29.033','2026-06-15 11:02:29.033'),(307,134,'Invoice','uploads/opening-stock/fa4e2205-285c-4b50-bb20-b763e5134c3d.pdf','HÄ_1777.pdf','application/pdf',271566,1,'2026-06-15 11:02:29.249','2026-06-15 11:02:29.249'),(308,135,'MSDS','uploads/opening-stock/d63ce38f-099f-4510-9ad7-1bf42947da2d.pdf','MSDS_Cosman CR530_20250228.pdf','application/pdf',244275,1,'2026-06-15 11:02:29.914','2026-06-15 11:02:29.914'),(309,135,'COA','uploads/opening-stock/ffb27a57-4418-495e-8568-2ab87acd030a.pdf','COA_Cosman CR530_20250228.pdf','application/pdf',328338,1,'2026-06-15 11:02:30.245','2026-06-15 11:02:30.245'),(310,135,'Invoice','uploads/opening-stock/14d6fac7-c7c1-420d-9b85-d968ce7cff16.pdf','HÄ_1829.pdf','application/pdf',291632,1,'2026-06-15 11:02:31.869','2026-06-15 11:02:31.869'),(311,136,'MSDS','uploads/opening-stock/96812f91-35a0-45ef-9c1e-6f8037a7ce0c.pdf','MSDS_Cosman CR530_20250228.pdf','application/pdf',244275,1,'2026-06-15 11:02:32.172','2026-06-15 11:02:32.172'),(312,136,'COA','uploads/opening-stock/c5f50599-983c-4e5d-aff0-e89890babbf7.pdf','COA_Cosman CR530_20250228.pdf','application/pdf',328338,1,'2026-06-15 11:02:32.409','2026-06-15 11:02:32.409'),(313,136,'Invoice','uploads/opening-stock/d6e1524b-448f-4b56-8801-5376617002e4.pdf','HÄ_3306.pdf','application/pdf',293530,1,'2026-06-15 11:02:32.721','2026-06-15 11:02:32.721'),(314,137,'MSDS','uploads/opening-stock/b9dabd48-3f0e-4875-afea-f9eb1e96ada7.pdf','MSDS_Tocopheryl Acetate_UT25100294.pdf','application/pdf',229657,1,'2026-06-15 11:09:34.853','2026-06-15 11:09:34.853'),(315,137,'Invoice','uploads/opening-stock/ff006c01-285e-4909-a3c0-35be3fe020fb.pdf','HÄ_3306.pdf','application/pdf',293530,1,'2026-06-15 11:09:37.925','2026-06-15 11:09:37.925'),(316,138,'MSDS','uploads/opening-stock/743f70bb-6a2c-4618-a65e-7e3b3923c0f5.pdf','MSDS_Tocopheryl Acetate_UT25100294.pdf','application/pdf',229657,1,'2026-06-15 11:09:38.236','2026-06-15 11:09:38.236'),(317,138,'Invoice','uploads/opening-stock/7a2e8c1d-3aa9-429c-978c-ecdc22bf09ae.pdf','HÄ_3548.pdf','application/pdf',293592,1,'2026-06-15 11:09:41.490','2026-06-15 11:09:41.490');
/*!40000 ALTER TABLE `opening_stock_item_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opening_stock_items`
--

DROP TABLE IF EXISTS `opening_stock_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opening_stock_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `declaration_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer_lot_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_date` date NOT NULL,
  `invoice_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15,4) NOT NULL,
  `unit_price_per_kg` decimal(15,2) NOT NULL DEFAULT '0.00',
  `unit_price_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `unit_price_unit_id` bigint unsigned DEFAULT NULL,
  `unit_price_conversion_to_base` decimal(15,4) NOT NULL DEFAULT '1.0000',
  `line_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `has_document` tinyint(1) NOT NULL DEFAULT '0',
  `posting_status` enum('draft','posted','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `posted_batch_id` bigint unsigned DEFAULT NULL,
  `posted_tx_id` bigint unsigned DEFAULT NULL,
  `posted_at` datetime(3) DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `opening_stock_items_declaration_id_product_id_lot_no_key` (`declaration_id`,`product_id`,`lot_no`) USING BTREE,
  KEY `opening_stock_items_product_id_idx` (`product_id`) USING BTREE,
  KEY `opening_stock_items_expiry_date_idx` (`expiry_date`) USING BTREE,
  KEY `opening_stock_items_location_id_fkey` (`location_id`) USING BTREE,
  KEY `opening_stock_items_unit_price_unit_id_idx` (`unit_price_unit_id`) USING BTREE,
  KEY `opening_stock_items_supplier_id_idx` (`supplier_id`) USING BTREE,
  KEY `opening_stock_items_posting_status_idx` (`posting_status`) USING BTREE,
  KEY `opening_stock_items_posted_batch_id_idx` (`posted_batch_id`) USING BTREE,
  KEY `opening_stock_items_posted_tx_id_idx` (`posted_tx_id`) USING BTREE,
  KEY `opening_stock_items_manufacturer_lot_no_idx` (`manufacturer_lot_no`),
  CONSTRAINT `opening_stock_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `opening_stock_declarations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `opening_stock_items_unit_price_unit_id_fkey` FOREIGN KEY (`unit_price_unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opening_stock_items`
--

LOCK TABLES `opening_stock_items` WRITE;
/*!40000 ALTER TABLE `opening_stock_items` DISABLE KEYS */;
INSERT INTO `opening_stock_items` VALUES (97,2,3618,'C815O7R31','C815O7R31','2026-05-01','HĐ_8164','2025-11-24',138,'2024-07-14','2026-07-14',1178.0000,'Kg',1178.0000,46296.00,46296.00,10,1000.0000,54536.69,1,'posted',103,246,'2026-06-12 15:27:57.543',10,NULL,'2026-06-12 15:27:57.515','2026-06-12 15:28:05.724'),(98,2,3618,'GX250204L1','GX250204L1','2026-05-01','HĐ_1361','2026-03-06',132,'2024-11-24','2026-11-24',202000.0000,'Kg',202000.0000,34100.00,34100.00,10,1000.0000,6888200.00,1,'posted',104,247,'2026-06-12 15:28:05.786',10,NULL,'2026-06-12 15:28:05.764','2026-06-12 15:28:06.486'),(99,2,3774,'C815PBJR41','C815PBJR41','2026-05-01','HĐ_4066','2026-04-08',133,'2025-11-19','2027-11-19',70000.0000,'Kg',70000.0000,115000.00,115000.00,10,1000.0000,8050000.00,1,'posted',105,248,'2026-06-12 15:28:06.550',10,NULL,'2026-06-12 15:28:06.522','2026-06-12 15:28:11.593'),(100,2,3700,'014125IND3C5L','014125IND3C5L','2026-05-01','HĐ_11','2026-01-21',126,'2025-09-26','2027-03-26',87391.0000,'Kg',87391.0000,33000.00,33000.00,10,1000.0000,2883903.00,1,'posted',106,249,'2026-06-12 15:28:11.670',10,NULL,'2026-06-12 15:28:11.644','2026-06-12 15:28:12.169'),(101,2,3740,'TEST REPORT','TEST REPORT','2026-05-01','HĐ_1361','2026-03-06',132,'2024-12-23','2026-12-22',117000.0000,'Kg',117000.0000,34000.00,34000.00,10,1000.0000,3978000.00,1,'posted',107,250,'2026-06-12 15:28:13.405',10,NULL,'2026-06-12 15:28:13.377','2026-06-12 15:28:16.340'),(102,2,3769,'014125IND3C5L','014125IND3C5L','2026-05-01','HĐ_3548','2026-03-27',133,'2025-09-26','2027-03-26',60000.0000,'Kg',60000.0000,65000.00,65000.00,10,1000.0000,3900000.00,1,'posted',108,251,'2026-06-12 15:28:16.435',10,NULL,'2026-06-12 15:28:16.414','2026-06-12 15:28:17.538'),(103,2,3769,'014125IND3C5L-001','014125IND3C5L','2026-05-01','HĐ_4125','2026-04-13',133,'2025-09-26','2027-03-26',20000.0000,'Kg',20000.0000,65000.00,65000.00,10,1000.0000,1300000.00,1,'posted',109,252,'2026-06-12 15:28:17.599',10,NULL,'2026-06-12 15:28:17.577','2026-06-12 15:28:18.656'),(104,2,3725,'38322009T0','38322009T0','2026-05-01','HĐ_638','2026-02-03',129,'2025-07-05','2027-01-01',11.0000,'Kg',11.0000,310000.00,310000.00,10,1000.0000,3410.00,1,'posted',110,253,'2026-06-12 15:28:18.720',10,NULL,'2026-06-12 15:28:18.700','2026-06-12 15:28:19.222'),(105,2,3698,'25LOT01156','25LOT01156','2026-05-01','HĐ_11','2026-01-21',126,'2000-02-25','2000-03-01',4712.0000,'Kg',4712.0000,260000.00,260000.00,10,1000.0000,1225120.00,1,'posted',111,254,'2026-06-12 15:28:19.285',10,NULL,'2026-06-12 15:28:19.265','2026-06-12 15:28:19.598'),(106,2,3751,'20241227','20241227','2026-05-01','HĐ_1390','2026-03-09',132,'2024-12-27','2027-12-26',41000.0000,'Kg',41000.0000,135185.00,135185.00,10,1000.0000,5542585.00,1,'posted',112,255,'2026-06-12 15:28:22.793',10,NULL,'2026-06-12 15:28:22.773','2026-06-12 15:28:23.726'),(107,2,3768,'25LOT01156','25LOT01156','2026-05-01','HĐ_3548','2026-03-27',133,'2025-02-01','2030-02-01',5000.0000,'Kg',5000.0000,365000.00,365000.00,10,1000.0000,1825000.00,1,'posted',113,256,'2026-06-12 15:28:23.788',10,NULL,'2026-06-12 15:28:23.770','2026-06-15 15:39:40.903'),(108,2,3682,'PA2407019','PA2407019','2026-05-01','HĐ_35','2025-12-31',144,'2025-02-01','2030-02-01',973.0000,'Kg',973.0000,766500.00,766500.00,10,1000.0000,745804.50,1,'posted',114,257,'2026-06-12 15:28:24.360',10,NULL,'2026-06-12 15:28:24.339','2026-06-15 15:42:21.372'),(109,2,3747,'TL02409085','TL02409085','2026-05-01','HĐ_1361','2026-03-06',132,'2024-09-19','2027-09-19',31300.0000,'Kg',31300.0000,430556.00,430556.00,10,1000.0000,13476402.80,1,'posted',115,258,'2026-06-12 15:28:25.466',10,NULL,'2026-06-12 15:28:25.446','2026-06-12 15:28:26.032'),(110,2,3766,'PA2407019','PA2407019','2026-05-01','HĐ_3306','2026-03-23',133,'2025-02-01','2030-02-01',10000.0000,'Kg',10000.0000,703704.00,703704.00,10,1000.0000,7037040.00,1,'posted',116,259,'2026-06-12 15:28:26.097',10,NULL,'2026-06-12 15:28:26.074','2026-06-15 15:47:17.165'),(111,2,3766,'PA2407019-001','PA2407019','2026-05-01','HĐ_3548','2026-03-27',133,'2025-02-01','2030-02-01',10000.0000,'Kg',10000.0000,722222.00,722222.00,10,1000.0000,7222220.00,1,'posted',117,260,'2026-06-12 15:28:26.839',10,NULL,'2026-06-12 15:28:26.819','2026-06-15 15:47:46.782'),(112,2,3750,'EI2501','EI2501','2026-05-01','HĐ_997','2026-03-06',129,'2025-09-25','2027-09-24',200.0000,'Kg',200.0000,2450000.00,2450000.00,10,1000.0000,490000.00,1,'posted',118,261,'2026-06-12 15:28:27.508',10,NULL,'2026-06-12 15:28:27.481','2026-06-12 15:28:28.431'),(113,2,3750,'EI2501-001','EI2501','2026-05-01','HĐ_1760','2026-04-10',129,'2025-09-25','2027-09-24',200.0000,'Kg',200.0000,2450000.00,2450000.00,10,1000.0000,490000.00,1,'posted',119,262,'2026-06-12 15:28:28.497',10,NULL,'2026-06-12 15:28:28.477','2026-06-12 15:28:28.765'),(114,2,3690,'25091685-001','25091685','2026-05-01','HĐ_1287','2026-04-10',113,'2025-09-16','2027-09-15',300.0000,'Kg',300.0000,3000000.00,3000000.00,10,1000.0000,900000.00,1,'posted',120,263,'2026-06-12 15:28:28.837',10,NULL,'2026-06-12 15:28:28.817','2026-06-12 15:28:29.367'),(115,2,3604,'B2E04349','B2E04349','2026-05-01','HĐ_9911','2025-10-07',133,'2025-01-14','2027-01-31',2000.0000,'Kg',2000.0000,351852.00,351852.00,10,1000.0000,703704.00,1,'posted',121,264,'2026-06-12 15:28:29.431',10,NULL,'2026-06-12 15:28:29.410','2026-06-12 15:28:29.745'),(116,2,3604,'B2F04120-001','B2F04120','2026-05-01','HĐ_12118','2025-11-24',133,'2025-05-05','2027-05-31',20000.0000,'Kg',20000.0000,333333.00,333333.00,10,1000.0000,6666660.00,1,'posted',122,265,'2026-06-12 15:28:29.858',10,NULL,'2026-06-12 15:28:29.839','2026-06-12 15:28:30.976'),(117,2,3687,'B2F04120','B2F04120','2026-05-01','HĐ_35','2025-12-31',144,'2025-05-05','2027-05-31',8300.0000,'Kg',8300.0000,302400.00,302400.00,10,1000.0000,2509920.00,1,'posted',123,266,'2026-06-12 15:28:31.028',10,NULL,'2026-06-12 15:28:31.010','2026-06-12 15:28:32.383'),(118,2,3604,'B2F04120','B2F04120','2026-05-01','HĐ_3548','2026-03-27',133,'2025-05-05','2027-05-31',10000.0000,'Kg',10000.0000,410000.00,410000.00,10,1000.0000,4100000.00,1,'posted',124,267,'2026-06-12 15:28:32.454',10,NULL,'2026-06-12 15:28:32.435','2026-06-12 15:28:33.294'),(119,2,3746,'32666436W0','32666436W0','2026-05-01','HĐ_1361','2026-03-06',132,'2024-02-06','2027-02-05',31873.0000,'Kg',31873.0000,584259.00,584259.00,10,1000.0000,18622087.11,1,'posted',125,268,'2026-06-12 15:28:33.375',10,NULL,'2026-06-12 15:28:33.350','2026-06-12 15:28:34.869'),(120,2,3696,'UT25100294','UT25100294','2026-05-01','HĐ_24','2026-03-10',126,'2025-09-28','2029-09-27',20000.0000,'Kg',20000.0000,800000.00,800000.00,10,1000.0000,16000000.00,1,'posted',126,269,'2026-06-12 15:28:34.973',10,NULL,'2026-06-12 15:28:34.948','2026-06-12 15:28:35.375'),(121,2,3696,'UT24110283','UT24110283','2026-05-01','HĐ_11','2026-01-21',126,'2024-10-27','2028-10-26',97.0000,'Kg',97.0000,820000.00,820000.00,10,1000.0000,79540.00,1,'posted',127,270,'2026-06-12 15:28:37.449',10,NULL,'2026-06-12 15:28:37.429','2026-06-12 15:28:37.714'),(122,2,3620,'AT117926','AT117926','2026-05-01','HĐ_2911','2025-11-24',118,'2025-11-07','2027-05-07',6000.0000,'Kg',6000.0000,10296390.00,10296390.00,10,1000.0000,61778340.00,1,'posted',128,271,'2026-06-12 15:28:40.124',10,NULL,'2026-06-12 15:28:40.105','2026-06-15 10:54:04.639'),(123,2,3620,'AT115815','AT115815','2026-05-01','HĐ_3120','2025-12-16',118,'2025-07-23','2027-07-23',2000.0000,'Kg',2000.0000,10427210.00,10427210.00,10,1000.0000,20854420.00,1,'posted',129,272,'2026-06-12 15:28:41.596',10,NULL,'2026-06-12 15:28:41.569','2026-06-12 15:28:42.502'),(124,2,3620,'AT118027','AT118027','2026-05-01','HĐ_775','2026-03-27',118,'2025-11-11','2027-05-11',7000.0000,'Kg',7000.0000,10410225.00,10410225.00,10,1000.0000,72871575.00,1,'posted',130,273,'2026-06-12 15:28:42.563',10,NULL,'2026-06-12 15:28:42.543','2026-06-12 15:28:43.033'),(125,2,3606,'CZ5I165-2703','CZ5I165-2703','2026-05-01','HĐ_2557','2025-10-16',118,'2025-09-13','2027-03-13',36607.0000,'Kg',36607.0000,250506.00,250506.00,10,1000.0000,9170273.14,1,'posted',131,274,'2026-06-12 15:28:43.125',10,NULL,'2026-06-12 15:28:43.106','2026-06-12 15:28:44.952'),(126,2,3739,'IP13130','IP13130','2026-05-01','HĐ_1361','2026-03-06',132,'2024-07-20','2026-07-20',12000.0000,'Kg',12000.0000,257000.00,257000.00,10,1000.0000,3084000.00,1,'posted',132,275,'2026-06-12 15:28:45.026',10,NULL,'2026-06-12 15:28:44.999','2026-06-12 15:28:45.703'),(127,2,3782,'2603071025','2603071025','2026-05-01','HĐ_4164','2026-04-13',136,'2026-03-07','2027-09-07',25000.0000,'Kg',25000.0000,527777.77,527777.77,10,1000.0000,13194444.25,1,'posted',133,276,'2026-06-12 15:28:45.792',10,NULL,'2026-06-12 15:28:45.772','2026-06-12 15:28:46.622'),(128,2,3733,'20250206','20250206','2026-05-01','HĐ_3548','2026-03-27',133,'2025-02-06','2027-02-05',2000.0000,'Kg',2000.0000,800000.00,800000.00,10,1000.0000,1600000.00,1,'posted',134,277,'2026-06-12 15:28:46.744',10,NULL,'2026-06-12 15:28:46.726','2026-06-12 17:19:51.813'),(129,2,3618,'GX250204L1-001','GX250204L1','2026-05-01','HĐ_1361','2026-03-06',132,'2024-11-24','2026-11-24',202000.0000,'Kg',202000.0000,34100.00,34100.00,10,1000.0000,6888200.00,1,'posted',135,278,'2026-06-12 15:30:48.134',10,NULL,'2026-06-12 15:30:48.109','2026-06-24 19:58:45.725'),(130,2,3617,'2502009','2502009','2026-05-01','HĐ_12118','2025-11-24',133,'2025-02-07','2028-02-06',4000.0000,'Kg',4000.0000,180555.56,180555.56,10,1000.0000,722222.24,1,'posted',136,279,'2026-06-12 15:30:49.548',10,NULL,'2026-06-12 15:30:49.528','2026-06-12 17:13:17.683'),(131,2,3617,'2502009-001','2502009','2026-05-01','HĐ_3548','2026-03-27',133,'2025-02-07','2028-02-06',4000.0000,'Kg',4000.0000,165000.00,165000.00,10,1000.0000,660000.00,1,'posted',137,280,'2026-06-12 15:30:54.516',10,NULL,'2026-06-12 15:30:54.494','2026-06-12 17:13:12.943'),(133,2,3690,'25091685','25091685','2026-05-01','HĐ_723','2026-03-06',113,'2025-09-16','2027-09-15',177.0000,'Kg',177.0000,3000000.00,3000000.00,10,1000.0000,531000.00,1,'posted',139,283,'2026-06-15 11:02:26.952',10,NULL,'2026-06-15 11:02:26.923','2026-06-15 11:02:28.496'),(134,2,3690,'25091685-002','25091685','2026-05-01','HĐ_1777','2026-05-14',113,'2025-09-16','2027-09-15',300.0000,'Kg',300.0000,3000000.00,3000000.00,10,1000.0000,900000.00,1,'posted',140,284,'2026-06-15 11:02:28.564',10,NULL,'2026-06-15 11:02:28.542','2026-06-15 11:02:29.256'),(135,2,3733,'20250228','20250228','2026-05-01','HĐ_1829','2026-02-09',133,'2025-02-28','2027-02-27',1000.0000,'Kg',1000.0000,800000.00,800000.00,10,1000.0000,800000.00,1,'posted',141,285,'2026-06-15 11:02:29.598',10,NULL,'2026-06-15 11:02:29.577','2026-06-15 11:02:31.875'),(136,2,3733,'20250228-001','20250228','2026-05-01','HĐ_3306','2026-03-23',133,'2025-02-28','2027-02-27',1000.0000,'Kg',1000.0000,800000.00,800000.00,10,1000.0000,800000.00,1,'posted',142,286,'2026-06-15 11:02:31.927',10,NULL,'2026-06-15 11:02:31.907','2026-06-15 11:02:32.730'),(137,2,3767,'UT25100294','UT25100294','2026-05-01','HĐ_3306','2026-03-23',133,'2025-09-28','2029-09-27',5000.0000,'Kg',5000.0000,861111.11,861111.11,10,1000.0000,4305555.55,1,'posted',143,287,'2026-06-15 11:09:34.307',10,NULL,'2026-06-15 11:09:34.280','2026-06-15 11:09:37.931'),(138,2,3767,'UT25100294-001','UT25100294','2026-05-01','HĐ_3548','2026-03-27',133,'2025-09-28','2029-09-27',10000.0000,'Kg',10000.0000,861111.11,861111.11,10,1000.0000,8611111.10,1,'posted',144,288,'2026-06-15 11:09:37.990',10,NULL,'2026-06-15 11:09:37.970','2026-06-15 11:09:41.496');
/*!40000 ALTER TABLE `opening_stock_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `password_reset_tokens_token_key` (`token`) USING BTREE,
  KEY `password_reset_tokens_user_id_idx` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_classifications`
--

DROP TABLE IF EXISTS `product_classifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_classifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `no_lot_data` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `product_classifications_code_key` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_classifications`
--

LOCK TABLES `product_classifications` WRITE;
/*!40000 ALTER TABLE `product_classifications` DISABLE KEYS */;
INSERT INTO `product_classifications` VALUES (1,'RAW_MATERIAL','Hóa chất pha chế','Danh mục mặc định',NULL,'2026-03-30 14:31:30.890','2026-03-31 22:34:30.583',0),(2,'CLS-TEST','Phan loai test','updated','2026-03-30 14:35:45.109','2026-03-30 14:35:35.002','2026-03-30 14:35:45.109',0),(3,'CLA-2','Lít','Dùng cho dạng dung dịch lỏng','2026-03-31 21:46:46.416','2026-03-30 14:48:43.866','2026-03-31 21:46:46.416',0),(4,'CLA-001','NVL loại 2','Danh mục mặc định','2026-03-31 17:29:45.264','2026-03-31 11:40:46.926','2026-03-31 17:29:45.264',0),(5,'PACK','Bao bì','Bao bì giấy cho hộp kem',NULL,'2026-03-31 17:15:16.004','2026-03-31 22:34:25.160',0),(6,'RAW1','NVL loại 1','',NULL,'2026-04-01 13:36:00.020','2026-04-01 20:57:01.637',0),(7,'RAW2','NVL loại 2','test NVL',NULL,'2026-04-01 13:36:00.039','2026-06-02 15:32:23.022',0),(10,'WATER','NƯỚC TINH KHIẾT','',NULL,'2026-04-01 20:57:51.778','2026-06-02 15:32:23.620',0),(25,'BQU','BẢO QUẢN','',NULL,'2026-06-03 13:25:04.103','2026-06-03 13:25:04.103',0),(26,'CXU','CHIẾT XUẤT','',NULL,'2026-06-03 13:25:04.138','2026-06-03 13:25:04.138',0),(27,'CNA','CHỐNG NẮNG','',NULL,'2026-06-03 13:25:04.184','2026-06-03 13:25:04.184',0),(28,'DBO','DẦU - BƠ','',NULL,'2026-06-03 13:25:04.282','2026-06-03 13:25:04.282',0),(29,'DMO','DUNG MÔI','',NULL,'2026-06-03 13:25:04.378','2026-06-03 13:25:04.378',0),(30,'HCH','HOẠT CHẤT','',NULL,'2026-06-03 13:25:04.496','2026-06-03 13:25:04.496',0),(31,'HLI','HƯƠNG LIỆU','',NULL,'2026-06-03 13:25:04.590','2026-06-03 13:25:04.590',0),(32,'LMU','LÀM MƯỢT','',NULL,'2026-06-03 13:25:04.659','2026-06-03 13:25:04.659',0),(33,'LSA','LÀM SẠCH','',NULL,'2026-06-03 13:25:04.731','2026-06-03 13:25:04.731',0),(34,'MCP','MÀU - CHE PHỦ','',NULL,'2026-06-03 13:25:04.857','2026-06-03 13:25:04.857',0),(35,'NHO','NHŨ HÓA','',NULL,'2026-06-03 13:25:04.921','2026-06-03 13:25:04.921',0),(36,'PGI','PHỤ GIA','',NULL,'2026-06-03 13:25:04.970','2026-06-03 13:25:04.970',0),(37,'SLI','SILICONE','',NULL,'2026-06-03 13:25:05.039','2026-06-03 13:25:05.039',0),(38,'TDA','TẠO ĐẶC','',NULL,'2026-06-03 13:25:05.222','2026-06-03 13:25:05.222',0),(39,'TID','TINH DẦU','',NULL,'2026-06-03 13:25:05.368','2026-06-03 13:25:05.368',0),(40,'THU','TRANG TRÍ - HIỆU ỨNG','',NULL,'2026-06-03 13:25:05.469','2026-06-16 16:16:00.176',0),(41,'VTĐG','VẬT TƯ ĐÓNG GÓI','',NULL,'2026-06-03 13:30:34.709','2026-06-16 16:15:53.497',1),(42,'BBĐG','BAO BÌ ĐÓNG GÓI','',NULL,'2026-06-03 13:30:34.767','2026-06-16 16:15:51.847',1);
/*!40000 ALTER TABLE `product_classifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_documents`
--

DROP TABLE IF EXISTS `product_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `doc_type` enum('MSDS','Spec','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `valid_until` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `product_documents_product_id_fkey` (`product_id`) USING BTREE,
  KEY `product_documents_uploaded_by_fkey` (`uploaded_by`) USING BTREE,
  CONSTRAINT `product_documents_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_documents`
--

LOCK TABLES `product_documents` WRITE;
/*!40000 ALTER TABLE `product_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_inci_names`
--

DROP TABLE IF EXISTS `product_inci_names`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_inci_names` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `inci_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `product_inci_names_product_id_idx` (`product_id`) USING BTREE,
  CONSTRAINT `product_inci_names_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=682 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_inci_names`
--

LOCK TABLES `product_inci_names` WRITE;
/*!40000 ALTER TABLE `product_inci_names` DISABLE KEYS */;
INSERT INTO `product_inci_names` VALUES (449,3592,'Diethylamino Hydroxybenzoyl Hexyl Benzoate',1,NULL,'2026-06-12 14:03:56.679','2026-06-24 13:19:44.580'),(450,3593,'Monoi Paradis',1,NULL,'2026-06-12 14:03:57.071','2026-06-24 13:19:44.481'),(451,3594,'Titanium Dioxide, Aluminum Hydroxide, Triethoxycaprylylsilane',1,NULL,'2026-06-12 14:03:57.272','2026-06-24 13:19:44.399'),(452,3595,'Vật tư đóng gói',1,NULL,'2026-06-12 14:03:57.584','2026-06-17 16:59:19.103'),(453,3596,'Vật tư đóng gói',1,NULL,'2026-06-12 14:03:57.805','2026-06-17 16:59:19.235'),(454,3597,'Nelumbo Nucifera Leaf Extract, Camellia Sinensis Leaf Extract, Psidium Guajava Leaf Extract, Angelica Gigas Extract, Butylene Glycol',1,NULL,'2026-06-12 14:03:58.015','2026-06-24 13:19:44.333'),(455,3598,'Bee Venom, Butylene Glycol, Water',1,NULL,'2026-06-12 14:03:58.105','2026-06-24 13:19:44.247'),(456,3599,'Hydrogenated Polyisobutene',1,NULL,'2026-06-12 14:03:58.523','2026-06-24 13:19:44.136'),(457,3600,'Glyceryl Stearate, PEG-100 Stearate',1,NULL,'2026-06-12 14:03:58.591','2026-06-24 13:19:44.095'),(458,3601,'Aluminum Starch Octenylsuccinate',1,NULL,'2026-06-12 14:03:58.701','2026-06-24 13:19:44.010'),(459,3602,'Diisostearyl Malate',1,NULL,'2026-06-12 14:03:58.957','2026-06-24 13:19:43.926'),(460,3603,'Hydrogenated Polyisobutene (dùng son)',1,NULL,'2026-06-12 14:03:59.030','2026-06-24 13:19:43.837'),(461,3604,'Carbomer',1,NULL,'2026-06-12 14:03:59.124','2026-06-24 13:19:43.794'),(462,3605,'PEG- 40 Hydrogenated Castor Oil',1,NULL,'2026-06-12 14:03:59.193','2026-06-24 13:19:43.695'),(463,3606,'Phenoxyethanol, Ethylhexylglycerin',1,NULL,'2026-06-12 14:03:59.281','2026-06-24 13:19:43.649'),(464,3607,'Vật tư đóng gói',1,NULL,'2026-06-12 14:03:59.349','2026-06-17 16:59:20.502'),(465,3608,'Hydroxyethylcellulose',1,NULL,'2026-06-12 14:03:59.483','2026-06-24 13:19:43.583'),(466,3609,'Vật tư đóng gói',1,NULL,'2026-06-12 14:03:59.545','2026-06-17 16:59:20.673'),(467,3610,'Glycerin, Aqua, Leontopodium Alpinum Flower/Leaf Extract, Citric Acid',1,NULL,'2026-06-12 14:03:59.631','2026-06-24 13:19:43.507'),(468,3611,'Alcohol',1,NULL,'2026-06-12 14:03:59.718','2026-06-24 13:19:43.408'),(469,3612,'Fresh Orchid',1,NULL,'2026-06-12 14:03:59.835','2026-06-24 13:19:43.334'),(470,3613,'Simmondsia Chinensis (Jojoba) Seed Oil',1,NULL,'2026-06-12 14:04:00.033','2026-06-24 13:19:43.230'),(471,3614,'Oryza Sativa (Rice) Bran Oil',1,NULL,'2026-06-12 14:04:00.096','2026-06-24 13:19:43.098'),(472,3615,'Vitis Vinifera (Grape) Seed Oil',1,NULL,'2026-06-12 14:04:00.295','2026-06-24 13:19:42.856'),(473,3616,'Olea Europaea (Olive) Fruit Oil',1,NULL,'2026-06-12 14:04:00.373','2026-06-24 13:19:42.783'),(474,3617,'Methyl Salicylate',1,NULL,'2026-06-12 14:04:00.508','2026-06-24 13:19:42.709'),(475,3618,'Propylene Glycol',1,NULL,'2026-06-12 14:04:00.589','2026-06-24 13:19:42.646'),(476,3619,'Triethanolamine',1,NULL,'2026-06-12 14:04:00.752','2026-06-24 13:19:42.480'),(477,3620,'Vanillyl Butyl Ether',1,NULL,'2026-06-12 14:04:00.851','2026-06-24 13:19:42.422'),(478,3621,'Melaleuca Alternifolia Leaf Oil',1,NULL,'2026-06-12 14:04:01.019','2026-06-24 13:19:42.282'),(479,3622,'Salicylic Acid',1,NULL,'2026-06-12 14:04:01.110','2026-06-24 13:19:42.162'),(480,3623,'Glycerin, Aqua (Water), Centella Asiatica Leaf Extract, Potassium Sorbate',1,NULL,'2026-06-12 14:04:01.208','2026-06-24 13:19:42.102'),(481,3624,'Disodium EDTA',1,NULL,'2026-06-12 14:04:01.548','2026-06-24 13:19:42.027'),(482,3625,'Lactic Acid',1,NULL,'2026-06-12 14:04:01.762','2026-06-24 13:19:41.949'),(483,3626,'Sodium Polyacrylate Starch',1,NULL,'2026-06-12 14:04:01.858','2026-06-24 13:19:41.865'),(484,3627,'Camellia Japonica Seed Oil',1,NULL,'2026-06-12 14:04:01.924','2026-06-24 13:19:41.765'),(485,3628,'PEG-30 Dipolyhydroxystearate',1,NULL,'2026-06-12 14:04:01.986','2026-06-24 13:19:41.721'),(486,3629,'Water, Butylene Glycol, 1,2-Hexanediol, Ethyl Hexanediol, Pearl Extract',1,NULL,'2026-06-12 14:04:02.065','2026-06-24 13:19:41.610'),(487,3630,'Water, Butylene Glycol, Glycerin, 1,2-Hexanediol, Hibiscus Sabdariffa \r\r\nFlower Extract',1,NULL,'2026-06-12 14:04:02.285','2026-06-24 13:19:41.561'),(488,3631,'Beeswax',1,NULL,'2026-06-12 14:04:02.436','2026-06-24 13:19:41.521'),(489,3632,'C30-45 Alkyl Dimethicone',1,NULL,'2026-06-12 14:04:02.572','2026-06-24 13:19:41.398'),(490,3633,'Red 7 Lake (CI 15850), Phenyl Trimethicone, Disteardimonium Hectorite, Isopropyl Titanium Triisostearate, 1,2-Hexanediol, Caprylyl Glycol, Silica',1,NULL,'2026-06-12 14:04:02.632','2026-06-24 13:19:41.357'),(491,3634,'Titanium Dioxide (CI 77891), Phenyl Trimethicone, Isopropyl Titanium Triisostearate, Disteardimonium Hectorite, 1,2-Hexanediol, Caprylyl Glycol, Silica',1,NULL,'2026-06-12 14:04:02.733','2026-06-24 13:19:41.288'),(492,3635,'Iron Oxides (CI 77491) Phenyl Trimethicone, Disteardimonium Hectorite, Isopropyl Titanium Triisostearate,  1,2-Hexanediol, Caprylyl Glycol, Silica',1,NULL,'2026-06-12 14:04:02.893','2026-06-24 13:19:41.244'),(493,3636,'Cyclopentasiloxane, Trimethylsiloxysilicate',1,NULL,'2026-06-12 14:04:02.966','2026-06-24 13:19:41.198'),(494,3637,'Cyclopentasiloxann, Dimethicone/Vinyl Dimethicone Crosspolymer',1,NULL,'2026-06-12 14:04:03.185','2026-06-24 13:19:41.072'),(495,3638,'Silica Dimethyl Silylate',1,NULL,'2026-06-12 14:04:03.273','2026-06-24 13:19:41.025'),(496,3639,'Polyglyceryl-2 Diisostearate',1,NULL,'2026-06-12 14:04:03.351','2026-06-24 13:19:40.919'),(497,3640,'Cyclopentasiloxane, PEG/PPG-20/15 Dimethicone',1,NULL,'2026-06-12 14:04:03.399','2026-06-24 13:19:40.644'),(498,3641,'Zingiber Officinale (Ginger) Root Oil',1,NULL,'2026-06-12 14:04:03.471','2026-06-24 13:19:40.158'),(499,3642,'DMDM Hydantoin',1,NULL,'2026-06-12 14:04:03.653','2026-06-24 13:19:39.910'),(500,3643,'Butyrospermum Parkii (Shea) Butter',1,NULL,'2026-06-12 14:04:03.732','2026-06-24 13:19:39.813'),(501,3644,'Nelumbo Nucifera Leaf Extract, Propylene Glycol, Aqua, Ethoxydiglycol, 1,2-Hexanediol',1,NULL,'2026-06-12 14:04:03.817','2026-06-24 13:19:39.723'),(502,3645,'DMDM Hydantoin',1,NULL,'2026-06-12 14:04:03.890','2026-06-24 13:19:39.558'),(503,3646,'Sodium Polyacrylate, C13-14 Isoparaffin, Laureth-7.',1,NULL,'2026-06-12 14:04:03.942','2026-06-24 13:19:39.494'),(504,3647,'Glycolic Acid',1,NULL,'2026-06-12 14:04:04.163','2026-06-24 13:19:39.266'),(505,3648,'C13-15 Alkane, Disteardimonium Hectorite, Polyglyceryl-3 Polyricinoleate',1,NULL,'2026-06-12 14:04:04.259','2026-06-24 13:19:39.208'),(506,3649,'Caprylic/Capric Triglyceride',1,NULL,'2026-06-12 14:04:04.374','2026-06-24 13:19:39.156'),(507,3650,'Cyclopentasiloxane',1,NULL,'2026-06-12 14:04:04.593','2026-06-24 13:19:39.048'),(508,3651,'Sodium Polyacrylate, C13-14 Isoparaffin, Laureth-7.',1,NULL,'2026-06-12 14:04:04.683','2026-06-24 13:19:39.003'),(509,3652,'Palm Kernelamide DEA',1,NULL,'2026-06-12 14:04:04.753','2026-06-24 13:19:38.922'),(510,3653,'Isopropyl Myristate',1,NULL,'2026-06-12 14:04:04.842','2026-06-24 13:19:38.876'),(511,3654,'Polysorbate 20',1,NULL,'2026-06-12 14:04:04.971','2026-06-24 13:19:38.831'),(512,3655,'Sodium Laureth Sulfate',1,NULL,'2026-06-12 14:04:05.067','2026-06-24 13:19:38.783'),(513,3656,'Cetyl Alcohol',1,NULL,'2026-06-12 14:04:05.140','2026-06-24 13:19:38.714'),(514,3657,'C12-15 Alkyl Benzoate',1,NULL,'2026-06-12 14:04:05.242','2026-06-24 13:19:38.669'),(515,3658,'Sodium Methyl Cocoyl Taurate, Water',1,NULL,'2026-06-12 14:04:05.327','2026-06-24 13:19:38.612'),(516,3659,'Glyceryl Stearate',1,NULL,'2026-06-12 14:04:05.442','2026-06-24 13:19:38.568'),(517,3660,'Myristic Acid',1,NULL,'2026-06-12 14:04:05.527','2026-06-24 13:19:38.462'),(518,3661,'Polyethylene Glycol',1,NULL,'2026-06-12 14:04:05.581','2026-06-24 13:19:38.396'),(519,3662,'Glycerin, Aqua, Hamamelis virginiana (Witch Hazel) Leaf Extract, Potassium sorbate',1,NULL,'2026-06-12 14:04:05.651','2026-06-24 13:19:36.884'),(520,3663,'Quaternium-18 Bentonite',1,NULL,'2026-06-12 14:04:05.776','2026-06-24 13:19:36.802'),(521,3664,'Water, Glycerine, Cucurbita Pepo Fruit Extract',1,NULL,'2026-06-12 14:04:05.825','2026-06-24 13:19:36.690'),(522,3665,'Water, Acetyl Tetrapeptide-3, Ethylhexylglycerin, 1,2-Hexanediol',1,NULL,'2026-06-12 14:04:05.918','2026-06-24 13:19:36.610'),(523,3666,'Tranexamic Acid',1,NULL,'2026-06-12 14:04:06.055','2026-06-24 13:19:36.560'),(524,3667,'Aqua, Propanediol, Crocus Sativus Flower Extract, Sodium Benzoate, Potassium Sorbate',1,NULL,'2026-06-12 14:04:06.188','2026-06-24 13:19:36.518'),(525,3668,'Water, Glycerin, Butylene Glycol, 1,2-Hexanediol, Gossypium \r\r\nHerbaceum (Cotton) Seed Extract',1,NULL,'2026-06-12 14:04:06.396','2026-06-24 13:19:36.469'),(526,3669,'Water, Glycerin, Butylene Glycol, 1,2-Hexanediol, Convallaria Majalis Extract',1,NULL,'2026-06-12 14:04:06.743','2026-06-24 13:19:36.421'),(527,3670,'Water, Hydrolyzed Collagen, Butylene Glycol, Glycerin, 1,2-Hexanediol',1,NULL,'2026-06-12 14:04:06.933','2026-06-24 13:19:36.358'),(528,3671,'Hydroxyethylcellulose',1,NULL,'2026-06-12 14:04:07.101','2026-06-24 13:19:35.835'),(529,3672,'Ceramide',1,NULL,'2026-06-12 14:04:07.192','2026-06-24 13:19:35.667'),(530,3673,'Kojic Acid',1,NULL,'2026-06-12 14:04:07.231','2026-06-24 13:19:35.601'),(531,3674,'Ethylhexyl Methoxycinnamate',1,NULL,'2026-06-12 14:04:07.314','2026-06-24 13:19:35.535'),(532,3675,'Xanthan Gum',1,NULL,'2026-06-12 14:04:07.396','2026-06-24 13:19:35.426'),(533,3676,'CI 77491',1,NULL,'2026-06-12 14:04:07.603','2026-06-24 13:19:35.313'),(534,3677,'Octocrylene',1,NULL,'2026-06-12 14:04:07.772','2026-06-24 13:19:35.145'),(535,3678,'Lactose, Microcrystalline Cellulose, Sucrose, Zea May (Corn) Starch, Hydroxypropyl Methyl Cellulose,  CI77492',1,NULL,'2026-06-12 14:04:07.829','2026-06-24 13:19:35.086'),(536,3679,'Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Aqua, Decyl Glucoside, Propylene Glycol, Xanthan Gum',1,NULL,'2026-06-12 14:04:07.881','2026-06-24 13:19:34.962'),(537,3680,'Titanium Dioxide, Aluminum Hydroxide, Stearic Acid',1,NULL,'2026-06-12 14:04:08.106','2026-06-24 13:19:34.845'),(538,3681,'Citric Acid',1,NULL,'2026-06-12 14:04:08.335','2026-06-24 13:19:34.714'),(539,3682,'D-Panthenol',1,NULL,'2026-06-12 14:04:08.493','2026-06-24 13:19:34.573'),(540,3683,'BIOTIN',1,NULL,'2026-06-12 14:04:08.630','2026-06-24 13:19:34.491'),(541,3684,'Ethylhexyl Methoxycinnamate',1,NULL,'2026-06-12 14:04:08.749','2026-06-24 13:19:34.412'),(542,3685,'Tranexamic Acid',1,NULL,'2026-06-12 14:04:08.803','2026-06-24 13:19:34.291'),(543,3686,'Glutathione',1,NULL,'2026-06-12 14:04:08.967','2026-06-24 13:19:34.186'),(544,3687,'Carbomer',1,NULL,'2026-06-12 14:04:09.113','2026-06-24 13:19:34.003'),(545,3688,'Water, Hydrolyzed Algin, Phenoxyethanol',1,NULL,'2026-06-12 14:04:09.291','2026-06-24 13:19:33.847'),(546,3689,'Titanium Dioxide (CI 77891), Cyclopentasiloxane, Dimethylpolysiloxane, Disodium N-Stearoyl-L-Glutamate, Aluminum Hydroxide',1,NULL,'2026-06-12 14:04:09.422','2026-06-24 13:19:33.774'),(547,3690,'Dipropylene Glycol, HouttuyniaCordata Extract, Eclipta Prostrata Extract, Polygonum Multiflorum\r\r\nRoot Extract, Phyllostachys Nigra Leaf Extract, Urtica Dioica (Nettle) Extract, Passiflora Incarnata Extract, Centella Asiatica Extract',1,NULL,'2026-06-12 14:04:09.624','2026-06-24 13:19:33.687'),(548,3691,'Glycerin, Aqua, Glycyrrhiza Glabra Root Extract, Caprylhydroxamic Acid, Glyceryl Caprylate',1,NULL,'2026-06-12 14:04:09.686','2026-06-24 13:19:33.578'),(549,3692,'Glycerin, Aqua, Chamomilla Recutita (Matricaria) Flower Extract, Potassium Sorbate',1,NULL,'2026-06-12 14:04:10.048','2026-06-24 13:19:33.524'),(550,3693,'Water, Sodium Hyaluronate, Butylene Glycol, Phenoxyethanol',1,NULL,'2026-06-12 14:04:10.141','2026-06-24 13:19:33.350'),(551,3694,'Palmitoyl Tripeptide-5, Glycerin, Aqua',1,NULL,'2026-06-12 14:04:10.244','2026-06-24 13:19:33.290'),(552,3695,'Ethylhexyl Methoxycinnamate',1,NULL,'2026-06-12 14:04:10.328','2026-06-24 13:19:33.142'),(553,3696,'Tocopheryl Acetate',1,NULL,'2026-06-12 14:04:10.478','2026-06-24 13:19:33.070'),(554,3697,'Cetearyl Alcohol',1,NULL,'2026-06-12 14:04:10.573','2026-06-24 13:19:33.011'),(555,3698,'Allantoin',1,NULL,'2026-06-12 14:04:10.770','2026-06-24 13:19:32.963'),(556,3699,'Cetrimonium Chloride, Water',1,NULL,'2026-06-12 14:04:10.843','2026-06-24 13:19:32.908'),(557,3700,'Glycerin',1,NULL,'2026-06-12 14:04:10.917','2026-06-24 13:19:32.861'),(558,3701,'Triethoxycaprylsilan, Titanium Dioxide, Aluminum Hydroxide',1,NULL,'2026-06-12 14:04:10.977','2026-06-24 13:19:32.814'),(559,3702,'Paraffinum Liquidum',1,NULL,'2026-06-12 14:04:11.049','2026-06-24 13:19:32.366'),(560,3703,'Blooming Rose',1,NULL,'2026-06-12 14:04:11.308','2026-06-24 13:19:32.286'),(561,3704,'Propanediol',1,NULL,'2026-06-12 14:04:11.462','2026-06-24 13:19:32.231'),(562,3705,'Beeswax',1,NULL,'2026-06-12 14:04:11.520','2026-06-24 13:19:31.954'),(563,3706,'Glyceryl stearate, PEG-100 Stearate',1,NULL,'2026-06-12 14:04:11.580','2026-06-24 13:19:31.808'),(564,3707,'Petrolatum',1,NULL,'2026-06-12 14:04:11.709','2026-06-24 13:19:31.648'),(565,3708,'Aloe Barbadensis Leaf Juice',1,NULL,'2026-06-12 14:04:11.781','2026-06-24 13:19:31.593'),(566,3709,'C12-15 Alkyl Benzoate',1,NULL,'2026-06-12 14:04:11.905','2026-06-24 13:19:31.545'),(567,3710,'Caprylic/Capric Triglyceride',1,NULL,'2026-06-12 14:04:11.989','2026-06-24 13:19:31.505'),(568,3711,'Dimethicone',1,NULL,'2026-06-12 14:04:12.161','2026-06-24 13:19:31.406'),(569,3712,'Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer, Hydrogenated Polydecene, Polysorbate 80',1,NULL,'2026-06-12 14:04:12.230','2026-06-24 13:19:31.317'),(570,3713,'Titanium Dioxide, Aluminum Hydroxide, Triethoxycaprylylsilane',1,NULL,'2026-06-12 14:04:12.397','2026-06-24 13:19:31.253'),(571,3714,'Citrus Aurantium Amara Flower Oil',1,NULL,'2026-06-12 14:04:12.500','2026-06-24 13:19:31.187'),(572,3715,'Santalum Album Oil',1,NULL,'2026-06-12 14:04:12.686','2026-06-24 13:19:31.065'),(573,3716,'Argania Spinosa Kernel Oil',1,NULL,'2026-06-12 14:04:12.923','2026-06-24 13:19:31.019'),(574,3717,'Babassu Oil Glycereth-8 Esters, Water',1,NULL,'2026-06-12 14:04:13.062','2026-06-24 13:19:30.924'),(575,3718,'CI 15850',1,NULL,'2026-06-12 14:04:13.292','2026-06-24 13:19:30.870'),(576,3719,'CI 19140',1,NULL,'2026-06-12 14:04:13.409','2026-06-24 13:19:30.761'),(577,3720,'CI 77499',1,NULL,'2026-06-12 14:04:13.496','2026-06-24 13:19:30.713'),(578,3721,'Water, Propanediol, Glycerin, Sodium Lactate, Glycolic Acid, Sucrose, Urea, Sodium Citrate, Malic Acid, Tartaric Acid',1,NULL,'2026-06-12 14:04:13.714','2026-06-24 13:19:30.668'),(579,3722,'Zinc PCA',1,NULL,'2026-06-12 14:04:13.772','2026-06-24 13:19:30.589'),(580,3723,'Triethylhexanoin',1,NULL,'2026-06-12 14:04:13.849','2026-06-24 13:19:30.528'),(581,3724,'Hydrolyzed Keratin',1,NULL,'2026-06-12 14:04:13.949','2026-06-24 13:19:30.461'),(582,3725,'Tetrasodium EDTA',1,NULL,'2026-06-12 14:04:14.045','2026-06-24 13:19:30.340'),(583,3726,'Alpha Arbutin',1,NULL,'2026-06-12 14:04:14.096','2026-06-24 13:19:30.277'),(584,3727,'Water, Hydrolyzed Collagen, Butylene Glycol, Glycerin, 1,2-Hexanediol',1,NULL,'2026-06-12 14:04:14.178','2026-06-24 13:19:30.189'),(585,3728,'Synthetic Beeswax, \r\r\nSynthetic Wax, \r\r\nStearic Acid',1,NULL,'2026-06-12 14:04:14.254','2026-06-24 13:19:30.138'),(586,3729,'Magnesium Stearate',1,NULL,'2026-06-12 14:04:14.346','2026-06-24 13:19:30.074'),(587,3730,'Silica',1,NULL,'2026-06-12 14:04:14.437','2026-06-24 13:19:29.963'),(588,3731,'Hydrogenated Polyisobutene',1,NULL,'2026-06-12 14:04:14.521','2026-06-24 13:19:29.897'),(589,3732,'Steareth-21',1,NULL,'2026-06-12 14:04:14.584','2026-06-24 13:19:29.778'),(590,3733,'Mica, CI 77891, CI 77491, Tin Oxide',1,NULL,'2026-06-12 14:04:14.653','2026-06-24 13:19:29.647'),(591,3734,'Saccharide Isomerate, Aqua, Citric Acid, Sodium Citrate',1,NULL,'2026-06-12 14:04:14.741','2026-06-24 13:19:29.506'),(592,3735,'Cyclopentasiloxane, Trimethylsiloxysilicate',1,NULL,'2026-06-12 14:04:14.812','2026-06-24 13:19:29.377'),(593,3736,'CI 16255',1,NULL,'2026-06-12 14:04:14.883','2026-06-24 13:19:29.334'),(594,3737,'Sodium Hyaluronate',1,NULL,'2026-06-12 14:04:14.947','2026-06-24 13:19:29.279'),(595,3738,'ETERNAL FRAGRANCE',1,NULL,'2026-06-12 14:04:15.008','2026-06-24 13:19:29.226'),(596,3739,'Phenoxyethanol, Ethylhexylglycerin',1,NULL,'2026-06-12 14:04:15.074','2026-06-24 13:19:29.094'),(597,3740,'Glycerin',1,NULL,'2026-06-12 14:04:15.171','2026-06-24 13:19:29.029'),(598,3741,'PEG-40 Hydrogenated Castor oil',1,NULL,'2026-06-12 14:04:15.254','2026-06-24 13:19:28.978'),(599,3742,'Amodimethicone, Trideceth-12, Cetrimonium Chloride',1,NULL,'2026-06-12 14:04:15.301','2026-06-24 13:19:28.922'),(600,3743,'Sodium Laureth Sulfate',1,NULL,'2026-06-12 14:04:15.369','2026-06-24 13:19:28.852'),(601,3744,'Sodium Lactate',1,NULL,'2026-06-12 14:04:15.656','2026-06-24 13:19:28.760'),(602,3745,'Glycol Distearate, Cocamide DEA, Cocamidopropyl Betaine',1,NULL,'2026-06-12 14:04:15.749','2026-06-24 13:19:28.691'),(603,3746,'Tocopheryl Acetate',1,NULL,'2026-06-12 14:04:15.950','2026-06-24 13:19:28.568'),(604,3747,'D-Panthenol',1,NULL,'2026-06-12 14:04:16.030','2026-06-24 13:19:28.493'),(605,3748,'Citrus Grandis Peel Oil',1,NULL,'2026-06-12 14:04:16.145','2026-06-24 13:19:28.429'),(606,3749,'Aqua, Butylene Glycol, CI 73360, Titanium Dioxide (CI 77891), Calcium Alginate, Gellan Gum, Agar, Caprylyl Glycol, 1,2-Hexanediol',1,NULL,'2026-06-12 14:04:16.199','2026-06-24 13:19:28.353'),(607,3750,'Water, Butylene Glycol, Glycerin, Zingiber Officinale (Ginger) Root Extract, 1,2-Hexanediol, Ethyl Hexanediol',1,NULL,'2026-06-12 14:04:16.265','2026-06-24 13:19:28.254'),(608,3751,'Allantoin',1,NULL,'2026-06-12 14:04:16.368','2026-06-24 13:19:28.110'),(609,3752,'Beeswax',1,NULL,'2026-06-12 14:04:16.458','2026-06-24 13:19:26.867'),(610,3753,'Butylated hydroxytoluene',1,NULL,'2026-06-12 14:04:16.515','2026-06-24 13:19:26.815'),(611,3754,'Guar Hydroxypropyltrimonium Chloride',1,NULL,'2026-06-12 14:04:16.590','2026-06-24 13:19:26.708'),(612,3755,'Stearic Acid',1,NULL,'2026-06-12 14:04:16.656','2026-06-24 13:19:26.602'),(613,3756,'Titanium Dioxide',1,NULL,'2026-06-12 14:04:16.736','2026-06-24 13:19:26.547'),(614,3757,'Niacinamide',1,NULL,'2026-06-12 14:04:16.827','2026-06-24 13:19:26.459'),(615,3758,'Kojic Acid',1,NULL,'2026-06-12 14:04:16.921','2026-06-24 13:19:26.333'),(616,3759,'Sodium Polyacrylate, C13-14 Isoparaffin, Laureth-7.',1,NULL,'2026-06-12 14:04:17.025','2026-06-24 13:19:26.242'),(617,3760,'Water, Cocamido Propyl Betaine, Sodium Chloride',1,NULL,'2026-06-12 14:04:17.159','2026-06-24 13:19:26.152'),(618,3761,'Cocamide DEA',1,NULL,'2026-06-12 14:04:17.308','2026-06-24 13:19:26.100'),(619,3762,'Phenoxyethanol',1,NULL,'2026-06-12 14:04:17.510','2026-06-24 13:19:26.045'),(620,3763,'Retinol',1,NULL,'2026-06-12 14:04:17.704','2026-06-24 13:19:25.996'),(621,3764,'Polyacrylate Crosspolymer-6',1,NULL,'2026-06-12 14:04:17.756','2026-06-24 13:19:25.806'),(622,3765,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:17.801','2026-06-17 16:59:39.081'),(623,3766,'D-Panthenol',1,NULL,'2026-06-12 14:04:17.859','2026-06-24 13:19:25.768'),(624,3767,'Tocopheryl Actate',1,NULL,'2026-06-12 14:04:18.219','2026-06-24 13:19:25.716'),(625,3768,'Allantoin',1,NULL,'2026-06-12 14:04:18.272','2026-06-24 13:19:25.665'),(626,3769,'Glycerin',1,NULL,'2026-06-12 14:04:18.335','2026-06-24 13:19:25.589'),(627,3770,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:18.494','2026-06-17 16:59:39.571'),(628,3771,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:18.636','2026-06-17 16:59:39.657'),(629,3772,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:18.725','2026-06-17 16:59:39.763'),(630,3773,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:18.818','2026-06-17 16:59:39.868'),(631,3774,'Propylene Glycol',1,NULL,'2026-06-12 14:04:19.049','2026-06-24 13:19:25.524'),(632,3775,'CRAZED HIM E23244285',1,NULL,'2026-06-12 14:04:19.219','2026-06-24 13:19:25.392'),(633,3776,'Cetrimonium Chloride, Water',1,NULL,'2026-06-12 14:04:19.293','2026-06-24 13:19:25.322'),(634,3777,'Polyquaternium-10',1,NULL,'2026-06-12 14:04:19.374','2026-06-24 13:19:25.237'),(635,3778,'Biotin',1,NULL,'2026-06-12 14:04:19.603','2026-06-24 13:19:25.160'),(636,3779,'Behentrimonium Chloride, Isopropyl Alcohol',1,NULL,'2026-06-12 14:04:19.790','2026-06-24 13:19:25.044'),(637,3780,'Cetyl Alcohol',1,NULL,'2026-06-12 14:04:19.953','2026-06-24 13:19:25.000'),(638,3781,'Acrylates Copolymer',1,NULL,'2026-06-12 14:04:20.070','2026-06-24 13:19:24.931'),(639,3782,'Hương Chanh Sả',1,NULL,'2026-06-12 14:04:20.128','2026-06-24 13:19:24.791'),(640,3783,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.210','2026-06-17 16:59:40.836'),(641,3784,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.291','2026-06-17 16:59:41.063'),(642,3785,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.370','2026-06-17 16:59:41.148'),(643,3786,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.438','2026-06-17 16:59:41.219'),(644,3787,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.489','2026-06-17 16:59:41.714'),(645,3788,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.570','2026-06-17 16:59:41.789'),(646,3789,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.677','2026-06-17 16:59:41.993'),(647,3790,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.737','2026-06-17 16:59:42.096'),(648,3791,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.820','2026-06-17 16:59:42.157'),(649,3792,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.869','2026-06-17 16:59:42.213'),(650,3793,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:20.948','2026-06-17 16:59:42.289'),(651,3794,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:21.012','2026-06-17 16:59:42.480'),(652,3795,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:21.069','2026-06-17 16:59:42.684'),(653,3796,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:21.136','2026-06-17 16:59:42.786'),(654,3797,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:21.193','2026-06-17 16:59:42.905'),(655,3798,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:04:21.263','2026-06-17 16:59:43.066'),(656,3799,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 14:11:56.822','2026-06-12 15:18:40.433'),(657,3800,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.429','2026-06-17 16:59:43.136'),(658,3801,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.485','2026-06-17 16:59:43.238'),(659,3802,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.552','2026-06-17 16:59:43.344'),(660,3803,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.634','2026-06-17 16:59:43.407'),(661,3804,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.686','2026-06-17 16:59:43.542'),(662,3805,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.774','2026-06-17 16:59:43.610'),(663,3806,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-12 15:19:55.843','2026-06-17 16:59:43.700'),(664,3807,'Cyclopentasiloxane, PEG/PPG-20/15 Dimethicone',1,NULL,'2026-06-12 15:50:15.212','2026-06-24 13:19:24.735'),(665,3808,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:05:25.128','2026-06-17 16:59:43.863'),(666,3809,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:05:25.183','2026-06-17 16:59:43.922'),(667,3810,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:05:25.267','2026-06-17 16:59:44.045'),(668,3811,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:05:25.333','2026-06-17 16:59:44.107'),(669,3812,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:05:25.402','2026-06-17 16:59:44.237'),(670,3813,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 10:09:04.571','2026-06-17 16:59:44.178'),(671,3814,'Dextrin Palmitate',1,NULL,'2026-06-15 16:20:12.408','2026-06-24 13:19:24.661'),(672,3815,'Dextrin Isostearate',1,NULL,'2026-06-15 16:20:12.463','2026-06-24 13:19:24.495'),(673,3816,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 16:20:12.586','2026-06-17 16:59:44.464'),(674,3817,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-15 16:26:26.514','2026-06-17 16:59:44.644'),(675,3818,'Palm Kernelamide DEA',1,NULL,'2026-06-16 13:28:30.082','2026-06-24 13:19:24.446'),(676,3819,'Sodium Chloride',1,NULL,'2026-06-16 13:28:30.157','2026-06-24 13:19:24.392'),(677,3820,'Potassium Hydroxide',1,NULL,'2026-06-16 13:28:30.217','2026-06-24 13:19:24.302'),(678,3821,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-17 10:41:03.588','2026-06-17 16:59:45.045'),(679,3822,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-17 10:41:41.512','2026-06-17 16:59:45.104'),(680,3823,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-17 15:29:33.492','2026-06-17 16:59:45.193'),(681,3824,'BAO BÌ ĐÓNG GÓI',1,NULL,'2026-06-17 16:59:45.270','2026-06-17 16:59:45.270');
/*!40000 ALTER TABLE `product_inci_names` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_manufacturers`
--

DROP TABLE IF EXISTS `product_manufacturers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_manufacturers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `product_manufacturers_product_id_idx` (`product_id`) USING BTREE,
  CONSTRAINT `product_manufacturers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_manufacturers`
--

LOCK TABLES `product_manufacturers` WRITE;
/*!40000 ALTER TABLE `product_manufacturers` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_manufacturers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_suppliers`
--

DROP TABLE IF EXISTS `product_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `product_suppliers_product_id_supplier_id_key` (`product_id`,`supplier_id`) USING BTREE,
  KEY `product_suppliers_product_id_idx` (`product_id`) USING BTREE,
  KEY `product_suppliers_supplier_id_idx` (`supplier_id`) USING BTREE,
  CONSTRAINT `product_suppliers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_suppliers_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_suppliers`
--

LOCK TABLES `product_suppliers` WRITE;
/*!40000 ALTER TABLE `product_suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_units`
--

DROP TABLE IF EXISTS `product_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned DEFAULT NULL,
  `parent_unit_id` bigint unsigned DEFAULT NULL COMMENT 'id của đơn vị cha',
  `unit_code_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversion_to_base` decimal(15,4) NOT NULL,
  `is_purchase_unit` tinyint(1) NOT NULL DEFAULT '0',
  `is_default_display` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `product_units_product_id_unit_name_key` (`product_id`,`unit_name`) USING BTREE,
  KEY `product_units_parent_unit_id_fkey` (`parent_unit_id`) USING BTREE,
  CONSTRAINT `product_units_parent_unit_id_fkey` FOREIGN KEY (`parent_unit_id`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `product_units_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_units`
--

LOCK TABLES `product_units` WRITE;
/*!40000 ALTER TABLE `product_units` DISABLE KEYS */;
INSERT INTO `product_units` VALUES (2,NULL,NULL,'g','Gram','Dạng bột',1.0000,0,1,'2026-03-31 20:49:00.670','2026-06-03 13:15:07.659'),(3,NULL,4,'L','Lít','Dùng cho dạng dung dịch lỏng',1000.0000,0,0,'2026-03-31 21:06:52.840','2026-04-06 16:18:38.219'),(4,NULL,NULL,'ml','Mili lít','Dung dịch',1.0000,0,0,'2026-03-31 21:06:52.840','2026-06-06 17:04:07.727'),(7,NULL,NULL,NULL,'Cái',NULL,1.0000,0,0,'2026-05-05 13:31:15.463','2026-05-05 13:31:15.463'),(8,NULL,NULL,'Hộp','Hộp','',1.0000,0,0,'2026-05-05 13:31:15.486','2026-06-03 14:17:38.558'),(9,NULL,NULL,NULL,'Bộ',NULL,1.0000,0,0,'2026-05-05 13:31:15.501','2026-05-05 13:31:15.501'),(10,NULL,2,'Kg','Kilogram','',1000.0000,0,0,'2026-06-03 13:15:12.745','2026-06-03 13:28:03.544'),(11,NULL,NULL,'cuộn','cuộn','',1.0000,0,0,'2026-06-05 10:55:12.395','2026-06-05 10:57:23.629'),(13,NULL,NULL,'tem','tem','',1.0000,0,0,'2026-06-05 10:57:27.845','2026-06-05 10:57:27.845'),(14,NULL,NULL,'tube','tube','',1.0000,0,0,'2026-06-05 10:58:35.503','2026-06-05 10:58:35.503'),(15,NULL,NULL,'chai','chai','',1.0000,0,0,'2026-06-05 10:59:37.387','2026-06-05 10:59:37.387'),(16,NULL,NULL,'hũ','hũ','',1.0000,0,0,'2026-06-05 11:00:38.837','2026-06-05 11:00:38.837');
/*!40000 ALTER TABLE `product_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_bom_lines`
--

DROP TABLE IF EXISTS `production_bom_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_bom_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_id` bigint unsigned NOT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `line_type` enum('nvl','btp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nvl',
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `qty_per_base` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `waste_qty` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `production_bom_lines_bom_id_idx` (`bom_id`) USING BTREE,
  KEY `production_bom_lines_product_id_fkey` (`product_id`) USING BTREE,
  CONSTRAINT `production_bom_lines_bom_id_fkey` FOREIGN KEY (`bom_id`) REFERENCES `production_boms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_bom_lines_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_bom_lines`
--

LOCK TABLES `production_bom_lines` WRITE;
/*!40000 ALTER TABLE `production_bom_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_bom_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_boms`
--

DROP TABLE IF EXISTS `production_boms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_boms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bom_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bom_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `output_product_id` bigint unsigned DEFAULT NULL,
  `base_qty` decimal(15,4) NOT NULL DEFAULT '1.0000',
  `version` smallint unsigned NOT NULL DEFAULT '1',
  `status` enum('draft','submitted','approved','inactive','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `production_boms_status_idx` (`status`) USING BTREE,
  KEY `production_boms_output_product_id_idx` (`output_product_id`) USING BTREE,
  KEY `production_boms_created_by_idx` (`created_by`) USING BTREE,
  KEY `production_boms_approved_by_fkey` (`approved_by`) USING BTREE,
  CONSTRAINT `production_boms_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `production_boms_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_boms_output_product_id_fkey` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_boms`
--

LOCK TABLES `production_boms` WRITE;
/*!40000 ALTER TABLE `production_boms` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_boms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_order_lines`
--

DROP TABLE IF EXISTS `production_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_order_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `step` tinyint NOT NULL,
  `direction` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `export_date` datetime(3) DEFAULT NULL,
  `planned_qty` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `actual_qty` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `waste_qty` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `quality_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `output_product_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `production_order_lines_order_id_step_idx` (`order_id`,`step`) USING BTREE,
  KEY `production_order_lines_product_id_fkey` (`product_id`) USING BTREE,
  KEY `production_order_lines_location_id_fkey` (`location_id`) USING BTREE,
  KEY `idx_pol_output_product` (`output_product_id`) USING BTREE,
  CONSTRAINT `fk_pol_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_order_lines_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `production_order_lines_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_order_lines_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=674 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_order_lines`
--

LOCK TABLES `production_order_lines` WRITE;
/*!40000 ALTER TABLE `production_order_lines` DISABLE KEYS */;
INSERT INTO `production_order_lines` VALUES (664,24,1,'out',3618,'NL-DMO-030','Hóa chất Propylene Glycol','C815O7R31','2026-07-14','2026-05-01 17:00:00.000',40000.0000,1178.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(665,24,1,'out',3618,'NL-DMO-030','Hóa chất Propylene Glycol','GX250204L1','2026-11-24','2026-05-01 17:00:00.000',40000.0000,38822.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(666,24,1,'out',3725,'NL-PGI-028','Hóa chất EDTA 4Na','LOT-NL-PGI-028-260405','2027-01-01','2026-05-01 17:00:00.000',1000.0000,1000.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(667,24,1,'out',3698,'NL-HCH-001','Hóa chất Blanova Active Allantoin EP','25LOT01156','2000-03-01','2026-05-01 17:00:00.000',4712.0000,4712.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(668,24,1,'out',3751,'NL-HCH-001-1','Hóa chất Allantion','20241227','2027-12-26','2026-05-01 17:00:00.000',1538.0000,1538.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(669,24,1,'out',3747,'NL-HCH-031-1','Hóa chất D-PANTHENOL','TL02409085','2027-09-19','2026-05-01 17:00:00.000',10000.0000,10000.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(670,24,1,'out',3750,'NL-CXU-036','Hóa chất CS Ginger Ex- Chiết xuất Gừng','EI2501','2027-09-24','2026-05-01 17:00:00.000',100.0000,100.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(671,24,1,'out',3690,'NL-CXU-037','Hóa chất Ricobio JA7 (hỗn hợp các chiết xuất)','25091685','2027-09-15','2026-05-01 17:00:00.000',100.0000,100.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(672,24,1,'out',3604,'NL-TDA-012','Hóa chất Carbomer 940 EZ','B2E04349','2027-01-31','2026-05-01 17:00:00.000',2000.0000,2000.0000,0.0000,'Kg',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL),(673,24,1,'out',3700,'NL-DMO-029','Hóa chất Glycerin','014125IND3C5L','2027-03-26','2026-05-02 17:00:00.000',30000.0000,30000.0000,0.0000,'g',10,NULL,NULL,'2026-06-25 14:31:42.745','2026-06-25 14:31:42.745',NULL);
/*!40000 ALTER TABLE `production_order_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_order_logs`
--

DROP TABLE IF EXISTS `production_order_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_order_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `user_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `log_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `step` tinyint unsigned DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `production_order_logs_order_id_idx` (`order_id`) USING BTREE,
  KEY `production_order_logs_user_id_fkey` (`user_id`) USING BTREE,
  CONSTRAINT `production_order_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `production_order_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=417 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_order_logs`
--

LOCK TABLES `production_order_logs` WRITE;
/*!40000 ALTER TABLE `production_order_logs` DISABLE KEYS */;
INSERT INTO `production_order_logs` VALUES (397,23,5,'trinh@zencos.vn','Khởi tạo phiếu sản xuất PSX-20260624-5601','system',1,'2026-06-24 05:44:15.604'),(398,23,5,'trinh@zencos.vn','Chuyển trạng thái → Đã hủy','update',NULL,'2026-06-24 05:49:37.705'),(399,24,5,'trinh@zencos.vn','Khởi tạo phiếu sản xuất PSX-20260624-3227','system',1,'2026-06-24 05:50:53.229'),(400,24,5,'trinh@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 3 dòng','update',NULL,'2026-06-24 05:58:10.405'),(401,24,5,'trinh@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 3 dòng','update',NULL,'2026-06-24 05:58:12.207'),(402,24,5,'trinh@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 06:21:44.506'),(403,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 07:14:50.058'),(404,24,5,'trinh@zencos.vn','Chuyển sang Bước 2 – Nhập BTP','process',NULL,'2026-06-24 07:56:57.280'),(405,24,5,'trinh@zencos.vn','Chuyển sang Bước 3 – Xuất BTP','process',NULL,'2026-06-24 07:57:15.573'),(406,24,5,'trinh@zencos.vn','Chuyển sang Bước 4 – Nhập TP','process',NULL,'2026-06-24 07:58:54.092'),(407,24,5,'trinh@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 08:03:13.891'),(408,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:01:20.209'),(409,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:11:07.088'),(410,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:33:54.079'),(411,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:39:12.363'),(412,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:40:16.366'),(413,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 13:50:48.640'),(414,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-24 14:09:39.388'),(415,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-25 13:32:37.154'),(416,24,2,'admin@zencos.vn','Cập nhật Bước 1 – Xuất NVL – 10 dòng','update',NULL,'2026-06-25 14:31:42.745');
/*!40000 ALTER TABLE `production_order_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_orders`
--

DROP TABLE IF EXISTS `production_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sku_product_id` bigint unsigned DEFAULT NULL,
  `sku_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_step` tinyint NOT NULL DEFAULT '1',
  `status` enum('draft','in_progress','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `output_product_id` bigint unsigned DEFAULT NULL,
  `production_bom_id` bigint unsigned DEFAULT NULL,
  `planned_qty` decimal(15,4) DEFAULT NULL,
  `nvl_exported_at` datetime(3) DEFAULT NULL,
  `step1_processed_at` datetime DEFAULT NULL,
  `step2_processed_at` datetime DEFAULT NULL,
  `step3_processed_at` datetime DEFAULT NULL,
  `step4_processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `production_orders_status_idx` (`status`) USING BTREE,
  KEY `production_orders_issued_at_idx` (`issued_at`) USING BTREE,
  KEY `production_orders_created_by_idx` (`created_by`) USING BTREE,
  KEY `production_orders_sku_product_id_idx` (`sku_product_id`) USING BTREE,
  KEY `idx_prod_order_output_product` (`output_product_id`) USING BTREE,
  KEY `idx_production_orders_bom_id` (`production_bom_id`),
  CONSTRAINT `fk_prod_order_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `production_orders_sku_product_id_fkey` FOREIGN KEY (`sku_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_orders`
--

LOCK TABLES `production_orders` WRITE;
/*!40000 ALTER TABLE `production_orders` DISABLE KEYS */;
INSERT INTO `production_orders` VALUES (23,'PSX-20260624-5601','2026-05-03 17:00:00.000',NULL,NULL,NULL,NULL,1,'cancelled',NULL,5,'2026-06-24 05:44:15.604','2026-06-24 05:49:37.705',38,NULL,1.0000,NULL,NULL,NULL,NULL,NULL),(24,'PSX-20260624-3227','2026-04-05 00:00:00.000',NULL,NULL,NULL,NULL,4,'in_progress',NULL,5,'2026-06-24 05:50:53.229','2026-06-25 14:31:42.745',38,NULL,1.0000,NULL,'2026-05-01 17:00:00',NULL,NULL,NULL);
/*!40000 ALTER TABLE `production_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_output_transactions`
--

DROP TABLE IF EXISTS `production_output_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_output_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `production_order_id` bigint unsigned DEFAULT NULL,
  `tp_export_order_id` bigint unsigned DEFAULT NULL,
  `output_product_id` bigint unsigned NOT NULL,
  `type` enum('import_from_production','export_to_sale','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `warehouse_location_id` bigint unsigned DEFAULT NULL,
  `batch_lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `batch_expiry_date` date DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_production_order_id` (`production_order_id`) USING BTREE,
  KEY `idx_output_product_transaction` (`output_product_id`,`transaction_date`,`type`) USING BTREE,
  KEY `warehouse_location_id` (`warehouse_location_id`) USING BTREE,
  KEY `user_id` (`user_id`) USING BTREE,
  KEY `idx_production_output_transactions_tp_export_order_id` (`tp_export_order_id`) USING BTREE,
  CONSTRAINT `production_output_transactions_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_2` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_3` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `production_output_transactions_ibfk_5` FOREIGN KEY (`tp_export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_output_transactions`
--

LOCK TABLES `production_output_transactions` WRITE;
/*!40000 ALTER TABLE `production_output_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_output_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inci_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `has_expiry` tinyint(1) NOT NULL DEFAULT '1',
  `use_fefo` tinyint(1) NOT NULL DEFAULT '1',
  `base_unit` bigint unsigned NOT NULL,
  `order_unit` bigint unsigned DEFAULT NULL,
  `min_stock_level` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `product_type` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `products_code_key` (`code`) USING BTREE,
  KEY `products_order_unit_idx` (`order_unit`) USING BTREE,
  KEY `products_base_unit_fkey` (`base_unit`) USING BTREE,
  KEY `products_product_type_fkey` (`product_type`) USING BTREE,
  CONSTRAINT `products_base_unit_fkey` FOREIGN KEY (`base_unit`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_order_unit_fkey` FOREIGN KEY (`order_unit`) REFERENCES `product_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_product_type_fkey` FOREIGN KEY (`product_type`) REFERENCES `product_classifications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3825 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (3592,'NL-CNA-018','Hóa chất SUNOBEL PA','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:56.670','2026-06-24 13:19:44.567',27),(3593,'NL-HLI-179','Hương Monoi Paradis','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:57.051','2026-06-24 13:19:44.474',31),(3594,'NL-MCP-067','Hóa chất OTS-2 TIO2 CR50','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:57.264','2026-06-24 13:19:44.387',34),(3595,'BB-BK-001','Băng keo 48mm','',NULL,1,1,11,11,0.0000,'',NULL,'2026-06-12 14:03:57.573','2026-06-17 16:59:19.095',41),(3596,'BB-MANG-002','Màng co','',NULL,1,1,10,10,0.0000,'',NULL,'2026-06-12 14:03:57.798','2026-06-17 16:59:19.226',41),(3597,'NL-CXU-079','Hóa chất AC Care 1000','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.004','2026-06-24 13:19:44.321',26),(3598,'NL-HCH-084','Hóa chất Bee Tox H','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.098','2026-06-24 13:19:44.239',30),(3599,'NL-DBO-110','Hóa chất Parleam 4','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.513','2026-06-24 13:19:44.129',28),(3600,'NL-NHO-020','Hóa chất Neowax 165','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.583','2026-06-24 13:19:44.088',35),(3601,'NL-PGI-007','Hóa chất Flowsta Aso','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.694','2026-06-24 13:19:44.002',36),(3602,'NL-DBO-089','Hóa chất Cosmol 222','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:58.950','2026-06-24 13:19:43.916',28),(3603,'NL-DBO-118','Hóa chất Sophim MC 300','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.022','2026-06-24 13:19:43.830',28),(3604,'NL-TDA-012','Hóa chất Carbomer 940 EZ','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.116','2026-06-24 13:19:43.787',38),(3605,'NL-NHO-122','Hóa chất Resassol HR','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.186','2026-06-24 13:19:43.688',35),(3606,'NL-BQU-035','Hóa chất  Microcare PEHG','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.272','2026-06-24 13:19:43.642',25),(3607,'BB-MANG-003','Màng nhôm phức hợp phi 81.2','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:03:59.341','2026-06-17 16:59:20.494',41),(3608,'NL-TDA-027','Hóa chất Cellulose Ether (Mecellose)-HEC','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.474','2026-06-24 13:19:43.576',38),(3609,'BB-CARTON-004','Thùng Carton 5L 54 x 40 x 20','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:03:59.536','2026-06-17 16:59:20.666',41),(3610,'NL-CXU-095','Hóa chất ALPAFLOR EDELWEISS CB','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.624','2026-06-24 13:19:43.500',26),(3611,'NL-DMO-159','Hóa chất cồn 96 độ','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.711','2026-06-24 13:19:43.400',29),(3612,'NL-HLI-172','Hương Fresh Orchid GP 1146','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:03:59.821','2026-06-24 13:19:43.325',31),(3613,'NL-DBO-113','Hóa chất Water clear Refiined Jojoba Oil','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.024','2026-06-24 13:19:43.222',28),(3614,'NL-DBO-099','Hóa chất Dầu cám gạo','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.089','2026-06-24 13:19:43.091',28),(3615,'NL-DBO-101','Hóa chất Dầu Hạt Nho','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.287','2026-06-24 13:19:42.849',28),(3616,'NL-DBO-105','Hóa chất Dầu Oliu (Pomance Olive Oil)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.365','2026-06-24 13:19:42.776',28),(3617,'NL-PGI-033','Hóa chất Methyl Salicylate','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.500','2026-06-24 13:19:42.702',36),(3618,'NL-DMO-030','Hóa chất Propylene Glycol','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.581','2026-06-24 13:19:42.639',29),(3619,'NL-PGI-040','Hóa chất Triethanolamine (Tea)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.745','2026-06-24 13:19:42.472',36),(3620,'NL-HCH-034','Hóa chất HotFlux','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.843','2026-06-24 13:19:42.414',30),(3621,'NL-TID-200','Hóa chất Tinh dầu tràm trà','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:00.999','2026-06-24 13:19:42.275',39),(3622,'NL-HCH-056','Hóa chất Salicylic Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.102','2026-06-24 13:19:42.154',30),(3623,'NL-CXU-096','Hóa chất Akobiol HGL Centella','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.200','2026-06-24 13:19:42.090',26),(3624,'NL-PGI-062','Hóa chất Dissolvine Na2','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.540','2026-06-24 13:19:42.015',36),(3625,'NL-HCH-114','Hóa chất Lactic Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.755','2026-06-24 13:19:41.940',30),(3626,'NL-TDA-044','Hóa chất Makimouse 7','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.851','2026-06-24 13:19:41.858',38),(3627,'NL-DBO-158','Hóa chất dầu hạt trà','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.916','2026-06-24 13:19:41.757',28),(3628,'NL-NHO-121','Hóa chất Dehymuls LE','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:01.979','2026-06-24 13:19:41.713',35),(3629,'NL-CXU-154','Hóa chất Pearl Extract - Ngọc Trai','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.057','2026-06-24 13:19:41.603',26),(3630,'NL-CXU-157','Hóa chất Hibiscus EX - Bụp giấm','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.274','2026-06-24 13:19:41.554',26),(3631,'NL-TDA-003','Hóa chất Synthetic Beeswax','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.427','2026-06-24 13:19:41.513',38),(3632,'NL-SLI-009','Hóa chất SF 1642','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.564','2026-06-24 13:19:41.391',37),(3633,'NL-MCP-212','Hóa chất PT1BM30R7C','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.625','2026-06-24 13:19:41.349',34),(3634,'NL-MCP-213','Hóa chất PT1BM70U','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.725','2026-06-24 13:19:41.281',34),(3635,'NL-MCP-214','Hóa chất PT1BM70R','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.884','2026-06-24 13:19:41.237',34),(3636,'NL-DBO-132','Hóa chất SS4230 Fluid-Pail','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:02.959','2026-06-24 13:19:41.185',28),(3637,'NL-SLI-057','Hóa chất Serasilk EL 63','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.178','2026-06-24 13:19:41.065',37),(3638,'NL-TDA-059','Hóa chất Makigel OL','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.265','2026-06-24 13:19:41.018',38),(3639,'NL-NHO-125','Hóa chất Emulpharma PG 20','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.344','2026-06-24 13:19:40.911',35),(3640,'NL-NHO-137','Hóa chất Silsoft 1540','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.391','2026-06-24 13:19:40.636',35),(3641,'NL-TID-196','Hóa chất Tinh dầu gừng','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.464','2026-06-24 13:19:40.151',39),(3642,'NL-BQU-104','Hóa chất Glydant 2000','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.646','2026-06-24 13:19:39.902',25),(3643,'NL-DBO-055','Hóa chất Cetiol SB 45','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.724','2026-06-24 13:19:39.806',28),(3644,'NL-CXU-147','Hóa chất NexTrac LOTUS L LC','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.809','2026-06-24 13:19:39.715',26),(3645,'NL-BQU-104-1','Hóa chất Troycare BD55','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.881','2026-06-24 13:19:39.550',25),(3646,'NL-NHO-083','Hóa chất Repoly 415','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:03.935','2026-06-24 13:19:39.485',35),(3647,'NL-HCH-023','Hóa chất Glycolic Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.156','2026-06-24 13:19:39.259',30),(3648,'NL-NHO-085','Hóa chất Bentone Luxe XO','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.251','2026-06-24 13:19:39.201',35),(3649,'NL-DBO-087','Hóa chất TCG-M','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.366','2026-06-24 13:19:39.149',28),(3650,'NL-SLI-098','Hóa chất  SF1202','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.585','2026-06-24 13:19:39.041',37),(3651,'NL-NHO-083-1','Hóa chất Multicare AM 50KC-S','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.675','2026-06-24 13:19:38.996',35),(3652,'NL-LSA-091','Hóa chất Palm Kernel Diethanolamide (PKDE 90)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.746','2026-06-24 13:19:38.915',33),(3653,'NL-DBO-112','Hóa chất IPM (Palmsurf IPM 98)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.834','2026-06-24 13:19:38.868',28),(3654,'NL-NHO-126','Hóa chất Sinopol 25','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:04.963','2026-06-24 13:19:38.823',35),(3655,'NL-LSA-138','Hóa chất Texapon N70T','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.059','2026-06-24 13:19:38.776',33),(3656,'NL-TDA-015','Hóa chất Cetyl Alcohol','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.132','2026-06-24 13:19:38.706',38),(3657,'NL-DBO-086','Hóa chất Tegosoft TN','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.235','2026-06-24 13:19:38.660',28),(3658,'NL-LSA-136','Hóa chất  SodiumMethyl Cocoyl Taurate (Remild CT35)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.320','2026-06-24 13:19:38.604',33),(3659,'NL-NHO-024','Hóa chất Amud MG 60-04 K','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.434','2026-06-24 13:19:38.560',35),(3660,'NL-TDA-046','Hóa chất Edernor C14-99 MY BD (Axit Myrictic)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.519','2026-06-24 13:19:38.454',38),(3661,'NL-DMO-123','Hóa chất Polyethylene Glycol 400','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.572','2026-06-24 13:19:38.389',29),(3662,'NL-CXU-152','Hóa chất Akobiol HGL Witch Hazel','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.644','2026-06-24 13:19:36.876',26),(3663,'NL-TDA-006','Hóa chất S-Ben W','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.768','2026-06-24 13:19:36.794',38),(3664,'NL-CXU-155','Hóa chất bí ngô','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.817','2026-06-24 13:19:36.683',26),(3665,'NL-HCH-151','Hóa chất WP-APT3 500H','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:05.910','2026-06-24 13:19:36.603',30),(3666,'NL-HCH-069','Hóa chất SpecWhite TA - Tranexamic Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:06.048','2026-06-24 13:19:36.553',30),(3667,'NL-CXU-094','Hóa chất Saffron Ex-Nhụy hoa nghệ tây','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:06.180','2026-06-24 13:19:36.508',26),(3668,'NL-CXU-156','Hóa chất cotton hug - Hạt Bông Vải','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:06.386','2026-06-24 13:19:36.461',26),(3669,'NL-CXU-148','Hóa chất Muguet Flower Ex - Linh lan','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:06.735','2026-06-24 13:19:36.413',26),(3670,'NL-HCH-150','Hóa chất Collagen peptide 300','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:06.920','2026-06-24 13:19:36.351',30),(3671,'NL-TDA-027-1','Hóa chất Hydroxyethyl Cellulose - HEC 5000C','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.093','2026-06-24 13:19:35.826',38),(3672,'NL-HCH-076','Hóa chất Ceramide LC S-20','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.184','2026-06-24 13:19:35.659',30),(3673,'NL-HCH-077','Hóa chất Kojic Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.224','2026-06-24 13:19:35.594',30),(3674,'NL-CNA-108','Hóa chất Octyl Methoxcinnamate','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.306','2026-06-24 13:19:35.527',27),(3675,'NL-TDA-074','Hóa chất Xanthan Gum FNCS','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.388','2026-06-24 13:19:35.419',38),(3676,'NL-MCP-215','Hóa chất màu Neelicol Red Iron Oxide','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.596','2026-06-24 13:19:35.305',34),(3677,'NL-CNA-141','Hóa chất Octocrylene','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.765','2026-06-24 13:19:35.138',27),(3678,'NL-THU-209','Hóa chất Nguyên liệu trang trí Pearlets','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.821','2026-06-24 13:19:35.078',40),(3679,'NL-CNA-117','Hóa chất Parsol Max 25kg \r\r\nPlastic DR','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:07.872','2026-06-24 13:19:34.955',27),(3680,'NL-CNA-068','Hóa chất STV -455','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.099','2026-06-24 13:19:34.838',27),(3681,'NL-PGI-016','Hóa chất Acid Citric','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.328','2026-06-24 13:19:34.704',36),(3682,'NL-HCH-031','Hóa chất D-PANTHENOL USP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.485','2026-06-24 13:19:34.563',30),(3683,'NL-HCH-216','Hóa chất BIOTIN','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.622','2026-06-24 13:19:34.482',30),(3684,'NL-CNA-108-1','Hóa chất Uvirol OMC29','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.741','2026-06-24 13:19:34.405',27),(3685,'NL-HCH-069-1','Hóa chất Tranexamide Acid','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.796','2026-06-24 13:19:34.284',30),(3686,'NL-HCH-022','Hóa chất L-Glutathione Reduced','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:08.960','2026-06-24 13:19:34.178',30),(3687,'NL-TDA-012-1','Hóa chất TC-CARBOMER 340','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:09.106','2026-06-24 13:19:33.996',38),(3688,'NL-HCH-225','Hóa chất PHYCOSACCHARIDE AIP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:09.284','2026-06-24 13:19:33.838',30),(3689,'NL-MCP-078','Hóa chất SA/NAI-TR-10/D5 (80%) MIBRID','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:09.414','2026-06-24 13:19:33.766',34),(3690,'NL-CXU-037','Hóa chất Ricobio JA7 (hỗn hợp các chiết xuất)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:09.616','2026-06-24 13:19:33.679',26),(3691,'NL-CXU-149','Hóa chất Licorrice Ex - Cam Thảo','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:09.679','2026-06-24 13:19:33.570',26),(3692,'NL-CXU-093','Hóa chất Camomile Extract - Cúc La Mã','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.038','2026-06-24 13:19:33.516',26),(3693,'NL-HCH-026','Hóa chất Hyaluronic Acid 1%','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.131','2026-06-24 13:19:33.343',30),(3694,'NL-HCH-217','Hóa chất Syn-Coll','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.235','2026-06-24 13:19:33.281',30),(3695,'NL-CNA-108-2','Hóa chất SHIELD BISO OMC','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.319','2026-06-24 13:19:33.133',27),(3696,'NL-HCH-032','Hóa chất Vitamin E (DL-A Tocopheryl)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.470','2026-06-24 13:19:33.062',30),(3697,'NL-TDA-014','Hóa chất Thaiol 1618','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.563','2026-06-24 13:19:33.004',38),(3698,'NL-HCH-001','Hóa chất Blanova Active Allantoin EP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.763','2026-06-24 13:19:32.956',30),(3699,'NL-LMU-088','Hóa chất Miconium C TAC 29','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.836','2026-06-24 13:19:32.901',32),(3700,'NL-DMO-029','Hóa chất Glycerin','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.910','2026-06-24 13:19:32.852',29),(3701,'NL-MCP-067-1','Hóa chất Titan ALT-TSR-10','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:10.970','2026-06-24 13:19:32.807',34),(3702,'NL-DBO-120','Hóa chất White Oil Light','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.042','2026-06-24 13:19:32.357',28),(3703,'NL-HLI-218','Hóa chất hương liệu Blooming Rose','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.300','2026-06-24 13:19:32.279',31),(3704,'NL-HCH-130','Hóa chất BIOBLANCA-1,3-PDO','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.454','2026-06-24 13:19:32.223',30),(3705,'NL-TDA-003-1','Hóa chất Beeswax White (Sáp ong)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.510','2026-06-24 13:19:31.942',38),(3706,'NL-NHO-020-1','Hóa chất PEG-100 Stearate & Glyceryl monostearate, Resense 165A','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.573','2026-06-24 13:19:31.799',35),(3707,'NL-DBO-146','Hóa chất WHITE PETROLEUM JELLY (VA-ZƠ-LIN)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.701','2026-06-24 13:19:31.640',28),(3708,'NL-CXU-092','Hóa chất Chiết xuất Nha Đam - Jeju Aloe Vera Water','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.773','2026-06-24 13:19:31.584',26),(3709,'NL-DBO-086-1','Hóa chất C12-15 Alkyl Benzoate (Regrease AB)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.898','2026-06-24 13:19:31.538',28),(3710,'NL-DBO-087-1','Hoá chất Phụ gia - PALMESTER 3580','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:11.982','2026-06-24 13:19:31.498',28),(3711,'NL-SLI-103','Hóa chất DIMETHICONE 100 (Reshine 100)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.154','2026-06-24 13:19:31.397',37),(3712,'NL-NHO-116','Hóa chất Polyme tạo đặc- MULTICARE HA 40KC','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.222','2026-06-24 13:19:31.310',35),(3713,'NL-MCP-067-2','Hóa chất SI01-2 TiO2 CR-50','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.386','2026-06-24 13:19:31.245',34),(3714,'NL-TID-205','Hóa chất tinh dầu hoa cam','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.492','2026-06-24 13:19:31.180',39),(3715,'NL-TID-204','Hóa chất tinh dầu gỗ đàn hương 4144','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.679','2026-06-24 13:19:31.057',39),(3716,'NL-DBO-140','Hóa chất dầu Argan','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:12.916','2026-06-24 13:19:31.010',28),(3717,'NL-LSA-219','Hóa chất Resplanta Babassu MB','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.055','2026-06-24 13:19:30.914',33),(3718,'NL-MCP-216','Hóa chất Lavanya Flamingo','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.281','2026-06-24 13:19:30.863',34),(3719,'NL-MCP-217','Hóa chất Neelilake Tartrazine Lake','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.402','2026-06-24 13:19:30.751',34),(3720,'NL-MCP-218','Hóa chất Neelicol Black Iron Oxide','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.488','2026-06-24 13:19:30.705',34),(3721,'NL-HCH-082','Hóa chất Vegeles AHA LS9955','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.707','2026-06-24 13:19:30.659',30),(3722,'NL-HCH-218','Hóa chất Reaqua Zinc PCA','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.765','2026-06-24 13:19:30.582',30),(3723,'NL-DBO-143','Hóa chất T.I.O','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.842','2026-06-24 13:19:30.521',28),(3724,'NL-HCH-010','Hóa chất Hydrolyzed Keratin (Keratin thủy phân)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:13.941','2026-06-24 13:19:30.453',30),(3725,'NL-PGI-028','Hóa chất EDTA 4Na','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.038','2026-06-24 13:19:30.332',36),(3726,'NL-HCH-002','Hóa chất Alpha-Arbutin (TQ)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.088','2026-06-24 13:19:30.269',30),(3727,'NL-HCH-150-1','Hóa chất Starfish Collagen-collagen thủy phân','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.171','2026-06-24 13:19:30.181',30),(3728,'NL-TDA-011','Hóa chất Synthetic Candelilla Wax R-4 RSPO','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.247','2026-06-24 13:19:30.130',38),(3729,'NL-PGI-043','Hóa chất Magnesium Stearate','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.337','2026-06-24 13:19:30.067',36),(3730,'NL-PGI-058','Hóa chất Silight 6MC','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.429','2026-06-24 13:19:29.955',36),(3731,'NL-DBO-110-1','Hóa chất Luvitol Lite EM','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.513','2026-06-24 13:19:29.889',28),(3732,'NL-NHO-064','Hóa chất Cestopal 18/21M','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.576','2026-06-24 13:19:29.762',25),(3733,'NL-THU-039','Hóa chất Cosman CR530','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.645','2026-06-24 13:19:29.639',40),(3734,'NL-HCH-124','Hóa chất Pentavitin','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.731','2026-06-24 13:19:29.498',30),(3735,'NL-DBO-132-1','Hóa chất Chất tạo màng phim dạng lỏng KF-7312J (1KG/Lon)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.805','2026-06-24 13:19:29.369',28),(3736,'NL-MCP-219','Hóa chất Phẩm màu đỏ Idacol Ponceau 4R V103:1- 120','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.875','2026-06-24 13:19:29.327',34),(3737,'NL-HCH-026-1','Hóa chất Hyaluronsan HA-LQH','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:14.940','2026-06-24 13:19:29.272',30),(3738,'NL-HLI-220','Hóa chất Hương liệu ETERNAL FRAGRANCE AG04941','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.001','2026-06-24 13:19:29.219',31),(3739,'NL-BQU-035-1','Hóa chất ISCAGUARD PEHG','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.066','2026-06-24 13:19:29.087',25),(3740,'NL-DMO-029-1','Hóa chất GLYXERIN TINH KHIẾT 99,7%','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.164','2026-06-24 13:19:29.015',29),(3741,'NL-NHO-122-1','Hóa chất SINOPOL H1540-1','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.245','2026-06-24 13:19:28.970',35),(3742,'NL-SLI-133','Hóa chất Serashine EM301A','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.293','2026-06-24 13:19:28.915',37),(3743,'NL-LSA-138-1','Hóa chất SODIUM LAURYL ETHER SULFATE (SLES)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.362','2026-06-24 13:19:28.841',33),(3744,'NL-HCH-139','Hóa chất SODIUM LACTATE - PURASAL S','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.649','2026-06-24 13:19:28.754',30),(3745,'NL-THU-221','Hóa chất KIYU KY - Pearlizer II','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.742','2026-06-24 13:19:28.680',40),(3746,'NL-HCH-032-1','Hóa chất Vitamin E Acetate 98%','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:15.940','2026-06-24 13:19:28.560',30),(3747,'NL-HCH-031-1','Hóa chất D-PANTHENOL','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.022','2026-06-24 13:19:28.483',30),(3748,'NL-TID-202','Hóa chất Tinh Dầu Bưởi','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.138','2026-06-24 13:19:28.422',39),(3749,'NL-THU-207','Hóa chất Petals Pink','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.191','2026-06-24 13:19:28.346',40),(3750,'NL-CXU-036','Hóa chất CS Ginger Ex- Chiết xuất Gừng','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.257','2026-06-24 13:19:28.246',26),(3751,'NL-HCH-001-1','Hóa chất Allantion','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.360','2026-06-24 13:19:28.102',30),(3752,'NL-TDA-003-2','Hóa chất Cerafumei Synthetic Beewax 3001','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.451','2026-06-24 13:19:26.860',38),(3753,'NL-BQU-008-1','Hóa chất BHT (Dibuty Ihydroxytoluene)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.508','2026-06-24 13:19:26.807',25),(3754,'NL-LMU-025','Hóa chất Guar Hydroxypropyltrimonium Chloride, Resoft 14S','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.580','2026-06-24 13:19:26.700',32),(3755,'NL-TDA-063','Hóa chất Stearic Acid 38% (Wilfarin SA-1838)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.649','2026-06-24 13:19:26.594',38),(3756,'NL-MCP-067-3','Hóa chất Titanium Dioxide - TiO2 KA100','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.728','2026-06-24 13:19:26.539',34),(3757,'NL-HCH-073','Hóa chất Nicotinamide BP (Vitamin PP)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.820','2026-06-24 13:19:26.451',30),(3758,'NL-HCH-077-1','Hóa chất Kojic Acid Dipalmitate','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:16.911','2026-06-24 13:19:26.326',30),(3759,'NL-NHO-083-2','Hóa chất Polymer dạng lỏng (REPOLY 415)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.012','2026-06-24 13:19:26.235',35),(3760,'NL-LSA-090','Hóa chất hoạt động bề mặt CAB35 - Cocamidopropyl Betaine','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.151','2026-06-24 13:19:26.146',33),(3761,'NL-LSA-091-1','Hóa chất Climco Cdea (COCAMIDE DEA)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.301','2026-06-24 13:19:26.093',33),(3762,'NL-BQU-222','Hóa chất Microcare PE','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.500','2026-06-24 13:19:26.037',25),(3763,'NL-HCH-054','Hóa chất SpecKare RRT (Retinol)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.697','2026-06-24 13:19:25.988',30),(3764,'NL-TDA-050','Hóa chất Sepimax Zen','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.749','2026-06-24 13:19:25.798',38),(3765,'BB-HOP-005','Hộp giấy DC_serum','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:17.793','2026-06-17 16:59:39.073',42),(3766,'NL-HCH-031-2','Hóa chất D-Panthenol 98%','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:17.852','2026-06-24 13:19:25.760',30),(3767,'NL-HCH-032-2','Hóa chất DL-A-Tocopheryl Actate','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:18.211','2026-06-24 13:19:25.708',30),(3768,'NL-HCH-001-2','Hoá chất Allantoin USP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:18.265','2026-06-24 13:19:25.657',30),(3769,'NL-DMO-029-2','Hóa chất Mascerol Glycerine 99,7% USP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:18.327','2026-06-24 13:19:25.581',29),(3770,'BB-TEM-006','In nhãn (Tem NP Serum - Dr Cori 1.000 + Dư 2.000)','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 14:04:18.487','2026-06-17 16:59:39.560',42),(3771,'BB-TEM-007','In nhãn (Tem NP - Pro)','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 14:04:18.629','2026-06-17 16:59:39.650',42),(3772,'BB-TEM-008','In nhãn (Tem size 75 - Pro)','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 14:04:18.718','2026-06-17 16:59:39.756',42),(3773,'BB-TEM-009','In nhãn (Tem size 85 - Pro)','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 14:04:18.811','2026-06-17 16:59:39.860',42),(3774,'NL-DMO-030-2','Hóa chất Propylene Glycol USP/EP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.037','2026-06-24 13:19:25.516',29),(3775,'NL-HLI-223','Hóa chất hương liệu CRAZED HIM E23244285','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.211','2026-06-24 13:19:25.384',31),(3776,'NL-LMU-088-1','Hóa chất MICONIUM CTAC- 29','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.285','2026-06-24 13:19:25.314',32),(3777,'NL-LMU-051','Hóa chất Polyquaternium-10 (Resoft 3000)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.366','2026-06-24 13:19:25.230',32),(3778,'NL-HCH-216-1','Hóa chất dưỡng ẩm D-Biotin (Vitamin H)','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.596','2026-06-24 13:19:25.151',30),(3779,'NL-LMU-004','Hóa chất GENAMIN KDMP','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.783','2026-06-24 13:19:25.037',32),(3780,'NL-TDA-015-1','Hóa chất Thaiol 1698','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:19.946','2026-06-24 13:19:24.987',38),(3781,'NL-TDA-080','Hóa chất Cosman NB-1','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:20.062','2026-06-24 13:19:24.919',38),(3782,'NL-HLI-224','Hóa chất Hương Chanh Sả','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 14:04:20.113','2026-06-24 13:19:24.781',31),(3783,'BB-CARTON-010','Thùng carton 5L 660 x 360 x 245mm','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.201','2026-06-17 16:59:40.829',42),(3784,'BB-CHONGAM-011','Hạt chống ẩm Silicagel ĐG 3gr','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.283','2026-06-17 16:59:41.056',42),(3785,'BB-TUYP-200ML-012','Vỏ tuýp size 50 (PERFECT PRO)','',NULL,1,1,14,14,0.0000,'',NULL,'2026-06-12 14:04:20.359','2026-06-17 16:59:41.141',42),(3786,'BB-CHAI-50ML-013','Chai thủy tinh không nắp dung tích 50ml, loại VQT005','',NULL,1,1,15,15,0.0000,'',NULL,'2026-06-12 14:04:20.431','2026-06-17 16:59:41.212',42),(3787,'BB-NAP-014','Nắp chai CA004','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.481','2026-06-17 16:59:41.706',42),(3788,'BB-THUOCDAY-015','Thước dây_Cty Perfect Pro','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.563','2026-06-17 16:59:41.782',42),(3789,'BB-HOP-016','Hộp Gel EB - Excellent Gel','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.669','2026-06-17 16:59:41.986',42),(3790,'BB-HOP-017','Hộp Gel EB - Excellent Belt','',NULL,1,1,8,8,0.0000,'',NULL,'2026-06-12 14:04:20.730','2026-06-17 16:59:42.089',42),(3791,'BB-HOP-018','Hộp combo EB','',NULL,1,1,8,8,0.0000,'',NULL,'2026-06-12 14:04:20.808','2026-06-17 16:59:42.150',42),(3792,'BB-DAI-60-019','Đai EB - size 60','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.862','2026-06-17 16:59:42.205',42),(3793,'BB-DAI-65-020','Đai EB - size 65','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:20.941','2026-06-17 16:59:42.282',42),(3794,'BB-DAI-70-021','Đai EB - size 70','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:21.004','2026-06-17 16:59:42.473',42),(3795,'BB-DAI-75-022','Đai EB - size 75','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:21.062','2026-06-17 16:59:42.676',42),(3796,'BB-DAI-80-023','Đai EB - size 80','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:21.129','2026-06-17 16:59:42.778',42),(3797,'BB-DAI-85-024','Đai EB - size 85','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:21.186','2026-06-17 16:59:42.898',42),(3798,'BB-DAI-90-025','Đai EB - size 90','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-12 14:04:21.255','2026-06-17 16:59:43.058',42),(3799,'BB-TEM-026','Tem niêm phong - Excellent Gel','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 14:11:56.814','2026-06-12 15:18:40.426',42),(3800,'BB-TEM-60-026','Tem - size 60','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.422','2026-06-17 16:59:43.128',42),(3801,'BB-TEM-65-027','Tem - size 65','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.478','2026-06-17 16:59:43.230',42),(3802,'BB-TEM-70-028','Tem - size 70','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.545','2026-06-17 16:59:43.334',42),(3803,'BB-TEM-75-029','Tem - size 75','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.628','2026-06-17 16:59:43.399',42),(3804,'BB-TEM-80-030','Tem - size 80','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.678','2026-06-17 16:59:43.534',42),(3805,'BB-TEM-85-031','Tem - size 85','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.767','2026-06-17 16:59:43.602',42),(3806,'BB-TEM-90-032','Tem - size 90','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-12 15:19:55.836','2026-06-17 16:59:43.691',42),(3807,'NL-NHO-137-1','Hóa chất SILSOFT 1540 FLUID/PAIL/40LB-18.16KG','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-12 15:50:15.205','2026-06-24 13:19:24.728',35),(3808,'BB-NHAN-033','Nhãn chai HAIR SHAMPOO','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-15 10:05:25.118','2026-06-17 16:59:43.856',42),(3809,'BB-NHAN-034','Nhãn chai HAIR CONDITIONER','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-15 10:05:25.176','2026-06-17 16:59:43.915',42),(3810,'BB-CHAI-300ML-035','Chai Pet 300ml nâu','',NULL,1,1,15,15,0.0000,'',NULL,'2026-06-15 10:05:25.260','2026-06-17 16:59:44.038',42),(3811,'BB-NAP-300ML-036','Vòi nhấn 28 đen','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-15 10:05:25.327','2026-06-17 16:59:44.097',42),(3812,'BB-CARTON-038','Thùng carton 5L  420 x 310 x 270 mm','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-15 10:05:25.394','2026-06-17 16:59:44.230',42),(3813,'BB-TEM-037','Tem niêm phong D-C','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-15 10:09:04.561','2026-06-17 16:59:44.171',42),(3814,'NL-TDA-017','Hóa chất Rheopearl KL2','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-15 16:20:12.399','2026-06-24 13:19:24.654',38),(3815,'NL-DBO-210','Hóa chất Unifilma HVY','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-15 16:20:12.456','2026-06-24 13:19:24.487',28),(3816,'BB-TUYP-30ML-039','Tuýp nhựa đựng mỹ phẩm dung tích 30ml','',NULL,1,1,14,14,0.0000,'',NULL,'2026-06-15 16:20:12.578','2026-06-17 16:59:44.456',42),(3817,'BB-HOP-040','HỘP NATURAL TONE UP SUN MILK','',NULL,1,1,8,8,0.0000,'',NULL,'2026-06-15 16:26:26.506','2026-06-17 16:59:44.637',42),(3818,'NL-LSA-091-2','Hóa chất Palm Kernel Diethanolamide 90%','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-16 13:28:30.075','2026-06-24 13:19:24.438',33),(3819,'NL-PGI-060','Hóa chất Muối tinh khiết','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-16 13:28:30.150','2026-06-24 13:19:24.382',36),(3820,'NL-PGI-052','Hóa chất Kali Hydroxyt (KOH) CN','',NULL,1,1,2,10,0.0000,'',NULL,'2026-06-16 13:28:30.210','2026-06-24 13:19:24.294',36),(3821,'BB-NHAN-053','Nhãn chai DẦU DƯỠNG TÓC 50ml','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-17 10:41:03.577','2026-06-17 16:59:45.037',42),(3822,'BB-HOP-054','Hộp DẦU DƯỠNG TÓC 50ml','',NULL,1,1,7,7,0.0000,'',NULL,'2026-06-17 10:41:41.486','2026-06-17 16:59:45.097',42),(3823,'BB-TEM-055','Tem niêm phong - WinKorea','',NULL,1,1,13,13,0.0000,'',NULL,'2026-06-17 15:29:33.484','2026-06-17 16:59:45.185',42),(3824,'BB-CHAI-30ML-056','Chai HA+ WHITENING SERUM 30ml','',NULL,1,1,15,15,0.0000,'',NULL,'2026-06-17 16:59:45.263','2026-06-17 16:59:45.263',42);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products_outputs`
--

DROP TABLE IF EXISTS `products_outputs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_outputs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `output_type` enum('finished','semi_finished') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_po_code` (`code`) USING BTREE,
  KEY `idx_po_output_type` (`output_type`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products_outputs`
--

LOCK TABLES `products_outputs` WRITE;
/*!40000 ALTER TABLE `products_outputs` DISABLE KEYS */;
INSERT INTO `products_outputs` VALUES (27,'BTP_BGTM-001AP','BTP_EXCELLENT GEL','','semi_finished','Tube','',NULL,'2026-06-12 14:02:46.263','2026-06-12 14:02:46.263'),(28,'TP_BGTM-001AP','TP_EXCELLENT GEL','','finished','Hộp','',NULL,'2026-06-12 14:02:46.420','2026-06-12 14:02:46.420'),(29,'TP_BGTM-001AP_Size 60','TP_EXCELLENT BELT_Size 60','','finished','Hộp','',NULL,'2026-06-12 14:02:46.511','2026-06-12 14:02:46.511'),(30,'TP_BGTM-001AP_Size 65','TP_EXCELLENT BELT_Size 65','','finished','Hộp','',NULL,'2026-06-12 14:02:46.582','2026-06-24 13:34:09.476'),(31,'TP_BGTM-001AP_Size 70','TP_EXCELLENT BELT_Size 70','','finished','Hộp','',NULL,'2026-06-12 14:02:46.645','2026-06-24 13:34:04.675'),(32,'TP_BGTM-001AP_Size 75','TP_EXCELLENT BELT_Size 75','','finished','Hộp','',NULL,'2026-06-12 14:02:46.707','2026-06-24 13:34:04.387'),(33,'TP_BGTM-001AP_Size 80','TP_EXCELLENT BELT_Size 80','','finished','Hộp','',NULL,'2026-06-12 14:02:46.747','2026-06-24 13:34:04.080'),(34,'TP_BGTM-001AP_Size 85','TP_EXCELLENT BELT_Size 85','','finished','Hộp','',NULL,'2026-06-12 14:02:46.972','2026-06-24 13:34:03.755'),(35,'TP_BGTM-001AP_Size 90','TP_EXCELLENT BELT_Size 90','','finished','Hộp','',NULL,'2026-06-12 14:02:47.055','2026-06-12 14:02:47.055'),(36,'TP_combo_BGTM-001AP','TP_Combo_EXCELLENT GEL & BELT','','finished','Hộp','',NULL,'2026-06-12 14:02:47.228','2026-06-12 14:02:47.228'),(37,'BTP_HDDT-001AP','BTP_ClmenStore_DẦU DƯỠNG TÓC 50ML','','semi_finished','Chai','',NULL,'2026-06-12 14:02:47.298','2026-06-12 14:02:47.298'),(38,'BTPN_BGTM-001AP','BTPN_Gel tan mỡ (EXCELLENT GEL)','','semi_finished','kg','',NULL,'2026-06-12 14:02:47.367','2026-06-12 14:02:47.367'),(39,'BTPN_HDDT-001AP','BTPN_ClmenStore_DẦU DƯỠNG TÓC','','semi_finished','kg','',NULL,'2026-06-12 14:02:47.479','2026-06-12 14:02:47.479'),(40,'TP_HDDT-001AP','TP_ClmenStore_DẦU DƯỠNG TÓC 50ML','','finished','Hộp','',NULL,'2026-06-12 14:02:47.510','2026-06-12 14:02:47.510'),(41,'BTP_FSRU-001AP','BTP_D-C_HA+ WHITENING SERUM 30ML','','semi_finished','Chai','',NULL,'2026-06-12 14:02:47.594','2026-06-12 14:02:47.594'),(42,'BTPN_FSRU-001AP','BTPN_D-C_Serum_HA+ WHITENING SERUM','','semi_finished','kg','',NULL,'2026-06-12 14:02:47.663','2026-06-12 14:02:47.663'),(43,'TP_FSRU-001AP','TP_D-C_HA+ WHITENING SERUM 30ML','','finished','Hộp','',NULL,'2026-06-12 14:02:47.723','2026-06-12 14:02:47.723'),(44,'BTPN_HDGO-001AP','BTPN_ClmenStore_Dầu gội Biotin (HAIR SHAMPOO)','','semi_finished','kg','',NULL,'2026-06-12 14:02:47.812','2026-06-12 14:02:47.812'),(45,'TP_HDGO-001AP','TP_ClmenStore_HAIR SHAMPOO 330ML','','finished','Chai','',NULL,'2026-06-12 14:02:47.877','2026-06-12 14:02:47.877'),(46,'BTPN_HDXA-001AP','BTPN_ClmenStore_Dầu xả Biotin (HAIR CONDITIONER)','','semi_finished','kg','',NULL,'2026-06-12 14:02:48.097','2026-06-12 14:02:48.097'),(47,'TP_HDXA-001AP','TP_ClmenStore_Dầu xả Biotin (HAIR CONDITIONER)','','finished','Chai','',NULL,'2026-06-12 14:02:48.204','2026-06-12 14:02:48.204');
/*!40000 ALTER TABLE `products_outputs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_request_items`
--

DROP TABLE IF EXISTS `purchase_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_request_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_request_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `export_order_item_id` bigint unsigned DEFAULT NULL,
  `quantity_needed_base` decimal(15,4) NOT NULL,
  `received_qty_base` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `unit_display` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15,4) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `purchase_request_items_purchase_request_id_fkey` (`purchase_request_id`) USING BTREE,
  KEY `purchase_request_items_product_id_fkey` (`product_id`) USING BTREE,
  KEY `purchase_request_items_export_order_item_id_fkey` (`export_order_item_id`) USING BTREE,
  CONSTRAINT `purchase_request_items_export_order_item_id_fkey` FOREIGN KEY (`export_order_item_id`) REFERENCES `export_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_request_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_request_items_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_request_items`
--

LOCK TABLES `purchase_request_items` WRITE;
/*!40000 ALTER TABLE `purchase_request_items` DISABLE KEYS */;
INSERT INTO `purchase_request_items` VALUES (90,29,3807,NULL,2.2000,2200.0000,'Kg',2.2000,0.00,NULL,'2026-06-12 08:57:43.165','2026-06-18 07:31:42.492'),(94,30,3814,NULL,600.0000,600.0000,'Kg',0.6000,0.00,NULL,'2026-06-16 06:02:35.567','2026-06-18 07:03:01.068'),(95,30,3815,NULL,200.0000,200.0000,'Kg',0.2000,0.00,NULL,'2026-06-16 06:02:35.567','2026-06-24 06:07:19.762'),(96,31,3816,NULL,2500.0000,2500.0000,'tube',2500.0000,0.00,NULL,'2026-06-16 06:09:33.249','2026-06-24 03:36:34.850'),(97,31,3817,NULL,2500.0000,2500.0000,'Hộp',2500.0000,0.00,NULL,'2026-06-16 06:09:33.249','2026-06-18 07:14:09.948'),(98,32,3725,NULL,5000.0000,5000.0000,'Kg',5.0000,0.00,NULL,'2026-06-16 06:12:19.603','2026-06-18 06:55:07.024'),(101,33,3789,NULL,20000.0000,20000.0000,'Cái',20000.0000,0.00,NULL,'2026-06-16 06:15:42.056','2026-06-16 09:20:52.624'),(102,33,3790,NULL,10000.0000,10000.0000,'Hộp',10000.0000,0.00,NULL,'2026-06-16 06:15:42.056','2026-06-18 06:58:28.113'),(103,34,3818,NULL,12000.0000,12012000.0000,'Kg',12.0000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:10:08.208'),(104,34,3781,NULL,11000.0000,11000.0000,'Kg',11.0000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:15:13.369'),(105,34,3733,NULL,1000.0000,1000.0000,'Kg',1.0000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:18:38.716'),(106,34,3675,NULL,500.0000,500.0000,'Kg',0.5000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:20:05.891'),(107,34,3819,NULL,5000.0000,5000.0000,'Kg',5.0000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:26:51.663'),(108,34,3820,NULL,5000.0000,0.0000,'Kg',5.0000,0.00,NULL,'2026-06-16 06:44:52.174','2026-06-16 06:44:52.174'),(109,35,3791,NULL,10000.0000,0.0000,'Hộp',10000.0000,0.00,NULL,'2026-06-16 06:46:40.067','2026-06-16 06:46:40.067'),(110,36,3690,NULL,300.0000,300.0000,'Kg',0.3000,0.00,NULL,'2026-06-16 06:48:36.782','2026-06-24 05:07:12.300'),(111,37,3693,NULL,1500.0000,1500.0000,'Kg',1.5000,0.00,NULL,'2026-06-16 06:56:09.441','2026-06-24 05:40:12.535'),(112,38,3807,NULL,2200.0000,2200.0000,'Kg',2.2000,0.00,NULL,'2026-06-24 03:58:41.239','2026-06-24 04:01:52.998'),(113,39,3820,NULL,5000.0000,5000.0000,'Kg',5.0000,0.00,NULL,'2026-06-24 04:48:44.877','2026-06-24 05:03:03.461');
/*!40000 ALTER TABLE `purchase_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requests`
--

DROP TABLE IF EXISTS `purchase_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint unsigned DEFAULT NULL,
  `request_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `receiving_location_id` bigint unsigned DEFAULT NULL,
  `status` enum('draft','submitted','approved','ordered','partially_received','received','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `expected_date` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `Dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime(3) DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `ordered_at` datetime(3) DEFAULT NULL,
  `received_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `purchase_requests_request_ref_key` (`request_ref`) USING BTREE,
  KEY `purchase_requests_status_idx` (`status`) USING BTREE,
  KEY `purchase_requests_export_order_id_idx` (`export_order_id`) USING BTREE,
  KEY `purchase_requests_requested_by_fkey` (`requested_by`) USING BTREE,
  KEY `purchase_requests_approved_by_fkey` (`approved_by`) USING BTREE,
  KEY `purchase_requests_supplier_id_fkey` (`supplier_id`) USING BTREE,
  KEY `idx_purchase_requests_receiving_location_id` (`receiving_location_id`) USING BTREE,
  CONSTRAINT `purchase_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_export_order_id_fkey` FOREIGN KEY (`export_order_id`) REFERENCES `export_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_receiving_location_id_fkey` FOREIGN KEY (`receiving_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_requests_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requests`
--

LOCK TABLES `purchase_requests` WRITE;
/*!40000 ALTER TABLE `purchase_requests` DISABLE KEYS */;
INSERT INTO `purchase_requests` VALUES (29,NULL,'PO-20260612-155255',5,NULL,208,NULL,'received',NULL,NULL,NULL,'2026-06-12 08:57:43.703',NULL,NULL,'2026-05-04 00:00:00.000','2026-06-12 08:52:55.327','2026-06-18 07:31:42.498'),(30,NULL,'PO-20260615-163002',5,NULL,208,NULL,'received','2026-05-03',NULL,NULL,'2026-06-16 06:02:35.684',NULL,NULL,'2026-05-03 00:00:00.000','2026-06-15 09:31:33.297','2026-06-24 06:07:19.770'),(31,NULL,'PO-20260616-130925',5,NULL,208,NULL,'received','2026-05-02',NULL,NULL,'2026-06-16 06:09:33.400',NULL,NULL,'2026-05-04 00:00:00.000','2026-06-16 06:09:33.249','2026-06-24 03:36:34.858'),(32,NULL,'PO-20260616-131012',5,NULL,129,NULL,'received','2026-05-03',NULL,NULL,'2026-06-16 06:12:19.933',NULL,NULL,'2026-04-05 00:00:00.000','2026-06-16 06:12:19.603','2026-06-18 06:55:07.032'),(33,NULL,'PO-20260616-131353',5,NULL,146,NULL,'received','2026-04-13',NULL,NULL,'2026-06-16 06:15:42.319',NULL,NULL,'2026-04-17 00:00:00.000','2026-06-16 06:14:03.679','2026-06-18 06:58:28.119'),(34,NULL,'PO-20260616-133839',5,NULL,133,NULL,'partially_received','2026-05-07',NULL,NULL,'2026-06-16 06:44:52.507',NULL,NULL,NULL,'2026-06-16 06:44:52.174','2026-06-24 04:26:51.669'),(35,NULL,'PO-20260616-134520',5,NULL,159,NULL,'submitted','2026-04-19',NULL,NULL,'2026-06-16 06:46:42.455',NULL,NULL,NULL,'2026-06-16 06:46:40.067','2026-06-16 06:46:42.456'),(36,NULL,'PO-20260616-134713',5,NULL,113,NULL,'received','2026-05-11',NULL,NULL,'2026-06-16 06:48:37.010',NULL,NULL,'2026-05-11 00:00:00.000','2026-06-16 06:48:36.782','2026-06-24 05:07:12.306'),(37,NULL,'PO-20260616-135501',5,NULL,129,10,'received','2026-05-18',NULL,NULL,'2026-06-16 06:56:09.685',NULL,NULL,'2026-05-18 00:00:00.000','2026-06-16 06:56:09.441','2026-06-24 05:40:12.543'),(38,NULL,'PO-20260624-105739',5,NULL,208,10,'received','2026-05-03',NULL,NULL,'2026-06-24 03:58:41.404',NULL,NULL,'2026-05-04 00:00:00.000','2026-06-24 03:58:41.239','2026-06-24 04:01:53.004'),(39,NULL,'PO-20260624-114359',5,NULL,113,10,'received','2026-04-03',NULL,NULL,'2026-06-24 04:48:45.199',NULL,NULL,'2026-04-03 00:00:00.000','2026-06-24 04:48:44.877','2026-06-24 05:03:03.467');
/*!40000 ALTER TABLE `purchase_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `suppliers_code_key` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=258 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (112,'NCC-NL-3CP','Công ty Cố Phần 3C Pharma','','','','',NULL,'2026-06-12 13:56:34.467','2026-06-12 13:56:34.467'),(113,'NCC-NL-3HV','Công ty TNHH Hóa Mỹ Phẩm 3H Việt Nam','','','','',NULL,'2026-06-12 13:56:34.553','2026-06-12 13:56:34.553'),(114,'NCC-NL-ASS','Công ty Cổ Phần Ánh Sáng Châu Á','','','','',NULL,'2026-06-12 13:56:34.662','2026-06-12 13:56:34.662'),(115,'NCC-NL-AKH','Công ty TNHH Sản xuất Thương Mại Xuất Nhập Khẩu Anh Khoa','','','','',NULL,'2026-06-12 13:56:34.694','2026-06-12 13:56:34.694'),(116,'NCC-NL-BET','Công Ty TNHH Brenntag Việt Nam','','','','',NULL,'2026-06-12 13:56:34.730','2026-06-12 13:56:34.730'),(117,'NCC-NL-CST','Công ty TNHH Caldic Special Ties Việt Nam','','','','',NULL,'2026-06-12 13:56:34.768','2026-06-12 13:56:34.768'),(118,'NCC-NL-CMC','Công ty TNHH Chemico Việt Nam','','','','',NULL,'2026-06-12 13:56:34.827','2026-06-12 13:56:34.827'),(119,'NCC-NL-ICO','Công ty TNHH Iwase Cosfa Việt Nam','','','','',NULL,'2026-06-12 13:56:34.888','2026-06-12 13:56:34.888'),(120,'NCC-NL-DLS','Công Ty TNHH Tinh Dầu Thảo Dược Dalosa Việt Nam','','','','',NULL,'2026-06-12 13:56:34.969','2026-06-12 13:56:34.969'),(121,'NCC-NL-DMT','Công ty TNHH Dermatech Việt Nam','','','','',NULL,'2026-06-12 13:56:35.015','2026-06-12 13:56:35.015'),(122,'NCC-NL-DKS','Công ty TNHH DKSH Việt Nam','','','','',NULL,'2026-06-12 13:56:35.083','2026-06-12 13:56:35.083'),(123,'NCC-NL-BOC','Công ty Cổ Phần Hóa chất Đại Dương Xanh','','','','',NULL,'2026-06-12 13:56:35.225','2026-06-12 13:56:35.225'),(124,'NCC-NL-GAR','Công ty TNHH Fresh Ingredients','','','','',NULL,'2026-06-12 13:56:35.285','2026-06-12 13:56:35.285'),(125,'NCC-NL-GRE','Công Ty TNHH Green Cosmetic Ingredients','','','','',NULL,'2026-06-12 13:56:35.368','2026-06-12 13:56:35.368'),(126,'NCC-NL-HVU','Công ty TNHH Thương Mại và Sản Xuất Hoàn Vũ','','','','',NULL,'2026-06-12 13:56:35.438','2026-06-12 13:56:35.438'),(127,'NCC-NL-HLP','HƯNG LONG PHÁT','','','','',NULL,'2026-06-12 13:56:35.509','2026-06-12 13:56:35.509'),(128,'NCC-NL-JEJ','Công Ty TNHH Jebsen & Jessen Ingredients Việt Nam','','','','',NULL,'2026-06-12 13:56:35.584','2026-06-12 13:56:35.584'),(129,'NCC-NL-KNG','Công ty TNHH Khang Ngọc','','','','',NULL,'2026-06-12 13:56:35.630','2026-06-12 13:56:35.630'),(130,'NCC-NL-MSM','Công ty TNHH Matsumoto Trading Việt Nam','','','','',NULL,'2026-06-12 13:56:35.682','2026-06-12 13:56:35.682'),(131,'NCC-NL-MIA','Công ty TNHH Thương Mại Dịch Vụ Hóa Chất Mỹ Phẩm Mia','','','','',NULL,'2026-06-12 13:56:36.024','2026-06-12 13:56:36.024'),(132,'NCC-NL-MIF','Công ty TNHH MiFa','','','','',NULL,'2026-06-12 13:56:36.146','2026-06-12 13:56:36.146'),(133,'NCC-NL-NBA','Công ty TNHH Sản xuất và Thương mại Nguyễn Bá','','','','',NULL,'2026-06-12 13:56:36.367','2026-06-12 13:56:36.367'),(134,'NCC-NL-OKI','Công ty TNHH Oking Việt Nam','','','','',NULL,'2026-06-12 13:56:36.450','2026-06-12 13:56:36.450'),(135,'NCC-NL-OGN','Công ty Cố Phần Quốc Tế Organic','','','','',NULL,'2026-06-12 13:56:36.509','2026-06-12 13:56:36.509'),(136,'NCC-NL-PMI','Công ty Cố Phần Thương Mại Và Xuất Nhập Khẩu Phương Minh','','','','',NULL,'2026-06-12 13:56:36.648','2026-06-12 13:56:36.648'),(137,'NCC-NL-SPC','Công ty TNHH MTV Hóa - Dược Sài Gòn','','','','',NULL,'2026-06-12 13:56:36.719','2026-06-12 13:56:36.719'),(138,'NCC-NL-SMF','Công ty TNHH MTV Vật Liệu Smallfortune','','','','',NULL,'2026-06-12 13:56:36.859','2026-06-12 13:56:36.859'),(139,'NCC-NL-TTR','Hộ kinh doanh cửa hàng hóa chất Tiên Tri','','','','',NULL,'2026-06-12 13:56:37.270','2026-06-12 13:56:37.270'),(140,'NCC-NL-TKC','Công ty TNHH TK Cosmetic','','','','',NULL,'2026-06-12 13:56:37.368','2026-06-12 13:56:37.368'),(141,'NCC-NL-TNG','Công ty TNHH Đầu Tư Quốc Tế Tường Ngọc','','','','',NULL,'2026-06-12 13:56:37.538','2026-06-12 13:56:37.538'),(142,'NCC-NL-VHU','VIỆT HƯƠNG','','','','',NULL,'2026-06-12 13:56:37.592','2026-06-12 13:56:37.592'),(143,'NCC-NL-YLA','Công ty TNHH Tinh Dầu Thiên Nhiên Y Lang','','','','',NULL,'2026-06-12 13:56:37.721','2026-06-12 13:56:37.721'),(144,'NCC-NL-DMA','Công ty CP Mỹ Phẩm Dermatrix','','','','',NULL,'2026-06-12 13:56:37.782','2026-06-12 13:56:37.782'),(145,'NCC-NL-FKS','Công ty TNHH Fuji Kasei Việt Nam','','','','',NULL,'2026-06-12 13:56:37.858','2026-06-12 13:56:37.858'),(146,'NCC-BB-TRT','Công ty Cổ Phần In Trường Tín','','','','',NULL,'2026-06-12 13:56:38.052','2026-06-12 13:56:38.052'),(147,'NCC-BB-STA','Công ty TNHH Song Tạo','','','','',NULL,'2026-06-12 13:56:38.141','2026-06-12 13:56:38.141'),(148,'NCC-BB-DPT','Công ty TNHH Băng keo Đại Phú Trọng','','','','',NULL,'2026-06-12 13:56:38.188','2026-06-12 13:56:38.188'),(149,'NCC-VT-CHA','Công ty TNHH Thương Mại Cẩm Hào','','','','',NULL,'2026-06-12 13:56:38.296','2026-06-12 13:56:38.296'),(150,'NCC-BB-NAN','Công ty TNHH Nhựa Anna','','','','',NULL,'2026-06-12 13:56:38.376','2026-06-12 13:56:38.376'),(151,'NCC-BB-TQU','Công ty TNHH Bao Bì Trung Quân','','','','',NULL,'2026-06-12 13:56:38.448','2026-06-12 13:56:38.448'),(152,'NCC-BB-ANK','Công ty TNHH Sản xuất và Thương mại An Khang Hy','','','','',NULL,'2026-06-12 13:56:38.599','2026-06-12 13:56:38.599'),(153,'NCC-BB-PNG','Công ty TNHH Thương Mại và Sản Xuất Phúc Nguyên','','','','',NULL,'2026-06-12 13:56:38.826','2026-06-12 13:56:38.826'),(154,'NCC-BB-KHN','Công ty TNHH Bao Bì Khôi Nguyên','','','','',NULL,'2026-06-12 13:56:38.983','2026-06-12 13:56:38.983'),(155,'NCC-BB-SKR','Công ty TNHH sản xuất Thương Mại Sakura','','','','',NULL,'2026-06-12 13:56:39.210','2026-06-12 13:56:39.210'),(156,'NCC-BB-THN','Công ty TNHH SX TM Bao Bì Thảo Nguyên','','','','',NULL,'2026-06-12 13:56:39.366','2026-06-12 13:56:39.366'),(157,'NCC-BB-NTK','Công ty TNHH Sản Xuất Thương Mại Nhựa Tân Khoa','','','','',NULL,'2026-06-12 13:56:39.435','2026-06-12 13:56:39.435'),(158,'NCC-BB-MHI','Công ty TNHH Kỹ Thuật Minh Hiển','','','','',NULL,'2026-06-12 13:56:39.493','2026-06-12 13:56:39.493'),(159,'NCC-BB-KTP','Cty TNHH Thiết Kế In Ấn Bao Bao Bì Khang Thịnh Phát','','','','',NULL,'2026-06-12 13:56:39.589','2026-06-12 13:56:39.589'),(208,'NCC-BB-ZCVL','Chi nhánh Zencos Vĩnh Long','','','','',NULL,'2026-06-12 15:44:18.135','2026-06-12 15:44:18.135');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tp_export_order_history`
--

DROP TABLE IF EXISTS `tp_export_order_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_export_order_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint unsigned NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `data` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `tp_export_order_history_export_order_id_idx` (`export_order_id`) USING BTREE,
  KEY `tp_export_order_history_created_at_idx` (`created_at`) USING BTREE,
  KEY `fk_tp_history_actor` (`actor_id`) USING BTREE,
  CONSTRAINT `fk_tp_history_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_history_order` FOREIGN KEY (`export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tp_export_order_history`
--

LOCK TABLES `tp_export_order_history` WRITE;
/*!40000 ALTER TABLE `tp_export_order_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `tp_export_order_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tp_export_order_items`
--

DROP TABLE IF EXISTS `tp_export_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_export_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `export_order_id` bigint unsigned NOT NULL,
  `output_product_id` bigint unsigned NOT NULL,
  `lot_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `warehouse_location_id` bigint unsigned DEFAULT NULL,
  `quantity_base` decimal(15,4) NOT NULL,
  `unit_used` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_display` decimal(15,4) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `tp_export_order_items_export_order_id_idx` (`export_order_id`) USING BTREE,
  KEY `tp_export_order_items_output_product_id_idx` (`output_product_id`) USING BTREE,
  KEY `fk_tp_item_location` (`warehouse_location_id`) USING BTREE,
  CONSTRAINT `fk_tp_item_location` FOREIGN KEY (`warehouse_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_item_order` FOREIGN KEY (`export_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_item_output_product` FOREIGN KEY (`output_product_id`) REFERENCES `products_outputs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tp_export_order_items`
--

LOCK TABLES `tp_export_order_items` WRITE;
/*!40000 ALTER TABLE `tp_export_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `tp_export_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tp_export_orders`
--

DROP TABLE IF EXISTS `tp_export_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_export_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `source_location_id` bigint unsigned DEFAULT NULL,
  `source_order_id` bigint unsigned DEFAULT NULL,
  `adjusted_by_order_id` bigint unsigned DEFAULT NULL,
  `exported_at` datetime(3) DEFAULT NULL,
  `status` enum('pending','fulfilled','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `dien_giai` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `tp_export_orders_source_order_id_key` (`source_order_id`) USING BTREE,
  UNIQUE KEY `tp_export_orders_adjusted_by_order_id_key` (`adjusted_by_order_id`) USING BTREE,
  KEY `tp_export_orders_source_order_id_idx` (`source_order_id`) USING BTREE,
  KEY `tp_export_orders_adjusted_by_order_id_idx` (`adjusted_by_order_id`) USING BTREE,
  KEY `tp_export_orders_source_location_id_idx` (`source_location_id`) USING BTREE,
  KEY `fk_tp_export_customer` (`customer_id`) USING BTREE,
  KEY `fk_tp_export_created_by` (`created_by`) USING BTREE,
  CONSTRAINT `fk_tp_export_adjusted_by` FOREIGN KEY (`adjusted_by_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_location` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_tp_export_source_order` FOREIGN KEY (`source_order_id`) REFERENCES `tp_export_orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tp_export_orders`
--

LOCK TABLES `tp_export_orders` WRITE;
/*!40000 ALTER TABLE `tp_export_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `tp_export_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'warehouse_staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `users_email_key` (`email`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@zencos.local','$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu','Admin Zencos','admin',1,'2026-03-30 14:30:07.287','2026-03-30 14:30:07.287',NULL),(2,'admin@zencos.vn','$2a$10$Ew87NqAXsVlUb5OI48J.JOo9tBb2vXWqGejpxcD0TmMMMHy31ADEO','Administrator','admin',1,'2026-05-05 09:28:51.700','2026-06-01 07:22:50.997',NULL),(4,'muahang@zencos.vn','$2a$10$GZ3HwGVcxSTJfYWsnRncJO66OGC.MZBQdh4hTIdC8YiiUxHoXlBTu','Nguyen Van Mua Hang','warehouse_manager',1,'2026-05-05 12:51:45.729','2026-05-05 12:53:36.856',NULL),(5,'trinh@zencos.vn','$2a$10$SpzaEz8speAAzT9nS7tp..Z1akiGwY/ftGMWFsXTaUY757aQKdpqm','Diễm Trinh','admin',1,'2026-06-02 11:50:28.157','2026-06-02 11:50:28.157',NULL),(6,'batong2008@gmail.com','$2a$10$iAT0LHQInNn9VhcFBoevR.JsoSGtKWtQXFxvsIxvS2Yc7TPc2lcyK','Tòng Nguyễn','admin',1,'2026-06-03 06:18:06.988','2026-06-03 06:18:06.988',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'ZencosNVL'
--

--
-- Dumping routines for database 'ZencosNVL'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-26 13:59:04
