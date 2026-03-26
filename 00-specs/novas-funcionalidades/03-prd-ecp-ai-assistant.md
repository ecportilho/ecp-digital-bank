# PRD — ecp-ai-assistant (Chatbot IA Agêntico)

> **Documento de implementação para Claude Code (ecp-ai-squad-multi-agents)**
> Projeto: ecp-digital-bank | Versão: 1.0.0 | Data: 2026-03-26
>
> Este documento define O QUE construir, ONDE colocar cada arquivo, e COMO implementar.
> Deve ser lido em conjunto com o `CLAUDE.md` raiz e a especificação `02-especificacao-ecp-digital-bank.md`.

---

## REGRAS INVIOLÁVEIS (herdadas do projeto + novas do chatbot)

1. TypeScript strict: NUNCA `any`. Usar `unknown` + type guard.
2. Valores monetários: SEMPRE em centavos (integer). NUNCA float.
3. Schemas Zod em `@ecp/shared`: fonte de verdade. Tipos via `z.infer<>`.
4. Erros: `AppError` com `ErrorCode`. NUNCA `throw new Error("...")`.
5. Logs: JSON estruturado. NUNCA `console.log` em produção.
6. IDs: SEMPRE UUID v4. NUNCA auto-increment.
7. Paginação: SEMPRE cursor-based. NUNCA offset.
8. Transações financeiras: SEMPRE idempotency key (UUID).
9. Saldo: NUNCA negativo. Validar ANTES de debitar.
10. CPF: validar com algoritmo módulo 11 (usar `isValidCPF` de `@ecp/shared`).
11. Datas: timezone `America/Sao_Paulo`. Horário TED: dias úteis 06:30-17:00.
12. Cartão: NUNCA retornar número completo ou CVV em queries normais.
13. Auth: Supabase Auth. NUNCA auth customizado.
14. Transações NUNCA deletadas. Reversão = nova transação tipo `REVERSED`.
15. **NOVO — Chatbot NUNCA executa transação sem confirmação explícita do usuário.**
16. **NOVO — Chatbot SEMPRE mascara dados sensíveis nas mensagens (CPF: \*\*\*.\*\*\*.789-00, cartão: últimos 4 dígitos).**
17. **NOVO — Toda ação do chatbot registrada em `audit_logs` com `metadata.origin = "chatbot"`.**
18. **NOVO — API key da Anthropic (`ANTHROPIC_API_KEY`) SOMENTE no backend. NUNCA expor no frontend.**

---

## VISÃO GERAL

### O que é

Chatbot de IA agêntico embutido no ecp-digital-bank (web + mobile), capaz de:

1. **Resolver dúvidas de uso** — como navegar, usar funcionalidades, fluxos do app
2. **Resolver dúvidas sobre regras** — limites PIX/TED, horários, status de conta, KYC
3. **Executar transações** — transferência PIX, consulta de saldo/extrato, gerenciar cartões

### Arquitetura Multi-Agent

```
┌─────────────────────────┐
│  Chat UI (Web / Mobile)  │  ← Componente React / React Native
└────────────┬────────────┘
             │ HTTP (SSE streaming)
┌────────────▼────────────┐
│    chat.router.ts        │  ← Novo tRPC router
│    (packages/api)        │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   orchestrator-agent     │  ← Classifica intent → roteia para agente
└──┬─────────┬─────────┬──┘
   │         │         │
   ▼         ▼         ▼
┌────────┐┌────────┐┌──────────────┐
│knowledge││ rules  ││ transaction  │
│ agent   ││ agent  ││   agent      │
└───┬────┘└───┬────┘└──────┬───────┘
    │         │            │
    ▼         ▼            ▼
 RAG/KB    Constantes   tRPC APIs
 (pgvector) de negócio  (transfer, account, card)
```

### Stack de IA (Backend)

| Camada | Tecnologia | Pacote npm |
|--------|-----------|------------|
| LLM Provider | Anthropic Claude API | `@anthropic-ai/sdk` |
| Agent Framework | Vercel AI SDK | `ai`, `@ai-sdk/anthropic` |
| Embeddings | OpenAI text-embedding-3-small | `openai` |
| Vector Store | Supabase pgvector | `@supabase/supabase-js` (já instalado) |
| Streaming | Server-Sent Events via tRPC | `@trpc/server` (já instalado) |

---

## VARIÁVEIS DE AMBIENTE (adicionar ao `.env`)

