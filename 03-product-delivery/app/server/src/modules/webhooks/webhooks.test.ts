import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb, createTestUser } from '../../test/setup.js'
import { getDb } from '../../database/connection.js'
import { generateId } from '../../shared/utils/uuid.js'

const WEBHOOK_URL = '/api/webhooks/ecp-pay/payment-confirmed'
const SECRET = 'test-webhook-secret'

describe('Webhooks Module — ECP Pay payment-confirmed', () => {
  let app: FastifyInstance
  let accountId: string
  let userId: string
  let pendingTxId: string
  const ECP_PAY_TX = 'ecp-pay-tx-42'

  beforeAll(async () => {
    app = await setupTestApp()
  })

  afterAll(async () => {
    await cleanupTestApp()
  })

  beforeEach(async () => {
    clearDb()
    const result = await createTestUser(app)
    userId = result.user.id

    const db = getDb()
    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: string }
    accountId = account.id

    // Seed a pending pix credit transaction mimicking what generatePixQrCode creates
    pendingTxId = generateId()
    db.prepare(`
      INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, status, metadata, created_at)
      VALUES (?, ?, 'credit', 'pix', 25000, 0, 'Cobrança Pix via QR Code', 'pending', ?, datetime('now'))
    `).run(pendingTxId, accountId, JSON.stringify({ ecp_pay_tx_id: ECP_PAY_TX }))
  })

  it('should reject request without X-Webhook-Secret header (401)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      payload: {
        eventId: 'evt-1',
        referenceId: ECP_PAY_TX,
        externalId: 'ext-1',
        amountCents: 25000,
        status: 'paid',
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should reject request with wrong secret (401)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': 'wrong' },
      payload: {
        eventId: 'evt-1',
        referenceId: ECP_PAY_TX,
        externalId: 'ext-1',
        amountCents: 25000,
        status: 'paid',
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('paid happy path: marks transaction completed, credits balance, creates notification', async () => {
    const response = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': SECRET },
      payload: {
        eventId: 'evt-paid-1',
        referenceId: ECP_PAY_TX,
        externalId: 'ext-1',
        amountCents: 25000,
        status: 'paid',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('processed')
    expect(body.newStatus).toBe('completed')

    const db = getDb()
    const tx = db.prepare('SELECT status, balance_after_cents FROM transactions WHERE id = ?').get(pendingTxId) as { status: string; balance_after_cents: number }
    expect(tx.status).toBe('completed')
    expect(tx.balance_after_cents).toBe(25000)

    const account = db.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(accountId) as { balance_cents: number }
    expect(account.balance_cents).toBe(25000)

    const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ?').get(userId) as { title: string } | undefined
    expect(notif?.title).toBe('Pix recebido')
  })

  it('is idempotent: same eventId does not credit twice', async () => {
    const payload = {
      eventId: 'evt-paid-2',
      referenceId: ECP_PAY_TX,
      externalId: 'ext-1',
      amountCents: 25000,
      status: 'paid' as const,
    }

    const first = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': SECRET },
      payload,
    })
    expect(first.statusCode).toBe(200)
    expect(JSON.parse(first.body).status).toBe('processed')

    const second = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': SECRET },
      payload,
    })
    expect(second.statusCode).toBe(200)
    expect(JSON.parse(second.body).status).toBe('duplicate')

    const db = getDb()
    const account = db.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(accountId) as { balance_cents: number }
    expect(account.balance_cents).toBe(25000)
  })

  it('refunded: marks transaction cancelled and does not credit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': SECRET },
      payload: {
        eventId: 'evt-refund-1',
        referenceId: ECP_PAY_TX,
        externalId: 'ext-1',
        amountCents: 25000,
        status: 'refunded',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).newStatus).toBe('cancelled')

    const db = getDb()
    const tx = db.prepare('SELECT status FROM transactions WHERE id = ?').get(pendingTxId) as { status: string }
    expect(tx.status).toBe('cancelled')

    const account = db.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(accountId) as { balance_cents: number }
    expect(account.balance_cents).toBe(0)
  })

  it('referenceId not found: returns 200 not_found and still records event', async () => {
    const response = await app.inject({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: { 'x-webhook-secret': SECRET },
      payload: {
        eventId: 'evt-unknown',
        referenceId: 'non-existent-tx',
        externalId: 'ext-x',
        amountCents: 99999,
        status: 'paid',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).status).toBe('not_found')

    const db = getDb()
    const event = db.prepare("SELECT * FROM webhook_events WHERE event_id = ?").get('evt-unknown') as { id: string } | undefined
    expect(event).toBeDefined()
  })
})
