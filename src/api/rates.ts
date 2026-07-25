import { frankfurterProvider } from './frankfurter'
import type { RateProvider } from './provider'

/**
 * 当前使用的汇率数据源。
 *
 * 更换数据源：新建一个实现 RateProvider 的模块（参考 frankfurter.ts），
 * 然后把下面这一行换成新的实现即可，应用其余部分无需改动。
 */
export const rateProvider: RateProvider = frankfurterProvider

export { RateFetchError } from './provider'
export type { RateProvider } from './provider'
