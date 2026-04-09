export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

export function parseDecimalInput(value: string): number {
  const compact = value.trim().replace(/\s+/g, '')
  if (!compact) return Number.NaN

  const hasComma = compact.includes(',')
  const hasDot = compact.includes('.')
  let normalized = compact

  if (hasComma && hasDot) {
    const decimalSeparator = compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.'
    normalized = decimalSeparator === ','
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '')
  } else if (hasComma) {
    normalized = /^-?\d{1,3}(,\d{3})+$/.test(compact)
      ? compact.replace(/,/g, '')
      : compact.replace(',', '.')
  } else if (hasDot) {
    normalized = /^-?\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, '')
      : compact
  }

  normalized = normalized.replace(/[^0-9.-]/g, '')
  return Number.parseFloat(normalized)
}

export function toEditableNumberString(value: number): string {
  if (!Number.isFinite(value)) return ''
  return `${value}`
}

export function parseDateValue(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function formatDateValue(value: Date | null | undefined): string {
  if (!value) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
