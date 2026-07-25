/**
 * 注册 Service Worker。
 *
 * sw.js 放在 public/ 下原样输出，注册路径使用 import.meta.env.BASE_URL，
 * 因此部署在 GitHub Pages 子路径（/<repo>/）下也能正确取到作用域。
 * 开发模式不注册，避免缓存干扰热更新。
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then(() => precacheLoadedAssets())
      .catch((error: unknown) => {
        console.warn('Service Worker 注册失败：', error)
      })
  })
}

/**
 * 把本次真正加载到的资源告诉 Service Worker，让它写入缓存。
 *
 * JS/CSS 的文件名带构建哈希，sw.js 无法预先写死。首次访问时这些资源在
 * Service Worker 激活之前就已经下载完毕，不会经过它的 fetch 处理，
 * 因此必须主动补一次缓存，否则「装到主屏幕 → 断网 → 首次启动」会打不开。
 */
async function precacheLoadedAssets(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const worker = registration.active
    if (!worker) return

    const assets = [
      ...document.querySelectorAll<HTMLScriptElement>('script[src]'),
    ]
      .map((element) => element.src)
      .concat(
        [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
          (element) => element.href,
        ),
      )
      .filter((url) => url.startsWith(window.location.origin))

    if (assets.length > 0) worker.postMessage({ type: 'precache', assets })
  } catch (error) {
    console.warn('补充预缓存失败：', error)
  }
}
