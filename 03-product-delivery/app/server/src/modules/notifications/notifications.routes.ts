import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { NotificationsService } from './notifications.service.js'
import { ListNotificationsQuerySchema } from './notifications.schema.js'

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  const notificationsService = new NotificationsService()

  // GET /api/notifications
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const query = ListNotificationsQuerySchema.parse(request.query)
    const result = notificationsService.listNotifications(request.currentUser.id, query)
    return reply.send(result)
  })

  // GET /api/notifications/unread-count
  app.get('/unread-count', { preHandler: [authenticate] }, async (request, reply) => {
    const result = notificationsService.getUnreadCount(request.currentUser.id)
    return reply.send(result)
  })

  // PATCH /api/notifications/:id/read
  app.patch('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = notificationsService.markAsRead(request.currentUser.id, id)
    return reply.send(result)
  })

  // POST /api/notifications/read-all
  app.post('/read-all', { preHandler: [authenticate] }, async (request, reply) => {
    const result = notificationsService.markAllAsRead(request.currentUser.id)
    return reply.send(result)
  })
}
