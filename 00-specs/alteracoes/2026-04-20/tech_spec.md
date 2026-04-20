# ecp digital bank — Especificação Técnica

> **Versão:** 4.0 (as-built)
> **Data:** 20/04/2026
> **Status:** Implementado — reflete o estado atual do código em `03-product-delivery/app/`

---

## 1. Stack Tecnológica — v4.0

A v4.0 documenta o que está **efetivamente rodando** no projeto. Em relação à v3.0 especificada, a stack de base foi preservada (Fastify + SQLite + React + Vite), mas algumas versões foram consolidadas em cima da **realidade do `package.json`** e uma integração externa (ECP Pay) + um módulo de chat multi-agente com Anthropic SDK foram adicionados.

O princípio continua sendo: **`npm run dev` na raiz liga tudo** — API Fastify (3333) + front Vite (5173) simultaneamente via `concurrently`.

### 1.1. Ambiente de Desenvolvimento — Windows 11

As regras do ambiente Windows da v3.0 continuam valendo integralmente:

| Requisito | Motivo |
|-----------|--------|
| **Node.js 18+ (LTS)** | Runtime do projeto (via nvm-windows) |
| **Python 3.12+** | `node-gyp` para compilar `better-sqlite3` |
| **Visual Studio Build Tools 2022** (workload "Desktop development with C++") | Compilador C++ nativo |
| **Git for Windows** com `Checkout as-is, commit Unix-style line endings` | Line endings consistentes |

Configurações recomendadas:
- `npm config set msvs_version 2022`
- `npm config set python python3`
- Habilitar `LongPathsEnabled` no registro do Windows
- `.gitattributes` forçando LF em todos os arquivos de texto
- `script-shell=cmd.exe` no `.npmrc`

### 1.2. Comparativo v3.0 (planejado) → v4.0 (implementado)

| Aspecto | v3.0 (spec) | v4.0 (código) |
|---------|-------------|---------------|
| Fastify | 5.0 | **4.29.1** (`server/package.json:23`) |
| better-sqlite3 | — | **11.0.0** no server + **12.6.2** na raiz (`package.json:22`) |
| JWT | Implementação própria | **@fastify/jwt 8.0.1** |
| CORS | — | **@fastify/cors 8.5.0** |
| React | 18.3 | **18.3.1** (`web/package.json:17`) |
| React Router | 6.26 | **6.26.0** |
| Vite | 5.4 | **5.4.0** |
| Tailwind | 3.4 | **3.4.4** |
| Lucide React | — | **0.400.0** |
| TypeScript (server) | 5.5 | **5.5.3** |
| tsx | 4.19 | **4.9.3** |
| Zod | 3.23 | **3.23.8** |
| bcryptjs | 12 custo | **2.4.3** |
| **NOVO** | — | **@anthropic-ai/sdk 0.80.0** (chat multi-agente) |
| **NOVO** | — | **dotenv 17.3.1** (configuração local) |
| **NOVO** | — | **uuid 9.0.1** + `crypto.randomUUID` (IDs) |
| Test runner | Vitest | Server: **Jest** (`node --experimental-vm-modules`) · Web: **Vitest 1.6.0** |
| Módulos extras além da v3.0 | — | `chat`, `dashboard`, `notifications` |

### 1.3. Back-end (API Fastify)

Servidor rodando em `http://localhost:3333/`. Entry point em `server/src/server.ts:1`, configuração em `server/src/app.ts:21`.

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.5.3 | Linguagem base |
| **Fastify** | 4.29.1 | Servidor web + plugin system |
| **@fastify/jwt** | 8.0.1 | Emissão e verificação de JWT |
| **@fastify/cors** | 8.5.0 | CORS (origem `http://localhost:5173` por padrão) |
| **Zod** | 3.23.8 | Validação de input (`*.schema.ts`) e tipos derivados via `z.infer<>` |
| **better-sqlite3** | 11.0.0 | Driver SQLite síncrono (WAL mode, foreign keys on) |
| **bcryptjs** | 2.4.3 | Hash de senhas (custo 12) |
| **uuid** | 9.0.1 | IDs v4 para todas as entidades |
| **dotenv** | 17.3.1 | Carregamento de `.env` em `server.ts:1` |
| **@anthropic-ai/sdk** | 0.80.0 | Cliente Claude para chatbot multi-agente |
| **tsx** | 4.9.3 | Watch mode em desenvolvimento |

