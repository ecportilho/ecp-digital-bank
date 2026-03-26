import { getDb } from '../../../../database/connection.js'
import { generateId } from '../../../../shared/utils/uuid.js'

const MAX_ACTIVE_CARDS = 3

function generateCardNumber(): string {
  const segments = Array.from({ length: 4 }, () =>
    String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  )
  return segments.join('')
}

function generateExpiry(): string {
  const now = new Date()
  const expYear = now.getFullYear() + 5
  const expMonth = String(now.getMonth() + 1).padStart(2, '0')
  return `${expMonth}/${String(expYear).slice(-2)}`
}

export function createCardTool(userId: string, accountId: string) {
  const db = getDb()

  // Check active card count
  const count = (
    db.prepare('SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND is_active = 1').get(userId) as { count: number }
  ).count

  if (count >= MAX_ACTIVE_CARDS) {
    return {
      success: false,
      errorCode: 'CARD_LIMIT_REACHED',
      errorMessage: 'Você já possui 3 cartões virtuais ativos (limite máximo).',
    }
  }

  // Get user name for card holder
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined
  const cardHolder = user?.name.toUpperCase() ?? 'TITULAR'

  const cardNumber = generateCardNumber()
  const last4 = cardNumber.slice(-4)
  const expiry = generateExpiry()
  const id = generateId()

  db.prepare(`
    INSERT INTO cards (id, user_id, account_id, type, card_number, last4, card_holder, card_expiry, limit_cents, used_cents, due_day, is_active, is_blocked)
    VALUES (?, ?, ?, 'virtual', ?, ?, ?, ?, 300000, 0, 10, 1, 0)
  `).run(id, userId, accountId, cardNumber, last4, cardHolder, expiry)

  return {
    success: true,
    cardId: id,
    type: 'virtual',
    last4,
    cardHolder,
    expiry,
    limitCents: 300000,
    limitFormatted: 'R$ 3.000,00',
  }
}
