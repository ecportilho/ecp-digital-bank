import { getDb } from '../../../../database/connection.js'

export function getBalanceTool(userId: string) {
  const db = getDb()

  const account = db
    .prepare('SELECT a.balance_cents, a.agency, a.number FROM accounts a WHERE a.user_id = ? AND a.is_active = 1')
    .get(userId) as { balance_cents: number; agency: string; number: string } | undefined

  if (!account) {
    return { error: 'Conta não encontrada.' }
  }

  return {
    balanceCents: account.balance_cents,
    balanceFormatted: `R$ ${(account.balance_cents / 100).toFixed(2).replace('.', ',')}`,
    agency: account.agency,
    accountNumber: account.number,
  }
}
