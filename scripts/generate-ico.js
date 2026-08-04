import fs from 'node:fs'
import path from 'node:path'

// 生成 32x32 BMP 格式 ICO 文件（手绘像素）
const W = 32, H = 32

// 像素数据（BGRA，从底到顶）
const pixels = []

// 辅助函数
function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const idx = (y * W + x) * 4
  pixels[idx] = b
  pixels[idx + 1] = g
  pixels[idx + 2] = r
  pixels[idx + 3] = a
}

function fillRect(x0, y0, x1, y1, r, g, b) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(x, y, r, g, b)
}

function fillCircle(cx, cy, rad, r, g, b) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++)
      if (x * x + y * y <= rad * rad)
        setPixel(cx + x, cy + y, r, g, b)
}

function fillTriangle(x0, y0, x1, y1, x2, y2, r, g, b) {
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2)
  for (let y = minY; y <= maxY; y++) {
    for (let x = 0; x < W; x++) {
      const d1 = (x - x1) * (y0 - y1) - (x0 - x1) * (y - y1)
      const d2 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)
      const d3 = (x - x0) * (y2 - y0) - (x2 - x0) * (y - y0)
      const neg = d1 < 0 || d2 < 0 || d3 < 0
      const pos = d1 > 0 || d2 > 0 || d3 > 0
      if (!(neg && pos)) setPixel(x, y, r, g, b)
    }
  }
}

// 初始化透明
for (let i = 0; i < W * H * 4; i++) pixels.push(0)

// 背景（深色圆角效果，简化为矩形）
fillRect(0, 0, 31, 31, 10, 14, 20)

// 火箭主体（白色）
fillRect(14, 4, 17, 22, 240, 239, 232)

// 鼻锥（金色）
fillTriangle(15, 3, 17, 8, 14, 8, 232, 168, 48)

// 舷窗（蓝色）
fillCircle(16, 12, 2, 58, 124, 165)
fillCircle(16, 12, 1, 106, 184, 224)

// 左翼
fillTriangle(14, 19, 10, 26, 14, 24, 212, 208, 197)

// 右翼
fillTriangle(17, 19, 21, 26, 17, 24, 212, 208, 197)

// 尾部
fillRect(14, 22, 17, 24, 184, 179, 168)

// 火焰（金色）
fillTriangle(15, 24, 16, 29, 17, 24, 240, 193, 74)
fillTriangle(15, 24, 16, 27, 17, 24, 255, 243, 196)

// 构建 BMP 数据（ICO 内部格式）
const biSize = 40
const biWidth = W
const biHeight = H * 2 // ICO: height = image height * 2 (image + mask)
const biPlanes = 1
const biBitCount = 32
const biCompression = 0
const biSizeImage = W * H * 4

const maskSize = W * H / 8 // 1bit mask

const dibSize = biSize + biSizeImage + maskSize

// ICO header
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(1, 4)

// ICO directory entry
const entry = Buffer.alloc(16)
entry.writeUInt8(W, 0)
entry.writeUInt8(H, 1)
entry.writeUInt8(0, 2)
entry.writeUInt8(0, 3)
entry.writeUInt16LE(1, 4)
entry.writeUInt16LE(32, 6)
entry.writeUInt32LE(dibSize, 8)
entry.writeUInt32LE(22, 12)

// BITMAPINFOHEADER
const bih = Buffer.alloc(biSize)
bih.writeUInt32LE(biSize, 0)
bih.writeInt32LE(biWidth, 4)
bih.writeInt32LE(biHeight, 8)
bih.writeUInt16LE(biPlanes, 12)
bih.writeUInt16LE(biBitCount, 14)
bih.writeUInt32LE(biCompression, 16)
bih.writeUInt32LE(biSizeImage, 20)

// 像素数据（BGRA，从底到顶）
const pixelData = Buffer.alloc(biSizeImage)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const srcIdx = ((H - 1 - y) * W + x) * 4 // 翻转Y
    const dstIdx = (y * W + x) * 4
    pixelData[dstIdx] = pixels[srcIdx]
    pixelData[dstIdx + 1] = pixels[srcIdx + 1]
    pixelData[dstIdx + 2] = pixels[srcIdx + 2]
    pixelData[dstIdx + 3] = pixels[srcIdx + 3]
  }
}

// AND mask（全0=不透明）
const mask = Buffer.alloc(maskSize, 0)

const ico = Buffer.concat([icoHeader, entry, bih, pixelData, mask])
const outPath = path.resolve('public/favicon.ico')
fs.writeFileSync(outPath, ico)
console.log(`Generated ${outPath} (${ico.length} bytes)`)
