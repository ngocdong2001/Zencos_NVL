/**
 * Patches docs/Bieu mau bao cao/Phieu_yeu_cau_nvl.docx
 * → public/templates/phieu-yeu-cau-xuat-nvl.docx
 *
 * Changes made:
 *  1. Converts <placeholder> → {placeholder} for docxtemplater
 *  2. Injects {#items}…{/items} loop into the first blank data row
 *  3. Removes extra blank rows (docxtemplater will repeat the loop row)
 *
 * Run: node scripts/patch-nvl-request-template.mjs
 */

import PizZip from 'pizzip'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SRC  = path.resolve(__dirname, '../docs/Bieu mau bao cao/Phieu_yeu_cau_nvl.docx')
const DEST = path.resolve(__dirname, '../public/templates/phieu-yeu-cau-xuat-nvl.docx')

// ─── helper: build a text run <w:r> with Times New Roman 13pt ────────────────
function textRun(text) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`
}

// ─── helper: inject text into the first <w:p> of a <w:tc>…</w:tc> block ──────
function injectCellText(tcXml, text) {
  // Insert a run with the given text right before </w:p>
  // Handles cells that have a <w:pPr> block (typical in Word-generated files)
  return tcXml.replace(/(<\/w:pPr>)([\s\S]*?)(<\/w:p>)/, (_m, pPrClose, between, pClose) => {
    // Strip any existing runs to avoid duplicates
    const clean = between.replace(/<w:r[\s\S]*?<\/w:r>/g, '')
    return `${pPrClose}${clean}${textRun(text)}${pClose}`
  })
}

// ─── helper: process a blank <w:tr>…</w:tr> and inject per-cell loop tags ────
function buildLoopRow(rowXml, cellTexts) {
  let cellIdx = 0
  return rowXml.replace(/(<w:tc(?:\b[^>]*)?>)([\s\S]*?)(<\/w:tc>)/g, (_m, open, content, close) => {
    const tag = cellTexts[cellIdx] ?? ''
    cellIdx++
    return open + injectCellText(content, tag) + close
  })
}

// ─── load ────────────────────────────────────────────────────────────────────
const src = readFileSync(SRC)
const zip = new PizZip(src)
let xml   = zip.file('word/document.xml').asText()

// ─── step 1: replace <placeholder> style tags with {placeholder} ─────────────
// The original template uses &lt;name&gt; (angle-bracket style)
const replacements = [
  ['&lt;ten_nguoi_su_dung&gt;',   '{ten_nguoi_su_dung}'],
  ['&lt;So_phieu_yeu_cau&gt;',    '{so_phieu}'],
  ['&lt;So_phieu_san_xuat&gt;',   '{ma_lenh}'],
  ['&lt;ngay_lap&gt;',            '{ngay}'],
]
for (const [from, to] of replacements) {
  xml = xml.split(from).join(to)
}

// ─── step 2: inject loop tags into the blank data row(s) ─────────────────────
// Use regex replacement — avoids orphan </w:tr> from split/join approach
const itemTags = [
  '{#items}{stt}',     // Cell 1: STT        — loop OPEN here
  '{ten_nvl}',         // Cell 2: Tên NVL
  '{ma_so}',           // Cell 3: Mã số
  '{so_kiem_nhan}',    // Cell 4: Số kiểm nhận
  '{don_vi}',          // Cell 5: Đơn vị
  '{so_lo_sp}',        // Cell 6: Số lô SP
  '{sl_xin_cap}',      // Cell 7: Số lượng xin cấp
  '{sl_cap_phat}',     // Cell 8: Số lượng cấp phát
  '{ghi_chu}{/items}', // Cell 9: Ghi chú     — loop CLOSE here
]

let loopRowInjected = false

xml = xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (rowXml) => {
  // Keep rows that contain actual text (e.g., the header row)
  const hasText = /<w:t[^>]*>[^<]+<\/w:t>/.test(rowXml)
  if (hasText) return rowXml

  if (!loopRowInjected) {
    loopRowInjected = true
    return buildLoopRow(rowXml, itemTags)
  }
  // Remove extra blank rows — returned as empty string removes them entirely
  return ''
})

// ─── step 3: write back ───────────────────────────────────────────────────────
zip.file('word/document.xml', xml)
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
mkdirSync(path.dirname(DEST), { recursive: true })
writeFileSync(DEST, out)

console.log('✅  Template patched and saved to:', DEST)
console.log()
console.log('Placeholders now in template:')
console.log('  {ten_nguoi_su_dung}  {so_phieu}  {ma_lenh}  {ngay}')
console.log('  Loop: {#items} … {/items}')
console.log('    {stt}  {ten_nvl}  {ma_so}  {so_kiem_nhan}  {don_vi}')
console.log('    {so_lo_sp}  {sl_xin_cap}  {sl_cap_phat}  {ghi_chu}')
