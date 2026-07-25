import { useCallback, useEffect, useMemo, useState } from 'react'
import { CurrencyList } from './components/CurrencyList'
import { CurrencyPicker, type PickerMode } from './components/CurrencyPicker'
import { Header } from './components/Header'
import { ChevronUpIcon } from './components/Icons'
import { Keypad } from './components/Keypad'
import { Toast } from './components/Toast'
import {
  DEFAULT_ACTIVE_CODE,
  PLACEHOLDER_AMOUNT,
  PLACEHOLDER_ENTRY,
  getCurrency,
} from './config/currencies'
import { useCurrencyList } from './hooks/useCurrencyList'
import { useNow } from './hooks/useNow'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useRates } from './hooks/useRates'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import { copyText } from './lib/clipboard'
import {
  INITIAL_CALC_STATE,
  applyKey,
  calcValue,
  createCalcState,
  isDivisionByZero,
  isInitialCalcState,
  pendingLabel,
  type KeypadKey,
} from './lib/calculator'
import { convert, missingCodes } from './lib/convert'
import { formatDraft, formatForCopy, formatUnitRate } from './lib/format'
import { loadActiveCode, loadDraft, saveActiveCode, saveDraft } from './lib/storage'
import { STALE_AFTER_MS, formatRateDate, formatUpdatedStatus } from './lib/time'
import type { CurrencyCode } from './types'

