import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastState {
  id: number
  message: string
}

/** 轻量提示：同一时刻只显示一条，自动消失。 */
export function useToast(durationMs = 1800): {
  toast: ToastState | null
  showToast: (message: string) => void
} {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const counter = useRef(0)

  const showToast = useCallback(
    (message: string) => {
      counter.current += 1
      setToast({ id: counter.current, message })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setToast(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { toast, showToast }
}
