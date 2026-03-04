import { getDb } from '../../database/connection.js'
import { Errors } from '../../shared/errors/app-error.js'

export class DashboardService {
  getDashboard(userId: string) {
    const db = getDb()

    // Get account
    const account = db
      .prepare('SELECT id, agency, number, balance_cents FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(userId) as { id: string; agency: string; number: string; balance_cents: number } | undefined

    if (!account) {
      throw Errors.notFound('Conta não encontrada')
    }

    // Current month dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    // Current month spending (debits only)
    const currentMonthSpending = db
      .prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) as total
        FROM transactions
        WHERE account_id = ? AND type = 'debit' AND status = 'completed' AND created_at >= ?
      `)
      .get(account.id, currentMonthStart) as { total: number }

    // Previous month spending
    const previousMonthSpending = db
      .prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) as total
        FROM transactions
        WHERE account_id = ? AND type = 'debit' AND status = 'completed' AND created_at >= ? AND created_at <= ?
      `)
      .get(account.id, previousMonthStart, previousMonthEnd) as { total: number }

    // Spending by category (current month)
    const categoryRows = db
      .prepare(`
        SELECT category, SUM(amount_cents) as total_cents, COUNT(*) as count
        FROM transactions
        WHERE account_id = ? AND type = 'debit' AND status = 'completed' AND created_at >= ?
        GROUP BY category
        ORDER BY total_cents DESC
      `)
      .all(account.id, currentMonthStart) as Array<{ category: string; total_cents: number; count: number }>

    const totalSpending = currentMonthSpending.total || 1
    const byCategory = categoryRows.map((row) => ({
      category: row.category,
      totalCents: row.total_cents,
      percentage: Math.round((row.total_cents / totalSpending) * 100),
      count: row.count,
    }))

    // Recent transactions (last 5)
    const recentTransactions = db
      .prepare(`
        SELECT id, type, category, amount_cents, description, counterpart_name, created_at
        FROM transactions
        WHERE account_id = ? AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 5
      `)
      .all(account.id) as Array<{
        id: string; type: string; category: string; amount_cents: number;
        description: string; counterpart_name: string | null; created_at: string
      }>

    // Card info (first active card)
    const card = db
      .prepare('SELECT id, last4, limit_cents, used_cents, is_blocked FROM cards WHERE user_id = ? AND is_active = 1 LIMIT 1')
      .get(userId) as { id: string; last4: string; limit_cents: number; used_cents: number; is_blocked: number } | undefined

    // Unread notifications
    const notifCount = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(userId) as { count: number }

    return {
      balance: {
        balanceCents: account.balance_cents,
        accountNumber: account.number,
        agency: account.agency,
      },
      spending: {
        currentMonthCents: currentMonthSpending.total,
        previousMonthCents: previousMonthSpending.total,
        byCategory,
      },
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amountCents: t.amount_cents,
        description: t.description,
        counterpartName: t.counterpart_name,
        createdAt: t.created_at,
      })),
      card: card
        ? {
            id: card.id,
            last4: card.last4,
            limitCents: card.limit_cents,
            usedCents: card.used_cents,
            availableCents: card.limit_cents - card.used_cents,
            isBlocked: Boolean(card.is_blocked),
          }
        : null,
      notifications: {
        unreadCount: notifCount.count,
      },
    }
  }
}
