# ecp digital bank — Product Briefing & Especificação Funcional

> **Versão:** 4.0 (as-built)
> **Data:** 20/04/2026
> **Status:** Implementado — reflete o estado atual do código em `03-product-delivery/app/`

---

## 1. Visão Geral do Produto

O **ECP Banco Digital** é uma aplicação web de banco digital voltada para brasileiros que desejam uma experiência bancária moderna, rápida e acessível pelo navegador. O foco está em oferecer operações essenciais do dia a dia — Pix (enviar, receber via QR Code e gerenciar chaves), cartão virtual com fatura, extrato com categorização, pagamento de boletos e assistente de IA conversacional — com uma interface limpa, dark-mode first, responsiva e de alto desempenho.

O produto é composto por dois lados:

- **API back-end (Fastify)** em `http://localhost:3333/` que processa regras de negócio, persiste dados em SQLite e garante segurança via JWT.
- **Front-end web (React SPA + Vite)** rodando em `http://localhost:5173/` que funciona como painel do usuário.

Uma integração externa com a **plataforma ECP Pay** (`http://localhost:3335/`) é utilizada para criação de cobranças Pix via QR Code e boletos, sendo essa a primeira integração produto-a-produto do squad ECP.

---

## 2. Público-Alvo

Adultos de 20 a 45 anos, bancarizados, que utilizam smartphone e computador diariamente. São pessoas com renda formal, insatisfeitas com a burocracia e lentidão dos bancos tradicionais, e que buscam uma experiência digital-first com acesso rápido a Pix, extrato e cartão virtual.

O seed (`server/src/database/seed.ts`) cria 11 usuários-demo representando esse espectro — de estudante universitário (Davi Ribeiro, saldo R$ 156,70) a empresário importador (Mohammad Khalil, saldo R$ 45.234,00), passando por aposentada, freelancer, servidora pública, comerciária e designer. Todos os perfis consumer logam com a senha `Senha@123`.

---

## 3. Funcionalidades Implementadas

### 3.1. Autenticação & Conta

- **Cadastro** com nome, e-mail, CPF (11 dígitos, apenas números), senha forte (mínimo 8 caracteres, maiúscula + minúscula + número + símbolo) e telefone opcional no formato `+55DDDXXXXXXXX` (`server/src/modules/auth/auth.schema.ts:5`).
- **Login** por e-mail + senha retornando JWT com expiração de 7 dias (`server/src/app.ts:39`).
- **Suffix aleatório** de 16 bytes anexado ao segredo JWT a cada restart do servidor, invalidando todos os tokens emitidos em execuções anteriores (`server/src/app.ts:7`).
- **`GET /api/auth/me`** para validar o token em cada carga do front-end.
- **Idle timeout** automático no front-end (hook `useIdleTimeout`) que desloga o usuário por inatividade.
- Criação automática de conta corrente (agência `0001`, número de 8 dígitos) no momento do cadastro (`server/src/modules/auth/auth.service.ts:40`).
- **Roles** de usuário: `consumer` (padrão) e `system` (contas de serviço que autenticam integrações, por exemplo a ECP Pay Platform).

### 3.2. Dashboard (Home)

Agregador único em `GET /api/dashboard` que devolve para a home:

- Saldo disponível + agência + número da conta.
- Gastos do mês corrente vs. mês anterior (variação %) e distribuição por categoria (`pix`, `boleto`, `card_purchase`, `transfer`, `deposit`, `withdrawal`, `refund`, `fee`), renderizados em donut CSS/SVG.
- Cartão virtual: últimos 4 dígitos, limite total, usado, disponível e status bloqueado/ativo; barra de uso com cores progressivas (lime → warning → danger a partir de 70% e 90%).
- Últimas transações com ícone de crédito/débito e rótulo de categoria.
- Contador de notificações não lidas.

### 3.3. Pix

- **Gerenciar chaves** (`/api/pix/keys`): criação, listagem e soft delete. Tipos aceitos: `cpf`, `email`, `phone`, `random`. Limite de 5 chaves ativas por usuário (`server/src/modules/pix/pix.service.ts:9`).
- **Enviar Pix** (`POST /api/pix/transfer`) com fluxo em 4 passos no front (`chave → valor → confirmação → sucesso`, ver `web/src/routes/pix/enviar.tsx`). Ao persistir, o serviço popula em ambas as pontas do extrato (débito do remetente e crédito do recebedor) os campos `counterpart_name` (nome real do titular) e `counterpart_document` (CPF) — o extrato do recebedor mostra o nome real do remetente, não mais o placeholder `Remetente`.
- **Lookup de chave** (`GET /api/pix/lookup?key=`) para exibir o nome do titular antes da confirmação.
- **Receber Pix via QR Code** (`POST /api/pix/qrcode`): o banco delega a criação da cobrança para a **ECP Pay** (`server/src/services/ecp-pay-client.ts:43`), registra uma transação `pending` local com `metadata.ecp_pay_tx_id` e retorna `qrCode`, `qrCodeText` e `expiration`.
- **Débito por CPF/e-mail** (`POST /api/pix/debit-by-cpf`): endpoint exclusivo de contas `system` usado pela ECP Pay para registrar no extrato do pagador uma compra feita em apps parceiros (ex.: bank, food).

