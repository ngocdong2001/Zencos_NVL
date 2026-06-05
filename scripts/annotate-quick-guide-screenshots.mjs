import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const sourceDir = path.resolve('docs/quick-guide/screenshots')
const outputDir = path.resolve('docs/quick-guide/screenshots-annotated')
const highlightFile = path.resolve('docs/quick-guide/screenshot-highlights.json')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const regionMap = fs.existsSync(highlightFile)
  ? JSON.parse(fs.readFileSync(highlightFile, 'utf8'))
  : {}

function overlaySvg(width, height, regions) {
  const boxSvg = regions.map((r) => {
    const badgeX = Math.max(18, r.x - 18)
    const badgeY = Math.max(18, r.y - 18)
    return `
      <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#e11d48" stroke-width="5" rx="8" ry="8" />
      <circle cx="${badgeX}" cy="${badgeY}" r="18" fill="#e11d48" />
      <text x="${badgeX}" y="${badgeY + 6}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#ffffff">${r.n}</text>
    `
  }).join('\n')

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${boxSvg}
    </svg>
  `)
}

const files = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.png'))

for (const file of files) {
  const inputPath = path.join(sourceDir, file)
  const outputPath = path.join(outputDir, file)
  const image = sharp(inputPath)
  const metadata = await image.metadata()

  const width = metadata.width ?? 1920
  const height = metadata.height ?? 1080
  const regions = regionMap[file] ?? []

  if (regions.length === 0) {
    fs.copyFileSync(inputPath, outputPath)
    continue
  }

  const svg = overlaySvg(width, height, regions)
  await image.composite([{ input: svg, top: 0, left: 0 }]).png().toFile(outputPath)
  console.log(`Annotated: ${file}`)
}

console.log(`Done. Output: ${outputDir}`)
