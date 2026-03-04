# ecp digital bank — Especificação Técnica

> **Versão:** 3.0  
> **Data:** 03/03/2026  
> **Status:** Em desenvolvimento  

---

## 1. Stack Tecnológica — v3.0

A versão 3.0 traz uma mudança de filosofia: saímos de uma arquitetura serverless distribuída (monorepo Turborepo + Next.js + Supabase + tRPC + Drizzle) para uma **stack simplificada, portátil e autocontida**, que roda inteiramente na máquina do desenvolvedor sem dependência de serviços externos.

O princípio é: **um `npm run dev` na raiz liga tudo**. Sem Docker, sem banco externo, sem serviços na nuvem para o ambiente de desenvolvimento.

### 1.1. Ambiente de Desenvolvimento — Windows 11

> **O desenvolvimento ocorre em Windows 11 com Cursor e Claude Code.** As decisões técnicas abaixo levam isso em conta.

#### Pré-requisitos obrigatórios

| Requisito | Por quê | Como instalar |
|-----------|---------|---------------|
| **Node.js 18+ (LTS)** | Runtime do projeto | Instalar via [nvm-windows](https://github.com/coreybutler/nvm-windows) para gerenciar versões |
| **Python 3.12+** | Necessário para `node-gyp` compilar módulos nativos (`better-sqlite3`) | `winget install Python.Python.3.12` ou baixar de python.org. Marcar "Add to PATH" no instalador |
| **Visual Studio Build Tools 2022** | Compilador C++ para módulos nativos Node.js | `winget install Microsoft.VisualStudio.2022.BuildTools` → instalar workload **"Desktop development with C++"** |
| **Git for Windows** | Controle de versão com line endings corretos | `winget install Git.Git` — na instalação, selecionar **"Checkout as-is, commit Unix-style line endings"** |

#### Configurações de sistema recomendadas

```powershell
# Habilitar caminhos longos (evita erro com node_modules profundos)
# Executar PowerShell como Administrador:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Configurar npm para usar o compilador correto
npm config set msvs_version 2022
npm config set python python3
```

#### Armadilhas comuns no Windows

| Problema | Causa | Solução |
|----------|-------|---------|
| `node-gyp` falha ao instalar `better-sqlite3` | Falta Build Tools C++ ou Python | Instalar os pré-requisitos acima e rodar `npm install` novamente |
| Porta 3333 ou 5173 ocupada | Outro processo ou Hyper-V usando a porta | Verificar com `netstat -ano \| findstr :3333` e matar o processo |
| File watching não detecta mudanças | Limitação do `fs.watch` no Windows em alguns cenários | Configurar `CHOKIDAR_USEPOLLING=1` no `.env` ou usar flag `--poll` no Vite |
| Imports com case errado funcionam local mas quebram no CI | Windows filesystem é case-insensitive, Linux é case-sensitive | Seguir regra de código RIC-11 (ver seção 2) — importar sempre com o case exato do arquivo |
| Line endings `CRLF` corrompem scripts SQL ou migrations | Git no Windows converte para CRLF por padrão | Usar `.gitattributes` no projeto (ver estrutura de pastas) |
| `npm run dev` não mata processos ao parar | `concurrently` no Windows às vezes deixa processos órfãos | Usar `concurrently --kill-others` nos scripts |

### 1.2. Comparativo v2.0 → v3.0

| Aspecto | v2.0 | v3.0 |
|---------|------|------|
| Servidor Web | Next.js 15 (App Router + SSR) | **Fastify 5.0** (API REST pura) |
| Banco de Dados | Supabase PostgreSQL + Drizzle ORM | **SQLite3** (arquivo único `database.sqlite`) |
| Cache | Upstash Redis | Não necessário (SQLite local é instantâneo) |
| Fila | Upstash QStash | Não necessário no MVP |
| Auth | Supabase Auth | Auth própria via JWT + bcryptjs |
| API Layer | tRPC 11 (type-safe RPC) | **Fastify REST** com validação Zod |
| Monorepo | Turborepo + pnpm workspaces | **Projeto único** com pastas `/server` e `/web` |
| Gerenciador | pnpm | **npm** |
| Front-end Framework | Next.js 15 (RSC + App Router) | **React 18.3** + Vite (SPA pura) |
| Roteamento Front | Next.js File Router | **React Router 6.26** |
| UI Components | shadcn/ui | Componentes próprios com **Tailwind CSS 3.4** |
| Deploy | Vercel + EAS Build | Qualquer servidor Node.js |

### 1.3. Back-end (API)

O servidor é o "motor" responsável por processar todas as regras de negócio, salvar e fornecer os dados de forma segura. Roda em `http://localhost:3333/`.

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.5 | Linguagem base — código tipado e seguro que previne erros antes da execução |
| **Fastify** | 5.0 | Servidor web de alta performance para criação de rotas REST, substituindo Express |
| **Zod** | 3.23 | Validador automático de dados de entrada (e-mail, telefone, limites, formatos) |
| **SQLite3** | — | Engine de banco de dados real em arquivo único (`database.sqlite`), sem instalar serviços externos |
| **tsx** | 4.19 | Executor de TypeScript direto com hot reload via watch nativo do Node |

#### Por que Fastify?

O Fastify é um dos frameworks HTTP mais rápidos do ecossistema Node.js. Ele foi projetado para lidar com carga alta e processamento rápido, com um sistema de plugins que facilita a organização do código. Na prática, ele substitui o Express com vantagens claras de performance e validação de schema nativa. A arquitetura de plugins do Fastify permite registrar rotas, hooks e decoradores de forma modular, mantendo o código organizado mesmo conforme o projeto cresce.

#### Por que SQLite3?

A migração de JSON files (v1) e Supabase PostgreSQL (v2) para SQLite3 combina o melhor dos dois mundos: todo o poder do SQL (queries, joins, índices, transactions) com a extrema portabilidade de um arquivo único. O desenvolvedor não precisa instalar MySQL, PostgreSQL ou qualquer outro serviço externo — tudo roda dentro de `database.sqlite`. Para o escopo de um MVP e desenvolvimento local, SQLite oferece performance excelente e zero configuração.

#### Por que Zod?

Zod é a fonte de verdade para validação. Todo dado que entra no servidor passa por um schema Zod antes de tocar qualquer lógica de negócio. Isso garante que formatos de e-mail, tamanhos de campos, limites numéricos e regras de formato estejam rigorosamente corretos. Além disso, os tipos TypeScript são derivados automaticamente dos schemas via `z.infer<>`, eliminando duplicação de tipos.

#### Estrutura de Pastas do Back-end

```
server/
├── src/
│   ├── app.ts                  # Instância Fastify + registro de plugins
│   ├── server.ts               # Entry point — liga o servidor na porta 3333
│   ├── database/
│   │   ├── connection.ts       # Conexão SQLite3 (singleton)
│   │   ├── migrations/         # Scripts SQL de criação/alteração de tabelas
│   │   └── seed.ts             # Dados iniciais para desenvolvimento
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts  # Schemas Zod de login/registro
│   │   ├── accounts/
│   │   │   ├── accounts.routes.ts
│   │   │   ├── accounts.service.ts
│   │   │   └── accounts.schema.ts
│   │   ├── pix/
│   │   │   ├── pix.routes.ts
│   │   │   ├── pix.service.ts
│   │   │   └── pix.schema.ts
│   │   ├── cards/
│   │   │   ├── cards.routes.ts
│   │   │   ├── cards.service.ts
│   │   │   └── cards.schema.ts
│   │   ├── transactions/
│   │   │   ├── transactions.routes.ts
│   │   │   ├── transactions.service.ts
│   │   │   └── transactions.schema.ts
│   │   ├── payments/
│   │   │   ├── payments.routes.ts
│   │   │   ├── payments.service.ts
│   │   │   └── payments.schema.ts
│   │   └── users/
│   │       ├── users.routes.ts
│   │       ├── users.service.ts
│   │       └── users.schema.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── app-error.ts    # Classe AppError com ErrorCode
│   │   │   └── error-codes.ts  # Enum de códigos de erro padronizados
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Middleware de autenticação JWT
│   │   │   └── error-handler.ts
│   │   └── utils/
│   │       ├── money.ts        # Helpers para centavos ↔ reais
│   │       └── uuid.ts         # Geração de UUID v4
│   └── types/
│       └── fastify.d.ts        # Extensão de tipos do Fastify
├── tsconfig.json
└── database.sqlite             # Arquivo único do banco (gerado automaticamente)
```

#### Padrão de Módulo

Cada módulo segue o padrão de três arquivos:

- **`*.schema.ts`** — Schemas Zod de input/output. Tipos derivados via `z.infer<>`. É a fonte de verdade do contrato.
- **`*.routes.ts`** — Registra as rotas Fastify do módulo. Valida input com schema Zod. Chama o service e retorna a resposta.
- **`*.service.ts`** — Contém toda a lógica de negócio. Faz queries no SQLite. Lança `AppError` em caso de violação de regra.

```typescript
// Exemplo: modules/pix/pix.schema.ts
import { z } from 'zod'

export const pixTransferSchema = z.object({
  pixKeyValue: z.string().min(1),
  pixKeyType: z.enum(['cpf', 'email', 'phone', 'random']),
  amountInCents: z.number().int().positive(),
  description: z.string().max(140).optional(),
})

export type PixTransferInput = z.infer<typeof pixTransferSchema>
```

```typescript
// Exemplo: modules/pix/pix.routes.ts
import type { FastifyInstance } from 'fastify'
import { pixTransferSchema } from './pix.schema'
import { PixService } from './pix.service'

export async function pixRoutes(app: FastifyInstance) {
  app.post('/pix/transfer', async (request, reply) => {
    const body = pixTransferSchema.parse(request.body)
    const result = await PixService.transfer(request.user.id, body)
    return reply.status(201).send(result)
  })
}
```

### 1.4. Front-end (Web App / UI)

A interface do ECP Banco Digital é uma SPA (Single Page Application) que roda no navegador em `http://localhost:5173/`. Funciona como painel do usuário para visualizar saldo, fazer transferências Pix, consultar extrato e gerenciar cartões.

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.6 | Linguagem base — tipagem segura na interface |
| **React** | 18.3 | Biblioteca central de construção da UI com componentes reutilizáveis |
| **React Router** | 6.26 | Navegação SPA fluida sem recarregamento de página |
| **Tailwind CSS** | 3.4 | Estilização utility-first para UIs modernas e consistentes |
| **Lucide React** | — | Ícones SVG para sidebar, botões de ação e status |
| **Vite** | 5.4 | Build tool que inicia o dev server em milissegundos (substitui Webpack) |

#### Por que React + Vite (e não Next.js)?

A v2.0 usava Next.js 15 com App Router e Server Components. Para a v3.0, optamos por React puro com Vite por três motivos: simplificação do setup (sem SSR, sem RSC, sem hydration), velocidade de desenvolvimento (Vite inicia em <300ms vs ~3s do Next.js em dev), e separação clara entre front e back (a API é 100% Fastify, o front é 100% React — sem acoplamento).

#### Por que React Router?

O React Router gerencia toda a navegação do painel sem recarregar a página. Ao clicar em "Pix" na sidebar, a mudança é instantânea — o navegador não faz uma nova requisição ao servidor, apenas troca o componente visível. Isso é o comportamento SPA que dá fluidez à experiência.

#### Estrutura de Pastas do Front-end

```
web/
├── src/
│   ├── main.tsx                # Entry point — monta o React no DOM
│   ├── App.tsx                 # Layout raiz + React Router
│   ├── routes/
│   │   ├── index.tsx           # Configuração central de rotas
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── dashboard.tsx       # Home com saldo e ações rápidas
│   │   ├── extrato.tsx
│   │   ├── pix/
│   │   │   ├── enviar.tsx
│   │   │   ├── receber.tsx
│   │   │   └── chaves.tsx
│   │   ├── cartoes.tsx
│   │   ├── pagamentos.tsx
│   │   └── perfil.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     # Menu lateral de navegação
│   │   │   ├── Header.tsx      # Barra superior com nome e notificações
│   │   │   └── MobileNav.tsx   # Navegação mobile (bottom tab)
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Badge.tsx
│   │   ├── dashboard/
│   │   │   ├── BalanceCard.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── extrato/
│   │   │   ├── TransactionList.tsx
│   │   │   └── TransactionFilters.tsx
│   │   ├── pix/
│   │   │   ├── TransferForm.tsx
│   │   │   ├── KeyManager.tsx
│   │   │   └── QRCodeDisplay.tsx
│   │   └── cartoes/
│   │       ├── CardDisplay.tsx
│   │       └── InvoiceList.tsx
│   ├── hooks/
│   │   ├── useAuth.ts          # Hook de autenticação
│   │   ├── useFetch.ts         # Hook genérico de fetch com loading/error
│   │   └── useBalance.ts       # Hook de saldo com atualização
│   ├── services/
│   │   ├── api.ts              # Instância base do fetch para a API
│   │   ├── auth.service.ts
│   │   ├── pix.service.ts
│   │   ├── cards.service.ts
│   │   └── transactions.service.ts
│   ├── lib/
│   │   ├── formatters.ts       # Formatação de moeda, data, CPF
│   │   └── validators.ts       # Validações client-side reutilizáveis
│   └── styles/
│       └── globals.css         # Tailwind directives + variáveis CSS do tema
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

### 1.5. Infraestrutura Base do Node

Todo o ecossistema é suportado pelo JavaScript moderno:

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **Node.js** | 18+ | Plataforma de runtime — executa TypeScript no servidor |
| **npm** | — | Gerenciador de dependências e scripts |

O `package.json` raiz orquestra ambos os lados:

```json
{
  "name": "ecp-banco-digital",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently --kill-others \"npm run dev:server\" \"npm run dev:web\"",
    "dev:server": "cd server && tsx watch src/server.ts",
    "dev:web": "cd web && vite",
    "build": "cd web && vite build",
    "db:migrate": "cd server && tsx src/database/migrations/run.ts",
    "db:seed": "cd server && tsx src/database/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "concurrently": "^8.2",
    "vitest": "^1.6"
  }
}
```

> **Nota Windows:** Os scripts `cd server && ...` funcionam no `cmd.exe` que o npm usa por padrão. Se houver problemas, uma alternativa é usar `npm --prefix server run ...` ou configurar `"script-shell": "cmd.exe"` no `.npmrc`.

Com um único comando na raiz — `npm run dev` — o npm liga magicamente os dois lados ao mesmo tempo: a API Fastify na porta 3333 e o React + Vite na porta 5173.

### 1.6. Estrutura Geral do Projeto

```
ecp-banco-digital/
├── server/                     # Back-end (API Fastify)
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── database/
│   │   ├── modules/
│   │   ├── shared/
│   │   └── types/
│   ├── tsconfig.json
│   └── package.json
│
├── web/                        # Front-end (React + Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── lib/
│   │   └── styles/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── package.json                # Scripts raiz (npm run dev liga tudo)
├── database.sqlite             # Banco de dados (gerado automaticamente)
├── .env                        # Variáveis de ambiente locais
├── .env.example                # Template de variáveis
├── .gitattributes              # Força LF em todos os arquivos de texto (crítico no Windows)
├── .gitignore
├── .npmrc                      # Configurações npm (script-shell, msvs_version)
├── tsconfig.base.json          # Config TypeScript compartilhada
└── README.md
```

### 1.7. Variáveis de Ambiente

```bash
# ECP Banco Digital — Variáveis de Ambiente
# Copiar para .env — NUNCA commitar .env

