import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { AccountsService } from './accounts.service.js'
import { UpdateLimitSchema } from './accounts.schema.js'

export const accountsRoutes: FastifyPluginAsync = async (app) => {
  const accountsService = new AccountsService()

  // GET /api/accounts/me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const account = accountsService.getAccount(request.currentUser.id)
    return reply.send(account)
  })

  // GET /api/accounts/me/balance
  app.get('/me/balance', { preHandler: [authenticate] }, async (request, reply) => {
    const balance = accountsService.getBalance(request.currentUser.id)
    return reply.send(balance)
  })

  // PATCH /api/accounts/me/limit
  app.patch('/me/limit', { preHandler: [authenticate] }, async (request, reply) => {
    const input = UpdateLimitSchema.parse(request.body)
    const account = accountsService.updateDailyLimit(request.currentUser.id, input)
    return reply.send(account)
  })
}