#### ESM em todo o back-end

O `server/package.json:5` declara `"type": "module"`. Consequência prática: **todos os imports usam extensão `.js` explícita** mesmo em arquivos `.ts` (ex.: `import { authRoutes } from './modules/auth/auth.routes.js'` em `app.ts:10`). Isso é obrigatório para o Node.js ESM.

#### Estrutura de Pastas (estado atual)

```
server/
├── src/
│   ├── app.ts                     # Configuração Fastify + registro de plugins/rotas
│   ├── server.ts                  # Entry point (porta 3333, host 0.0.0.0)
│   ├── database/
│   │   ├── connection.ts          # Singleton better-sqlite3 + pragmas
│   │   ├── seed.ts                # 11 usuários consumer + 1 service account
│   │   └── migrations/
│   │       ├── 001-initial.sql    # Schema base (10 tabelas)
│   │       ├── 002-chat.sql       # chat_conversations, chat_messages, knowledge_base
│   │       ├── 003-ecp-pay-integration.sql  # transactions.metadata
│   │       ├── 004-user-roles.sql # users.role
│   │       └── run.ts             # Runner de migrations
│   ├── modules/                   # 10 módulos de domínio
│   │   ├── auth/        (register, login, me)
│   │   ├── accounts/    (me, balance, limit)
│   │   ├── pix/         (keys, transfer, qrcode, lookup, debit-by-cpf)
│   │   ├── transactions/(list, detail)
│   │   ├── cards/       (CRUD, block, invoice, purchase, purchase-by-number)
│   │   ├── payments/    (boleto, scheduled)
│   │   ├── users/       (me, change-password)
│   │   ├── notifications/(list, unread-count, read, read-all)
│   │   ├── dashboard/   (agregador)
│   │   └── chat/        (multi-agente Anthropic)
│   │       ├── chat.routes.ts
│   │       ├── chat.schema.ts
│   │       ├── chat.service.ts
│   │       └── agents/
│   │           ├── orchestrator.ts
│   │           ├── knowledge.ts
│   │           ├── rules.ts
│   │           ├── transaction.ts
│   │           ├── prompts/       (4 system prompts)
│   │           └── tools/         (6 tools de ação)
│   ├── services/
│   │   └── ecp-pay-client.ts      # Cliente HTTP para a plataforma ECP Pay
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── error-codes.ts     # Enum ErrorCode (45+ códigos)
│   │   ├── middleware/
│   │   │   ├── auth.ts            # authenticate (jwtVerify + populates request.currentUser)
│   │   │   └── error-handler.ts
│   │   └── utils/
│   │       ├── money.ts
│   │       └── uuid.ts
│   └── types/                     # Augmentation do FastifyRequest.currentUser
├── tsconfig.json
├── database.sqlite                # Arquivo gerado (+ .sqlite-wal + .sqlite-shm)
└── package.json
```

#### Padrão de Módulo (três arquivos)

Cada módulo de domínio segue:

- **`*.schema.ts`** — Schemas Zod de input/output. Tipos via `z.infer<>`.
- **`*.routes.ts`** — Registra rotas Fastify com `preHandler: [authenticate]` quando aplicável; parse com `.parse(request.body)`.
- **`*.service.ts`** — Lógica de negócio, queries SQL diretas via `getDb()`. Usa `db.transaction(() => {...})()` para operações atômicas. Lança `AppError` via factory `Errors.*`.

