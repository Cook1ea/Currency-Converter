import { BackspaceIcon, ChevronDownIcon } from './Icons'
import type { KeypadKey, Operator } from '../lib/calculator'

interface KeypadProps {
  onKey: (key: KeypadKey) => void
  onDone: () => void
  /** 当前输入行的货币代码，用于无障碍描述 */
  activeCode: string
  /** 当前待处理的运算符，用于高亮对应按键 */
  activeOperator: Operator | null
}

const OPERATOR_LABEL: Record<Operator, string> = {
  '÷': '除以',
  '×': '乘以',
  '-': '减',
  '+': '加',
}

/**
 * 自定义数字键盘。
 *
 * 5 列 4 行：数字保持计算器的 3 列排布放在左侧，运算与功能键收在右侧两列。
 * 之所以不用更直觉的 4 列 5 行，是因为在 iPhone 上多出的那一行会把
 * 货币列表挤到需要滚动才能看全。
 *
 *   7   8   9   ⌫   AC
 *   4   5   6   ÷   ×
 *   1   2   3   −   +
 *   [   0   ]   .   =   完成
 */
export function Keypad({ onKey, onDone, activeCode, activeOperator }: KeypadProps) {
  const digit = (value: string) => (
    <button
      key={value}
      type="button"
      className="keypad__button"
      onClick={() => onKey({ type: 'digit', value })}
      aria-label={`数字 ${value}`}
    >
      {value}
    </button>
  )

  const operator = (value: Operator) => (
    <button
      key={value}
      type="button"
      className={`keypad__button keypad__button--operator${
        activeOperator === value ? ' keypad__button--operator-active' : ''
      }`}
      onClick={() => onKey({ type: 'operator', value })}
      aria-label={OPERATOR_LABEL[value]}
      aria-pressed={activeOperator === value}
    >
      {value}
    </button>
  )

  return (
    <div className="keypad" role="group" aria-label={`${activeCode} 金额数字键盘`}>
      {['7', '8', '9'].map(digit)}
      <button
        type="button"
        className="keypad__button keypad__button--muted"
        onClick={() => onKey({ type: 'backspace' })}
        aria-label="退格"
      >
        <BackspaceIcon />
      </button>
      <button
        type="button"
        className="keypad__button keypad__button--muted"
        onClick={() => onKey({ type: 'clear' })}
        aria-label="清空金额"
      >
        AC
      </button>

      {['4', '5', '6'].map(digit)}
      {operator('÷')}
      {operator('×')}

      {['1', '2', '3'].map(digit)}
      {operator('-')}
      {operator('+')}

      <button
        type="button"
        className="keypad__button keypad__button--wide"
        onClick={() => onKey({ type: 'digit', value: '0' })}
        aria-label="数字 0"
      >
        0
      </button>
      <button
        type="button"
        className="keypad__button"
        onClick={() => onKey({ type: 'dot' })}
        aria-label="小数点"
      >
        .
      </button>
      <button
        type="button"
        className="keypad__button keypad__button--operator"
        onClick={() => onKey({ type: 'equals' })}
        aria-label="等于"
      >
        =
      </button>
      <button
        type="button"
        className="keypad__button keypad__button--primary"
        onClick={onDone}
        aria-label="收起数字键盘"
      >
        <ChevronDownIcon />
      </button>
    </div>
  )
}
