import { buildApp } from '../app.js'
import { getDb, closeDb } from '../database/connection.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let app: FastifyInstance

export async function setupTestApp(): Promise<FastifyInstance> {
  if (app) return app

  app = await buildApp()

  // Run migration
  const db = getDb()
  const sqlPath = path.join(__dirname, '../database/migrations/001-initial.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  db.exec(sql)

  return app
}

export async function cleanupTestApp(): Promise<void> {
  if (app) {
    await app.close()
  }
  closeDb()
}

export function clearDb(): void {
  const db = getDb()
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM card_purchases;
    DELETE FROM invoices;
    DELETE FROM cards;
    DELETE FROM transactions;
    DELETE FROM pix_keys;
    DELETE FROM pix_rate_limit;
    DELETE FROM accounts;
    DELETE FROM users;
  `)
}

export async function createTestUser(appInstance: FastifyInstance) {
  const response = await appInstance.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Test User',
      email: 'test@email.com',
      cpf: '99999999999',
      password: 'Test@123!',
    },
  })
  return JSON.parse(response.body) as { token: string; user: { id: string; name: string; email: string; cpf: string } }
}

export async function createSecondUser(appInstance: FastifyInstance) {
  const response = await appInstance.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Second User',
      email: 'second@email.com',
      cpf: '88888888888',
      password: 'Test@123!',
    },
  })
  return JSON.parse(response.body) as { token: string; user: { id: string } }
}
