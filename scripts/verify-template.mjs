import PizZip from 'pizzip'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buf = readFileSync(path.resolve(__dirname, '../public/templates/phieu-yeu-cau-xuat-nvl.docx'))
const zip = new PizZip(buf)
const xml = zip.file('word/document.xml').asText()

const trOpen  = (xml.match(/<w:tr[ >]/g) || []).length
const trClose = (xml.match(/<\/w:tr>/g) || []).length
const tcOpen  = (xml.match(/<w:tc[ >]/g) || []).length
const tcClose = (xml.match(/<\/w:tc>/g) || []).length
console.log('w:tr open:', trOpen, '/ close:', trClose, trOpen === trClose ? '✅' : '❌ MISMATCH')
console.log('w:tc open:', tcOpen, '/ close:', tcClose, tcOpen === tcClose ? '✅' : '❌ MISMATCH')

const checks = ['{ten_nguoi_su_dung}', '{so_phieu}', '{ma_lenh}', '{ngay}', '{#items}', '{/items}', '{stt}', '{ten_nvl}', '{ma_so}', '{don_vi}', '{sl_xin_cap}']
for (const tag of checks) {
  console.log(tag + ':', xml.includes(tag) ? '✅' : '❌ MISSING')
}
console.log('File size:', buf.length)
