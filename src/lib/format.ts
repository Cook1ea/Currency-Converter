import { MAX_FRACTION_DIGITS, MAX_INTEGER_DIGITS } from './draft'
import { pickDecimals, roundTo, trimTrailingZeros } from './number'

/** 整数部分插入千位分隔符。 */
export function groupInteger(digits: string): string {
  const negative = digits.startsWith('-')
  const body = negative ? digits.slice(1) : digits
  const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return negative ? `-${grouped}` : grouped
}

/**
 * 把正在编辑的原始输入串渲染为展示文本。
 *
 * 输入串本身只含数字与至多一个小数点（不含分隔符），这里只负责加分隔符，
 * 并且完整保留用户敲下的小数点与末尾 0，例如 "1200." -> "1,200."。
 * 因为使用的是自定义键盘而非原生 input，格式化不会造成光标跳动。
 */
export function formatDraft(draft: string): string {
  if (draft === '') return '0'
  const dotIndex = draft.indexOf('.')
  if (dotIndex === -1) return groupInteger(draft)
  const intPart = draft.slice(0, dotIndex) || '0'
  const fracPart = draft.slice(dotIndex + 1)
  return `${groupInteger(intPart)}.${fracPart}`
}

/** 原始输入串 -> 数值。 */
export function draftToNumber(draft: string): number {
  if (draft === '' || draft === '.') return 0
  const parsed = Number(draft)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * 数值 -> 原始输入串，结果满足输入串的长度约束。
 * 目前未被使用：切换货币改为归位到占位金额，不再带入换算结果；
 * 保留以备将来恢复「接着编辑换算结果」的交互。
 */
export function numberToDraft(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value === 0) return ''

  // 小额结果保留更多小数，避免切换基准货币时把 0.006 直接抹成 0.01
  const precision = Math.min(MAX_FRACTION_DIGITS, pickDecimals(value, decimals, {
    minSignificant: 3,
    maxDecimals: MAX_FRACTION_DIGITS,
  }))
  const text = trimTrailingZeros(roundTo(value, precision).toFixed(precision), 0)

  const [intPart = '', fracPart = ''] = text.split('.')
  if (intPart.length > MAX_INTEGER_DIGITS) {
    // 超出输入上限时只保留整数部分并截断，保证仍是合法输入串
    return intPart.slice(0, MAX_INTEGER_DIGITS)
  }
  return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart
}

interface FormatOptions {
  /** 是否插入千位分隔符，复制时关闭 */
  grouping?: boolean
}

/**
 * 展示金额：按货币小数位格式化，数值过小时自动提高精度。
 */
export function formatAmount(
  value: number | null,
  currencyDecimals: number,
  { grouping = true }: FormatOptions = {},
): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const decimals = pickDecimals(value, currencyDecimals)
  const rounded = roundTo(value, decimals)

  if (!grouping) {
    return trimTrailingZeros(rounded.toFixed(decimals), Math.min(currencyDecimals, decimals))
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded)

  // 高精度模式下去掉多余的尾随 0，正常小数位则完整保留（例如 12.50）
  return decimals > currencyDecimals ? trimTrailingZeros(formatted, currencyDecimals) : formatted
}

/** 复制到剪贴板用的完整数值：不带分隔符。 */
export function formatForCopy(value: number | null, currencyDecimals: number): string {
  return formatAmount(value, currencyDecimals, { grouping: false })
}

/** 展示「1 USD = 7.12 CNY」这类单位汇率说明。 */
export function formatUnitRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return '—'
  const decimals = rate >= 1000 ? 2 : pickDecimals(rate, 4, { minSignificant: 4, maxDecimals: 6 })
  return trimTrailingZeros(roundTo(rate, decimals).toFixed(decimals), 2)
}
