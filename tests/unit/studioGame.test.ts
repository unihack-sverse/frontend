import { describe, expect, it } from 'vitest'
import {
  mappingSummary,
  parseCsvRows,
  powerRangeLabel,
  srvToUnits,
  unitsToSrvInput,
} from '~/utils/studioGame'

describe('mappingSummary', () => {
  it('returns visual passthrough when mapping is empty or missing', () => {
    expect(mappingSummary({})).toEqual(['visual passthrough'])
    expect(mappingSummary({ mapping: {} })).toEqual(['visual passthrough'])
  })

  it('formats passthrough, curve+outRange, and from-only rules as separate lines', () => {
    expect(
      mappingSummary({
        mapping: {
          glow: { passthrough: true },
          attack: { from: 'raw_dmg', curve: 'linear', outRange: [10, 50] },
          speed: { from: 'agility' },
          fallback: {},
        },
      }),
    ).toEqual([
      'glow passthrough',
      'attack ← raw_dmg · linear → 10–50',
      'speed ← agility',
      'fallback passthrough',
    ])
  })

  it('keeps HTML-like characters unjoined as plain text lines for safe text interpolation', () => {
    const lines = mappingSummary({
      mapping: {
        '<script>alert(1)</script>': { from: '<img src=x onerror=alert(1)>', curve: '<b>linear</b>' },
      },
    })
    expect(lines).toEqual([
      '<script>alert(1)</script> ← <img src=x onerror=alert(1)> · <b>linear</b>',
    ])
    expect(lines.join('')).not.toContain('<br>')
  })
})

describe('powerRangeLabel', () => {
  it('formats valid ranges and falls back to n/a', () => {
    expect(powerRangeLabel({ powerTierRange: [1, 5] })).toBe('1 – 5')
    expect(powerRangeLabel({ powerTierRange: [1] })).toBe('n/a')
    expect(powerRangeLabel(null)).toBe('n/a')
  })
})

describe('srvToUnits and unitsToSrvInput', () => {
  it('converts SRV decimal strings to 6-decimal integer units', () => {
    expect(srvToUnits('9.99')).toBe('9990000')
    expect(srvToUnits('1,250.5')).toBe('1250500000')
    expect(srvToUnits('')).toBeNull()
    expect(srvToUnits('abc')).toBeNull()
  })

  it('converts integer units back to SRV input string', () => {
    expect(unitsToSrvInput('9990000')).toBe('9.99')
    expect(unitsToSrvInput('0')).toBe('')
    expect(unitsToSrvInput(null)).toBe('')
  })
})

describe('parseCsvRows', () => {
  it('returns empty array for blank input', () => {
    expect(parseCsvRows('   \n  ')).toEqual([])
  })

  it('skips optional header row and parses item fields', () => {
    const csv = [
      'sku,name,description,kind,price_srv,royalty_bps,interop_tier,schema_id,supply_max',
      'vr_boost,Boost Pack,desc,bundle,9.99,500,T2,schema_v1,100',
      'basic_hat,Basic Hat,, ,1.5',
    ].join('\n')

    expect(parseCsvRows(csv)).toEqual([
      {
        sku: 'vr_boost',
        name: 'Boost Pack',
        kind: 'bundle',
        priceSrv: '9.99',
        priceUnits: '9990000',
        royaltyBps: '500',
        interopTier: 'T2',
        schemaId: 'schema_v1',
        supplyMax: '100',
      },
      {
        sku: 'basic_hat',
        name: 'Basic Hat',
        kind: 'cosmetic',
        priceSrv: '1.5',
        priceUnits: '1500000',
        royaltyBps: '0',
        interopTier: 'T0',
        schemaId: '',
        supplyMax: '',
      },
    ])
  })

  it('parses rows when no header is present', () => {
    const rows = parseCsvRows('sword_01,Iron Sword,,cosmetic,2,250,T1,weapon_v1,50')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      sku: 'sword_01',
      name: 'Iron Sword',
      priceUnits: '2000000',
      interopTier: 'T1',
    })
  })
})
