-- Migration: 202604070001_add_batches_current_qty_base
-- Thêm cột current_qty_base vào bảng batches để lưu tồn kho hiện tại theo lô.
-- Cột này được cập nhật atomic cùng với inventory_transactions (qua prisma.$transaction),
-- đảm bảo không bao giờ lệch sổ so với ledger.
-- Xem chi tiết kiến trúc: docs/inventory-stock-management.md

ALTER TABLE batches
  ADD COLUMN current_qty_base DECIMAL(15,4) NOT NULL DEFAULT 0
    COMMENT 'Running balance per batch. Initialized from received_qty_base + existing transactions. Updated atomically with inventory_transactions via prisma.$transaction.'
  AFTER received_qty_base;

-- Backfill theo Kịch bản B:
--   received_qty_base là số lượng đầu kỳ (không có InventoryTransaction tương ứng)
--   Các transaction sau đó (import/export/adjustment) được cộng dồn vào
UPDATE batches b
SET b.current_qty_base = b.received_qty_base + COALESCE((
  SELECT SUM(
    CASE t.type
      WHEN 'import'     THEN  t.quantity_base
      WHEN 'export'     THEN -t.quantity_base
      ELSE                   t.quantity_base  -- adjustment: client truyền âm để giảm
    END
  )
  FROM inventory_transactions t
  WHERE t.batch_id = b.id
), 0);
