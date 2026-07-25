/**
 * 极简 Service Worker —— 只负责让应用外壳可以离线打开。
 *
 * 汇率数据本身不在这里缓存：它由 localStorage 里的快照负责，
 * 这样离线时依然能用上一次成功获取的汇率做换算，逻辑集中在一处。
 *
 * 缓存策略：
 *   - 导航请求：网络优先，失败时回退到缓存的 index.html（离线也能打开 App）
 *   - 同源静态资源（JS/CSS/图标）：stale-while-revalidate
 *   - 跨域请求（汇率 API）：不拦截，直接走网络
 */

const CACHE_VERSION = 'v1'
const CACHE_NAME = `fx-shell-${CACHE_VERSION}`

// sw.js 所在目录即部署的 base 路径，兼容 GitHub Pages 子路径
const SCOPE_URL = new URL('./', self.location.href)
const INDEX_URL = SCOPE_URL.href

const PRECACHE_URLS = [
  INDEX_URL,
  new URL('./manifest.webmanifest', SCOPE_URL).href,
  new URL('./favicon.svg', SCOPE_URL).href,
  new URL('./icon-192.png', SCOPE_URL).href,
  new URL('./icon-512.png', SCOPE_URL).href,
  new URL('./icon-maskable-512.png', SCOPE_URL).href,
  new URL('./apple-touch-icon.png', SCOPE_URL).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 单个资源失败不应让整个安装失败
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      await self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

/**
 * 页面在首次注册后会把「本次实际加载的带哈希资源」发过来。
 * 这些文件名由构建生成，无法写进 PRECACHE_URLS，而首次访问时它们
 * 早于 Service Worker 激活就下载完了，不会经过下面的 fetch 处理，
 * 所以需要在这里补一次缓存，保证第一次装到主屏幕后断网也能打开。
 */
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'precache' || !Array.isArray(data.assets)) return

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const fresh = []
      for (const url of data.assets) {
        if (typeof url !== 'string') continue
        if (!(await cache.match(url))) fresh.push(url)
      }
      await Promise.allSettled(fresh.map((url) => cache.add(url)))
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 跨域（含汇率 API）交给浏览器自己处理
  if (url.origin !== self.location.origin) return
  // 作用域之外的同源资源也不处理
  if (!url.pathname.startsWith(SCOPE_URL.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstForNavigation(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function networkFirstForNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(INDEX_URL, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(INDEX_URL)
    if (cached) return cached
    throw error
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (cached) return cached

  const response = await network
  if (response) return response
  return new Response('', { status: 504, statusText: 'Offline' })
}
