import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
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
  payBoleto(userId: string, accountId: string, input: PayBoletoInput) {
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
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, boleto_code, status, scheduled_for)
        VALUES (?, ?, 'debit', 'boleto', ?, 0, ?, ?, 'pending', ?)
      `).run(
        transactionId, accountId, input.amountCents,
        input.description ?? 'Pagamento de boleto',
        input.boletoCode, input.scheduledFor
      )

      return {
        transactionId,
        status: 'pending',
        scheduledFor: input.scheduledFor,
        amountCents: input.amountCents,
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

    return {
      transactionId,
      status: 'completed',
      balanceAfterCents: newBalance,
      amountCents: input.amountCents,
      createdAt: now,
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