#### Registro de Rotas (todas prefixadas `/api`)

```typescript
// server/src/app.ts:48
await app.register(authRoutes,          { prefix: '/api/auth' })
await app.register(accountsRoutes,      { prefix: '/api/accounts' })
await app.register(pixRoutes,           { prefix: '/api/pix' })
await app.register(transactionsRoutes,  { prefix: '/api/transactions' })
await app.register(cardsRoutes,         { prefix: '/api/cards' })
await app.register(paymentsRoutes,      { prefix: '/api/payments' })
await app.register(usersRoutes,         { prefix: '/api/users' })
await app.register(notificationsRoutes, { prefix: '/api/notifications' })
await app.register(dashboardRoutes,     { prefix: '/api/dashboard' })
await app.register(chatRoutes,          { prefix: '/api/chat' })

// Health
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
```

### 1.4. Front-end (React SPA)

Roda em `http://localhost:5173/`. Entry point `web/src/main.tsx`, rotas em `web/src/App.tsx`.

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.5.3 | Linguagem base |
| **React** | 18.3.1 | UI com componentes funcionais + hooks |
| **React DOM** | 18.3.1 | Renderização |
| **React Router DOM** | 6.26.0 | SPA routing (`BrowserRouter`, `Navigate`, `NavLink`) |
| **Tailwind CSS** | 3.4.4 | Estilização utility-first (config em `tailwind.config.ts`) |
| **Lucide React** | 0.400.0 | Ícones SVG (Bell, Zap, CreditCard, MessageCircle, etc.) |
| **Vite** | 5.4.0 | Dev server + build |
| **Vitest** | 1.6.0 | Test runner com `jsdom` |
| **PostCSS + Autoprefixer** | 8.4.38 / 10.4.19 | Pipeline CSS |

#### Vite com proxy para `/api`

Em dev, o Vite faz proxy de qualquer request a `/api/*` para `http://localhost:3333`, evitando CORS (`web/vite.config.ts:18`):

```typescript
server: {
  port: 5173,
  strictPort: true,
  proxy: {
    '/api': { target: 'http://localhost:3333', changeOrigin: true },
  },
}
```

#### Estrutura de Pastas (estado atual)

```
web/
├── src/
│   ├── main.tsx                  # createRoot + <App />
│   ├── App.tsx                   # BrowserRouter + Routes + ProtectedLayout/PublicLayout
│   ├── vite-env.d.ts
│   ├── routes/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── dashboard.tsx         # Home agregadora (GET /api/dashboard)
│   │   ├── extrato.tsx
│   │   ├── pix/
│   │   │   ├── enviar.tsx        # Wizard 4 passos
│   │   │   ├── receber.tsx       # QR Code via ECP Pay
│   │   │   └── chaves.tsx
│   │   ├── cartoes.tsx
│   │   ├── pagamentos.tsx
│   │   ├── chat.tsx              # Página dedicada do assistente IA
│   │   ├── perfil.tsx
│   │   └── index.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # Menu lateral (lg+ breakpoint) com submenu Pix
│   │   │   ├── Header.tsx        # Saudação + ProfileSwitcher + dropdown de notificações
│   │   │   ├── MobileNav.tsx     # Bottom tab mobile
│   │   │   └── ProfileSwitcher.tsx
│   │   ├── ui/                   # Biblioteca de componentes próprios
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx          # Variants: default | highlighted
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Badge.tsx
│   │   └── chat/
│   │       ├── ChatWidget.tsx    # Botão flutuante global
│   │       ├── ChatMessages.tsx
│   │       ├── ChatInput.tsx
│   │       └── ChatBubble.tsx
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth state + login/register/logout + auto-validate
│   │   ├── useChat.ts            # State do assistente IA
│   │   └── useIdleTimeout.ts     # Logout por inatividade
│   ├── services/
│   │   └── api.ts                # fetch wrapper com ApiError + Bearer automático
│   ├── lib/
│   │   └── formatters.ts         # formatCurrency (cents → BRL), formatDate, formatRelativeTime
│   ├── styles/
│   │   └── globals.css           # CSS vars do tema + @tailwind directives
│   └── test/
├── index.html
├── tailwind.config.ts            # Paleta dark completa
├── vite.config.ts
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

### 1.5. Scripts de Desenvolvimento (raiz)

Do `package.json` raiz (`app/package.json:5`):

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:web\"",
    "dev:server": "npm --prefix server run dev",
    "dev:web": "npm --prefix web run dev",
    "build": "npm --prefix server run build && npm --prefix web run build",
    "db:migrate": "npm --prefix server run db:migrate",
    "db:seed": "npm --prefix server run db:seed",
    "test": "npm --prefix server run test && npm --prefix web run test",
    "install:all": "npm install && npm --prefix server install && npm --prefix web install"
  }
}
```

