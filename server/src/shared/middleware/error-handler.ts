import type { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../errors/app-error.js'
import { ZodError } from 'zod'

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // AppError — known application errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(error.toJSON())
    return
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    })
    return
  }

  // Fastify validation errors (query params, etc.)
  if ('validation' in error && Array.isArray((error as Record<string, unknown>).validation)) {
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: (error as Record<string, unknown>).validation,
      },
    })
    return
  }

  // Unknown errors
  request.log.error({ err: error }, 'Unhandled error')
  reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
    },
  })
}