```bash
# ===== AI ASSISTANT =====
ANTHROPIC_API_KEY=sk-ant-xxxxx              # API key da Anthropic (SOMENTE backend)
OPENAI_API_KEY=sk-xxxxx                      # Para embeddings text-embedding-3-small
AI_MODEL=claude-sonnet-4-20250514            # Modelo padrão para os agentes
AI_MAX_TOKENS=2048                           # Max tokens por resposta
AI_TEMPERATURE=0.3                           # Baixa para respostas consistentes
```

---

## ESTRUTURA DE ARQUIVOS (o que criar)

```
packages/
├── shared/src/
│   └── schemas/
│       └── chat.schema.ts                  ← CRIAR: Schemas Zod do chatbot
│
├── api/src/
│   ├── routers/
│   │   └── chat.router.ts                  ← CRIAR: tRPC router do chat
│   │
│   ├── agents/                             ← CRIAR DIRETÓRIO
│   │   ├── orchestrator.ts                 ← CRIAR: Classifica intent + roteia
│   │   ├── knowledge.ts                    ← CRIAR: RAG para FAQ do produto
│   │   ├── rules.ts                        ← CRIAR: Regras de negócio
│   │   ├── transaction.ts                  ← CRIAR: Executa ações via tRPC
│   │   ├── tools/                          ← CRIAR DIRETÓRIO
│   │   │   ├── balance.tool.ts             ← CRIAR: Tool para consultar saldo
│   │   │   ├── statement.tool.ts           ← CRIAR: Tool para consultar extrato
│   │   │   ├── pix-transfer.tool.ts        ← CRIAR: Tool para enviar PIX
│   │   │   ├── card-create.tool.ts         ← CRIAR: Tool para gerar cartão
│   │   │   ├── card-block.tool.ts          ← CRIAR: Tool para bloquear cartão
│   │   │   └── kyc-status.tool.ts          ← CRIAR: Tool para status KYC
│   │   └── prompts/                        ← CRIAR DIRETÓRIO
│   │       ├── orchestrator.prompt.ts      ← CRIAR: System prompt do orchestrator
│   │       ├── knowledge.prompt.ts         ← CRIAR: System prompt do knowledge
│   │       ├── rules.prompt.ts             ← CRIAR: System prompt do rules
│   │       └── transaction.prompt.ts       ← CRIAR: System prompt do transaction
│   │
│   ├── knowledge/                          ← CRIAR DIRETÓRIO
│   │   ├── embeddings.ts                   ← CRIAR: Geração de embeddings
│   │   ├── vector-store.ts                 ← CRIAR: CRUD no pgvector
│   │   └── seed-knowledge.ts              ← CRIAR: Popular base com docs do produto
│   │
│   └── db/
│       └── schema.ts                       ← EDITAR: Adicionar tabelas do chat
│
├── ui/src/
│   └── components/
│       └── chat/                           ← CRIAR DIRETÓRIO
│           ├── chat-widget.tsx             ← CRIAR: Floating button + panel
│           ├── chat-messages.tsx           ← CRIAR: Lista de mensagens
│           ├── chat-input.tsx              ← CRIAR: Input + quick actions
│           └── chat-bubble.tsx             ← CRIAR: Bolha de mensagem (user/assistant)
│
apps/
├── web/src/app/
│   └── (dashboard)/
│       ├── layout.tsx                      ← EDITAR: Adicionar ChatWidget
│       └── chat/
│           └── page.tsx                    ← CRIAR: Tela cheia do chat
│
└── mobile/app/
    └── (tabs)/
        ├── _layout.tsx                     ← EDITAR: Adicionar tab Chat
        └── chat.tsx                        ← CRIAR: Tela do chat mobile
```

---

## FASE 1 — SCHEMAS, BANCO DE DADOS E ROUTER (implementar primeiro)

### 1.1 Schema Zod — `packages/shared/src/schemas/chat.schema.ts`