Observação: em relação à v3.0, o script **não usa `--kill-others`** — documente como melhoria no backlog caso o comportamento de processos órfãos no Windows apareça.

### 1.6. Variáveis de Ambiente

| Nome | Default | Uso |
|------|---------|-----|
| `PORT` | `3333` | Porta da API |
| `HOST` | `0.0.0.0` | Bind da API |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem permitida |
| `JWT_SECRET` | `ecp-digital-bank-dev-secret` | Base do segredo JWT (concatenado com suffix randômico por restart) |
| `LOG_LEVEL` | `info` | Nível de log do Fastify |
| `DATABASE_PATH` | `server/database.sqlite` | Arquivo SQLite |
| `ECP_PAY_URL` | `http://localhost:3335` | Base URL da ECP Pay |
| `ECP_PAY_API_KEY` | `ecp-bank-dev-key` | API Key da ECP Pay |
| `ANTHROPIC_API_KEY` | (obrigatório em prod) | SDK Anthropic |
| `AI_MODEL` | `claude-sonnet-4-20250514` | Modelo Claude usado no orchestrator |
| `VITE_API_URL` | `''` (usa proxy) | Base URL da API para o front |

---

## 2. Regras Invioláveis de Código

1. **TypeScript strict sempre** — `"strict": true` em ambos os `tsconfig.json`.
2. **Schemas Zod são a fonte de verdade** — tipos derivados via `z.infer<>` (ex.: `type PixTransferInput = z.infer<typeof PixTransferSchema>`).
3. **Dinheiro sempre em centavos** — todo valor monetário é `integer` representando centavos. O front-end converte via `formatCurrency(cents)`.
4. **IDs são UUID v4** — via `uuid` ou `crypto.randomUUID()`. Nunca auto-increment.
5. **Erros padronizados** — sempre via `AppError` com `ErrorCode` (`shared/errors/error-codes.ts:1`). Factories em `Errors.*`.
6. **Soft delete em entidades críticas** — `pix_keys` usam `is_active = 0` + `deleted_at`. Users/accounts usam `is_active`.
7. **Logs estruturados do Fastify** — usar `request.log` / `app.log`. `console.log` apenas em integrações externas (`[ecp-pay] ...`).
8. **Secrets apenas em `.env`** — nunca commitar. `dotenv/config` carregado em `server.ts:1`.
9. **Validação na borda** — todo body é validado com `Schema.parse(request.body)` antes de tocar o service.
10. **Transações para operações compostas** — `db.transaction(() => { ... })()` do better-sqlite3.
11. **Imports com case exato** — Windows é case-insensitive, Linux não. Importar sempre com o case do arquivo.
12. **Caminhos com `path.join()` / `path.resolve()`** — nunca concatenar strings.
13. **Sem dependências nativas além de `better-sqlite3` e `bcryptjs`** (este último é pure-JS por escolha).
14. **ESM com extensão `.js` nos imports** — obrigatório no server devido a `"type": "module"`.
15. **Idempotência em integrações externas** — o cliente da ECP Pay envia `X-Idempotency-Key` em todo POST/PATCH/DELETE (`ecp-pay-client.ts:8`).
16. **Separação de roles** — endpoints internos (`/pix/debit-by-cpf`, `/cards/purchase-by-number`) validam `request.currentUser.role === 'system'` explicitamente.

