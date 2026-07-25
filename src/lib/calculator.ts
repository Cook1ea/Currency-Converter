import {
  MAX_FRACTION_DIGITS,
  MAX_INTEGER_DIGITS,
  appendDigit,
  appendDot,
  backspace,
  sanitizeDraft,
} from './draft'
import { roundTo, trimTrailingZeros } from './number'

/**
 * 键盘上的简单四则运算。
 *
 * 行为对齐手机自带计算器的「基础模式」：只维护一个待处理运算，
 * 按下运算符时先结算上一步，不做括号与优先级——那属于被排除的「复杂计算器」。
 */

export type Operator = '+' | '-' | '×' | '÷'

export type KeypadKey =
  | { type: 'digit'; value: string }
  | { type: 'dot' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; value: Operator }
  | { type: 'equals' }

export interface CalcState {
  /** 当前正在输入的数字串 */
  entry: string
  /** 待处理的运算：左操作数与运算符 */
  pending: { value: number; operator: Operator } | null
  /** 下一次输入数字时是否要清空 entry 重新开始 */
  replaceEntry: boolean
}

export const INITIAL_CALC_STATE: CalcState = { entry: '', pending: null, replaceEntry: false }

export function createCalcState(entry: string): CalcState {
  return { entry: sanitizeDraft(entry), pending: null, replaceEntry: false }
}

/** 当前输入串对应的数值。 */
export function calcValue(state: CalcState): number {
  if (state.entry === '' || state.entry === '.') return 0
  const parsed = Number(state.entry)
  return Number.isFinite(parsed) ? parsed : 0
}

function compute(left: number, operator: Operator, right: number): number | null {
  let result: number
  switch (operator) {
    case '+':
      result = left + right
      break
    case '-':
      result = left - right
      break
    case '×':
      result = left * right
      break
    case '÷':
      if (right === 0) return null
      result = left / right
      break
  }
  return Number.isFinite(result) ? result : null
}

/** 运算结果转回输入串，并保证仍满足输入串的长度约束。 */
function toEntry(value: number): string {
  if (value === 0) return ''
  // 负数在这个界面里没有意义（金额不会为负），直接截断到 0
  if (value < 0) return ''

  const text = trimTrailingZeros(roundTo(value, MAX_FRACTION_DIGITS).toFixed(MAX_FRACTION_DIGITS), 0)
  const [intPart = '', fracPart = ''] = text.split('.')
  if (intPart.length > MAX_INTEGER_DIGITS) return intPart.slice(0, MAX_INTEGER_DIGITS)
  return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart
}

export function applyKey(state: CalcState, key: KeypadKey): CalcState {
  switch (key.type) {
    case 'clear':
      return INITIAL_CALC_STATE

    case 'digit': {
      const base = state.replaceEntry ? '' : state.entry
      return { ...state, entry: appendDigit(base, key.value), replaceEntry: false }
    }

    case 'dot': {
      const base = state.replaceEntry ? '' : state.entry
      return { ...state, entry: appendDot(base), replaceEntry: false }
    }

    case 'backspace':
      // 结果态下按退格，转为可继续编辑该结果
      return { ...state, entry: backspace(state.entry), replaceEntry: false }

    case 'operator': {
      // 连续按运算符只替换运算符，不重复结算
      if (state.replaceEntry && state.pending) {
        return { ...state, pending: { ...state.pending, operator: key.value } }
      }

      const current = calcValue(state)
      const left = state.pending ? compute(state.pending.value, state.pending.operator, current) : current
      if (left === null) return state

      return { entry: toEntry(left), pending: { value: left, operator: key.value }, replaceEntry: true }
    }

    case 'equals': {
      if (!state.pending) return { ...state, replaceEntry: true }
      const result = compute(state.pending.value, state.pending.operator, calcValue(state))
      if (result === null) return state
      return { entry: toEntry(result), pending: null, replaceEntry: true }
    }
  }
}

/** 顶部的算式提示，例如 "1,200 ×"；没有待处理运算时返回 null。 */
export function pendingLabel(state: CalcState, format: (entry: string) => string): string | null {
  if (!state.pending) return null
  return `${format(toEntry(state.pending.value))} ${state.pending.operator}`
}

/** 除零等无效操作的判定，供界面给出提示。 */
export function isDivisionByZero(state: CalcState, key: KeypadKey): boolean {
  if (key.type !== 'equals' && key.type !== 'operator') return false
  if (!state.pending || state.pending.operator !== '÷') return false
  if (state.replaceEntry) return false
  return calcValue(state) === 0
}
