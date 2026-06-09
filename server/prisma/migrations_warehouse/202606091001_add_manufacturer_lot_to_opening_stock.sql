-- AddColumn manufacturer_lot_no to opening_stock_items
ALTER TABLE `opening_stock_items`
ADD COLUMN `manufacturer_lot_no` VARCHAR(100) NULL AFTER `lot_no`;

-- Add index on manufacturer_lot_no for potential searches
CREATE INDEX `opening_stock_items_manufacturer_lot_no_idx` ON `opening_stock_items`(`manufacturer_lot_no`);
