import type { CurrencyCode, RateSnapshot } from '../types'

/**
 * 交叉换算：amount 从 from 币种换算为 to 币种。
 *
 * 快照中的 rates 都是「1 单位 base 等于多少目标币」，因此
 *   amount(to) = amount(from) / rate(from) * rate(to)
 * 缺少任一汇率时返回 null，由调用方决定如何展示。
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  snapshot: RateSnapshot | null,
): number | null {
  if (!snapshot) return null
  if (from === to) return amount
  if (!Number.isFinite(amount)) return null

  const fromRate = snapshot.rates[from]
  const toRate = snapshot.rates[to]
  if (typeof fromRate !== 'number' || typeof toRate !== 'number' || fromRate === 0) {
    return null
  }
  return (amount / fromRate) * toRate
}

/** 1 单位 from 等于多少 to，用于展示单价说明。 */
export function unitRate(
  from: CurrencyCode,
  to: CurrencyCode,
  snapshot: RateSnapshot | null,
): number | null {
  return convert(1, from, to, snapshot)
}

/** 快照是否覆盖了给定的全部币种。 */
export function missingCodes(
  codes: readonly CurrencyCode[],
  snapshot: RateSnapshot | null,
): CurrencyCode[] {
  if (!snapshot) return [...codes]
  return codes.filter((code) => typeof snapshot.rates[code] !== 'number')
}
