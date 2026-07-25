import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const LONG_PRESS_MS = 500
/** 手指移动超过这个距离就认为是滚动，不再触发长按 */
const MOVE_TOLERANCE_PX = 10

export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerCancel: () => void
  onContextMenu: (event: { preventDefault: () => void }) => void
}

/**
 * 长按手势。长按触发后会吞掉紧随其后的一次点击，
 * 避免「长按复制」同时又触发「点击切换货币」。
 */
export function useLongPress(
  onLongPress: () => void,
  onTap?: () => void,
  enabled = true,
): LongPressHandlers {
  const timer = useRef<number | undefined>(undefined)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const triggered = useRef(false)

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    origin.current = null
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      triggered.current = false
      origin.current = { x: event.clientX, y: event.clientY }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        triggered.current = true
        onLongPress()
      }, LONG_PRESS_MS)
    },
    [enabled, onLongPress],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!origin.current) return
      const dx = Math.abs(event.clientX - origin.current.x)
      const dy = Math.abs(event.clientY - origin.current.y)
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel()
    },
    [cancel],
  )

  const onPointerUp = useCallback(() => {
    cancel()
    if (!enabled) return
    if (triggered.current) {
      triggered.current = false
      return
    }
    onTap?.()
  }, [cancel, enabled, onTap])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event) => {
      // 长按时不要弹出系统菜单
      if (enabled) event.preventDefault()
    },
  }
}
