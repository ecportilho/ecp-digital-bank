import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
import { ecpPayClient } from '../../services/ecp-pay-client.js'
import type { CreatePixKeyInput, PixTransferInput, PixPayBrcodeInput } from './pix.schema.js'
import {
  parseBrcode,
  validateCRC16,
  InvalidBrcodeError,
  InvalidCrcError,
  UnsupportedBrcodeError,
  type BrcodeData,
} from './brcode-parser.js'

export { InvalidBrcodeError, InvalidCrcError, UnsupportedBrcodeError }

// Business rules constants
const MAX_PIX_KEYS = 5                   // RN-05
const NIGHT_LIMIT_CENTS = 100000         // RN-02: R$ 1.000,00 at night
const REINFORCED_AUTH_THRESHOLD = 500000 // RN-03: R$ 5.000,00
const RATE_LIMIT_WINDOW_MINUTES = 5      // RN-10
const RATE_LIMIT_MAX_TRANSFERS = 5       // RN-10

interface AccountRow {
  id: string
  balance_cents: number
  daily_transfer_limit_cents: number
  daily_transferred_cents: number
  last_transfer_date: string | null
  is_active: number
}

interface PixKeyRow {
  id: string
  user_id: string
  account_id: string
  key_type: string
  key_value: string
  is_active: number
  created_at: string
}

function isNightTime(): boolean {
  const hour = new Date().getHours()
  return hour >= 20 || hour < 6
}

/**
 * Compute daily Pix debited total on-the-fly, summing today's completed/pending debits.
 * Replaces the lazy `daily_transferred_cents` column read which required `isSameDay` reset.
 * The columns `daily_transferred_cents` and `last_transfer_date` are deprecated — no longer updated.
 */
