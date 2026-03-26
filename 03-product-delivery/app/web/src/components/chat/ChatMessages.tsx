import { useEffect, useRef } from 'react'
import { ChatBubble } from './ChatBubble'
import { Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-info/20 text-info">
        <Bot size={14} />
      </div>
      <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary px-4">
        <Bot size={40} className="mb-3 text-info/40" />
        <p className="text-sm font-medium text-text-secondary">Assistente ECP Bank</p>
        <p className="text-xs mt-1 text-center">
          Pergunte sobre saldo, extrato, PIX, cartões ou qualquer dúvida sobre o app.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          createdAt={msg.createdAt}
        />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