```typescript
import { z } from "zod";

// ===== ENUMS =====
export const chatRoleEnum = z.enum(["user", "assistant", "system"]);
export type ChatRole = z.infer<typeof chatRoleEnum>;

export const conversationStatusEnum = z.enum(["active", "archived"]);
export type ConversationStatus = z.infer<typeof conversationStatusEnum>;

export const chatIntentEnum = z.enum([
  // FAQ & Uso do App
  "FAQ:NAVIGATION",
  "FAQ:FEATURE",
  "FAQ:SECURITY",
  // Regras de Negócio
  "RULES:PIX_LIMITS",
  "RULES:TED_LIMITS",
  "RULES:CARD_RULES",
  "RULES:KYC_RULES",
  "RULES:ACCOUNT_STATUS",
  // Transações
  "TRANSACTION:PIX_SEND",
  "TRANSACTION:BALANCE",
  "TRANSACTION:STATEMENT",
  "TRANSACTION:CARD_CREATE",
  "TRANSACTION:CARD_BLOCK",
  "TRANSACTION:KYC_STATUS",
  // Genérico
  "GENERAL:GREETING",
  "GENERAL:OUT_OF_SCOPE",
]);
export type ChatIntent = z.infer<typeof chatIntentEnum>;

export const agentNameEnum = z.enum([
  "orchestrator",
  "knowledge",
  "rules",
  "transaction",
]);
export type AgentName = z.infer<typeof agentNameEnum>;

// ===== SCHEMAS =====
export const chatConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().max(255).nullable(),
  status: conversationStatusEnum,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ChatConversation = z.infer<typeof chatConversationSchema>;

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: chatRoleEnum,
  content: z.string(),
  agent: agentNameEnum.nullable(),
  intent: chatIntentEnum.nullable(),
  toolCalls: z.record(z.unknown()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// ===== INPUTS =====
export const sendMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const getHistoryInputSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type GetHistoryInput = z.infer<typeof getHistoryInputSchema>;

export const listConversationsInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
export type ListConversationsInput = z.infer<typeof listConversationsInputSchema>;
```

### 1.2 Drizzle Schema — ADICIONAR a `packages/api/src/db/schema.ts`

```typescript
// ===== CHAT (adicionar aos enums existentes) =====
export const chatConversationStatusEnum = pgEnum("chat_conversation_status", [
  "active", "archived",
]);

export const chatRoleEnum = pgEnum("chat_role", [
  "user", "assistant", "system",
]);

// ===== NOVAS TABELAS =====
export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  title: text("title"),
  status: chatConversationStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("chat_conv_user_id_idx").on(t.userId),
  index("chat_conv_updated_at_idx").on(t.updatedAt),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => chatConversations.id).notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  agent: varchar("agent", { length: 50 }),
  intent: varchar("intent", { length: 100 }),
  toolCalls: text("tool_calls"), // JSON stringificado
  metadata: text("metadata"),     // JSON stringificado
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("chat_msg_conv_id_idx").on(t.conversationId),
  index("chat_msg_created_at_idx").on(t.createdAt),
]);

// ===== RELATIONS =====
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(profiles, { fields: [chatConversations.userId], references: [profiles.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
}));
```

### 1.3 Tabela pgvector para RAG — ADICIONAR a `packages/api/src/db/schema.ts`

```typescript
// REQUER: CREATE EXTENSION IF NOT EXISTS vector; (executar no Supabase SQL Editor)

export const knowledgeEmbeddings = pgTable("knowledge_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),                    // Texto original do chunk
  embedding: text("embedding").notNull(),                // Vetor como JSON string (1536 dims)
  source: varchar("source", { length: 255 }).notNull(),  // Ex: "faq", "rules", "feature"
  metadata: text("metadata"),                             // JSON: { section, subsection, etc }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("ke_source_idx").on(t.source),
]);
```

> **NOTA**: Para busca vetorial eficiente, criar função SQL no Supabase:
> ```sql
> CREATE OR REPLACE FUNCTION match_knowledge(
>   query_embedding vector(1536),
>   match_threshold float DEFAULT 0.7,
>   match_count int DEFAULT 5
> )
> RETURNS TABLE (id uuid, content text, source varchar, similarity float)
> LANGUAGE plpgsql AS $$
> BEGIN
>   RETURN QUERY
>   SELECT
>     ke.id, ke.content, ke.source,
>     1 - (ke.embedding::vector <=> query_embedding) AS similarity
>   FROM knowledge_embeddings ke
>   WHERE 1 - (ke.embedding::vector <=> query_embedding) > match_threshold
>   ORDER BY similarity DESC
>   LIMIT match_count;
> END;
> $$;
> ```

### 1.4 Migration

Após editar o schema, executar:
```bash
pnpm db:generate
pnpm db:migrate
```

### 1.5 Error Codes — ADICIONAR a `packages/shared/src/errors/error-codes.ts`

```typescript
// ===== CHAT =====
CHAT_CONVERSATION_NOT_FOUND = "CHAT_CONVERSATION_NOT_FOUND",
CHAT_MESSAGE_TOO_LONG = "CHAT_MESSAGE_TOO_LONG",
CHAT_RATE_LIMITED = "CHAT_RATE_LIMITED",
CHAT_AI_ERROR = "CHAT_AI_ERROR",
CHAT_TRANSACTION_NOT_CONFIRMED = "CHAT_TRANSACTION_NOT_CONFIRMED",
```

---

