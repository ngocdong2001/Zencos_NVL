// Patch stock card template with docxtemplater placeholders
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const templatePath = path.resolve(__dirname, '../public/templates/Mau the kho nhap_xuat.docx')

console.log('Reading template:', templatePath)
const src = readFileSync(templatePath)
const zip = new PizZip(src)
let xml = zip.file('word/document.xml').asText()

// Step 1: Add placeholders for header fields
console.log('\n=== Adding header field placeholders ===')
const headerReplacements = [
  { search: /Tên Nguyên Vật Liệu/i, replace: '{ten_nvl}', label: 'ten_nvl' },
  { search: /Lô\/Hạn dùng/i, replace: '{lot_han_dung}', label: 'lot_han_dung' },
  { search: /Nhà cung cấp/i, replace: '{nha_cung_cap}', label: 'nha_cung_cap' },
  { search: /Đơn vị tín/i, replace: '{don_vi_tinh}', label: 'don_vi_tinh' },
]

for (const { search, replace, label } of headerReplacements) {
  const textPattern = /<w:t>[^<]*<\/w:t>/g
  const matches = xml.matchAll(textPattern)
  let found = false
  for (const match of matches) {
    const text = match[0]
    const content = text.replace(/<w:t>|<\/w:t>/g, '')
    if (search.test(content)) {
      const newText = text.replace(content, replace)
      xml = xml.replace(text, newText, 1)
      console.log(`✓ Found and replaced: ${content} → ${replace}`)
      found = true
      break
    }
  }
  if (!found) {
    console.log(`⚠ Not found: ${label}`)
  }
}

// Step 2: Process the transaction table
console.log('\n=== Processing transaction table ===')

const rows = xml.match(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g) || []
console.log(`Found ${rows.length} rows`)

if (rows.length >= 2) {
  const headerRow = rows[0]
  const templateRow = rows[1]
  
  console.log(`\nHeader row has ${(headerRow.match(/<w:tc>/g) || []).length} cells`)
  console.log(`Template row has ${(templateRow.match(/<w:tc>/g) || []).length} cells`)
  
  // Map field names to cell positions in template row
  // Based on the column headers: ngay, so_chung_tu, dien_giai, nhap_so_luong, xuat_so_luong, ton_so_luong, nguoi_thuc_hien, nguoi_kiem_tra
  const fieldNames = ['ngay', 'so_chung_tu', 'dien_giai', 'nhap_so_luong', 'xuat_so_luong', 'ton_so_luong', 'nguoi_thuc_hien', 'nguoi_kiem_tra']
  
  // Extract cells from template row
  const cellMatches = templateRow.match(/<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g) || []
  console.log(`Extracting placeholders for ${cellMatches.length} cells`)
  
  let newTemplateRow = templateRow
  cellMatches.forEach((cell, cellIdx) => {
    const fieldName = fieldNames[cellIdx]
    if (fieldName) {
      // Replace or add text with placeholder
      if (cell.includes('<w:t>')) {
        // Replace existing text
        newTemplateRow = newTemplateRow.replace(
          cell,
          cell.replace(/<w:t>[^<]*<\/w:t>/, `<w:t>{${fieldName}}</w:t>`),
          1
        )
        console.log(`  Cell ${cellIdx + 1}: Added placeholder {${fieldName}}`)
      } else {
        // Add text element with placeholder
        const textElement = `<w:t>{${fieldName}}</w:t>`
        // Find where to insert it (inside the cell's paragraph)
        const insertPoint = cell.lastIndexOf('</w:r>')
        if (insertPoint > -1) {
          const before = cell.substring(0, insertPoint + 7)
          const after = cell.substring(insertPoint + 7)
          newTemplateRow = newTemplateRow.replace(cell, before + `<w:r>${textElement}</w:r>` + after)
          console.log(`  Cell ${cellIdx + 1}: Created text with {${fieldName}}`)
        } else {
          // Try inserting into paragraph instead
          const pIndex = cell.lastIndexOf('</w:p>')
          if (pIndex > -1) {
            const before = cell.substring(0, pIndex)
            const after = cell.substring(pIndex)
            newTemplateRow = newTemplateRow.replace(cell, before + `<w:r>${textElement}</w:r>` + after)
            console.log(`  Cell ${cellIdx + 1}: Created text with {${fieldName}} in paragraph`)
          }
        }
      }
    }
  })
  
  // Wrap template row with loop markers
  const loopedRow = `{#rows}${newTemplateRow}{/rows}`
  
  // Replace old template row with looped version
  xml = xml.replace(templateRow, loopedRow)
  
  console.log(`✓ Added loop markers to template row`)
}

// Write back the modified XML
zip.file('word/document.xml', xml)
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(templatePath, out)

console.log(`\n✓ Template patched successfully!`)
console.log(`  Original size: ${src.length} bytes`)
console.log(`  New size: ${out.length} bytes`)
console.log(`\n✓ Placeholders added:`)
console.log(`  Header: {ten_nvl}, {lot_han_dung}, {nha_cung_cap}, {don_vi_tinh}`)
console.log(`  Transaction rows (repeating): {ngay}, {so_chung_tu}, {dien_giai}, {nhap_so_luong}, {xuat_so_luong}, {ton_so_luong}, {nguoi_thuc_hien}, {nguoi_kiem_tra}`)


