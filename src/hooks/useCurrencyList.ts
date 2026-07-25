import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_CODES,
  MAX_CURRENCIES,
  MIN_CURRENCIES,
  isKnownCurrency,
} from '../config/currencies'
import { loadCodes, saveCodes } from '../lib/storage'
import type { CurrencyCode } from '../types'

function initialCodes(): CurrencyCode[] {
  const stored = loadCodes()
  if (!stored) return [...DEFAULT_CODES]

  // 去重 + 过滤掉配置表里已不存在的币种，避免旧数据导致空行
  const seen = new Set<CurrencyCode>()
  const codes = stored.filter((code) => {
    if (!isKnownCurrency(code) || seen.has(code)) return false
    seen.add(code)
    return true
  })
  return codes.length >= MIN_CURRENCIES ? codes.slice(0, MAX_CURRENCIES) : [...DEFAULT_CODES]
}

export interface UseCurrencyListResult {
  codes: CurrencyCode[]
  canAdd: boolean
  canRemove: boolean
  addCurrency: (code: CurrencyCode) => void
  removeCurrency: (code: CurrencyCode) => void
  replaceCurrency: (oldCode: CurrencyCode, newCode: CurrencyCode) => void
  reorder: (from: number, to: number) => void
}

/** 当前展示的币种列表及其顺序，变更后自动持久化。 */
export function useCurrencyList(): UseCurrencyListResult {
  const [codes, setCodes] = useState<CurrencyCode[]>(initialCodes)

  useEffect(() => {
    saveCodes(codes)
  }, [codes])

  const addCurrency = useCallback((code: CurrencyCode) => {
    setCodes((current) => {
      if (current.includes(code) || current.length >= MAX_CURRENCIES) return current
      return [...current, code]
    })
  }, [])

  const removeCurrency = useCallback((code: CurrencyCode) => {
    setCodes((current) => {
      if (current.length <= MIN_CURRENCIES) return current
      return current.filter((item) => item !== code)
    })
  }, [])

  const replaceCurrency = useCallback((oldCode: CurrencyCode, newCode: CurrencyCode) => {
    setCodes((current) => {
      if (oldCode === newCode) return current
      const index = current.indexOf(oldCode)
      if (index === -1) return current
      // 已存在则视为无效操作，不允许重复
      if (current.includes(newCode)) return current
      const next = [...current]
      next[index] = newCode
      return next
    })
  }, [])

  const reorder = useCallback((from: number, to: number) => {
    setCodes((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current
      }
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  return {
    codes,
    canAdd: codes.length < MAX_CURRENCIES,
    canRemove: codes.length > MIN_CURRENCIES,
    addCurrency,
    removeCurrency,
    replaceCurrency,
    reorder,
  }
}
