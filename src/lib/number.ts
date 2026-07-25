/**
 * 数值工具：处理二进制浮点带来的显示误差。
 *
 * 汇率换算天然是浮点运算，这里不引入大数库，而是在「四舍五入到指定小数位」
 * 这一步用十进制指数移位，避免 (1.005).toFixed(2) === "1.00" 这类明显错误。
 */

/** 四舍五入到 digits 位小数，规避 0.1 + 0.2 类误差。 */
export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0
  const safeDigits = Math.max(0, Math.min(20, Math.trunc(digits)))

  // 已经是指数记数法（例如 1e-7）时无法再拼接指数，退回 toFixed
  const text = String(value)
  if (text.includes('e') || text.includes('E')) {
    return Number(value.toFixed(Math.min(safeDigits, 100)))
  }

  // 用指数记数法移位，避免直接乘 10^n 引入新的误差
  const shifted = Number(`${text}e${safeDigits}`)
  if (!Number.isFinite(shifted)) return Number(value.toFixed(safeDigits))

  const rounded = Number(`${Math.round(shifted)}e-${safeDigits}`)
  return Number.isFinite(rounded) ? rounded : Number(value.toFixed(safeDigits))
}

/**
 * 根据数值大小推荐小数位。
 *
 * 常规情况用货币自身的小数位；当结果非常小（例如 1 JPY 换算成 GBP）时
 * 自动增加精度，保证至少能看到 minSignificant 位有效数字。
 */
export function pickDecimals(
  value: number,
  baseDecimals: number,
  { minSignificant = 4, maxDecimals = 8 } = {},
): number {
  const abs = Math.abs(value)
  if (abs === 0 || !Number.isFinite(abs)) return baseDecimals
  if (abs >= 1) return baseDecimals

  // 第一位有效数字所在的小数位，例如 0.0034 -> 3
  const firstSignificant = Math.floor(-Math.log10(abs)) + 1
  const needed = firstSignificant + minSignificant - 1
  return Math.min(maxDecimals, Math.max(baseDecimals, needed))
}

/** 去掉小数末尾多余的 0（保留至少 keep 位）。 */
export function trimTrailingZeros(text: string, keep: number): string {
  if (!text.includes('.')) return text
  const [intPart, fracPart = ''] = text.split('.')
  let end = fracPart.length
  while (end > keep && fracPart[end - 1] === '0') end -= 1
  const trimmed = fracPart.slice(0, end)
  return trimmed.length > 0 ? `${intPart}.${trimmed}` : intPart
}
