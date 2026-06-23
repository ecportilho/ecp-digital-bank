# Installation Guide — ECP Digital Food (Windows)

## Repository Structure

After cloning, the repository has the following structure:

```
ecp-digital-food/
  00-specs/                     # Specifications (briefing, tech, design)
  01-strategic-context/         # Phase 01 Artifacts
  02-product-discovery/         # Phase 02 Artifacts
  03-product-delivery/          # <-- SOURCE CODE (server + client)
    package.json
    .env / .env.example
    server/                     # Fastify API
    client/                     # React SPA (Vite)
    data/                       # SQLite (foodflow.db)
  04-product-operation/         # Deploy scripts, PM2, Nginx
  05-docs/                      # Documentation
```

> **Important:** All `npm` commands must be run inside `03-product-delivery/`.

## Prerequisites

- **Node.js 20 LTS** or higher
- **Python 3.12+** (required to compile better-sqlite3 via node-gyp)
- **Visual Studio Build Tools 2022+** with "Desktop development with C++" workload
- **Git** installed and configured
- **PowerShell** (Windows Terminal recommended)

## Automated Installation (Recommended)

Run the PowerShell script that validates prerequisites, installs dependencies, creates the database and runs smoke tests:

```powershell
cd ecp-digital-food\04-product-operation
PowerShell -ExecutionPolicy Bypass -File .\ecp-digital-food-install.ps1
```

## Manual Installation

### 1. Clone the Repository

```powershell
git clone https://github.com/ecportilho/ecp-digital-food.git
cd ecp-digital-food\03-product-delivery
```

### 2. Install Server Dependencies

```powershell
# Inside 03-product-delivery/
npm install
```

> **Note:** The `better-sqlite3` package requires native compilation. On Windows, you need:
> 1. Visual Studio Build Tools 2022+ with "Desktop development with C++" workload
> 2. Python 3.12+
> 3. Configure npm:
> ```powershell
> npm config set msvs_version 2022
> npm config set python python
> ```

### 3. Install Client Dependencies

```powershell
cd client
npm install
cd ..
```

### 4. Configure Environment Variables

Copy the example file and edit:

```powershell
# Inside 03-product-delivery/
Copy-Item .env.example .env
```

Edit the `.env` file with local settings:

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

### 5. Create Database and Populate with Seeds

```powershell
# Inside 03-product-delivery/
npm run migrate
npm run seed
```

This creates the SQLite database at `03-product-delivery/data/foodflow.db` with:
- 7 categories (All, Burger, Japanese, Pizza, Healthy, Pasta, Brazilian)
- 6 restaurants (Pasta & Fogo, Sushi Wave, Burger Lab, Green Bowl Co., Pizza Club 24h, Brasa & Lenha)
- 41 menu items
- 2 coupons (MVP10: 10% off; FRETEGRATIS: free delivery)
- 3 demo users:
  - Consumer: user@foodflow.com / Us3r$Food!2026
  - Restaurant: pasta@foodflow.com / P@sta&Fogo#2026
  - Admin: admin@foodflow.com / Adm!nF00d@2026

### 6. Start in Development Mode

In two separate terminals (both inside `03-product-delivery/`):

**Terminal 1 — Fastify API:**
```powershell
npm run dev
```
API available at http://localhost:3000

**Terminal 2 — Vite Frontend (HMR):**
```powershell
cd client
npm run dev
```
Frontend available at http://localhost:5174

### 7. Build for Production (Optional)

```powershell
# Inside 03-product-delivery/client/
npm run build

# Return to 03-product-delivery/ and start in production mode
cd ..
npm start
```

The application will be available at http://localhost:3000 (API + SPA served by Fastify).

## Verification

After starting, verify:

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health

# Categories
Invoke-RestMethod http://localhost:3000/api/categories

# Login with demo user
$body = '{"email":"user@foodflow.com","password":"Us3r$Food!2026"}'
Invoke-RestMethod http://localhost:3000/api/auth/login -Method POST -ContentType "application/json" -Body $body
```

## Troubleshooting

### Error: better-sqlite3 compilation fails
Check that you have Visual Studio Build Tools with C++ and Python 3:
```powershell
npm config set msvs_version 2022
npm config set python python
npm rebuild better-sqlite3
```

### Error: EADDRINUSE (port already in use)
```powershell
# Check who is using port 3000
netstat -ano | Select-String ":3000"
# Kill the process by PID
Stop-Process -Id <PID> -Force
```

### Error: Connection to ecp-digital-bank failed
Check that the bank is accessible at the URL configured in `ECP_BANK_API_URL` in `.env` and that the platform credentials are correct.

### Error: CORS blocking requests
Check that `CORS_ORIGIN` in `.env` matches the frontend URL (http://localhost:5174 in dev).
