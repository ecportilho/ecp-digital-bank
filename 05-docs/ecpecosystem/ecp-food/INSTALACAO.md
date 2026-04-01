# Guia de Instalação — ECP Food

Guia completo para deploy do ECP Food em VPS Linux (Ubuntu 22.04+).

---

## 1. Pré-requisitos

### Hardware Mínimo (VPS)
- **CPU:** 1 vCPU
- **RAM:** 2 GB
- **Disco:** 20 GB SSD
- **OS:** Ubuntu 22.04 LTS ou superior
- **Rede:** IP público, portas 80 e 443 abertas

### DNS
- Registro A: `food.ecportilho.com` → IP do VPS
- Propagação DNS confirmada (`dig food.ecportilho.com`)

### Dependência Externa
- ecp-digital-bank acessível em `https://bank.ecportilho.com`
- Conta da plataforma ECP Food criada no banco (email + senha)
- Chave PIX da plataforma configurada no banco
- Webhook secret compartilhado entre ECP Food e banco

---

## 2. Instalação do Sistema

### 2.1 Atualizar sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Instalar Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Deve retornar v20.x.x
npm --version    # Deve retornar 10.x.x
```

### 2.3 Instalar build tools (para better-sqlite3)
```bash
sudo apt install -y build-essential python3
```

### 2.4 Instalar PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 2.5 Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.6 Instalar Certbot (SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.7 Instalar Git
```bash
sudo apt install -y git
```

---

## 3. Deploy da Aplicação

### 3.1 Clonar repositório
```bash
sudo mkdir -p /opt/foodflow
cd /opt/foodflow
git clone <URL_DO_REPOSITORIO> .
```

### 3.2 Instalar dependências
```bash
npm ci
```

### 3.3 Configurar variáveis de ambiente
```bash
cp .env.example .env
nano .env
```

Preencher todas as variáveis:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=<gerar-com-openssl-rand-hex-32>
JWT_REFRESH_SECRET=<gerar-com-openssl-rand-hex-32>
DB_PATH=./data/foodflow.db
CORS_ORIGIN=https://food.ecportilho.com

# ECP Digital Bank Integration
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=<senha-da-conta-plataforma>
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=<secret-compartilhado-com-banco>
FOODFLOW_PUBLIC_URL=https://food.ecportilho.com
```

Para gerar secrets seguros:
```bash
openssl rand -hex 32   # Para JWT_SECRET
openssl rand -hex 32   # Para JWT_REFRESH_SECRET
openssl rand -hex 32   # Para ECP_BANK_WEBHOOK_SECRET (compartilhar com banco)
```

### 3.4 Criar diretório de dados
```bash
mkdir -p data
```

### 3.5 Build do frontend
```bash
npm run build
```

Resultado: `client/dist/` contendo a SPA React otimizada.

### 3.6 Seed do banco de dados
```bash
npm run seed
```

Dados criados:
- 7 categorias (Todos, Hamburguer, Japonês, Pizza, Saudável, Massas, Brasileira)
- 6 restaurantes com gradients e emojis
- 24 itens de cardápio (4 por restaurante)
- 1 cupom (MVP10 — R$ 10 off, min R$ 80)
- 3 usuários:
  - Admin: `admin@foodflow.com` / `Adm!nF00d@2026`
  - Restaurante: `pasta@foodflow.com` / `P@sta&Fogo#2026`
  - Consumidor: `user@foodflow.com` / `Us3r$Food!2026`

### 3.7 Registrar webhook no banco
```bash
npm run register-webhook
```

Isso registra `https://food.ecportilho.com/api/webhooks/bank/pix-received` no ecp-digital-bank.

---

## 4. Configurar PM2

### 4.1 Copiar config
```bash
cp 04-product-operation/ecosystem.config.cjs /opt/foodflow/ecosystem.config.cjs
```

### 4.2 Iniciar aplicação
```bash
cd /opt/foodflow
pm2 start ecosystem.config.cjs --env production
```

