// Rebuild stock card template with CORRECT loop marker placement
// Pattern from working template: {#items}{field} in first cell, {field}{/items} in last cell

import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.join(__dirname, '../public/templates/Mau the kho nhap_xuat.docx')

const src = readFileSync(templatePath)
const zip = new PizZip(src)
let xml = zip.file('word/document.xml').asText()

console.log('=== REBUILDING TEMPLATE WITH CORRECT LOOP PLACEMENT ===\n')

// Step 1: Remove ALL existing loop markers (wherever they are)
const before = (xml.match(/\{#rows\}/g) || []).length + (xml.match(/\{\/rows\}/g) || []).length
xml = xml.replace(/\{#rows\}/g, '')
xml = xml.replace(/\{\/rows\}/g, '')
console.log(`Step 1: Removed ${before} existing loop markers`)

// Step 2: Remove all existing field placeholders from cells (will re-add correctly)
const fieldNames = ['ngay', 'so_chung_tu', 'dien_giai', 'nhap_so_luong', 'xuat_so_luong', 'ton_so_luong', 'nguoi_thuc_hien', 'nguoi_kiem_tra', 'lo_hang', 'don_vi']
for (const field of fieldNames) {
  const count = (xml.match(new RegExp(`\\{${field}\\}`, 'g')) || []).length
  if (count > 0) {
    xml = xml.replace(new RegExp(`\\{${field}\\}`, 'g'), '')
    console.log(`  Removed {${field}} (${count} occurrences)`)
  }
}

// Step 3: Verify row 2 is now empty (no text)
const rows = xml.match(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g) || []
console.log(`\nStep 2: Template has ${rows.length} rows`)
if (rows.length < 2) {
  console.error('ERROR: Need at least 2 rows!')
  process.exit(1)
}

// Step 4: Inject placeholders + loop markers in row 2
// For each cell, we need to add a <w:r><w:t>{placeholder}</w:t></w:r> inside the <w:p>
// First cell gets {#rows}{ngay}, last occupied cell gets {nguoi_kiem_tra}{/rows}

const row2 = rows[1]
const cells = row2.match(/<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g) || []
console.log(`Row 2 has ${cells.length} cells`)

// Map cell index → field name (10 cells total, skip none)
// Cell 0=ngay, 1=so_chung_tu, 2=dien_giai, 3=lo_hang, 4=don_vi,
// 5=nhap_so_luong, 6=xuat_so_luong, 7=ton_so_luong, 8=nguoi_thuc_hien, 9=nguoi_kiem_tra
const cellFieldMap = {
  0: '{#rows}{ngay}',
  1: '{so_chung_tu}',
  2: '{dien_giai}',
  3: '{lo_hang}',
  4: '{don_vi}',
  5: '{nhap_so_luong}',
  6: '{xuat_so_luong}',
  7: '{ton_so_luong}',
  8: '{nguoi_thuc_hien}',
  9: '{nguoi_kiem_tra}{/rows}',
}

let newRow2 = row2
cells.forEach((cell, cellIdx) => {
  const fieldText = cellFieldMap[cellIdx]
  if (!fieldText) return  // skip unmapped cells

  // Find the paragraph inside the cell and inject text
  const paraMatch = cell.match(/(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/)
  if (!paraMatch) {
    console.log(`  Cell ${cellIdx}: No paragraph found, skipping`)
    return
  }

  // Build a run with appropriate formatting
  const textRun = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${fieldText}</w:t></w:r>`

  // Insert the run before the closing </w:p>
  const newCell = cell.replace(
    paraMatch[0],
    paraMatch[1] + paraMatch[2] + textRun + paraMatch[3]
  )
  newRow2 = newRow2.replace(cell, newCell)
  console.log(`  Cell ${cellIdx}: Added "${fieldText}"`)
})

// Replace row 2 in XML
xml = xml.replace(rows[1], newRow2)
console.log('\nStep 3: Injected all placeholders into row 2')

// Step 5: Also handle header placeholders (ten_nvl, nha_cung_cap, don_vi_tinh)
// These are already in the template from previous runs, check them
const headerPlaceholders = ['ten_nvl', 'nha_cung_cap', 'don_vi_tinh']
for (const field of headerPlaceholders) {
  const found = xml.includes(`{${field}}`)
  console.log(`Header {${field}}: ${found ? '✓ present' : '✗ missing'}`)
}

// Step 6: Verify
const loopCount = (xml.match(/\{#rows\}/g) || []).length
const endCount = (xml.match(/\{\/rows\}/g) || []).length
const fieldCount = fieldNames.filter(f => xml.includes(`{${f}}`)).length
console.log(`\n=== VERIFICATION ===`)
console.log(`Loop markers: ${loopCount} start, ${endCount} end`)
console.log(`Field placeholders present: ${fieldCount}/${fieldNames.length}`)

// Check loop placement
const loopIdx = xml.indexOf('{#rows}')
const beforeLoop = xml.substring(Math.max(0, loopIdx - 30), loopIdx)
const afterLoop = xml.substring(loopIdx, loopIdx + 40)
console.log(`Loop start context: ...${beforeLoop} >>> ${afterLoop}`)

// Write back
zip.file('word/document.xml', xml)
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(templatePath, out)
console.log(`\n✓ Template saved (${out.length} bytes)`)
