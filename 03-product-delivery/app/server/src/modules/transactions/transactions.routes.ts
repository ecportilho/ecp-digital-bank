import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { TransactionsService } from './transactions.service.js'
import { ListTransactionsQuerySchema } from './transactions.schema.js'

export const transactionsRoutes: FastifyPluginAsync = async (app) => {
  const transactionsService = new TransactionsService()

  // GET /api/transactions
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const query = ListTransactionsQuerySchema.parse(request.query)
    const result = transactionsService.listTransactions(request.currentUser.id, query)
    return reply.send(result)
  })

  // GET /api/transactions/:id
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const transaction = transactionsService.getTransaction(request.currentUser.id, id)
    return reply.send(transaction)
  })
}
