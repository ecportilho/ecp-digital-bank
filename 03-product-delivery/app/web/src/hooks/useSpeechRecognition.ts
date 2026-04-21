import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wrapper sobre a Web Speech API (SpeechRecognition) para ditar comandos em
 * pt-BR direto no chat do banco.
 *
 * A Web Speech API e nativa do browser (Chrome/Edge, e Safari desktop em versoes
 * recentes). Nao requer chaves, nao manda audio pra API externa paga — o proprio
 * navegador faz o STT. Transcribe continuo ate o usuario mandar parar.
 *
 * Navegadores sem suporte (Firefox hoje, alguns mobile) retornam supported=false
 * — callers escondem o botao de microfone nesses casos.
 */

// O tipo SpeechRecognition nao vem nos lib.dom.d.ts padrao.
// Declaramos o minimo necessario aqui.
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export interface UseSpeechRecognitionResult {
  supported: boolean
  listening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(lang = 'pt-BR'): UseSpeechRecognitionResult {
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalPiece = ''
      let interimPiece = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) finalPiece += text
        else interimPiece += text
      }
      if (finalPiece) {
        setTranscript((prev) => (prev ? prev + ' ' + finalPiece.trim() : finalPiece.trim()))
      }
      setInterimTranscript(interimPiece.trim())
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Silencio ou cancelamento normal — nao trata como erro.
        return
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Permissao de microfone negada. Habilite nas configuracoes do site.')
      } else if (event.error === 'network') {
        setError('Sem conexao para transcricao de voz.')
      } else {
        setError(`Erro no reconhecimento: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    setInterimTranscript('')
    try {
      recognitionRef.current.start()
    } catch (err) {
      // Chrome lanca se voce chamar start() enquanto ja esta ativo — ignora.
      if (err instanceof Error && err.message.includes('already started')) return
      setError('Nao foi possivel iniciar a gravacao.')
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      // ignore — onend cuida do cleanup
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return { supported, listening, transcript, interimTranscript, error, start, stop, reset }
}
