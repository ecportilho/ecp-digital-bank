import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb, createTestUser } from '../../test/setup.js'

describe('Accounts Module', () => {
  let app: FastifyInstance
  let token: string

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
  })

  describe('GET /api/accounts/me', () => {
    it('AC-22 | should return account data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.agency).toBe('0001')
      expect(body.number).toBeDefined()
      expect(body.balanceCents).toBe(0)
      expect(body.isActive).toBe(true)
    })

    it('AC-23 | RN-02 should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts/me',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/accounts/me/limit', () => {
    it('AC-24 | RN-01 should update daily transfer limit', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/accounts/me/limit',
        headers: { authorization: `Bearer ${token}` },
        payload: { dailyTransferLimitCents: 1000000 },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.dailyTransferLimitCents).toBe(1000000)
    })

    it('AC-25 | should reject negative limit', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/accounts/me/limit',
        headers: { authorization: `Bearer ${token}` },
        payload: { dailyTransferLimitCents: -1000 },
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
