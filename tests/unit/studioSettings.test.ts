import { describe, expect, it } from 'vitest'
import {
  buildMcpConfigJson,
  computeTierCta,
  deliveryChip,
  fieldErrorFrom,
  relativeTime,
  shortId,
} from '~/utils/studioSettings'

describe('computeTierCta', () => {
  it('returns next tier percentage ordered by minStakeUnits or fallback CTA', () => {
    const feeTiers = [
      { tier: 'pro', feeBps: 500, minStakeUnits: '1000000000' },
      { tier: 'standard', feeBps: 1000, minStakeUnits: '0' },
      { tier: 'genesis', feeBps: 250, minStakeUnits: '5000000000' },
    ]
    expect(computeTierCta(feeTiers, 'standard')).toBe('Stake to reach 5%')
    expect(computeTierCta(feeTiers, 'pro')).toBe('Stake to reach 2.5%')
    expect(computeTierCta(feeTiers, 'genesis')).toBe('View payout settings')
    expect(computeTierCta(undefined, 'standard')).toBe('View payout settings')
  })
})

describe('buildMcpConfigJson', () => {
  it('formats MCP server config JSON with secret and origins', () => {
    const parsed = JSON.parse(buildMcpConfigJson('sk_test_123', 'https://api.sverse.gg', 'https://console.sverse.gg'))
    expect(parsed).toEqual({
      mcpServers: {
        sverse: {
          command: 'node',
          args: ['<absolute-path-to-sverse>/mcp/dist/index.js'],
          env: {
            SVERSE_API_KEY: 'sk_test_123',
            SVERSE_API_URL: 'https://api.sverse.gg',
            SVERSE_PROJECT_DIR: '<absolute-path-to-game>',
            SVERSE_CONSOLE_URL: 'https://console.sverse.gg',
          },
        },
      },
    })
  })
})

describe('deliveryChip and shortId', () => {
  it('maps HTTP status and delivery status to expected chips', () => {
    expect(deliveryChip({ lastStatus: 200, status: 'delivered' })).toBe('chip chip--live')
    expect(deliveryChip({ lastStatus: null, status: 'delivered' })).toBe('chip chip--live')
    expect(deliveryChip({ lastStatus: 503, status: 'retrying' })).toBe('chip chip--warn')
    expect(deliveryChip({ lastStatus: 500, status: 'failed' })).toBe('chip chip--bad')
  })

  it('truncates long IDs and handles empty values', () => {
    expect(shortId(null)).toBe('—')
    expect(shortId('evt_123')).toBe('evt_123')
    expect(shortId('evt_1234567890abcdef')).toBe('evt_12345678…')
  })
})

describe('relativeTime and fieldErrorFrom', () => {
  const fmt = (v: string) => `DATE:${v}`

  it('formats relative durations and falls back to formatDate beyond 30 days', () => {
    const now = Date.UTC(2026, 5, 1, 12, 0, 0)
    expect(relativeTime(null, fmt, now)).toBe('recently')
    expect(relativeTime('not-a-date', fmt, now)).toBe('recently')
    expect(relativeTime(new Date(now - 10_000).toISOString(), fmt, now)).toBe('just now')
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString(), fmt, now)).toBe('5 min ago')
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString(), fmt, now)).toBe('3h ago')
    expect(relativeTime(new Date(now - 4 * 86_400_000).toISOString(), fmt, now)).toBe('4d ago')
    expect(relativeTime('2026-01-01T00:00:00Z', fmt, now)).toBe('DATE:2026-01-01T00:00:00Z')
  })

  it('finds matching field issue', () => {
    const issues = [{ field: 'url', issue: 'Must be HTTPS' }]
    expect(fieldErrorFrom(issues, 'url')).toBe('Must be HTTPS')
    expect(fieldErrorFrom(issues, 'missing')).toBe('')
  })
})
