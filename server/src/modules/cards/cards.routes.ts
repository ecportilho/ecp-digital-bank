import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { CardsService } from './cards.service.js'
import { UpdateCardLimitSchema, BlockCardSchema } from './cards.schema.js'

export const cardsRoutes: FastifyPluginAsync = async (app) => {
  const cardsService = new CardsService()

  // GET /api/cards
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const cards = cardsService.listCards(request.currentUser.id)
    return reply.send({ cards })
  })

  // GET /api/cards/:id
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const card = cardsService.getCard(request.currentUser.id, id)
    return reply.send(card)
  })

  // PATCH /api/cards/:id/limit
  app.patch('/:id/limit', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateCardLimitSchema.parse(request.body)
    const card = cardsService.updateLimit(request.currentUser.id, id, input)
    return reply.send(card)
  })

  // PATCH /api/cards/:id/block
  app.patch('/:id/block', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = BlockCardSchema.parse(request.body)
    const card = cardsService.blockCard(request.currentUser.id, id, input)
    return reply.send(card)
  })

  // GET /api/cards/:id/invoice
  app.get('/:id/invoice', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = cardsService.getCurrentInvoice(request.currentUser.id, id)
    return reply.send(result)
  })
}
