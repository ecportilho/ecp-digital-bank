import Anthropic from '@anthropic-ai/sdk'
import { TRANSACTION_SYSTEM_PROMPT } from './prompts/transaction.prompt.js'
import { getBalanceTool } from './tools/balance.tool.js'
import { getStatementTool } from './tools/statement.tool.js'
import { sendPixTool } from './tools/pix-transfer.tool.js'
import { createCardTool } from './tools/card-create.tool.js'
import { blockCardTool, listUserCards } from './tools/card-block.tool.js'
import { getKycStatusTool } from './tools/kyc-status.tool.js'

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514'
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS) || 2048

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_balance',
    description: 'Consultar saldo atual da conta bancária do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_statement',
    description: 'Consultar extrato de transações recentes da conta',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Quantidade de transações (máx 20)', default: 10 },
      },
      required: [],
    },
  },
  {
    name: 'send_pix',
    description: 'Enviar uma transferência PIX. SOMENTE execute após confirmação explícita do usuário.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pixKey: { type: 'string', description: 'Chave PIX do destinatário' },
        amountCents: { type: 'number', description: 'Valor em centavos (ex: 10000 = R$ 100,00)' },
        description: { type: 'string', description: 'Descrição da transferência' },
      },
      required: ['pixKey', 'amountCents'],
    },
  },
  {
    name: 'create_card',
    description: 'Gerar um novo cartão virtual para o usuário',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'block_card',
    description: 'Bloquear ou desbloquear um cartão virtual do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        cardId: { type: 'string', description: 'ID do cartão' },
        block: { type: 'boolean', description: 'true para bloquear, false para desbloquear' },
      },
      required: ['cardId', 'block'],
    },
  },
  {
    name: 'list_cards',
    description: 'Listar todos os cartões virtuais ativos do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_kyc_status',
    description: 'Consultar status da verificação de identidade (KYC) do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]

function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string,
  accountId: string,
): unknown {
  switch (toolName) {
    case 'get_balance':
      return getBalanceTool(userId)
    case 'get_statement':
      return getStatementTool(userId, toolInput.limit as number | undefined)
    case 'send_pix':
      return sendPixTool(
        userId,
        accountId,
        toolInput.pixKey as string,
        toolInput.amountCents as number,
        toolInput.description as string | undefined,
      )
    case 'create_card':
      return createCardTool(userId, accountId)
    case 'block_card':
      return blockCardTool(userId, toolInput.cardId as string, toolInput.block as boolean)
    case 'list_cards':
      return listUserCards(userId)
    case 'get_kyc_status':
      return getKycStatusTool(userId)
    default:
      return { error: `Tool "${toolName}" não reconhecida.` }
  }
}

export async function handleTransaction(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userId: string,
  accountId: string,
): Promise<{ response: string; toolCalls?: Record<string, unknown>[] }> {
  const client = new Anthropic()

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  let response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    temperature: 0.3,
    system: TRANSACTION_SYSTEM_PROMPT,
    messages,
    tools: TOOLS,
  })

  const toolCallsLog: Record<string, unknown>[] = []

  // Tool use loop — process until we get a final text response
  let iterations = 0
  const maxIterations = 5

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const result = executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        userId,
        accountId,
      )

      toolCallsLog.push({
        tool: toolUse.name,
        input: toolUse.input,
        output: result,
      })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      })
    }

    // Continue the conversation with tool results
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      temperature: 0.3,
      system: TRANSACTION_SYSTEM_PROMPT,
      messages,
      tools: TOOLS,
    })
  }

  // Extract final text
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  )
  const finalText = textBlocks.map((b) => b.text).join('\n')

  return {
    response: finalText || 'Desculpe, não consegui processar sua solicitação. Pode tentar novamente?',
    toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
  }
}
