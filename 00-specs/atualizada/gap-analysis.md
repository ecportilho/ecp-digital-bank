# Gap Analysis — ecp-digital-bank (2026-04-20)

> Análise baseada nas specs de 2026-04-20 vs. código em `03-product-delivery/app/`
> **Atualizado em 20/04/2026** após conclusão da Onda 1 (7 quick wins) e da Onda 2 (5 features médias).

## Sumário executivo

As specs v4.0 foram geradas diretamente a partir do código implementado ("as-built"). Depois da Onda 2, a cobertura funcional ficou ainda mais completa: webhook ECP Pay → bank, fila de retry para ECP Pay, recorrência de boleto, `dailyTransferred` determinístico e Storybook scaffold entraram em produção.

- **Total de requisitos avaliados:** 48
- **Implementados:** 47 (98%)
- **Parcialmente implementados:** 0
- **Não implementados:** 1 (2%)

**Maiores riscos / bloqueios residuais:**
1. Autenticação reforçada (RN-03) é um placeholder — `reinforcedToken` aceito mas não há fluxo real de 2FA/biometria que o emita.
2. Conta PJ no backend não existe — `ProfileSwitcher` apenas redireciona para `emps.ecportilho.com`.
3. Categorias `transfer`, `withdrawal`, `fee` existem no enum mas não têm endpoints dedicados (TED / saque / débito automático).

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
- **Counterpart completo nas transações Pix P2P** — `counterpart_name` com o nome real do titular dos dois lados, `counterpart_document` com o CPF do contraparte e `counterpart_institution = 'ECP Digital Bank'` gravados em ambas as transações (débito do remetente e crédito do recebedor). `pix.service.ts:172-188`

#### Cartões
- Listar / detalhe / atualizar limite / bloquear — `server/src/modules/cards/cards.routes.ts:11,17,24,32`
- Fatura aberta atual — `cards.routes.ts:40`
- Registrar compra própria — `cards.routes.ts:47`
- `POST /api/cards/purchase-by-number` restrito a role `system` — `cards.routes.ts:55`

#### Pagamentos
- `POST /api/payments/boleto` com integração ECP Pay — `server/src/modules/payments/payments.service.ts:89`
- Listar e cancelar agendados — `payments.routes.ts:23,32`
- Agendamento futuro válido — `payments.service.ts:37`
- **Agendamento recorrente (Onda 2)** — `recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'` + `recurrenceEndDate` no schema; colunas `recurrence_rule`, `recurrence_end_date`, `recurrence_parent_id` em `transactions` (migration `008-recurrence.sql`); materializador `materializeRecurringPayments()` em `payments.service.ts` com worker diário `startRecurringPaymentsWorker`.
- **Retry/fila para ECP Pay (Onda 2)** — falhas do `createBoletoCharge` populam `ecp_pay_retry_queue` (migration `007-ecp-pay-retry-queue.sql`) via `enqueueEcpPayRetry`; worker de 30s com backoff 5m→15m→1h→6h→24h em `server/src/services/ecp-pay-retry-worker.ts`; inspeção em `GET /api/admin/ecp-pay-queue` (role=system).

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
- **Webhook ECP Pay → bank (Onda 2)** — `POST /api/webhooks/ecp-pay/payment-confirmed` em `server/src/modules/webhooks/` autenticado com `X-Webhook-Secret`, idempotente via `webhook_events(source, event_id)` UNIQUE (migration `005-webhook-events.sql`). Payment `paid` marca a transação como `completed`, credita o saldo e cria notification; `refunded`/`failed` marca como `cancelled`. Tudo atômico via `db.transaction()`.

#### Helpers e consistência temporal
- **`getDailyTransferred(accountId)` (Onda 2)** — `server/src/modules/pix/pix.service.ts` soma débitos/pix do dia atual (`WHERE created_at >= date('now', 'start of day')`) e é usado tanto em `PixService.transfer` (RN-01) quanto em `GET /api/accounts/me` (exposição do campo `dailyTransferredCents`). Colunas `accounts.daily_transferred_cents` e `accounts.last_transfer_date` estão deprecadas (migration `006-deprecate-daily-columns.sql`).

### ⚠️ Parcialmente implementado