## FASE 2 — AGENTES (implementar após Fase 1)

### 2.1 System Prompts

#### `packages/api/src/agents/prompts/orchestrator.prompt.ts`

```typescript
export const ORCHESTRATOR_SYSTEM_PROMPT = `Você é o orquestrador do assistente virtual do ecp-digital-bank, um banco digital brasileiro.

## Sua função
Analisar a mensagem do usuário e classificar a intenção (intent) para rotear ao agente especializado correto.

## Intents disponíveis

### FAQ & Uso do App → knowledge-agent
- FAQ:NAVIGATION — como navegar no app, onde encontrar funcionalidades
- FAQ:FEATURE — o que o app oferece, como funciona cada feature
- FAQ:SECURITY — dúvidas sobre segurança, biometria, 2FA, senha

### Regras de Negócio → rules-agent
- RULES:PIX_LIMITS — limites de PIX (por transação e diário)
- RULES:TED_LIMITS — limites e horários de TED
- RULES:CARD_RULES — regras de cartão virtual (máx 3, bloqueio, cancelamento)
- RULES:KYC_RULES — fluxo de KYC, documentos aceitos, prazos
- RULES:ACCOUNT_STATUS — status da conta (PENDING_KYC, ACTIVE, SUSPENDED)

### Transações → transaction-agent
- TRANSACTION:PIX_SEND — usuário quer ENVIAR um PIX
- TRANSACTION:BALANCE — usuário quer consultar SALDO
- TRANSACTION:STATEMENT — usuário quer ver EXTRATO / transações
- TRANSACTION:CARD_CREATE — usuário quer GERAR cartão virtual
- TRANSACTION:CARD_BLOCK — usuário quer BLOQUEAR cartão
- TRANSACTION:KYC_STATUS — usuário quer saber STATUS do KYC

### Genérico → responder diretamente
- GENERAL:GREETING — saudação ("oi", "olá", "bom dia")
- GENERAL:OUT_OF_SCOPE — fora do escopo do banco

## Regras
1. Responda SEMPRE em português brasileiro (pt-BR).
2. Para GENERAL:GREETING, responda diretamente de forma amigável e ofereça ajuda.
3. Para GENERAL:OUT_OF_SCOPE, informe educadamente que você só pode ajudar com assuntos do ecp-digital-bank.
4. NUNCA invente informações. Se não souber, diga que vai verificar.
5. Retorne o intent classificado no formato exato do enum.
6. Se a mensagem for ambígua, peça esclarecimento ao usuário.
`;
```

#### `packages/api/src/agents/prompts/knowledge.prompt.ts`

```typescript
export const KNOWLEDGE_SYSTEM_PROMPT = `Você é o agente de conhecimento do ecp-digital-bank.

## Sua função
Responder dúvidas sobre como usar o app, navegação e funcionalidades, usando a base de conhecimento fornecida via contexto (RAG).

## Funcionalidades do ecp-digital-bank
- Conta corrente digital (agência 0001)
- Transferências PIX (por chave: CPF, email, telefone, aleatória)
- Transferências TED (com dados bancários)
- Cartão virtual (até 3 ativos, Visa/Mastercard)
- Receber PIX (QR Code + copia-e-cola)
- KYC (verificação de identidade com documento + selfie)
- Extrato (filtro por tipo, busca, paginação)
- Dashboard (saldo, últimas transações, ações rápidas)
- Perfil e configurações
- Notificações push

## Navegação do app
- **Dashboard**: tela inicial com saldo e ações rápidas
- **Extrato**: lista de transações com filtros
- **PIX**: enviar e receber PIX, gerenciar chaves
- **Cartões**: controle de cartões virtuais
- **Pagamentos**: boletos e contas
- **Transferências**: TED para outros bancos
- **Perfil**: dados pessoais, segurança, 2FA
- **Suporte/Chat**: onde o usuário está agora conversando com você

## Regras
1. Responda SEMPRE em pt-BR, de forma clara e amigável.
2. Use a informação do contexto RAG como fonte primária.
3. Se a informação não estiver no contexto, diga que vai verificar e sugira o que sabe.
4. NUNCA invente funcionalidades que não existem.
5. Quando possível, ofereça executar a ação pelo chat (ex: "Posso fazer o PIX para você agora, se quiser").
`;
```

#### `packages/api/src/agents/prompts/rules.prompt.ts`

```typescript
export const RULES_SYSTEM_PROMPT = `Você é o agente de regras de negócio do ecp-digital-bank.

## Sua função
Responder perguntas sobre limites, horários, regras e políticas do banco com precisão absoluta.

