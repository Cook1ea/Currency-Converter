/**
 * 输入串（entry）的编辑原语。
 *
 * 输入串是一个受限字符串：仅含数字与至多一个小数点，不含分隔符与正负号。
 * 空串表示 0。所有操作都是纯函数，便于测试与复用。
 * 四则运算的状态机建立在这些原语之上，见 calculator.ts。
 */

/** 整数部分最多位数，防止出现无意义的超长数字。 */
export const MAX_INTEGER_DIGITS = 12
/** 小数部分最多位数。 */
export const MAX_FRACTION_DIGITS = 6

export function appendDigit(entry: string, digit: string): string {
  const dotIndex = entry.indexOf('.')

  if (dotIndex === -1) {
    // 纯整数部分：避免出现 "0123" 这样的前导零
    if (entry === '0') return digit
    if (entry.length >= MAX_INTEGER_DIGITS) return entry
    return entry + digit
  }

  const fraction = entry.slice(dotIndex + 1)
  if (fraction.length >= MAX_FRACTION_DIGITS) return entry
  return entry + digit
}

export function appendDot(entry: string): string {
  if (entry.includes('.')) return entry
  return entry === '' ? '0.' : `${entry}.`
}

export function backspace(entry: string): string {
  return entry.slice(0, -1)
}

/** 校验并规整从本地存储恢复的输入串。 */
export function sanitizeDraft(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (!/^\d*(\.\d*)?$/.test(value)) return ''
  const [intPart = '', fracPart = ''] = value.split('.')
  if (intPart.length > MAX_INTEGER_DIGITS || fracPart.length > MAX_FRACTION_DIGITS) return ''
  return value
}
