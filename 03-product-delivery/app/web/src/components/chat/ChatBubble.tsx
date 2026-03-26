import { Bot, User } from 'lucide-react'

interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

export function ChatBubble({ role, content, createdAt }: ChatBubbleProps) {
  const isUser = role === 'user'

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-lime/20 text-lime' : 'bg-info/20 text-info'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-lime text-background rounded-tr-md'
              : 'bg-surface border border-border text-text-primary rounded-tl-md'
          }`}
        >
          {content}
        </div>
        {time && (
          <p className={`text-[10px] text-text-tertiary mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {time}
          </p>
        )}
      </div>
    </div>
  )
}
