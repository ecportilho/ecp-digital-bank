-- ECP Digital Bank — Recurring payments
-- Migration: 008-recurrence.sql

ALTER TABLE transactions ADD COLUMN recurrence_parent_id TEXT;
ALTER TABLE transactions ADD COLUMN recurrence_rule TEXT;
ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_parent ON transactions(recurrence_parent_id);