### 3.4. Cartão Virtual

- Listagem de cartões (`GET /api/cards`) e detalhe (`GET /api/cards/:id`).
- **Atualizar limite** (`PATCH /api/cards/:id/limit`) — máximo R$ 20.000,00.
- **Bloquear/desbloquear** (`PATCH /api/cards/:id/block`) com toggle `blocked: boolean`.
- **Fatura aberta atual** (`GET /api/cards/:id/invoice`) com lista de compras agregadas.
- **Registrar compra** (`POST /api/cards/:id/purchase`) pelo próprio titular.
- **Compra por número do cartão** (`POST /api/cards/purchase-by-number`) — apenas contas `system` (usado por apps parceiros que processam pagamentos com cartão emitido pelo bank).

### 3.5. Extrato

- **Listagem paginada** (`GET /api/transactions`) com suporte a filtros por tipo, categoria, data e busca textual.
- **Detalhe de transação** (`GET /api/transactions/:id`).
- Categorização automática definida pelo `category` da transação (Pix, Boleto, Cartão, Transferência, Depósito, Saque, Estorno, Tarifa).

### 3.6. Pagamentos de Boleto

- **Pagar boleto** (`POST /api/payments/boleto`): aceita código de barras de 44–54 caracteres, valor em centavos, descrição opcional e agendamento opcional (`scheduledFor`). A cobrança é criada na ECP Pay via `ecpPayClient.createBoletoCharge` (`server/src/services/ecp-pay-client.ts:58`).
- **Listar pagamentos agendados** (`GET /api/payments/scheduled`).
- **Cancelar agendamento** (`DELETE /api/payments/scheduled/:id`).

### 3.7. Assistente de IA (Chatbot multi-agente)

Implementação completa de um assistente conversacional multi-agente com Anthropic Claude (`claude-sonnet-4-20250514`) — foi a maior evolução desde a v3.0.

- **Widget flutuante** (`web/src/components/chat/ChatWidget.tsx`) presente em todas as páginas protegidas + **página dedicada** em `/chat` com histórico de conversas na lateral.
- **Orquestrador** (`modules/chat/agents/orchestrator.ts`) classifica a intenção do usuário em um dos 15 intents (`FAQ:*`, `RULES:*`, `TRANSACTION:*`, `GENERAL:*`) e delega para o agente especialista.
- **Agente Knowledge** responde FAQs sobre navegação, features e segurança.
- **Agente Rules** explica regras de negócio (limites Pix/TED, regras de cartão, KYC, status de conta).
- **Agente Transaction** executa ações via tools: `getBalance`, `getStatement`, `pixTransfer`, `cardCreate`, `cardBlock`, `kycStatus` (`modules/chat/agents/tools/`).
- **Persistência** de `chat_conversations` e `chat_messages` em SQLite, com `agent`, `intent`, `tool_calls` e `metadata` registrados.
- **Quick actions** no início de cada conversa: consultar saldo, ver extrato, fazer PIX, meus cartões, limites PIX, status KYC.
- Endpoints: `POST /api/chat/messages`, `GET /api/chat/conversations`, `POST /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`, `PATCH /api/chat/conversations/:id/archive`.

### 3.8. Notificações