---

## 3. Modelo de Dados (SQLite)

### 3.1. Tabelas (de `migrations/001-initial.sql`, `002-chat.sql`, `003-ecp-pay-integration.sql`, `004-user-roles.sql`)

```sql
-- users (+ role adicionado em 004)
CREATE TABLE users (
  id            TEXT PRIMARY KEY,          -- UUID v4
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  cpf           TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- bcrypt custo 12
  phone         TEXT,
  avatar_url    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  role          TEXT NOT NULL DEFAULT 'consumer',  -- consumer | system
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id                         TEXT PRIMARY KEY,
  user_id                    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agency                     TEXT NOT NULL DEFAULT '0001',
  number                     TEXT NOT NULL UNIQUE,
  balance_cents              INTEGER NOT NULL DEFAULT 0,
  daily_transfer_limit_cents INTEGER NOT NULL DEFAULT 500000,   -- R$ 5.000
  daily_transferred_cents    INTEGER NOT NULL DEFAULT 0,
  last_transfer_date         TEXT,
  is_active                  INTEGER NOT NULL DEFAULT 1,
  created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pix_keys (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key_type    TEXT NOT NULL CHECK (key_type IN ('cpf','email','phone','random')),
  key_value   TEXT NOT NULL UNIQUE,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

CREATE TABLE transactions (
  id                     TEXT PRIMARY KEY,
  account_id             TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL CHECK (type IN ('credit','debit')),
  category               TEXT NOT NULL CHECK (category IN ('pix','boleto','card_purchase','transfer','deposit','withdrawal','refund','fee')),
  amount_cents           INTEGER NOT NULL,
  balance_after_cents    INTEGER NOT NULL,
  description            TEXT NOT NULL,
  counterpart_name       TEXT,
  counterpart_document   TEXT,
  counterpart_institution TEXT,
  pix_key                TEXT,
  pix_key_type           TEXT,
  boleto_code            TEXT,
  status                 TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  scheduled_for          TEXT,
  metadata               TEXT,              -- JSON (ex.: { ecp_pay_tx_id: '...' })
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cards (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'virtual' CHECK (type IN ('physical','virtual')),
  card_number   TEXT NOT NULL DEFAULT '',
  last4         TEXT NOT NULL,
  card_holder   TEXT NOT NULL DEFAULT '',
  card_expiry   TEXT NOT NULL DEFAULT '12/28',
  limit_cents   INTEGER NOT NULL DEFAULT 300000,
  used_cents    INTEGER NOT NULL DEFAULT 0,
  due_day       INTEGER NOT NULL DEFAULT 10,
  is_active     INTEGER NOT NULL DEFAULT 1,
  is_blocked    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE invoices (
  id               TEXT PRIMARY KEY,
  card_id          TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  reference_month  TEXT NOT NULL,              -- "2026-04"
  total_cents      INTEGER NOT NULL DEFAULT 0,
  due_date         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid','overdue')),
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE card_purchases (
  id                  TEXT PRIMARY KEY,
  card_id             TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  invoice_id          TEXT REFERENCES invoices(id),
  description         TEXT NOT NULL,
  merchant_name       TEXT NOT NULL,
  merchant_category   TEXT,
  amount_cents        INTEGER NOT NULL,
  installments        INTEGER NOT NULL DEFAULT 1,
  current_installment INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled','refunded')),
  purchased_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('transaction','security','marketing','system')),
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pix_rate_limit (
  id             TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  window_start   TEXT NOT NULL,
  transfer_count INTEGER NOT NULL DEFAULT 0
);

-- Chat multi-agente
CREATE TABLE chat_conversations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  agent           TEXT CHECK (agent IN ('orchestrator','knowledge','rules','transaction')),
  intent          TEXT,                       -- FAQ:NAVIGATION, RULES:PIX_LIMITS, TRANSACTION:PIX_SEND, etc.
  tool_calls      TEXT,                       -- JSON
  metadata        TEXT,                       -- JSON
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE knowledge_base (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  source      TEXT NOT NULL,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2. Índices

De `001-initial.sql:133` e `002-chat.sql:35`:

```sql
CREATE INDEX idx_accounts_user_id           ON accounts(user_id);
CREATE INDEX idx_pix_keys_user_id           ON pix_keys(user_id);
CREATE INDEX idx_pix_keys_key_value         ON pix_keys(key_value);
CREATE INDEX idx_transactions_account_id    ON transactions(account_id);
CREATE INDEX idx_transactions_created_at    ON transactions(created_at);
CREATE INDEX idx_transactions_category      ON transactions(category);
CREATE INDEX idx_cards_user_id              ON cards(user_id);
CREATE INDEX idx_cards_account_id           ON cards(account_id);
CREATE INDEX idx_invoices_card_id           ON invoices(card_id);
CREATE INDEX idx_card_purchases_card_id     ON card_purchases(card_id);
CREATE INDEX idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX idx_pix_rate_limit_account_id  ON pix_rate_limit(account_id);
CREATE INDEX idx_chat_conv_user_id          ON chat_conversations(user_id);
CREATE INDEX idx_chat_conv_updated_at       ON chat_conversations(updated_at);
CREATE INDEX idx_chat_msg_conv_id           ON chat_messages(conversation_id);
CREATE INDEX idx_chat_msg_created_at        ON chat_messages(created_at);
CREATE INDEX idx_knowledge_base_source      ON knowledge_base(source);
```

### 3.3. Conexão SQLite

`server/src/database/connection.ts:1` — singleton com `better-sqlite3`, WAL mode (`journal_mode = WAL`) e foreign keys ligadas.

---

## 4. Contratos da API (Rotas REST)

Base URL: `http://localhost:3333` — **todas as rotas funcionais têm prefixo `/api`**.

