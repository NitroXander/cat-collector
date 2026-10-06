import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

/* ---------------------------------------------------------------- png codec */

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const head = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head, data])), 0)
  return Buffer.concat([length, head, data, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ------------------------------------------------------------------ canvas */

function createCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) }
}

function blend(canvas, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return
  const i = (y * canvas.size + x) * 4
  const sa = a / 255
  const da = canvas.data[i + 3] / 255
  const out = sa + da * (1 - sa)
  if (out <= 0) return
  canvas.data[i] = Math.round((r * sa + canvas.data[i] * da * (1 - sa)) / out)
  canvas.data[i + 1] = Math.round((g * sa + canvas.data[i + 1] * da * (1 - sa)) / out)
  canvas.data[i + 2] = Math.round((b * sa + canvas.data[i + 2] * da * (1 - sa)) / out)
  canvas.data[i + 3] = Math.round(out * 255)
}

/** Paints a shape with 3x3 supersampled coverage. Shape space is -1..1 on both axes. */
function paint(canvas, shape, color) {
  const n = canvas.size
  for (let py = 0; py < n; py += 1) {
    for (let px = 0; px < n; px += 1) {
      let hits = 0
      for (let sy = 0; sy < 3; sy += 1) {
        for (let sx = 0; sx < 3; sx += 1) {
          const u = ((px + (sx + 0.5) / 3) / n) * 2 - 1
          const v = ((py + (sy + 0.5) / 3) / n) * 2 - 1
          if (shape(u, v)) hits += 1
        }
      }
      if (hits === 0) continue
      blend(canvas, px, py, [color[0], color[1], color[2], Math.round((color[3] ?? 255) * (hits / 9))])
    }
  }
}

const circle = (cx, cy, r) => (u, v) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r

const triangle = (a, b, c) => (u, v) => {
  const sign = (p, q, r2) => (p[0] - r2[0]) * (q[1] - r2[1]) - (q[0] - r2[0]) * (p[1] - r2[1])
  const d1 = sign([u, v], a, b)
  const d2 = sign([u, v], b, c)
  const d3 = sign([u, v], c, a)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

const roundRect = (inset, radius) => (u, v) => {
  const half = 1 - inset
  if (Math.abs(u) > half || Math.abs(v) > half) return false
  const dx = Math.abs(u) - (half - radius)
  const dy = Math.abs(v) - (half - radius)
  if (dx <= 0 || dy <= 0) return true
  return dx * dx + dy * dy <= radius * radius
}

const union = (...shapes) => (u, v) => shapes.some((s) => s(u, v))

/** Cat silhouette: ears + head, in cream. Shared by app icon and tray icon. */
const catSilhouette = union(
  triangle([-0.86, -0.2], [-0.72, -0.98], [-0.18, -0.52]),
  triangle([0.86, -0.2], [0.72, -0.98], [0.18, -0.52]),
  circle(0, 0.06, 0.7)
)

const catEyes = union(circle(-0.27, 0.0, 0.1), circle(0.27, 0.0, 0.1))
const catMuzzle = triangle([-0.09, 0.34], [0.09, 0.34], [0, 0.16])

/* ------------------------------------------------------------------ output */

const CREAM = [255, 236, 205, 255]
const INK = [45, 34, 26, 255]
const BG = [58, 45, 38, 255]

function drawAppIcon(size) {
  const canvas = createCanvas(size)
  paint(canvas, roundRect(0.04, 0.34), BG)
  paint(canvas, catSilhouette, CREAM)
  paint(canvas, catEyes, INK)
  paint(canvas, catMuzzle, INK)
  return encodePng(size, canvas.data)
}

function drawTrayIcon(size) {
  const canvas = createCanvas(size)
  paint(canvas, catSilhouette, [255, 255, 255, 255])
  return encodePng(size, canvas.data)
}

const targets = [
  ['resources/icon.png', drawAppIcon(256)],
  ['resources/tray.png', drawTrayIcon(32)]
]

for (const [relative, buffer] of targets) {
  const file = path.join(root, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, buffer)
  console.log(`wrote ${relative} (${buffer.length} bytes)`)
}