## Regras de Negócio — FONTE DE VERDADE

### PIX
- Limite por transação: R$ 1.000,00
- Limite diário: R$ 5.000,00
- Horário: 24 horas, 7 dias por semana
- Chaves aceitas: CPF, e-mail, telefone, chave aleatória
- Transação atômica: débito + crédito na mesma transaction SQL
- Toda transação requer idempotency_key UUID

### TED
- Limite por transação: R$ 10.000,00
- Horário: dias úteis, 06:30 às 17:00 (timezone America/Sao_Paulo)
- Dados necessários: código do banco (3 dígitos), agência, conta, dígito, nome e CPF/CNPJ do destinatário

### Cartão Virtual
- Máximo 3 cartões ativos por conta
- Bandeiras: Visa, Mastercard
- Validade: 5 anos a partir da criação
- Status: ACTIVE → BLOCKED (reversível) → CANCELLED (irreversível)
- Dados sensíveis (número completo, CVV) só com re-autenticação

### Conta
- Status: PENDING_KYC → ACTIVE → SUSPENDED → CLOSED
- Operações financeiras SOMENTE quando status = ACTIVE
- Saldo NUNCA negativo (sem cheque especial)
- Agência fixa: 0001 | Conta: 8 dígitos + 1 dígito verificador

### KYC
- Status: NOT_STARTED → DOCUMENTS_SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED
- Documentos aceitos: RG, CNH, Passaporte
- Necessário: foto frente + verso do documento + selfie com documento
- Aprovação manual no MVP
- KYC aprovado → conta ACTIVE | KYC rejeitado → pode reenviar

### Transações
- Valores SEMPRE em centavos (integer)
- Positivo = crédito, Negativo = débito
- NUNCA deletadas. Reversão = nova transação tipo REVERSED
- Tipos: PIX_SEND, PIX_RECEIVE, TED_SEND, TED_RECEIVE, CARD_PURCHASE, CARD_REFUND, DEPOSIT, WITHDRAWAL, FEE, INTEREST
- Status: PENDING → PROCESSING → COMPLETED | FAILED | REVERSED

## Regras de resposta
1. Responda SEMPRE em pt-BR com valores formatados (R$ X.XXX,XX).
2. NUNCA arredonde ou altere os valores acima — são a fonte de verdade.
3. Para perguntas sobre horário TED, verifique a data/hora atual e informe se está disponível AGORA.
4. Quando o usuário perguntar sobre um erro específico, explique o erro code em linguagem simples.
`;
```

#### `packages/api/src/agents/prompts/transaction.prompt.ts`

```typescript
export const TRANSACTION_SYSTEM_PROMPT = `Você é o agente de transações do ecp-digital-bank.

## Sua função
Executar ações financeiras em nome do usuário autenticado, usando as tools disponíveis.

## Tools disponíveis
- get_balance — consultar saldo da conta
- get_statement — consultar extrato (últimas N transações)
- send_pix — enviar transferência PIX
- create_card — gerar cartão virtual
- block_card — bloquear cartão
- get_kyc_status — consultar status do KYC

## Fluxo obrigatório para transações financeiras (PIX, TED)
1. COLETAR todos os dados necessários (chave, tipo, valor, descrição)
2. VALIDAR os dados (valor positivo, dentro do limite, formato correto)
3. APRESENTAR resumo claro ao usuário
4. AGUARDAR confirmação explícita ("sim", "confirmo", "pode enviar")
5. EXECUTAR a transação via tool
6. INFORMAR resultado (sucesso + comprovante OU erro explicado)

## Regras INVIOLÁVEIS
1. NUNCA execute uma transação sem confirmação explícita do usuário.
2. NUNCA exiba CPF completo — mascarar como ***.***. XXX-XX (últimos 5 visíveis).
3. NUNCA exiba número completo de cartão — apenas últimos 4 dígitos.
4. NUNCA exiba CVV no chat.
5. Valores monetários: internamente em centavos. Exibir em R$ para o usuário.
6. Gerar UUID para idempotencyKey em CADA transação.
7. Se erro (INSUFFICIENT_FUNDS, DAILY_LIMIT_EXCEEDED, etc.), explicar em linguagem simples.
8. Responder SEMPRE em pt-BR.

