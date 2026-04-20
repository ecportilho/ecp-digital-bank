import type { FastifyPluginAsync } from 'fastify'
import { AppError } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { WebhooksService } from './webhooks.service.js'
import { EcpPayWebhookSchema } from './webhooks.schema.js'

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  const service = new WebhooksService()

  // POST /api/webhooks/ecp-pay/payment-confirmed
  app.post('/ecp-pay/payment-confirmed', async (request, reply) => {
    const expectedSecret = process.env.ECP_PAY_WEBHOOK_SECRET
    const providedSecret = request.headers['x-webhook-secret']

    if (!expectedSecret) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Webhook secret não configurado no servidor',
        500
      )
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Webhook secret inválido', 401)
    }

    const input = EcpPayWebhookSchema.parse(request.body)
    const result = service.processEcpPayPaymentConfirmed(input)

    if (result.status === 'duplicate') {
      return reply.status(200).send({ status: 'duplicate', message: 'Evento já processado' })
    }

    if (result.status === 'not_found') {
      return reply.status(200).send({ status: 'not_found', message: 'Transação não localizada' })
    }

    return reply.status(200).send({
      status: 'processed',
      transactionId: result.transactionId,
      newStatus: result.newStatus,
    })
  })
}
