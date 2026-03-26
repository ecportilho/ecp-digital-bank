import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  quickActions?: Array<{ label: string; message: string }>
}

export function ChatInput({ onSend, isLoading, quickActions }: ChatInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    inputRef.current?.focus()
  }, [value, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {/* Quick actions */}
      {quickActions && quickActions.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {quickActions.map((action) => (
            <button
              key={action.message}
              onClick={() => onSend(action.message)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary
                hover:border-lime hover:text-lime transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={1}
          maxLength={2000}
          disabled={isLoading}
          className="flex-1 bg-secondary-bg border border-border rounded-control px-3.5 py-2.5
            text-sm text-text-primary placeholder:text-text-tertiary
            outline-none resize-none focus:border-lime transition-colors
            max-h-24 disabled:opacity-50"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className="w-10 h-10 flex items-center justify-center rounded-control
            bg-lime text-background hover:bg-lime-pressed transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
