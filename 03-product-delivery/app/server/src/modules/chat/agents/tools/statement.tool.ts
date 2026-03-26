import { getDb } from '../../../../database/connection.js'

interface TransactionRow {
  id: string
  type: string
  category: string
  amount_cents: number
  balance_after_cents: number
  description: string
  counterpart_name: string | null
  status: string
  created_at: string
}

export function getStatementTool(userId: string, limit = 10) {
  const db = getDb()

  const account = db
    .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = 1')
    .get(userId) as { id: string } | undefined

  if (!account) {
    return { error: 'Conta não encontrada.' }
  }

  const safeLimit = Math.min(Math.max(limit, 1), 20)

  const transactions = db
    .prepare(`
      SELECT id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, created_at
      FROM transactions
      WHERE account_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(account.id, safeLimit) as TransactionRow[]

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      amountCents: t.amount_cents,
      amountFormatted: `R$ ${(t.amount_cents / 100).toFixed(2).replace('.', ',')}`,
      description: t.description,
      counterpartName: t.counterpart_name,
      status: t.status,
      createdAt: t.created_at,
    })),
    total: transactions.length,
  }
}
