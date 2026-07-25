import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, CloseIcon, SearchIcon } from './Icons'
import { getCurrency, searchCurrencies } from '../config/currencies'
import type { CurrencyCode } from '../types'

export type PickerMode = { type: 'add' } | { type: 'replace'; code: CurrencyCode }

interface CurrencyPickerProps {
  mode: PickerMode
  /** 当前已展示的币种，用于禁止重复添加 */
  selectedCodes: readonly CurrencyCode[]
  onPick: (code: CurrencyCode) => void
  onClose: () => void
}

export function CurrencyPicker({ mode, selectedCodes, onPick, onClose }: CurrencyPickerProps) {
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => searchCurrencies(keyword), [keyword])
  const replacingCode = mode.type === 'replace' ? mode.code : null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const title =
    replacingCode !== null ? `更换 ${getCurrency(replacingCode).nameZh}` : '添加货币'

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <CloseIcon />
          </button>
        </div>

        <div className="search">
          <SearchIcon className="search__icon" />
          <input
            ref={inputRef}
            className="search__input"
            type="search"
            inputMode="search"
            placeholder="搜索代码、中文或英文名称"
            aria-label="搜索货币"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <ul className="picker-list" aria-label="可选货币">
          {results.map((currency) => {
            const isSelected = selectedCodes.includes(currency.code)
            const isCurrent = currency.code === replacingCode
            // 已在列表中的货币不可重复添加；正在被替换的那一项显示为「当前」
            const disabled = isSelected && !isCurrent

            return (
              <li key={currency.code}>
                <button
                  type="button"
                  className="picker-item"
                  onClick={() => onPick(currency.code)}
                  disabled={disabled}
                  aria-label={`${currency.nameZh} ${currency.code}${
                    disabled ? '，已在列表中' : ''
                  }`}
                >
                  <span className="picker-item__flag" aria-hidden="true">
                    {currency.flag}
                  </span>
                  <span className="picker-item__text">
                    <span className="picker-item__code">{currency.code}</span>
                    <span className="picker-item__name">
                      {currency.nameZh} · {currency.name}
                    </span>
                  </span>
                  {isCurrent ? (
                    <CheckIcon className="picker-item__check" />
                  ) : disabled ? (
                    <span className="picker-item__badge">已添加</span>
                  ) : null}
                </button>
              </li>
            )
          })}

          {results.length === 0 && <li className="picker-empty">没有匹配的货币</li>}
        </ul>
      </div>
    </div>
  )
}
