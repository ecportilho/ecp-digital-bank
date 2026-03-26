import { useState, useEffect } from 'react'
import { MessageCircle, Plus, Archive } from 'lucide-react'
import { ChatMessages } from '../components/chat/ChatMessages'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'

interface Conversation {
  id: string
  title: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const QUICK_ACTIONS = [
  { label: 'Consultar saldo', message: 'Qual meu saldo?' },
  { label: 'Ver extrato', message: 'Mostra meu extrato' },
  { label: 'Fazer PIX', message: 'Quero fazer um PIX' },
  { label: 'Meus cartões', message: 'Quais são meus cartões?' },
  { label: 'Limites PIX', message: 'Quais são os limites de PIX?' },
  { label: 'Status KYC', message: 'Qual o status da minha verificação?' },
]

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
    listConversations,
  } = useChat()

  const showQuickActions = messages.length === 0

  useEffect(() => {
    listConversations().then(setConversations).catch(() => {})
  }, [listConversations])

  // Refresh conversation list when a new conversation is created
  useEffect(() => {
    if (conversationId) {
      listConversations().then(setConversations).catch(() => {})
    }
  }, [conversationId, listConversations])

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar — conversation list */}
      <div className="hidden md:flex flex-col w-72 bg-surface border border-border rounded-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Conversas</h2>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-control text-text-secondary hover:text-lime hover:bg-lime/10 transition-colors"
            title="Nova conversa"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-text-tertiary p-4 text-center">
              Nenhuma conversa ainda
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-secondary-bg ${
                  conversationId === conv.id ? 'bg-lime/5 border-l-2 border-l-lime' : ''
                }`}
              >
                <p className="text-sm text-text-primary truncate">
                  {conv.title ?? 'Nova conversa'}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-surface border border-border rounded-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="w-9 h-9 bg-lime rounded-lg flex items-center justify-center">
            <MessageCircle size={18} className="text-background" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Assistente ECP Bank</p>
            <p className="text-[10px] text-text-tertiary">
              Tire dúvidas, consulte saldo, faça PIX e muito mais
            </p>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} isLoading={isLoading} />

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-danger/10 border-t border-danger/20">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          quickActions={showQuickActions ? QUICK_ACTIONS : undefined}
        />
      </div>
    </div>
  )
}
