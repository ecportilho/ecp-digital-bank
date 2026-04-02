import crypto from 'node:crypto'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

// Suffix changes on every restart, invalidating all previous tokens
const JWT_RESTART_SUFFIX = crypto.randomBytes(16).toString('hex')
import { errorHandler } from './shared/middleware/error-handler.js'
import { authenticate } from './shared/middleware/auth.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { accountsRoutes } from './modules/accounts/accounts.routes.js'
import { pixRoutes } from './modules/pix/pix.routes.js'
import { transactionsRoutes } from './modules/transactions/transactions.routes.js'
import { cardsRoutes } from './modules/cards/cards.routes.js'
import { paymentsRoutes } from './modules/payments/payments.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js'
import { chatRoutes } from './modules/chat/chat.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  })

  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  // JWT
  await app.register(jwt, {
    secret: (process.env.JWT_SECRET || 'ecp-digital-bank-dev-secret') + '-' + JWT_RESTART_SUFFIX,
    sign: {
      expiresIn: '7d',
    },
  })

  // Register authenticate as a decorator so routes can access it via app.authenticate
  app.decorate('authenticate', authenticate)

  // Error handler
  app.setErrorHandler(errorHandler)

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(accountsRoutes, { prefix: '/api/accounts' })
  await app.register(pixRoutes, { prefix: '/api/pix' })
  await app.register(transactionsRoutes, { prefix: '/api/transactions' })
  await app.register(cardsRoutes, { prefix: '/api/cards' })
  await app.register(paymentsRoutes, { prefix: '/api/payments' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(notificationsRoutes, { prefix: '/api/notifications' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(chatRoutes, { prefix: '/api/chat' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  return app
}
