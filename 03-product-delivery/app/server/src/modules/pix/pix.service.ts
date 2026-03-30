import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
import { ecpPayClient } from '../../services/ecp-pay-client.js'
import type { CreatePixKeyInput, PixTransferInput } from './pix.schema.js'

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

function isSameDay(date1: string | null): boolean {
  if (!date1) return false
  const d1 = new Date(date1).toDateString()
  const d2 = new Date().toDateString()
  return d1 === d2
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

    // RN-01: Check daily transfer limit
    const dailyTransferred = isSameDay(senderAccount.last_transfer_date)
      ? senderAccount.daily_transferred_cents
      : 0

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

    // Get receiver user info
    const receiverUser = db
      .prepare('SELECT name FROM users WHERE id = (SELECT user_id FROM accounts WHERE id = ?)')
      .get(targetKey.account_id) as { name: string } | undefined

    const receiverName = receiverUser?.name ?? 'Destinatário'
    const senderNewBalance = senderAccount.balance_cents - input.amountCents
    const receiverNewBalance = receiverAccount.balance_cents + input.amountCents
    const transactionId = generateId()
    const now = new Date().toISOString()
    const today = now.split('T')[0] ?? now

    // Execute transfer atomically
    const doTransfer = db.transaction(() => {
      // Debit sender
      db.prepare(`
        UPDATE accounts
        SET balance_cents = ?,
            daily_transferred_cents = ?,
            last_transfer_date = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        senderNewBalance,
        dailyTransferred + input.amountCents,
        today,
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
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, pix_key, pix_key_type, status, created_at)
        VALUES (?, ?, 'debit', 'pix', ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        transactionId, accountId, input.amountCents, senderNewBalance,
        input.description ?? `Pix enviado para ${receiverName}`,
        receiverName, input.pixKey, targetKey.key_type, now
      )

      // Record credit transaction for receiver
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, pix_key, pix_key_type, status, created_at)
        VALUES (?, ?, 'credit', 'pix', ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        generateId(), targetKey.account_id, input.amountCents, receiverNewBalance,
        input.description ?? `Pix recebido`,
        'Remetente', input.pixKey, targetKey.key_type, now
      )

      // Update rate limit counter
      this.incrementRateLimit(accountId)
    })

    doTransfer()

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
}
