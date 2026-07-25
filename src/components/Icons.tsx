/**
 * 内联 SVG 图标，避免引入图标库依赖。
 * 统一使用 currentColor，跟随主题色自动变化。
 */
interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="20" height="20">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  )
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="20" height="20">
      <path d="M4 7h10" />
      <path d="M4 17h10" />
      <circle cx="18" cy="7" r="2.2" />
      <circle cx="18" cy="17" r="2.2" />
    </svg>
  )
}

export function ThemeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="20" height="20">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="20" height="20">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

export function BackspaceIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="24" height="24">
      <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7z" />
      <path d="M12 10l4 4M16 10l-4 4" />
    </svg>
  )
}

export function DragHandleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="20" height="20">
      <path d="M5 9h14M5 15h14" />
    </svg>
  )
}

export function MinusCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="22" height="22">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  )
}

export function PlusCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="22" height="22">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
