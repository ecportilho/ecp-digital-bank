import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb, createTestUser } from '../../test/setup.js'
import { getDb } from '../../database/connection.js'
import { ecpPayClient } from '../../services/ecp-pay-client.js'
import { processEcpPayRetryQueueTick } from '../../services/ecp-pay-retry-worker.js'
import { materializeRecurringPayments } from './payments.service.js'

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

  describe('ECP Pay retry queue', () => {
    it('enqueues a retry job when ECP Pay call fails', async () => {
      const spy = jest.spyOn(ecpPayClient, 'createBoletoCharge').mockRejectedValueOnce(new Error('ECP Pay down'))

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
      expect(body.ecpPayTxId).toBeUndefined()

      const db = getDb()
      const queued = db.prepare(
        "SELECT * FROM ecp_pay_retry_queue WHERE transaction_id = ? AND operation = 'boleto'"
      ).get(body.transactionId) as { status: string; attempts: number; last_error: string } | undefined
      expect(queued).toBeDefined()
      expect(queued?.status).toBe('pending')
      expect(queued?.attempts).toBe(0)
      expect(queued?.last_error).toContain('ECP Pay down')

      spy.mockRestore()
    })

    it('retry worker eventually marks a job as success when ECP Pay recovers', async () => {
      const failSpy = jest.spyOn(ecpPayClient, 'createBoletoCharge').mockRejectedValueOnce(new Error('flaky'))

      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 5000,
          description: 'Teste',
        },
      })

      const { transactionId } = JSON.parse(response.body)
      failSpy.mockRestore()

      // Force the job to be due immediately
      const db = getDb()
      db.prepare("UPDATE ecp_pay_retry_queue SET next_retry_at = datetime('now', '-1 minute') WHERE transaction_id = ?").run(transactionId)

      const recoverySpy = jest.spyOn(ecpPayClient, 'createBoletoCharge').mockResolvedValueOnce({
        transaction_id: 'ecp-pay-recovered-1',
        barcode: '',
        digitable_line: '',
        due_date: '2026-04-20',
        status: 'pending',
      })

      await processEcpPayRetryQueueTick()

      const queued = db.prepare(
        'SELECT status FROM ecp_pay_retry_queue WHERE transaction_id = ?'
      ).get(transactionId) as { status: string }
      expect(queued.status).toBe('success')

      const tx = db.prepare('SELECT metadata FROM transactions WHERE id = ?').get(transactionId) as { metadata: string }
      expect(tx.metadata).toContain('ecp-pay-recovered-1')

      recoverySpy.mockRestore()
    })
  })

  describe('Recurring scheduled payments', () => {
    it('creates monthly recurring boleto and materializer spawns next instance', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)

      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/boleto',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          boletoCode: '12345678901234567890123456789012345678901234',
          amountCents: 8000,
          scheduledFor: futureDate.toISOString(),
          recurrence: 'monthly',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.recurrence).toBe('monthly')
      const rootId = body.transactionId

      // Simulate time passage — run materializer at a point >= next occurrence
      const futurePointInTime = new Date(futureDate)
      futurePointInTime.setMonth(futurePointInTime.getMonth() + 1)

      const result = materializeRecurringPayments(futurePointInTime)
      expect(result.created).toBe(1)

      const db = getDb()
      const child = db.prepare(
        'SELECT id, recurrence_parent_id, scheduled_for FROM transactions WHERE recurrence_parent_id = ?'
      ).get(rootId) as { id: string; recurrence_parent_id: string; scheduled_for: string }
      expect(child).toBeDefined()
      expect(child.recurrence_parent_id).toBe(rootId)

      // Scheduled date should be ~30 days after the root's scheduled_for
      const childDate = new Date(child.scheduled_for)
      const rootDate = futureDate
      const diffDays = Math.round((childDate.getTime() - rootDate.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
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
