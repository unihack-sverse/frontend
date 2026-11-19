import { messageOf } from '~/utils/studioGame'

export type Mode = 'ai' | 'manual'
export type StepNumber = 1 | 2 | 3 | 4

export interface StepIssue {
  field: string
  issue: string
}

export interface GameRow {
  id: string
  title: string
  status: string
  genre?: string
  tokenizationLevel?: string
  blockedReason?: string
  buildUrl?: string
  slug?: string
}

export interface PublishStepCheck {
  name: string
  status: string
  evidence?: { reason?: string; note?: string }
}

export interface PublishStepRecord {
  step: string
  status: string
  error?: { message?: string }
  output?: {
    outcome?: string
    checks?: PublishStepCheck[]
    created?: number
    settled?: boolean
    refunded?: boolean
  }
}

export interface PublishJobRecord {
  id: string
  mode: Mode
  status: string
  gameId?: string
  game?: GameRow
  steps?: PublishStepRecord[]
  draftCatalog?: Array<Record<string, unknown>>
  catalogApproved?: boolean
  elapsedMs?: number | null
  createdAt?: string
}

export interface DraftRow {
  uid: string
  name: string
  price: string
  emoji: string
  artUrl: string
  artBroken?: boolean
  schemaId: string
  interopTier: string
  slot: string
  kind: string
  raw: Record<string, unknown>
  dirty?: boolean
  pristine?: boolean
}

export type RowIssueField = 'name' | 'price' | 'art'
export interface RowIssue {
  name?: string
  price?: string
  art?: string
}
export type RowIssues = Record<string, RowIssue>

export interface StudioPublishSummary {
  handle: string
  feeBps?: number
  vault?: { availableUnits?: string }
  bond?: { balanceUnits?: string }
}

export interface LiveItemSummary {
  id: string
  name: string
  sku: string
  kind: string
  interopTier: string
  priceUnits: string
  status: string
}

export const STEP_LABELS = ['Studio & game', 'Integration', 'Catalog', 'Live']

export const PUBLISH_GENRES = [
  { value: 'action_rpg', label: 'Action RPG' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'platformer', label: 'Platformer' },
]

export const ITEM_KINDS = [
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'pass', label: 'Pass' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'content', label: 'Content' },
]

export const KIND_HINTS: Record<string, string> = {
  cosmetic: 'a look you can wear',
  bundle: 'several things sold together as one purchase',
  pass: 'a season of rewards, kept in this game only',
  consumable: 'used up on use — kept in this game only',
  content: 'an extra pack of levels or chapters',
}

export const PUBLISH_LEVELS = [
  { value: 'L0', title: 'Payments only', desc: 'No NFTs, zero wallet friction for your players' },
  { value: 'L2', title: 'Tokenized items', desc: "ERC-1155 minted to the player's passport" },
  { value: 'L3', title: 'Living Items', desc: 'Mutable traits + deed ledger' },
  { value: 'L4', title: 'Tokenized economy', desc: 'Needs an economy review before publishing' },
]

export const STEP_TITLES: Record<string, string> = {
  scan_project: 'Scan the project',
  propose_items: 'Propose items',
  map_to_schema: 'Match shared schemas',
  create_item_pack: 'Create the items',
  install_sdk: 'Install the SDK',
  test_purchase: 'Test a purchase',
  publish: 'Submit for review',
}

export function kindHint(kind: string): string {
  return KIND_HINTS[kind] ?? ''
}

export function buildUrlIsValid(value: string): boolean {
  const url = String(value ?? '').trim()
  return !url || /^https?:\/\/\S+$/i.test(url)
}

export function coverUrlIsValid(value: string): boolean {
  const url = String(value ?? '').trim()
  if (!url) return false
  return /^https?:\/\/\S+$/i.test(url) || url.startsWith('/')
}

export function formatElapsed(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000))
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
}

