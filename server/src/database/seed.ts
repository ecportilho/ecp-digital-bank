import { getDb } from './connection.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function seed() {
  const db = getDb()

  // Run migration first
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const sqlPath = path.join(__dirname, 'migrations/001-initial.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  db.exec(sql)

  console.log('[seed] Starting database seed...')

  // Clear existing data
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM card_purchases;
    DELETE FROM invoices;
    DELETE FROM cards;
    DELETE FROM transactions;
    DELETE FROM pix_keys;
    DELETE FROM pix_rate_limit;
    DELETE FROM accounts;
    DELETE FROM users;
  `)

  // Create Marina Silva
  const userId = uuidv4()
  const accountId = uuidv4()
  const passwordHash = await bcrypt.hash('Senha@123', 12)

  db.prepare(`
    INSERT INTO users (id, name, email, cpf, password_hash, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(userId, 'Marina Silva', 'marina@email.com', '12345678900', passwordHash, '+5511999887766')

  db.prepare(`
    INSERT INTO accounts (id, user_id, agency, number, balance_cents, daily_transfer_limit_cents, daily_transferred_cents)
    VALUES (?, ?, '0001', ?, 423578, 500000, 0)
  `).run(accountId, userId, '00012345')

  // Pix keys: CPF, email, phone
  const pixKeyCpf = uuidv4()
  const pixKeyEmail = uuidv4()
  const pixKeyPhone = uuidv4()

  db.prepare(`
    INSERT INTO pix_keys (id, user_id, account_id, key_type, key_value, is_active)
    VALUES (?, ?, ?, 'cpf', '12345678900', 1)
  `).run(pixKeyCpf, userId, accountId)

  db.prepare(`
    INSERT INTO pix_keys (id, user_id, account_id, key_type, key_value, is_active)
    VALUES (?, ?, ?, 'email', 'marina@email.com', 1)
  `).run(pixKeyEmail, userId, accountId)

  db.prepare(`
    INSERT INTO pix_keys (id, user_id, account_id, key_type, key_value, is_active)
    VALUES (?, ?, ?, 'phone', '+5511999887766', 1)
  `).run(pixKeyPhone, userId, accountId)

  // Virtual card
  const cardId = uuidv4()
  db.prepare(`
    INSERT INTO cards (id, user_id, account_id, type, last4, limit_cents, used_cents, due_day, is_active)
    VALUES (?, ?, ?, 'virtual', '4832', 300000, 124750, 10, 1)
  `).run(cardId, userId, accountId)

  // Current invoice
  const invoiceId = uuidv4()
  db.prepare(`
    INSERT INTO invoices (id, card_id, reference_month, total_cents, due_date, status)
    VALUES (?, ?, '2024-03', 124750, '2024-03-10', 'open')
  `).run(invoiceId, cardId)

  // Card purchases
  const purchases = [
    { desc: 'Mercado Extra', merchant: 'Supermercado Extra', category: 'Supermercados', amount: 8990 },
    { desc: 'iFood - Jantar', merchant: 'iFood', category: 'Alimentação', amount: 6750 },
    { desc: 'Netflix', merchant: 'Netflix', category: 'Streaming', amount: 3990 },
    { desc: 'Posto Shell', merchant: 'Shell', category: 'Combustível', amount: 18000 },
    { desc: 'Farmácia Drogasil', merchant: 'Drogasil', category: 'Farmácia', amount: 4550 },
    { desc: 'Shopee - Eletrônicos', merchant: 'Shopee', category: 'E-commerce', amount: 12990 },
    { desc: 'Starbucks', merchant: 'Starbucks', category: 'Cafeteria', amount: 3280 },
    { desc: 'Uber', merchant: 'Uber', category: 'Transporte', amount: 3200 },
    { desc: 'Gympass', merchant: 'Gympass', category: 'Saúde', amount: 9990 },
    { desc: 'Spotify', merchant: 'Spotify', category: 'Streaming', amount: 2190 },
    { desc: 'Amazon - Livros', merchant: 'Amazon', category: 'E-commerce', amount: 7820 },
    { desc: 'Cinemark', merchant: 'Cinemark', category: 'Entretenimento', amount: 4800 },
  ]

  for (const p of purchases) {
    db.prepare(`
      INSERT INTO card_purchases (id, card_id, invoice_id, description, merchant_name, merchant_category, amount_cents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
    `).run(uuidv4(), cardId, invoiceId, p.desc, p.merchant, p.category, p.amount)
  }

  // Transactions
  const now = new Date()
  const txData = [
    {
      type: 'credit', category: 'pix', amount: 150000,
      description: 'Pix recebido de João Alves',
      counterpart: 'João Alves', daysAgo: 1
    },
    {
      type: 'debit', category: 'pix', amount: 5000,
      description: 'Pix enviado - Aluguel',
      counterpart: 'Pedro Santos', daysAgo: 2
    },
    {
      type: 'debit', category: 'boleto', amount: 22000,
      description: 'Conta de energia elétrica - Enel',
      counterpart: 'Enel', daysAgo: 3
    },
    {
      type: 'credit', category: 'deposit', amount: 500000,
      description: 'Salário',
      counterpart: 'Empresa XYZ Ltda', daysAgo: 5
    },
    {
      type: 'debit', category: 'pix', amount: 12000,
      description: 'Pix enviado - Mercado',
      counterpart: 'Mercado Central', daysAgo: 6
    },
    {
      type: 'debit', category: 'card_purchase', amount: 8990,
      description: 'Compra cartão - Mercado Extra',
      counterpart: 'Supermercado Extra', daysAgo: 7
    },
    {
      type: 'credit', category: 'pix', amount: 30000,
      description: 'Pix recebido - Reembolso viagem',
      counterpart: 'Ana Costa', daysAgo: 8
    },
    {
      type: 'debit', category: 'boleto', amount: 18500,
      description: 'Conta de internet - Vivo',
      counterpart: 'Vivo', daysAgo: 10
    },
    {
      type: 'debit', category: 'pix', amount: 7500,
      description: 'Pix enviado - Academia',
      counterpart: 'Smart Fit', daysAgo: 12
    },
    {
      type: 'debit', category: 'card_purchase', amount: 6750,
      description: 'iFood - Jantar romantíco',
      counterpart: 'iFood', daysAgo: 14
    },
    {
      type: 'credit', category: 'refund', amount: 4550,
      description: 'Estorno - Farmácia',
      counterpart: 'Drogasil', daysAgo: 15
    },
    {
      type: 'debit', category: 'pix', amount: 25000,
      description: 'Pix enviado - Conserto carro',
      counterpart: 'Auto Mecânica Bom', daysAgo: 18
    },
  ]

  let runningBalance = 423578
  for (const tx of txData) {
    const txDate = new Date(now)
    txDate.setDate(txDate.getDate() - tx.daysAgo)
    const balanceBefore = tx.type === 'credit'
      ? runningBalance - tx.amount
      : runningBalance + tx.amount

    db.prepare(`
      INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(
      uuidv4(), accountId, tx.type, tx.category,
      tx.amount, runningBalance,
      tx.description, tx.counterpart,
      txDate.toISOString()
    )

    if (tx.type === 'credit') runningBalance -= tx.amount
    else runningBalance += tx.amount
  }

  // Pending boleto transactions
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  db.prepare(`
    INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, scheduled_for, created_at)
    VALUES (?, ?, 'debit', 'boleto', 12000, 0, 'Boleto - Condomínio', 'Condomínio Residencial Mar', 'pending', ?, ?)
  `).run(uuidv4(), accountId, tomorrow.toISOString(), now.toISOString())

  db.prepare(`
    INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, scheduled_for, created_at)
    VALUES (?, ?, 'debit', 'boleto', 45000, 0, 'Boleto - Plano de Saúde', 'Amil Saúde', 'pending', ?, ?)
  `).run(uuidv4(), accountId, nextWeek.toISOString(), now.toISOString())

  // Notifications
  const notifData = [
    { title: 'Pix recebido', body: 'Você recebeu R$ 1.500,00 de João Alves', type: 'transaction' },
    { title: 'Fatura disponível', body: 'Sua fatura de março está disponível para pagamento', type: 'system' },
    { title: 'Limite atualizado', body: 'Seu limite diário Pix foi renovado', type: 'security' },
  ]

  for (const n of notifData) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, body, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, n.title, n.body, n.type)
  }

  console.log('[seed] Database seeded successfully.')
  console.log('[seed] Login: marina@email.com / Senha@123')
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed] Error:', err)
  process.exit(1)
})