### 4.3 Verificar status
```bash
pm2 status
pm2 logs foodflow --lines 20
```

### 4.4 Configurar startup automático
```bash
pm2 startup
pm2 save
```

### 4.5 Verificar que a API responde
```bash
curl -s http://127.0.0.1:3000/api/categories | head -c 200
```

---

## 5. Configurar Nginx + SSL

### 5.1 Copiar config do Nginx
```bash
sudo cp 04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
sudo ln -s /etc/nginx/sites-available/foodflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.2 Obter certificado SSL
```bash
sudo certbot --nginx -d food.ecportilho.com --non-interactive --agree-tos -m admin@ecportilho.com
```

### 5.3 Testar e recarregar Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.4 Verificar renovação automática do SSL
```bash
sudo certbot renew --dry-run
```

### 5.5 Testar acesso HTTPS
```bash
curl -sf https://food.ecportilho.com/api/categories
```

---

## 6. Verificação Final

### Checklist de validação

| Verificação | Comando | Esperado |
|------------|---------|----------|
| App rodando | `pm2 status` | `foodflow` com status `online` |
| API responde | `curl https://food.ecportilho.com/api/categories` | JSON com categorias |
| Frontend carrega | Abrir `https://food.ecportilho.com` no browser | SPA React renderizada |
| Login funciona | POST `/api/auth/login` com user@foodflow.com | JWT retornado |
| SSL válido | `curl -vI https://food.ecportilho.com 2>&1 \| grep "SSL certificate"` | Certificado Let's Encrypt |
| Nginx logs | `tail /var/log/nginx/foodflow-access.log` | Requisições logadas |
| PM2 logs | `pm2 logs foodflow` | Sem erros de startup |
| Webhook | Testar pagamento PIX end-to-end | SSE entrega evento |

---

## 7. Manutenção

### Atualizar aplicação
```bash
cd /opt/foodflow
git pull origin main
npm ci
npm run build
pm2 reload ecosystem.config.cjs
```

### Ver logs em tempo real
```bash
pm2 logs foodflow
```

### Monitorar recursos
```bash
pm2 monit
```

### Restart manual
```bash
pm2 restart foodflow
```

### Backup do banco
```bash
cp /opt/foodflow/data/foodflow.db /opt/foodflow/data/foodflow-backup-$(date +%Y%m%d).db
```

### Rollback
```bash
cd /opt/foodflow
git log --oneline -5            # Ver commits recentes
git checkout <commit-anterior>
npm ci
npm run build
pm2 reload ecosystem.config.cjs
```

---

## 8. Troubleshooting

### App não inicia
```bash
pm2 logs foodflow --err --lines 50
# Verificar: .env existe? DB_PATH acessível? Porta 3000 livre?
```

### Erro de permissão no SQLite
```bash
chown -R $(whoami):$(whoami) /opt/foodflow/data
chmod 755 /opt/foodflow/data
```

### Nginx retorna 502 Bad Gateway
```bash
# Verificar se a app está rodando
pm2 status
# Verificar se a porta está correta
curl http://127.0.0.1:3000/api/categories
# Verificar logs do nginx
tail -20 /var/log/nginx/foodflow-error.log
```

### SSL não funciona
```bash
sudo certbot certificates              # Verificar status
sudo certbot renew --force-renewal     # Renovar manualmente
sudo systemctl reload nginx
```

### Webhook do banco não chega
```bash
# Verificar se o webhook está registrado
npm run register-webhook
# Verificar logs de webhook
pm2 logs foodflow | grep webhook
# Verificar se a porta 443 está acessível externamente
curl -sf https://food.ecportilho.com/api/webhooks/bank/pix-received
# (deve retornar 405 Method Not Allowed — POST only)
```

### Memória alta
```bash
pm2 monit                    # Ver uso de memória
pm2 restart foodflow         # Restart limpa memória
# PM2 reinicia automaticamente se ultrapassar 512MB (configurado no ecosystem.config.cjs)
```