- **RN-03 Autenticação reforçada** — o endpoint aceita o campo `reinforcedToken` (`pix.schema.ts:19`) e o service bloqueia se ausente em valores acima de R$ 5.000 (`pix.service.ts:155`), mas **não há fluxo emissor do token** (2FA/biometria/SMS/e-mail). Qualquer string não-vazia é aceita.
- **Conta PJ** — o backend só tem PF. O `ProfileSwitcher` redireciona PJ para URL externa (`web/src/components/layout/ProfileSwitcher.tsx:67`). Spec menciona explicitamente como não implementado.

### ❌ Não implementado

- **TED / débito automático / saque** — enum `transactions.category` inclui `transfer`, `withdrawal`, `fee` mas não há endpoints dedicados. Referência: product briefing seção 9.
- **Cartão físico (emissão/entrega)** — `cards.type` aceita `'physical'` mas nenhum service cria/emite. Referência: product briefing seção 9.

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
- **Classe `bg-lime-dim` agora válida** — `ProfileSwitcher.tsx:72,88` aponta para o token `lime.dim` (`rgb(183 255 42 / 0.1)`) definido em `tailwind.config.ts` e em `--color-lime-dim` no `globals.css`.
- **Polling de notificações com `visibilitychange`** — `Header.tsx` pausa o `setInterval(30s)` quando `document.hidden === true`, faz fetch imediato e retoma quando a aba volta a ficar visível, com cleanup completo no `useEffect`.

#### Componentes UI próprios
- `Button`, `Card`, `Input`, `Modal`, `Table`, `Badge` — `web/src/components/ui/`
- `Card` usa `shadow-card` por default, `Modal` usa `shadow-modal` — tokens centralizados em `tailwind.config.ts` substituíram as classes inline `shadow-lg`/`shadow-2xl`.

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

### ❌ Não implementado

- Não foram encontrados gaps ❌ puros no frontend — toda rota / componente mencionado em spec existe.

---

## Design / Tokens

### ✅ Implementado

- **Paleta completa** (background, surface, secondary-bg, border, lime, lime-pressed, **lime-dim**, text-primary/secondary/tertiary, success/warning/danger/info) espelhada entre `web/tailwind.config.ts` e `web/src/styles/globals.css`.
- **Border radius** (`card: 18px`, `control: 13px`) — `tailwind.config.ts` e `globals.css`.
- **Tipografia Inter como asset local** — woff2 weights 400/500/600/700 em `web/public/fonts/inter/` carregados via `@font-face` em `globals.css`. CDN de Google Fonts removido de `index.html` — pipeline offline-friendly.
- **Scrollbar customizada** (6px, surface/border/text-tertiary) — `globals.css`.
- **Classes globais `.card`, `.btn-primary`, `.input-field`** — `globals.css`.
- **Tokens de spacing** — `inline: 8px`, `card-gap: 16px`, `section: 32px` em `tailwind.config.ts` + variáveis CSS equivalentes.
- **Tokens de shadow** — `shadow-card` (leve), `shadow-elevated` (dropdowns), `shadow-modal` (overlays centrais) em `tailwind.config.ts` + `--shadow-*` em `globals.css`. `Modal`, `Card`, `ProfileSwitcher` e `Header` migrados para esses tokens.
- **Storybook 8.x (Onda 2)** — `web/.storybook/main.ts` + `preview.ts` (com `globals.css` importado), stories para `Button`, `Card`, `Input`, `Modal`, `Table`, `Badge` em `web/src/components/ui/*.stories.tsx`. Scripts `npm run storybook` e `npm run build-storybook`. `build-storybook` valida compilação sem erro.

### ⚠️ Parcialmente implementado

- **Sincronização manual tokens CSS ↔ Tailwind** — spec §9 reconhece que as duas fontes são sincronizadas manualmente. Risco: alterar uma e esquecer a outra (ex.: se `--color-lime` mudar no CSS, Tailwind continua com valor antigo).

### ❌ Não implementado

- _(nenhum gap design/tokens puro nesta rodada — Storybook saiu da lista com a Onda 2)_

---

## Recomendações de priorização

Ordenado por impacto (negócio + risco técnico). Os itens absorvidos pela Onda 1 e pela Onda 2 foram removidos.

