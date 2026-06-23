# Installation Guide — ECP Food

Complete deployment guide for ECP Food on Linux VPS (Ubuntu 22.04+).

---

## 1. Prerequisites

### Minimum Hardware (VPS)
- **CPU:** 1 vCPU
- **RAM:** 2 GB
- **Disk:** 20 GB SSD
- **OS:** Ubuntu 22.04 LTS or higher
- **Network:** Public IP, ports 80 and 443 open

### DNS
- A record: `food.ecportilho.com` → VPS IP
- DNS propagation confirmed (`dig food.ecportilho.com`)

### External Dependency
- ecp-digital-bank accessible at `https://bank.ecportilho.com`
- ECP Food platform account created in the bank (email + password)
- Platform PIX key configured in the bank
- Webhook secret shared between ECP Food and the bank

---

## 2. System Installation

### 2.1 Update system
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Should return v20.x.x
npm --version    # Should return 10.x.x
```

### 2.3 Install build tools (for better-sqlite3)
```bash
sudo apt install -y build-essential python3
```

### 2.4 Install PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 2.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.6 Install Certbot (SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.7 Install Git
```bash
sudo apt install -y git
```

---

## 3. Application Deploy

### 3.1 Clone repository
```bash
sudo mkdir -p /opt/foodflow
cd /opt/foodflow
git clone <REPOSITORY_URL> .
```

### 3.2 Install dependencies
```bash
npm ci
```

### 3.3 Configure environment variables
```bash
cp .env.example .env
nano .env
```

Fill in all variables:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-hex-32>
DB_PATH=./data/foodflow.db
CORS_ORIGIN=https://food.ecportilho.com

# ECP Digital Bank Integration
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=<platform-account-password>
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=<secret-shared-with-bank>
FOODFLOW_PUBLIC_URL=https://food.ecportilho.com
```

To generate secure secrets:
```bash
openssl rand -hex 32   # For JWT_SECRET
openssl rand -hex 32   # For JWT_REFRESH_SECRET
openssl rand -hex 32   # For ECP_BANK_WEBHOOK_SECRET (share with bank)
```

### 3.4 Create data directory
```bash
mkdir -p data
```

### 3.5 Build frontend
```bash
npm run build
```

Result: `client/dist/` containing the optimized React SPA.

### 3.6 Seed the database
```bash
npm run seed
```

Data created:
- 7 categories (All, Burger, Japanese, Pizza, Healthy, Pasta, Brazilian)
- 6 restaurants with gradients and emojis
- 24 menu items (4 per restaurant)
- 1 coupon (MVP10 — R$ 10 off, min R$ 80)
- 3 users:
  - Admin: `admin@foodflow.com` / `Adm!nF00d@2026`
  - Restaurant: `pasta@foodflow.com` / `P@sta&Fogo#2026`
  - Consumer: `user@foodflow.com` / `Us3r$Food!2026`

### 3.7 Register webhook in the bank
```bash
npm run register-webhook
```

This registers `https://food.ecportilho.com/api/webhooks/bank/pix-received` in ecp-digital-bank.

---

## 4. Configure PM2

### 4.1 Copy config
```bash
cp 04-product-operation/ecosystem.config.cjs /opt/foodflow/ecosystem.config.cjs
```

### 4.2 Start application
```bash
cd /opt/foodflow
pm2 start ecosystem.config.cjs --env production
```

### 4.3 Check status
```bash
pm2 status
pm2 logs foodflow --lines 20
```

### 4.4 Configure automatic startup
```bash
pm2 startup
pm2 save
```

### 4.5 Verify API responds
```bash
curl -s http://127.0.0.1:3000/api/categories | head -c 200
```

---

## 5. Configure Nginx + SSL

### 5.1 Copy Nginx config
```bash
sudo cp 04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
sudo ln -s /etc/nginx/sites-available/foodflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.2 Obtain SSL certificate
```bash
sudo certbot --nginx -d food.ecportilho.com --non-interactive --agree-tos -m admin@ecportilho.com
```

### 5.3 Test and reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.4 Verify automatic SSL renewal
```bash
sudo certbot renew --dry-run
```

### 5.5 Test HTTPS access
```bash
curl -sf https://food.ecportilho.com/api/categories
```

---

## 6. Final Verification

### Validation checklist

| Check | Command | Expected |
|-------|---------|----------|
| App running | `pm2 status` | `foodflow` with status `online` |
| API responds | `curl https://food.ecportilho.com/api/categories` | JSON with categories |
| Frontend loads | Open `https://food.ecportilho.com` in browser | React SPA rendered |
| Login works | POST `/api/auth/login` with user@foodflow.com | JWT returned |
| SSL valid | `curl -vI https://food.ecportilho.com 2>&1 \| grep "SSL certificate"` | Let's Encrypt certificate |
| Nginx logs | `tail /var/log/nginx/foodflow-access.log` | Requests logged |
| PM2 logs | `pm2 logs foodflow` | No startup errors |
| Webhook | Test PIX payment end-to-end | SSE delivers event |

---

## 7. Maintenance

### Update application
```bash
cd /opt/foodflow
git pull origin main
npm ci
npm run build
pm2 reload ecosystem.config.cjs
```

### View logs in real time
```bash
pm2 logs foodflow
```

### Monitor resources
```bash
pm2 monit
```

### Manual restart
```bash
pm2 restart foodflow
```

### Database backup
```bash
cp /opt/foodflow/data/foodflow.db /opt/foodflow/data/foodflow-backup-$(date +%Y%m%d).db
```

### Rollback
```bash
cd /opt/foodflow
git log --oneline -5            # View recent commits
git checkout <previous-commit>
npm ci
npm run build
pm2 reload ecosystem.config.cjs
```

---

## 8. Troubleshooting

### App does not start
```bash
pm2 logs foodflow --err --lines 50
# Check: does .env exist? Is DB_PATH accessible? Is port 3000 free?
```

### SQLite permission error
```bash
chown -R $(whoami):$(whoami) /opt/foodflow/data
chmod 755 /opt/foodflow/data
```

### Nginx returns 502 Bad Gateway
```bash
# Check if app is running
pm2 status
# Check if port is correct
curl http://127.0.0.1:3000/api/categories
# Check nginx logs
tail -20 /var/log/nginx/foodflow-error.log
```

### SSL not working
```bash
sudo certbot certificates              # Check status
sudo certbot renew --force-renewal     # Renew manually
sudo systemctl reload nginx
```

### Bank webhook not arriving
```bash
# Check if webhook is registered
npm run register-webhook
# Check webhook logs
pm2 logs foodflow | grep webhook
# Check if port 443 is externally accessible
curl -sf https://food.ecportilho.com/api/webhooks/bank/pix-received
# (should return 405 Method Not Allowed — POST only)
```

### High memory
```bash
pm2 monit                    # Check memory usage
pm2 restart foodflow         # Restart clears memory
# PM2 auto-restarts if it exceeds 512MB (configured in ecosystem.config.cjs)
```
