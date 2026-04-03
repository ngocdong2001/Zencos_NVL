-- Set default for existing NULL rows before making NOT NULL
UPDATE `opening_stock_items`
SET `opening_date` = CURDATE()
WHERE `opening_date` IS NULL;

-- Make opening_date NOT NULL
ALTER TABLE `opening_stock_items`
  MODIFY COLUMN `opening_date` DATE NOT NULL;
