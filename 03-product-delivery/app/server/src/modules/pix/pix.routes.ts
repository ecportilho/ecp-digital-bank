import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { PixService } from './pix.service.js'
import { CreatePixKeySchema, PixTransferSchema, PixQrCodeSchema } from './pix.schema.js'
import { z } from 'zod'

export const pixRoutes: FastifyPluginAsync = async (app) => {
  const pixService = new PixService()

  // GET /api/pix/keys
  app.get('/keys', { preHandler: [authenticate] }, async (request, reply) => {
    const keys = pixService.listKeys(request.currentUser.id)
    return reply.send({ keys })
  })

  // POST /api/pix/keys
  app.post('/keys', { preHandler: [authenticate] }, async (request, reply) => {
    const input = CreatePixKeySchema.parse(request.body)
    const key = pixService.createKey(
      request.currentUser.id,
      request.currentUser.accountId,
      input
    )
    return reply.status(201).send(key)
  })

  // DELETE /api/pix/keys/:keyId
  app.delete('/keys/:keyId', { preHandler: [authenticate] }, async (request, reply) => {
    const { keyId } = request.params as { keyId: string }
    const result = pixService.deleteKey(request.currentUser.id, keyId)
    return reply.send(result)
  })

  // POST /api/pix/transfer
  app.post('/transfer', { preHandler: [authenticate] }, async (request, reply) => {
    const input = PixTransferSchema.parse(request.body)
    const result = pixService.transfer(
      request.currentUser.id,
      request.currentUser.accountId,
      input
    )
    return reply.status(201).send(result)
  })

  // POST /api/pix/qrcode — Generate QR code for receiving Pix payments via ECP Pay
  app.post('/qrcode', { preHandler: [authenticate] }, async (request, reply) => {
    const input = PixQrCodeSchema.parse(request.body)
    const result = await pixService.generatePixQrCode(
      request.currentUser.id,
      request.currentUser.accountId,
      input.amountCents,
      request.currentUser.name,
      request.currentUser.cpf,
      input.description
    )
    return reply.status(201).send(result)
  })

  // GET /api/pix/lookup?key=
  app.get('/lookup', { preHandler: [authenticate] }, async (request, reply) => {
    const { key } = z.object({ key: z.string().min(1) }).parse(request.query)
    const result = pixService.lookupKey(key)
    return reply.send(result)
  })

  // POST /api/pix/debit-by-cpf — Service account debits user account (simulates Pix payment)
  app.post('/debit-by-cpf', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.currentUser.role !== 'system') {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Apenas contas de serviço podem usar este endpoint' } })
    }

    const input = z.object({
      cpf: z.string().min(11).max(14),
      amountCents: z.number().int().positive(),
      description: z.string().min(1).max(200),
      merchantName: z.string().min(1).max(100),
    }).parse(request.body)

    const result = pixService.debitByCpf(input)
    return reply.status(201).send(result)
  })
}
