import { getDb } from '../../../../database/connection.js'

export function blockCardTool(userId: string, cardId: string, block: boolean) {
  const db = getDb()

  const card = db
    .prepare('SELECT id, last4, is_blocked FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
    .get(cardId, userId) as { id: string; last4: string; is_blocked: number } | undefined

  if (!card) {
    return {
      success: false,
      errorCode: 'CARD_NOT_FOUND',
      errorMessage: 'Cartão não encontrado.',
    }
  }

  if (block && card.is_blocked) {
    return {
      success: false,
      errorCode: 'CARD_ALREADY_BLOCKED',
      errorMessage: 'Este cartão já está bloqueado.',
    }
  }

  if (!block && !card.is_blocked) {
    return {
      success: false,
      errorCode: 'CARD_NOT_BLOCKED',
      errorMessage: 'Este cartão já está desbloqueado.',
    }
  }

  db.prepare(`
    UPDATE cards SET is_blocked = ?, updated_at = datetime('now') WHERE id = ?
  `).run(block ? 1 : 0, cardId)

  return {
    success: true,
    cardId: card.id,
    last4: card.last4,
    blocked: block,
    message: block ? 'Cartão bloqueado com sucesso.' : 'Cartão desbloqueado com sucesso.',
  }
}

export function listUserCards(userId: string) {
  const db = getDb()

  const cards = db
    .prepare('SELECT id, last4, type, is_blocked, limit_cents, used_cents FROM cards WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC')
    .all(userId) as Array<{ id: string; last4: string; type: string; is_blocked: number; limit_cents: number; used_cents: number }>

  return cards.map((c) => ({
    id: c.id,
    last4: c.last4,
    type: c.type,
    isBlocked: Boolean(c.is_blocked),
    limitFormatted: `R$ ${(c.limit_cents / 100).toFixed(2).replace('.', ',')}`,
    availableFormatted: `R$ ${((c.limit_cents - c.used_cents) / 100).toFixed(2).replace('.', ',')}`,
  }))
}
