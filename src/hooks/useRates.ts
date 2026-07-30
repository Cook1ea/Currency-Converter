import { useCallback, useEffect, useRef, useState } from 'react'
import { RateFetchError, rateProvider } from '../api/rates'
import { loadSnapshot, saveSnapshot } from '../lib/storage'
import type { FetchStatus, RateSnapshot } from '../types'

/** 两次手动刷新之间的最小间隔，防止连点造成重复请求。 */
export const MIN_REFRESH_INTERVAL_MS = 10_000
/** 回到前台时，数据超过这个时长才自动刷新。 */
const AUTO_REFRESH_AFTER_MS = 60_000
/** 页面可见时的后台轮询间隔，让实时数据源的更新及时反映到界面。 */
const POLL_INTERVAL_MS = 60_000

export interface UseRatesResult {
  snapshot: RateSnapshot | null
  status: FetchStatus
  /** 最近一次获取是否失败（此时 snapshot 仍是上一份可用数据） */
  failed: boolean
  errorMessage: string | null
  isRefreshing: boolean
  /** 距离下一次允许手动刷新是否已就绪 */
  canRefresh: boolean
  refresh: () => void
}

/**
 * 汇率获取与缓存。
 *
 * 关键约定：获取失败时**不清空**已有数据，界面继续用上一次成功的快照做换算，
 * 只是把状态标记为失败，由顶部文案提示用户当前是缓存数据。
 */
export function useRates(): UseRatesResult {
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(() => loadSnapshot())
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [canRefresh, setCanRefresh] = useState(true)

  const inFlight = useRef<AbortController | null>(null)
  const lastAttemptAt = useRef(0)
  const cooldownTimer = useRef<number | undefined>(undefined)

  const fetchRates = useCallback(async (options?: { respectCooldown?: boolean }) => {
    const now = Date.now()
    if (inFlight.current) return
    if (options?.respectCooldown !== false && now - lastAttemptAt.current < MIN_REFRESH_INTERVAL_MS) {
      return
    }

    lastAttemptAt.current = now
    const controller = new AbortController()
    inFlight.current = controller
    setStatus('loading')
    setCanRefresh(false)

    try {
      const next = await rateProvider.fetchLatest(controller.signal)
      setSnapshot(next)
      saveSnapshot(next)
      setStatus('success')
      setErrorMessage(null)
    } catch (error) {
      if (error instanceof RateFetchError && error.kind === 'aborted') return
      setStatus('error')
      setErrorMessage(
        error instanceof RateFetchError ? error.message : '获取汇率失败，已显示上次的数据',
      )
    } finally {
      inFlight.current = null
      window.clearTimeout(cooldownTimer.current)
      cooldownTimer.current = window.setTimeout(() => setCanRefresh(true), MIN_REFRESH_INTERVAL_MS)
    }
  }, [])

  const refresh = useCallback(() => {
    void fetchRates()
  }, [fetchRates])

  // 首次打开立即获取（忽略冷却）。
  // 这里刻意不在清理函数里 abort：StrictMode 下开发模式会「卸载再挂载」，
  // 中断请求会导致重新挂载时因为 inFlight 尚未结束而直接跳过，首屏拿不到数据。
  // 这个 hook 只在根组件使用，生命周期与页面一致，不 abort 不会造成泄漏。
  useEffect(() => {
    void fetchRates({ respectCooldown: false })
    return () => window.clearTimeout(cooldownTimer.current)
  }, [fetchRates])

  // 回到前台且数据较旧时自动刷新；网络恢复时也尝试一次
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const age = snapshot ? Date.now() - snapshot.fetchedAt : Number.POSITIVE_INFINITY
      if (age > AUTO_REFRESH_AFTER_MS) void fetchRates()
    }
    const onOnline = () => void fetchRates()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [fetchRates, snapshot])

  // 页面可见时按固定间隔轮询，保证实时数据源的更新能及时反映到界面。
  // 单独用一个 effect、只依赖 fetchRates，避免每次取数成功都重建定时器。
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchRates()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [fetchRates])

  return {
    snapshot,
    status,
    failed: status === 'error',
    errorMessage,
    isRefreshing: status === 'loading',
    canRefresh,
    refresh,
  }
}
