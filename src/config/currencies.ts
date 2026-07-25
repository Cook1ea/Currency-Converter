import type { Currency, CurrencyCode } from '../types'

/**
 * 统一的货币配置表 —— 全应用唯一的货币信息来源。
 *
 * 这里收录的币种与默认数据源（Frankfurter / ECB 参考汇率）支持的币种保持一致。
 * 若更换数据源并支持更多币种，只需在此追加条目即可，界面与搜索会自动生效。
 *
 * decimals：日常展示所用的小数位（参考 ISO 4217 minor unit）。
 *   JPY / KRW / ISK 等无辅币单位的货币为 0，其余为 2。
 */
export const CURRENCIES: readonly Currency[] = [
  { code: 'AUD', name: 'Australian Dollar', nameZh: '澳大利亚元', flag: '🇦🇺', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', nameZh: '巴西雷亚尔', flag: '🇧🇷', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', nameZh: '加拿大元', flag: '🇨🇦', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', nameZh: '瑞士法郎', flag: '🇨🇭', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan', nameZh: '人民币', flag: '🇨🇳', decimals: 2 },
  { code: 'CZK', name: 'Czech Koruna', nameZh: '捷克克朗', flag: '🇨🇿', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', nameZh: '丹麦克朗', flag: '🇩🇰', decimals: 2 },
  { code: 'EUR', name: 'Euro', nameZh: '欧元', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', name: 'British Pound', nameZh: '英镑', flag: '🇬🇧', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', nameZh: '港元', flag: '🇭🇰', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint', nameZh: '匈牙利福林', flag: '🇭🇺', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', nameZh: '印尼盾', flag: '🇮🇩', decimals: 2 },
  { code: 'ILS', name: 'Israeli New Shekel', nameZh: '以色列新谢克尔', flag: '🇮🇱', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', nameZh: '印度卢比', flag: '🇮🇳', decimals: 2 },
  { code: 'ISK', name: 'Icelandic Krona', nameZh: '冰岛克朗', flag: '🇮🇸', decimals: 0 },
  { code: 'JPY', name: 'Japanese Yen', nameZh: '日元', flag: '🇯🇵', decimals: 0 },
  { code: 'KRW', name: 'South Korean Won', nameZh: '韩元', flag: '🇰🇷', decimals: 0 },
  { code: 'MXN', name: 'Mexican Peso', nameZh: '墨西哥比索', flag: '🇲🇽', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', nameZh: '马来西亚林吉特', flag: '🇲🇾', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', nameZh: '挪威克朗', flag: '🇳🇴', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', nameZh: '新西兰元', flag: '🇳🇿', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso', nameZh: '菲律宾比索', flag: '🇵🇭', decimals: 2 },
  { code: 'PLN', name: 'Polish Zloty', nameZh: '波兰兹罗提', flag: '🇵🇱', decimals: 2 },
  { code: 'RON', name: 'Romanian Leu', nameZh: '罗马尼亚列伊', flag: '🇷🇴', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', nameZh: '瑞典克朗', flag: '🇸🇪', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', nameZh: '新加坡元', flag: '🇸🇬', decimals: 2 },
  { code: 'THB', name: 'Thai Baht', nameZh: '泰铢', flag: '🇹🇭', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira', nameZh: '土耳其里拉', flag: '🇹🇷', decimals: 2 },
  { code: 'USD', name: 'US Dollar', nameZh: '美元', flag: '🇺🇸', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', nameZh: '南非兰特', flag: '🇿🇦', decimals: 2 },
]

const CURRENCY_MAP: ReadonlyMap<CurrencyCode, Currency> = new Map(
  CURRENCIES.map((currency) => [currency.code, currency]),
)

/** 兜底货币信息：数据源返回了配置表里没有的币种时使用，避免界面崩溃。 */
function fallbackCurrency(code: CurrencyCode): Currency {
  return { code, name: code, nameZh: code, flag: '🏳️', decimals: 2 }
}

export function getCurrency(code: CurrencyCode): Currency {
  return CURRENCY_MAP.get(code) ?? fallbackCurrency(code)
}

export function isKnownCurrency(code: CurrencyCode): boolean {
  return CURRENCY_MAP.has(code)
}

/** 首次打开时默认展示的币种与顺序。 */
export const DEFAULT_CODES: readonly CurrencyCode[] = [
  'JPY',
  'USD',
  'CNY',
  'EUR',
  'GBP',
  'HKD',
  'KRW',
  'THB',
]

/** 列表中默认选中（即默认输入）的货币。 */
export const DEFAULT_ACTIVE_CODE: CurrencyCode = 'JPY'

/**
 * 尚未输入时，输入行以灰色占位显示的金额。
 * 用 100 而不是 0，一打开就能看到有意义的换算结果；按下第一个数字键即被覆盖。
 */
export const PLACEHOLDER_AMOUNT = 100
export const PLACEHOLDER_ENTRY = String(PLACEHOLDER_AMOUNT)

export const MIN_CURRENCIES = 2
export const MAX_CURRENCIES = 10

/** 搜索：匹配代码、英文名与中文名。 */
export function searchCurrencies(keyword: string): readonly Currency[] {
  const query = keyword.trim().toLowerCase()
  if (!query) return CURRENCIES
  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.nameZh.includes(query),
  )
}
