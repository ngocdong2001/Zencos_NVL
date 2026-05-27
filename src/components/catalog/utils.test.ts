import { describe, expect, it } from 'vitest'
import { getNextMaterialCode } from './utils'
import type { BasicRow } from './types'

const classifications: BasicRow[] = [
  { id: '1', code: 'packaging', name: 'Bao bì', note: '', status: 'Active' },
  { id: '2', code: 'chemicals', name: 'Hóa chất pha chế', note: '', status: 'Active' },
]

describe('getNextMaterialCode', () => {
  it('uses BB prefix for Bao bì classifications', () => {
    const code = getNextMaterialCode(['NL-0001'], '1', classifications)
    expect(code).toBe('BB-0001')
  })

  it('uses NL prefix for non-Bao bì classifications', () => {
    const code = getNextMaterialCode(['NL-0001', 'NL-0002', 'BB-0001'], '2', classifications)
    expect(code).toBe('NL-0003')
  })
})
