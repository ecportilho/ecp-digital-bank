import { getDb } from '../../database/connection.js'
import { Errors } from '../../shared/errors/app-error.js'
import { generateId } from '../../shared/utils/uuid.js'
import { classifyIntent } from './agents/orchestrator.js'
import { handleKnowledge } from './agents/knowledge.js'
import { handleRules } from './agents/rules.js'
import { handleTransaction } from './agents/transaction.js'
import type {
  ChatConversationRow,
  ChatMessageRow,
  SendMessageInput,
  GetHistoryInput,
  ListConversationsInput,
} from './chat.schema.js'

function toConversationResponse(row: ChatConversationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function safeJsonParse(str: string | null): unknown {
  if (!str) return null
  try {
    // Remove control characters that break JSON.parse
    const sanitized = str.replace(/[\x00-\x1F\x7F]/g, ' ')
    return JSON.parse(sanitized)
  } catch {
    return null
  }
}

function toMessageResponse(row: ChatMessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    agent: row.agent,
    intent: row.intent,
    toolCalls: safeJsonParse(row.tool_calls),
    metadata: safeJsonParse(row.metadata),
    createdAt: row.created_at,
  }
}

export class ChatService {
  createConversation(userId: string, title?: string) {
    const db = getDb()
    const id = generateId()

    db.prepare(`
      INSERT INTO chat_conversations (id, user_id, title, status)
      VALUES (?, ?, ?, 'active')
    `).run(id, userId, title ?? null)

    const row = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as ChatConversationRow
    return toConversationResponse(row)
  }

  listConversations(userId: string, input: ListConversationsInput) {
    const db = getDb()
    const limit = input.limit

    let query = `
      SELECT * FROM chat_conversations
      WHERE user_id = ? AND status = 'active'
    `
    const params: unknown[] = [userId]

    if (input.cursor) {
      const cursorRow = db
        .prepare('SELECT updated_at FROM chat_conversations WHERE id = ?')
        .get(input.cursor) as { updated_at: string } | undefined

      if (cursorRow) {
        query += ' AND updated_at < ?'
        params.push(cursorRow.updated_at)
      }
    }

    query += ' ORDER BY updated_at DESC LIMIT ?'
    params.push(limit + 1) // +1 to detect if there's a next page

    const rows = db.prepare(query).all(...params) as ChatConversationRow[]
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)

    return {
      conversations: items.map(toConversationResponse),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1]!.id : null,
    }
  }

  getHistory(userId: string, input: GetHistoryInput) {
    const db = getDb()
    const limit = input.limit

    // Verify ownership
    const conv = db
      .prepare('SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?')
      .get(input.conversationId, userId) as { id: string } | undefined

    if (!conv) {
      throw Errors.chatConversationNotFound()
    }

    let query = `
      SELECT * FROM chat_messages
      WHERE conversation_id = ?
    `
    const params: unknown[] = [input.conversationId]

    if (input.cursor) {
      const cursorRow = db
        .prepare('SELECT created_at FROM chat_messages WHERE id = ?')
        .get(input.cursor) as { created_at: string } | undefined

      if (cursorRow) {
        query += ' AND created_at < ?'
        params.push(cursorRow.created_at)
      }
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit + 1)

    const rows = db.prepare(query).all(...params) as ChatMessageRow[]
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)

    return {
      messages: items.reverse().map(toMessageResponse),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1]!.id : null,
    }
  }

  archiveConversation(userId: string, conversationId: string) {
    const db = getDb()

    const conv = db
      .prepare('SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?')
      .get(conversationId, userId) as { id: string } | undefined

    if (!conv) {
      throw Errors.chatConversationNotFound()
    }

    db.prepare(`
      UPDATE chat_conversations SET status = 'archived', updated_at = datetime('now') WHERE id = ?
    `).run(conversationId)

    return { message: 'Conversa arquivada com sucesso.' }
  }

  async sendMessage(userId: string, accountId: string, input: SendMessageInput) {
    const db = getDb()

    // 1. Create or retrieve conversation
    let conversationId = input.conversationId
    if (!conversationId) {
      const conv = this.createConversation(userId)
      conversationId = conv.id
    } else {
      // Verify ownership
      const conv = db
        .prepare('SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?')
        .get(conversationId, userId) as { id: string } | undefined

      if (!conv) {
        throw Errors.chatConversationNotFound()
      }
    }

    // 2. Save user message
    const userMsgId = generateId()
    db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content)
      VALUES (?, ?, 'user', ?)
    `).run(userMsgId, conversationId, input.message)

    // Update conversation timestamp
    db.prepare(`
      UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?
    `).run(conversationId)

    // 3. Get conversation history for context
    const historyRows = db
      .prepare(`
        SELECT role, content FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `)
      .all(conversationId) as Array<{ role: string; content: string }>

    // Filter to only user/assistant messages for AI context
    const conversationHistory = historyRows
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20) // Last 20 messages for context

    // 4. Classify intent via orchestrator
    let classification: Awaited<ReturnType<typeof classifyIntent>>
    try {
      classification = await classifyIntent(input.message, conversationHistory)
    } catch (err) {
      console.error('[chat] Erro ao classificar intent:', (err as Error).message)
      classification = { intent: 'GENERAL:OUT_OF_SCOPE', agent: 'orchestrator' }
    }

    let aiResponse: string
    let toolCalls: Record<string, unknown>[] | undefined
    const agent = classification.agent

    // 5. Route to the correct agent (with error handling)
    try {
      switch (agent) {
        case 'orchestrator': {
          aiResponse = classification.directResponse
            ?? 'Olá! Sou o assistente virtual do ECP Bank. Como posso ajudar você hoje?'
          break
        }
        case 'knowledge': {
          aiResponse = await handleKnowledge(input.message, conversationHistory)
          break
        }
        case 'rules': {
          aiResponse = await handleRules(input.message, conversationHistory)
          break
        }
        case 'transaction': {
          const result = await handleTransaction(input.message, conversationHistory, userId, accountId)
          aiResponse = result.response
          toolCalls = result.toolCalls
          break
        }
        default: {
          aiResponse = 'Desculpe, não consegui processar sua mensagem. Pode tentar novamente?'
        }
      }
    } catch (err) {
      console.error(`[chat] Erro no agente ${agent}:`, (err as Error).message)
      aiResponse = 'Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?'
    }

    // 6. Save assistant message (sanitize to avoid control characters in JSON)
    const assistantMsgId = generateId()
    const safeToolCalls = toolCalls ? JSON.stringify(toolCalls).replace(/[\x00-\x1F\x7F]/g, ' ') : null
    db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, agent, intent, tool_calls, metadata)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)
    `).run(
      assistantMsgId,
      conversationId,
      aiResponse,
      agent,
      classification.intent,
      safeToolCalls,
      JSON.stringify({ origin: 'chatbot' }),
    )

    // 7. Update conversation title if it's the first message
    const msgCount = (
      db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?').get(conversationId) as { count: number }
    ).count

    if (msgCount <= 2) {
      // Auto-generate title from first message
      const title = input.message.length > 50
        ? input.message.slice(0, 47) + '...'
        : input.message
      db.prepare('UPDATE chat_conversations SET title = ? WHERE id = ?').run(title, conversationId)
    }

    return {
      conversationId,
      message: {
        id: assistantMsgId,
        conversationId,
        role: 'assistant',
        content: aiResponse,
        agent,
        intent: classification.intent,
        toolCalls: toolCalls ?? null,
        metadata: { origin: 'chatbot' },
        createdAt: new Date().toISOString(),
      },
    }
  }
}