### 4.1. Auth (`/api/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/register` | não | `{ name, email, cpf, password, phone? }` → `{ token, user }` |
| POST | `/login` | não | `{ email, password }` → `{ token, user }` |
| GET | `/me` | sim | Dados do usuário autenticado |

### 4.2. Accounts (`/api/accounts`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/me` | Dados da conta |
| GET | `/me/balance` | Saldo atual |
| PATCH | `/me/limit` | Atualizar limite diário Pix |

### 4.3. Pix (`/api/pix`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/keys` | Listar chaves ativas |
| POST | `/keys` | Criar chave (`cpf`/`email`/`phone`/`random`) |
| DELETE | `/keys/:keyId` | Soft delete da chave |
| POST | `/transfer` | Enviar Pix (valida RN-01 a RN-05, RN-10, RN-11) |
| GET | `/lookup?key=` | Descobrir titular antes de confirmar envio |
| POST | `/qrcode` | Criar cobrança Pix via ECP Pay |
| POST | `/debit-by-cpf` | **(role `system`)** Debitar conta por CPF/e-mail para ECP Pay |

### 4.4. Transactions (`/api/transactions`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Listar com filtros (tipo, categoria, data, busca) |
| GET | `/:id` | Detalhe |

### 4.5. Cards (`/api/cards`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Listar cartões |
| GET | `/:id` | Detalhe |
| PATCH | `/:id/limit` | Atualizar limite (máx R$ 20.000,00) |
| PATCH | `/:id/block` | Bloquear/desbloquear |
| GET | `/:id/invoice` | Fatura aberta atual |
| POST | `/:id/purchase` | Registrar compra |
| POST | `/purchase-by-number` | **(role `system`)** Compra por número do cartão |

