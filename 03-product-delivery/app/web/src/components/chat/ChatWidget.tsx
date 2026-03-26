import { useState } from 'react'
import { MessageCircle, X, RotateCcw } from 'lucide-react'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { useChat } from '../../hooks/useChat'

const QUICK_ACTIONS = [
  { label: 'Consultar saldo', message: 'Qual meu saldo?' },
  { label: 'Ver extrato', message: 'Mostra meu extrato' },
  { label: 'Fazer PIX', message: 'Quero fazer um PIX' },
  { label: 'Meus cartões', message: 'Quais são meus cartões?' },
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, isLoading, error, sendMessage, startNewConversation } = useChat()

  const showQuickActions = messages.length === 0

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-lime text-background
            shadow-lg hover:bg-lime-pressed transition-all duration-200
            flex items-center justify-center hover:scale-105 active:scale-95
            lg:bottom-8 lg:right-8"
          aria-label="Abrir chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-50 bg-background border border-border shadow-2xl
            flex flex-col overflow-hidden
            bottom-0 right-0 w-full h-full
            sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-card
            lg:bottom-8 lg:right-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-lime rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-xs">AI</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Assistente ECP</p>
                <p className="text-[10px] text-text-tertiary">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={startNewConversation}
                className="p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-secondary-bg transition-colors"
                title="Nova conversa"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-secondary-bg transition-colors"
                title="Fechar"
              >
                <X size={16} />
              </button>
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
      )}
    </>
  )
}
