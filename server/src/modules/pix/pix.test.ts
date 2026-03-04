import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb, createTestUser, createSecondUser } from '../../test/setup.js'
import { getDb } from '../../database/connection.js'

describe('Pix Module', () => {
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

    // Give the user some balance for transfers
    const db = getDb()
    db.prepare('UPDATE accounts SET balance_cents = 1000000 WHERE user_id = ?').run(userId)
  })

  describe('POST /api/pix/keys', () => {
    it('AC-11 | should create an email pix key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'email', keyValue: 'test@email.com' },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.key_type).toBe('email')
      expect(body.key_value).toBe('test@email.com')
    })

    it('AC-12 | should create a random pix key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'random', keyValue: '' },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.key_type).toBe('random')
      expect(body.key_value).toBeDefined()
    })

    it('AC-13 | RN-05 should reject 6th pix key (max 5)', async () => {
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/pix/keys',
          headers: { authorization: `Bearer ${token}` },
          payload: { keyType: 'random', keyValue: '' },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'random', keyValue: '' },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('PIX_KEY_LIMIT_REACHED')
    })

    it('AC-14 | should reject duplicate key value', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'email', keyValue: 'same@email.com' },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'email', keyValue: 'same@email.com' },
      })

      expect(response.statusCode).toBe(409)
      expect(JSON.parse(response.body).error.code).toBe('PIX_KEY_ALREADY_EXISTS')
    })
  })

  describe('DELETE /api/pix/keys/:keyId', () => {
    it('AC-15 | RN-06 should soft delete a pix key', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'email', keyValue: 'del@email.com' },
      })
      const { id } = JSON.parse(create.body)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/pix/keys/${id}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)

      // Key should still exist in DB but inactive
      const db = getDb()
      const key = db.prepare('SELECT is_active, deleted_at FROM pix_keys WHERE id = ?').get(id) as { is_active: number; deleted_at: string | null }
      expect(key.is_active).toBe(0)
      expect(key.deleted_at).toBeDefined()
    })
  })

  describe('POST /api/pix/transfer', () => {
    let secondToken: string
    let secondUserId: string

    beforeEach(async () => {
      const second = await createSecondUser(app)
      secondToken = second.token
      secondUserId = second.user.id

      // Create a pix key for second user
      await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${secondToken}` },
        payload: { keyType: 'email', keyValue: 'second@email.com' },
      })
    })

    it('AC-16 | should transfer successfully with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'second@email.com', amountCents: 10000 },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.transactionId).toBeDefined()
      expect(body.amountCents).toBe(10000)
      expect(body.balanceAfterCents).toBe(990000)
    })

    it('AC-17 | RN-04 should reject transfer with insufficient balance', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'second@email.com', amountCents: 99999999 },
      })

      expect(response.statusCode).toBe(422)
      expect(JSON.parse(response.body).error.code).toBe('INSUFFICIENT_BALANCE')
    })

    it('AC-18 | RN-01 should reject transfer exceeding daily limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'second@email.com', amountCents: 600000 },
      })

      expect(response.statusCode).toBe(422)
      expect(JSON.parse(response.body).error.code).toBe('DAILY_LIMIT_EXCEEDED')
    })

    it('AC-19 | should reject self-transfer', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/pix/keys',
        headers: { authorization: `Bearer ${token}` },
        payload: { keyType: 'email', keyValue: 'self@email.com' },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'self@email.com', amountCents: 1000 },
      })

      expect(response.statusCode).toBe(422)
      expect(JSON.parse(response.body).error.code).toBe('PIX_SELF_TRANSFER')
    })

    it('AC-20 | should reject transfer to non-existent key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'nonexistent@email.com', amountCents: 1000 },
      })

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.body).error.code).toBe('PIX_KEY_NOT_FOUND')
    })

    it('AC-21 | RN-07 should store amounts in integer cents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pix/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { pixKey: 'second@email.com', amountCents: 15050 },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(Number.isInteger(body.amountCents)).toBe(true)
      expect(Number.isInteger(body.balanceAfterCents)).toBe(true)
    })
  })
})