- Feed de notificações com 4 tipos: `transaction`, `security`, `marketing`, `system`.
- Badge de não lidas no header (polling a cada 30s via `Header.tsx:62`).
- Dropdown com últimas 5 notificações.
- Ação "Marcar todas como lidas" (`POST /api/notifications/read-all`).
- Endpoints: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`.

### 3.9. Perfil

- `GET /api/users/me` / `PATCH /api/users/me` — atualizar nome, telefone.
- `POST /api/users/me/change-password` — alterar senha (valida senha atual).
- **Profile Switcher** no header (UI somente, ver `ProfileSwitcher.tsx`) prevendo troca futura PF/PJ — PJ ainda não implementado no back-end.

---

## 4. Rotas Visíveis na Aplicação Web

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | `LoginPage` | Público |
| `/register` | `RegisterPage` | Público |
| `/` | `DashboardPage` | Autenticado |
| `/extrato` | `ExtratoPage` | Autenticado |
| `/pix/enviar` | `PixEnviarPage` | Autenticado |
| `/pix/receber` | `PixReceberPage` | Autenticado |
| `/pix/chaves` | `PixChavesPage` | Autenticado |
| `/cartoes` | `CartoesPage` | Autenticado |
| `/pagamentos` | `PagamentosPage` | Autenticado |
| `/chat` | `ChatPage` | Autenticado |
| `/perfil` | `PerfilPage` | Autenticado |

Todas as rotas autenticadas compartilham o layout `ProtectedLayout` (Sidebar + Header + MobileNav + ChatWidget flutuante).

---

## 5. Regras de Negócio Implementadas

| ID | Regra | Descrição | Implementação |
|----|-------|-----------|---------------|
| RN-01 | Limite diário Pix | Default R$ 5.000,00/dia por conta, ajustável em `PATCH /api/accounts/me/limit` | `pix.service.ts:145` |
| RN-02 | Limite noturno Pix | Entre 20h e 6h, máximo R$ 1.000,00 por transação (`NIGHT_LIMIT_CENTS = 100000`) | `pix.service.ts:11, 34` |
| RN-03 | Autenticação reforçada | Transferências acima de R$ 5.000,00 (500000 centavos) exigem `reinforcedToken` | `pix.service.ts:12, 155` |
| RN-04 | Saldo insuficiente | Pix e pagamentos bloqueados se `balance_cents < amountCents` | `pix.service.ts:137` |
| RN-05 | Chaves Pix | Máximo de 5 chaves ativas por usuário | `pix.service.ts:9, 62` |
| RN-06 | Cartão virtual | Limite independente do saldo. `limit_cents` máximo R$ 20.000,00. Dia de fechamento default dia 10 (`due_day = 10`) | `cards.schema.ts:29` |
| RN-07 | Soft delete | Chaves Pix usam `is_active = 0` + `deleted_at`; usuários e contas usam `is_active` | `pix.service.ts:101` |
| RN-08 | Idempotência | Requisições para ECP Pay enviam `X-Idempotency-Key` UUID em todo POST/PATCH/DELETE | `ecp-pay-client.ts:8` |
| RN-09 | Valores monetários | Todos os valores trafegam como `integer` em centavos; front-end converte via `formatCurrency` em `web/src/lib/formatters.ts` | Global |
| RN-10 | Rate limiting Pix | Máximo 5 transferências por janela de 5 minutos por conta | `pix.service.ts:12–13, 243` |
| RN-11 | Prevenção de self-transfer | Transferência Pix para chave da própria conta é rejeitada | `pix.service.ts:122` |
| RN-12 | Bloqueio de tokens em restart | JWT secret recebe suffix randômico a cada boot, forçando logout geral | `app.ts:7` |
| RN-13 | Idle timeout | Sessão do usuário expira por inatividade no front-end | `useIdleTimeout.ts` |
| RN-14 | Contas de serviço isoladas | Role `system` é a única autorizada em endpoints internos (`/pix/debit-by-cpf`, `/cards/purchase-by-number`) | `pix.routes.ts:68`, `cards.routes.ts:56` |

---

## 6. Jornadas Principais

### 6.1. Cadastro → Primeira Operação
1. Usuário acessa `/register`, preenche nome, CPF, e-mail, telefone (opcional) e senha forte.
2. No back-end, `AuthService.register` valida unicidade de CPF/e-mail, cria `users` + `accounts` em transação SQLite e devolve JWT.
3. Front-end persiste `ecp_token` e `ecp_user` no localStorage e navega para `/`.
4. Dashboard exibe saldo zero, chamando `GET /api/dashboard`.

### 6.2. Envio de Pix
1. Em `/pix/enviar`, o usuário digita a chave.
2. Front chama `GET /api/pix/lookup?key=...` e exibe o nome do titular.
3. Usuário informa valor e descrição opcional.
4. Tela de confirmação mostra resumo; ao confirmar, `POST /api/pix/transfer`.
5. Back valida: saldo (RN-04), limite diário (RN-01), horário noturno (RN-02), auth reforçada (RN-03), rate limit (RN-10), self-transfer (RN-11).
6. Débito e crédito ocorrem em transação atômica; duas linhas são criadas em `transactions` (uma debit para o remetente, uma credit para o destinatário).

### 6.3. Receber via QR Code (Integração ECP Pay)
1. Usuário informa valor e descrição em `/pix/receber`.
2. `POST /api/pix/qrcode` chama `ecpPayClient.createPixCharge` com nome, CPF e valor.
3. ECP Pay devolve `transaction_id`, `qr_code` (base64 PNG) e `qr_code_text` (EMV).
4. Bank registra transação local `pending` com `metadata.ecp_pay_tx_id`.
5. Front exibe QR + código copia-e-cola.
6. Quando o pagador efetua o pagamento, a ECP Pay debita o pagador e notifica o bank via webhook `POST /api/webhooks/ecp-pay/payment-confirmed` (header `X-Webhook-Secret`). O webhook localiza a transação pendente gerada no passo 4, marca como `completed`, credita o saldo do recebedor e gera notification `Pix recebido`. Idempotente: `eventId` duplicado é tratado como no-op (status 200 `duplicate`), sem creditar em dobro.

### 6.4. Conversa com Assistente IA
1. Usuário abre o widget flutuante ou acessa `/chat`.
2. Seleciona quick action ("Qual meu saldo?") ou digita livremente.
3. `POST /api/chat/messages` salva a mensagem, chama `classifyIntent` (Claude Sonnet 4) e roteia para o agente especialista.
4. Agente executa tools (ex.: `getBalance`) quando necessário e devolve resposta.
5. Histórico é persistido em `chat_messages` com `agent`, `intent`, `tool_calls`.

---

## 7. Modelo de Dados (Tabelas Persistidas)

| Tabela | Propósito |
|--------|-----------|
| `users` | Usuários com `role` (`consumer` / `system`) e hash bcrypt |
| `accounts` | Conta corrente por usuário (1:1), saldo, agência, número, limite diário |
| `pix_keys` | Chaves Pix com soft delete |
| `pix_rate_limit` | Janela deslizante de 5 minutos para rate limit de Pix |
| `transactions` | Extrato unificado (crédito/débito × categoria), com `metadata` JSON para integrações |
| `cards` | Cartões virtuais e físicos com limite, bloqueio e fatura |
| `invoices` | Faturas mensais dos cartões |
| `card_purchases` | Compras agregadas à fatura |
| `notifications` | Feed de notificações (transaction/security/marketing/system) |
| `chat_conversations` | Conversas com o assistente IA |
| `chat_messages` | Mensagens com agente, intent e tool calls |
| `knowledge_base` | Base para FAQs do agente Knowledge |

Detalhes completos em `tech_spec.md` (2026-04-20).

---

## 8. Métricas Observáveis

As métricas abaixo saem direto do dashboard ou podem ser extraídas do SQLite:

- Saldo médio por usuário.
- Volume Pix enviado/recebido (por dia/mês).
- Número de chaves Pix ativas por conta.
- Taxa de uso de cartão (% limite usado).
- Volume mensal de mensagens no chat por agente/intent.
- Taxa de erro do orchestrator (fallback para `GENERAL:OUT_OF_SCOPE`).
- Latência e taxa de sucesso das chamadas para a ECP Pay (logs `[ecp-pay]` em `ecp-pay-client.ts:19, 32, 38`).

---

## 9. Restrições e Não-Implementado

- **Sem mobile nativo.** O produto segue sendo uma SPA web apenas.
- **TED e débito automático** não estão implementados (categorias `transfer`, `withdrawal`, `fee` existem no enum mas não há endpoints dedicados).
- **Cartão físico**: o schema aceita `type: 'physical'` mas o fluxo de emissão/entrega não existe.
- **Conta PJ**: o `ProfileSwitcher` mostra placeholder PF/PJ, mas back-end só tem PF.
- **Agendamento recorrente de pagamentos**: `POST /api/payments/boleto` aceita `recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'` + `recurrenceEndDate` opcional. A próxima instância é materializada 1 dia antes do `scheduledFor` pelo worker diário `materializeRecurringPayments` e fica linkada via `recurrence_parent_id`.
- **Autenticação reforçada real** (RN-03): o `reinforcedToken` é aceito pelo endpoint mas não há um fluxo de 2FA/biometria emitindo esse token — é placeholder para integração futura.
- **Limite diário Pix é por conta, não por transação noturna em cadeia** — a regra noturna (RN-02) aplica-se por transação individual.

---

## 10. Integrações Externas

| Sistema | Finalidade | Endpoint base | Implementação |
|---------|-----------|---------------|---------------|
| **ECP Pay Platform** | Criar cobranças Pix via QR Code, gerar boletos, processar cartão | `http://localhost:3335` | `server/src/services/ecp-pay-client.ts` |
| **Anthropic Claude API** | Orquestração do chatbot e agentes especialistas | `claude-sonnet-4-20250514` (configurável via `AI_MODEL`) | `server/src/modules/chat/agents/orchestrator.ts:5` |

Headers enviados à ECP Pay: `X-API-Key`, `X-Source-App: ecp-bank`, `X-Idempotency-Key` (UUID v4 em requests mutáveis).

---

*Documento gerado para o projeto ecp digital bank — v4.0 (as-built)*
*Atualizado em 20/04/2026 a partir do código em `03-product-delivery/app/`*