### 4.6. Payments (`/api/payments`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/boleto` | Pagar/agendar boleto via ECP Pay |
| GET | `/scheduled` | Listar pagamentos agendados |
| DELETE | `/scheduled/:id` | Cancelar agendamento |

### 4.7. Users (`/api/users`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/me` | Perfil completo |
| PATCH | `/me` | Atualizar dados |
| POST | `/me/change-password` | Trocar senha |

### 4.8. Notifications (`/api/notifications`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Listar paginado |
| GET | `/unread-count` | Contagem de não lidas |
| PATCH | `/:id/read` | Marcar uma como lida |
| POST | `/read-all` | Marcar todas como lidas |

### 4.9. Dashboard (`/api/dashboard`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Agregador home (saldo + spending + card + recent + unread) |

### 4.10. Chat (`/api/chat`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/messages` | Enviar mensagem (cria conversation se não houver `conversationId`) |
| GET | `/conversations` | Listar conversas ativas (cursor-based) |
| POST | `/conversations` | Criar conversa vazia |
| GET | `/conversations/:id/messages` | Histórico de mensagens |
| PATCH | `/conversations/:id/archive` | Arquivar conversa |

### 4.11. Health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | `{ status: 'ok', timestamp }` — sem prefixo `/api` |

---

## 5. Arquitetura do Chatbot Multi-Agente

A maior novidade da v4.0. Implementado em `server/src/modules/chat/`.

### 5.1. Pipeline de uma mensagem

1. **`POST /api/chat/messages`** com `{ message, conversationId? }`.
2. `ChatService.sendMessage` cria/recupera a conversa e persiste a mensagem do usuário.
3. **Orchestrator** (`agents/orchestrator.ts`) chama Claude Sonnet 4 com `ORCHESTRATOR_SYSTEM_PROMPT` + últimas 6 mensagens para classificar em um dos intents do enum `chatIntentEnum` (15 valores).
4. Roteamento por prefixo:
   - `FAQ:*` → **Knowledge agent**
   - `RULES:*` → **Rules agent**
   - `TRANSACTION:*` → **Transaction agent**
   - `GENERAL:*` → resposta direta do orchestrator (saudação ou out-of-scope)
5. O agente especialista roda com seu próprio system prompt e pode usar **tools** (`agents/tools/`):
   - `getBalance` — consulta saldo
   - `getStatement` — últimas transações
   - `pixTransfer` — inicia transferência Pix
   - `cardCreate` — cria cartão virtual
   - `cardBlock` — bloqueia cartão
   - `kycStatus` — status da verificação
6. Resposta + `agent`, `intent` e `tool_calls` são persistidos em `chat_messages`.

### 5.2. Tratamento de erro do orchestrator

Se o parse do JSON falhar ou o Anthropic SDK lançar, fallback para `{ intent: 'GENERAL:OUT_OF_SCOPE', agent: 'orchestrator' }` (`orchestrator.ts:64, 77`).

### 5.3. Sanitização de JSON no histórico

`chat.service.ts:29` remove control characters (`\x00-\x1F\x7F`) antes de `JSON.parse` em `tool_calls` / `metadata` para evitar crashes em histórico com caracteres inválidos.

---

## 6. Integrações Externas

### 6.1. ECP Pay Platform

Cliente HTTP simples em `server/src/services/ecp-pay-client.ts:1`.

| Operação | Método do cliente | Endpoint ECP Pay |
|----------|------------------|------------------|
| Criar cobrança Pix | `createPixCharge(amount, customerName, customerDocument, description?)` | `POST /pay/pix` |
| Criar boleto | `createBoletoCharge(amount, customerName, customerDocument, dueDate, description?)` | `POST /pay/boleto` |
| Cobrança cartão | `createCardCharge(amount, customer, card?, installments?)` | `POST /pay/card` |
| Consultar transação | `getTransaction(transactionId)` | `GET /pay/transactions/:id` |
| Reembolso | `refund(transactionId, amount?)` | `POST /pay/transactions/:id/refund` |

