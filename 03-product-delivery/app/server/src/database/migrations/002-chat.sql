-- ECP Digital Bank — Chat AI Assistant Schema
-- Migration: 002-chat.sql

CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  agent TEXT CHECK (agent IN ('orchestrator', 'knowledge', 'rules', 'transaction')),
  intent TEXT,
  tool_calls TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_updated_at ON chat_conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source);
