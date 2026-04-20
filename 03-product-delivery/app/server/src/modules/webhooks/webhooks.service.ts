import { getDb } from '../../database/connection.js'
import { generateId } from '../../shared/utils/uuid.js'
import type { EcpPayWebhookInput } from './webhooks.schema.js'

interface TransactionRow {
  id: string
  account_id: string
  amount_cents: number
  balance_after_cents: number
  status: string
  metadata: string | null
}

interface AccountRow {
  id: string
  user_id: string
  balance_cents: number
}

const SOURCE = 'ecp-pay'

export interface EcpPayWebhookResult {
  status: 'processed' | 'duplicate' | 'not_found'
  transactionId?: string
  newStatus?: 'completed' | 'cancelled'
}

export class WebhooksService {
  /**
   * Process an ECP Pay payment-confirmed webhook.
   * Idempotent: duplicate eventIds return { status: 'duplicate' } without side-effects.
   */
  processEcpPayPaymentConfirmed(input: EcpPayWebhookInput): EcpPayWebhookResult {
    const db = getDb()

    // Idempotency check first — returns duplicate quickly without touching data
    const existing = db
      .prepare('SELECT id FROM webhook_events WHERE source = ? AND event_id = ?')
      .get(SOURCE, input.eventId) as { id: string } | undefined

    if (existing) {
      return { status: 'duplicate' }
    }

    // Locate the pending transaction. Metadata is JSON: { ecp_pay_tx_id: "..." }.
    // referenceId from the webhook = ECP Pay transaction_id.
    const transaction = db
      .prepare(`
        SELECT t.* FROM transactions t
        WHERE json_extract(t.metadata, '$.ecp_pay_tx_id') = ?
      `)
      .get(input.referenceId) as TransactionRow | undefined

    if (!transaction) {
      // Still record the event so we don't loop reprocessing it on replay.
      db.prepare(`
        INSERT INTO webhook_events (id, source, event_id, payload, processed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(generateId(), SOURCE, input.eventId, JSON.stringify(input))
      return { status: 'not_found' }
    }

    const account = db
      .prepare('SELECT id, user_id, balance_cents FROM accounts WHERE id = ?')
      .get(transaction.account_id) as AccountRow | undefined

    if (!account) {
      db.prepare(`
        INSERT INTO webhook_events (id, source, event_id, payload, processed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(generateId(), SOURCE, input.eventId, JSON.stringify(input))
      return { status: 'not_found' }
    }

    const newStatus: 'completed' | 'cancelled' = input.status === 'paid' ? 'completed' : 'cancelled'

    const run = db.transaction(() => {
      // Record the webhook event (guarantees idempotency)
      db.prepare(`
        INSERT INTO webhook_events (id, source, event_id, payload, processed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(generateId(), SOURCE, input.eventId, JSON.stringify(input))

      if (input.status === 'paid') {
        // Credit the receiver and mark transaction completed
        const newBalance = account.balance_cents + input.amountCents

        db.prepare(`
          UPDATE accounts SET balance_cents = ?, updated_at = datetime('now') WHERE id = ?
        `).run(newBalance, account.id)

        db.prepare(`
          UPDATE transactions
          SET status = 'completed', balance_after_cents = ?
          WHERE id = ?
        `).run(newBalance, transaction.id)

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, body, type)
          VALUES (?, ?, ?, ?, 'transaction')
        `).run(
          generateId(),
          account.user_id,
          'Pix recebido',
          `Você recebeu R$ ${(input.amountCents / 100).toFixed(2).replace('.', ',')}`
        )
      } else {
        // refunded or failed: cancel the pending transaction, notify user
        db.prepare(`UPDATE transactions SET status = 'cancelled' WHERE id = ?`).run(transaction.id)

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, body, type)
          VALUES (?, ?, ?, ?, 'transaction')
        `).run(
          generateId(),
          account.user_id,
          'Cobrança Pix cancelada',
          input.status === 'refunded'
            ? 'O pagamento foi estornado pelo emissor.'
            : 'O pagamento não foi concluído.'
        )
      }
    })

    run()

    return { status: 'processed', transactionId: transaction.id, newStatus }
  }
}
