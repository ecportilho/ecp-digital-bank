-- Migration: 004-user-roles.sql
-- Add role column to users (consumer = normal user, system = service account)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'consumer';
