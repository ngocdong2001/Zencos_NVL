import { readFileSync, writeFileSync } from 'fs'

const path = 'src/pages/ProductionBomPage.tsx'
let text = readFileSync(path, 'utf8')

// Garbled → correct Vietnamese replacements (using Unicode escapes for safety)
const fixes = [
  // M + Ã(U+00C3) + £(U+00A3) = "ã" → "ã"
  ['M\u00C3\u00A3 nguy\u00C3\u00AAn li\u00E1\u00BB\u2021u', 'M\u00E3 nguy\u00EAn li\u1EC7u'],
  // T + Ã(U+00C3) + ª(U+00AA) = "ê" → "ê"
  ['T\u00C3\u00AAn nguy\u00C3\u00AAn li\u00E1\u00BB\u2021u', 'T\u00EAn nguy\u00EAn li\u1EC7u'],
  // Tìm mã...
  ['T\u00C3\u00ACm m\u00C3\u00A3...', 'T\u00ECm m\u00E3...'],
  // Tìm tên...
  ['T\u00C3\u00ACm t\u00C3\u00AAn...', 'T\u00ECm t\u00EAn...'],
  // en-dash â€" → –  (E2 80 93 misread as Win-1252: â € ")
  ['\u00E2\u20AC\u201C', '\u2013'],
]

for (const [from, to] of fixes) {
  const before = text
  text = text.replaceAll(from, to)
  console.log(`"${from}" → found: ${before !== text}`)
}

writeFileSync(path, text, 'utf8')
console.log('Done')