export function stepTitle(step: string): string {
  return STEP_TITLES[step] ?? step
}

export function stepStatusLabel(entry: PublishStepRecord, catalogApproved?: boolean): string {
  switch (entry.status) {
    case 'done': return 'done'
    case 'failed': return entry.error?.message || 'failed'
    case 'running': return 'running'
    case 'skipped': return 'skipped'
    case 'pending':
      return entry.step === 'create_item_pack' && !catalogApproved ? 'waiting for your approval' : 'pending'
    default: return entry.status
  }
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function progressLabel(entry: Pick<PublishJobRecord, 'steps'>): string {
  const steps = entry.steps ?? []
  if (!steps.length) return '—'
  const done = steps.filter((step) => step.status === 'done' || step.status === 'skipped').length
  const failed = steps.find((step) => step.status === 'failed')
  if (failed) return `${done} of ${steps.length} · ${stepTitle(failed.step)} failed`
  return `${done} of ${steps.length} steps`
}

export function publishIssuesOf(raw: unknown): StepIssue[] {
  const err = raw as { data?: { error?: { details?: unknown }; details?: unknown } } | null
  const details = err?.data?.error?.details ?? err?.data?.details
  return Array.isArray(details) ? details.filter((d): d is StepIssue => Boolean(d && typeof d.field === 'string')) : []
}

export function publishCodeOf(raw: unknown): string {
  const err = raw as { data?: { error?: { code?: string } } } | null
  return err?.data?.error?.code ?? ''
}

export function errorTitleFor(code: string): string {
  switch (code) {
    case 'step_out_of_order': return 'Step out of order.'
    case 'catalog_not_approved': return 'Catalog not approved.'
    case 'not_your_job': return 'That run belongs to another studio.'
    case 'human_approval_required': return 'Human approval required.'
    case 'invalid_step_input': return 'Invalid step input.'
    case 'insufficient_funds': return 'Insufficient funds.'
    case 'game_not_submittable': return 'This game cannot be submitted.'
    default: return 'That action could not be completed.'
  }
}

export function publishErrorMessage(raw: unknown): string {
  switch (publishCodeOf(raw)) {
    case 'build_required':
      return 'Add a build URL on the game page before publishing — review scans it.'
    case 'catalog_required':
      return 'The game needs at least one item before it can be submitted.'
    case 'email_unverified':
      return 'Verify your email address before submitting a game.'
    case 'bond_required':
      return 'Stake the listing bond in Payouts before this game can go live.'
    default:
      return messageOf(raw, 'Could not publish this run.')
  }
}

export function priceToSrv(units: string | number | null | undefined): string {
  const number = Number(units ?? 0) / 1_000_000
  if (!Number.isFinite(number)) return ''
  return number.toString()
}

export function publishSrvToUnits(value: string): string {
  const trimmed = String(value ?? '').trim().replace(/,/g, '')
  if (!/^\d*(\.\d*)?$/.test(trimmed) || !trimmed) return '0'
  const [whole = '0', frac = ''] = trimmed.split('.')
  const fracPadded = (frac + '000000').slice(0, 6)
  return (BigInt(whole || '0') * 1_000_000n + BigInt(fracPadded || '0')).toString()
}

export function barrierValidKind(kind: string): boolean {
  return ITEM_KINDS.some((entry) => entry.value === kind)
}

export function validateDraftRows(rows: DraftRow[]): { ok: boolean; issues: RowIssues; summary: string } {
  const issues: RowIssues = {}
  rows.forEach((row, index) => {
    const entry: RowIssue = {}
    const name = String(row.name ?? '').trim()
    if (!name) entry.name = `Item ${index + 1} needs a name.`
    else if (name.length > 80) entry.name = 'Name is too long — 80 characters maximum.'
    if (!barrierValidKind(row.kind)) entry.name = entry.name || 'Pick an item type.'

    const rawPrice = String(row.price ?? '').trim()
    const priceUnits = publishSrvToUnits(rawPrice)
    if (!rawPrice) entry.price = 'Add a price.'
    else if (!/^\d*(\.\d{0,6})?$/.test(rawPrice.replace(/,/g, ''))) entry.price = 'Use digits only, up to 6 decimals.'
    else if (priceUnits === '0') entry.price = 'Price must be greater than zero.'

    const art = String(row.artUrl ?? '').trim()
    if (art && art.length > 500) entry.art = 'Image URL is too long.'
    else if (art && !/^https?:\/\/\S+$/i.test(art) && !art.startsWith('/')) {
      entry.art = 'Use an http(s) URL or a /path.'
    }

    if (entry.name || entry.price || entry.art) issues[row.uid] = entry
  })

  const count = Object.keys(issues).length
  const summary = count
    ? `${count} item${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention before the catalog can be approved.`
    : ''
  return { ok: count === 0, issues, summary }
}

export function buildAgentPrompt(jobNow: PublishJobRecord | null): string {
  const id = jobNow?.id ?? '<job id>'
  const game = jobNow?.game?.title ?? 'my game'
  const done = (step: string) => jobNow?.steps?.some((entry) => entry.step === step && entry.status === 'done')

  if (!jobNow?.catalogApproved) {
    const record = jobNow ? '' : null
    return [
      `Publish "${game}" on Sverse with the sverse MCP tools.`,
      '',
      record === null
        ? `A publish run will be created when you scan — use gameId "<the game id from sverse_whoami>".`
        : `The publish run is already created: job id ${id}.`,
      '',
      'Call the tools in this order and stop where told:',
      '1. sverse_whoami — confirm the studio and that the key can publish.',
      ...(done('scan_project') ? [] : ['2. sverse_scan_project with gameId "<the game id from sverse_whoami>".']),
      ...(done('propose_items') ? [] : [`3. sverse_propose_items for job ${id}.`]),
      ...(done('map_to_schema') ? [] : [`4. sverse_run_step ${id} step="map_to_schema".`]),
      `5. sverse_get_job ${id}. It will say "approve-in-console".`,
      '',
      'STOP THERE. Do not call create_item_pack, and do not try to approve the catalogue — the API',
      'refuses that for API keys. Tell me the console link and wait for me to approve it.',
    ].join('\n')
  }

  const remaining: string[] = []
  if (!done('create_item_pack')) remaining.push(`sverse_run_step ${id} step="create_item_pack"`)
  if (!done('install_sdk')) {
    remaining.push('sverse_preview_sdk (show me the diff; do not write files)')
    remaining.push(`sverse_run_step ${id} step="install_sdk"`)
  }
  if (!done('test_purchase')) remaining.push(`sverse_run_step ${id} step="test_purchase"`)
  if (!done('publish')) remaining.push(`sverse_publish ${id}`)

  if (!remaining.length) {
    return [
      `The publish run ${id} for "${game}" has finished — every step is done.`,
      `Call sverse_get_job ${id} and report the final job and game status. Do not re-run any step:`,
      're-running clears the later steps and the catalogue approval.',
    ].join('\n')
  }

  return [
    `Continue the Sverse publish run ${id} for "${game}".`,
    'The catalogue is already approved by me — do not ask again and do not try to approve it.',
    '',
    'Do these, in order:',
    ...remaining.map((line, index) => `${index + 1}. ${line}`),
    '',
    'Then call sverse_get_job and report the final job and game status.',
    'If sverse_publish refuses, print the exact error code and stop — do not retry.',
  ].join('\n')
}

export function stepForJob(loaded: Pick<PublishJobRecord, 'status' | 'steps'> | null): StepNumber {
  if (loaded?.status === 'done') return 4
  const done = (name: string) => loaded?.steps?.find((s) => s.step === name)?.status === 'done'
  if (done('scan_project') || done('propose_items') || done('map_to_schema')) return 3
  return 2
}
