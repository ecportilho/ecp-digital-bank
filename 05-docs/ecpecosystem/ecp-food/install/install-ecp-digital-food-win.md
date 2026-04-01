# Guia de Instalacao — ECP Digital Food (Windows)

## Estrutura do Repositorio

Apos clonar, o repositorio tem a seguinte estrutura:

```
ecp-digital-food/
  00-specs/                     # Especificacoes (briefing, tech, design)
  01-strategic-context/         # Artefatos da Fase 01
  02-product-discovery/         # Artefatos da Fase 02
  03-product-delivery/          # <-- CODIGO-FONTE (server + client)
    package.json
    .env / .env.example
    server/                     # API Fastify
    client/                     # React SPA (Vite)
    data/                       # SQLite (foodflow.db)
  04-product-operation/         # Scripts de deploy, PM2, Nginx
  05-docs/                      # Documentacao
```

> **Importante:** Todos os comandos `npm` devem ser executados dentro de `03-product-delivery/`.

## Pre-requisitos

- **Node.js 20 LTS** ou superior
- **Python 3.12+** (necessario para compilar better-sqlite3 via node-gyp)
- **Visual Studio Build Tools 2022+** com workload "Desktop development with C++"
- **Git** instalado e configurado
- **PowerShell** (Windows Terminal recomendado)

## Instalacao Automatizada (Recomendado)

Execute o script PowerShell que valida pre-requisitos, instala dependencias, cria o banco e executa smoke tests:

```powershell
cd ecp-digital-food\04-product-operation
PowerShell -ExecutionPolicy Bypass -File .\ecp-digital-food-install.ps1
```

## Instalacao Manual

### 1. Clonar o Repositorio

```powershell
git clone https://github.com/ecportilho/ecp-digital-food.git
cd ecp-digital-food\03-product-delivery
```

### 2. Instalar Dependencias do Server

```powershell
# Dentro de 03-product-delivery/
npm install
```

> **Nota:** O pacote `better-sqlite3` requer compilacao nativa. No Windows, e necessario:
> 1. Visual Studio Build Tools 2022+ com workload "Desktop development with C++"
> 2. Python 3.12+
> 3. Configurar npm:
> ```powershell
> npm config set msvs_version 2022
> npm config set python python
> ```

### 3. Instalar Dependencias do Client

```powershell
cd client
npm install
cd ..
```

### 4. Configurar Variaveis de Ambiente

Copie o arquivo de exemplo e edite:

```powershell
# Dentro de 03-product-delivery/
Copy-Item .env.example .env
```

Edite o arquivo `.env` com as configuracoes locais:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
JWT_SECRET=foodflow-dev-jwt-secret-change-in-production-64chars-minimum
JWT_REFRESH_SECRET=foodflow-dev-refresh-secret-change-in-production-64chars-min
DB_PATH=./data/foodflow.db
CORS_ORIGIN=http://localhost:5174
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=dev-webhook-secret
FOODFLOW_PUBLIC_URL=http://localhost:3000
```

### 5. Criar Banco de Dados e Popular com Seeds

```powershell
# Dentro de 03-product-delivery/
npm run migrate
npm run seed
```

Isso cria o banco SQLite em `03-product-delivery/data/foodflow.db` com:
- 7 categorias (Todos, Hamburguer, Japones, Pizza, Saudavel, Massas, Brasileira)
- 6 restaurantes (Pasta & Fogo, Sushi Wave, Burger Lab, Green Bowl Co., Pizza Club 24h, Brasa & Lenha)
- 41 itens de cardapio
- 2 cupons (MVP10: 10% off; FRETEGRATIS: frete gratis)
- 3 usuarios demo:
  - Consumidor: user@foodflow.com / Us3r$Food!2026
  - Restaurante: pasta@foodflow.com / P@sta&Fogo#2026
  - Admin: admin@foodflow.com / Adm!nF00d@2026

### 6. Iniciar em Modo Desenvolvimento

Em dois terminais separados (ambos dentro de `03-product-delivery/`):

**Terminal 1 — API Fastify:**
```powershell
npm run dev
```
API disponivel em http://localhost:3000

**Terminal 2 — Frontend Vite (HMR):**
```powershell
cd client
npm run dev
```
Frontend disponivel em http://localhost:5174

### 7. Build para Producao (Opcional)

```powershell
# Dentro de 03-product-delivery/client/
npm run build

# Voltar para 03-product-delivery/ e iniciar em modo producao
cd ..
npm start
```

A aplicacao estara disponivel em http://localhost:3000 (API + SPA servidos pelo Fastify).

## Verificacao

Apos iniciar, verifique:

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health

# Categorias
Invoke-RestMethod http://localhost:3000/api/categories

# Login com usuario demo
$body = '{"email":"user@foodflow.com","password":"Us3r$Food!2026"}'
Invoke-RestMethod http://localhost:3000/api/auth/login -Method POST -ContentType "application/json" -Body $body
```

## Resolucao de Problemas

### Erro: better-sqlite3 falha na compilacao
Verifique se tem Visual Studio Build Tools com C++ e Python 3:
```powershell
npm config set msvs_version 2022
npm config set python python
npm rebuild better-sqlite3
```

### Erro: EADDRINUSE (porta ja em uso)
```powershell
# Verificar quem esta usando a porta 3000
netstat -ano | Select-String ":3000"
# Matar o processo pelo PID
Stop-Process -Id <PID> -Force
```

### Erro: Conexao com ecp-digital-bank falhou
Verifique se o banco esta acessivel na URL configurada em `ECP_BANK_API_URL` no `.env` e que as credenciais da plataforma estao corretas.

### Erro: CORS bloqueando requisicoes
Verifique se `CORS_ORIGIN` no `.env` corresponde a URL do frontend (http://localhost:5174 em dev).
