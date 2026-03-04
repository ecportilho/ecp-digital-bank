import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import type { UpdateCardLimitInput, BlockCardInput } from './cards.schema.js'

interface CardRow {
  id: string
  user_id: string
  account_id: string
  type: string
  last4: string
  limit_cents: number
  used_cents: number
  due_day: number
  is_active: number
  is_blocked: number
  created_at: string
  updated_at: string
}

interface InvoiceRow {
  id: string
  card_id: string
  reference_month: string
  total_cents: number
  due_date: string
  status: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

interface CardPurchaseRow {
  id: string
  card_id: string
  invoice_id: string | null
  description: string
  merchant_name: string
  merchant_category: string | null
  amount_cents: number
  installments: number
  current_installment: number
  status: string
  purchased_at: string
}

function toCardResponse(row: CardRow) {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    type: row.type,
    last4: row.last4,
    limitCents: row.limit_cents,
    usedCents: row.used_cents,
    availableCents: row.limit_cents - row.used_cents,
    dueDay: row.due_day,
    isActive: Boolean(row.is_active),
    isBlocked: Boolean(row.is_blocked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CardsService {
  listCards(userId: string) {
    const db = getDb()
    const cards = db
      .prepare('SELECT * FROM cards WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC')
      .all(userId) as CardRow[]

    return cards.map(toCardResponse)
  }

  getCard(userId: string, cardId: string) {
    const db = getDb()
    const card = db
      .prepare('SELECT * FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(cardId, userId) as CardRow | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado', 404)
    }

    return toCardResponse(card)
  }

  updateLimit(userId: string, cardId: string, input: UpdateCardLimitInput) {
    const db = getDb()
    const card = db
      .prepare('SELECT * FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(cardId, userId) as CardRow | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado', 404)
    }

    // Cannot set limit below used amount
    if (input.limitCents < card.used_cents) {
      throw new AppError(
        ErrorCode.CARD_LIMIT_EXCEEDED,
        `Limite não pode ser menor que o valor utilizado (R$ ${(card.used_cents / 100).toFixed(2)})`,
        422
      )
    }

    db.prepare(`
      UPDATE cards SET limit_cents = ?, updated_at = datetime('now') WHERE id = ?
    `).run(input.limitCents, cardId)

    return this.getCard(userId, cardId)
  }

  blockCard(userId: string, cardId: string, input: BlockCardInput) {
    const db = getDb()
    const card = db
      .prepare('SELECT * FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(cardId, userId) as CardRow | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado', 404)
    }

    db.prepare(`
      UPDATE cards SET is_blocked = ?, updated_at = datetime('now') WHERE id = ?
    `).run(input.blocked ? 1 : 0, cardId)

    return this.getCard(userId, cardId)
  }

  getCurrentInvoice(userId: string, cardId: string) {
    const db = getDb()
    const card = db
      .prepare('SELECT id FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(cardId, userId) as { id: string } | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartão não encontrado', 404)
    }

    const invoice = db
      .prepare(`
        SELECT * FROM invoices
        WHERE card_id = ? AND status IN ('open', 'closed')
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(cardId) as InvoiceRow | undefined

    if (!invoice) {
      return null
    }

    const purchases = db
      .prepare('SELECT * FROM card_purchases WHERE invoice_id = ? ORDER BY purchased_at DESC')
      .all(invoice.id) as CardPurchaseRow[]

    return {
      invoice: {
        id: invoice.id,
        cardId: invoice.card_id,
        referenceMonth: invoice.reference_month,
        totalCents: invoice.total_cents,
        dueDate: invoice.due_date,
        status: invoice.status,
        paidAt: invoice.paid_at,
        createdAt: invoice.created_at,
      },
      purchases: purchases.map((p) => ({
        id: p.id,
        cardId: p.card_id,
        invoiceId: p.invoice_id,
        description: p.description,
        merchantName: p.merchant_name,
        merchantCategory: p.merchant_category,
        amountCents: p.amount_cents,
        installments: p.installments,
        currentInstallment: p.current_installment,
        status: p.status,
        purchasedAt: p.purchased_at,
      })),
    }
  }
}
