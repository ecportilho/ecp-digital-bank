import { getDb } from '../../database/connection.js'
import { Errors } from '../../shared/errors/app-error.js'
import type { UpdateLimitInput } from './accounts.schema.js'

interface AccountRow {
  id: string
  user_id: string
  agency: string
  number: string
  balance_cents: number
  daily_transfer_limit_cents: number
  daily_transferred_cents: number
  last_transfer_date: string | null
  is_active: number
  created_at: string
  updated_at: string
}

function toAccountResponse(row: AccountRow) {
  return {
    id: row.id,
    userId: row.user_id,
    agency: row.agency,
    number: row.number,
    balanceCents: row.balance_cents,
    dailyTransferLimitCents: row.daily_transfer_limit_cents,
    dailyTransferredCents: row.daily_transferred_cents,
    lastTransferDate: row.last_transfer_date,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class AccountsService {
  getAccount(userId: string) {
    const db = getDb()
    const account = db
      .prepare('SELECT * FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as AccountRow | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    return toAccountResponse(account)
  }

  getBalance(userId: string) {
    const db = getDb()
    const account = db
      .prepare('SELECT balance_cents FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as { balance_cents: number } | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    return { balanceCents: account.balance_cents }
  }

  updateDailyLimit(userId: string, input: UpdateLimitInput) {
    const db = getDb()
    const account = db
      .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as { id: string } | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    db.prepare(`
      UPDATE accounts
      SET daily_transfer_limit_cents = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(input.dailyTransferLimitCents, account.id)

    return this.getAccount(userId)
  }
}
