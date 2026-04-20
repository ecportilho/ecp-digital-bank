import { getDb } from '../database/connection.js'
import { generateId } from '../shared/utils/uuid.js'
import { ecpPayClient } from './ecp-pay-client.js'

type Operation = 'boleto' | 'pix' | 'card'

interface EnqueueArgs {
  transactionId: string
  operation: Operation
  payload: Record<string, unknown>
  error: string
}

// Backoff schedule (minutes): 5, 15, 60, 360, 1440. After the 5th failure we move to dead_letter.
const BACKOFF_MINUTES = [5, 15, 60, 360, 1440]
const MAX_ATTEMPTS = BACKOFF_MINUTES.length
const TICK_INTERVAL_MS = 30_000
const MAX_JOBS_PER_TICK = 10

export function enqueueEcpPayRetry(args: EnqueueArgs): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO ecp_pay_retry_queue (id, transaction_id, operation, payload, attempts, last_error, next_retry_at, status)
    VALUES (?, ?, ?, ?, 0, ?, datetime('now', '+' || ? || ' minutes'), 'pending')
  `).run(
    generateId(),
    args.transactionId,
    args.operation,
    JSON.stringify(args.payload),
    args.error,
    BACKOFF_MINUTES[0]
  )
}

interface QueueRow {
  id: string
  transaction_id: string
  operation: Operation
  payload: string
  attempts: number
}

async function processJob(row: QueueRow): Promise<void> {
  const db = getDb()
  const payload = JSON.parse(row.payload) as Record<string, unknown>

  try {
    if (row.operation === 'boleto') {
      const result = await ecpPayClient.createBoletoCharge(
        payload.amountCents as number,
        payload.customerName as string,
        payload.customerDocument as string,
        payload.dueDate as string,
        payload.description as string | undefined
      )
      // Success — update transaction metadata and mark queue row success
      db.prepare(`
        UPDATE transactions SET metadata = ? WHERE id = ?
      `).run(JSON.stringify({ ecp_pay_tx_id: result.transaction_id }), row.transaction_id)

      db.prepare(`
        UPDATE ecp_pay_retry_queue
        SET status = 'success', attempts = attempts + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(row.id)
      return
    }
    // Other operations are not enqueued yet; mark as dead_letter for now
    db.prepare(`
      UPDATE ecp_pay_retry_queue
      SET status = 'dead_letter', last_error = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(`Unsupported operation: ${row.operation}`, row.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const nextAttempts = row.attempts + 1

    if (nextAttempts >= MAX_ATTEMPTS) {
      db.prepare(`
        UPDATE ecp_pay_retry_queue
        SET attempts = ?, last_error = ?, status = 'dead_letter', updated_at = datetime('now')
        WHERE id = ?
      `).run(nextAttempts, message, row.id)
      return
    }

    const delay = BACKOFF_MINUTES[nextAttempts] ?? BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1]
    db.prepare(`
      UPDATE ecp_pay_retry_queue
      SET attempts = ?, last_error = ?, next_retry_at = datetime('now', '+' || ? || ' minutes'), updated_at = datetime('now')
      WHERE id = ?
    `).run(nextAttempts, message, delay, row.id)
  }
}

/**
 * Process up to MAX_JOBS_PER_TICK pending jobs whose next_retry_at has elapsed.
 * Exported for tests — production runs via setInterval in startEcpPayRetryWorker.
 */
export async function processEcpPayRetryQueueTick(): Promise<void> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, transaction_id, operation, payload, attempts
    FROM ecp_pay_retry_queue
    WHERE status = 'pending' AND next_retry_at <= datetime('now')
    ORDER BY next_retry_at ASC
    LIMIT ?
  `).all(MAX_JOBS_PER_TICK) as QueueRow[]

  for (const row of rows) {
    await processJob(row)
  }
}

let timerHandle: NodeJS.Timeout | null = null

export function startEcpPayRetryWorker(): void {
  if (timerHandle) return
  timerHandle = setInterval(() => {
    processEcpPayRetryQueueTick().catch((err) => {
      console.error('[ecp-pay-retry-worker] tick failed:', err)
    })
  }, TICK_INTERVAL_MS)
  if (typeof timerHandle.unref === 'function') timerHandle.unref()
}

export function stopEcpPayRetryWorker(): void {
  if (timerHandle) {
    clearInterval(timerHandle)
    timerHandle = null
  }
}
