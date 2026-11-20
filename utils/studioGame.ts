const SRV_UNITS = 1_000_000n

export interface MappingRule {
  passthrough?: boolean
  from?: string
  curve?: string
  outRange?: number[]
  inRange?: number[]
}

export type ClampPolicy = 'reject' | 'clamp'

export const ACCEPT_CLAMP_POLICY_OPTIONS: Array<{ value: ClampPolicy; label: string }> = [
  { value: 'clamp', label: 'Clamp to tier max' },
  { value: 'reject', label: 'Skip the item' },
]

export interface EnvelopeAcceptEntry {
  schemaId: string
  tierMax: string
  powerTierRange?: number[]
  mapping?: Record<string, MappingRule>
  clampPolicy?: ClampPolicy | string
}

export interface FieldIssue {
  field: string
  issue: string
}

export function issuesOf(raw: unknown): FieldIssue[] {
  const err = raw as { data?: { error?: { details?: unknown }; details?: unknown }; details?: unknown } | null
  const details = err?.data?.error?.details ?? err?.data?.details ?? err?.details
  return Array.isArray(details) ? (details as FieldIssue[]) : []
}

export function messageOf(raw: unknown, fallback: string): string {
  const err = raw as { data?: { error?: { message?: string }; message?: string }; message?: string } | null
  return err?.data?.error?.message ?? err?.data?.message ?? err?.message ?? fallback
}

export interface CsvRow {
  sku: string
  name: string
  kind: string
  priceSrv: string
  priceUnits: string
  royaltyBps: string
  interopTier: string
  schemaId: string
  supplyMax: string
}

export function parseStudioSrvUnits(value: string | number): string | null {
  const trimmed = String(value ?? '').trim().replace(/,/g, '')
  if (!trimmed) return null
  if (!/^\d*(\.\d*)?$/.test(trimmed)) return null
  const [whole = '', frac = ''] = trimmed.split('.')
  if (!whole && !frac) return null
  const fracPadded = (frac + '000000').slice(0, 6)
  return (BigInt(whole || '0') * SRV_UNITS + BigInt(fracPadded || '0')).toString()
}

export function unitsToSrvInput(units: string | number | null | undefined): string {
  const value = Number(units ?? 0) / 1_000_000
  return value ? String(value) : ''
}

export function powerRangeLabel(entry: Pick<EnvelopeAcceptEntry, 'powerTierRange'> | null | undefined): string {
  const range = entry?.powerTierRange
  if (!range || range.length < 2) return 'n/a'
  return `${range[0]} – ${range[1]}`
}

export function mappingSummary(entry: Pick<EnvelopeAcceptEntry, 'mapping'>): string[] {
  const mapping = entry.mapping ?? {}
  const keys = Object.keys(mapping)
  if (!keys.length) return ['visual passthrough']
  return keys.map((key) => {
    const rule = mapping[key]
    if (rule?.passthrough) return `${key} passthrough`
    if (rule?.from && rule?.curve) {
      const outRange = rule.outRange
      const out = outRange && outRange.length >= 2 ? ` → ${outRange[0]}–${outRange[1]}` : ''
      return `${key} ← ${rule.from} · ${rule.curve}${out}`
    }
    if (rule?.from) return `${key} ← ${rule.from}`
    return `${key} passthrough`
  })
}

export function parseCsvRows(csvText: string): CsvRow[] {
  const text = csvText.trim()
  if (!text) return []
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = (lines[0] ?? '').toLowerCase()
  const hasHeader = header.includes('sku') && header.includes('name')
  const source = hasHeader ? lines.slice(1) : lines
  return source.map((line): CsvRow => {
    const cells = line.split(',').map((cell) => cell.trim())
    const priceSrv = cells[4] ?? ''
    return {
      sku: cells[0] ?? '',
      name: cells[1] ?? '',
      kind: cells[3] || 'cosmetic',
      priceSrv,
      priceUnits: parseStudioSrvUnits(priceSrv) ?? '0',
      royaltyBps: cells[5] ?? '0',
      interopTier: cells[6] ?? 'T0',
      schemaId: cells[7] ?? '',
      supplyMax: cells[8] ?? '',
    }
  })
}