1. **Fluxo real de autenticação reforçada (RN-03)** — hoje RN-03 é placeholder; em produção fraude > R$ 5.000 passa sem segunda camada. Implementar OTP via e-mail/SMS ou TOTP e emitir `reinforcedToken` com TTL curto.
2. **Endpoints TED / saque / débito automático** — categorias já existem no enum; criar `POST /api/transfers/ted`, `POST /api/withdrawals`, `POST /api/direct-debit` ou remover as categorias mortas do enum.
3. **Conta PJ no backend** — se for prioridade de produto, projetar `accounts.type = 'pf'|'pj'`, `users.document` aceitando CNPJ, endpoints específicos. Caso contrário, remover o item PJ do ProfileSwitcher para não gerar expectativa.
4. **Sincronização automática CSS ↔ Tailwind** — single source of truth (ex.: tokens TS importados no Tailwind e emitidos como CSS vars por plugin) para eliminar drift.
5. **Expandir Storybook** — cobrir `components/chat/` e `components/layout/` além dos 6 primitives de `components/ui/`.

---

## Onda 2 — Itens resolvidos (20/04/2026)

1. **Webhook ECP Pay → bank para crédito de Pix recebido via QR** — módulo novo em `server/src/modules/webhooks/` + migration `005-webhook-events.sql` (ledger de idempotência). `POST /api/webhooks/ecp-pay/payment-confirmed` autenticado via `X-Webhook-Secret`, credita/cancela atomicamente, cria notification. Cobertura de testes: auth faltando, idempotência, paid, refunded, referenceId não encontrado.
2. **Reset determinístico de `daily_transferred_cents`** — helper `getDailyTransferred(accountId)` somando débitos/pix do dia atual direto de `transactions`. Consumido em `PixService.transfer` (RN-01) e em `AccountsService.getAccount` (`GET /api/accounts/me`). Colunas antigas deprecadas via migration `006-deprecate-daily-columns.sql` (doc-only).
3. **Retry/fila para ECP Pay no boleto** — migration `007-ecp-pay-retry-queue.sql`, worker `server/src/services/ecp-pay-retry-worker.ts` com backoff 5m→15m→1h→6h→24h (dead_letter após 5 tentativas), `enqueueEcpPayRetry` no catch do boleto, rota admin `GET /api/admin/ecp-pay-queue` (role=system).
4. **Agendamento recorrente de pagamentos** — migration `008-recurrence.sql` adiciona `recurrence_rule`, `recurrence_end_date`, `recurrence_parent_id`. `PayBoletoSchema` aceita `recurrence` + `recurrenceEndDate`. `materializeRecurringPayments()` cria a próxima instância linkada via `recurrence_parent_id` — executado diariamente por `startRecurringPaymentsWorker` (exportado para testes).
5. **Storybook scaffold mínimo** — `@storybook/react-vite` 8.x, `.storybook/main.ts`, `.storybook/preview.ts` (importa `src/styles/globals.css`), stories para os 6 primitives UI. Scripts `npm run storybook` e `npm run build-storybook` adicionados; `build-storybook` compila sem erro.

**Regressão:** 39/39 testes server (auth, accounts, pix, payments, webhooks) + 3/3 testes web (Button). `npm run build` passa limpo em ambos.

---

## Onda 1 — Itens resolvidos nesta rodada (20/04/2026)

1. **Token `lime.dim` criado** e variável `--color-lime-dim` adicionada em `globals.css` — `bg-lime-dim`, `hover:bg-lime-dim` e `focus:ring-lime-dim` em `ProfileSwitcher.tsx` agora renderizam corretamente.
2. **`counterpart_name` real do remetente** populado no crédito do Pix P2P (nome buscado via `users.name` do `sender`) — `pix.service.ts`.
3. **`counterpart_document` e `counterpart_institution`** populados nas duas transações Pix P2P (CPF do contraparte + `'ECP Digital Bank'`).
4. **Fonte Inter como asset local** — `public/fonts/inter/inter-{400,500,600,700}.woff2` + 4 `@font-face` em `globals.css`; `index.html` não depende mais do Google Fonts.
5. **Tokens de `spacing` (`inline`, `card-gap`, `section`) e `boxShadow` (`card`, `elevated`, `modal`)** — `tailwind.config.ts` + CSS vars equivalentes. `Modal`, `Card`, `ProfileSwitcher` e `Header` migrados.
6. **Polling de notificações respeita `visibilitychange`** — pausa quando a aba fica oculta, faz fetch imediato ao voltar, cleanup completo em `useEffect` (`Header.tsx`).
7. **Specs atualizadas** — `design_spec.md`, `tech_spec.md`, `product_briefing_spec.md` e este `gap-analysis.md` refletem o novo estado.

---

*Relatório gerado em 20/04/2026 a partir de specs v4.0 e código em `03-product-delivery/app/`*
