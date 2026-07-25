/**
 * 生成 PWA 图标（不依赖任何图形库）。
 *
 * 图形是一个抽象的「双向兑换箭头」：上箭头向右、下箭头向左，
 * 纯几何绘制，不涉及任何受版权保护的素材。
 *
 * 渲染方式：在 4 倍分辨率下做布尔覆盖判定，再做 4×4 盒式降采样得到抗锯齿，
 * 最后用 zlib + 手写 CRC32 直接编码成 PNG。
 *
 * 运行：npm run icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [11, 110, 245] // 与 --accent 一致
const FG = [255, 255, 255]

const SS = 4 // 超采样倍数

/* ------------------------------- 几何判定 ------------------------------- */

function insideRoundedRect(x, y, size, radius) {
  const r = radius
  if (x < 0 || y < 0 || x > size || y > size) return false
  const cx = Math.min(Math.max(x, r), size - r)
  const cy = Math.min(Math.max(y, r), size - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

/** 圆头横向线段（胶囊形），用作箭头杆。 */
function insideCapsule(x, y, x0, x1, cy, thickness) {
  const half = thickness / 2
  const clampedX = Math.min(Math.max(x, Math.min(x0, x1)), Math.max(x0, x1))
  const dx = x - clampedX
  const dy = y - cy
  return dx * dx + dy * dy <= half * half
}

/** 等腰三角形箭头，dir = 1 指向右，dir = -1 指向左。 */
function insideArrowHead(x, y, tipX, cy, length, halfHeight, dir) {
  const baseX = tipX - dir * length
  const t = dir > 0 ? (x - baseX) / length : (baseX - x) / length
  if (t < 0 || t > 1) return false
  const allowed = halfHeight * (1 - t)
  return Math.abs(y - cy) <= allowed
}

/**
 * 图标绘制：返回某点是否属于前景 / 背景。
 * @param {number} size 逻辑边长
 * @param {{ fullBleed: boolean, contentScale: number }} options
 */
function makeSampler(size, { fullBleed, contentScale }) {
  const radius = size * 0.225
  const content = size * contentScale
  const offset = (size - content) / 2

  const shaft = content * 0.1
  const headLen = content * 0.19
  const headHalf = content * 0.17

  const topY = offset + content * 0.33
  const botY = offset + content * 0.67

  return (x, y) => {
    const inBackground = fullBleed
      ? x >= 0 && y >= 0 && x <= size && y <= size
      : insideRoundedRect(x, y, size, radius)
    if (!inBackground) return null

    // 上箭头：向右
    const topShaft = insideCapsule(
      x,
      y,
      offset + content * 0.14,
      offset + content * 0.68,
      topY,
      shaft,
    )
    const topHead = insideArrowHead(x, y, offset + content * 0.9, topY, headLen, headHalf, 1)

    // 下箭头：向左
    const botShaft = insideCapsule(
      x,
      y,
      offset + content * 0.32,
      offset + content * 0.86,
      botY,
      shaft,
    )
    const botHead = insideArrowHead(x, y, offset + content * 0.1, botY, headLen, headHalf, -1)

    return topShaft || topHead || botShaft || botHead ? 'fg' : 'bg'
  }
}

/* ------------------------------- 光栅化 -------------------------------- */

function render(size, options) {
  const sampler = makeSampler(size, options)
  const pixels = Buffer.alloc(size * size * 4)

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let fg = 0
      let bg = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const x = px + (sx + 0.5) / SS
          const y = py + (sy + 0.5) / SS
          const hit = sampler(x, y)
          if (hit === 'fg') fg += 1
          else if (hit === 'bg') bg += 1
        }
      }
      const total = SS * SS
      const alpha = (fg + bg) / total
      // 前景在背景之上做混合，得到平滑的箭头边缘
      const fgRatio = fg + bg > 0 ? fg / (fg + bg) : 0
      const offset = (py * size + px) * 4
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          BG[channel] * (1 - fgRatio) + FG[channel] * fgRatio,
        )
      }
      pixels[offset + 3] = Math.round(alpha * 255)
    }
  }
  return pixels
}

/* ------------------------------ PNG 编码 ------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(pixels, size) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // no interlace

  // 每条扫描线前加一个 filter 类型字节（0 = None）
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------- 输出 -------------------------------- */

const TARGETS = [
  { file: 'icon-192.png', size: 192, fullBleed: false, contentScale: 0.72 },
  { file: 'icon-512.png', size: 512, fullBleed: false, contentScale: 0.72 },
  // maskable：内容压缩到安全区内，背景铺满，避免被系统裁掉
  { file: 'icon-maskable-512.png', size: 512, fullBleed: true, contentScale: 0.56 },
  // iOS 会自己加圆角，所以用铺满的方形背景
  { file: 'apple-touch-icon.png', size: 180, fullBleed: true, contentScale: 0.66 },
]

mkdirSync(OUT_DIR, { recursive: true })

for (const target of TARGETS) {
  const pixels = render(target.size, {
    fullBleed: target.fullBleed,
    contentScale: target.contentScale,
  })
  const png = encodePng(pixels, target.size)
  writeFileSync(join(OUT_DIR, target.file), png)
  console.log(`生成 ${target.file}（${target.size}×${target.size}，${png.length} 字节）`)
}
