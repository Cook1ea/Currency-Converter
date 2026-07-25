import { EditIcon, RefreshIcon, ThemeIcon } from './Icons'
import { THEME_LABEL } from '../hooks/useTheme'
import type { ThemePreference } from '../types'

interface HeaderProps {
  statusText: string
  rateDateText: string
  isStale: boolean
  isRefreshing: boolean
  canRefresh: boolean
  isEditing: boolean
  theme: ThemePreference
  onRefresh: () => void
  onToggleEdit: () => void
  onCycleTheme: () => void
}

export function Header({
  statusText,
  rateDateText,
  isStale,
  isRefreshing,
  canRefresh,
  isEditing,
  theme,
  onRefresh,
  onToggleEdit,
  onCycleTheme,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header__main">
        <h1 className="header__title">汇率换算</h1>
        <p className={`header__status${isStale ? ' header__status--warn' : ''}`} aria-live="polite">
          <span>{statusText}</span>
          {rateDateText && <span className="header__ratedate">{rateDateText}</span>}
        </p>
      </div>

      <div className="header__actions">
        <button
          type="button"
          className="icon-button"
          onClick={onCycleTheme}
          aria-label={`外观：${THEME_LABEL[theme]}，点击切换`}
          title={`外观：${THEME_LABEL[theme]}`}
        >
          <ThemeIcon />
        </button>

        <button
          type="button"
          className={`icon-button${isRefreshing ? ' icon-button--spinning' : ''}`}
          onClick={onRefresh}
          disabled={!canRefresh || isRefreshing}
          aria-label="刷新汇率"
        >
          <RefreshIcon />
        </button>

        <button
          type="button"
          className={`icon-button${isEditing ? ' icon-button--active' : ''}`}
          onClick={onToggleEdit}
          aria-label={isEditing ? '完成编辑币种' : '编辑币种'}
          aria-pressed={isEditing}
        >
          <EditIcon />
        </button>
      </div>
    </header>
  )
}
