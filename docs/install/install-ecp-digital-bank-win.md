# Manual de Instalação — ECP Banco Digital (Windows 11)

> **Sistema operacional:** Windows 11
> **Terminal:** PowerShell 5.1+ ou Windows Terminal
> **Data:** Março 2026
> **Versão do projeto:** 3.0

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
   - 1.1 [Node.js](#11-nodejs)
   - 1.2 [Python 3](#12-python-3)
   - 1.3 [Visual Studio Build Tools 2022](#13-visual-studio-build-tools-2022)
   - 1.4 [Git for Windows](#14-git-for-windows)
   - 1.5 [Configuração do npm](#15-configuração-do-npm)
   - 1.6 [Habilitar caminhos longos](#16-habilitar-caminhos-longos-opcional-mas-recomendado)
2. [Clonar o repositório](#2-clonar-o-repositório)
3. [Instalar dependências](#3-instalar-dependências)
4. [Configurar variáveis de ambiente](#4-configurar-variáveis-de-ambiente)
5. [Criar o banco de dados](#5-criar-o-banco-de-dados)
6. [Popular com dados de demonstração](#6-popular-com-dados-de-demonstração-seed)
7. [Subir a aplicação](#7-subir-a-aplicação)
8. [Verificação final — Smoke Test](#8-verificação-final--smoke-test)
9. [Comandos úteis](#9-comandos-úteis)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pré-requisitos

### 1.1 Node.js

O projeto requer **Node.js 18+** (recomendado: 20 LTS).

**Instalação:**

```powershell
# Opção A — via winget
winget install OpenJS.NodeJS.LTS

# Opção B — via nvm-windows (permite múltiplas versões)
winget install CoreyButler.NVMforWindows
# Fechar e reabrir o terminal após instalar o nvm
nvm install 20
nvm use 20
```

**Verificação:**

```powershell
node --version
# Esperado: v20.x.x (qualquer versão >= 18 é aceita)

npm --version
# Esperado: 10.x.x (vem junto com o Node)
```

> Se `node` não for reconhecido, feche e reabra o terminal para que o PATH seja atualizado.

---

### 1.2 Python 3

Necessário para o `node-gyp` compilar o módulo nativo `better-sqlite3`.

**Instalação:**

```powershell
winget install Python.Python.3.12
```

> **Importante:** Durante a instalação manual (se não for via winget), marque a opção **"Add Python to PATH"**.

**Verificação:**

```powershell
python --version
# Esperado: Python 3.12.x (qualquer 3.8+ funciona)

# Se 'python' não funcionar, tente:
python3 --version

# Verificar que está no PATH:
where python
# Esperado: C:\Users\<seu-usuario>\AppData\Local\Programs\Python\Python312\python.exe (ou similar)
```

---

### 1.3 Visual Studio Build Tools 2022

Compilador C++ necessário para módulos nativos Node.js (como `better-sqlite3`).

**Instalação:**

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

Após a instalação, o **Visual Studio Installer** abre automaticamente. Se não abrir:

```powershell
# Abrir o Visual Studio Installer manualmente
Start-Process "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe"
```

No Visual Studio Installer:
1. Clique em **"Modificar"** no Build Tools 2022
2. Marque o workload **"Desenvolvimento para desktop com C++"** (Desktop development with C++)
3. Clique em **"Instalar"** e aguarde (~2-5 GB de download)

**Verificação:**

```powershell
# Verificar que o cl.exe (compilador C++) está acessível
# Abra o "Developer PowerShell for VS 2022" ou execute:
& "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" 2>$null
cl.exe 2>&1 | Select-String "Version"
# Esperado: Linha contendo "Microsoft (R) C/C++ Optimizing Compiler Version 19.x"

# Alternativa mais simples — verificar que node-gyp consegue encontrar:
npm config set msvs_version 2022
npm config get msvs_version
# Esperado: 2022
```

> Se o workload C++ não estiver instalado, `npm install` do `better-sqlite3` falhará com erros de `node-gyp`.

---

### 1.4 Git for Windows

**Instalação:**

```powershell
winget install Git.Git
```

Durante a instalação, na tela de line endings, selecione:
**"Checkout as-is, commit Unix-style line endings"**

**Verificação:**

```powershell
git --version
# Esperado: git version 2.4x.x (qualquer 2.30+ funciona)

# Verificar configuração de line endings:
git config --global core.autocrlf
# Esperado: input (ou true — ambos são aceitáveis)
```

---

### 1.5 Configuração do npm

Configurar o npm para usar o compilador correto:

```powershell
npm config set msvs_version 2022
npm config set python python
```

**Verificação:**

```powershell
npm config get msvs_version
# Esperado: 2022

npm config get python
# Esperado: python
```

---

### 1.6 Habilitar caminhos longos (opcional mas recomendado)

Node.js com `node_modules` pode gerar caminhos muito longos. No Windows, o limite padrão é 260 caracteres.

```powershell
# Executar PowerShell como ADMINISTRADOR:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

**Verificação:**

```powershell
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
# Esperado: LongPathsEnabled : 1
```

---

### Checklist de Pré-requisitos

Execute este bloco para validar tudo de uma vez:

```powershell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Checklist de Pre-requisitos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Node.js
$nodeVersion = (node --version 2>$null)
if ($nodeVersion) {
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[FALHA] Node.js nao encontrado" -ForegroundColor Red
}

# npm
$npmVersion = (npm --version 2>$null)
if ($npmVersion) {
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "[FALHA] npm nao encontrado" -ForegroundColor Red
}

# Python
$pythonVersion = (python --version 2>$null)
if ($pythonVersion) {
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "[FALHA] Python nao encontrado" -ForegroundColor Red
}

# Git
$gitVersion = (git --version 2>$null)
if ($gitVersion) {
    Write-Host "[OK] $gitVersion" -ForegroundColor Green
} else {
    Write-Host "[FALHA] Git nao encontrado" -ForegroundColor Red
}

# msvs_version
$msvs = (npm config get msvs_version 2>$null)
if ($msvs -eq "2022") {
    Write-Host "[OK] npm msvs_version: $msvs" -ForegroundColor Green
} else {
    Write-Host "[AVISO] npm msvs_version: $msvs (esperado: 2022)" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
```

Resultado esperado — tudo `[OK]` em verde:

```
========================================
 Checklist de Pre-requisitos
========================================
[OK] Node.js: v20.x.x
[OK] npm: 10.x.x
[OK] Python 3.12.x
[OK] git version 2.4x.x
[OK] npm msvs_version: 2022
========================================
```

---

## 2. Clonar o repositório

```powershell
# Navegar até a pasta onde deseja clonar
cd C:\Users\$env:USERNAME\projetos_git

# Clonar
git clone https://github.com/ecp-bank/ecp-digital-bank.git

# Entrar na pasta
cd ecp-digital-bank
```

**Verificação:**

```powershell
# Verificar que os arquivos existem
Test-Path "package.json"
# Esperado: True

Test-Path "server\package.json"
# Esperado: True

Test-Path "web\package.json"
# Esperado: True

Test-Path "tech_spec.md"
# Esperado: True

# Verificar estrutura de pastas
Get-ChildItem -Name
# Esperado:
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

## 3. Instalar dependências

A instalação acontece em 3 níveis: raiz, server e web.

```powershell
# 3.1 — Instalar dependências da raiz (concurrently)
npm install
```

**Verificação 3.1:**

```powershell
Test-Path "node_modules\concurrently"
# Esperado: True
```

```powershell
# 3.2 — Instalar dependências do server (Fastify, better-sqlite3, etc.)
cd server
npm install
```

> **Este passo compila o `better-sqlite3`** usando `node-gyp`. Se falhar, veja [Troubleshooting](#101-npm-install-do-server-falha-com-node-gyp).

**Verificação 3.2:**

```powershell
# Verificar que better-sqlite3 compilou corretamente
Test-Path "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
# Esperado: True

# Verificar que todos os pacotes estão instalados
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
# Esperado: better-sqlite3 OK

node -e "require('fastify'); console.log('fastify OK')"
# Esperado: fastify OK

node -e "require('bcryptjs'); console.log('bcryptjs OK')"
# Esperado: bcryptjs OK
```

```powershell
# 3.3 — Instalar dependências do web (React, Vite, Tailwind, etc.)
cd ..\web
npm install
```

**Verificação 3.3:**

```powershell
Test-Path "node_modules\react"
# Esperado: True

Test-Path "node_modules\vite"
# Esperado: True

# Voltar para a raiz do projeto
cd ..
```

**Alternativa — instalar tudo de uma vez:**

```powershell
# Da raiz do projeto:
npm run install:all
```

**Verificação geral:**

```powershell
# Verificar que os 3 node_modules existem
Write-Host "Raiz: $(Test-Path 'node_modules')" -ForegroundColor Cyan
Write-Host "Server: $(Test-Path 'server\node_modules')" -ForegroundColor Cyan
Write-Host "Web: $(Test-Path 'web\node_modules')" -ForegroundColor Cyan
# Esperado: todos True
```

---

## 4. Configurar variáveis de ambiente

O servidor usa variáveis de ambiente para configuração. Em desenvolvimento, os valores padrão do código já funcionam, mas é boa prática criar um arquivo `.env`.

```powershell
# Criar o arquivo .env na raiz do server/
@"
# ECP Banco Digital — Variaveis de Ambiente (Desenvolvimento)

# Servidor
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# JWT
JWT_SECRET=ecp-digital-bank-dev-secret-mude-em-producao

# Banco de Dados (caminho relativo ao server/)
DATABASE_PATH=./database.sqlite

# CORS (origem do frontend em desenvolvimento)
CORS_ORIGIN=http://localhost:5173
"@ | Out-File -Encoding utf8 -FilePath "server\.env"
```

**Verificação:**

```powershell
Test-Path "server\.env"
# Esperado: True

Get-Content "server\.env" | Select-String "PORT"
# Esperado: PORT=3333
```

> **Nota:** O Vite já está configurado com proxy em `vite.config.ts` — todas as chamadas `/api/*` do frontend são redirecionadas para `http://localhost:3333` automaticamente. Não é necessário configurar `VITE_API_URL` em desenvolvimento.

---

## 5. Criar o banco de dados

O banco de dados SQLite é criado automaticamente como um arquivo único. As migrations criam as 9 tabelas e 12 índices.

```powershell
# Executar migrations (da raiz do projeto)
npm run db:migrate
```

**Saída esperada:**

```
[migrate] Starting database migrations...
[migrate] Applied 001-initial.sql
[migrate] All migrations applied successfully.
```

**Verificação:**

```powershell
# Verificar que o arquivo do banco foi criado
Test-Path "server\database.sqlite"
# Esperado: True

# Verificar o tamanho (deve ter pelo menos alguns KB após as migrations)
$dbSize = (Get-Item "server\database.sqlite").Length
Write-Host "Tamanho do banco: $([math]::Round($dbSize/1KB, 1)) KB"
# Esperado: ~16-32 KB (tabelas vazias + índices)

# Verificar que as tabelas foram criadas (usando Node.js + better-sqlite3)
cd server
node -e "
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const tables = db.prepare(""SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__%' ORDER BY name"").all();
console.log('Tabelas criadas:', tables.length);
tables.forEach(t => console.log('  -', t.name));
db.close();
"
cd ..
```

**Saída esperada da verificação:**

```
Tabelas criadas: 9
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

## 6. Popular com dados de demonstração (Seed)

O seed cria um usuário de teste com dados completos para desenvolvimento.

```powershell
npm run db:seed
```

**Saída esperada:**

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

**Verificação:**

```powershell
# Verificar que os dados foram inseridos
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

console.log('Usuarios:', users.count);
console.log('Contas:', accounts.count);
console.log('Chaves Pix:', pixKeys.count);
console.log('Transacoes:', transactions.count);
console.log('Cartoes:', cards.count);
console.log('Notificacoes:', notifications.count);
db.close();
"
cd ..
```

**Saída esperada:**

```
Usuarios: 1
Contas: 1
Chaves Pix: 3
Transacoes: 10+
Cartoes: 1
Notificacoes: 5
```

### Dados do usuário de teste

| Campo | Valor |
|-------|-------|
| Nome | Marina Silva |
| E-mail | `marina@email.com` |
| Senha | `Senha@123` |
| CPF | 12345678900 |
| Saldo | R$ 4.235,78 |
| Cartão | **** 4242 (limite R$ 5.000) |

---

## 7. Subir a aplicação

### 7.1 Subir tudo junto (recomendado)

```powershell
# Da raiz do projeto — inicia API + Frontend simultaneamente
npm run dev
```

**Saída esperada:**

```
[0] [server] ECP Digital Bank API running at http://localhost:3333
[1]   VITE v5.4.x  ready in xxx ms
[1]
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: http://192.168.x.x:5173/
```

O terminal mostrará os logs de ambos os processos intercalados (prefixo `[0]` para server, `[1]` para web).

### 7.2 Subir separadamente (2 terminais)

**Terminal 1 — API:**

```powershell
cd C:\Users\$env:USERNAME\projetos_git\ecp-digital-bank
npm run dev:server
```

**Saída esperada:**

```
[server] ECP Digital Bank API running at http://localhost:3333
```

**Terminal 2 — Frontend:**

```powershell
cd C:\Users\$env:USERNAME\projetos_git\ecp-digital-bank
npm run dev:web
```

**Saída esperada:**

```
  VITE v5.4.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 7.3 Verificações após subir

**Verificar a API (PowerShell):**

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3333/health"
# Esperado: @{status=ok; timestamp=2026-03-04T...}

# Testar login com o usuário seed
$body = @{
    email = "marina@email.com"
    password = "Senha@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3333/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Login OK! Token recebido: $($response.token.Substring(0,20))..."
# Esperado: Login OK! Token recebido: eyJhbGciOiJIUzI1NiIs...
```

**Verificar o Frontend:**

```powershell
# Abrir o frontend no navegador padrão
Start-Process "http://localhost:5173"
```

No navegador, verificar:
1. A tela de login aparece (fundo escuro, tema dark + lime)
2. Fazer login com `marina@email.com` / `Senha@123`
3. O dashboard carrega com saldo R$ 4.235,78
4. A sidebar mostra os menus: Dashboard, Extrato, Pix, Cartões, Pagamentos, Perfil

---

## 8. Verificação final — Smoke Test

Execute este script para validar todos os endpoints principais:

```powershell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Smoke Test — ECP Banco Digital" -ForegroundColor Cyan
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
    Write-Host "[FALHA] GET /health — API nao esta rodando?" -ForegroundColor Red
    $failed++
}

# 2. Login
try {
    $loginBody = '{"email":"marina@email.com","password":"Senha@123"}'
    $login = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $loginBody -ErrorAction Stop
    $token = $login.token
    if ($token) {
        Write-Host "[OK] POST /api/auth/login — token recebido" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FALHA] POST /api/auth/login" -ForegroundColor Red
    $failed++
    Write-Host "  Abortando — sem token nao e possivel testar endpoints protegidos" -ForegroundColor Yellow
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
    Write-Host "[FALHA] GET /api/auth/me" -ForegroundColor Red
    $failed++
}

# 4. Account
try {
    $acc = Invoke-RestMethod "$baseUrl/api/accounts/me" -Headers $headers -ErrorAction Stop
    if ($acc.balance -gt 0) {
        Write-Host "[OK] GET /api/accounts/me — saldo: $($acc.balance) centavos" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FALHA] GET /api/accounts/me" -ForegroundColor Red
    $failed++
}

# 5. Pix keys
try {
    $keys = Invoke-RestMethod "$baseUrl/api/pix/keys" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/pix/keys — $($keys.Count) chave(s)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FALHA] GET /api/pix/keys" -ForegroundColor Red
    $failed++
}

# 6. Transactions
try {
    $tx = Invoke-RestMethod "$baseUrl/api/transactions" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/transactions — $($tx.data.Count) transacao(oes)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FALHA] GET /api/transactions" -ForegroundColor Red
    $failed++
}

# 7. Cards
try {
    $cards = Invoke-RestMethod "$baseUrl/api/cards" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/cards — $($cards.Count) cartao(oes)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FALHA] GET /api/cards" -ForegroundColor Red
    $failed++
}

# 8. Dashboard
try {
    $dash = Invoke-RestMethod "$baseUrl/api/dashboard" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/dashboard — dados agregados OK" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FALHA] GET /api/dashboard" -ForegroundColor Red
    $failed++
}

# 9. Notifications
try {
    $notif = Invoke-RestMethod "$baseUrl/api/notifications" -Headers $headers -ErrorAction Stop
    Write-Host "[OK] GET /api/notifications — $($notif.data.Count) notificacao(oes)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FALHA] GET /api/notifications" -ForegroundColor Red
    $failed++
}

# 10. Frontend acessivel
try {
    $web = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -ErrorAction Stop
    if ($web.StatusCode -eq 200) {
        Write-Host "[OK] GET http://localhost:5173 — frontend acessivel" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "[FALHA] Frontend nao acessivel em http://localhost:5173" -ForegroundColor Red
    $failed++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Resultado: $passed passou, $failed falhou" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
```

**Resultado esperado:**

```
========================================
 Smoke Test — ECP Banco Digital
========================================
[OK] GET /health
[OK] POST /api/auth/login — token recebido
[OK] GET /api/auth/me — Marina Silva
[OK] GET /api/accounts/me — saldo: 423578 centavos
[OK] GET /api/pix/keys — 3 chave(s)
[OK] GET /api/transactions — 10 transacao(oes)
[OK] GET /api/cards — 1 cartao(oes)
[OK] GET /api/dashboard — dados agregados OK
[OK] GET /api/notifications — 5 notificacao(oes)
[OK] GET http://localhost:5173 — frontend acessivel
========================================
 Resultado: 10 passou, 0 falhou
========================================
```

---

## 9. Comandos úteis

### Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia API (3333) + Frontend (5173) simultaneamente |
| `npm run dev:server` | Inicia apenas a API Fastify com hot reload |
| `npm run dev:web` | Inicia apenas o frontend Vite com HMR |

### Banco de dados

| Comando | Descrição |
|---------|-----------|
| `npm run db:migrate` | Cria/atualiza tabelas (migrations) |
| `npm run db:seed` | Popula banco com dados de demonstração |

### Testes

| Comando | Descrição |
|---------|-----------|
| `npm test` | Roda testes do server + web |
| `npm run test:watch` | Testes em modo watch (server + web) |

### Build

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build de produção (server TypeScript + web Vite) |
| `npm run lint` | Verifica qualidade do código (server + web) |

### Parar a aplicação

```powershell
# Se iniciou com npm run dev, pressionar:
Ctrl+C

# Se processos ficaram órfãos (Windows às vezes não mata todos):
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Resetar o banco de dados

```powershell
# Apagar o banco e recriar do zero
Remove-Item "server\database.sqlite" -ErrorAction SilentlyContinue
Remove-Item "server\database.sqlite-wal" -ErrorAction SilentlyContinue
Remove-Item "server\database.sqlite-shm" -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

---

## 10. Troubleshooting

### 10.1 `npm install` do server falha com `node-gyp`

**Sintoma:**
```
gyp ERR! find Python
gyp ERR! find VS
```

**Causa:** Falta Python 3 ou Visual Studio Build Tools C++.

**Solução:**

```powershell
# 1. Verificar Python
python --version
# Se falhar: winget install Python.Python.3.12

# 2. Verificar Build Tools
# Abrir Visual Studio Installer e confirmar workload "Desktop development with C++"

# 3. Configurar npm
npm config set msvs_version 2022
npm config set python python

# 4. Limpar cache e tentar novamente
cd server
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache clean --force
npm install
```

---

### 10.2 Porta 3333 ou 5173 ocupada

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::3333
```

**Solução:**

```powershell
# Descobrir quem está usando a porta
netstat -ano | Select-String ":3333"
# Anotar o PID (última coluna)

# Identificar o processo
Get-Process -Id <PID>

# Matar o processo (se seguro)
Stop-Process -Id <PID> -Force

# Alternativa: usar outra porta
$env:PORT = "3334"
npm run dev:server
```

---

### 10.3 Hot reload não funciona

**Sintoma:** Alterações nos arquivos `.ts`/`.tsx` não são detectadas automaticamente.

**Solução:**

```powershell
# Criar/editar o arquivo .env na raiz do projeto
Add-Content -Path ".env" -Value "CHOKIDAR_USEPOLLING=1"

# Reiniciar o dev server
# Ctrl+C e depois:
npm run dev
```

---

### 10.4 Erro de import com case errado

**Sintoma:** Funciona local no Windows mas falha no CI (Linux).

**Causa:** Windows é case-insensitive (`Button.tsx` == `button.tsx`), Linux não.

**Solução:** Verificar que o import usa o case exato do nome do arquivo:
```typescript
// Correto:
import { Button } from './Button'

// Errado (funciona no Windows, falha no Linux):
import { Button } from './button'
```

---

### 10.5 `concurrently` não mata processos ao parar (Ctrl+C)

**Sintoma:** Após Ctrl+C, os processos Node.js continuam rodando em background.

**Solução:**

```powershell
# Matar todos os processos Node.js
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Verificar que foram mortos
Get-Process -Name "node" -ErrorAction SilentlyContinue
# Esperado: nenhum resultado
```

---

### 10.6 Banco de dados corrompido ou `SQLITE_BUSY`

**Sintoma:** Erros como `SQLITE_BUSY` ou `database is locked`.

**Solução:**

```powershell
# 1. Parar todos os processos que acessam o banco
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Verificar se há arquivos WAL pendentes
Get-ChildItem "server\database.sqlite*"
# Se existir database.sqlite-wal, o SQLite vai consolidar na próxima abertura

# 3. Se o banco estiver corrompido, recriar:
Remove-Item "server\database.sqlite*" -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

---

### 10.7 Frontend mostra erro de CORS

**Sintoma:** Console do browser mostra `Access-Control-Allow-Origin` error.

**Causa:** A API não reconhece a origem do frontend.

**Solução:**

```powershell
# Verificar que o CORS está configurado para a porta correta
# No arquivo server/.env:
# CORS_ORIGIN=http://localhost:5173

# Se estiver usando outra porta para o frontend:
$env:CORS_ORIGIN = "http://localhost:5174"
npm run dev:server
```

> Em desenvolvimento com Vite, o proxy em `vite.config.ts` redireciona `/api/*` para `localhost:3333`, então CORS normalmente não é um problema. O erro aparece se você acessar a API diretamente do browser sem passar pelo proxy.

---

### 10.8 `tsc --noEmit` falha com erros de tipo

**Sintoma:** TypeScript reporta erros ao compilar.

**Solução:**

```powershell
# Verificar que todas as dependências de tipos estão instaladas
cd server && npm install && cd ..
cd web && npm install && cd ..

# Rodar o typecheck separadamente para identificar o problema
cd server
npx tsc --noEmit
# Ver os erros específicos

cd ..\web
npx tsc --noEmit
# Ver os erros específicos

cd ..
```

---

## Stack de Referência

| Camada | Tecnologia | Versão | Porta |
|--------|-----------|--------|-------|
| Runtime | Node.js | 20 LTS | — |
| Package Manager | npm | 10.x | — |
| API | Fastify | 5.0 | 3333 |
| Banco de Dados | SQLite3 (better-sqlite3) | — | arquivo local |
| Validação | Zod | 3.23 | — |
| Auth | JWT (@fastify/jwt) + bcryptjs | — | — |
| Frontend | React | 18.3 | 5173 |
| Build Tool | Vite | 5.4 | 5173 |
| Roteamento | React Router | 6.26 | — |
| Estilização | Tailwind CSS | 3.4 | — |
| Ícones | Lucide React | — | — |
| Testes (server) | Jest (experimental ESM) | — | — |
| Testes (web) | Vitest | 1.6 | — |
| TypeScript | TypeScript | 5.5 | — |
