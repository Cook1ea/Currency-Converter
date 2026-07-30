import { coinbaseProvider } from './coinbase'
import { createChainProvider } from './chain'
import { frankfurterProvider } from './frankfurter'
import { fxRatesApiProvider } from './fxratesapi'
import type { RateProvider } from './provider'

/**
 * 当前使用的汇率数据源：分钟级实时源为主，逐级降级到日更源兜底。
 *
 * FxRatesAPI（分钟级实时）→ Coinbase（实时，备用）→ Frankfurter（ECB 日更，最终兜底）。
 * 更换或调整数据源：新建一个实现 RateProvider 的模块（参考 fxratesapi.ts），
 * 然后调整下面的列表即可，应用其余部分无需改动。
 */
export const rateProvider: RateProvider = createChainProvider(
  'chain',
  '实时汇率（自动降级）',
  [fxRatesApiProvider, coinbaseProvider, frankfurterProvider],
)

export { RateFetchError } from './provider'
export type { RateProvider } from './provider'
