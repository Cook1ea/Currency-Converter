import type { RateSnapshot } from '../types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dayOffsetLabel(timestamp: number, now: number): string | null {
  const target = new Date(timestamp)
  const today = new Date(now)
  if (isSameDay(target, today)) return null

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(target, yesterday)) return '昨天'

  return `${target.getMonth() + 1}月${target.getDate()}日`
}

/** 数据视为「过期」的阈值：超过这个时间未成功刷新就明确提示用户。 */
export const STALE_AFTER_MS = 24 * HOUR

export interface StatusTextOptions {
  snapshot: RateSnapshot | null
  /** 最近一次获取是否失败 */
  failed: boolean
  isLoading: boolean
  isOffline: boolean
  now: number
}

/**
 * 生成顶部状态文案。
 *
 * 时间一律基于「上一次成功拿到汇率数据的时刻」（snapshot.fetchedAt），
 * 而不是页面打开或组件渲染的时间。
 */
export function formatUpdatedStatus({
  snapshot,
  failed,
  isLoading,
  isOffline,
  now,
}: StatusTextOptions): string {
  if (isLoading && !snapshot) return '正在获取汇率…'
  if (!snapshot) return failed ? '暂无汇率数据，请检查网络' : '尚未获取汇率'

  const elapsed = Math.max(0, now - snapshot.fetchedAt)
  const clock = formatClock(snapshot.fetchedAt)
  const dayLabel = dayOffsetLabel(snapshot.fetchedAt, now)

  // 失败或离线时，明确说明当前用的是本地缓存
  if (isOffline || failed) {
    const prefix = isOffline ? '离线数据' : '缓存数据'
    return dayLabel
      ? `${prefix} · 最后更新于${dayLabel} ${clock}`
      : `${prefix} · 最后更新于今天 ${clock}`
  }

  if (elapsed >= STALE_AFTER_MS || dayLabel) {
    return `数据可能过期 · 最后更新于${dayLabel ?? '今天'} ${clock}`
  }

  if (isLoading) return '正在刷新…'
  if (elapsed < MINUTE) return `刚刚更新 · ${clock}`
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} 分钟前更新`
  return `${Math.floor(elapsed / HOUR)} 小时前更新 · ${clock}`
}

/** 汇率数据本身声明的日期（ECB 公布日），与获取时间不同。 */
export function formatRateDate(snapshot: RateSnapshot | null): string {
  if (!snapshot) return ''
  const [year, month, day] = snapshot.rateDate.split('-')
  if (!year || !month || !day) return snapshot.rateDate
  return `${Number(month)}月${Number(day)}日汇率`
}