## Formato de confirmação (OBRIGATÓRIO antes de executar)
\`\`\`
📋 Resumo da transação:
• Tipo: PIX
• Destino: ***.***. 789-00 (CPF)
• Valor: R$ 200,00
• Descrição: almoço

Confirma o envio? (Sim/Não)
\`\`\`

## Error codes e explicações para o usuário
- INSUFFICIENT_FUNDS → "Saldo insuficiente para esta transação."
- DAILY_LIMIT_EXCEEDED → "Você atingiu o limite diário de R$ 5.000,00 para PIX."
- TRANSFER_LIMIT_EXCEEDED → "O valor excede o limite de R$ 1.000,00 por transação PIX."
- ACCOUNT_NOT_ACTIVE → "Sua conta precisa estar ativa para realizar transações."
- DESTINATION_NOT_FOUND → "Não encontrei o destinatário com essa chave PIX."
- TED_OUTSIDE_HOURS → "TED disponível apenas em dias úteis, das 06:30 às 17:00."
- CARD_LIMIT_REACHED → "Você já possui 3 cartões virtuais ativos (limite máximo)."
`;
```

### 2.2 Orchestrator Agent — `packages/api/src/agents/orchestrator.ts`

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "./prompts/orchestrator.prompt";
import type { ChatIntent } from "@ecp/shared/schemas/chat.schema";

interface ClassificationResult {
  intent: ChatIntent;
  confidence: number;
  agent: "knowledge" | "rules" | "transaction" | "orchestrator";
}

const INTENT_TO_AGENT: Record<string, ClassificationResult["agent"]> = {
  "FAQ:": "knowledge",
  "RULES:": "rules",
  "TRANSACTION:": "transaction",
  "GENERAL:": "orchestrator",
};

export async function classifyIntent(message: string): Promise<ClassificationResult> {
  const response = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    prompt: `Classifique a intenção da mensagem abaixo. Responda APENAS com um JSON:
{"intent": "INTENT_ENUM", "confidence": 0.0-1.0}

Mensagem: "${message}"`,
    maxTokens: 100,
    temperature: 0.1,
  });

  // Parse response → extrair intent → mapear para agente
  // Implementar parsing robusto com fallback para GENERAL:OUT_OF_SCOPE
  // ...
}
```

### 2.3 Transaction Agent Tools — Exemplo `packages/api/src/agents/tools/pix-transfer.tool.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createPixTransferSchema, TRANSFER_LIMITS } from "@ecp/shared/schemas/transfer.schema";

export const pixTransferTool = tool({
  description: "Enviar uma transferência PIX para um destinatário via chave PIX",
  parameters: z.object({
    pixKeyType: z.enum(["CPF", "EMAIL", "PHONE", "RANDOM"]),
    pixKey: z.string().min(1).max(255),
    amount: z.number().int().positive().max(TRANSFER_LIMITS.PIX_PER_TRANSACTION),
    description: z.string().min(1).max(140).default("Transferência PIX"),
  }),
  execute: async ({ pixKeyType, pixKey, amount, description }, { userId }) => {
    // 1. Gerar idempotencyKey
    const idempotencyKey = crypto.randomUUID();

    // 2. Chamar service de transfer (reutilizar lógica existente)
    // const result = await transferService.createPixTransfer({
    //   userId, pixKeyType, pixKey, amount, description, idempotencyKey,
    // });

    // 3. Registrar audit log com origin = "chatbot"
    // await auditService.log({
    //   userId, action: "PIX_SEND", resource: "transaction",
    //   resourceId: result.transactionId,
    //   metadata: { origin: "chatbot", idempotencyKey },
    // });

    // 4. Retornar resultado formatado
    // return { success: true, transactionId: result.id, ... };
  },
});
```

### 2.4 Registrar todas as tools no Transaction Agent

```typescript
// packages/api/src/agents/transaction.ts
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { TRANSACTION_SYSTEM_PROMPT } from "./prompts/transaction.prompt";
import { pixTransferTool } from "./tools/pix-transfer.tool";
import { balanceTool } from "./tools/balance.tool";
import { statementTool } from "./tools/statement.tool";
import { cardCreateTool } from "./tools/card-create.tool";
import { cardBlockTool } from "./tools/card-block.tool";
import { kycStatusTool } from "./tools/kyc-status.tool";

export async function handleTransaction(
  messages: Array<{ role: string; content: string }>,
  userId: string,
) {
  const response = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: TRANSACTION_SYSTEM_PROMPT,
    messages,
    tools: {
      get_balance: balanceTool,
      get_statement: statementTool,
      send_pix: pixTransferTool,
      create_card: cardCreateTool,
      block_card: cardBlockTool,
      get_kyc_status: kycStatusTool,
    },
    maxTokens: 2048,
    temperature: 0.3,
  });

  return response;
}
```

---

## FASE 3 — tRPC ROUTER (implementar após Fase 2)

### 3.1 Chat Router — `packages/api/src/routers/chat.router.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  sendMessageInputSchema,
  getHistoryInputSchema,
  listConversationsInputSchema,
} from "@ecp/shared/schemas/chat.schema";
import { classifyIntent } from "../agents/orchestrator";
import { handleKnowledge } from "../agents/knowledge";
import { handleRules } from "../agents/rules";
import { handleTransaction } from "../agents/transaction";

