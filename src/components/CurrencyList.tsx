import { CurrencyRow } from './CurrencyRow'
import { PlusCircleIcon } from './Icons'
import { getCurrency } from '../config/currencies'
import { useDragReorder } from '../hooks/useDragReorder'
import { convert } from '../lib/convert'
import { formatAmount, formatDraft } from '../lib/format'
import type { CurrencyCode, RateSnapshot } from '../types'

interface CurrencyListProps {
  codes: readonly CurrencyCode[]
  snapshot: RateSnapshot | null
  activeCode: CurrencyCode
  /** 输入行正在显示的原始输入串 */
  draft: string
  /** draft 是尚未输入时的占位值（显示为灰色） */
  isPlaceholder: boolean
  /** 输入串对应的数值，用于换算其余货币 */
  amount: number
  /** 未结算的算式提示，例如 "1,200 ×" */
  pendingText: string | null
  isEditing: boolean
  canRemove: boolean
  canAdd: boolean
  onTapRow: (code: CurrencyCode) => void
  onOpenPicker: (code: CurrencyCode) => void
  onCopy: (code: CurrencyCode, value: number | null) => void
  onRemove: (code: CurrencyCode) => void
  onReorder: (from: number, to: number) => void
  onAdd: () => void
}

export function CurrencyList({
  codes,
  snapshot,
  activeCode,
  draft,
  isPlaceholder,
  amount,
  pendingText,
  isEditing,
  canRemove,
  canAdd,
  onTapRow,
  onOpenPicker,
  onCopy,
  onRemove,
  onReorder,
  onAdd,
}: CurrencyListProps) {
  const { dragIndex, getHandleProps, getItemStyle } = useDragReorder(codes.length, onReorder)

  return (
    <div className="list-wrapper">
      <ul className="list" aria-label="货币换算列表">
        {codes.map((code, index) => {
          const currency = getCurrency(code)
          const isActive = code === activeCode
          const value = isActive ? amount : convert(amount, activeCode, code, snapshot)
          const amountText = isActive ? formatDraft(draft) : formatAmount(value, currency.decimals)

          return (
            <CurrencyRow
              key={code}
              currency={currency}
              amountText={amountText}
              amountLabel={amountText === '—' ? '暂无汇率' : amountText}
              isPlaceholder={isActive && isPlaceholder}
              pendingText={isActive ? pendingText : null}
              isActive={isActive}
              isEditing={isEditing}
              isDragging={dragIndex === index}
              canRemove={canRemove}
              style={getItemStyle(index)}
              onTap={() => onTapRow(code)}
              onCopy={() => onCopy(code, value)}
              onOpenPicker={() => onOpenPicker(code)}
              onRemove={() => onRemove(code)}
              onMove={(direction) => onReorder(index, index + direction)}
              dragHandleProps={getHandleProps(index)}
            />
          )
        })}
      </ul>

      {isEditing && (
        <button type="button" className="add-button card" onClick={onAdd} disabled={!canAdd}>
          <PlusCircleIcon />
          <span>{canAdd ? '添加货币' : '最多显示 10 种货币'}</span>
        </button>
      )}

      {isEditing && (
        <p className="list-hint">按住右侧 <span aria-hidden="true">≡</span> 可拖动排序，点击货币名称可更换币种</p>
      )}
    </div>
  )
}
