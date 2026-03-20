# Guia de Instalação — ECP Banco Digital v3.0

## Pré-requisitos

| Requisito | Versão | Como instalar |
|-----------|--------|---------------|
| **Node.js** | 18+ (LTS recomendado: 20) | [nvm-windows](https://github.com/coreybutler/nvm-windows) ou [nodejs.org](https://nodejs.org) |
| **Python** | 3.12+ | `winget install Python.Python.3.12` — marcar "Add to PATH" |
| **Visual Studio Build Tools 2022** | — | `winget install Microsoft.VisualStudio.2022.BuildTools` → workload "Desktop development with C++" |
| **Git** | 2.40+ | `winget install Git.Git` — selecionar "Checkout as-is, commit Unix-style line endings" |

> **Por que Python e Build Tools?** O pacote `better-sqlite3` é um módulo nativo Node.js que requer compilação via `node-gyp`. Sem estes pré-requisitos, `npm install` falhará.

---

## Instalação Rápida

```bash
# 1. Clonar o repositório
git clone https://github.com/ecp-bank/ecp-digital-bank.git
cd ecp-digital-bank

# 2. Instalar dependências (raiz + server + web)
npm install
cd server && npm install && cd ..
cd web && npm install && cd ..

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env conforme necessário (ver seção abaixo)

# 4. Criar banco de dados e executar migrations
npm run db:migrate

# 5. Popular com dados de demonstração (opcional)
npm run db:seed

# 6. Iniciar o projeto (API + Frontend simultaneamente)
npm run dev
```

Após o passo 6:
- **API Fastify:** http://localhost:3333
- **React SPA:** http://localhost:5173

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Servidor
PORT=3333
NODE_ENV=development

# JWT (usar valor seguro em produção!)
JWT_SECRET=minha-chave-secreta-local-dev
JWT_EXPIRES_IN=7d

# Banco de Dados
DATABASE_PATH=./database.sqlite

# Front-end (prefixo VITE_ expõe ao browser)
VITE_API_URL=http://localhost:3333
```

---

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia API (3333) + Frontend (5173) simultaneamente |
| `npm run dev:server` | Inicia apenas a API Fastify com hot reload |
| `npm run dev:web` | Inicia apenas o frontend React + Vite |
| `npm run build` | Gera build de produção do frontend (`web/dist/`) |
| `npm run db:migrate` | Executa migrations no SQLite |
| `npm run db:seed` | Popula banco com dados de demonstração |
| `npm test` | Roda testes com Vitest |
| `npm run lint` | Verifica qualidade do código |

---

## Dados de Demonstração (Seed)

Após executar `npm run db:seed`, o sistema é populado com:

| Dado | Valor |
|------|-------|
| **Usuário** | Marina Silva |
| **E-mail** | marina@email.com |
| **Senha** | Senha@123 |
| **CPF** | 12345678901 |
| **Saldo** | R$ 4.235,78 |
| **Cartão virtual** | **** 4242 (limite R$ 5.000) |
| **Chaves Pix** | Email + CPF + 1 aleatória |
| **Transações** | 10+ transações de exemplo |
| **Notificações** | 5 notificações de demonstração |

---

## Estrutura do Projeto

```
ecp-digital-bank/
├── server/                     # API Fastify (porta 3333)
│   ├── src/
│   │   ├── app.ts              # Instância Fastify + plugins
│   │   ├── server.ts           # Entry point
│   │   ├── database/           # Migrations + seed + conexão SQLite
│   │   ├── modules/            # 9 módulos (auth, accounts, pix, etc.)
│   │   └── shared/             # Erros, middleware, utils
│   └── package.json
├── web/                        # React SPA (porta 5173)
│   ├── src/
│   │   ├── App.tsx             # Layout raiz + React Router
│   │   ├── routes/             # 10 páginas
│   │   ├── components/         # UI + layout components
│   │   └── services/           # API client + auth hook
│   └── package.json
├── docs/                       # Documentação e dashboard
├── .github/workflows/ci.yml   # Pipeline CI/CD
├── package.json                # Scripts raiz
├── .env.example                # Template de variáveis
└── database.sqlite             # Banco (gerado automaticamente)
```

---

## Troubleshooting

### `npm install` falha com erro de `node-gyp`
**Causa:** Falta Python 3 ou Visual Studio Build Tools C++.
**Solução:**
```powershell
# Instalar Python 3
winget install Python.Python.3.12

# Instalar Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
# → Marcar workload "Desktop development with C++"

# Configurar npm
npm config set msvs_version 2022
npm config set python python3

# Tentar novamente
cd server && npm install
```

### Porta 3333 ou 5173 ocupada
**Causa:** Outro processo usando a porta.
**Solução:**
```bash
# Verificar quem usa a porta
netstat -ano | findstr :3333

# Alterar a porta via .env
PORT=3334
```

### Hot reload não funciona no Windows
**Causa:** Limitação do `fs.watch` em alguns cenários.
**Solução:** Adicionar ao `.env`:
```
CHOKIDAR_USEPOLLING=1
```

### Erro "Cannot find module" após alteração de imports
**Causa:** Windows é case-insensitive, mas Linux (CI) é case-sensitive.
**Solução:** Verificar se o case do import corresponde ao nome exato do arquivo.

---

## Deploy em Produção

### Opção 1: Servidor Node.js (VPS/VM)

```bash
# No servidor de produção
git clone <repo-url> && cd ecp-digital-bank
npm ci && cd server && npm ci && cd ../web && npm ci && cd ..

# Build do frontend
cd web && npx vite build && cd ..

# Configurar .env com valores de produção
cp .env.example .env
# Editar: JWT_SECRET forte, NODE_ENV=production, VITE_API_URL=https://api.seudominio.com

# Migrations
npm run db:migrate

# Iniciar com PM2
npm install -g pm2
pm2 start server/src/server.ts --interpreter tsx --name ecp-api
pm2 save && pm2 startup

# Servir web/dist/ via Nginx ou Caddy
```

### Opção 2: Plataformas (Railway, Render, Fly.io)

A API pode ser deployada em qualquer plataforma que suporte Node.js.
O frontend (`web/dist/`) pode ser hospedado em Vercel, Netlify ou Cloudflare Pages.

**Importante:** Em produção, usar processo manager (PM2) e backup automático do `database.sqlite`.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | 18+ |
| Package Manager | npm | — |
| API Framework | Fastify | 5.0 |
| Banco de Dados | SQLite3 (better-sqlite3) | — |
| Validação | Zod | 3.23 |
| Auth | JWT + bcryptjs | — |
| Frontend | React | 18.3 |
| Build Tool | Vite | 5.4 |
| Roteamento | React Router | 6.26 |
| Estilização | Tailwind CSS | 3.4 |
| Ícones | Lucide React | — |
| Testes | Vitest | 1.6 |
| TypeScript | TypeScript | 5.5 |
