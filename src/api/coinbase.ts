import { SUPPORTED_CODES } from '../config/currencies'
import type { CurrencyCode, RateSnapshot } from '../types'
import { RateFetchError, type RateProvider } from './provider'

/**
 * Coinbase 汇率接口 —— 实时中间价，作为主数据源不可用时的备用源。
 *
 * - 无需 API Key，允许浏览器直接跨域访问（返回 CORS 头）
 * - 响应不带时间戳，报价时刻按本地成功获取的时间处理
 * - `rates` 中的数值是字符串，需要转换
 *
 * 文档：https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getexchangerates
 */

const ENDPOINT = 'https://api.coinbase.com/v2/exchange-rates'

const TIMEOUT_MS = 10_000

interface CoinbaseResponse {
  data: {
    currency: string
    rates: Record<string, string>
  }
}

function isCoinbaseResponse(value: unknown): value is CoinbaseResponse {
  if (typeof value !== 'object' || value === null) return false
  const data = (value as Record<string, unknown>).data
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.currency === 'string' &&
    typeof candidate.rates === 'object' &&
    candidate.rates !== null
  )
}

export const coinbaseProvider: RateProvider = {
  id: 'coinbase',
  label: 'Coinbase（实时中间价，备用源）',
  docsUrl: 'https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getexchangerates',
  supportedCodes: SUPPORTED_CODES,

  async fetchLatest(signal?: AbortSignal): Promise<RateSnapshot> {
    const timeoutController = new AbortController()
    const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS)

    const onOuterAbort = () => timeoutController.abort()
    signal?.addEventListener('abort', onOuterAbort)

    try {
      const response = await fetch(`${ENDPOINT}?currency=USD`, {
        signal: timeoutController.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new RateFetchError('http', `汇率接口返回 ${response.status}`)
      }

      const json: unknown = await response.json()
      if (!isCoinbaseResponse(json)) {
        throw new RateFetchError('parse', '汇率接口返回了无法识别的数据')
      }

      const base = json.data.currency
      const rates: Record<CurrencyCode, number> = {}
      for (const code of SUPPORTED_CODES) {
        if (code === base) {
          rates[code] = 1
          continue
        }
        const rate = Number(json.data.rates[code])
        if (Number.isFinite(rate)) rates[code] = rate
      }
      if (Object.keys(rates).length === 0) {
        throw new RateFetchError('parse', '汇率接口返回的数据不包含已知币种')
      }

      const now = Date.now()
      return {
        base,
        rates,
        rateDate: new Date(now).toISOString().slice(0, 10),
        rateTimestamp: now,
        fetchedAt: now,
        provider: coinbaseProvider.id,
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
