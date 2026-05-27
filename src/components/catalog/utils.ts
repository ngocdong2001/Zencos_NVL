import type { BasicRow } from './types'

export function toCsvRow(values: string[]): string {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""')
      return `"${escaped}"`
    })
    .join(',')
}

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF', content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function containsInsensitive(text: string, q: string): boolean {
  return text.toLocaleLowerCase().includes(q.toLocaleLowerCase())
}

export function normalizeCatalogCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

export function normalizeLookupKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getNextCode(codes: string[], prefix: string, pad = 3): string {
  const used = new Set<number>()

  for (const raw of codes) {
    const code = raw.trim().toUpperCase()
    if (!code.startsWith(`${prefix}-`)) continue
    const suffix = code.slice(prefix.length + 1)
    const n = Number.parseInt(suffix, 10)
    if (Number.isFinite(n) && n > 0) used.add(n)
  }

  let next = 1
  while (used.has(next)) next += 1
  return `${prefix}-${String(next).padStart(pad, '0')}`
}

export function resolveMaterialCodePrefix(categoryValue: string, classifications: BasicRow[]): 'BB' | 'NL' {
  const normalizedCategory = normalizeLookupKey(categoryValue)
  if (!normalizedCategory) return 'NL'

  const resolvedClassification = classifications.find((item) => {
    const idMatch = item.id === categoryValue
    const codeMatch = normalizeLookupKey(item.code) === normalizedCategory
    const nameMatch = normalizeLookupKey(item.name) === normalizedCategory
    return idMatch || codeMatch || nameMatch
  })

  const normalizedCode = normalizeLookupKey(resolvedClassification?.code ?? '')
  const normalizedName = normalizeLookupKey(resolvedClassification?.name ?? '')
  const isPackaging = normalizedCode === 'packaging' || normalizedName.includes('bao bi')

  return isPackaging ? 'BB' : 'NL'
}

export function getNextMaterialCode(codes: string[], categoryValue: string, classifications: BasicRow[]): string {
  const prefix = resolveMaterialCodePrefix(categoryValue, classifications)
  return getNextCode(codes, prefix, 4)
}
