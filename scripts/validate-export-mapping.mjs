// Validate template placeholders match export data structure
import PizZip from 'pizzip'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = readFileSync(path.join(__dirname, '../public/templates/Mau the kho nhap_xuat.docx'))
const zip = new PizZip(src)
const xml = zip.file('word/document.xml').asText()

// Expected data structure from export function
const expectedHeader = ['ten_nvl', 'nha_cung_cap', 'don_vi_tinh']
const expectedRowFields = ['ngay', 'so_chung_tu', 'dien_giai', 'nhap_so_luong', 'xuat_so_luong', 'ton_so_luong', 'nguoi_thuc_hien', 'nguoi_kiem_tra']

console.log('=== TEMPLATE vs EXPORT DATA VALIDATION ===\n')

// Check header fields
console.log('Header fields:')
for (const field of expectedHeader) {
  const found = xml.includes(`{${field}}`)
  console.log(`  ${found ? '✓' : '✗'} {${field}} - ${found ? 'mapped in export' : 'NOT FOUND IN TEMPLATE'}`)
}

// Check loop structure
const loopMatch = xml.match(/\{#rows\}([\s\S]*?)\{\/rows\}/)
if (!loopMatch) {
  console.log('\n✗ ERROR: Loop structure {#rows}...{/rows} NOT found')
  process.exit(1)
}
console.log('\n✓ Loop structure found')

// Check transaction fields inside loop
console.log('\nTransaction row fields (inside {#rows}...{/rows}):')
for (const field of expectedRowFields) {
  const inLoop = loopMatch[1].includes(`{${field}}`)
  console.log(`  ${inLoop ? '✓' : '✗'} {${field}} - ${inLoop ? 'in loop' : 'NOT IN LOOP'}`)
}

// Check for any unexpected placeholders
const allPlaceholders = xml.match(/\{[^}/#]+\}/g) || []
const uniquePlaceholders = [...new Set(allPlaceholders)]
const expectedAll = [...expectedHeader, ...expectedRowFields]
const unexpected = uniquePlaceholders.filter(p => !expectedAll.includes(p.replace(/[{}]/g, '')))

if (unexpected.length > 0) {
  console.log('\n⚠ Unexpected placeholders (not mapped in export):')
  unexpected.forEach(p => console.log(`  - ${p}`))
}

console.log('\n=== VALIDATION COMPLETE ===')