Headers obrigatórios:

- `X-API-Key: ${ECP_PAY_API_KEY}`
- `X-Source-App: ecp-bank`
- `X-Idempotency-Key: <uuid v4>` em todo `POST/PATCH/DELETE`

Logs estruturados em `[ecp-pay] ${method} ${path} | app=ecp-bank | idempotency=... | OK ${status} em ${elapsed}ms | transaction_id=...` (`ecp-pay-client.ts:19, 38`).

### 6.2. Anthropic Claude

Via `@anthropic-ai/sdk 0.80.0`. Modelo default `claude-sonnet-4-20250514`, override via `process.env.AI_MODEL`. O SDK resolve `ANTHROPIC_API_KEY` do ambiente automaticamente.

---

## 7. Segurança e Compliance

- **Senhas** com bcryptjs custo 12 (`auth.service.ts:38`).
- **JWT** via `@fastify/jwt` com `expiresIn: '7d'`; segredo recebe suffix randômico a cada restart (**todos os tokens anteriores são invalidados quando o servidor reinicia** — `app.ts:7, 36`).
- **Role-based access** em endpoints `/pix/debit-by-cpf` e `/cards/purchase-by-number` (apenas `role === 'system'`).
- **Idle timeout** no front-end via `useIdleTimeout` (logout automático).
- **CORS** restrito à origem do front-end.
- **Rate limit de Pix** de 5 transferências por janela de 5 minutos (`pix.service.ts:12–13, 243`).
- **Idempotência em integrações externas** via `X-Idempotency-Key`.
- **LGPD**: dados de chaves Pix de terceiros são retornados apenas no `lookup`; `counterpart_document` não é exposto no extrato.
- **Valores monetários sempre como `integer`**, eliminando erros de float.

---

## 8. Scripts

| Comando | Onde | O que faz |
|---------|------|-----------|
| `npm run dev` | raiz | Liga API (3333) + Front (5173) via concurrently |
| `npm run dev:server` | raiz ou `server/` | Fastify com `tsx watch` |
| `npm run dev:web` | raiz ou `web/` | Vite dev server |
| `npm run build` | raiz | Build server (`tsc`) + web (`vite build`) |
| `npm run db:migrate` | raiz | `tsx src/database/migrations/run.ts` |
| `npm run db:seed` | raiz | Popula 11 users consumer + 1 service account |
| `npm run test` | raiz | Jest (server) + Vitest (web) |
| `npm run install:all` | raiz | Instala raiz + server + web |

---

## 9. Decisões Técnicas e Restrições Atuais

- **Monorepo sem workspaces**: cada pasta (`server/`, `web/`) tem seu próprio `package.json`, e a raiz orquestra via `npm --prefix`.
- **Sem ORM**: queries SQL diretas via `better-sqlite3` (síncrono, rápido). Preserva simplicidade.
- **Sem SSR**: SPA pura. SEO não é relevante para painel autenticado.
- **Sem webhooks assíncronos internos**: a propagação de `Pix recebido via QR` depende da ECP Pay chamar `/api/pix/debit-by-cpf` no bank. O credit final do QR Code para o dono da cobrança ainda exige polling/integração futura.
- **Jest no server, Vitest no web**: histórico; não há razão forte para consolidar.
- **`concurrently` sem `--kill-others`**: pode deixar processos órfãos no Windows; fica como melhoria.

---

*Documento gerado para o projeto ecp digital bank — v4.0 (as-built)*
*Stack: TypeScript + Fastify 4 + better-sqlite3 11 + React 18.3 + Vite 5.4 + Tailwind 3.4 + @anthropic-ai/sdk 0.80*
*Atualizado em 20/04/2026 a partir do código em `03-product-delivery/app/`*
