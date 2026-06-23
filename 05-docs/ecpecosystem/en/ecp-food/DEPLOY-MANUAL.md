# Deploy Manual — ECP Digital Food (FoodFlow)

**Domain:** https://food.ecportilho.com
**VPS:** Ubuntu 22.04 LTS — 191.101.78.38 (srv1477166.hstgr.cloud)
**SSH User:** root

> This manual assumes that ecp-digital-bank is already running on the same VPS
> on port 3333 with domain https://bank.ecportilho.com.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Configure DNS on GoDaddy](#2-configure-dns-on-godaddy)
3. [Prepare the server](#3-prepare-the-server)
4. [Clone and install the project](#4-clone-and-install-the-project)
5. [Build the frontend](#5-build-the-frontend)
6. [Configure environment variables (.env)](#6-configure-environment-variables-env)
7. [Database seed](#7-database-seed)
8. [Configure PM2 (process manager)](#8-configure-pm2-process-manager)
9. [Configure Nginx (reverse proxy)](#9-configure-nginx-reverse-proxy)
10. [Generate SSL certificate (Let's Encrypt)](#10-generate-ssl-certificate-lets-encrypt)
11. [Activate HTTPS in Nginx](#11-activate-https-in-nginx)
12. [Final verification](#12-final-verification)
13. [Useful day-to-day commands](#13-useful-day-to-day-commands)
14. [Troubleshooting](#14-troubleshooting)
15. [Updating the project (re-deploy)](#15-updating-the-project-re-deploy)

---

## 1. Prerequisites

The server needs to have installed:

| Software | Minimum version | Check with |
|----------|----------------|------------|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| PM2 | 5+ | `pm2 -v` |
| Nginx | 1.18+ | `nginx -v` |
| Certbot | 1.21+ | `certbot --version` |
| Git | 2.34+ | `git --version` |

If any is not installed, follow section 3.

---

## 2. Configure DNS on GoDaddy

### 2.1. Access the DNS panel

1. Go to https://dcc.godaddy.com
2. Click on domain **ecportilho.com**
3. Go to **DNS** > **Manage DNS**

### 2.2. Create A record

Add (or edit) the following record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | food | 191.101.78.38 | 600 |

### 2.3. Wait for propagation

DNS propagation can take from 5 minutes to 2 hours.
To check if it has propagated:

```bash
# On your local computer
nslookup food.ecportilho.com

# Or
dig food.ecportilho.com +short
```

The result should be `191.101.78.38`.

**IMPORTANT:** Do not proceed to step 10 (SSL) until DNS has propagated.

---

## 3. Prepare the server

Connect to the server:

```bash
ssh root@191.101.78.38
```

### 3.1. Update system packages

```bash
apt update && apt upgrade -y
```

### 3.2. Install Node.js 20 LTS (if not already installed)

```bash
# Check if already installed
node -v

# If not installed or old version:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3.3. Install PM2 globally (if not already installed)

```bash
npm install -g pm2
```

### 3.4. Install Nginx (if not already installed)

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3.5. Install Certbot (if not already installed)

```bash
apt install -y certbot python3-certbot-nginx
```

### 3.6. Install build tools (for better-sqlite3)

The `better-sqlite3` package needs to compile native code:

```bash
apt install -y build-essential python3
```

---

## 4. Clone and install the project

### 4.1. Create production directory

```bash
mkdir -p /opt/foodflow
```

### 4.2. Clone the repository

```bash
cd /opt
git clone https://github.com/seu-usuario/ecp-digital-food.git foodflow-repo
```

> Replace the URL with the real repository. For private repositories, configure
> an SSH deploy key or use a personal access token.

### 4.3. Copy application code

```bash
cp -r /opt/foodflow-repo/03-product-delivery/* /opt/foodflow/
cp -r /opt/foodflow-repo/03-product-delivery/.env.example /opt/foodflow/
```

### 4.4. Install backend dependencies

```bash
cd /opt/foodflow
npm install --production
```

### 4.5. Install frontend dependencies

```bash
cd /opt/foodflow/client
npm install
```

---

## 5. Build the frontend

```bash
cd /opt/foodflow/client
npm run build
```

This generates the `/opt/foodflow/client/dist/` folder with optimized static files.

**Verify:**

```bash
ls -la /opt/foodflow/client/dist/
# Should contain: index.html, assets/, favicon.svg, manifest.json
```

---

## 6. Configure environment variables (.env)

### 6.1. Create the .env file

```bash
cd /opt/foodflow
cp .env.example .env
nano .env
```

### 6.2. Production .env content

```env
# ================================================================
# ECP Food — Environment Variables (PRODUCTION)
# ================================================================

# Server
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# JWT — GENERATE UNIQUE AND SECURE VALUES!
# Use: openssl rand -hex 32
JWT_SECRET=PASTE_OPENSSL_RAND_RESULT_HERE
JWT_REFRESH_SECRET=PASTE_ANOTHER_OPENSSL_RAND_RESULT_HERE

# Database
DB_PATH=./data/foodflow.db

# CORS
CORS_ORIGIN=https://food.ecportilho.com

# ECP Digital Bank Integration
ECP_BANK_API_URL=http://127.0.0.1:3333/api
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=PLATFORM_ACCOUNT_PASSWORD_IN_BANK
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=SECRET_SHARED_WITH_BANK
FOODFLOW_PUBLIC_URL=https://food.ecportilho.com
```

### 6.3. Generate JWT secrets

Run on the server:

```bash
echo "JWT_SECRET:"
openssl rand -hex 32

echo "JWT_REFRESH_SECRET:"
openssl rand -hex 32
```

Copy the generated values and paste them into `.env`.

### 6.4. About ECP_BANK_API_URL

Since the bank runs on the same VPS, we use `http://127.0.0.1:3333/api` (local communication, without going through Nginx/SSL). This is faster and more secure.

### 6.5. About ECP_BANK_PLATFORM_EMAIL / PASSWORD

This is FoodFlow's account in ecp-digital-bank. You need to:

1. Create this account in the bank (if it doesn't exist yet)
2. Or use an existing account as the platform account
3. This account receives PIX payments from customers

### 6.6. Protect the .env file

```bash
chmod 600 /opt/foodflow/.env
```

---

## 7. Database seed

### 7.1. Create data directory

```bash
mkdir -p /opt/foodflow/data
```

### 7.2. Run seed

```bash
cd /opt/foodflow
node server/seed.mjs
```

**Expected output:**

```
Seeding database...
  -> 7 categories seeded
  -> 6 restaurants seeded
  -> 41 menu items seeded
  -> 2 coupons seeded (MVP10, FRETEGRATIS)
  -> 13 users seeded (admin, restaurant, 11 consumers synced with ecp-digital-bank)
  -> 11 credit cards pre-registered
  -> 1 address seeded for Marina Silva

Seed complete!
```

### 7.3. Verify the database was created

```bash
ls -la /opt/foodflow/data/foodflow.db
# Should exist with ~100KB+
```

---

## 8. Configure PM2 (process manager)

### 8.1. Copy the ecosystem config

```bash
cp /opt/foodflow-repo/04-product-operation/ecosystem.config.cjs /opt/foodflow/ecosystem.config.cjs
```

### 8.2. Start the application with PM2

```bash
cd /opt/foodflow
NODE_ENV=production pm2 start ecosystem.config.cjs --env production
```

### 8.3. Verify it is running

```bash
pm2 status
```

**Expected output:**

```
┌─────┬────────────┬─────────────┬─────────┬──────────┬────────┐
│ id  │ name       │ mode        │ status  │ cpu      │ memory │
├─────┼────────────┼─────────────┼─────────┼──────────┼────────┤
│ 0   │ foodflow   │ fork        │ online  │ 0%       │ ~50MB  │
└─────┴────────────┴─────────────┴─────────┴──────────┴────────┘
```

### 8.4. Test the API directly

```bash
curl http://127.0.0.1:3000/api/health
```

**Expected response:**

```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

### 8.5. Check logs

```bash
pm2 logs foodflow --lines 20
```

### 8.6. Save PM2 configuration and configure startup

```bash
pm2 save
pm2 startup
```

The `pm2 startup` command generates a command you need to copy and run.
Example:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

This ensures FoodFlow automatically restarts if the server reboots.

---

## 9. Configure Nginx (reverse proxy)

### 9.1. Copy the Nginx configuration

```bash
cp /opt/foodflow-repo/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
```

### 9.2. Create a temporary version WITHOUT SSL (to generate the certificate)

Before having the SSL certificate, we need an HTTP-only config:

```bash
cat > /etc/nginx/sites-available/foodflow << 'NGINX'
# Temporary configuration — HTTP only (for Certbot to generate SSL)
upstream foodflow_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name food.ecportilho.com;

    # Certbot validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # API
    location /api/ {
        proxy_pass http://foodflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # SPA
    location / {
        proxy_pass http://foodflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
NGINX
```

### 9.3. Enable the site

```bash
ln -sf /etc/nginx/sites-available/foodflow /etc/nginx/sites-enabled/foodflow
```

### 9.4. Test and reload Nginx

```bash
nginx -t
```

If the output is `syntax is ok` and `test is successful`:

```bash
systemctl reload nginx
```

### 9.5. Test HTTP access

Open in browser: http://food.ecportilho.com

Or via terminal:

```bash
curl http://food.ecportilho.com/api/health
```

If it returns the health JSON, Nginx is working.

---

## 10. Generate SSL certificate (Let's Encrypt)

### 10.1. Verify DNS has propagated

```bash
dig food.ecportilho.com +short
# Should return: 191.101.78.38
```

### 10.2. Generate the certificate

```bash
certbot certonly --webroot -w /var/www/html -d food.ecportilho.com --non-interactive --agree-tos -m your-email@domain.com
```

> Replace `your-email@domain.com` with your real email.

**Expected output:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/food.ecportilho.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/food.ecportilho.com/privkey.pem
```

### 10.3. Verify certificate files

```bash
ls -la /etc/letsencrypt/live/food.ecportilho.com/
# Should contain: fullchain.pem, privkey.pem, cert.pem, chain.pem
```

### 10.4. Configure automatic renewal

Certbot automatically configures a timer/cron for renewal.
Verify:

```bash
certbot renew --dry-run
```

If it passes without errors, automatic renewal is working.

---

## 11. Activate HTTPS in Nginx

### 11.1. Replace with the full SSL configuration

Now that the certificate was generated, replace the temporary config with the full one:

```bash
cp /opt/foodflow-repo/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
```

### 11.2. Test and reload

```bash
nginx -t && systemctl reload nginx
```

### 11.3. Test HTTPS

```bash
curl https://food.ecportilho.com/api/health
```

**Expected response:**

```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

### 11.4. Test HTTP -> HTTPS redirect

```bash
curl -I http://food.ecportilho.com
```

**Expected response:** `301 Moved Permanently` with `Location: https://food.ecportilho.com/`

---

## 12. Final verification

Run all tests below to confirm everything is working:

### 12.1. Server checklist

```bash
# 1. Is PM2 running?
pm2 status
# foodflow should be "online"

# 2. Does the API respond?
curl https://food.ecportilho.com/api/health
# Should return {"success":true,...}

# 3. Do categories load?
curl https://food.ecportilho.com/api/categories
# Should return 7 categories

# 4. Do restaurants load?
curl https://food.ecportilho.com/api/restaurants
# Should return 6 restaurants

# 5. Does login work?
curl -X POST https://food.ecportilho.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
# Should return JWT token

# 6. Does bank integration work?
# (Requires ecp-digital-bank to be running)
curl http://127.0.0.1:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
# Should return bank token

# 7. Is SSL valid?
echo | openssl s_client -connect food.ecportilho.com:443 -servername food.ecportilho.com 2>/dev/null | openssl x509 -noout -dates
# Should show certificate validity dates

# 8. No Nginx error logs?
tail -20 /var/log/nginx/foodflow-error.log
```

### 12.2. Test in browser

1. Open https://food.ecportilho.com
2. Log in with `marina@email.com` / `Senha@123`
3. Add items to cart
4. Go to checkout
5. Select "Credit Card" and confirm payment
6. Check in ecp-digital-bank that the purchase appears on the bill

---

## 13. Useful day-to-day commands

### PM2

```bash
# Check status
pm2 status

# View logs in real time
pm2 logs foodflow

# Restart (zero-downtime)
pm2 reload foodflow

# Forced restart
pm2 restart foodflow

# Stop
pm2 stop foodflow

# Real-time monitoring
pm2 monit
```

### Nginx

```bash
# Test config
nginx -t

# Reload (no downtime)
systemctl reload nginx

# View logs
tail -f /var/log/nginx/foodflow-access.log
tail -f /var/log/nginx/foodflow-error.log
```

### Database

```bash
# Re-seed (DELETES all data and recreates)
cd /opt/foodflow
node server/seed.mjs

# Database backup
cp /opt/foodflow/data/foodflow.db /opt/foodflow/data/foodflow-backup-$(date +%Y%m%d).db
```

### SSL

```bash
# Check certificate validity
certbot certificates

# Renew manually (if needed)
certbot renew

# Test renewal
certbot renew --dry-run
```

---

## 14. Troubleshooting

### Error: "Cannot find module 'better-sqlite3'"

The `better-sqlite3` package needs to be compiled on the same server architecture:

```bash
cd /opt/foodflow
npm rebuild better-sqlite3
```

If it persists:

```bash
apt install -y build-essential python3
rm -rf node_modules
npm install --production
```

### Error: "EADDRINUSE: port 3000"

Another application is using port 3000:

```bash
# Find which process uses the port
lsof -i :3000

# Kill the process (replace PID)
kill -9 PID

# Restart PM2
pm2 restart foodflow
```

### Error: "BANK_UNAVAILABLE" or "BANK_TIMEOUT"

The ecp-digital-bank is not accessible:

```bash
# Check if the bank is running
pm2 status
# Or:
curl http://127.0.0.1:3333/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
```

If the bank is not running, start it first.

### Error: "502 Bad Gateway" in Nginx

Nginx cannot connect to the backend:

```bash
# Check if PM2 is running
pm2 status

# Check if port 3000 is listening
ss -tlnp | grep 3000

# View PM2 logs
pm2 logs foodflow --lines 50
```

### Error: "SSL certificate problem"

```bash
# Check certificate
certbot certificates

# Renew if expired
certbot renew

# Reload Nginx after renewal
systemctl reload nginx
```

### Corrupted database

```bash
# Stop the application
pm2 stop foodflow

# Remove database and recreate
rm /opt/foodflow/data/foodflow.db
cd /opt/foodflow
node server/seed.mjs

# Restart
pm2 restart foodflow
```

### Permission issues

```bash
# Ensure root (or PM2 user) has access
chown -R root:root /opt/foodflow
chmod 755 /opt/foodflow
chmod 600 /opt/foodflow/.env
chmod 755 /opt/foodflow/data
```

---

## 15. Updating the project (re-deploy)

When there are code updates:

### 15.1. Pull changes

```bash
cd /opt/foodflow-repo
git pull origin main
```

### 15.2. Copy updated files

```bash
# Backend
cp -r /opt/foodflow-repo/03-product-delivery/server/* /opt/foodflow/server/
cp /opt/foodflow-repo/03-product-delivery/package.json /opt/foodflow/package.json

# Frontend
cp -r /opt/foodflow-repo/03-product-delivery/client/src/* /opt/foodflow/client/src/
cp /opt/foodflow-repo/03-product-delivery/client/package.json /opt/foodflow/client/package.json
cp /opt/foodflow-repo/03-product-delivery/client/vite.config.js /opt/foodflow/client/vite.config.js
```

### 15.3. Install new dependencies (if any)

```bash
cd /opt/foodflow
npm install --production

cd /opt/foodflow/client
npm install
```

### 15.4. Rebuild frontend

```bash
cd /opt/foodflow/client
npm run build
```

### 15.5. Restart the application

```bash
pm2 reload foodflow
```

### 15.6. Verify

```bash
pm2 logs foodflow --lines 10
curl https://food.ecportilho.com/api/health
```

---

## Production Architecture

```
Internet
   |
   v
[GoDaddy DNS]
food.ecportilho.com -> 191.101.78.38
   |
   v
[Nginx :443 SSL/TLS]
   |
   |-- /assets/*  ->  /opt/foodflow/client/dist/assets/  (static files)
   |-- /api/*     ->  127.0.0.1:3000  (Fastify via PM2)
   |-- /*         ->  127.0.0.1:3000  (SPA fallback)
   |
   v
[PM2 — foodflow]
   |-- Node.js 20 + Fastify 4
   |-- SQLite (better-sqlite3)
   |-- /opt/foodflow/data/foodflow.db
   |
   |-- Integrates with ecp-digital-bank via 127.0.0.1:3333
   v
[ecp-digital-bank :3333]  (already installed on the same VPS)
```

---

## Test Credentials

| Type | Email | Password |
|------|-------|----------|
| Admin | admin@foodflow.com | Adm!nF00d@2026 |
| Restaurant | pasta@foodflow.com | P@sta&Fogo#2026 |
| Consumer | marina@email.com | Senha@123 |
| Consumer | carlos.mendes@email.com | Senha@123 |
| Consumer | aisha.santos@email.com | Senha@123 |
| Consumer | roberto.tanaka@email.com | Senha@123 |
| Consumer | francisca.lima@email.com | Senha@123 |
| Consumer | lucas.ndongo@email.com | Senha@123 |
| Consumer | patricia.werneck@email.com | Senha@123 |
| Consumer | davi.ribeiro@email.com | Senha@123 |
| Consumer | camila.duarte@email.com | Senha@123 |
| Consumer | mohammad.khalil@email.com | Senha@123 |
| Consumer | yuki.prado@email.com | Senha@123 |

> All consumers are the same users as in ecp-digital-bank,
> with the same emails, passwords and credit card numbers.

---

## Ports used on this VPS

| Port | Service | Access |
|------|---------|--------|
| 22 | SSH | External |
| 80 | Nginx HTTP (redirect) | External |
| 443 | Nginx HTTPS | External |
| 3000 | FoodFlow (Fastify) | Internal (127.0.0.1) |
| 3333 | ECP Digital Bank | Internal (127.0.0.1) |

---

*Manual generated on 2026-03-24. Last project update: v1.0.0*
