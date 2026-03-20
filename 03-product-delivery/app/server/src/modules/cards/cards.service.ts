import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
import type { UpdateCardLimitInput, BlockCardInput, CardPurchaseInput } from './cards.schema.js'

interface CardRow {
  id: string
  user_id: string
  account_id: string
  type: string
  card_number: string
  last4: string
  card_holder: string
  card_expiry: string
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
    cardNumber: row.card_number,
    last4: row.last4,
    cardHolder: row.card_holder,
    cardExpiry: row.card_expiry,
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

  /**
   * Process a card purchase: validate limit, create purchase record, update used_cents.
   */
  cardPurchase(userId: string, cardId: string, input: CardPurchaseInput) {
    const db = getDb()

    const card = db
      .prepare('SELECT * FROM cards WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(cardId, userId) as CardRow | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartao nao encontrado', 404)
    }

    if (card.is_blocked) {
      throw new AppError(ErrorCode.CARD_BLOCKED, 'Cartao bloqueado', 422)
    }

    const available = card.limit_cents - card.used_cents
    if (input.amountCents > available) {
      throw new AppError(
        ErrorCode.CARD_LIMIT_EXCEEDED,
        `Limite insuficiente. Disponivel: R$ ${(available / 100).toFixed(2)}`,
        422
      )
    }

    // Get or create current invoice
    const now = new Date()
    const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let invoice = db
      .prepare("SELECT * FROM invoices WHERE card_id = ? AND reference_month = ? AND status IN ('open', 'closed')")
      .get(cardId, refMonth) as InvoiceRow | undefined

    if (!invoice) {
      const invoiceId = generateId()
      const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(card.due_day).padStart(2, '0')}`
      db.prepare(`
        INSERT INTO invoices (id, card_id, reference_month, total_cents, due_date, status)
        VALUES (?, ?, ?, 0, ?, 'open')
      `).run(invoiceId, cardId, refMonth, dueDate)
      invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as InvoiceRow
    }

    const purchaseId = generateId()

    const doPurchase = db.transaction(() => {
      // Create card purchase
      db.prepare(`
        INSERT INTO card_purchases (id, card_id, invoice_id, description, merchant_name, merchant_category, amount_cents, installments, current_installment, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 'completed')
      `).run(
        purchaseId, cardId, invoice!.id,
        input.description, input.merchantName, input.merchantCategory || 'Alimentacao',
        input.amountCents
      )

      // Update card used_cents
      db.prepare(`
        UPDATE cards SET used_cents = used_cents + ?, updated_at = datetime('now') WHERE id = ?
      `).run(input.amountCents, cardId)

      // Update invoice total
      db.prepare(`
        UPDATE invoices SET total_cents = total_cents + ?, updated_at = datetime('now') WHERE id = ?
      `).run(input.amountCents, invoice!.id)
    })

    doPurchase()

    return {
      purchaseId,
      cardId,
      amountCents: input.amountCents,
      description: input.description,
      merchantName: input.merchantName,
      status: 'completed',
      availableAfterCents: available - input.amountCents,
    }
  }

  /**
   * Find a card by its full card number (for merchant/gateway use).
   */
  findCardByNumber(cardNumber: string) {
    const db = getDb()
    const card = db
      .prepare('SELECT * FROM cards WHERE card_number = ? AND is_active = 1')
      .get(cardNumber) as CardRow | undefined

    if (!card) {
      throw new AppError(ErrorCode.CARD_NOT_FOUND, 'Cartao nao encontrado', 404)
    }

    return toCardResponse(card)
  }
}