export function getDailyTransferred(accountId: string): number {
  const db = getDb()
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM transactions
    WHERE account_id = ?
      AND type = 'debit'
      AND category = 'pix'
      AND created_at >= date('now', 'start of day')
  `).get(accountId) as { total: number }
  return row.total
}

export class PixService {
  listKeys(userId: string): PixKeyRow[] {
    const db = getDb()
    return db
      .prepare('SELECT * FROM pix_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC')
      .all(userId) as PixKeyRow[]
  }

  createKey(userId: string, accountId: string, input: CreatePixKeyInput) {
    const db = getDb()

    // RN-05: max 5 pix keys
    const keyCount = (
      db.prepare('SELECT COUNT(*) as count FROM pix_keys WHERE user_id = ? AND is_active = 1').get(userId) as { count: number }
    ).count

    if (keyCount >= MAX_PIX_KEYS) {
      throw Errors.pixKeyLimitReached()
    }

    // Check key uniqueness
    const existing = db
      .prepare('SELECT id FROM pix_keys WHERE key_value = ? AND is_active = 1')
      .get(input.keyValue)

    if (existing) {
      throw Errors.pixKeyAlreadyExists()
    }

    // For random key type, generate a UUID
    const keyValue =
      input.keyType === 'random' ? generateId() : input.keyValue

    const id = generateId()
    db.prepare(`
      INSERT INTO pix_keys (id, user_id, account_id, key_type, key_value, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, userId, accountId, input.keyType, keyValue)

    return db.prepare('SELECT * FROM pix_keys WHERE id = ?').get(id) as PixKeyRow
  }

  deleteKey(userId: string, keyId: string) {
    const db = getDb()

    const key = db
      .prepare('SELECT * FROM pix_keys WHERE id = ? AND user_id = ? AND is_active = 1')
      .get(keyId, userId) as PixKeyRow | undefined

    if (!key) {
      throw new AppError(ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix não encontrada', 404)
    }

    // RN-07: soft delete
    db.prepare(`
      UPDATE pix_keys
      SET is_active = 0, deleted_at = datetime('now')
      WHERE id = ?
    `).run(keyId)

    return { message: 'Chave Pix removida com sucesso' }
  }

  transfer(userId: string, accountId: string, input: PixTransferInput) {
    const db = getDb()

    // Lookup the target pix key
    const targetKey = db
      .prepare('SELECT * FROM pix_keys WHERE key_value = ? AND is_active = 1')
      .get(input.pixKey) as PixKeyRow | undefined

    if (!targetKey) {
      throw new AppError(ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix não encontrada', 404)
    }

    // Prevent self-transfer
    if (targetKey.account_id === accountId) {
      throw new AppError(ErrorCode.PIX_SELF_TRANSFER, 'Não é possível transferir para sua própria conta', 422)
    }

    // Get sender account
    const senderAccount = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1')
      .get(accountId) as AccountRow | undefined

    if (!senderAccount) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Conta não encontrada', 404)
    }

    // RN-04: Check sufficient balance
    if (senderAccount.balance_cents < input.amountCents) {
      throw Errors.insufficientBalance()
    }

    // RN-01: Check daily transfer limit (computed on-the-fly from today's transactions)
    const dailyTransferred = getDailyTransferred(accountId)

    if (dailyTransferred + input.amountCents > senderAccount.daily_transfer_limit_cents) {
      throw Errors.dailyLimitExceeded(senderAccount.daily_transfer_limit_cents)
    }

    // RN-02: Night limit R$ 1.000,00
    if (isNightTime() && input.amountCents > NIGHT_LIMIT_CENTS) {
      throw Errors.nightLimitExceeded()
    }

    // RN-03: Reinforced auth for amounts > R$ 5.000,00
    if (input.amountCents > REINFORCED_AUTH_THRESHOLD && !input.reinforcedToken) {
      throw Errors.reinforcedAuthRequired()
    }

    // RN-10: Rate limit — max 5 transfers per 5 minutes
    this.checkRateLimit(accountId)

    // Get receiver account
    const receiverAccount = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1')
      .get(targetKey.account_id) as AccountRow | undefined

    if (!receiverAccount) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Conta destinatária não encontrada', 404)
    }

    // Get receiver user info (+ role, usado pra detectar plataforma ECP)
    const receiverUser = db
      .prepare('SELECT u.name, u.cpf, u.role FROM users u JOIN accounts a ON a.user_id = u.id WHERE a.id = ?')
      .get(targetKey.account_id) as { name: string; cpf: string; role?: string } | undefined

    // Get sender user info — for counterpart fields on the receiver's credit transaction
    const senderUser = db
      .prepare('SELECT u.name, u.cpf FROM users u JOIN accounts a ON a.user_id = u.id WHERE a.id = ?')
      .get(accountId) as { name: string; cpf: string } | undefined

    const receiverName = receiverUser?.name ?? 'Destinatário'
    const receiverCpf = receiverUser?.cpf ?? null
    const senderName = senderUser?.name ?? 'Remetente'
    const senderCpf = senderUser?.cpf ?? null
    // Multi-tenant internal: both sides live in ECP Digital Bank today.
    // When/if cross-institution Pix is wired, this needs to come from the Pix message payload.
    const institution = 'ECP Digital Bank'
    const senderNewBalance = senderAccount.balance_cents - input.amountCents
    const receiverNewBalance = receiverAccount.balance_cents + input.amountCents
    const transactionId = generateId()
    const now = new Date().toISOString()

    // Execute transfer atomically
    const doTransfer = db.transaction(() => {
      // Debit sender. Columns `daily_transferred_cents` and `last_transfer_date` are deprecated
      // in favour of the on-the-fly `getDailyTransferred` helper. Left in the schema for compat.
      db.prepare(`
        UPDATE accounts
        SET balance_cents = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        senderNewBalance,
        accountId
      )

      // Credit receiver
      db.prepare(`
        UPDATE accounts
        SET balance_cents = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(receiverNewBalance, targetKey.account_id)

      // Record debit transaction for sender
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, counterpart_document, counterpart_institution, pix_key, pix_key_type, status, created_at)
        VALUES (?, ?, 'debit', 'pix', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        transactionId, accountId, input.amountCents, senderNewBalance,
        input.description ?? `Pix enviado para ${receiverName}`,
        receiverName, receiverCpf, institution, input.pixKey, targetKey.key_type, now
      )

      // Record credit transaction for receiver
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, counterpart_document, counterpart_institution, pix_key, pix_key_type, status, created_at)
        VALUES (?, ?, 'credit', 'pix', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        generateId(), targetKey.account_id, input.amountCents, receiverNewBalance,
        input.description ?? `Pix recebido`,
        senderName, senderCpf, institution, input.pixKey, targetKey.key_type, now
      )

      // Update rate limit counter
      this.incrementRateLimit(accountId)
    })

    doTransfer()

    // Se recebedor é plataforma ECP (role=system), notifica ecp-pay de forma
    // fire-and-forget. Ecp-pay localiza a charge pendente e settla, disparando
    // webhook ao app consumidor (ex.: ecp-food confirmar pedido).
    if (receiverUser?.role === 'system') {
      void ecpPayClient
        .notifyPixReceived(input.pixKey, input.amountCents, transactionId)
        .catch((err) => {
          console.error('[pix.transfer] notifyPixReceived falhou (não bloqueia):', (err as Error).message)
        })
    }

    return {
      transactionId,
      amountCents: input.amountCents,
      balanceAfterCents: senderNewBalance,
      counterpartName: receiverName,
      pixKey: input.pixKey,
      createdAt: now,
    }
  }

  private checkRateLimit(accountId: string) {
    const db = getDb()
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()

    const record = db
      .prepare('SELECT transfer_count FROM pix_rate_limit WHERE account_id = ? AND window_start > ?')
      .get(accountId, windowStart) as { transfer_count: number } | undefined

    if (record && record.transfer_count >= RATE_LIMIT_MAX_TRANSFERS) {
      throw Errors.rateLimitExceeded()
    }
  }

  private incrementRateLimit(accountId: string) {
    const db = getDb()
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()

    const existing = db
      .prepare('SELECT id, transfer_count FROM pix_rate_limit WHERE account_id = ? AND window_start > ?')
      .get(accountId, windowStart) as { id: string; transfer_count: number } | undefined

    if (existing) {
      db.prepare('UPDATE pix_rate_limit SET transfer_count = ? WHERE id = ?')
        .run(existing.transfer_count + 1, existing.id)
    } else {
      db.prepare('INSERT INTO pix_rate_limit (id, account_id, window_start, transfer_count) VALUES (?, ?, ?, 1)')
        .run(generateId(), accountId, new Date().toISOString())
    }
  }

  lookupKey(key: string) {
    const db = getDb()
    const pixKey = db
      .prepare('SELECT pk.*, u.name FROM pix_keys pk JOIN accounts a ON a.id = pk.account_id JOIN users u ON u.id = a.user_id WHERE pk.key_value = ? AND pk.is_active = 1')
      .get(key) as (PixKeyRow & { name: string }) | undefined

    if (!pixKey) {
      throw new AppError(ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix não encontrada', 404)
    }

    return {
      keyType: pixKey.key_type,
      keyValue: pixKey.key_value,
      holderName: pixKey.name,
    }
  }

  /**
   * Generate a Pix QR Code for RECEIVING payments via ECP Pay.
   * This is separate from the P2P transfer flow — it creates a charge
   * that external payers can scan to send money.
   */
  async generatePixQrCode(userId: string, accountId: string, amountCents: number, userName: string, userCpf: string, description?: string) {
    const db = getDb()

    const account = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1')
      .get(accountId) as AccountRow | undefined

    if (!account) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Conta não encontrada', 404)
    }

    const ecpPayResult = await ecpPayClient.createPixCharge(
      amountCents,
      userName,
      userCpf,
      description ?? 'Cobrança Pix'
    )

    // Record the pending incoming transaction locally
    const transactionId = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, status, metadata, created_at)
      VALUES (?, ?, 'credit', 'pix', ?, ?, ?, 'pending', ?, ?)
    `).run(
      transactionId, accountId, amountCents, account.balance_cents,
      description ?? 'Cobrança Pix via QR Code',
      JSON.stringify({ ecp_pay_tx_id: ecpPayResult.transaction_id }),
      now
    )

    return {
      transactionId,
      ecpPayTxId: ecpPayResult.transaction_id,
      qrCode: ecpPayResult.qr_code,
      qrCodeText: ecpPayResult.qr_code_text,
      expiration: ecpPayResult.expiration,
      amountCents,
      status: ecpPayResult.status,
      createdAt: now,
    }
  }

  /**
   * Debit a user's account by CPF — used by ECP Pay service account
   * to register a Pix payment on the payer's bank statement.
   */
  debitByCpf(input: { cpf: string; amountCents: number; description: string; merchantName: string }) {
    const db = getDb()

    // Find user by CPF or email (food sends email as customer_document)
    const isEmail = input.cpf.includes('@')
    const user = isEmail
      ? db.prepare('SELECT id, name FROM users WHERE email = ?').get(input.cpf) as { id: string; name: string } | undefined
      : db.prepare('SELECT id, name FROM users WHERE cpf = ?').get(input.cpf.replace(/\D/g, '')) as { id: string; name: string } | undefined

    if (!user) {
      throw new AppError(ErrorCode.USER_NOT_FOUND, 'Usuário não encontrado', 404)
    }

    // Find account
    const account = db
      .prepare('SELECT id, balance_cents FROM accounts WHERE user_id = ? AND is_active = 1')
      .get(user.id) as { id: string; balance_cents: number } | undefined

    if (!account) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Conta não encontrada', 404)
    }

    const newBalance = account.balance_cents - input.amountCents
    const transactionId = generateId()
    const now = new Date().toISOString()

    db.transaction(() => {
      // Debit account
      db.prepare(
        "UPDATE accounts SET balance_cents = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newBalance, account.id)

      // Record debit transaction
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, created_at)
        VALUES (?, ?, 'debit', 'pix', ?, ?, ?, ?, 'completed', ?)
      `).run(
        transactionId, account.id, input.amountCents, newBalance,
        input.description, input.merchantName, now
      )
    })()

    return {
      transactionId,
      userId: user.id,
      userName: user.name,
      amountCents: input.amountCents,
      newBalanceCents: newBalance,
      status: 'completed',
    }
  }

  /**
   * Credit a user's account by Pix key — used by ECP Emps service account to
   * deliver a Pix from a PJ company to a PF recipient in ecp-digital-bank.
   *
   * The key can be:
   *   - a registered pix_keys.key_value (email, phone, random)
   *   - a CPF (matches users.cpf)
   *   - an email (matches users.email, regardless of key being registered as Pix key)
   */
  creditByKey(input: {
    key: string
    amountCents: number
    description: string
    senderName: string
  }) {
    const db = getDb()
    const key = input.key.trim()

    // Resolve destination account via 3 paths, in priority order.
    let accountRow: { id: string; user_id: string; balance_cents: number; name: string } | undefined

    accountRow = db.prepare(`
      SELECT a.id, a.user_id, a.balance_cents, u.name
        FROM pix_keys pk
        JOIN accounts a ON a.id = pk.account_id AND a.is_active = 1
        JOIN users u ON u.id = a.user_id
       WHERE pk.key_value = ? AND pk.is_active = 1
       LIMIT 1
    `).get(key) as typeof accountRow

    if (!accountRow && key.includes('@')) {
      accountRow = db.prepare(`
        SELECT a.id, a.user_id, a.balance_cents, u.name
          FROM users u
          JOIN accounts a ON a.user_id = u.id AND a.is_active = 1
         WHERE u.email = ?
         LIMIT 1
      `).get(key) as typeof accountRow
    }

    if (!accountRow) {
      const cpfDigits = key.replace(/\D/g, '')
      if (cpfDigits.length === 11) {
        accountRow = db.prepare(`
          SELECT a.id, a.user_id, a.balance_cents, u.name
            FROM users u
            JOIN accounts a ON a.user_id = u.id AND a.is_active = 1
           WHERE u.cpf = ?
           LIMIT 1
        `).get(cpfDigits) as typeof accountRow
      }
    }

    if (!accountRow) {
      throw new AppError(ErrorCode.PIX_KEY_NOT_FOUND, 'Chave Pix / CPF / email nao encontrado', 404)
    }

    const newBalance = accountRow.balance_cents + input.amountCents
    const transactionId = generateId()
    const now = new Date().toISOString()

    db.transaction(() => {
      db.prepare(
        "UPDATE accounts SET balance_cents = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newBalance, accountRow!.id)

      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, created_at)
        VALUES (?, ?, 'credit', 'pix', ?, ?, ?, ?, 'completed', ?)
      `).run(
        transactionId, accountRow!.id, input.amountCents, newBalance,
        input.description, input.senderName, now
      )
    })()

    return {
      transactionId,
      userId: accountRow.user_id,
      userName: accountRow.name,
      amountCents: input.amountCents,
      newBalanceCents: newBalance,
      status: 'completed',
    }
  }

  /**
   * Decodifica um BRCode/EMV Pix (copia-e-cola) e retorna os dados extraídos
   * para a UI pré-visualizar antes do pagamento. Lança os erros tipados do parser.
   */
  parseBrcodePreview(brcode: string): BrcodeData {
    // parseBrcode já valida CRC e lança erros tipados
    return parseBrcode(brcode)
  }

  /**
   * Paga um Pix a partir de um código BRCode/EMV (copia-e-cola).
   * Reusa o fluxo de transfer() após resolver chave e valor a partir do payload.
   *
   * Regras:
   *  - BRCode inválido ou CRC corrompido → erro tipado
   *  - BRCode dinâmico (com valor) → usa o valor do payload; input.amountCents é ignorado
   *  - BRCode estático (sem valor) → input.amountCents é obrigatório
   */
  payByBrcode(userId: string, accountId: string, input: PixPayBrcodeInput) {
    const parsed = parseBrcode(input.brcode)
    // parseBrcode já valida CRC, mas validamos explicitamente para segurança
    if (!validateCRC16(input.brcode)) {
      throw new InvalidCrcError()
    }

    // Resolve valor: dinâmico usa o embutido; estático exige input.amountCents
    const finalAmount = parsed.amountCents ?? input.amountCents
    if (!finalAmount || finalAmount <= 0) {
      throw new AppError(
        ErrorCode.PIX_INVALID_AMOUNT,
        'BRCode estático sem valor — informe amountCents',
        422
      )
    }

    const description =
      input.description ??
      parsed.description ??
      `Pagamento Pix - ${parsed.merchantName}`

    return this.transfer(userId, accountId, {
      pixKey: parsed.pixKey,
      amountCents: finalAmount,
      description,
      reinforcedToken: input.reinforcedToken,
    })
  }
}
