ALTER TABLE inbound_receipts
  ADD COLUMN current_step TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER qc_checked_at;

UPDATE inbound_receipts
SET current_step = CASE
  WHEN notes REGEXP '(^|\\n)\\[DRAFT_STEP\\]=1(\\n|$)' THEN 1
  WHEN notes REGEXP '(^|\\n)\\[DRAFT_STEP\\]=2(\\n|$)' THEN 2
  WHEN notes REGEXP '(^|\\n)\\[DRAFT_STEP\\]=3(\\n|$)' THEN 3
  WHEN notes REGEXP '(^|\\n)\\[DRAFT_STEP\\]=4(\\n|$)' THEN 4
  ELSE 2
END;