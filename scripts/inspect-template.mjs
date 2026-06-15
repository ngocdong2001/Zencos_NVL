// Inspect stock card template structure
import PizZip from 'pizzip'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const templatePath = path.resolve(__dirname, '../public/templates/Mau the kho nhap_xuat.docx')

const src = readFileSync(templatePath)
const zip = new PizZip(src)
const xml = zip.file('word/document.xml').asText()

console.log('=== TEMPLATE STRUCTURE ANALYSIS ===\n')

// Find all text elements
const textElements = xml.match(/<w:t>([^<]*)<\/w:t>/g) || []
console.log(`Total text elements: ${textElements.length}`)
console.log('\nFirst 30 text elements:')
textElements.slice(0, 30).forEach((el, idx) => {
  const text = el.replace(/<w:t>|<\/w:t>/g, '')
  if (text.trim()) console.log(`  ${idx + 1}. ${text}`)
})

// Find tables
const tables = xml.match(/<w:tbl>/g) || []
console.log(`\n\nTotal tables: ${tables.length}`)

// Analyze table structure
const tableMatches = xml.match(/<w:tbl>([\s\S]*?)<\/w:tbl>/g) || []
tableMatches.forEach((table, tidx) => {
  const rows = table.match(/<w:tr>/g) || []
  const cells = table.match(/<w:tc>/g) || []
  console.log(`\nTable ${tidx + 1}:`)
  console.log(`  Rows: ${rows.length}`)
  console.log(`  Cells: ${cells.length}`)
  
  // Show first row content
  const firstRowMatch = table.match(/<w:tr>([\s\S]*?)<\/w:tr>/)
  if (firstRowMatch) {
    const firstRowText = firstRowMatch[0].match(/<w:t>([^<]*)<\/w:t>/g) || []
    console.log(`  First row text:`)
    firstRowText.slice(0, 10).forEach(el => {
      const text = el.replace(/<w:t>|<\/w:t>/g, '')
      if (text.trim()) console.log(`    - ${text}`)
    })
  }
})

// Find paragraph contents
const paragraphs = xml.match(/<w:p>([\s\S]*?)<\/w:p>/g) || []
console.log(`\n\nTotal paragraphs: ${paragraphs.length}`)
console.log('Key paragraphs with text:')
paragraphs.forEach((para, idx) => {
  const texts = para.match(/<w:t>([^<]+)<\/w:t>/g) || []
  const fullText = texts.map(t => t.replace(/<w:t>|<\/w:t>/g, '')).join(' ').trim()
  if (fullText && fullText.length > 5 && idx < 50) {
    console.log(`  P${idx}: ${fullText.substring(0, 80)}`)
  }
})

console.log('\n=== END ANALYSIS ===')
