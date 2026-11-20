/**
 * Shared presentation helpers for the studio console (spec 05 P-08…P-11).
 * Money always arrives as integer unit strings; never parse a display string back into money.
 */

import { normalizeApiBase } from '~/composables/useApi'

const SRV_UNITS = 1_000_000

const GENRES: Record<string, string> = {
  action_rpg: 'Action RPG',
  puzzle: 'Puzzle',
  strategy: 'Strategy',
  cozy: 'Cozy',
  arcade: 'Arcade',
  platformer: 'Platformer',
}

const STATUS_LABELS: Record<string, string> = {
  live: 'live',
  in_review: 'in review',
  draft: 'draft',
  rejected: 'rejected',
  delisted: 'delisted',
}

export function useStudioFormat() {
  const config = useRuntimeConfig()

  function seedAsset(path: string) {
    const base = normalizeApiBase(String(config.public.apiBase ?? 'http://127.0.0.1:4000'))
    return `${base}/assets/seed/${path}`
  }

  function unitsToNumber(units: string | number | bigint | null | undefined) {
    return Number(units ?? 0) / SRV_UNITS
  }

  function formatSrv(units: string | number | bigint | null | undefined, { digits = 2, suffix = false } = {}) {
    const value = unitsToNumber(units).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return suffix ? `${value} SRV` : value
  }

  function formatNum(value: number | string | null | undefined) {
    return Number(value ?? 0).toLocaleString()
  }

  function formatPct(value: number | string | null | undefined, { ratio = false } = {}) {
    const number = Number(value ?? 0)
    return `${Math.round(ratio ? number * 100 : number)}%`
  }

  function formatDate(value: string | Date | null | undefined, fallback = 'recently') {
    if (!value) return fallback
    return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  function capitalize(value: string) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
  }

  function genreLabel(value: string | null | undefined) {
    const key = String(value ?? '')
    return GENRES[key] ?? capitalize(key.replace(/_/g, ' '))
  }

  function statusLabel(value: string | null | undefined) {
    const key = String(value ?? '')
    return STATUS_LABELS[key] ?? key
  }

  function statusChip(value: string | null | undefined) {
    if (value === 'live') return 'chip chip--live'
    if (value === 'in_review') return 'chip chip--warn'
    if (value === 'rejected' || value === 'delisted') return 'chip chip--bad'
    return 'chip'
  }

  function tierChip(tier: string | null | undefined) {
    if (tier === 'T2' || tier === 'T3') return 'chip chip--t2'
    if (tier === 'T1') return 'chip chip--t1'
    return 'chip chip--t0'
  }

  return {
    seedAsset,
    unitsToNumber,
    formatSrv,
    formatNum,
    formatPct,
    formatDate,
    capitalize,
    genreLabel,
    statusLabel,
    statusChip,
    tierChip,
  }
}
