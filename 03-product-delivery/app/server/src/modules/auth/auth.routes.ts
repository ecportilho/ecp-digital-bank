import type { FastifyPluginAsync } from 'fastify'
import { RegisterSchema, LoginSchema } from './auth.schema.js'
import { AuthService } from './auth.service.js'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app)

  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const input = RegisterSchema.parse(request.body)
    const result = await authService.register(input)
    return reply.status(201).send(result)
  })

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const input = LoginSchema.parse(request.body)
    const result = await authService.login(input)
    return reply.status(200).send(result)
  })

  // GET /api/auth/me — requires auth
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    return reply.status(200).send({ user: request.currentUser })
  })
}

// Extend Fastify with authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
}
