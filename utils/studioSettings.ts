import type { FieldIssue } from '~/utils/studioGame'

export type SettingsTab = 'profile' | 'keys' | 'hooks' | 'attest'
export type ApiKeyScope = 'game' | 'publish' | 'read'

export interface FeeTierSummary {
  tier: string
  feeBps: number
  minStakeUnits: string | number
}

export interface StudioSettingsSummary {
  id: string
  handle: string
  displayName?: string
  bio?: string
  avatarUrl?: string | null
  oneHumanStudio?: boolean
  genesis?: boolean
  feeBps?: number
  feeTier?: string
  feeTiers?: FeeTierSummary[]
  strikes?: number
  bond?: { balanceUnits?: string; balanceSrv?: string }
  links?: { site?: string; x?: string; discord?: string }
}

export interface ApiKeyRecord {
  id: string
  label?: string
  prefix: string
  scopes: string[]
  gameId?: string | null
  gameSlug?: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  requestCount?: number
}

export interface WebhookEndpointRecord {
  id: string
  url: string
  status: string
  events: string[]
  failureStreak: number
  signingSecretPrefix: string
}

export interface WebhookDeliveryRecord {
  id: string
  endpointId: string
  event: string
  eventId?: string | null
  attempts: number
  status: string
  lastStatus?: number | null
  deliveredAt?: string | null
  createdAt?: string | null
}

export interface SettingsGameRef {
  id: string
  slug?: string
  title: string
}

export function fieldErrorFrom(issues: FieldIssue[], field: string): string {
  return issues.find((issue) => issue.field === field)?.issue ?? ''
}

export function computeTierCta(feeTiers: FeeTierSummary[] | undefined, currentTier: string | undefined): string {
  const tiers = [...(feeTiers ?? [])].sort((a, b) => Number(a.minStakeUnits) - Number(b.minStakeUnits))
  const currentIndex = tiers.findIndex((tier) => tier.tier === currentTier)
  const next = tiers[currentIndex + 1]
  if (!next) return 'View payout settings'
  return `Stake to reach ${Number(next.feeBps) / 100}%`
}

export function buildMcpConfigJson(secret: string, apiOrigin: string, consoleOrigin: string): string {
  const payload = {
    mcpServers: {
      sverse: {
        command: 'node',
        args: ['<absolute-path-to-sverse>/mcp/dist/index.js'],
        env: {
          SVERSE_API_KEY: secret,
          SVERSE_API_URL: apiOrigin,
          SVERSE_PROJECT_DIR: '<absolute-path-to-game>',
          SVERSE_CONSOLE_URL: consoleOrigin,
        },
      },
    },
  }
  return JSON.stringify(payload, null, 2)
}

export function deliveryChip(delivery: Pick<WebhookDeliveryRecord, 'lastStatus' | 'status'> | null | undefined): string {
  const status = Number(delivery?.lastStatus)
  if (status >= 200 && status < 300) return 'chip chip--live'
  if (delivery?.status === 'delivered') return 'chip chip--live'
  if (delivery?.status === 'retrying') return 'chip chip--warn'
  return 'chip chip--bad'
}

export function shortId(value: string | null | undefined): string {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 12)}…` : value
}

export function relativeTime(
  value: string | null | undefined,
  formatDate: (date: string) => string,
  nowMs: number = Date.now(),
): string {
  if (!value) return 'recently'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'recently'
  const seconds = Math.max(0, Math.round((nowMs - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}
