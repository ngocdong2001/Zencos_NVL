// Test: repack without modifications
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const src = readFileSync(path.resolve(__dirname, '../docs/Bieu mau bao cao/Phieu_yeu_cau_nvl.docx'))
const zip = new PizZip(src)
const xml = zip.file('word/document.xml').asText()

// Count <w:tr> to check parsing
const trCount = (xml.match(/<w:tr[ >]/g) || []).length
console.log('Table rows (<w:tr>):', trCount)

// Check for unclosed tags after patch simulation
console.log('XML length:', xml.length)
console.log('First 200 chars:', xml.substring(0, 200))

// Repack unchanged and check
zip.file('word/document.xml', xml)
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(path.resolve(__dirname, '../public/templates/test-repack.docx'), out)
console.log('Repacked OK, size:', out.length, '(original:', src.length, ')')
