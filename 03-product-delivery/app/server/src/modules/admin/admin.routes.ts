import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { Errors } from '../../shared/errors/app-error.js'
import { getDb } from '../../database/connection.js'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/ecp-pay-queue — inspect retry queue (role=system only)
  app.get('/ecp-pay-queue', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.currentUser.role !== 'system') {
      throw Errors.forbidden('Endpoint restrito a contas de sistema')
    }

    const db = getDb()
    const rows = db.prepare(`
      SELECT id, transaction_id, operation, attempts, last_error, next_retry_at, status, created_at, updated_at
      FROM ecp_pay_retry_queue
      ORDER BY created_at DESC
      LIMIT 100
    `).all()

    return reply.send({ items: rows })
  })
}
