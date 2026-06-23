# Installation Guide — ECP Digital Bank v3.0

## Prerequisites

| Requirement | Version | How to install |
|-------------|---------|----------------|
| **Node.js** | 18+ (LTS recommended: 20) | [nvm-windows](https://github.com/coreybutler/nvm-windows) or [nodejs.org](https://nodejs.org) |
| **Python** | 3.12+ | `winget install Python.Python.3.12` — check "Add to PATH" |
| **Visual Studio Build Tools 2022** | — | `winget install Microsoft.VisualStudio.2022.BuildTools` → workload "Desktop development with C++" |
| **Git** | 2.40+ | `winget install Git.Git` — select "Checkout as-is, commit Unix-style line endings" |

> **Why Python and Build Tools?** The `better-sqlite3` package is a native Node.js module that requires compilation via `node-gyp`. Without these prerequisites, `npm install` will fail.

---

## Quick Installation

```bash
# 1. Clone the repository
git clone https://github.com/ecp-bank/ecp-digital-bank.git
cd ecp-digital-bank

# 2. Install dependencies (root + server + web)
npm install
cd server && npm install && cd ..
cd web && npm install && cd ..

# 3. Configure environment variables
cp .env.example .env
# Edit .env as needed (see section below)

# 4. Create database and run migrations
npm run db:migrate

# 5. Populate with demo data (optional)
npm run db:seed

# 6. Start the project (API + Frontend simultaneously)
npm run dev
```

After step 6:
- **Fastify API:** http://localhost:3333
- **React SPA:** http://localhost:5173

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3333
NODE_ENV=development

# JWT (use a secure value in production!)
JWT_SECRET=my-local-dev-secret-key
JWT_EXPIRES_IN=7d

# Database
DATABASE_PATH=./database.sqlite

# Front-end (VITE_ prefix exposes to browser)
VITE_API_URL=http://localhost:3333
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts API (3333) + Frontend (5173) simultaneously |
| `npm run dev:server` | Starts only the Fastify API with hot reload |
| `npm run dev:web` | Starts only the React + Vite frontend |
| `npm run build` | Generates production build of the frontend (`web/dist/`) |
| `npm run db:migrate` | Runs migrations on SQLite |
| `npm run db:seed` | Populates database with demo data |
| `npm test` | Runs tests with Vitest |
| `npm run lint` | Checks code quality |

---

## Demo Data (Seed)

After running `npm run db:seed`, the system is populated with:

| Data | Value |
|------|-------|
| **User** | Marina Silva |
| **Email** | marina@email.com |
| **Password** | Senha@123 |
| **CPF** | 12345678901 |
| **Balance** | R$ 4,235.78 |
| **Virtual card** | **** 4242 (limit R$ 5,000) |
| **Pix keys** | Email + CPF + 1 random |
| **Transactions** | 10+ sample transactions |
| **Notifications** | 5 demo notifications |

---

## Project Structure

```
ecp-digital-bank/
├── server/                     # Fastify API (port 3333)
│   ├── src/
│   │   ├── app.ts              # Fastify instance + plugins
│   │   ├── server.ts           # Entry point
│   │   ├── database/           # Migrations + seed + SQLite connection
│   │   ├── modules/            # 9 modules (auth, accounts, pix, etc.)
│   │   └── shared/             # Errors, middleware, utils
│   └── package.json
├── web/                        # React SPA (port 5173)
│   ├── src/
│   │   ├── App.tsx             # Root layout + React Router
│   │   ├── routes/             # 10 pages
│   │   ├── components/         # UI + layout components
│   │   └── services/           # API client + auth hook
│   └── package.json
├── docs/                       # Documentation and dashboard
├── .github/workflows/ci.yml   # CI/CD pipeline
├── package.json                # Root scripts
├── .env.example                # Environment variables template
└── database.sqlite             # Database (auto-generated)
```

---

## Troubleshooting

### `npm install` fails with `node-gyp` error
**Cause:** Missing Python 3 or Visual Studio Build Tools C++.
**Solution:**
```powershell
# Install Python 3
winget install Python.Python.3.12

# Install Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
# → Check workload "Desktop development with C++"

# Configure npm
npm config set msvs_version 2022
npm config set python python3

# Try again
cd server && npm install
```

### Port 3333 or 5173 already in use
**Cause:** Another process is using the port.
**Solution:**
```bash
# Check who is using the port
netstat -ano | findstr :3333

# Change the port via .env
PORT=3334
```

### Hot reload not working on Windows
**Cause:** `fs.watch` limitation in some scenarios.
**Solution:** Add to `.env`:
```
CHOKIDAR_USEPOLLING=1
```

### "Cannot find module" error after changing imports
**Cause:** Windows is case-insensitive, but Linux (CI) is case-sensitive.
**Solution:** Verify that the import case matches the exact file name.

---

## Production Deploy

### Option 1: Node.js Server (VPS/VM)

```bash
# On the production server
git clone <repo-url> && cd ecp-digital-bank
npm ci && cd server && npm ci && cd ../web && npm ci && cd ..

# Frontend build
cd web && npx vite build && cd ..

# Configure .env with production values
cp .env.example .env
# Edit: strong JWT_SECRET, NODE_ENV=production, VITE_API_URL=https://api.yourdomain.com

# Migrations
npm run db:migrate

# Start with PM2
npm install -g pm2
pm2 start server/src/server.ts --interpreter tsx --name ecp-api
pm2 save && pm2 startup

# Serve web/dist/ via Nginx or Caddy
```

### Option 2: Platforms (Railway, Render, Fly.io)

The API can be deployed on any platform that supports Node.js.
The frontend (`web/dist/`) can be hosted on Vercel, Netlify, or Cloudflare Pages.

**Important:** In production, use a process manager (PM2) and set up automatic backups for `database.sqlite`.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Package Manager | npm | — |
| API Framework | Fastify | 5.0 |
| Database | SQLite3 (better-sqlite3) | — |
| Validation | Zod | 3.23 |
| Auth | JWT + bcryptjs | — |
| Frontend | React | 18.3 |
| Build Tool | Vite | 5.4 |
| Routing | React Router | 6.26 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | — |
| Tests | Vitest | 1.6 |
| TypeScript | TypeScript | 5.5 |
