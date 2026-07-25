import type { CurrencyCode, RateSnapshot } from '../types'
import { RateFetchError, type RateProvider } from './provider'

/**
 * Frankfurter —— 基于欧洲央行（ECB）每日参考汇率的免费 API。
 *
 * - 无需 API Key，允许浏览器直接跨域访问（返回 CORS 头）
 * - 数据在欧洲央行发布后更新，约为工作日 16:00 CET 之后；周末与欧洲节假日不更新
 * - 覆盖 30 余种主要货币，不含加密货币
 *
 * 文档：https://frankfurter.dev
 */

/**
 * 官方提供的两个入口，前者失败时自动尝试后者（例如某个域名被网络环境拦截）。
 * frankfurter.dev 是当前文档使用的域名，放在首位；frankfurter.app 作为备用。
 */
const ENDPOINTS = ['https://api.frankfurter.dev/v1/latest', 'https://api.frankfurter.app/latest']

/** 请求超时时间（ms），避免弱网下长时间挂起。 */
const TIMEOUT_MS = 10_000

/**
 * 数据源支持的币种（与 ECB 参考汇率一致，含基准货币 EUR 共 30 种）。
 * ECB 会随成员国加入欧元区调整该列表（例如保加利亚 2026 年启用欧元后 BGN 被移除），
 * 因此这里只作参考，实际以每次响应中的 rates 为准。
 */
const SUPPORTED_CODES: readonly CurrencyCode[] = [
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
]

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

function isFrankfurterResponse(value: unknown): value is FrankfurterResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.base === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.rates === 'object' &&
    candidate.rates !== null
  )
}

async function requestOnce(url: string, signal?: AbortSignal): Promise<FrankfurterResponse> {
  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS)

  const onOuterAbort = () => timeoutController.abort()
  signal?.addEventListener('abort', onOuterAbort)

  try {
    const response = await fetch(url, {
      signal: timeoutController.signal,
      headers: { Accept: 'application/json' },
      // 始终打到网络，缓存策略由 Service Worker 与本地快照统一负责
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new RateFetchError('http', `汇率接口返回 ${response.status}`)
    }

    const json: unknown = await response.json()
    if (!isFrankfurterResponse(json)) {
      throw new RateFetchError('parse', '汇率接口返回了无法识别的数据')
    }
    return json
  } catch (error) {
    if (error instanceof RateFetchError) throw error
    if (signal?.aborted) throw new RateFetchError('aborted', '请求已取消', { cause: error })
    throw new RateFetchError('network', '网络请求失败', { cause: error })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

export const frankfurterProvider: RateProvider = {
  id: 'frankfurter',
  label: 'Frankfurter（欧洲央行参考汇率）',
  docsUrl: 'https://frankfurter.dev',
  supportedCodes: SUPPORTED_CODES,

  async fetchLatest(signal?: AbortSignal): Promise<RateSnapshot> {
    // 固定以 EUR 为基准拉取整表，任意两种货币之间在本地做交叉换算，
    // 这样切换基准货币不需要重新请求。
    let lastError: unknown
    for (const endpoint of ENDPOINTS) {
      try {
        const data = await requestOnce(`${endpoint}?base=EUR`, signal)
        const rates: Record<CurrencyCode, number> = { ...data.rates, [data.base]: 1 }
        return {
          base: data.base,
          rates,
          rateDate: data.date,
          fetchedAt: Date.now(),
          provider: frankfurterProvider.id,
        }
      } catch (error) {
        if (error instanceof RateFetchError && error.kind === 'aborted') throw error
        lastError = error
      }
    }
    throw lastError instanceof RateFetchError
      ? lastError
      : new RateFetchError('network', '无法连接汇率服务', { cause: lastError })
  },
}
