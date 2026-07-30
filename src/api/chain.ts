import type { RateSnapshot } from '../types'
import { RateFetchError, type RateProvider } from './provider'

/**
 * 按顺序尝试多个数据源，第一个成功的即返回。
 *
 * 用于把「实时但可能被限流/下线」的源和「稳定但只日更」的源串成一条降级链：
 * 主源失败（含 HTTP 429）不视为最终失败，继续尝试下一个；
 * 只有用户主动取消（AbortSignal）才立即中止，不再尝试后续源。
 */
export function createChainProvider(
  id: string,
  label: string,
  providers: readonly RateProvider[],
): RateProvider {
  if (providers.length === 0) throw new Error('createChainProvider 至少需要一个数据源')

  return {
    id,
    label,
    docsUrl: providers[0].docsUrl,
    supportedCodes: providers[0].supportedCodes,

    async fetchLatest(signal?: AbortSignal): Promise<RateSnapshot> {
      let lastError: unknown
      for (const provider of providers) {
        try {
          return await provider.fetchLatest(signal)
        } catch (error) {
          if (error instanceof RateFetchError && error.kind === 'aborted') throw error
          lastError = error
        }
      }
      throw lastError instanceof RateFetchError
        ? lastError
        : new RateFetchError('network', '所有汇率数据源均不可用', { cause: lastError })
    },
  }
}
