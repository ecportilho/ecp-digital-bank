import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
import { ecpPayClient } from '../../services/ecp-pay-client.js'
import { enqueueEcpPayRetry } from '../../services/ecp-pay-retry-worker.js'
import type { PayBoletoInput } from './payments.schema.js'

interface AccountRow {
  id: string
  balance_cents: number
  is_active: number
}

interface TransactionRow {
  id: string
  account_id: string
  amount_cents: number
  description: string
  status: string
  scheduled_for: string | null
  created_at: string
}

export class PaymentsService {
  async payBoleto(userId: string, accountId: string, input: PayBoletoInput, userName?: string, userCpf?: string) {
    const db = getDb()

    const account = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1')
      .get(accountId) as AccountRow | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    // If scheduled for future, just register as pending
    if (input.scheduledFor) {
      const scheduledDate = new Date(input.scheduledFor)
      const now = new Date()

      if (scheduledDate <= now) {
        throw new AppError(ErrorCode.BOLETO_INVALID, 'Data de agendamento deve ser no futuro', 422)
      }

      const transactionId = generateId()
      const recurrenceRule = input.recurrence && input.recurrence !== 'none' ? input.recurrence : null
      db.prepare(`
        INSERT INTO transactions (
          id, account_id, type, category, amount_cents, balance_after_cents,
          description, boleto_code, status, scheduled_for,
          recurrence_rule, recurrence_end_date
        )
        VALUES (?, ?, 'debit', 'boleto', ?, 0, ?, ?, 'pending', ?, ?, ?)
      `).run(
        transactionId, accountId, input.amountCents,
        input.description ?? 'Pagamento de boleto',
        input.boletoCode, input.scheduledFor,
        recurrenceRule, input.recurrenceEndDate ?? null
      )

      return {
        transactionId,
        status: 'pending',
        scheduledFor: input.scheduledFor,
        amountCents: input.amountCents,
        recurrence: input.recurrence ?? 'none',
      }
    }

    // Immediate payment: check balance
    if (account.balance_cents < input.amountCents) {
      throw Errors.insufficientBalance()
    }

    const newBalance = account.balance_cents - input.amountCents
    const transactionId = generateId()
    const now = new Date().toISOString()

    const doPayment = db.transaction(() => {
      db.prepare(`
        UPDATE accounts SET balance_cents = ?, updated_at = datetime('now') WHERE id = ?
      `).run(newBalance, accountId)

      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, boleto_code, status, created_at)
        VALUES (?, ?, 'debit', 'boleto', ?, ?, ?, ?, 'completed', ?)
      `).run(
        transactionId, accountId, input.amountCents, newBalance,
        input.description ?? 'Pagamento de boleto',
        input.boletoCode, now
      )
    })

    doPayment()

    // Register payment with ECP Pay for real barcode processing
    let ecpPayTxId: string | undefined
    if (userName && userCpf) {
      const dueDate = new Date().toISOString().split('T')[0] ?? now
      try {
        const ecpPayResult = await ecpPayClient.createBoletoCharge(
          input.amountCents,
          userName,
          userCpf,
          dueDate,
          input.description ?? 'Pagamento de boleto'
        )
        ecpPayTxId = ecpPayResult.transaction_id

        // Store ECP Pay transaction ID in local record metadata
        db.prepare(`
          UPDATE transactions SET metadata = ? WHERE id = ?
        `).run(JSON.stringify({ ecp_pay_tx_id: ecpPayTxId }), transactionId)
      } catch (error) {
        // ECP Pay unavailable — enqueue for retry so we don't silently diverge
        const message = error instanceof Error ? error.message : String(error)
        console.warn('[ECP Pay] Boleto registration failed, enqueueing for retry:', message)
        enqueueEcpPayRetry({
          transactionId,
          operation: 'boleto',
          payload: {
            amountCents: input.amountCents,
            customerName: userName,
            customerDocument: userCpf,
            dueDate,
            description: input.description ?? 'Pagamento de boleto',
          },
          error: message,
        })
      }
    }

    return {
      transactionId,
      status: 'completed',
      balanceAfterCents: newBalance,
      amountCents: input.amountCents,
      createdAt: now,
      ecpPayTxId,
    }
  }

  listScheduled(userId: string, accountId: string) {
    const db = getDb()

    const rows = db
      .prepare(`
        SELECT * FROM transactions
        WHERE account_id = ? AND status = 'pending' AND scheduled_for IS NOT NULL
        ORDER BY scheduled_for ASC
      `)
      .all(accountId) as TransactionRow[]

    return rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      amountCents: r.amount_cents,
      description: r.description,
      status: r.status,
      scheduledFor: r.scheduled_for,
      createdAt: r.created_at,
    }))
  }

  cancelScheduled(userId: string, accountId: string, transactionId: string) {
    const db = getDb()

    const transaction = db
      .prepare(`
        SELECT * FROM transactions
        WHERE id = ? AND account_id = ? AND status = 'pending'
      `)
      .get(transactionId, accountId) as TransactionRow | undefined

    if (!transaction) {
      throw Errors.notFound('Pagamento agendado não encontrado')
    }

    db.prepare(`
      UPDATE transactions SET status = 'cancelled' WHERE id = ?
    `).run(transactionId)

    return { message: 'Pagamento cancelado com sucesso' }
  }
}

// -----------------------------------------------------------------------------
// Recurring payments materializer
// -----------------------------------------------------------------------------

interface RecurrenceTxRow {
  id: string
  account_id: string
  amount_cents: number
  description: string
  boleto_code: string | null
  scheduled_for: string
  recurrence_rule: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrence_end_date: string | null
  recurrence_parent_id: string | null
}

function computeNextOccurrence(prev: Date, rule: RecurrenceTxRow['recurrence_rule']): Date {
  const next = new Date(prev)
  switch (rule) {
    case 'daily':   next.setDate(next.getDate() + 1); break
    case 'weekly':  next.setDate(next.getDate() + 7); break
    case 'monthly': next.setMonth(next.getMonth() + 1); break
    case 'yearly':  next.setFullYear(next.getFullYear() + 1); break
  }
  return next
}

/**
 * Find every recurring boleto whose next occurrence is due (scheduled_for <= now+lookahead)
 * and materialize the next instance linked via recurrence_parent_id.
 * Idempotent: skips if a child with the same parent and scheduled_for already exists.
 *
 * Exported so tests can call it directly without waiting for the daily worker tick.
 */
export function materializeRecurringPayments(now: Date = new Date()): { created: number } {
  const db = getDb()

  // Find root recurring transactions (those that have a rule and no parent themselves)
  const roots = db.prepare(`
    SELECT * FROM transactions
    WHERE recurrence_rule IS NOT NULL
      AND recurrence_parent_id IS NULL
  `).all() as RecurrenceTxRow[]

  let created = 0
  for (const root of roots) {
    // Find the latest instance in this recurrence chain
    const latest = db.prepare(`
      SELECT * FROM transactions
      WHERE recurrence_parent_id = ? OR id = ?
      ORDER BY scheduled_for DESC
      LIMIT 1
    `).get(root.id, root.id) as RecurrenceTxRow

    const latestDate = new Date(latest.scheduled_for)
    const nextDate = computeNextOccurrence(latestDate, root.recurrence_rule)

    // Stop if we're past the recurrence end date
    if (root.recurrence_end_date && nextDate > new Date(root.recurrence_end_date)) continue

    // Only materialize once we're within ~1 day of the due date
    const lookahead = new Date(now)
    lookahead.setDate(lookahead.getDate() + 1)
    if (nextDate > lookahead) continue

    const childId = generateId()
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, type, category, amount_cents, balance_after_cents,
        description, boleto_code, status, scheduled_for, recurrence_parent_id
      )
      VALUES (?, ?, 'debit', 'boleto', ?, 0, ?, ?, 'pending', ?, ?)
    `).run(
      childId, root.account_id, root.amount_cents, root.description,
      root.boleto_code, nextDate.toISOString(), root.id
    )
    created++
  }

  return { created }
}

const DAILY_TICK_MS = 24 * 60 * 60 * 1000
let recurringTimer: NodeJS.Timeout | null = null

export function startRecurringPaymentsWorker(): void {
  if (recurringTimer) return
  recurringTimer = setInterval(() => {
    try {
      materializeRecurringPayments()
    } catch (err) {
      console.error('[recurring-payments-worker] tick failed:', err)
    }
  }, DAILY_TICK_MS)
  if (typeof recurringTimer.unref === 'function') recurringTimer.unref()
}

export function stopRecurringPaymentsWorker(): void {
  if (recurringTimer) {
    clearInterval(recurringTimer)
    recurringTimer = null
  }
}
