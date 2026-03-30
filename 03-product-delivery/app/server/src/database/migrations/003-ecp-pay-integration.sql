-- ECP Digital Bank — ECP Pay Integration
-- Migration: 003-ecp-pay-integration.sql
-- Adds metadata column to transactions for storing ECP Pay references

ALTER TABLE transactions ADD COLUMN metadata TEXT;
