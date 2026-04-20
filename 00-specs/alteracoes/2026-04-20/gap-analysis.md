# Gap Analysis — ecp-digital-bank (2026-04-20)

> Análise baseada nas specs de 2026-04-20 vs. código em `03-product-delivery/app/`

## Sumário executivo

As specs v4.0 foram geradas diretamente a partir do código implementado ("as-built"), portanto a cobertura funcional está muito alta. Os gaps residuais são quase todos explicitamente reconhecidos pelas próprias specs (seção "Restrições e Não-Implementado" e seção 12 do design spec), mas valem como backlog priorizado.

- **Total de requisitos avaliados:** 48
- **Implementados:** 38 (79%)
- **Parcialmente implementados:** 7 (15%)
- **Não implementados:** 3 (6%)

**Maiores riscos / bloqueios:**
1. Autenticação reforçada (RN-03) é um placeholder — `reinforcedToken` aceito mas não há fluxo real de 2FA/biometria que o emita.
2. Webhook de crédito final do Pix recebido via QR (ECP Pay → bank) é ausente — a transação fica `pending` indefinidamente.
3. Conta PJ no backend não existe — `ProfileSwitcher` apenas redireciona para `emps.ecportilho.com`.
4. Agendamento recorrente de pagamentos ausente — `scheduledFor` é data única.
5. Categorias `transfer`, `withdrawal`, `fee` existem no enum mas não têm endpoints dedicados (TED / saque / débito automático).

---

## Backend

### ✅ Implementado

#### Autenticação & Contas
- `POST /api/auth/register` com validações CPF/e-mail/senha/telefone — `server/src/modules/auth/auth.schema.ts:3`
- `POST /api/auth/login` + JWT 7 dias — `server/src/app.ts:35`
- `GET /api/auth/me` — validação de token — rota registrada em `server/src/app.ts:49`
- Suffix randômico de 16 bytes no JWT secret por restart — `server/src/app.ts:7`
- Criação automática de conta corrente no cadastro — confirmada via `server/src/modules/auth/auth.service.ts`
- Role `consumer` / `system` em `users.role` — migration `004-user-roles.sql`
- `GET /api/accounts/me`, `GET /api/accounts/me/balance`, `PATCH /api/accounts/me/limit` — `server/src/modules/accounts/accounts.routes.ts:10,16,22`

#### Pix
- Listar / criar / soft-delete chaves — `server/src/modules/pix/pix.routes.ts:11,17,28`
- Transfer com todas as RNs (01, 02, 03, 04, 05, 10, 11) — `server/src/modules/pix/pix.service.ts:109`
- RN-02 limite noturno (`NIGHT_LIMIT_CENTS = 100000`) — `pix.service.ts:10,150`
- RN-05 limite de 5 chaves — `pix.service.ts:9,62`
- RN-10 rate limit 5 transferências / 5 min — `pix.service.ts:12-13,243`
- RN-11 prevenção de self-transfer — `pix.service.ts:122`
- `GET /api/pix/lookup` — `pix.routes.ts:60`
- `POST /api/pix/qrcode` delegando para ECP Pay — `pix.service.ts:295` + `server/src/services/ecp-pay-client.ts:43`
- `POST /api/pix/debit-by-cpf` restrito a role `system` — `pix.routes.ts:67`

#### Cartões
- Listar / detalhe / atualizar limite / bloquear — `server/src/modules/cards/cards.routes.ts:11,17,24,32`
- Fatura aberta atual — `cards.routes.ts:40`
- Registrar compra própria — `cards.routes.ts:47`
- `POST /api/cards/purchase-by-number` restrito a role `system` — `cards.routes.ts:55`

#### Pagamentos
- `POST /api/payments/boleto` com integração ECP Pay — `server/src/modules/payments/payments.service.ts:89`
- Listar e cancelar agendados — `payments.routes.ts:23,32`
- Agendamento futuro válido — `payments.service.ts:37`

#### Extrato & Dashboard
- `GET /api/transactions` + `/:id` — `server/src/modules/transactions/transactions.routes.ts:10,17`
- `GET /api/dashboard` agregador — registrado em `app.ts:57`

#### Notificações
- Listagem, unread-count, mark read, mark all-read — `server/src/modules/notifications/notifications.routes.ts:10,17,23,30`

#### Perfil (Users)
- `GET/PATCH /api/users/me` + `POST /me/change-password` — registrado em `app.ts:55`

#### Chat multi-agente
- Endpoints `POST /messages`, `GET/POST /conversations`, `GET /conversations/:id/messages`, `PATCH /archive` — `server/src/modules/chat/chat.routes.ts:15,26,33,39,54`
- Orchestrator com 15 intents + fallback para `GENERAL:OUT_OF_SCOPE` — `server/src/modules/chat/agents/orchestrator.ts:64,77`
- 6 tools: balance, statement, pix-transfer, card-create, card-block, kyc-status — `server/src/modules/chat/agents/tools/`
- 4 agentes especialistas com prompts próprios — `agents/prompts/*.prompt.ts`

