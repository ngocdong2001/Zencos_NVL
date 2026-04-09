ALTER TABLE opening_stock_items
  ADD COLUMN posting_status ENUM('draft', 'posted', 'failed') NOT NULL DEFAULT 'draft' AFTER has_document,
  ADD COLUMN posted_batch_id BIGINT UNSIGNED NULL AFTER posting_status,
  ADD COLUMN posted_tx_id BIGINT UNSIGNED NULL AFTER posted_batch_id,
  ADD COLUMN posted_at DATETIME(3) NULL AFTER posted_tx_id;

CREATE INDEX idx_opening_stock_items_posting_status ON opening_stock_items(posting_status);
CREATE INDEX idx_opening_stock_items_posted_batch_id ON opening_stock_items(posted_batch_id);
CREATE INDEX idx_opening_stock_items_posted_tx_id ON opening_stock_items(posted_tx_id);
