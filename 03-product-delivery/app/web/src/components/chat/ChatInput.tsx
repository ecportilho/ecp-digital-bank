import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  quickActions?: Array<{ label: string; message: string }>
}

export function ChatInput({ onSend, isLoading, quickActions }: ChatInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const voice = useSpeechRecognition('pt-BR')
  const baselineRef = useRef('')

  // Quando o reconhecimento de voz esta ativo, o que ele transcreve vira pro input.
  // `baselineRef` guarda o que o usuario ja tinha digitado antes de acionar o mic,
  // pra que o ditado concatene em vez de sobrescrever.
  useEffect(() => {
    if (!voice.listening) return
    const spoken = [voice.transcript, voice.interimTranscript].filter(Boolean).join(' ').trim()
    const merged = baselineRef.current
      ? (spoken ? baselineRef.current + ' ' + spoken : baselineRef.current)
      : spoken
    setValue(merged)
  }, [voice.transcript, voice.interimTranscript, voice.listening])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    if (voice.listening) voice.stop()
    voice.reset()
    baselineRef.current = ''
    onSend(trimmed)
    setValue('')
    inputRef.current?.focus()
  }, [value, isLoading, onSend, voice])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicToggle = () => {
    if (voice.listening) {
      voice.stop()
      return
    }
    // Guarda texto ja digitado como baseline e comeca nova sessao de ditado.
    baselineRef.current = value.trim()
    voice.start()
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
          placeholder={voice.listening ? 'Ouvindo... fale seu comando' : 'Digite ou clique no microfone'}
          rows={1}
          maxLength={2000}
          disabled={isLoading}
          className={`flex-1 bg-secondary-bg border rounded-control px-3.5 py-2.5
            text-sm text-text-primary placeholder:text-text-tertiary
            outline-none resize-none transition-colors max-h-24 disabled:opacity-50
            ${voice.listening ? 'border-danger' : 'border-border focus:border-lime'}`}
          style={{ minHeight: '40px' }}
        />
        {voice.supported && (
          <button
            onClick={handleMicToggle}
            disabled={isLoading}
            aria-label={voice.listening ? 'Parar gravacao' : 'Falar comando'}
            title={voice.listening ? 'Clique para parar' : 'Clique para ditar em portugues'}
            className={`w-10 h-10 flex items-center justify-center rounded-control transition-colors flex-shrink-0
              ${voice.listening
                ? 'bg-danger/15 text-danger border border-danger animate-pulse'
                : 'bg-secondary-bg border border-border text-text-secondary hover:text-lime hover:border-lime'}
              disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
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
      {voice.error && (
        <div className="mt-2 text-xs text-danger">{voice.error}</div>
      )}
      {voice.listening && !voice.error && (
        <div className="mt-2 text-xs text-text-tertiary flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
          Ouvindo em pt-BR... clique no microfone para parar.
        </div>
      )}
    </div>
  )
}
