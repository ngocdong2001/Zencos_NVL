export function safeRandomId(): string {
  const g = globalThis as typeof globalThis & {
    crypto?: Crypto
  }

  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID()
  }

  if (g.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16)
    g.crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}