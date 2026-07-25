import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * 让一段文本自动缩小到容器宽度以内。
 *
 * 不用「按字符数套档位」的做法：字符宽度随字体、分隔符、设备宽度变化，
 * 猜出来的档位在长数字上必然失准，最终还是会被截断成省略号。
 * 这里直接量出实际需要的宽度（scrollWidth）与可用宽度，按比例一次性缩放。
 *
 * @param text          文本内容，变化时重新测量
 * @param containerSelector 用来测量可用宽度的祖先元素（必须是宽度确定的那一层）
 */
export function useFitText(
  text: string,
  containerSelector: string,
  { maxRem = 1.5, minRem = 0.7 } = {},
) {
  const ref = useRef<HTMLSpanElement>(null)

  const fit = useCallback(() => {
    const element = ref.current
    if (!element) return

    const container = element.closest(containerSelector) as HTMLElement | null
    if (!container) return

    // 先还原到最大字号再测量，否则会在上一次缩小的基础上不断收缩
    element.style.fontSize = `${maxRem}rem`

    const styles = window.getComputedStyle(container)
    const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)

    // 输入行右侧的光标也要占位
    const caret = container.querySelector<HTMLElement>('.row__caret')
    const caretWidth = caret ? caret.offsetWidth + 4 : 0

    const available = container.clientWidth - padding - caretWidth
    const needed = element.scrollWidth
    if (available <= 0 || needed <= 0 || needed <= available) return

    const scaled = Math.max(minRem, (maxRem * available) / needed)
    element.style.fontSize = `${scaled}rem`
  }, [containerSelector, maxRem, minRem])

  // useLayoutEffect：在浏览器绘制前完成缩放，避免看到字号跳变
  useLayoutEffect(() => {
    fit()
  }, [fit, text])

  // 旋转屏幕、拖动窗口后重新适配
  useLayoutEffect(() => {
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [fit])

  return ref
}