# Servidor
PORT=3333
NODE_ENV=development

# JWT
JWT_SECRET=minha-chave-secreta-local-dev
JWT_EXPIRES_IN=7d

# Banco de Dados
DATABASE_PATH=./database.sqlite

# Front-end (prefixo VITE_ para expor ao browser)
VITE_API_URL=http://localhost:3333

# File watching (descomente se hot reload não funcionar no Windows)
# CHOKIDAR_USEPOLLING=1
```

#### `.gitattributes` (obrigatório no Windows)

```gitattributes
# Força line endings LF em todos os arquivos de texto — previne CRLF no Windows
* text=auto eol=lf

# Arquivos que devem sempre ser LF (crítico para SQL migrations e scripts)
*.ts text eol=lf
*.tsx text eol=lf
*.sql text eol=lf
*.json text eol=lf
*.css text eol=lf
*.html text eol=lf
*.md text eol=lf
*.sh text eol=lf

# Binários — nunca converter
*.sqlite binary
*.png binary
*.jpg binary
```

#### `.npmrc` (recomendado no Windows)

```ini
# Garante que npm use cmd.exe para scripts (evita problemas com PowerShell)
script-shell=cmd.exe
```

---

## 2. Regras Invioláveis de Código

Estas regras se aplicam a todo o código do projeto, sem exceção:

1. **TypeScript strict sempre** — `"strict": true` no tsconfig. NUNCA usar `any`; usar `unknown` + type guard quando necessário.
2. **Schemas Zod são a fonte de verdade** — todos os tipos são derivados via `z.infer<>`. NUNCA criar tipos manuais duplicados.
3. **Dinheiro sempre em centavos** — todo valor monetário é `integer` representando centavos. NUNCA usar `float` para dinheiro. `0.1 + 0.2 !== 0.3`.
4. **IDs são UUID v4** — NUNCA usar auto-increment serial. UUID não é previsível e não expõe volume.
5. **Erros padronizados** — usar `AppError` com `ErrorCode`. NUNCA `throw new Error("mensagem genérica")`.
6. **Soft delete** — registros de negócio NUNCA são deletados fisicamente. Usar coluna `deleted_at`.
7. **Logs estruturados** — NUNCA `console.log` em produção. Usar logger JSON estruturado.
8. **Secrets apenas em variáveis de ambiente** — NUNCA commitar `.env`, chaves JWT ou tokens no código.
9. **Validação na borda** — todo input que entra na API é validado por Zod antes de tocar qualquer service.
10. **Transações para operações compostas** — operações que alteram mais de uma tabela usam `BEGIN/COMMIT/ROLLBACK` do SQLite.
11. **Imports com case exato** — Windows é case-insensitive, mas Linux (CI/deploy) é case-sensitive. SEMPRE importar com o case exato do nome do arquivo: `import { Button } from './Button'` e NUNCA `'./button'`. Isso previne builds que funcionam local mas quebram no CI.
12. **Caminhos com `path.join()` / `path.resolve()`** — NUNCA concatenar strings com `/` para montar caminhos de arquivo. Usar sempre `import path from 'node:path'` + `path.join()`. Isso garante que `\` do Windows e `/` do Linux sejam tratados corretamente.
13. **Sem dependências com compilação nativa desnecessária** — preferir alternativas pure-JS quando existirem (ex: `bcryptjs` em vez de `bcrypt`). Módulos que exigem `node-gyp` (como `better-sqlite3`) devem ser documentados nos pré-requisitos.

---

## 3. Modelo de Dados (SQLite)

### 3.1. Tabelas Principais

```sql
-- Usuários
CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- UUID v4
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  cpf         TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,              -- bcrypt hash
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | blocked | inactive
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT                        -- soft delete
);

