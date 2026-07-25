import type { CurrencyCode, RateSnapshot } from '../types'

/**
 * 汇率数据源接口。
 *
 * 所有与具体 API 相关的细节都收敛在实现里，应用其余部分只依赖这个接口，
 * 因此更换数据源只需要新增一个实现并在 src/api/rates.ts 中切换。
 */
export interface RateProvider {
  /** 数据源标识，会写入本地缓存，便于识别缓存来源 */
  readonly id: string
  /** 展示用名称 */
  readonly label: string
  /** 文档地址，写在 README 与「关于」文案里 */
  readonly docsUrl: string
  /** 数据源支持的币种；返回 null 表示不做限制 */
  readonly supportedCodes: readonly CurrencyCode[] | null
  /** 拉取最新汇率。失败时应抛出 RateFetchError。 */
  fetchLatest(signal?: AbortSignal): Promise<RateSnapshot>
}

export type RateFetchErrorKind = 'network' | 'http' | 'parse' | 'aborted'

export class RateFetchError extends Error {
  readonly kind: RateFetchErrorKind

  constructor(kind: RateFetchErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RateFetchError'
    this.kind = kind
  }
}
