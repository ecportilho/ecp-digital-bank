import { z } from 'zod'

// ===== ENUMS =====
export const chatRoleEnum = z.enum(['user', 'assistant', 'system'])
export type ChatRole = z.infer<typeof chatRoleEnum>

export const conversationStatusEnum = z.enum(['active', 'archived'])
export type ConversationStatus = z.infer<typeof conversationStatusEnum>

export const chatIntentEnum = z.enum([
  // FAQ & Uso do App
  'FAQ:NAVIGATION',
  'FAQ:FEATURE',
  'FAQ:SECURITY',
  // Regras de Negócio
  'RULES:PIX_LIMITS',
  'RULES:TED_LIMITS',
  'RULES:CARD_RULES',
  'RULES:KYC_RULES',
  'RULES:ACCOUNT_STATUS',
  // Transações
  'TRANSACTION:PIX_SEND',
  'TRANSACTION:BALANCE',
  'TRANSACTION:STATEMENT',
  'TRANSACTION:CARD_CREATE',
  'TRANSACTION:CARD_BLOCK',
  'TRANSACTION:KYC_STATUS',
  // Genérico
  'GENERAL:GREETING',
  'GENERAL:OUT_OF_SCOPE',
])
export type ChatIntent = z.infer<typeof chatIntentEnum>

export const agentNameEnum = z.enum([
  'orchestrator',
  'knowledge',
  'rules',
  'transaction',
])
export type AgentName = z.infer<typeof agentNameEnum>

// ===== INPUT SCHEMAS =====
export const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
})
export type SendMessageInput = z.infer<typeof SendMessageSchema>

export const GetHistorySchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type GetHistoryInput = z.infer<typeof GetHistorySchema>

export const ListConversationsSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})
export type ListConversationsInput = z.infer<typeof ListConversationsSchema>

// ===== ROW TYPES =====
export interface ChatConversationRow {
  id: string
  user_id: string
  title: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ChatMessageRow {
  id: string
  conversation_id: string
  role: string
  content: string
  agent: string | null
  intent: string | null
  tool_calls: string | null
  metadata: string | null
  created_at: string
}
