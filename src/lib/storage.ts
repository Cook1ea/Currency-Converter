import type { CurrencyCode, RateSnapshot, ThemePreference } from '../types'
import { sanitizeDraft } from './draft'

/**
 * 本地持久化。
 *
 * 数据量很小（一份汇率表 + 少量偏好），localStorage 已经足够，
 * 同步读取也让首屏可以立刻用缓存渲染，不需要等待 IndexedDB 的异步打开。
 * 所有读取都做类型校验，损坏的数据会被忽略而不是让应用崩溃。
 */

const PREFIX = 'fx.'

const KEYS = {
  codes: `${PREFIX}codes`,
  activeCode: `${PREFIX}activeCode`,
  draft: `${PREFIX}draft`,
  snapshot: `${PREFIX}snapshot`,
  theme: `${PREFIX}theme`,
} as const

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // 隐私模式或存储被禁用
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 配额不足或存储被禁用时静默失败，不影响换算功能
  }
}

function readJson<T>(key: string, validate: (value: unknown) => T | null): T | null {
  const raw = safeGet(key)
  if (raw === null) return null
  try {
    return validate(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

/* ------------------------------- 币种列表 ------------------------------- */

export function loadCodes(): CurrencyCode[] | null {
  return readJson(KEYS.codes, (value) => {
    if (!Array.isArray(value)) return null
    const codes = value.filter((item): item is string => typeof item === 'string')
    return codes.length > 0 ? codes : null
  })
}

export function saveCodes(codes: readonly CurrencyCode[]): void {
  safeSet(KEYS.codes, JSON.stringify(codes))
}

/* ------------------------------ 输入状态 ------------------------------- */

export function loadActiveCode(): CurrencyCode | null {
  const value = safeGet(KEYS.activeCode)
  return value && /^[A-Z]{3}$/.test(value) ? value : null
}

export function saveActiveCode(code: CurrencyCode): void {
  safeSet(KEYS.activeCode, code)
}

export function loadDraft(): string {
  return sanitizeDraft(safeGet(KEYS.draft))
}

export function saveDraft(draft: string): void {
  safeSet(KEYS.draft, draft)
}

/* ------------------------------- 汇率快照 ------------------------------ */

function validateSnapshot(value: unknown): RateSnapshot | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.base !== 'string') return null
  if (typeof candidate.rateDate !== 'string') return null
  if (typeof candidate.fetchedAt !== 'number') return null
  if (typeof candidate.provider !== 'string') return null
  if (typeof candidate.rates !== 'object' || candidate.rates === null) return null

  const rates: Record<string, number> = {}
  for (const [code, rate] of Object.entries(candidate.rates as Record<string, unknown>)) {
    if (typeof rate === 'number' && Number.isFinite(rate)) rates[code] = rate
  }
  if (Object.keys(rates).length === 0) return null

  return {
    base: candidate.base,
    rates,
    rateDate: candidate.rateDate,
    fetchedAt: candidate.fetchedAt,
    provider: candidate.provider,
  }
}

export function loadSnapshot(): RateSnapshot | null {
  return readJson(KEYS.snapshot, validateSnapshot)
}

export function saveSnapshot(snapshot: RateSnapshot): void {
  safeSet(KEYS.snapshot, JSON.stringify(snapshot))
}

/* -------------------------------- 主题 -------------------------------- */

export function loadTheme(): ThemePreference {
  const value = safeGet(KEYS.theme)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function saveTheme(theme: ThemePreference): void {
  safeSet(KEYS.theme, theme)
}