#### Modelo de dados
- Todas as 12 tabelas existem conforme spec:
  - `users`, `accounts`, `pix_keys`, `transactions`, `cards`, `invoices`, `card_purchases`, `notifications`, `pix_rate_limit` — `migrations/001-initial.sql`
  - `chat_conversations`, `chat_messages`, `knowledge_base` — `migrations/002-chat.sql`
  - `transactions.metadata` — `migrations/003-ecp-pay-integration.sql`
  - `users.role` — `migrations/004-user-roles.sql`

#### Integrações
- Cliente ECP Pay com `X-API-Key`, `X-Source-App`, `X-Idempotency-Key` UUID v4 — `server/src/services/ecp-pay-client.ts:8,11,16`
- 5 operações ECP Pay: pix, boleto, card, getTransaction, refund — `ecp-pay-client.ts:42-104`

### ⚠️ Parcialmente implementado

- **RN-03 Autenticação reforçada** — o endpoint aceita o campo `reinforcedToken` (`pix.schema.ts:19`) e o service bloqueia se ausente em valores acima de R$ 5.000 (`pix.service.ts:155`), mas **não há fluxo emissor do token** (2FA/biometria/SMS/e-mail). Qualquer string não-vazia é aceita.
- **`counterpart_document` e `counterpart_institution`** — colunas existem em `transactions` (`001-initial.sql:355`) mas nunca são populadas pelo service de Pix (`pix.service.ts:209-225`).
- **`counterpart_name` do receiver no Pix** — está hard-coded como `'Remetente'` (`pix.service.ts:224`) em vez do nome real do remetente.
- **Credit final de Pix recebido via QR Code** — a transação `pending` criada em `generatePixQrCode` (`pix.service.ts:319`) não é atualizada para `completed`/creditada em lugar nenhum. A spec admite no item 9 do product briefing ("credit final via webhook está implementado parcialmente").
- **`daily_transferred_cents` reset** — o reset por mudança de dia é lazy (só no próximo transfer via `isSameDay`, `pix.service.ts:141`). Funciona, mas não há cron/job explícito para resetar à meia-noite; usuário que abre `/accounts/me` após virada de dia ainda verá o valor antigo.
- **Integração ECP Pay no boleto como best-effort** — se ECP Pay falhar, o pagamento local segue como `completed` (`payments.service.ts:107-111`). Pode gerar divergência de conciliação — não há retry / dead-letter queue.
- **Conta PJ** — o backend só tem PF. O `ProfileSwitcher` redireciona PJ para URL externa (`web/src/components/layout/ProfileSwitcher.tsx:67`). Spec menciona explicitamente como não implementado.

### ❌ Não implementado

- **TED / débito automático / saque** — enum `transactions.category` inclui `transfer`, `withdrawal`, `fee` mas não há endpoints dedicados. Referência: product briefing seção 9.
- **Cartão físico (emissão/entrega)** — `cards.type` aceita `'physical'` mas nenhum service cria/emite. Referência: product briefing seção 9.
- **Agendamento recorrente de pagamentos** — `scheduledFor` é data única. Sem `recurrence`/`frequency` em schema. Referência: product briefing seção 9.
- **Webhook ECP Pay → bank** para confirmação de Pix recebido — sem rota `/api/webhooks/ecp-pay` ou similar (busca por `webhook`/`callback` retorna vazio em `server/src/`).

---

## Frontend

### ✅ Implementado

#### Rotas (todas as 11 previstas em spec)
- `LoginPage`, `RegisterPage` — `web/src/routes/login.tsx`, `register.tsx`
- `DashboardPage`, `ExtratoPage`, `CartoesPage`, `PagamentosPage`, `PerfilPage`, `ChatPage` — `web/src/routes/*.tsx`
- Sub-rotas Pix: `enviar`, `receber`, `chaves` — `web/src/routes/pix/`
- Roteamento protegido + redirect público — `web/src/App.tsx:20,48`

#### Layout
- `Sidebar` (lg+), `Header`, `MobileNav`, `ProfileSwitcher` — `web/src/components/layout/`
- `ProtectedLayout` com ChatWidget flutuante e idle timeout — `App.tsx:20`

#### Componentes UI próprios
- `Button`, `Card`, `Input`, `Modal`, `Table`, `Badge` — `web/src/components/ui/`

#### Chat
- `ChatWidget`, `ChatMessages`, `ChatInput`, `ChatBubble` — `web/src/components/chat/`

#### Hooks
- `useAuth`, `useChat`, `useIdleTimeout` — `web/src/hooks/`

#### Idle timeout
- `useIdleTimeout` aplicado em `ProtectedLayout` — `App.tsx:24`

#### Service client
- `api.ts` com ApiError + Bearer automático — `web/src/services/api.ts`

#### Formatters
- `formatCurrency`, `formatCPF`, `formatDate`, `formatRelativeTime` — `web/src/lib/formatters.ts`

### ⚠️ Parcialmente implementado

