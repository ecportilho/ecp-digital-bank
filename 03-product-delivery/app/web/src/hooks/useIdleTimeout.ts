import { useEffect, useRef, useCallback } from 'react'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useIdleTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onTimeout, IDLE_TIMEOUT_MS)
  }, [onTimeout])

  useEffect(() => {
    if (!enabled) return

    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll']

    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [enabled, resetTimer])
}
