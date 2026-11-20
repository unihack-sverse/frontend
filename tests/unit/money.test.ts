import { describe, expect, it } from 'vitest'
import { srvToUnits } from '~/utils/money'

describe('srvToUnits (utils/money)', () => {
  it('parses positive SRV strings with separators and up to 6 decimals', () => {
    expect(srvToUnits('120')).toBe('120000000')
    expect(srvToUnits('1,200.25')).toBe('1200250000')
    expect(srvToUnits('1_000')).toBe('1000000000')
    expect(srvToUnits('0.000001')).toBe('1')
    expect(srvToUnits(' 120.5 ')).toBe('120500000')
  })

  it('rejects zero amounts', () => {
    expect(srvToUnits('0')).toBeNull()
    expect(srvToUnits('0.00')).toBeNull()
    expect(srvToUnits('0.000000')).toBeNull()
  })

  it('rejects more than 6 decimal places and malformed inputs', () => {
    expect(srvToUnits('1.1234567')).toBeNull()
    expect(srvToUnits('0.0000001')).toBeNull()
    expect(srvToUnits('')).toBeNull()
    expect(srvToUnits('abc')).toBeNull()
    expect(srvToUnits('-10')).toBeNull()
  })
})
