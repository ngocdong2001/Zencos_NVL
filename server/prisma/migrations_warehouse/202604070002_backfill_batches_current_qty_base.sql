UPDATE batches b
SET b.current_qty_base = b.received_qty_base + COALESCE((
  SELECT SUM(
    CASE t.type
      WHEN 'import' THEN t.quantity_base
      WHEN 'export' THEN -t.quantity_base
      ELSE t.quantity_base
    END
  )
  FROM inventory_transactions t
  WHERE t.batch_id = b.id
), 0);
