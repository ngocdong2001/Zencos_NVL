-- AlterTable: add phone column to suppliers
ALTER TABLE `suppliers` ADD COLUMN `phone` VARCHAR(50) NULL AFTER `name`;