export const chatRouter = router({
  // Enviar mensagem e receber resposta (streaming via SSE)
  sendMessage: protectedProcedure
    .input(sendMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 1. Criar ou recuperar conversa
      // 2. Salvar mensagem do usuário
      // 3. Classificar intent via orchestrator
      // 4. Rotear para agente correto
      // 5. Salvar resposta do agente
      // 6. Registrar audit log
      // 7. Retornar resposta (ou stream)
    }),

  // Histórico de mensagens (cursor-based)
  getHistory: protectedProcedure
    .input(getHistoryInputSchema)
    .query(async ({ ctx, input }) => {
      // Buscar mensagens com cursor-based pagination
      // Verificar que a conversa pertence ao userId
    }),

  // Listar conversas do usuário
  listConversations: protectedProcedure
    .input(listConversationsInputSchema)
    .query(async ({ ctx, input }) => {
      // Listar conversas do userId com cursor-based pagination
    }),

  // Criar nova conversa
  createConversation: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Criar nova conversa para o userId
    }),

  // Arquivar conversa
  archiveConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verificar ownership + atualizar status
    }),
});
```

### 3.2 Registrar no appRouter

Editar `packages/api/src/routers/index.ts` (ou `_app.ts`):

```typescript
import { chatRouter } from "./chat.router";

