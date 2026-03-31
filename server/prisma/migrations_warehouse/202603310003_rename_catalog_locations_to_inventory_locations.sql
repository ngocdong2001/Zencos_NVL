-- Migration: rename catalog_locations to inventory_locations

RENAME TABLE `catalog_locations` TO `inventory_locations`;

ALTER TABLE `inventory_locations`
  RENAME INDEX `catalog_locations_code_key` TO `inventory_locations_code_key`;
