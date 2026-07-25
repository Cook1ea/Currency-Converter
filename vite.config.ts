import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages 子路径支持。
 *
 * - 本地开发 / 自定义域名根目录部署：BASE_PATH 未设置，base = "/"
 * - 部署到 https://<user>.github.io/<repo>/ ：CI 注入 BASE_PATH="/<repo>/"
 *
 * 运行时代码请统一使用 import.meta.env.BASE_URL 拼接资源路径，
 * manifest 与 sw.js 内部使用相对路径，因此不需要额外处理。
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    // 单页应用，产物体积很小，不需要 sourcemap
    sourcemap: false,
  },
})
