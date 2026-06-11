#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.length < 3) {
  console.log(`Usage: node adjust-highlights.mjs <filename> <boxNum> <dy> [<dx>] [--rebuild]`)
  console.log(`  Example: node adjust-highlights.mjs 06-inbound-step4.png 1 -50 0 --rebuild`)
  console.log(`  This moves box 1 up by 50px and right by 0px`)
  process.exit(0)
}

const [filename, boxNumStr, dyStr, dxStr = '0', ...opts] = args
const boxNum = parseInt(boxNumStr, 10)
const dy = parseInt(dyStr, 10)
const dx = parseInt(dxStr, 10)
const shouldRebuild = opts.includes('--rebuild')

const highlightFile = path.join('docs', 'quick-guide', 'screenshot-highlights.json')
const data = JSON.parse(fs.readFileSync(highlightFile, 'utf8'))

if (!data[filename]) {
  console.error(`File not found in highlights: ${filename}`)
  process.exit(1)
}

const regions = data[filename]
const region = regions.find(r => r.n === boxNum)
if (!region) {
  console.error(`Box ${boxNum} not found in ${filename}`)
  console.log(`Available boxes:`, regions.map(r => r.n).join(', '))
  process.exit(1)
}

console.log(`Before: box ${boxNum} at (${region.x},${region.y}) size ${region.w}x${region.h}`)
region.x += dx
region.y += dy
console.log(`After:  box ${boxNum} at (${region.x},${region.y}) size ${region.w}x${region.h}`)

fs.writeFileSync(highlightFile, JSON.stringify(data, null, 2))
console.log(`Updated: ${highlightFile}`)

if (shouldRebuild) {
  console.log(`\nRebuilding annotated images and docx...`)
  const { execSync } = await import('child_process')
  try {
    execSync('node scripts/annotate-quick-guide-screenshots.mjs', { stdio: 'inherit' })
    execSync('node scripts/generate-quick-guide-docx.mjs', { stdio: 'inherit', env: { ...process.env, GUIDE_SCREENSHOT_DIR: 'screenshots-annotated' } })
    console.log(`\n✓ Done! File ready: docs/quick-guide/Quick-Guide-ZencosMS.docx`)
  } catch (e) {
    console.error('Rebuild failed:', e.message)
    process.exit(1)
  }
}
