# GMUD-FOODFLOW-001 — Deploy Inicial do FoodFlow MVP

## Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **ID** | GMUD-FOODFLOW-001 |
| **Titulo** | Deploy Inicial — FoodFlow Marketplace MVP em Producao |
| **Tipo** | Normal |
| **Prioridade** | Alta |
| **Solicitante** | ECP AI Squad — Operations Agent |
| **Data** | 2026-03-17 |
| **Risco Geral** | Baixo-Medio (10/30) |
| **Aprovacao Necessaria** | Tech Lead / Software Architect |

## Descricao

Primeiro deploy em producao do FoodFlow, marketplace premium de food delivery. Inclui backend Node.js/Fastify com API REST, frontend React SPA, banco SQLite, integracao com ecp-digital-bank para pagamentos (Cartao ECP e PIX QR Code via SSE), e configuracao de infraestrutura (PM2 + Nginx + SSL).

### Escopo

- Provisionamento de VPS Linux (Ubuntu 22.04+)
- Instalacao de Node.js 20 LTS, PM2, Nginx, Certbot
- Deploy da aplicacao FoodFlow (backend + frontend)
- Configuracao de banco SQLite com seed data (6 restaurantes, 24 itens, 3 usuarios)
- Configuracao de Nginx como reverse proxy com SSL (Let's Encrypt)
- Registro de webhook no ecp-digital-bank
- Configuracao de DNS: food.ecportilho.com -> IP do VPS

### Fora de Escopo

- Migracao de dados de sistemas legados
- Configuracao de CDN (futuro)
- Monitoramento APM (futuro — Datadog, New Relic)
- Backup automatizado de banco (manual no MVP)

## Analise de Risco

| Dimensao | Nivel | Score | Justificativa |
|----------|-------|-------|---------------|
| Impacto no Negocio | Baixo | 1 | Primeiro deploy — nao ha usuarios em producao afetados |
| Complexidade Tecnica | Medio | 3 | Stack simples, mas integracao com ecp-digital-bank via webhook/SSE adiciona complexidade |
| Reversibilidade | Baixo | 1 | VPS dedicado, rollback simples: reverter codigo + reiniciar PM2 |
| Dependencias Externas | Medio | 3 | Depende de ecp-digital-bank acessivel e DNS propagado |
| Janela de Impacto | Baixo | 1 | Deploy estimado em 30-45 minutos, sem downtime para usuarios existentes |
| Experiencia da Equipe | Baixo | 1 | Mesmo padrao de deploy do ecp-digital-banking (ja validado) |

**Risco Geral: 10/30 — Baixo-Medio**

## Plano de Rollback

**Trigger:** Health check falha apos deploy OU erro critico em pagamentos nas primeiras 2 horas.

| Step | Acao | Comando |
|------|------|---------|
| 1 | Reverter codigo | `cd /opt/foodflow && git checkout HEAD~1` |
| 2 | Reinstalar dependencias | `npm ci --production=false` |
| 3 | Rebuild frontend | `npm run build` |
| 4 | Reiniciar aplicacao | `pm2 reload ecosystem.config.cjs` |
| 5 | Verificar health | `curl -sf http://127.0.0.1:3000/api/categories` |

**Tempo estimado de rollback:** 5 minutos

**Rollback de dados:** Banco SQLite pode ser deletado e recriado com `npm run seed` (apenas dados seed no primeiro deploy).

## Janela de Mudanca

| Campo | Valor |
|-------|-------|
| **Preferida** | Sabado 10:00-12:00 BRT |
| **Backup** | Domingo 10:00-12:00 BRT |
| **Blackout** | Sexta 18:00 — Sabado 08:00 (pico de delivery) |
| **Duracao estimada** | 45 minutos |
| **Monitoramento pos-deploy** | 2 horas |

## Criterios de Sucesso

| Criterio | Validacao |
|----------|-----------|
| Aplicacao respondendo com SSL | `curl -sf https://food.ecportilho.com/` retorna HTML da SPA |
| API funcional | `GET /api/categories` retorna 200 com lista de categorias |
| Autenticacao funcional | `POST /api/auth/login` com credenciais seed retorna JWT valido |
| Integracao banco acessivel | `POST /api/payments/bank-auth` com credenciais validas retorna token |
| Webhook registrado | ecp-digital-bank aceita e confirma registro do webhook |
| PM2 estavel por 30 minutos | `pm2 status` mostra 0 restarts apos 30 minutos |

## Aprovadores

| Role | Status | Data |
|------|--------|------|
| Tech Lead / Software Architect | Pendente | — |
| Product Manager | Pendente | — |
