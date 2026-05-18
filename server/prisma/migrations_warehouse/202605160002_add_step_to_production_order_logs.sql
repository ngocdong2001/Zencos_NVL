-- Add `step` column to production_order_logs to allow per-step filtering
ALTER TABLE `production_order_logs`
  ADD COLUMN `step` TINYINT UNSIGNED NULL AFTER `log_type`;