-- Contas
CREATE TABLE accounts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  balance     INTEGER NOT NULL DEFAULT 0,  -- centavos
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transações
CREATE TABLE transactions (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  type        TEXT NOT NULL,               -- pix_sent | pix_received | payment | card_purchase
  amount      INTEGER NOT NULL,            -- centavos (sempre positivo)
  direction   TEXT NOT NULL,               -- in | out
  description TEXT,
  category    TEXT,                        -- alimentação | transporte | lazer | etc.
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | failed | reversed
  reference_id TEXT,                       -- ID externo (chave Pix, boleto, etc.)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chaves Pix
CREATE TABLE pix_keys (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  type        TEXT NOT NULL,               -- cpf | email | phone | random
  value       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cartões Virtuais
CREATE TABLE cards (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  number      TEXT NOT NULL,               -- últimos 4 dígitos para exibição
  type        TEXT NOT NULL DEFAULT 'virtual',
  status      TEXT NOT NULL DEFAULT 'active',  -- active | blocked | cancelled
  limit_in_cents INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Faturas do Cartão
CREATE TABLE invoices (
  id          TEXT PRIMARY KEY,
  card_id     TEXT NOT NULL REFERENCES cards(id),
  month       TEXT NOT NULL,               -- "2026-03"
  total       INTEGER NOT NULL DEFAULT 0,  -- centavos
  status      TEXT NOT NULL DEFAULT 'open', -- open | closed | paid | overdue
  due_date    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Compras no Cartão
CREATE TABLE card_purchases (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id),
  card_id     TEXT NOT NULL REFERENCES cards(id),
  merchant    TEXT NOT NULL,
  amount      INTEGER NOT NULL,            -- centavos
  category    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notificações
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,               -- pix_received | payment_due | card_blocked | etc.
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        INTEGER NOT NULL DEFAULT 0,  -- 0 = não lida, 1 = lida
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2. Índices

```sql
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_pix_keys_account ON pix_keys(account_id);
CREATE INDEX idx_pix_keys_value ON pix_keys(value);
CREATE INDEX idx_cards_account ON cards(account_id);
CREATE INDEX idx_invoices_card ON invoices(card_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
```

---

## 4. Contratos da API (Rotas REST)

Base URL: `http://localhost:3333`

### 4.1. Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta (name, email, cpf, password) |
| POST | `/auth/login` | Login (email, password) → JWT |
| POST | `/auth/refresh` | Renovar token JWT |
| GET | `/auth/me` | Dados do usuário autenticado |

### 4.2. Accounts

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/accounts` | Dados da conta do usuário autenticado |
| GET | `/accounts/balance` | Saldo atual (em centavos) |

### 4.3. Pix

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pix/transfer` | Enviar Pix (pixKeyValue, pixKeyType, amountInCents) |
| POST | `/pix/keys` | Registrar nova chave Pix |
| GET | `/pix/keys` | Listar chaves Pix do usuário |
| DELETE | `/pix/keys/:id` | Desativar chave Pix |
| POST | `/pix/qrcode` | Gerar QR Code de cobrança |

### 4.4. Transactions

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/transactions` | Listar transações (paginação cursor-based) |
| GET | `/transactions/:id` | Detalhe de uma transação |
| GET | `/transactions/summary` | Resumo por categoria e período |

### 4.5. Cards

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/cards` | Criar cartão virtual |
| GET | `/cards` | Listar cartões do usuário |
| PATCH | `/cards/:id/block` | Bloquear cartão |
| PATCH | `/cards/:id/unblock` | Desbloquear cartão |

### 4.6. Payments

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/payments/boleto` | Pagar boleto (barcode, amountInCents) |
| POST | `/payments/utility` | Pagar conta de serviço |

### 4.7. Users

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/profile` | Perfil completo do usuário |
| PATCH | `/users/profile` | Atualizar dados pessoais |
| PATCH | `/users/password` | Alterar senha |

---

## 5. Segurança e Compliance

- Senhas armazenadas com **bcryptjs** (custo mínimo 12) — versão pure-JS do bcrypt, sem compilação nativa no Windows
- Autenticação via **JWT** com expiração configurável
- Dados de chave Pix de terceiros **não são logados**
- Valores monetários trafegam como **integer (centavos)** — nunca float
- Transações são **idempotentes** — reenvio não gera duplicidade
- Conformidade com **LGPD** — dados de terceiros exibidos apenas no momento da transação
- **Rate limiting** em rotas sensíveis (login, transferência)
- **CORS** configurado para aceitar apenas a origem do front-end
- **Helmet** (via Fastify) para headers de segurança HTTP

---

## 6. Scripts de Desenvolvimento

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Liga API (3333) + Front (5173) simultaneamente (`--kill-others` garante cleanup no Windows) |
| `npm run dev:server` | Liga apenas a API Fastify com hot reload |
| `npm run dev:web` | Liga apenas o front-end React + Vite |
| `npm run build` | Gera build de produção do front-end |
| `npm run db:migrate` | Executa migrations no SQLite |
| `npm run db:seed` | Popula banco com dados de desenvolvimento |
| `npm test` | Roda testes com Vitest |
| `npm run test:watch` | Testes em modo watch |
| `npm run lint` | Verifica qualidade do código |

---

## 7. Restrições e Decisões Técnicas

- **Sem mobile nativo** — a v3.0 foca exclusivamente na interface web. Mobile pode ser adicionado futuramente.
- **Sem serviços externos** — o MVP roda 100% local. Integrações com APIs de Pix real, bancos e gateways ficam para versões futuras.
- **Sem ORM pesado** — queries SQL diretas no SQLite via `better-sqlite3` (síncrono, rápido). A simplicidade do acesso direto é preferida sobre a abstração de um ORM. **Nota Windows:** `better-sqlite3` é um módulo nativo que requer compilação via `node-gyp` — por isso os pré-requisitos incluem Python 3 e Visual Studio Build Tools. O pacote distribui prebuilt binaries para a maioria das combinações Node + OS, mas se a compilação falhar, verificar se os Build Tools C++ estão instalados corretamente.
- **Sem SSR** — o front-end é uma SPA pura. SEO não é relevante para um painel bancário autenticado.
- **Auth própria** — JWT + bcryptjs local, sem dependência de Supabase Auth ou qualquer provider externo.

---

*Documento gerado para o projeto ecp digital bank — v3.0*  
*Stack: TypeScript + Fastify + SQLite3 + React + Vite*
