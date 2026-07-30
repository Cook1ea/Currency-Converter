import { SUPPORTED_CODES } from '../config/currencies'
import type { CurrencyCode, RateSnapshot } from '../types'
import { RateFetchError, type RateProvider } from './provider'

/**
 * FxRatesAPI —— 分钟级更新的实时中间价数据源。
 *
 * - 无需 API Key，允许浏览器直接跨域访问（返回 CORS 头）
 * - `timestamp` 精确到分钟，是本应用的主数据源
 * - 免费额度未注明重置窗口（响应头 `x-ratelimit-reset` 为空），
 *   超限时不在此处重试，交给上层降级链尝试下一个数据源
 *
 * 文档：https://fxratesapi.com
 */

const ENDPOINT = 'https://api.fxratesapi.com/latest'

const TIMEOUT_MS = 10_000

interface FxRatesApiResponse {
  success: boolean
  base: string
  date: string
  timestamp: number
  rates: Record<string, number>
}

function isFxRatesApiResponse(value: unknown): value is FxRatesApiResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.success === true &&
    typeof candidate.base === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.rates === 'object' &&
    candidate.rates !== null
  )
}

function toDateOnly(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10)
}

export const fxRatesApiProvider: RateProvider = {
  id: 'fxratesapi',
  label: 'FxRatesAPI（实时中间价）',
  docsUrl: 'https://fxratesapi.com',
  supportedCodes: SUPPORTED_CODES,

  async fetchLatest(signal?: AbortSignal): Promise<RateSnapshot> {
    const timeoutController = new AbortController()
    const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS)

    const onOuterAbort = () => timeoutController.abort()
    signal?.addEventListener('abort', onOuterAbort)

    try {
      const response = await fetch(`${ENDPOINT}?base=USD`, {
        signal: timeoutController.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new RateFetchError('http', `汇率接口返回 ${response.status}`)
      }

      const json: unknown = await response.json()
      if (!isFxRatesApiResponse(json)) {
        throw new RateFetchError('parse', '汇率接口返回了无法识别的数据')
      }

      const rates: Record<CurrencyCode, number> = {}
      for (const code of SUPPORTED_CODES) {
        const rate = code === json.base ? 1 : json.rates[code]
        if (typeof rate === 'number' && Number.isFinite(rate)) rates[code] = rate
      }
      if (Object.keys(rates).length === 0) {
        throw new RateFetchError('parse', '汇率接口返回的数据不包含已知币种')
      }

      const timestampMs = json.timestamp * 1000
      return {
        base: json.base,
        rates,
        rateDate: toDateOnly(timestampMs),
        rateTimestamp: timestampMs,
        fetchedAt: Date.now(),
        provider: fxRatesApiProvider.id,
      }
    } catch (error) {
      if (error instanceof RateFetchError) throw error
      if (signal?.aborted) throw new RateFetchError('aborted', '请求已取消', { cause: error })
      throw new RateFetchError('network', '网络请求失败', { cause: error })
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onOuterAbort)
    }
  },
}
