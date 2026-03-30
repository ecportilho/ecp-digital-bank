import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { Errors } from '../../shared/errors/app-error.js'
import { CardsService } from './cards.service.js'
import { UpdateCardLimitSchema, BlockCardSchema, CardPurchaseInputSchema, CardPurchaseByNumberSchema } from './cards.schema.js'

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

  // POST /api/cards/:id/purchase — process a card purchase
  app.post('/:id/purchase', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = CardPurchaseInputSchema.parse(request.body)
    const result = cardsService.cardPurchase(request.currentUser.id, id, input)
    return reply.status(201).send(result)
  })

  // POST /api/cards/purchase-by-number — process a purchase by card number (system/service accounts only)
  app.post('/purchase-by-number', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.currentUser.role !== 'system') {
      throw Errors.forbidden('Only system service accounts can use purchase-by-number. Regular users should use POST /api/cards/:id/purchase.')
    }
    const input = CardPurchaseByNumberSchema.parse(request.body)
    const card = cardsService.findCardByNumber(input.cardNumber)
    const result = cardsService.cardPurchase(card.userId, card.id, {
      amountCents: input.amountCents,
      description: input.description,
      merchantName: input.merchantName,
      merchantCategory: input.merchantCategory,
    })
    return reply.status(201).send(result)
  })
}
