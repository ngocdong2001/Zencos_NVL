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
