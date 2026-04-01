# Manual de Deploy — ECP Digital Food (FoodFlow)

**Dominio:** https://food.ecportilho.com
**VPS:** Ubuntu 22.04 LTS — 191.101.78.38 (srv1477166.hstgr.cloud)
**Usuario SSH:** root

> Este manual assume que o ecp-digital-bank ja esta rodando nesta mesma VPS
> na porta 3333 com dominio https://bank.ecportilho.com.

---

## Indice

1. [Pre-requisitos](#1-pre-requisitos)
2. [Configurar DNS na GoDaddy](#2-configurar-dns-na-godaddy)
3. [Preparar o servidor](#3-preparar-o-servidor)
4. [Clonar e instalar o projeto](#4-clonar-e-instalar-o-projeto)
5. [Build do frontend](#5-build-do-frontend)
6. [Configurar variaveis de ambiente (.env)](#6-configurar-variaveis-de-ambiente-env)
7. [Seed do banco de dados](#7-seed-do-banco-de-dados)
8. [Configurar PM2 (process manager)](#8-configurar-pm2-process-manager)
9. [Configurar Nginx (reverse proxy)](#9-configurar-nginx-reverse-proxy)
10. [Gerar certificado SSL (Let's Encrypt)](#10-gerar-certificado-ssl-lets-encrypt)
11. [Ativar HTTPS no Nginx](#11-ativar-https-no-nginx)
12. [Verificacao final](#12-verificacao-final)
13. [Comandos uteis do dia a dia](#13-comandos-uteis-do-dia-a-dia)
14. [Troubleshooting](#14-troubleshooting)
15. [Atualizando o projeto (re-deploy)](#15-atualizando-o-projeto-re-deploy)

---

## 1. Pre-requisitos

O servidor precisa ter instalado:

| Software | Versao minima | Verificar com |
|----------|---------------|---------------|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| PM2 | 5+ | `pm2 -v` |
| Nginx | 1.18+ | `nginx -v` |
| Certbot | 1.21+ | `certbot --version` |
| Git | 2.34+ | `git --version` |

Se algum nao estiver instalado, siga a secao 3.

---

## 2. Configurar DNS na GoDaddy

### 2.1. Acessar o painel de DNS

1. Acesse https://dcc.godaddy.com
2. Clique no dominio **ecportilho.com**
3. Va em **DNS** > **Gerenciar DNS**

### 2.2. Criar registro A

Adicione (ou edite) o seguinte registro:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | food | 191.101.78.38 | 600 |

### 2.3. Aguardar propagacao

A propagacao DNS pode levar de 5 minutos a 2 horas.
Para verificar se ja propagou:

```bash
# No seu computador local
nslookup food.ecportilho.com

# Ou
dig food.ecportilho.com +short
```

O resultado deve ser `191.101.78.38`.

**IMPORTANTE:** Nao prossiga para o passo 10 (SSL) ate que o DNS esteja propagado.

---

## 3. Preparar o servidor

Conecte-se ao servidor:

```bash
ssh root@191.101.78.38
```

### 3.1. Atualizar pacotes do sistema

```bash
apt update && apt upgrade -y
```

### 3.2. Instalar Node.js 20 LTS (se ainda nao tiver)

```bash
# Verificar se ja tem
node -v

# Se nao tiver ou for versao antiga:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3.3. Instalar PM2 globalmente (se ainda nao tiver)

```bash
npm install -g pm2
```

### 3.4. Instalar Nginx (se ainda nao tiver)

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3.5. Instalar Certbot (se ainda nao tiver)

```bash
apt install -y certbot python3-certbot-nginx
```

### 3.6. Instalar ferramentas de build (para better-sqlite3)

O pacote `better-sqlite3` precisa compilar codigo nativo:

```bash
apt install -y build-essential python3
```

---

## 4. Clonar e instalar o projeto

### 4.1. Criar diretorio de producao

```bash
mkdir -p /opt/foodflow
```

### 4.2. Clonar o repositorio

```bash
cd /opt
git clone https://github.com/seu-usuario/ecp-digital-food.git foodflow-repo
```

> Substitua a URL pelo repositorio real. Se for repositorio privado, configure
> uma deploy key SSH ou use token de acesso pessoal.

### 4.3. Copiar o codigo da aplicacao

```bash
cp -r /opt/foodflow-repo/03-product-delivery/* /opt/foodflow/
cp -r /opt/foodflow-repo/03-product-delivery/.env.example /opt/foodflow/
```

### 4.4. Instalar dependencias do backend

```bash
cd /opt/foodflow
npm install --production
```

### 4.5. Instalar dependencias do frontend

```bash
cd /opt/foodflow/client
npm install
```

---

## 5. Build do frontend

```bash
cd /opt/foodflow/client
npm run build
```

Isso gera a pasta `/opt/foodflow/client/dist/` com os arquivos estaticos otimizados.

**Verificar:**

```bash
ls -la /opt/foodflow/client/dist/
# Deve conter: index.html, assets/, favicon.svg, manifest.json
```

---

## 6. Configurar variaveis de ambiente (.env)

### 6.1. Criar o arquivo .env

```bash
cd /opt/foodflow
cp .env.example .env
nano .env
```

### 6.2. Conteudo do .env de producao

```env
# ================================================================
# ECP Food — Variaveis de Ambiente (PRODUCAO)
# ================================================================

# Servidor
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# JWT — GERE VALORES UNICOS E SEGUROS!
# Use: openssl rand -hex 32
JWT_SECRET=COLE_AQUI_O_RESULTADO_DO_OPENSSL_RAND
JWT_REFRESH_SECRET=COLE_AQUI_OUTRO_RESULTADO_DO_OPENSSL_RAND

# Banco de Dados
DB_PATH=./data/foodflow.db

# CORS
CORS_ORIGIN=https://food.ecportilho.com

# ECP Digital Bank Integration
ECP_BANK_API_URL=http://127.0.0.1:3333/api
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=SENHA_DA_CONTA_PLATAFORMA_NO_BANCO
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=SEGREDO_COMPARTILHADO_COM_O_BANCO
FOODFLOW_PUBLIC_URL=https://food.ecportilho.com
```

### 6.3. Gerar os segredos JWT

Execute no servidor:

```bash
echo "JWT_SECRET:"
openssl rand -hex 32

echo "JWT_REFRESH_SECRET:"
openssl rand -hex 32
```

Copie os valores gerados e cole no `.env`.

### 6.4. Sobre o ECP_BANK_API_URL

Como o banco roda na mesma VPS, usamos `http://127.0.0.1:3333/api` (comunicacao local, sem passar pelo Nginx/SSL). Isso e mais rapido e seguro.

### 6.5. Sobre o ECP_BANK_PLATFORM_EMAIL / PASSWORD

Esta e a conta do FoodFlow no ecp-digital-bank. Voce precisa:

1. Criar esta conta no banco (se ainda nao existir)
2. Ou usar uma conta existente como conta plataforma
3. Esta conta recebe os pagamentos PIX dos clientes

### 6.6. Proteger o arquivo .env

```bash
chmod 600 /opt/foodflow/.env
```

---

## 7. Seed do banco de dados

### 7.1. Criar diretorio de dados

```bash
mkdir -p /opt/foodflow/data
```

### 7.2. Executar o seed

```bash
cd /opt/foodflow
node server/seed.mjs
```

**Saida esperada:**

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

### 7.3. Verificar que o banco foi criado

```bash
ls -la /opt/foodflow/data/foodflow.db
# Deve existir com ~100KB+
```

---

## 8. Configurar PM2 (process manager)

### 8.1. Copiar o ecosystem config

```bash
cp /opt/foodflow-repo/04-product-operation/ecosystem.config.cjs /opt/foodflow/ecosystem.config.cjs
```

### 8.2. Iniciar a aplicacao com PM2

```bash
cd /opt/foodflow
NODE_ENV=production pm2 start ecosystem.config.cjs --env production
```

### 8.3. Verificar que esta rodando

```bash
pm2 status
```

**Saida esperada:**

```
┌─────┬────────────┬─────────────┬─────────┬──────────┬────────┐
│ id  │ name       │ mode        │ status  │ cpu      │ memory │
├─────┼────────────┼─────────────┼─────────┼──────────┼────────┤
│ 0   │ foodflow   │ fork        │ online  │ 0%       │ ~50MB  │
└─────┴────────────┴─────────────┴─────────┴──────────┴────────┘
```

### 8.4. Testar a API diretamente

```bash
curl http://127.0.0.1:3000/api/health
```

**Resposta esperada:**

```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

### 8.5. Verificar logs

```bash
pm2 logs foodflow --lines 20
```

### 8.6. Salvar configuracao do PM2 e configurar startup

```bash
pm2 save
pm2 startup
```

O comando `pm2 startup` gera um comando que voce precisa copiar e executar.
Exemplo:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

Isso garante que o FoodFlow reinicia automaticamente se o servidor rebootar.

---

## 9. Configurar Nginx (reverse proxy)

### 9.1. Copiar a configuracao do Nginx

```bash
cp /opt/foodflow-repo/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
```

### 9.2. Criar uma versao temporaria SEM SSL (para gerar o certificado)

Antes de ter o certificado SSL, precisamos de uma config HTTP-only:

```bash
cat > /etc/nginx/sites-available/foodflow << 'NGINX'
# Configuracao temporaria — HTTP only (para Certbot gerar o SSL)
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

### 9.3. Ativar o site

```bash
ln -sf /etc/nginx/sites-available/foodflow /etc/nginx/sites-enabled/foodflow
```

### 9.4. Testar e recarregar o Nginx

```bash
nginx -t
```

Se a saida for `syntax is ok` e `test is successful`:

```bash
systemctl reload nginx
```

### 9.5. Testar acesso HTTP

Abra no navegador: http://food.ecportilho.com

Ou pelo terminal:

```bash
curl http://food.ecportilho.com/api/health
```

Se retornar o JSON de health, o Nginx esta funcionando.

---

## 10. Gerar certificado SSL (Let's Encrypt)

### 10.1. Verificar que o DNS ja propagou

```bash
dig food.ecportilho.com +short
# Deve retornar: 191.101.78.38
```

### 10.2. Gerar o certificado

```bash
certbot certonly --webroot -w /var/www/html -d food.ecportilho.com --non-interactive --agree-tos -m seu-email@dominio.com
```

> Substitua `seu-email@dominio.com` pelo seu email real.

**Saida esperada:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/food.ecportilho.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/food.ecportilho.com/privkey.pem
```

### 10.3. Verificar os arquivos do certificado

```bash
ls -la /etc/letsencrypt/live/food.ecportilho.com/
# Deve conter: fullchain.pem, privkey.pem, cert.pem, chain.pem
```

### 10.4. Configurar renovacao automatica

O Certbot ja configura automaticamente um timer/cron para renovacao.
Verifique:

```bash
certbot renew --dry-run
```

Se passar sem erros, a renovacao automatica esta funcionando.

---

## 11. Ativar HTTPS no Nginx

### 11.1. Substituir pela configuracao completa com SSL

Agora que o certificado foi gerado, substitua a config temporaria pela completa:

```bash
cp /opt/foodflow-repo/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow
```

### 11.2. Testar e recarregar

```bash
nginx -t && systemctl reload nginx
```

### 11.3. Testar HTTPS

```bash
curl https://food.ecportilho.com/api/health
```

**Resposta esperada:**

```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

### 11.4. Testar redirect HTTP -> HTTPS

```bash
curl -I http://food.ecportilho.com
```

**Resposta esperada:** `301 Moved Permanently` com `Location: https://food.ecportilho.com/`

---

## 12. Verificacao final

Execute todos os testes abaixo para confirmar que tudo esta funcionando:

### 12.1. Checklist do servidor

```bash
# 1. PM2 esta rodando?
pm2 status
# foodflow deve estar "online"

# 2. API responde?
curl https://food.ecportilho.com/api/health
# Deve retornar {"success":true,...}

# 3. Categorias carregam?
curl https://food.ecportilho.com/api/categories
# Deve retornar 7 categorias

# 4. Restaurantes carregam?
curl https://food.ecportilho.com/api/restaurants
# Deve retornar 6 restaurantes

# 5. Login funciona?
curl -X POST https://food.ecportilho.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
# Deve retornar token JWT

# 6. Integracao com banco funciona?
# (Requer que o ecp-digital-bank esteja rodando)
curl http://127.0.0.1:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
# Deve retornar token do banco

# 7. SSL valido?
echo | openssl s_client -connect food.ecportilho.com:443 -servername food.ecportilho.com 2>/dev/null | openssl x509 -noout -dates
# Deve mostrar datas de validade do certificado

# 8. Nginx logs sem erros?
tail -20 /var/log/nginx/foodflow-error.log
```

### 12.2. Testar no navegador

1. Abra https://food.ecportilho.com
2. Faca login com `marina@email.com` / `Senha@123`
3. Adicione itens ao carrinho
4. Va ao checkout
5. Selecione "Cartao de Credito" e confirme pagamento
6. Verifique no ecp-digital-bank que a compra apareceu na fatura

---

## 13. Comandos uteis do dia a dia

### PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs foodflow

# Restart (zero-downtime)
pm2 reload foodflow

# Restart forcado
pm2 restart foodflow

# Parar
pm2 stop foodflow

# Monitoramento em tempo real
pm2 monit
```

### Nginx

```bash
# Testar config
nginx -t

# Recarregar (sem downtime)
systemctl reload nginx

# Ver logs
tail -f /var/log/nginx/foodflow-access.log
tail -f /var/log/nginx/foodflow-error.log
```

### Banco de dados

```bash
# Re-seed (APAGA todos os dados e recria)
cd /opt/foodflow
node server/seed.mjs

# Backup do banco
cp /opt/foodflow/data/foodflow.db /opt/foodflow/data/foodflow-backup-$(date +%Y%m%d).db
```

### SSL

```bash
# Verificar validade do certificado
certbot certificates

# Renovar manualmente (se necessario)
certbot renew

# Testar renovacao
certbot renew --dry-run
```

---

## 14. Troubleshooting

### Erro: "Cannot find module 'better-sqlite3'"

O `better-sqlite3` precisa ser compilado na mesma arquitetura do servidor:

```bash
cd /opt/foodflow
npm rebuild better-sqlite3
```

Se persistir:

```bash
apt install -y build-essential python3
rm -rf node_modules
npm install --production
```

### Erro: "EADDRINUSE: port 3000"

Outra aplicacao esta usando a porta 3000:

```bash
# Ver qual processo usa a porta
lsof -i :3000

# Matar o processo (substitua PID)
kill -9 PID

# Reiniciar o PM2
pm2 restart foodflow
```

### Erro: "BANK_UNAVAILABLE" ou "BANK_TIMEOUT"

O ecp-digital-bank nao esta acessivel:

```bash
# Verificar se o banco esta rodando
pm2 status
# Ou:
curl http://127.0.0.1:3333/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"marina@email.com","password":"Senha@123"}'
```

Se o banco nao estiver rodando, inicie-o primeiro.

### Erro: "502 Bad Gateway" no Nginx

O Nginx nao consegue conectar ao backend:

```bash
# Verificar se o PM2 esta rodando
pm2 status

# Verificar se a porta 3000 esta escutando
ss -tlnp | grep 3000

# Ver logs do PM2
pm2 logs foodflow --lines 50
```

### Erro: "SSL certificate problem"

```bash
# Verificar certificado
certbot certificates

# Renovar se expirado
certbot renew

# Recarregar Nginx apos renovacao
systemctl reload nginx
```

### Banco de dados corrompido

```bash
# Parar a aplicacao
pm2 stop foodflow

# Remover banco e recriar
rm /opt/foodflow/data/foodflow.db
cd /opt/foodflow
node server/seed.mjs

# Reiniciar
pm2 restart foodflow
```

### Problemas de permissao

```bash
# Garantir que root (ou o usuario PM2) tem acesso
chown -R root:root /opt/foodflow
chmod 755 /opt/foodflow
chmod 600 /opt/foodflow/.env
chmod 755 /opt/foodflow/data
```

---

## 15. Atualizando o projeto (re-deploy)

Quando houver atualizacoes no codigo:

### 15.1. Puxar as mudancas

```bash
cd /opt/foodflow-repo
git pull origin main
```

### 15.2. Copiar os arquivos atualizados

```bash
# Backend
cp -r /opt/foodflow-repo/03-product-delivery/server/* /opt/foodflow/server/
cp /opt/foodflow-repo/03-product-delivery/package.json /opt/foodflow/package.json

# Frontend
cp -r /opt/foodflow-repo/03-product-delivery/client/src/* /opt/foodflow/client/src/
cp /opt/foodflow-repo/03-product-delivery/client/package.json /opt/foodflow/client/package.json
cp /opt/foodflow-repo/03-product-delivery/client/vite.config.js /opt/foodflow/client/vite.config.js
```

### 15.3. Instalar novas dependencias (se houver)

```bash
cd /opt/foodflow
npm install --production

cd /opt/foodflow/client
npm install
```

### 15.4. Rebuild do frontend

```bash
cd /opt/foodflow/client
npm run build
```

### 15.5. Reiniciar a aplicacao

```bash
pm2 reload foodflow
```

### 15.6. Verificar

```bash
pm2 logs foodflow --lines 10
curl https://food.ecportilho.com/api/health
```

---

## Arquitetura de producao

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
   |-- /assets/*  ->  /opt/foodflow/client/dist/assets/  (arquivos estaticos)
   |-- /api/*     ->  127.0.0.1:3000  (Fastify via PM2)
   |-- /*         ->  127.0.0.1:3000  (SPA fallback)
   |
   v
[PM2 — foodflow]
   |-- Node.js 20 + Fastify 4
   |-- SQLite (better-sqlite3)
   |-- /opt/foodflow/data/foodflow.db
   |
   |-- Integra com ecp-digital-bank via 127.0.0.1:3333
   v
[ecp-digital-bank :3333]  (ja instalado na mesma VPS)
```

---

## Credenciais de teste

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@foodflow.com | Adm!nF00d@2026 |
| Restaurante | pasta@foodflow.com | P@sta&Fogo#2026 |
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

> Todos os consumers sao os mesmos usuarios do ecp-digital-bank,
> com os mesmos emails, senhas e numeros de cartao de credito.

---

## Portas utilizadas nesta VPS

| Porta | Servico | Acesso |
|-------|---------|--------|
| 22 | SSH | Externo |
| 80 | Nginx HTTP (redirect) | Externo |
| 443 | Nginx HTTPS | Externo |
| 3000 | FoodFlow (Fastify) | Interno (127.0.0.1) |
| 3333 | ECP Digital Bank | Interno (127.0.0.1) |

---

*Manual gerado em 2026-03-24. Ultima atualizacao do projeto: v1.0.0*
