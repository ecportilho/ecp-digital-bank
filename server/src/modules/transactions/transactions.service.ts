import { getDb } from '../../database/connection.js'
import { Errors } from '../../shared/errors/app-error.js'
import type { ListTransactionsQuery } from './transactions.schema.js'

interface TransactionRow {
  id: string
  account_id: string
  type: string
  category: string
  amount_cents: number
  balance_after_cents: number
  description: string
  counterpart_name: string | null
  counterpart_document: string | null
  counterpart_institution: string | null
  pix_key: string | null
  pix_key_type: string | null
  boleto_code: string | null
  status: string
  scheduled_for: string | null
  created_at: string
}

function toTransactionResponse(row: TransactionRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    category: row.category,
    amountCents: row.amount_cents,
    balanceAfterCents: row.balance_after_cents,
    description: row.description,
    counterpartName: row.counterpart_name,
    counterpartDocument: row.counterpart_document,
    counterpartInstitution: row.counterpart_institution,
    pixKey: row.pix_key,
    pixKeyType: row.pix_key_type,
    boletoCode: row.boleto_code,
    status: row.status,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
  }
}

export class TransactionsService {
  listTransactions(userId: string, query: ListTransactionsQuery) {
    const db = getDb()

    // Get account for this user
    const account = db
      .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as { id: string } | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    const conditions: string[] = ['t.account_id = ?']
    const params: unknown[] = [account.id]

    if (query.type) {
      conditions.push('t.type = ?')
      params.push(query.type)
    }

    if (query.category) {
      conditions.push('t.category = ?')
      params.push(query.category)
    }

    if (query.startDate) {
      conditions.push('t.created_at >= ?')
      params.push(query.startDate)
    }

    if (query.endDate) {
      conditions.push('t.created_at <= ?')
      params.push(query.endDate + 'T23:59:59.999Z')
    }

    const where = conditions.join(' AND ')
    const offset = (query.page - 1) * query.limit

    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM transactions t WHERE ${where}`).get(...params) as { count: number }
    ).count

    const rows = db
      .prepare(`
        SELECT * FROM transactions t
        WHERE ${where}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.limit, offset) as TransactionRow[]

    return {
      transactions: rows.map(toTransactionResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  getTransaction(userId: string, transactionId: string) {
    const db = getDb()

    const account = db
      .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as { id: string } | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ? AND account_id = ?')
      .get(transactionId, account.id) as TransactionRow | undefined

    if (!transaction) {
      throw Errors.notFound('Transação não encontrada')
    }

    return toTransactionResponse(transaction)
  }
}
