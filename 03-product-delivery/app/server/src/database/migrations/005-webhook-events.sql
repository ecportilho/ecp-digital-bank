-- ECP Digital Bank — Webhook events (idempotency ledger)
-- Migration: 005-webhook-events.sql
-- Stores every webhook delivery we process so we can no-op on replays

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  payload TEXT NOT NULL,
  UNIQUE(source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source_event ON webhook_events(source, event_id);
