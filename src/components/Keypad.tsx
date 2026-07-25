import { BackspaceIcon } from './Icons'
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
 * 自定义数字键盘，布局对齐手机自带计算器：
 *
 *   AC  ⌫  ÷  ×
 *   7   8  9  −
 *   4   5  6  +
 *   1   2  3  =
 *   0   .  完成（占两格）
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
      <button
        type="button"
        className="keypad__button keypad__button--muted"
        onClick={() => onKey({ type: 'clear' })}
        aria-label="清空金额"
      >
        AC
      </button>
      <button
        type="button"
        className="keypad__button keypad__button--muted"
        onClick={() => onKey({ type: 'backspace' })}
        aria-label="退格"
      >
        <BackspaceIcon />
      </button>
      {operator('÷')}
      {operator('×')}

      {['7', '8', '9'].map(digit)}
      {operator('-')}

      {['4', '5', '6'].map(digit)}
      {operator('+')}

      {['1', '2', '3'].map(digit)}
      <button
        type="button"
        className="keypad__button keypad__button--operator"
        onClick={() => onKey({ type: 'equals' })}
        aria-label="等于"
      >
        =
      </button>

      {digit('0')}
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
        className="keypad__button keypad__button--primary keypad__button--wide"
        onClick={onDone}
        aria-label="完成输入，收起键盘"
      >
        完成
      </button>
    </div>
  )
}
