import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { PaymentsService } from './payments.service.js'
import { PayBoletoSchema } from './payments.schema.js'

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  const paymentsService = new PaymentsService()

  // POST /api/payments/boleto
  app.post('/boleto', { preHandler: [authenticate] }, async (request, reply) => {
    const input = PayBoletoSchema.parse(request.body)
    const result = await paymentsService.payBoleto(
      request.currentUser.id,
      request.currentUser.accountId,
      input,
      request.currentUser.name,
      request.currentUser.cpf
    )
    return reply.status(201).send(result)
  })

  // GET /api/payments/scheduled
  app.get('/scheduled', { preHandler: [authenticate] }, async (request, reply) => {
    const result = paymentsService.listScheduled(
      request.currentUser.id,
      request.currentUser.accountId
    )
    return reply.send({ payments: result })
  })

  // DELETE /api/payments/scheduled/:id
  app.delete('/scheduled/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = paymentsService.cancelScheduled(
      request.currentUser.id,
      request.currentUser.accountId,
      id
    )
    return reply.send(result)
  })
}