- **ProfileSwitcher PJ** — a UI existe e o clique leva para URL externa (`emps.ecportilho.com?switch=pj`, `ProfileSwitcher.tsx:67`), mas não é uma "troca de contexto PF/PJ dentro do app". Spec descreve como "UI-only" — está correto, mas produto real exigirá integração bidirecional.
- **Classe `bg-lime-dim`** — usada em `ProfileSwitcher.tsx:72,88` mas **não existe** no `tailwind.config.ts:12` (só existem `lime.DEFAULT` e `lime.pressed`). Resultado: a classe é silenciosamente ignorada em runtime — bug visual latente.
- **Polling de notificações** — spec menciona polling a cada 30s em `Header.tsx:62` (ok). Porém, quando a aba está em background o polling continua rodando e gastando requests; não há backoff / `visibilitychange`.

### ❌ Não implementado

- Não foram encontrados gaps ❌ puros no frontend — toda rota / componente mencionado em spec existe.

---

## Design / Tokens

### ✅ Implementado

- **Paleta completa** (background, surface, secondary-bg, border, lime, lime-pressed, text-primary/secondary/tertiary, success/warning/danger/info) espelhada entre `web/tailwind.config.ts:7-23` e `web/src/styles/globals.css:5-22`.
- **Border radius** (`card: 18px`, `control: 13px`) — `tailwind.config.ts:24` e `globals.css:19-20`.
- **Tipografia Inter** — carregada via Google Fonts CDN em `web/index.html:8-11` (a spec §2 mencionava que "a inclusão concreta da Inter fica a cargo do ambiente" — na prática ESTÁ incluída via CDN).
- **Scrollbar customizada** (6px, surface/border/text-tertiary) — `globals.css:45-61`.
- **Classes globais `.card`, `.btn-primary`, `.input-field`** — `globals.css:64-114`.

### ⚠️ Parcialmente implementado

- **Sincronização manual tokens CSS ↔ Tailwind** — spec §9 reconhece que as duas fontes são sincronizadas manualmente. Risco: alterar uma e esquecer a outra (ex.: se `--color-lime` mudar no CSS, Tailwind continua com valor antigo).
- **Token `lime-dim`** — citado em 3 lugares do código (`ProfileSwitcher.tsx:72,88,95`) mas ausente de Tailwind / CSS. Ver gap no Frontend acima.
- **Font Inter como asset local** — spec §12 recomenda trazer a fonte como asset do projeto; hoje só está via CDN (depende de rede externa).

### ❌ Não implementado

- **Storybook / documentação viva de componentes** — spec §12 recomenda; não existe `.storybook/` nem docs equivalentes.
- **Tokens explícitos de spacing** — spec §12: hoje usa apenas os defaults do Tailwind; não há `spacing.card-gap`, `spacing.section`, etc.
- **Tokens de shadow** — spec usa apenas sombras inline (`shadow-lg`, `shadow-xl`, `shadow-2xl`) default do Tailwind; sem tokens customizados.

---

## Recomendações de priorização

Ordenado por impacto (negócio + risco técnico):

1. **Webhook ECP Pay → bank para crédito de Pix recebido via QR** — sem isso o recebimento fica `pending` eternamente. Criar rota `POST /api/webhooks/ecp-pay` com verificação de assinatura e atualização atômica do `transactions.status`.
2. **Fluxo real de autenticação reforçada (RN-03)** — hoje RN-03 é placeholder; em produção fraude > R$ 5.000 passa sem segunda camada. Implementar OTP via e-mail/SMS ou TOTP e emitir `reinforcedToken` com TTL curto.
3. **Corrigir `bg-lime-dim` fantasma no ProfileSwitcher** — gap visual simples. Definir `lime.dim` em `tailwind.config.ts` ou trocar pela classe existente (`lime/10`).
4. **Popular `counterpart_name` real do remetente no credit do Pix** — `pix.service.ts:224` está hardcoded `'Remetente'`; consultar `users.name` via `accounts.user_id` do sender.
5. **Popular `counterpart_document` / `counterpart_institution`** nas transações Pix — colunas existem, nunca são usadas. Importante para extrato completo e conciliação.
6. **Agendamento recorrente de pagamentos** — adicionar `recurrence` ao schema de `POST /api/payments/boleto` (daily/weekly/monthly/yearly + `endDate`) e cron/job que materialize as próximas ocorrências.
7. **Endpoints TED / saque / débito automático** — categorias já existem no enum; criar `POST /api/transfers/ted`, `POST /api/withdrawals`, `POST /api/direct-debit` ou remover as categorias mortas do enum.
8. **Retry/fila para integração ECP Pay no boleto** — hoje `payments.service.ts:107-111` engole erro do ECP Pay. Mover para job queue (mesmo que seja SQLite-backed) para reconciliar.
9. **Reset determinístico do `daily_transferred_cents`** — cron à meia-noite zerando contadores ou migrar para query com janela deslizante (`WHERE created_at > date('now')`).
10. **Conta PJ no backend** — se for prioridade de produto, projetar `accounts.type = 'pf'|'pj'`, `users.document` aceitando CNPJ, endpoints específicos. Caso contrário, remover o item PJ do ProfileSwitcher para não gerar expectativa.

---

*Relatório gerado em 20/04/2026 a partir de specs v4.0 e código em `03-product-delivery/app/`*
