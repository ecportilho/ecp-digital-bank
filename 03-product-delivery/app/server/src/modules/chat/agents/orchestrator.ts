import Anthropic from '@anthropic-ai/sdk'
import { ORCHESTRATOR_SYSTEM_PROMPT } from './prompts/orchestrator.prompt.js'
import type { ChatIntent } from '../chat.schema.js'

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514'

interface ClassificationResult {
  intent: ChatIntent
  agent: 'knowledge' | 'rules' | 'transaction' | 'orchestrator'
  directResponse?: string
}

const INTENT_TO_AGENT: Record<string, ClassificationResult['agent']> = {
  'FAQ:': 'knowledge',
  'RULES:': 'rules',
  'TRANSACTION:': 'transaction',
  'GENERAL:': 'orchestrator',
}

function getAgentForIntent(intent: string): ClassificationResult['agent'] {
  for (const [prefix, agent] of Object.entries(INTENT_TO_AGENT)) {
    if (intent.startsWith(prefix)) {
      return agent
    }
  }
  return 'orchestrator'
}

export async function classifyIntent(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<ClassificationResult> {
  const client = new Anthropic()

  // Build context from last few messages
  const recentHistory = conversationHistory.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 300,
    temperature: 0.1,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [
      ...recentHistory,
      {
        role: 'user',
        content: `Classifique a intenção da mensagem abaixo. Responda APENAS com um JSON no formato:
{"intent": "INTENT_ENUM", "directResponse": "resposta se for GENERAL:GREETING ou GENERAL:OUT_OF_SCOPE"}

Mensagem: "${message}"`,
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { intent: 'GENERAL:OUT_OF_SCOPE', agent: 'orchestrator' }
    }

    const parsed = JSON.parse(jsonMatch[0]) as { intent: string; directResponse?: string }
    const intent = parsed.intent as ChatIntent
    const agent = getAgentForIntent(intent)

    return {
      intent,
      agent,
      directResponse: parsed.directResponse,
    }
  } catch {
    return { intent: 'GENERAL:OUT_OF_SCOPE', agent: 'orchestrator' }
  }
}
