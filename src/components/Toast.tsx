interface ToastProps {
  message: string | null
  /** 变化时重新触发动画 */
  toastKey?: number
}

export function Toast({ message, toastKey }: ToastProps) {
  return (
    <div className="toast-layer" role="status" aria-live="polite">
      {message && (
        <div className="toast" key={toastKey}>
          {message}
        </div>
      )}
    </div>
  )
}
