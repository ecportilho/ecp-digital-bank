import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../shared/middleware/auth.js'
import { UsersService } from './users.service.js'
import { UpdateProfileSchema, ChangePasswordSchema } from './users.schema.js'

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const usersService = new UsersService()

  // GET /api/users/me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = usersService.getProfile(request.currentUser.id)
    return reply.send(profile)
  })

  // PATCH /api/users/me
  app.patch('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const input = UpdateProfileSchema.parse(request.body)
    const profile = usersService.updateProfile(request.currentUser.id, input)
    return reply.send(profile)
  })

  // POST /api/users/me/change-password
  app.post('/me/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const input = ChangePasswordSchema.parse(request.body)
    const result = await usersService.changePassword(request.currentUser.id, input)
    return reply.send(result)
  })
}
