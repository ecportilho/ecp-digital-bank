import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb, createTestUser } from '../../test/setup.js'
import { getDb } from '../../database/connection.js'

describe('Payments Module', () => {
  let app: FastifyInstance
  let token: string
  let userId: string

  beforeAll(async () => {
    app = await setupTestApp()
  })

  afterAll(async () => {
    await cleanupTestApp()
  })

  beforeEach(async () => {
    clearDb()
    const result = await createTestUser(app)
    token = result.token
    userId = result.user.id
    // Give balance
    const db = getDb()
    db.prepare('UPDATE accounts SET balance_cents = 500000 WHERE user_id = ?').run(userId)
  })

  describe('POST /api/payments/boleto', () => {
    it('AC-26 | should pay boleto immediately', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 15000,
          description: 'Conta de luz',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('completed')
      expect(body.balanceAfterCents).toBe(485000)
    })

    it('AC-27 | RN-04 should reject boleto with insufficient balance', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 99999999,
        },
      })

      expect(response.statusCode).toBe(422)
      expect(JSON.parse(response.body).error.code).toBe('INSUFFICIENT_BALANCE')
    })

    it('AC-28 | should schedule boleto for future date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 15000,
          scheduledFor: futureDate.toISOString(),
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('pending')
    })
  })

  describe('DELETE /api/payments/scheduled/:id', () => {
    it('AC-29 | should cancel scheduled payment', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const create = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 15000,
          scheduledFor: futureDate.toISOString(),
        },
      })
      const { transactionId } = JSON.parse(create.body)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/payments/scheduled/${transactionId}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
