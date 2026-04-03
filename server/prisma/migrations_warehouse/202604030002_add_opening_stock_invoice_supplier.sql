ALTER TABLE `opening_stock_items`
  ADD COLUMN `invoice_no` VARCHAR(100) NULL AFTER `opening_date`,
  ADD COLUMN `invoice_date` DATE NULL AFTER `invoice_no`,
  ADD COLUMN `supplier_id` BIGINT UNSIGNED NULL AFTER `invoice_date`;

CREATE INDEX `opening_stock_items_supplier_id_idx`
  ON `opening_stock_items`(`supplier_id`);

ALTER TABLE `opening_stock_items`
  ADD CONSTRAINT `opening_stock_items_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
