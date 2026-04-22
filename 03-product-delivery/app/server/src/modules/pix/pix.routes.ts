import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { PixService } from './pix.service.js'
import {
  CreatePixKeySchema,
  PixTransferSchema,
  PixQrCodeSchema,
  PixPayBrcodeSchema,
  PixParseBrcodeSchema,
} from './pix.schema.js'
import {
  InvalidBrcodeError,
  InvalidCrcError,
  UnsupportedBrcodeError,
} from './brcode-parser.js'
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

  // POST /api/pix/parse-brcode — Decodifica BRCode/EMV para preview na UI
  app.post('/parse-brcode', { preHandler: [authenticate] }, async (request, reply) => {
    const input = PixParseBrcodeSchema.parse(request.body)
    try {
      const data = pixService.parseBrcodePreview(input.brcode)
      return reply.send({ success: true, data })
    } catch (err) {
      if (
        err instanceof InvalidBrcodeError ||
        err instanceof InvalidCrcError ||
        err instanceof UnsupportedBrcodeError
      ) {
        return reply
          .status(400)
          .send({ success: false, error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })

  // POST /api/pix/pay-by-brcode — Paga Pix a partir de código copia-e-cola
  app.post('/pay-by-brcode', { preHandler: [authenticate] }, async (request, reply) => {
    const input = PixPayBrcodeSchema.parse(request.body)
    try {
      const result = pixService.payByBrcode(
        request.currentUser.id,
        request.currentUser.accountId,
        input
      )
      return reply.status(201).send(result)
    } catch (err) {
      if (
        err instanceof InvalidBrcodeError ||
        err instanceof InvalidCrcError ||
        err instanceof UnsupportedBrcodeError
      ) {
        return reply
          .status(400)
          .send({ error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })

  // POST /api/pix/debit-by-cpf — Service account debits user account (simulates Pix payment)
  app.post('/debit-by-cpf', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.currentUser.role !== 'system') {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Apenas contas de serviço podem usar este endpoint' } })
    }

    const input = z.object({
      cpf: z.string().min(1).max(100),
      amountCents: z.number().int().positive(),
      description: z.string().min(1).max(200),
      merchantName: z.string().min(1).max(100),
    }).parse(request.body)

    const result = pixService.debitByCpf(input)
    return reply.status(201).send(result)
  })

  // POST /api/pix/credit-by-key — Service account credits a PF account by Pix key / CPF / email.
  // Used by ecp-digital-emps to deliver a PJ→PF Pix transfer.
  app.post('/credit-by-key', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.currentUser.role !== 'system') {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Apenas contas de serviço podem usar este endpoint' } })
    }

    const input = z.object({
      key: z.string().min(1).max(100),
      amountCents: z.number().int().positive(),
      description: z.string().min(1).max(200),
      senderName: z.string().min(1).max(100),
    }).parse(request.body)

    const result = pixService.creditByKey(input)
    return reply.status(201).send(result)
  })
}
