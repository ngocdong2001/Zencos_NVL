-- Migration: rename catalog_classifications -> product_classifications
-- and make products.product_type reference product_classifications.id

RENAME TABLE `catalog_classifications` TO `product_classifications`;

ALTER TABLE `product_classifications`
  RENAME INDEX `catalog_classifications_code_key` TO `product_classifications_code_key`;

ALTER TABLE `products`
  ADD COLUMN `product_type_new` BIGINT UNSIGNED NULL;

INSERT INTO `product_classifications` (`code`, `name`, `notes`, `created_at`, `updated_at`)
SELECT DISTINCT p.`product_type`, p.`product_type`, NULL, NOW(3), NOW(3)
FROM `products` p
LEFT JOIN `product_classifications` pc ON pc.`code` = p.`product_type`
WHERE pc.`id` IS NULL;

UPDATE `products` p
JOIN `product_classifications` pc ON pc.`code` = p.`product_type`
SET p.`product_type_new` = pc.`id`;

SET @fallback_classification_id = (
  SELECT `id`
  FROM `product_classifications`
  ORDER BY `id`
  LIMIT 1
);

UPDATE `products`
SET `product_type_new` = @fallback_classification_id
WHERE `product_type_new` IS NULL;

ALTER TABLE `products`
  DROP COLUMN `product_type`;

ALTER TABLE `products`
  CHANGE COLUMN `product_type_new` `product_type` BIGINT UNSIGNED NOT NULL;

ALTER TABLE `products`
  ADD CONSTRAINT `products_product_type_fkey`
  FOREIGN KEY (`product_type`) REFERENCES `product_classifications`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
