import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_SYSTEM_PROMPT } from './prompts/knowledge.prompt.js'

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514'
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS) || 2048

export async function handleKnowledge(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  const client = new Anthropic()

  const messages = [
    ...conversationHistory.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    temperature: 0.3,
    system: KNOWLEDGE_SYSTEM_PROMPT,
    messages,
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return text || 'Desculpe, não consegui processar sua pergunta. Pode reformular?'
}
