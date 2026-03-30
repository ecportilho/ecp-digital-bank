import { randomUUID } from 'crypto'

const ECP_PAY_URL = process.env.ECP_PAY_URL || 'http://localhost:3335'
const ECP_PAY_API_KEY = process.env.ECP_PAY_API_KEY || 'ecp-bank-dev-key'
const SOURCE_APP = 'ecp-bank'

async function ecpPayRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const idempotencyKey = method !== 'GET' ? randomUUID() : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': ECP_PAY_API_KEY,
    'X-Source-App': SOURCE_APP,
  }

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey
  }

  console.log(`[ecp-pay] ${method} ${ECP_PAY_URL}${path} | app=${SOURCE_APP}${idempotencyKey ? ` | idempotency=${idempotencyKey}` : ''}`)

  const start = Date.now()
  const response = await fetch(`${ECP_PAY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const elapsed = Date.now() - start

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'ECP Pay request failed' }))
    console.error(`[ecp-pay] FALHA ${response.status} em ${elapsed}ms | ${error.message}`)
    throw new Error(error.message || `ECP Pay HTTP ${response.status}`)
  }

  const result = await response.json() as T
  const txId = (result as Record<string, unknown>).transaction_id || '-'
  console.log(`[ecp-pay] OK ${response.status} em ${elapsed}ms | transaction_id=${txId}`)
  return result
}

export const ecpPayClient = {
  createPixCharge(amount: number, customerName: string, customerDocument: string, description?: string) {
    return ecpPayRequest<{
      transaction_id: string
      qr_code: string
      qr_code_text: string
      expiration: string
      status: string
    }>('POST', '/pay/pix', {
      amount,
      customer_name: customerName,
      customer_document: customerDocument,
      description,
    })
  },

  createBoletoCharge(amount: number, customerName: string, customerDocument: string, dueDate: string, description?: string) {
    return ecpPayRequest<{
      transaction_id: string
      barcode: string
      digitable_line: string
      due_date: string
      status: string
    }>('POST', '/pay/boleto', {
      amount,
      customer_name: customerName,
      customer_document: customerDocument,
      due_date: dueDate,
      description,
    })
  },

  createCardCharge(amount: number, customerName: string, customerDocument: string, cardToken?: string, cardNumber?: string, cardExpiry?: string, cardCvv?: string, cardHolderName?: string, saveCard?: boolean, installments?: number) {
    return ecpPayRequest<{
      transaction_id: string
      status: string
      card_token?: string
      card_last4?: string
      card_brand?: string
    }>('POST', '/pay/card', {
      amount,
      customer_name: customerName,
      customer_document: customerDocument,
      card_token: cardToken,
      card_number: cardNumber,
      card_expiry: cardExpiry,
      card_cvv: cardCvv,
      card_holder_name: cardHolderName,
      save_card: saveCard,
      installments,
    })
  },

  getTransaction(transactionId: string) {
    return ecpPayRequest<{ status: string }>('GET', `/pay/transactions/${transactionId}`)
  },

  refund(transactionId: string, amount?: number) {
    return ecpPayRequest<{ refund_id: string; status: string }>('POST', `/pay/transactions/${transactionId}/refund`, {
      amount,
    })
  },
}
