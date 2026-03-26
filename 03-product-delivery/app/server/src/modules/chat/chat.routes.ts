import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { ChatService } from './chat.service.js'
import {
  SendMessageSchema,
  GetHistorySchema,
  ListConversationsSchema,
} from './chat.schema.js'
import { z } from 'zod'

export const chatRoutes: FastifyPluginAsync = async (app) => {
  const chatService = new ChatService()

  // POST /api/chat/messages — Send a message and get AI response
  app.post('/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const input = SendMessageSchema.parse(request.body)
    const result = await chatService.sendMessage(
      request.currentUser.id,
      request.currentUser.accountId,
      input,
    )
    return reply.send(result)
  })

  // GET /api/chat/conversations — List user's conversations
  app.get('/conversations', { preHandler: [authenticate] }, async (request, reply) => {
    const input = ListConversationsSchema.parse(request.query)
    const result = chatService.listConversations(request.currentUser.id, input)
    return reply.send(result)
  })

  // POST /api/chat/conversations — Create new conversation
  app.post('/conversations', { preHandler: [authenticate] }, async (request, reply) => {
    const conv = chatService.createConversation(request.currentUser.id)
    return reply.status(201).send(conv)
  })

  // GET /api/chat/conversations/:conversationId/messages — Get message history
  app.get('/conversations/:conversationId/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string }
    const query = request.query as Record<string, string>

    const input = GetHistorySchema.parse({
      conversationId,
      cursor: query.cursor,
      limit: query.limit,
    })

    const result = chatService.getHistory(request.currentUser.id, input)
    return reply.send(result)
  })

  // PATCH /api/chat/conversations/:conversationId/archive — Archive conversation
  app.patch('/conversations/:conversationId/archive', { preHandler: [authenticate] }, async (request, reply) => {
    const { conversationId } = z.object({ conversationId: z.string().uuid() }).parse(request.params)
    const result = chatService.archiveConversation(request.currentUser.id, conversationId)
    return reply.send(result)
  })
}
