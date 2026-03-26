import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../services/api'

interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: string | null
  intent?: string | null
  createdAt: string
}

interface SendMessageResponse {
  conversationId: string
  message: ChatMessage
}

interface ConversationListResponse {
  conversations: Array<{
    id: string
    title: string | null
    status: string
    createdAt: string
    updatedAt: string
  }>
  nextCursor: string | null
}

interface HistoryResponse {
  messages: ChatMessage[]
  nextCursor: string | null
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    setError(null)
    setIsLoading(true)

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId ?? '',
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      abortRef.current = new AbortController()
      const response = await api.post<SendMessageResponse>(
        '/api/chat/messages',
        {
          conversationId: conversationId ?? undefined,
          message,
        },
        { signal: abortRef.current.signal },
      )

      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(response.conversationId)
      }

      // Replace temp message with real user message id and add assistant response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id)
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: `user-${Date.now()}`, conversationId: response.conversationId },
          response.message,
        ]
      })
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string }
      if (e.name === 'AbortError') return
      setError(e.message ?? 'Erro ao enviar mensagem')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [conversationId, isLoading])

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<HistoryResponse>(
        `/api/chat/conversations/${convId}/messages?limit=50`,
      )
      setMessages(response.messages)
      setConversationId(convId)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message ?? 'Erro ao carregar conversa')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startNewConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  const listConversations = useCallback(async () => {
    const response = await api.get<ConversationListResponse>(
      '/api/chat/conversations?limit=10',
    )
    return response.conversations
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
    listConversations,
  }
}
