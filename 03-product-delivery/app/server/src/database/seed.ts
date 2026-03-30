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

  // Apply additional migrations
  const additionalMigrations = ['002-chat.sql', '003-ecp-pay-integration.sql', '004-user-roles.sql']
  for (const migFile of additionalMigrations) {
    try {
      const migSql = readFileSync(path.join(__dirname, 'migrations', migFile), 'utf-8')
      db.exec(migSql)
    } catch {
      // Migration may already be applied or column already exists
    }
  }

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
    INSERT INTO cards (id, user_id, account_id, type, card_number, last4, card_holder, card_expiry, limit_cents, used_cents, due_day, is_active)
    VALUES (?, ?, ?, 'virtual', '4539620189474832', '4832', 'MARINA SILVA', '12/28', 300000, 124750, 10, 1)
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

  // ============================================================
  // 10 Additional Users with diverse profiles
  // ============================================================

  const additionalUsers = [
    {
      name: 'Carlos Eduardo Mendes',
      email: 'carlos.mendes@email.com',
      cpf: '98765432100',
      phone: '+5521988776655',
      balanceCents: 1589320,    // R$ 15.893,20
      accountNumber: '00023456',
      dailyLimitCents: 1000000, // R$ 10.000
      cardNumber: '5287341098567291',
      cardLast4: '7291',
      cardHolder: 'CARLOS EDUARDO MENDES',
      cardExpiry: '06/29',
      cardLimitCents: 500000,   // R$ 5.000
      cardUsedCents: 87600,
      pixKeys: [
        { type: 'cpf', value: '98765432100' },
        { type: 'email', value: 'carlos.mendes@email.com' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 850000, description: 'Salário - TechCorp', counterpart: 'TechCorp S.A.', daysAgo: 2 },
        { type: 'debit', category: 'pix', amount: 250000, description: 'Pix enviado - Aluguel', counterpart: 'Imobiliária Horizonte', daysAgo: 3 },
        { type: 'debit', category: 'boleto', amount: 15000, description: 'Conta de água - SABESP', counterpart: 'SABESP', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 50000, description: 'Pix recebido - Freelance design', counterpart: 'Agência Criativa', daysAgo: 7 },
        { type: 'debit', category: 'card_purchase', amount: 45000, description: 'Compra cartão - Renner', counterpart: 'Lojas Renner', daysAgo: 9 },
        { type: 'debit', category: 'pix', amount: 8500, description: 'Pix enviado - Barbeiro', counterpart: 'Barbearia Old School', daysAgo: 11 },
      ],
      purchases: [
        { desc: 'Renner - Camisas', merchant: 'Lojas Renner', category: 'Vestuário', amount: 25900 },
        { desc: 'Steam - Games', merchant: 'Steam', category: 'Entretenimento', amount: 18900 },
        { desc: 'Rappi - Almoço', merchant: 'Rappi', category: 'Alimentação', amount: 4280 },
        { desc: 'Posto Ipiranga', merchant: 'Ipiranga', category: 'Combustível', amount: 22000 },
        { desc: 'HBO Max', merchant: 'HBO Max', category: 'Streaming', amount: 3490 },
      ],
      notifications: [
        { title: 'Salário creditado', body: 'Depósito de R$ 8.500,00 recebido de TechCorp S.A.', type: 'transaction' },
        { title: 'Pix enviado', body: 'Transferência de R$ 2.500,00 para Imobiliária Horizonte', type: 'transaction' },
      ],
    },
    {
      name: 'Aisha Oliveira Santos',
      email: 'aisha.santos@email.com',
      cpf: '11223344556',
      phone: '+5531977665544',
      balanceCents: 52340,      // R$ 523,40
      accountNumber: '00034567',
      dailyLimitCents: 300000,  // R$ 3.000
      cardNumber: '4916783255011053',
      cardLast4: '1053',
      cardHolder: 'AISHA OLIVEIRA SANTOS',
      cardExpiry: '03/27',
      cardLimitCents: 150000,   // R$ 1.500
      cardUsedCents: 134200,
      pixKeys: [
        { type: 'phone', value: '+5531977665544' },
        { type: 'random', value: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 220000, description: 'Salário - Hospital Santa Casa', counterpart: 'Hospital Santa Casa', daysAgo: 1 },
        { type: 'debit', category: 'pix', amount: 120000, description: 'Pix enviado - Aluguel quarto', counterpart: 'Maria Lúcia Ferreira', daysAgo: 2 },
        { type: 'debit', category: 'pix', amount: 15000, description: 'Pix enviado - Passagem ônibus mensal', counterpart: 'BHTrans', daysAgo: 3 },
        { type: 'debit', category: 'boleto', amount: 8900, description: 'Conta celular - Claro', counterpart: 'Claro', daysAgo: 6 },
        { type: 'credit', category: 'pix', amount: 5000, description: 'Pix recebido - Venda brechó', counterpart: 'Juliana Araújo', daysAgo: 8 },
      ],
      purchases: [
        { desc: 'Shopee - Capinha celular', merchant: 'Shopee', category: 'E-commerce', amount: 2990 },
        { desc: 'Shein - Roupas', merchant: 'Shein', category: 'Vestuário', amount: 8950 },
        { desc: 'Farmácia Pague Menos', merchant: 'Pague Menos', category: 'Farmácia', amount: 3450 },
        { desc: 'McDonald\'s', merchant: 'McDonald\'s', category: 'Alimentação', amount: 3290 },
      ],
      notifications: [
        { title: 'Limite baixo', body: 'Seu saldo está abaixo de R$ 600,00', type: 'system' },
        { title: 'Pix recebido', body: 'Você recebeu R$ 50,00 de Juliana Araújo', type: 'transaction' },
      ],
    },
    {
      name: 'Roberto Yukio Tanaka',
      email: 'roberto.tanaka@email.com',
      cpf: '33445566778',
      phone: '+5511955443322',
      balanceCents: 8745600,    // R$ 87.456,00
      accountNumber: '00045678',
      dailyLimitCents: 2000000, // R$ 20.000
      cardNumber: '5412750012348814',
      cardLast4: '8814',
      cardHolder: 'ROBERTO YUKIO TANAKA',
      cardExpiry: '09/28',
      cardLimitCents: 1500000,  // R$ 15.000
      cardUsedCents: 432100,
      pixKeys: [
        { type: 'cpf', value: '33445566778' },
        { type: 'email', value: 'roberto.tanaka@email.com' },
        { type: 'phone', value: '+5511955443322' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 2500000, description: 'Salário - Consultoria Tanaka', counterpart: 'Tanaka Consulting Ltda', daysAgo: 3 },
        { type: 'debit', category: 'pix', amount: 450000, description: 'Pix enviado - Parcela apartamento', counterpart: 'Construtora Viver Bem', daysAgo: 4 },
        { type: 'debit', category: 'boleto', amount: 120000, description: 'Colégio dos filhos - Mensalidade', counterpart: 'Colégio Objetivo', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 180000, description: 'Pix recebido - Cliente consultoria', counterpart: 'FarmaTech Ltda', daysAgo: 6 },
        { type: 'debit', category: 'pix', amount: 35000, description: 'Pix enviado - Restaurante japonês', counterpart: 'Sushi Kai', daysAgo: 8 },
        { type: 'debit', category: 'card_purchase', amount: 89000, description: 'Compra cartão - Decathlon', counterpart: 'Decathlon', daysAgo: 10 },
        { type: 'debit', category: 'boleto', amount: 65000, description: 'Plano de saúde - SulAmérica', counterpart: 'SulAmérica Saúde', daysAgo: 12 },
      ],
      purchases: [
        { desc: 'Decathlon - Equipamentos', merchant: 'Decathlon', category: 'Esportes', amount: 89000 },
        { desc: 'Wine.com - Vinhos', merchant: 'Wine', category: 'Bebidas', amount: 35600 },
        { desc: 'Apple Store - AirPods', merchant: 'Apple', category: 'Eletrônicos', amount: 189900 },
        { desc: 'Booking.com - Hotel', merchant: 'Booking', category: 'Viagem', amount: 67800 },
        { desc: 'iFood - Família', merchant: 'iFood', category: 'Alimentação', amount: 12500 },
        { desc: 'Disney+', merchant: 'Disney+', category: 'Streaming', amount: 3390 },
      ],
      notifications: [
        { title: 'Investimento disponível', body: 'Novo CDB com rentabilidade de 120% do CDI', type: 'system' },
        { title: 'Fatura alta', body: 'Sua fatura atual está em R$ 4.321,00', type: 'system' },
      ],
    },
    {
      name: 'Francisca das Chagas Lima',
      email: 'francisca.lima@email.com',
      cpf: '55667788990',
      phone: '+5585966554433',
      balanceCents: 189450,     // R$ 1.894,50
      accountNumber: '00056789',
      dailyLimitCents: 200000,  // R$ 2.000
      cardNumber: '4024007188533347',
      cardLast4: '3347',
      cardHolder: 'FRANCISCA DAS CHAGAS LIMA',
      cardExpiry: '01/27',
      cardLimitCents: 80000,    // R$ 800
      cardUsedCents: 45600,
      pixKeys: [
        { type: 'phone', value: '+5585966554433' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 141200, description: 'Aposentadoria - INSS', counterpart: 'INSS', daysAgo: 1 },
        { type: 'debit', category: 'boleto', amount: 18000, description: 'Conta de luz - Enel CE', counterpart: 'Enel Ceará', daysAgo: 4 },
        { type: 'debit', category: 'pix', amount: 25000, description: 'Pix enviado - Remédios neto', counterpart: 'Farmácia São João', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 10000, description: 'Pix recebido - Filho', counterpart: 'Antônio Lima Filho', daysAgo: 9 },
        { type: 'debit', category: 'pix', amount: 5500, description: 'Pix enviado - Feira', counterpart: 'Barraca do Zé', daysAgo: 10 },
      ],
      purchases: [
        { desc: 'Farmácia São João', merchant: 'Farmácia São João', category: 'Farmácia', amount: 15600 },
        { desc: 'Mercadinho do Bairro', merchant: 'Mercadinho Central', category: 'Supermercados', amount: 18900 },
        { desc: 'Padaria Pão Quente', merchant: 'Padaria Pão Quente', category: 'Alimentação', amount: 4500 },
        { desc: 'Recarga celular', merchant: 'Claro Recarga', category: 'Telefonia', amount: 2000 },
      ],
      notifications: [
        { title: 'Aposentadoria creditada', body: 'Depósito INSS de R$ 1.412,00 recebido', type: 'transaction' },
        { title: 'Dica de segurança', body: 'Nunca compartilhe sua senha ou código de verificação', type: 'security' },
      ],
    },
    {
      name: 'Lucas Gabriel Ndongo',
      email: 'lucas.ndongo@email.com',
      cpf: '22334455667',
      phone: '+5541944332211',
      balanceCents: 345890,     // R$ 3.458,90
      accountNumber: '00067890',
      dailyLimitCents: 500000,  // R$ 5.000
      cardNumber: '5168941237005590',
      cardLast4: '5590',
      cardHolder: 'LUCAS GABRIEL NDONGO',
      cardExpiry: '11/29',
      cardLimitCents: 250000,   // R$ 2.500
      cardUsedCents: 198700,
      pixKeys: [
        { type: 'email', value: 'lucas.ndongo@email.com' },
        { type: 'cpf', value: '22334455667' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 480000, description: 'Salário - Volvo do Brasil', counterpart: 'Volvo do Brasil Ltda', daysAgo: 2 },
        { type: 'debit', category: 'pix', amount: 180000, description: 'Pix enviado - Aluguel', counterpart: 'Marcelo Albuquerque', daysAgo: 3 },
        { type: 'debit', category: 'boleto', amount: 12000, description: 'Internet fibra - Copel Telecom', counterpart: 'Copel Telecom', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 22000, description: 'Pix recebido - Rateio churrasco', counterpart: 'Rafael Souza', daysAgo: 7 },
        { type: 'debit', category: 'pix', amount: 15000, description: 'Pix enviado - Ingresso show', counterpart: 'Eventim Brasil', daysAgo: 8 },
        { type: 'debit', category: 'card_purchase', amount: 35000, description: 'Compra cartão - Centauro', counterpart: 'Centauro Esportes', daysAgo: 12 },
      ],
      purchases: [
        { desc: 'Centauro - Tênis corrida', merchant: 'Centauro', category: 'Esportes', amount: 35000 },
        { desc: 'Spotify Premium Duo', merchant: 'Spotify', category: 'Streaming', amount: 2690 },
        { desc: 'Uber Eats - Marmita', merchant: 'Uber Eats', category: 'Alimentação', amount: 3200 },
        { desc: 'Amazon - Fone bluetooth', merchant: 'Amazon', category: 'Eletrônicos', amount: 15900 },
        { desc: 'Madero - Jantar', merchant: 'Madero', category: 'Restaurante', amount: 9800 },
      ],
      notifications: [
        { title: 'Cashback disponível', body: 'Você tem R$ 23,50 de cashback para resgatar', type: 'system' },
      ],
    },
    {
      name: 'Patrícia Werneck de Souza',
      email: 'patricia.werneck@email.com',
      cpf: '44556677889',
      phone: '+5548933221100',
      balanceCents: 2567800,    // R$ 25.678,00
      accountNumber: '00078901',
      dailyLimitCents: 1500000, // R$ 15.000
      cardNumber: '4556219083466178',
      cardLast4: '6178',
      cardHolder: 'PATRICIA WERNECK DE SOUZA',
      cardExpiry: '07/28',
      cardLimitCents: 800000,   // R$ 8.000
      cardUsedCents: 356000,
      pixKeys: [
        { type: 'cpf', value: '44556677889' },
        { type: 'email', value: 'patricia.werneck@email.com' },
        { type: 'phone', value: '+5548933221100' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 1200000, description: 'Salário - Tribunal de Justiça SC', counterpart: 'TJ-SC', daysAgo: 1 },
        { type: 'debit', category: 'pix', amount: 350000, description: 'Pix enviado - Financiamento imóvel', counterpart: 'Caixa Econômica', daysAgo: 2 },
        { type: 'debit', category: 'boleto', amount: 45000, description: 'Escola de inglês - Cultura Inglesa', counterpart: 'Cultura Inglesa', daysAgo: 4 },
        { type: 'credit', category: 'pix', amount: 80000, description: 'Pix recebido - Aula particular', counterpart: 'Fernanda Correia', daysAgo: 6 },
        { type: 'debit', category: 'pix', amount: 18000, description: 'Pix enviado - Veterinário', counterpart: 'PetVet Clínica', daysAgo: 9 },
        { type: 'debit', category: 'card_purchase', amount: 125000, description: 'Compra cartão - Zara', counterpart: 'Zara Brasil', daysAgo: 11 },
        { type: 'debit', category: 'boleto', amount: 28000, description: 'Seguro auto - Porto Seguro', counterpart: 'Porto Seguro', daysAgo: 14 },
      ],
      purchases: [
        { desc: 'Zara - Vestido e acessórios', merchant: 'Zara', category: 'Vestuário', amount: 125000 },
        { desc: 'Sephora - Maquiagem', merchant: 'Sephora', category: 'Beleza', amount: 45600 },
        { desc: 'Livraria Cultura', merchant: 'Livraria Cultura', category: 'Livros', amount: 18900 },
        { desc: 'Netflix', merchant: 'Netflix', category: 'Streaming', amount: 5590 },
        { desc: 'Outback - Jantar', merchant: 'Outback', category: 'Restaurante', amount: 23400 },
        { desc: 'PetShop Cobasi', merchant: 'Cobasi', category: 'Pet', amount: 8900 },
      ],
      notifications: [
        { title: 'Fatura parcial', body: 'Sua fatura já acumula R$ 3.560,00 este mês', type: 'system' },
        { title: 'Novo login detectado', body: 'Login realizado de novo dispositivo em Florianópolis', type: 'security' },
      ],
    },
    {
      name: 'Davi Henrique Ribeiro',
      email: 'davi.ribeiro@email.com',
      cpf: '66778899001',
      phone: '+5562922110099',
      balanceCents: 15670,      // R$ 156,70
      accountNumber: '00089012',
      dailyLimitCents: 100000,  // R$ 1.000
      cardNumber: '5321408765129921',
      cardLast4: '9921',
      cardHolder: 'DAVI HENRIQUE RIBEIRO',
      cardExpiry: '04/27',
      cardLimitCents: 50000,    // R$ 500
      cardUsedCents: 49800,
      pixKeys: [
        { type: 'phone', value: '+5562922110099' },
      ],
      transactions: [
        { type: 'credit', category: 'pix', amount: 35000, description: 'Pix recebido - Mesada mãe', counterpart: 'Rosângela Ribeiro', daysAgo: 1 },
        { type: 'debit', category: 'pix', amount: 5000, description: 'Pix enviado - Lanche faculdade', counterpart: 'Cantina UniGO', daysAgo: 2 },
        { type: 'debit', category: 'pix', amount: 12000, description: 'Pix enviado - Uber semana', counterpart: 'Uber', daysAgo: 4 },
        { type: 'credit', category: 'pix', amount: 8000, description: 'Pix recebido - Venda livro usado', counterpart: 'Marcos Teixeira', daysAgo: 6 },
        { type: 'debit', category: 'card_purchase', amount: 2990, description: 'Compra cartão - Game Pass', counterpart: 'Microsoft', daysAgo: 7 },
      ],
      purchases: [
        { desc: 'Xbox Game Pass', merchant: 'Microsoft', category: 'Jogos', amount: 2990 },
        { desc: 'Burger King', merchant: 'Burger King', category: 'Alimentação', amount: 3290 },
        { desc: 'Shopee - Capinha', merchant: 'Shopee', category: 'E-commerce', amount: 1990 },
        { desc: 'Kwai Shop - Fone', merchant: 'Kwai', category: 'E-commerce', amount: 4990 },
      ],
      notifications: [
        { title: 'Saldo baixo', body: 'Seu saldo está em R$ 156,70', type: 'system' },
        { title: 'Cartão quase no limite', body: 'Você usou 99% do limite do cartão', type: 'system' },
      ],
    },
    {
      name: 'Camila Ferreira Duarte',
      email: 'camila.duarte@email.com',
      cpf: '77889900112',
      phone: '+5571911009988',
      balanceCents: 678900,     // R$ 6.789,00
      accountNumber: '00090123',
      dailyLimitCents: 800000,  // R$ 8.000
      cardNumber: '4716839012452467',
      cardLast4: '2467',
      cardHolder: 'CAMILA FERREIRA DUARTE',
      cardExpiry: '10/28',
      cardLimitCents: 400000,   // R$ 4.000
      cardUsedCents: 215300,
      pixKeys: [
        { type: 'email', value: 'camila.duarte@email.com' },
        { type: 'phone', value: '+5571911009988' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 650000, description: 'Salário - Escola Municipal', counterpart: 'Prefeitura de Salvador', daysAgo: 3 },
        { type: 'debit', category: 'pix', amount: 150000, description: 'Pix enviado - Aluguel', counterpart: 'José Carlos Menezes', daysAgo: 4 },
        { type: 'debit', category: 'boleto', amount: 35000, description: 'Faculdade EAD - Unijorge', counterpart: 'Unijorge', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 45000, description: 'Pix recebido - Aulas particulares', counterpart: 'Diversos Alunos', daysAgo: 7 },
        { type: 'debit', category: 'pix', amount: 22000, description: 'Pix enviado - Material escolar filha', counterpart: 'Kalunga', daysAgo: 10 },
        { type: 'debit', category: 'boleto', amount: 9500, description: 'Conta celular - Tim', counterpart: 'Tim', daysAgo: 12 },
      ],
      purchases: [
        { desc: 'C&A - Roupas infantis', merchant: 'C&A', category: 'Vestuário', amount: 15800 },
        { desc: 'iFood - Delivery', merchant: 'iFood', category: 'Alimentação', amount: 8900 },
        { desc: 'Globoplay', merchant: 'Globoplay', category: 'Streaming', amount: 2490 },
        { desc: 'Magazine Luiza - Ventilador', merchant: 'Magalu', category: 'Eletrodomésticos', amount: 25900 },
        { desc: 'Natura - Produtos', merchant: 'Natura', category: 'Beleza', amount: 8700 },
      ],
      notifications: [
        { title: 'Pix recebido', body: 'Você recebeu R$ 450,00 de aulas particulares', type: 'transaction' },
        { title: 'Boleto pago', body: 'Faculdade Unijorge - R$ 350,00 pago com sucesso', type: 'transaction' },
      ],
    },
    {
      name: 'Mohammad Ali Khalil',
      email: 'mohammad.khalil@email.com',
      cpf: '88990011223',
      phone: '+5511944998877',
      balanceCents: 4523400,    // R$ 45.234,00
      accountNumber: '00001234',
      dailyLimitCents: 2000000, // R$ 20.000
      cardNumber: '5489720136583856',
      cardLast4: '3856',
      cardHolder: 'MOHAMMAD ALI KHALIL',
      cardExpiry: '08/29',
      cardLimitCents: 1200000,  // R$ 12.000
      cardUsedCents: 567800,
      pixKeys: [
        { type: 'cpf', value: '88990011223' },
        { type: 'email', value: 'mohammad.khalil@email.com' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 1800000, description: 'Receita - Importadora Khalil', counterpart: 'Khalil Importações Ltda', daysAgo: 1 },
        { type: 'debit', category: 'pix', amount: 500000, description: 'Pix enviado - Fornecedor China', counterpart: 'Global Trade Import', daysAgo: 2 },
        { type: 'debit', category: 'boleto', amount: 85000, description: 'Aluguel loja - Rua 25 de Março', counterpart: 'Imóveis Comerciais SP', daysAgo: 4 },
        { type: 'credit', category: 'pix', amount: 320000, description: 'Pix recebido - Venda mercadorias', counterpart: 'Loja do Brás', daysAgo: 5 },
        { type: 'debit', category: 'pix', amount: 45000, description: 'Pix enviado - Mesquita', counterpart: 'Sociedade Beneficente Islâmica', daysAgo: 8 },
        { type: 'debit', category: 'card_purchase', amount: 230000, description: 'Compra cartão - Passagem aérea', counterpart: 'LATAM Airlines', daysAgo: 10 },
        { type: 'debit', category: 'boleto', amount: 42000, description: 'Plano de saúde família - Bradesco Saúde', counterpart: 'Bradesco Saúde', daysAgo: 13 },
      ],
      purchases: [
        { desc: 'LATAM - São Paulo/Beirute', merchant: 'LATAM', category: 'Viagem', amount: 230000 },
        { desc: 'Restaurante Almanara', merchant: 'Almanara', category: 'Restaurante', amount: 18500 },
        { desc: 'Fast Shop - Notebook', merchant: 'Fast Shop', category: 'Eletrônicos', amount: 459900 },
        { desc: 'Waze Premium', merchant: 'Google', category: 'App', amount: 990 },
        { desc: 'Posto BR', merchant: 'Petrobras', category: 'Combustível', amount: 28000 },
      ],
      notifications: [
        { title: 'Transferência de alto valor', body: 'Pix de R$ 5.000,00 enviado para Global Trade Import', type: 'security' },
        { title: 'Receita creditada', body: 'R$ 18.000,00 recebidos de Khalil Importações', type: 'transaction' },
      ],
    },
    {
      name: 'Yuki Nakamura Prado',
      email: 'yuki.prado@email.com',
      cpf: '99001122334',
      phone: '+5547955887766',
      balanceCents: 1234500,    // R$ 12.345,00
      accountNumber: '00011234',
      dailyLimitCents: 1000000, // R$ 10.000
      cardNumber: '4929518063477703',
      cardLast4: '7703',
      cardHolder: 'YUKI NAKAMURA PRADO',
      cardExpiry: '05/28',
      cardLimitCents: 600000,   // R$ 6.000
      cardUsedCents: 289400,
      pixKeys: [
        { type: 'email', value: 'yuki.prado@email.com' },
        { type: 'random', value: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210' },
      ],
      transactions: [
        { type: 'credit', category: 'deposit', amount: 750000, description: 'Salário - Studio Ghibli BR', counterpart: 'Anima Produções Ltda', daysAgo: 2 },
        { type: 'debit', category: 'pix', amount: 200000, description: 'Pix enviado - Aluguel estúdio', counterpart: 'Coworking Blumenau', daysAgo: 3 },
        { type: 'debit', category: 'boleto', amount: 15000, description: 'Adobe Creative Cloud', counterpart: 'Adobe Systems', daysAgo: 5 },
        { type: 'credit', category: 'pix', amount: 120000, description: 'Pix recebido - Freelance ilustração', counterpart: 'Editora Intrínseca', daysAgo: 7 },
        { type: 'debit', category: 'pix', amount: 38000, description: 'Pix enviado - Material artístico', counterpart: 'Papelaria Artística', daysAgo: 9 },
        { type: 'debit', category: 'card_purchase', amount: 67000, description: 'Compra cartão - Wacom tablet', counterpart: 'KaBuM', daysAgo: 11 },
      ],
      purchases: [
        { desc: 'KaBuM - Wacom Intuos', merchant: 'KaBuM', category: 'Eletrônicos', amount: 67000 },
        { desc: 'Crunchyroll Premium', merchant: 'Crunchyroll', category: 'Streaming', amount: 1490 },
        { desc: 'Livraria da Vila - Mangás', merchant: 'Livraria da Vila', category: 'Livros', amount: 12900 },
        { desc: 'Starbucks Reserve', merchant: 'Starbucks', category: 'Cafeteria', amount: 4500 },
        { desc: 'Hering - Moda', merchant: 'Hering', category: 'Vestuário', amount: 8900 },
        { desc: 'Domestika - Curso online', merchant: 'Domestika', category: 'Educação', amount: 3990 },
      ],
      notifications: [
        { title: 'Freelance creditado', body: 'R$ 1.200,00 recebidos de Editora Intrínseca', type: 'transaction' },
        { title: 'Assinatura renovada', body: 'Adobe Creative Cloud renovado automaticamente', type: 'system' },
      ],
    },
  ]

  // Insert all additional users
  for (const u of additionalUsers) {
    const uId = uuidv4()
    const aId = uuidv4()

    db.prepare(`
      INSERT INTO users (id, name, email, cpf, password_hash, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(uId, u.name, u.email, u.cpf, passwordHash, u.phone)

    db.prepare(`
      INSERT INTO accounts (id, user_id, agency, number, balance_cents, daily_transfer_limit_cents, daily_transferred_cents)
      VALUES (?, ?, '0001', ?, ?, ?, 0)
    `).run(aId, uId, u.accountNumber, u.balanceCents, u.dailyLimitCents)

    // Pix keys
    for (const pk of u.pixKeys) {
      db.prepare(`
        INSERT INTO pix_keys (id, user_id, account_id, key_type, key_value, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), uId, aId, pk.type, pk.value)
    }

    // Card
    const cId = uuidv4()
    db.prepare(`
      INSERT INTO cards (id, user_id, account_id, type, card_number, last4, card_holder, card_expiry, limit_cents, used_cents, due_day, is_active)
      VALUES (?, ?, ?, 'virtual', ?, ?, ?, ?, ?, ?, 10, 1)
    `).run(cId, uId, aId, u.cardNumber, u.cardLast4, u.cardHolder, u.cardExpiry, u.cardLimitCents, u.cardUsedCents)

    // Invoice
    const invId = uuidv4()
    db.prepare(`
      INSERT INTO invoices (id, card_id, reference_month, total_cents, due_date, status)
      VALUES (?, ?, '2024-03', ?, '2024-03-10', 'open')
    `).run(invId, cId, u.cardUsedCents)

    // Purchases
    for (const p of u.purchases) {
      db.prepare(`
        INSERT INTO card_purchases (id, card_id, invoice_id, description, merchant_name, merchant_category, amount_cents, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
      `).run(uuidv4(), cId, invId, p.desc, p.merchant, p.category, p.amount)
    }

    // Transactions
    let bal = u.balanceCents
    for (const tx of u.transactions) {
      const txDate = new Date(now)
      txDate.setDate(txDate.getDate() - tx.daysAgo)

      db.prepare(`
        INSERT INTO transactions (id, account_id, type, category, amount_cents, balance_after_cents, description, counterpart_name, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        uuidv4(), aId, tx.type, tx.category,
        tx.amount, bal,
        tx.description, tx.counterpart,
        txDate.toISOString()
      )

      if (tx.type === 'credit') bal -= tx.amount
      else bal += tx.amount
    }

    // Notifications
    for (const n of u.notifications) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, body, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), uId, n.title, n.body, n.type)
    }
  }

  // ============================================================
  // Service Account — ECP Pay Platform (role: system)
  // ============================================================
  const svcUserId = uuidv4()
  const svcAccountId = uuidv4()
  const svcPasswordHash = await bcrypt.hash('EcpPay@Platform#2026', 12)

  db.prepare(`
    INSERT INTO users (id, name, email, cpf, password_hash, phone, is_active, role)
    VALUES (?, ?, ?, ?, ?, NULL, 1, 'system')
  `).run(svcUserId, 'ECP Pay Platform', 'platform@ecpay.dev', '00000000000', svcPasswordHash)

  db.prepare(`
    INSERT INTO accounts (id, user_id, agency, number, balance_cents, daily_transfer_limit_cents, daily_transferred_cents)
    VALUES (?, ?, '0001', ?, 0, 0, 0)
  `).run(svcAccountId, svcUserId, '00099999')

  console.log('[seed] Database seeded successfully.')
  console.log('[seed] 12 users created (Marina + 10 additional + 1 service account)')
  console.log('[seed] Consumer users login with password: Senha@123')
  console.log('[seed] Service account login: platform@ecpay.dev / EcpPay@Platform#2026 (role: system)')
  console.log('[seed] Logins:')
  console.log('  marina@email.com')
  console.log('  carlos.mendes@email.com')
  console.log('  aisha.santos@email.com')
  console.log('  roberto.tanaka@email.com')
  console.log('  francisca.lima@email.com')
  console.log('  lucas.ndongo@email.com')
  console.log('  patricia.werneck@email.com')
  console.log('  davi.ribeiro@email.com')
  console.log('  camila.duarte@email.com')
  console.log('  mohammad.khalil@email.com')
  console.log('  yuki.prado@email.com')
  console.log('  platform@ecpay.dev (system)')
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed] Error:', err)
  process.exit(1)
})
