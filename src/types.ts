/** ISO 4217 货币代码，例如 "JPY"。 */
export type CurrencyCode = string

export interface Currency {
  code: CurrencyCode
  /** 英文名称，用于搜索与国际化展示 */
  name: string
  /** 中文名称 */
  nameZh: string
  /** 国旗 emoji */
  flag: string
  /** 常规展示小数位 */
  decimals: number
}

/**
 * 一次成功获取到的汇率快照。
 * rates 中包含 base 自身（值为 1），调用方无需特判。
 */
export interface RateSnapshot {
  /** 该组汇率的基准货币 */
  base: CurrencyCode
  /** code -> 相对 base 的汇率 */
  rates: Readonly<Record<CurrencyCode, number>>
  /** 数据源声明的汇率日期（ISO yyyy-mm-dd），即数据本身的时间 */
  rateDate: string
  /** 数据源声明的具体报价时刻（ms）；仅实时数据源提供，日更数据源留空 */
  rateTimestamp?: number
  /** 本地成功获取到这份数据的时间戳（ms） */
  fetchedAt: number
  /** 数据源标识，便于日后更换或排查 */
  provider: string
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export type ThemePreference = 'system' | 'light' | 'dark'
