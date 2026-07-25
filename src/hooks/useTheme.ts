import { useCallback, useEffect, useState } from 'react'
import { loadTheme, saveTheme } from '../lib/storage'
import type { ThemePreference } from '../types'

const ORDER: readonly ThemePreference[] = ['system', 'light', 'dark']

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

/**
 * 主题偏好：默认跟随系统，用户可切换并持久化。
 * 实际配色由 CSS 变量实现，这里只负责在 <html> 上打标记。
 */
export function useTheme(): { theme: ThemePreference; cycleTheme: () => void } {
  const [theme, setTheme] = useState<ThemePreference>(() => loadTheme())

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    saveTheme(theme)
  }, [theme])

  // 同步浏览器地址栏 / 状态栏颜色
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', dark ? '#000000' : '#f2f2f7')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])
  }, [])

  return { theme, cycleTheme }
}
