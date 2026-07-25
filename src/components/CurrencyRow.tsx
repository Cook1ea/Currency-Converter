import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { DragHandleIcon, MinusCircleIcon } from './Icons'
import { useLongPress } from '../hooks/useLongPress'
import { amountFontSize } from '../lib/format'
import type { Currency } from '../types'

interface CurrencyRowProps {
  currency: Currency
  /** 已格式化好的金额文本 */
  amountText: string
  /** 无障碍朗读用的完整金额 */
  amountLabel: string
  /** 未结算的算式提示（仅输入行），例如 "1,200 ×" */
  pendingText: string | null
  isActive: boolean
  isEditing: boolean
  isDragging: boolean
  canRemove: boolean
  style?: CSSProperties
  /** 点击金额区域：切换输入行 / 展开键盘 / 复制，由上层决定 */
  onTap: () => void
  /** 长按金额区域：复制完整数值 */
  onCopy: () => void
  onOpenPicker: () => void
  onRemove: () => void
  /** 键盘上下键调整顺序，为拖拽提供无障碍替代方案 */
  onMove: (direction: -1 | 1) => void
  dragHandleProps: { onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void }
}

export function CurrencyRow({
  currency,
  amountText,
  amountLabel,
  pendingText,
  isActive,
  isEditing,
  isDragging,
  canRemove,
  style,
  onTap,
  onCopy,
  onOpenPicker,
  onRemove,
  onMove,
  dragHandleProps,
}: CurrencyRowProps) {
  const amountHandlers = useLongPress(onCopy, onTap, !isEditing)

  const className = [
    'row',
    isActive && !isEditing ? 'row--active' : '',
    isEditing ? 'row--editing' : '',
    isDragging ? 'row--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={className} style={style} data-row aria-current={isActive ? 'true' : undefined}>
      {isEditing && (
        <button
          type="button"
          className="row__remove"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`删除 ${currency.nameZh}`}
        >
          <MinusCircleIcon />
        </button>
      )}

      <button
        type="button"
        className="row__identity"
        onClick={onOpenPicker}
        aria-label={`${currency.nameZh} ${currency.code}，点击更换货币`}
      >
        <span className="row__flag" aria-hidden="true">
          {currency.flag}
        </span>
        <span className="row__names">
          <span className="row__code">{currency.code}</span>
          <span className="row__name">{currency.nameZh}</span>
        </span>
      </button>

      {isEditing ? (
        <span
          className="row__handle"
          role="button"
          tabIndex={0}
          aria-label={`调整 ${currency.nameZh} 的顺序，可拖动或使用上下方向键`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              onMove(-1)
            } else if (event.key === 'ArrowDown') {
              event.preventDefault()
              onMove(1)
            }
          }}
          {...dragHandleProps}
        >
          <DragHandleIcon />
        </span>
      ) : (
        <div
          className="row__amount"
          role="button"
          tabIndex={0}
          aria-label={`${currency.nameZh} ${amountLabel}${
            isActive ? '，当前输入行，长按可复制' : '，点击切换为输入货币，长按可复制'
          }`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onTap()
            }
          }}
          {...amountHandlers}
        >
          <div className="row__amount-stack">
            {pendingText && <span className="row__pending">{pendingText}</span>}
            <span className="row__value-line">
              <span className="row__value" style={{ fontSize: amountFontSize(amountText) }}>
                {amountText}
              </span>
              {isActive && <span className="row__caret" aria-hidden="true" />}
            </span>
          </div>
        </div>
      )}
    </li>
  )
}
