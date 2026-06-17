-- AddColumn manufacturer_lot_no to inbound_receipt_items
ALTER TABLE `inbound_receipt_items`
ADD COLUMN `manufacturer_lot_no` VARCHAR(100) NULL AFTER `lot_no`;
