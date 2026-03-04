import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { DashboardService } from './dashboard.service.js'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const dashboardService = new DashboardService()

  // GET /api/dashboard
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = dashboardService.getDashboard(request.currentUser.id)
    return reply.send(result)
  })
}