export default function App() {
  const { codes, canAdd, canRemove, addCurrency, removeCurrency, replaceCurrency, reorder } =
    useCurrencyList()
  const { snapshot, failed, errorMessage, isRefreshing, canRefresh, refresh } = useRates()
  const { theme, cycleTheme } = useTheme()
  const { toast, showToast } = useToast()
  const isOnline = useOnlineStatus()
  const now = useNow()

  const [calc, setCalc] = useState(() => {
    // 上次留下的输入若只剩一个 0，视作没有输入，冷启动仍回到占位态
    const saved = loadDraft()
    return createCalcState(saved === '0' ? '' : saved)
  })
  const draft = calc.entry
  // 还没输入任何东西时，输入行以灰色的 100 占位，并按 100 换算其余货币
  const isPlaceholder = isInitialCalcState(calc)
  const displayDraft = isPlaceholder ? PLACEHOLDER_ENTRY : draft
  const amount = isPlaceholder ? PLACEHOLDER_AMOUNT : calcValue(calc)
  const [activeCode, setActiveCode] = useState<CurrencyCode>(
    () => loadActiveCode() ?? DEFAULT_ACTIVE_CODE,
  )
  const [isEditing, setIsEditing] = useState(false)
  const [picker, setPicker] = useState<PickerMode | null>(null)
  // 键盘可以按「完成」收起，给列表让出更多空间；再次点击任意货币行会重新展开
  const [isKeypadOpen, setKeypadOpen] = useState(true)

  // 列表变动后，保证输入行始终指向一个仍然存在的货币
  useEffect(() => {
    if (codes.length > 0 && !codes.includes(activeCode)) {
      setActiveCode(codes[0])
    }
  }, [codes, activeCode])

  useEffect(() => saveDraft(draft), [draft])
  useEffect(() => saveActiveCode(activeCode), [activeCode])

  const statusText = useMemo(
    () => formatUpdatedStatus({ snapshot, failed, isLoading: isRefreshing, isOffline: !isOnline, now }),
    [snapshot, failed, isRefreshing, isOnline, now],
  )

  const isStale =
    !isOnline || failed || (snapshot !== null && now - snapshot.fetchedAt > STALE_AFTER_MS)

  /* ------------------------------ 交互回调 ------------------------------ */

  // 状态更新函数必须保持纯净（StrictMode 会重复调用），因此提示放在更新之外
  const handleKey = useCallback(
    (key: KeypadKey) => {
      // 数字与小数点直接覆盖占位值；运算符、等号则要先把占位的 100 变成真实输入，
      // 否则界面显示 100 却按 0 参与运算。退格与清除保持占位态不变。
      const base =
        isPlaceholder && (key.type === 'operator' || key.type === 'equals')
          ? createCalcState(PLACEHOLDER_ENTRY)
          : calc

      if (isDivisionByZero(base, key)) {
        showToast('不能除以 0')
        return
      }
      const next = applyKey(base, key)
      if (next.entry === '' && base.entry !== '' && key.type === 'equals') {
        showToast('结果为负数，已归零')
      }
      setCalc(next)
    },
    [calc, isPlaceholder, showToast],
  )

  const handleTapRow = useCallback(
    (code: CurrencyCode) => {
      setKeypadOpen(true)
      if (code === activeCode) return
      // 切换输入货币＝要输一笔新金额，因此归位到灰色的 100 占位，
      // 第一个数字键即可直接覆盖；未结算的算式也在这里结束。
      setActiveCode(code)
      setCalc(INITIAL_CALC_STATE)
    },
    [activeCode],
  )

  const handleCopy = useCallback(
    async (code: CurrencyCode, value: number | null) => {
      if (value === null) {
        showToast('暂无汇率，无法复制')
        return
      }
      const text = formatForCopy(value, getCurrency(code).decimals)
      const ok = await copyText(text)
      showToast(ok ? `已复制 ${code} ${text}` : '复制失败')
    },
    [showToast],
  )

  const handlePick = useCallback(
    (code: CurrencyCode) => {
      if (!picker) return
      if (picker.type === 'add') addCurrency(code)
      else replaceCurrency(picker.code, code)
      setPicker(null)
    },
    [picker, addCurrency, replaceCurrency],
  )

  const handleRefresh = useCallback(() => {
    if (!canRefresh || isRefreshing) {
      showToast('刚刷新过，请稍候')
      return
    }
    refresh()
  }, [canRefresh, isRefreshing, refresh, showToast])

  /* ------------------------------ 状态提示 ------------------------------ */

  const unsupported = useMemo(() => missingCodes(codes, snapshot), [codes, snapshot])

  const hintText = useMemo(() => {
    if (!snapshot) return null
    const target = codes.find((code) => code !== activeCode)
    if (!target) return null
    const rate = convert(1, activeCode, target, snapshot)
    if (rate === null) return null
    return `1 ${activeCode} ≈ ${formatUnitRate(rate)} ${target}`
  }, [snapshot, codes, activeCode])

  return (
    <div className="app">
      <Header
        statusText={statusText}
        rateDateText={formatRateDate(snapshot)}
        isStale={isStale}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        isEditing={isEditing}
        theme={theme}
        onRefresh={handleRefresh}
        onToggleEdit={() => setIsEditing((value) => !value)}
        onCycleTheme={cycleTheme}
      />

      <main className="content">
        {!snapshot && failed && (
          <p className="banner banner--error" role="alert">
            {errorMessage ?? '无法获取汇率，请检查网络后重试'}
          </p>
        )}

        {snapshot && unsupported.length > 0 && (
          <p className="banner" role="status">
            当前数据源暂不支持：{unsupported.join('、')}
          </p>
        )}

        <CurrencyList
          codes={codes}
          snapshot={snapshot}
          activeCode={activeCode}
          draft={displayDraft}
          isPlaceholder={isPlaceholder}
          amount={amount}
          pendingText={pendingLabel(calc, formatDraft)}
          isEditing={isEditing}
          canRemove={canRemove}
          canAdd={canAdd}
          onTapRow={handleTapRow}
          onOpenPicker={(code) => setPicker({ type: 'replace', code })}
          onCopy={(code, value) => void handleCopy(code, value)}
          onRemove={removeCurrency}
          onReorder={reorder}
          onAdd={() => setPicker({ type: 'add' })}
        />

        {!isEditing && hintText && <p className="rate-hint">{hintText}</p>}
      </main>

      {!isEditing && isKeypadOpen && (
        <footer className="footer">
          <Keypad
            onKey={handleKey}
            onDone={() => setKeypadOpen(false)}
            activeCode={activeCode}
            activeOperator={calc.replaceEntry ? (calc.pending?.operator ?? null) : null}
          />
        </footer>
      )}

      {!isEditing && !isKeypadOpen && (
        <footer className="footer footer--collapsed">
          <button
            type="button"
            className="reopen-button"
            onClick={() => setKeypadOpen(true)}
            aria-label="展开数字键盘"
          >
            <ChevronUpIcon />
            <span>数字键盘</span>
          </button>
        </footer>
      )}

      {picker && (
        <CurrencyPicker
          mode={picker}
          selectedCodes={codes}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}

      <Toast message={toast?.message ?? null} toastKey={toast?.id} />
    </div>
  )
}
