-- AddColumn manufacturer_lot_no to batches
ALTER TABLE `batches`
ADD COLUMN `manufacturer_lot_no` VARCHAR(100) NULL AFTER `lot_no`;

-- Add index on manufacturer_lot_no for potential searches
CREATE INDEX `batches_manufacturer_lot_no_idx` ON `batches`(`manufacturer_lot_no`);