export const appRouter = router({
  // ... routers existentes
  auth: authRouter,
  account: accountRouter,
  transfer: transferRouter,
  card: cardRouter,
  kyc: kycRouter,
  notification: notificationRouter,
  chat: chatRouter, // ← ADICIONAR
});
```

---

## FASE 4 — UI DO CHAT (implementar após Fase 3)

### 4.1 Chat Widget — `packages/ui/src/components/chat/chat-widget.tsx`

Componente floating que aparece em todas as telas do dashboard:

- **Botão circular** no canto inferior direito (ícone de chat)
- **Panel expandido**: header (título + fechar) + lista de mensagens + input
- **Quick actions**: botões sugeridos ("Consultar saldo", "Fazer PIX", "Ver extrato")
- Usar `@ai-sdk/react` hook `useChat` para streaming no web
- Animação de typing indicator enquanto aguarda resposta

### 4.2 Web — Integrar no Layout

Editar `apps/web/src/app/(dashboard)/layout.tsx`:

```tsx
import { ChatWidget } from "@ecp/ui/components/chat/chat-widget";

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* ... layout existente (sidebar, header, etc) */}
      {children}
      <ChatWidget /> {/* ← ADICIONAR: floating no canto inferior direito */}
    </div>
  );
}
```

### 4.3 Mobile — Nova Tab

Editar `apps/mobile/app/(tabs)/_layout.tsx` para adicionar tab "Chat" com ícone de mensagem.

Criar `apps/mobile/app/(tabs)/chat.tsx` com UI nativa (FlatList para mensagens + TextInput).

---

## FASE 5 — RAG / BASE DE CONHECIMENTO (implementar em paralelo com Fase 2)

### 5.1 Seed da Base de Conhecimento

Criar `packages/api/src/knowledge/seed-knowledge.ts`:

1. Carregar conteúdo da especificação do produto (este documento + `02-especificacao-ecp-digital-bank.md`)
2. Dividir em chunks de ~500 tokens com overlap de 50 tokens
3. Gerar embeddings via OpenAI `text-embedding-3-small`
4. Inserir no `knowledge_embeddings` com source e metadata

### 5.2 Busca Semântica

Criar `packages/api/src/knowledge/vector-store.ts`:

```typescript
export async function searchKnowledge(query: string, maxResults = 5): Promise<KnowledgeChunk[]> {
  // 1. Gerar embedding da query
  // 2. Chamar função match_knowledge no Supabase (pgvector)
  // 3. Retornar chunks com similarity > 0.7
}
```

### 5.3 Knowledge Agent usa RAG

```typescript
// packages/api/src/agents/knowledge.ts
export async function handleKnowledge(message: string, conversationHistory: Message[]) {
  // 1. Buscar contexto relevante via searchKnowledge(message)
  // 2. Montar prompt com contexto RAG injetado
  // 3. Chamar Claude com system prompt + contexto + histórico
  // 4. Retornar resposta
}
```

---

## INTENTS — MAPA COMPLETO DE CLASSIFICAÇÃO

| Intent | Agente | Exemplos de mensagem do usuário |
|--------|--------|---------------------------------|
| `FAQ:NAVIGATION` | knowledge | "onde vejo meu extrato?", "como chego na tela de PIX?" |
| `FAQ:FEATURE` | knowledge | "o que o app faz?", "como funciona o cartão virtual?" |
| `FAQ:SECURITY` | knowledge | "como ativo biometria?", "como mudo minha senha?" |
| `RULES:PIX_LIMITS` | rules | "qual meu limite de PIX?", "quanto posso enviar por dia?" |
| `RULES:TED_LIMITS` | rules | "qual o limite de TED?", "TED funciona no sábado?" |
| `RULES:CARD_RULES` | rules | "quantos cartões posso ter?", "cancelamento é reversível?" |
| `RULES:KYC_RULES` | rules | "que documentos preciso enviar?", "aceita passaporte?" |
| `RULES:ACCOUNT_STATUS` | rules | "por que minha conta está pendente?", "o que é SUSPENDED?" |
| `TRANSACTION:PIX_SEND` | transaction | "quero fazer um PIX", "envia R$ 50 para 11999999999" |
| `TRANSACTION:BALANCE` | transaction | "qual meu saldo?", "quanto tenho na conta?" |
| `TRANSACTION:STATEMENT` | transaction | "mostra meu extrato", "quais foram minhas últimas transações?" |
| `TRANSACTION:CARD_CREATE` | transaction | "quero criar um cartão", "gera um cartão virtual" |
| `TRANSACTION:CARD_BLOCK` | transaction | "bloqueia meu cartão", "quero bloquear o cartão 4721" |
| `TRANSACTION:KYC_STATUS` | transaction | "como tá minha verificação?", "meu KYC foi aprovado?" |
| `GENERAL:GREETING` | orchestrator | "oi", "olá", "bom dia", "e aí?" |
| `GENERAL:OUT_OF_SCOPE` | orchestrator | "qual a previsão do tempo?", "me conta uma piada" |

---

## SEGURANÇA — CHECKLIST DE IMPLEMENTAÇÃO

- [ ] `ANTHROPIC_API_KEY` apenas no backend (variável de ambiente server-side)
- [ ] Toda transação requer confirmação explícita do usuário antes de executar
- [ ] CPF mascarado em todas as mensagens do chat (***.***. XXX-XX)
- [ ] Número de cartão: apenas últimos 4 dígitos no chat
- [ ] CVV: NUNCA exibido no chat
- [ ] Re-autenticação (biometria/senha) para ver dados completos do cartão
- [ ] Idempotency key UUID em toda transação financeira
- [ ] Audit log com `metadata.origin = "chatbot"` em toda ação
- [ ] Rate limiting: máx 10 transações/minuto por usuário via Upstash Redis
- [ ] Chat router usa `protectedProcedure` (requer sessão autenticada)
- [ ] Cada conversa vinculada ao `userId` — nunca acessar dados de outros usuários
- [ ] System prompts com guardrails contra prompt injection
- [ ] Input sanitizado via Zod schema (max 2000 chars por mensagem)

---

## TESTES — O QUE TESTAR (Vitest)

### Unitários
- [ ] `classifyIntent()` — testar com 3+ exemplos por intent
- [ ] Cada tool do transaction-agent — mock da API, verificar payload
- [ ] `searchKnowledge()` — mock do pgvector, verificar threshold
- [ ] Schemas Zod do chat — validação de inputs válidos e inválidos

### Integração
- [ ] Fluxo completo PIX via chat: mensagem → classificação → coleta → confirmação → execução
- [ ] Consulta de saldo via chat
- [ ] FAQ com RAG: pergunta → busca semântica → resposta com contexto
- [ ] Rate limiting: 11ª transação em 1 minuto deve retornar `CHAT_RATE_LIMITED`

### E2E (se aplicável)
- [ ] Chat widget abre/fecha corretamente
- [ ] Mensagem enviada aparece na lista
- [ ] Resposta do bot aparece com animação de streaming
- [ ] Quick actions funcionam

---

## VERIFICAÇÃO PÓS-IMPLEMENTAÇÃO

Após CADA mudança executar:
```bash
pnpm check-all   # lint + typecheck + test
```

Se falhar, corrigir ANTES de continuar.

Após TODAS as fases:
```bash
pnpm db:generate  # gerar migration final
pnpm db:migrate   # aplicar no banco
pnpm build        # verificar build de produção
pnpm test         # rodar todos os testes
```
