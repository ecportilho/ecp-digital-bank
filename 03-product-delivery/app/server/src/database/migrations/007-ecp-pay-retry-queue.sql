-- ECP Digital Bank — ECP Pay retry queue
-- Migration: 007-ecp-pay-retry-queue.sql
-- When an ECP Pay call fails we enqueue it instead of silently losing it.

CREATE TABLE IF NOT EXISTS ecp_pay_retry_queue (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('boleto', 'pix', 'card')),
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'dead_letter')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ecp_pay_retry_status_next ON ecp_pay_retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_ecp_pay_retry_transaction ON ecp_pay_retry_queue(transaction_id);
