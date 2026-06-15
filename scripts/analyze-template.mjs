// Detailed template inspection
import PizZip from 'pizzip'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = readFileSync(path.join(__dirname, '../public/templates/Mau the kho nhap_xuat.docx'))
const zip = new PizZip(src)
const xml = zip.file('word/document.xml').asText()

// Count w:tr elements properly
const rowMatches = xml.match(/<w:tr[\s>]/g) || []
console.log('Found <w:tr> opening tags:', rowMatches.length)

// Extract each row with proper regex
const rows = xml.match(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g) || []
console.log('Extracted full rows:', rows.length)

// Show content of first few rows
rows.slice(0, 5).forEach((row, idx) => {
  const cells = row.match(/<w:tc>/g) || []
  const texts = row.match(/<w:t>[^<]*<\/w:t>/g) || []
  console.log(`\nRow ${idx + 1}: ${cells.length} cells`)
  console.log('  Text elements:')
  texts.forEach(t => {
    const content = t.replace(/<w:t>|<\/w:t>/g, '')
    if (content.trim()) console.log(`    - "${content}"`)
  })
})

console.log(`\n\nDocument has ${rows.length} rows total`)
console.log('Template currently has placeholders for header (row 1 likely)')
console.log('Rows 2+ should be converted to a repeating section for transaction data')
