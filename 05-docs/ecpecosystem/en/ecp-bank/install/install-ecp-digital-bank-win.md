# Installation Manual — ECP Digital Bank (Windows 11)

> **Operating system:** Windows 11
> **Terminal:** PowerShell 5.1+ or Windows Terminal
> **Date:** March 2026
> **Project version:** 3.0

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
   - 1.1 [Node.js](#11-nodejs)
   - 1.2 [Python 3](#12-python-3)
   - 1.3 [Visual Studio Build Tools 2022](#13-visual-studio-build-tools-2022)
   - 1.4 [Git for Windows](#14-git-for-windows)
   - 1.5 [npm configuration](#15-npm-configuration)
   - 1.6 [Enable long paths](#16-enable-long-paths-optional-but-recommended)
2. [Clone the repository](#2-clone-the-repository)
3. [Install dependencies](#3-install-dependencies)
4. [Configure environment variables](#4-configure-environment-variables)
5. [Create the database](#5-create-the-database)
6. [Populate with demo data](#6-populate-with-demo-data-seed)
7. [Start the application](#7-start-the-application)
8. [Final verification — Smoke Test](#8-final-verification--smoke-test)
9. [Useful commands](#9-useful-commands)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### 1.1 Node.js

The project requires **Node.js 18+** (recommended: 20 LTS).

**Installation:**

```powershell
# Option A — via winget
winget install OpenJS.NodeJS.LTS

# Option B — via nvm-windows (allows multiple versions)
winget install CoreyButler.NVMforWindows
# Close and reopen the terminal after installing nvm
nvm install 20
nvm use 20
```

**Verification:**

```powershell
node --version
# Expected: v20.x.x (any version >= 18 is accepted)

npm --version
# Expected: 10.x.x (comes bundled with Node)
```

> If `node` is not recognized, close and reopen the terminal so that PATH is updated.

---

### 1.2 Python 3

Required for `node-gyp` to compile the native module `better-sqlite3`.

**Installation:**

```powershell
winget install Python.Python.3.12
```

> **Important:** During manual installation (if not via winget), check the **"Add Python to PATH"** option.

**Verification:**

```powershell
python --version
# Expected: Python 3.12.x (any 3.8+ works)

# If 'python' doesn't work, try:
python3 --version

# Verify it's in PATH:
where python
# Expected: C:\Users\<your-user>\AppData\Local\Programs\Python\Python312\python.exe (or similar)
```

---

### 1.3 Visual Studio Build Tools 2022

C++ compiler required for native Node.js modules (like `better-sqlite3`).

**Installation:**

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

After installation, the **Visual Studio Installer** opens automatically. If it doesn't:

```powershell
# Open Visual Studio Installer manually
Start-Process "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe"
```

In Visual Studio Installer:
1. Click **"Modify"** on Build Tools 2022
2. Check the **"Desktop development with C++"** workload
3. Click **"Install"** and wait (~2-5 GB download)

**Verification:**

```powershell
# Verify that cl.exe (C++ compiler) is accessible
# Open "Developer PowerShell for VS 2022" or run:
& "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" 2>$null
cl.exe 2>&1 | Select-String "Version"
# Expected: Line containing "Microsoft (R) C/C++ Optimizing Compiler Version 19.x"

# Simpler alternative — verify that node-gyp can find it:
npm config set msvs_version 2022
npm config get msvs_version
# Expected: 2022
```

> If the C++ workload is not installed, `npm install` for `better-sqlite3` will fail with `node-gyp` errors.

---

### 1.4 Git for Windows

**Installation:**

```powershell
winget install Git.Git
```

During installation, on the line endings screen, select:
**"Checkout as-is, commit Unix-style line endings"**

**Verification:**

```powershell
git --version
# Expected: git version 2.4x.x (any 2.30+ works)

# Check line endings configuration:
git config --global core.autocrlf
# Expected: input (or true — both are acceptable)
```

---

### 1.5 npm configuration

Configure npm to use the correct compiler:

```powershell
npm config set msvs_version 2022
npm config set python python
```

**Verification:**

```powershell
npm config get msvs_version
# Expected: 2022

npm config get python
# Expected: python
```

---

### 1.6 Enable long paths (optional but recommended)

Node.js with `node_modules` can generate very long paths. On Windows, the default limit is 260 characters.

```powershell
# Run PowerShell as ADMINISTRATOR:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

**Verification:**

```powershell
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
# Expected: LongPathsEnabled : 1
```

---

### Prerequisites Checklist

Run this block to validate everything at once:

```powershell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Prerequisites Checklist" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Node.js
$nodeVersion = (node --version 2>$null)
if ($nodeVersion) {
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Node.js not found" -ForegroundColor Red
}

# npm
$npmVersion = (npm --version 2>$null)
if ($npmVersion) {
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "[FAIL] npm not found" -ForegroundColor Red
}

# Python
$pythonVersion = (python --version 2>$null)
if ($pythonVersion) {
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Python not found" -ForegroundColor Red
}

# Git
$gitVersion = (git --version 2>$null)
if ($gitVersion) {
    Write-Host "[OK] $gitVersion" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Git not found" -ForegroundColor Red
}

# msvs_version
$msvs = (npm config get msvs_version 2>$null)
if ($msvs -eq "2022") {
    Write-Host "[OK] npm msvs_version: $msvs" -ForegroundColor Green
} else {
    Write-Host "[WARN] npm msvs_version: $msvs (expected: 2022)" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
```

Expected result — everything `[OK]` in green:

```
========================================
 Prerequisites Checklist
========================================
[OK] Node.js: v20.x.x
[OK] npm: 10.x.x
[OK] Python 3.12.x
[OK] git version 2.4x.x
[OK] npm msvs_version: 2022
========================================
```

---

## 2. Clone the repository

```powershell
# Navigate to the folder where you want to clone
cd C:\Users\$env:USERNAME\projetos_git

# Clone
git clone https://github.com/ecp-bank/ecp-digital-bank.git

# Enter the folder
cd ecp-digital-bank
```

**Verification:**

```powershell
# Verify that files exist
Test-Path "package.json"
# Expected: True

Test-Path "server\package.json"
# Expected: True

Test-Path "web\package.json"
# Expected: True

Test-Path "tech_spec.md"
# Expected: True

# Check folder structure
Get-ChildItem -Name
# Expected:
#   .github
#   01-strategic-context
#   02-product-discovery
#   03-product-delivery
#   04-product-operation
#   design_spec.md
#   docs
#   package.json
#   product_briefing_espec.md
#   server
#   tech_spec.md
#   tsconfig.base.json
#   web
```

---

## 3. Install dependencies

Installation happens at 3 levels: root, server, and web.

```powershell
# 3.1 — Install root dependencies (concurrently)
npm install
```

**Verification 3.1:**

```powershell
Test-Path "node_modules\concurrently"
# Expected: True
```

```powershell
# 3.2 — Install server dependencies (Fastify, better-sqlite3, etc.)
cd server
npm install
```

> **This step compiles `better-sqlite3`** using `node-gyp`. If it fails, see [Troubleshooting](#101-server-npm-install-fails-with-node-gyp).

**Verification 3.2:**

```powershell
# Verify that better-sqlite3 compiled correctly
Test-Path "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
# Expected: True

# Verify that all packages are installed
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
# Expected: better-sqlite3 OK

node -e "require('fastify'); console.log('fastify OK')"
# Expected: fastify OK

node -e "require('bcryptjs'); console.log('bcryptjs OK')"
# Expected: bcryptjs OK
```

```powershell
# 3.3 — Install web dependencies (React, Vite, Tailwind, etc.)
cd ..\web
npm install
```

**Verification 3.3:**

```powershell
Test-Path "node_modules\react"
# Expected: True

Test-Path "node_modules\vite"
# Expected: True

# Return to project root
cd ..
```

**Alternative — install everything at once:**

```powershell
# From project root:
npm run install:all
```

**General verification:**

```powershell
# Verify that all 3 node_modules exist
Write-Host "Root: $(Test-Path 'node_modules')" -ForegroundColor Cyan
Write-Host "Server: $(Test-Path 'server\node_modules')" -ForegroundColor Cyan
Write-Host "Web: $(Test-Path 'web\node_modules')" -ForegroundColor Cyan
# Expected: all True
```

---

## 4. Configure environment variables

The server uses environment variables for configuration. In development, the default values in the code already work, but it's good practice to create a `.env` file.

```powershell
# Create the .env file in server/
@"
# ECP Digital Bank — Environment Variables (Development)

# Server
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# JWT
JWT_SECRET=ecp-digital-bank-dev-secret-change-in-production

# Database (path relative to server/)
DATABASE_PATH=./database.sqlite

# CORS (frontend origin in development)
CORS_ORIGIN=http://localhost:5173
"@ | Out-File -Encoding utf8 -FilePath "server\.env"
```

**Verification:**

```powershell
Test-Path "server\.env"
# Expected: True

Get-Content "server\.env" | Select-String "PORT"
# Expected: PORT=3333
```

> **Note:** Vite is already configured with a proxy in `vite.config.ts` — all `/api/*` calls from the frontend are automatically redirected to `http://localhost:3333`. No need to configure `VITE_API_URL` in development.

---

## 5. Create the database

The SQLite database is automatically created as a single file. Migrations create the 9 tables and 12 indexes.

```powershell
# Run migrations (from project root)
npm run db:migrate
```

**Expected output:**

```
[migrate] Starting database migrations...
[migrate] Applied 001-initial.sql
[migrate] All migrations applied successfully.
```

**Verification:**

```powershell
# Verify that the database file was created
Test-Path "server\database.sqlite"
# Expected: True

# Check the size (should be at least a few KB after migrations)
$dbSize = (Get-Item "server\database.sqlite").Length
Write-Host "Database size: $([math]::Round($dbSize/1KB, 1)) KB"
# Expected: ~16-32 KB (empty tables + indexes)

# Verify that tables were created (using Node.js + better-sqlite3)
cd server
node -e "
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const tables = db.prepare(""SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__%' ORDER BY name"").all();
console.log('Tables created:', tables.length);
tables.forEach(t => console.log('  -', t.name));
db.close();
"
cd ..
```

**Expected verification output:**

```
Tables created: 9
  - accounts
  - card_purchases
  - cards
  - invoices
  - notifications
  - pix_keys
  - pix_rate_limit
  - transactions
  - users
```

---

## 6. Populate with demo data (Seed)

The seed creates a test user with complete data for development.

```powershell
npm run db:seed
```

**Expected output:**

```
[seed] Starting database seed...
[seed] Created user: Marina Silva (marina@email.com)
[seed] Created account with balance: R$ 4.235,78
[seed] Created 3 Pix keys
[seed] Created virtual card: **** 4242
[seed] Created 10 transactions
[seed] Created 5 notifications
[seed] Seed completed successfully.
```

**Verification:**

```powershell
# Verify that data was inserted
cd server
node -e "
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
const pixKeys = db.prepare('SELECT COUNT(*) as count FROM pix_keys').get();
const transactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
const cards = db.prepare('SELECT COUNT(*) as count FROM cards').get();
const notifications = db.prepare('SELECT COUNT(*) as count FROM notifications').get();

console.log('Users:', users.count);
console.log('Accounts:', accounts.count);
console.log('Pix keys:', pixKeys.count);
console.log('Transactions:', transactions.count);
console.log('Cards:', cards.count);
console.log('Notifications:', notifications.count);
db.close();
"
cd ..
```

**Expected output:**

```
Users: 1
Accounts: 1
Pix keys: 3
Transactions: 10+
Cards: 1
Notifications: 5
```

### Test user data

| Field | Value |
|-------|-------|
| Name | Marina Silva |
| Email | `marina@email.com` |
| Password | `Senha@123` |
| CPF | 12345678900 |
| Balance | R$ 4,235.78 |
| Card | **** 4242 (limit R$ 5,000) |

---

## 7. Start the application

### 7.1 Start everything together (recommended)

```powershell
# From project root — starts API + Frontend simultaneously
npm run dev
```

**Expected output:**

```
[0] [server] ECP Digital Bank API running at http://localhost:3333
[1]   VITE v5.4.x  ready in xxx ms
[1]
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: http://192.168.x.x:5173/
```

The terminal will show logs from both processes interleaved (prefix `[0]` for server, `[1]` for web).

### 7.2 Start separately (2 terminals)

**Terminal 1 — API:**

```powershell
cd C:\Users\$env:USERNAME\projetos_git\ecp-digital-bank
npm run dev:server
```

**Expected output:**

```
[server] ECP Digital Bank API running at http://localhost:3333
```

**Terminal 2 — Frontend:**

```powershell
cd C:\Users\$env:USERNAME\projetos_git\ecp-digital-bank
npm run dev:web
```

**Expected output:**

```
  VITE v5.4.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 7.3 Verifications after starting

**Verify the API (PowerShell):**

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3333/health"
# Expected: @{status=ok; timestamp=2026-03-04T...}

# Test login with seed user
$body = @{
    email = "marina@email.com"
    password = "Senha@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3333/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Login OK! Token received: $($response.token.Substring(0,20))..."
# Expected: Login OK! Token received: eyJhbGciOiJIUzI1NiIs...
```

**Verify the Frontend:**

```powershell
# Open the frontend in the default browser
Start-Process "http://localhost:5173"
```

In the browser, verify:
1. The login screen appears (dark background, dark + lime theme)
2. Log in with `marina@email.com` / `Senha@123`
3. The dashboard loads with balance R$ 4,235.78
4. The sidebar shows menus: Dashboard, Statement, Pix, Cards, Payments, Profile

---

## 8. Final verification — Smoke Test

Run this script to validate all main endpoints:

```powershell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Smoke Test — ECP Digital Bank" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3333"
$passed = 0
$failed = 0

# 1. Health check
try {
    $r = Invoke-RestMethod "$baseUrl/health" -ErrorAction Stop
    if ($r.status -eq "ok") {
        Write-Host "[OK] GET /health" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FAIL] GET /health — API not running?" -ForegroundColor Red
    $failed++
}

# 2. Login
try {
    $loginBody = '{"email":"marina@email.com","password":"Senha@123"}'
    $login = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $loginBody -ErrorAction Stop
    $token = $login.token
    if ($token) {
        Write-Host "[OK] POST /api/auth/login — token received" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FAIL] POST /api/auth/login" -ForegroundColor Red
    $failed++
    Write-Host "  Aborting — without token, protected endpoints cannot be tested" -ForegroundColor Yellow
    return
}

$headers = @{ Authorization = "Bearer $token" }

# 3. Auth /me
try {
    $me = Invoke-RestMethod "$baseUrl/api/auth/me" -Headers $headers -ErrorAction Stop
    if ($me.email -eq "marina@email.com") {
        Write-Host "[OK] GET /api/auth/me — $($me.name)" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FAIL] GET /api/auth/me" -ForegroundColor Red
    $failed++
}

# 4. Account
try {
    $acc = Invoke-RestMethod "$baseUrl/api/accounts/me" -Headers $headers -ErrorAction Stop
    if ($acc.balance -gt 0) {
        Write-Host "[OK] GET /api/accounts/me — balance: $($acc.balance) cents" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FAIL] GET /api/accounts/me" -ForegroundColor Red
    $failed++
}

# 5. Pix keys
try {
    $keys = Invoke-RestMethod "$baseUrl/api/pix/keys" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/pix/keys — $($keys.Count) key(s)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] GET /api/pix/keys" -ForegroundColor Red
    $failed++
}

# 6. Transactions
try {
    $tx = Invoke-RestMethod "$baseUrl/api/transactions" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/transactions — $($tx.data.Count) transaction(s)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] GET /api/transactions" -ForegroundColor Red
    $failed++
}

# 7. Cards
try {
    $cards = Invoke-RestMethod "$baseUrl/api/cards" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/cards — $($cards.Count) card(s)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] GET /api/cards" -ForegroundColor Red
    $failed++
}

# 8. Dashboard
try {
    $dash = Invoke-RestMethod "$baseUrl/api/dashboard" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/dashboard — aggregated data OK" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] GET /api/dashboard" -ForegroundColor Red
    $failed++
}

# 9. Notifications
try {
    $notif = Invoke-RestMethod "$baseUrl/api/notifications" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/notifications — $($notif.data.Count) notification(s)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] GET /api/notifications" -ForegroundColor Red
    $failed++
}

# 10. Frontend accessible
try {
    $web = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -ErrorAction Stop
    if ($web.StatusCode -eq 200) {
        Write-Host "[OK] GET http://localhost:5173 — frontend accessible" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FAIL] Frontend not accessible at http://localhost:5173" -ForegroundColor Red
    $failed++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Result: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
```

**Expected result:**

```
========================================
 Smoke Test — ECP Digital Bank
========================================
[OK] GET /health
[OK] POST /api/auth/login — token received
[OK] GET /api/auth/me — Marina Silva
[OK] GET /api/accounts/me — balance: 423578 cents
[OK] GET /api/pix/keys — 3 key(s)
[OK] GET /api/transactions — 10 transaction(s)
[OK] GET /api/cards — 1 card(s)
[OK] GET /api/dashboard — aggregated data OK
[OK] GET /api/notifications — 5 notification(s)
[OK] GET http://localhost:5173 — frontend accessible
========================================
 Result: 10 passed, 0 failed
========================================
```

---

## 9. Useful commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts API (3333) + Frontend (5173) simultaneously |
| `npm run dev:server` | Starts only the Fastify API with hot reload |
| `npm run dev:web` | Starts only the Vite frontend with HMR |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Creates/updates tables (migrations) |
| `npm run db:seed` | Populates database with demo data |

### Tests

| Command | Description |
|---------|-------------|
| `npm test` | Runs server + web tests |
| `npm run test:watch` | Tests in watch mode (server + web) |

### Build

| Command | Description |
|---------|-------------|
| `npm run build` | Production build (server TypeScript + web Vite) |
| `npm run lint` | Checks code quality (server + web) |

### Stop the application

```powershell
# If started with npm run dev, press:
Ctrl+C

# If processes remain orphaned (Windows sometimes doesn't kill all):
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Reset the database

```powershell
# Delete the database and recreate from scratch
Remove-Item "server\database.sqlite" -ErrorAction SilentlyContinue
Remove-Item "server\database.sqlite-wal" -ErrorAction SilentlyContinue
Remove-Item "server\database.sqlite-shm" -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

---

## 10. Troubleshooting

### 10.1 Server `npm install` fails with `node-gyp`

**Symptom:**
```
gyp ERR! find Python
gyp ERR! find VS
```

**Cause:** Missing Python 3 or Visual Studio Build Tools C++.

**Solution:**

```powershell
# 1. Check Python
python --version
# If it fails: winget install Python.Python.3.12

# 2. Check Build Tools
# Open Visual Studio Installer and confirm "Desktop development with C++" workload

# 3. Configure npm
npm config set msvs_version 2022
npm config set python python

# 4. Clean cache and try again
cd server
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache clean --force
npm install
```

---

### 10.2 Port 3333 or 5173 already in use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3333
```

**Solution:**

```powershell
# Find who is using the port
netstat -ano | Select-String ":3333"
# Note the PID (last column)

# Identify the process
Get-Process -Id <PID>

# Kill the process (if safe)
Stop-Process -Id <PID> -Force

# Alternative: use another port
$env:PORT = "3334"
npm run dev:server
```

---

### 10.3 Hot reload not working

**Symptom:** Changes to `.ts`/`.tsx` files are not automatically detected.

**Solution:**

```powershell
# Create/edit the .env file in the project root
Add-Content -Path ".env" -Value "CHOKIDAR_USEPOLLING=1"

# Restart the dev server
# Ctrl+C and then:
npm run dev
```

---

### 10.4 Import error with wrong case

**Symptom:** Works locally on Windows but fails in CI (Linux).

**Cause:** Windows is case-insensitive (`Button.tsx` == `button.tsx`), Linux is not.

**Solution:** Verify that the import uses the exact case of the file name:
```typescript
// Correct:
import { Button } from './Button'

// Wrong (works on Windows, fails on Linux):
import { Button } from './button'
```

---

### 10.5 `concurrently` doesn't kill processes on stop (Ctrl+C)

**Symptom:** After Ctrl+C, Node.js processes continue running in the background.

**Solution:**

```powershell
# Kill all Node.js processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Verify they were killed
Get-Process -Name "node" -ErrorAction SilentlyContinue
# Expected: no results
```

---

### 10.6 Corrupted database or `SQLITE_BUSY`

**Symptom:** Errors like `SQLITE_BUSY` or `database is locked`.

**Solution:**

```powershell
# 1. Stop all processes that access the database
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Check for pending WAL files
Get-ChildItem "server\database.sqlite*"
# If database.sqlite-wal exists, SQLite will consolidate on next open

# 3. If database is corrupted, recreate:
Remove-Item "server\database.sqlite*" -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

---

### 10.7 Frontend shows CORS error

**Symptom:** Browser console shows `Access-Control-Allow-Origin` error.

**Cause:** The API does not recognize the frontend origin.

**Solution:**

```powershell
# Verify that CORS is configured for the correct port
# In server/.env:
# CORS_ORIGIN=http://localhost:5173

# If using a different port for the frontend:
$env:CORS_ORIGIN = "http://localhost:5174"
npm run dev:server
```

> In development with Vite, the proxy in `vite.config.ts` redirects `/api/*` to `localhost:3333`, so CORS is normally not an issue. The error appears if you access the API directly from the browser without going through the proxy.

---

### 10.8 `tsc --noEmit` fails with type errors

**Symptom:** TypeScript reports errors when compiling.

**Solution:**

```powershell
# Verify that all type dependency packages are installed
cd server && npm install && cd ..
cd web && npm install && cd ..

# Run typecheck separately to identify the problem
cd server
npx tsc --noEmit
# See specific errors

cd ..\web
npx tsc --noEmit
# See specific errors

cd ..
```

---

## Reference Stack

| Layer | Technology | Version | Port |
|-------|-----------|---------|------|
| Runtime | Node.js | 20 LTS | — |
| Package Manager | npm | 10.x | — |
| API | Fastify | 5.0 | 3333 |
| Database | SQLite3 (better-sqlite3) | — | local file |
| Validation | Zod | 3.23 | — |
| Auth | JWT (@fastify/jwt) + bcryptjs | — | — |
| Frontend | React | 18.3 | 5173 |
| Build Tool | Vite | 5.4 | 5173 |
| Routing | React Router | 6.26 | — |
| Styling | Tailwind CSS | 3.4 | — |
| Icons | Lucide React | — | — |
| Tests (server) | Jest (experimental ESM) | — | — |
| Tests (web) | Vitest | 1.6 | — |
| TypeScript | TypeScript | 5.5 | — |
