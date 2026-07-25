import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

interface DragState {
  index: number
  startY: number
  deltaY: number
  rowHeight: number
}

export interface UseDragReorderResult {
  /** 正在拖动的行下标，未拖动时为 null */
  dragIndex: number | null
  /** 拖动过程中该行应落到的位置 */
  targetIndex: number | null
  /** 拖拽手柄需要绑定的事件（Pointer Events，同时支持触屏与鼠标） */
  getHandleProps: (index: number) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  }
  /** 拖动过程中每一行的位移样式 */
  getItemStyle: (index: number) => CSSProperties
}

/**
 * 基于 Pointer Events 的列表拖拽排序。
 *
 * 之所以不用 HTML5 Drag and Drop：iOS Safari 对它支持很差，触屏基本拖不动。
 * Pointer Events + setPointerCapture 在 iPhone 上表现稳定，配合手柄上的
 * `touch-action: none` 可以避免拖动时页面跟着滚动。
 */
export function useDragReorder(
  itemCount: number,
  onReorder: (from: number, to: number) => void,
): UseDragReorderResult {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const setDragState = useCallback((next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  const targetIndex = drag
    ? clamp(drag.index + Math.round(drag.deltaY / drag.rowHeight), 0, itemCount - 1)
    : null

  const finish = useCallback(() => {
    const current = dragRef.current
    if (!current) return
    const to = clamp(
      current.index + Math.round(current.deltaY / current.rowHeight),
      0,
      itemCount - 1,
    )
    setDragState(null)
    if (to !== current.index) onReorder(current.index, to)
  }, [itemCount, onReorder, setDragState])

  const onPointerDown = useCallback(
    (index: number, event: ReactPointerEvent<HTMLElement>) => {
      if (itemCount < 2) return
      const handle = event.currentTarget
      const row = handle.closest('[data-row]') as HTMLElement | null
      const rowHeight = row?.offsetHeight ?? 56

      handle.setPointerCapture(event.pointerId)
      event.preventDefault()
      setDragState({ index, startY: event.clientY, deltaY: 0, rowHeight })
    },
    [itemCount, setDragState],
  )

  // 拖动与结束统一挂在 window 上，指针移出手柄也不会丢事件
  useEffect(() => {
    if (!drag) return

    const onMove = (event: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      setDragState({ ...current, deltaY: event.clientY - current.startY })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [drag, finish, setDragState])

  const getItemStyle = useCallback(
    (index: number): CSSProperties => {
      if (!drag || targetIndex === null) return {}

      if (index === drag.index) {
        return {
          transform: `translate3d(0, ${drag.deltaY}px, 0)`,
          zIndex: 2,
          position: 'relative',
          transition: 'none',
        }
      }

      // 被拖动行经过的其它行整体让位
      let shift = 0
      if (drag.index < targetIndex && index > drag.index && index <= targetIndex) {
        shift = -drag.rowHeight
      } else if (drag.index > targetIndex && index >= targetIndex && index < drag.index) {
        shift = drag.rowHeight
      }
      return {
        transform: `translate3d(0, ${shift}px, 0)`,
        transition: 'transform 180ms ease',
      }
    },
    [drag, targetIndex],
  )

  const getHandleProps = useCallback(
    (index: number) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(index, event),
    }),
    [onPointerDown],
  )

  return { dragIndex: drag?.index ?? null, targetIndex, getHandleProps, getItemStyle }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
