import { describe, expect, it } from 'vitest'
import {
  buildAgentPrompt,
  buildUrlIsValid,
  coverUrlIsValid,
  errorTitleFor,
  formatElapsed,
  priceToSrv,
  progressLabel,
  publishErrorMessage,
  publishSrvToUnits,
  stepForJob,
  stepStatusLabel,
  validateDraftRows,
  type DraftRow,
} from '~/utils/studioPublish'

describe('URL validation helpers', () => {
  it('validates buildUrlIsValid allowing empty or http(s) URLs', () => {
    expect(buildUrlIsValid('')).toBe(true)
    expect(buildUrlIsValid('https://cdn.sverse.gg/build.zip')).toBe(true)
    expect(buildUrlIsValid('http://localhost:3000/build.zip')).toBe(true)
    expect(buildUrlIsValid('/relative/path')).toBe(false)
    expect(buildUrlIsValid('ftp://example.com/build.zip')).toBe(false)
  })

  it('validates coverUrlIsValid requiring http(s) URL or root-relative path', () => {
    expect(coverUrlIsValid('')).toBe(false)
    expect(coverUrlIsValid('https://cdn.sverse.gg/cover.png')).toBe(true)
    expect(coverUrlIsValid('/assets/cover.png')).toBe(true)
    expect(coverUrlIsValid('cover.png')).toBe(false)
  })
})

describe('price conversion and draft row validation', () => {
  it('converts between SRV strings and integer units', () => {
    expect(publishSrvToUnits('')).toBe('0')
    expect(publishSrvToUnits('abc')).toBe('0')
    expect(publishSrvToUnits('4.25')).toBe('4250000')
    expect(priceToSrv('4250000')).toBe('4.25')
    expect(priceToSrv(null)).toBe('0')
  })

  it('flags invalid draft rows and accepts valid ones', () => {
    const validRow: DraftRow = {
      uid: 'row_1',
      name: 'Starter Pack',
      price: '9.99',
      emoji: '',
      artUrl: 'https://cdn.sverse.gg/pack.png',
      schemaId: '',
      interopTier: 'T0',
      slot: '',
      kind: 'bundle',
      raw: {},
    }
    expect(validateDraftRows([validRow])).toEqual({ ok: true, issues: {}, summary: '' })

    const invalidRow: DraftRow = {
      ...validRow,
      uid: 'row_2',
      name: '   ',
      price: '0',
      artUrl: 'not-a-url',
    }
    const result = validateDraftRows([invalidRow])
    expect(result.ok).toBe(false)
    expect(result.issues.row_2).toEqual({
      name: 'Item 1 needs a name.',
      price: 'Price must be greater than zero.',
      art: 'Use an http(s) URL or a /path.',
    })
    expect(result.summary).toContain('1 item needs attention')
  })
})

describe('step and progress helpers', () => {
  it('computes stepForJob, stepStatusLabel, progressLabel, and formatElapsed', () => {
    expect(formatElapsed(null)).toBe('—')
    expect(formatElapsed(125_000)).toBe('2m 5s')

    expect(stepForJob({ status: 'done', steps: [] })).toBe(4)
    expect(stepForJob({ status: 'running', steps: [{ step: 'scan_project', status: 'done' }] })).toBe(3)
    expect(stepForJob({ status: 'running', steps: [{ step: 'scan_project', status: 'pending' }] })).toBe(2)

    expect(stepStatusLabel({ step: 'create_item_pack', status: 'pending' }, false)).toBe('waiting for your approval')
    expect(stepStatusLabel({ step: 'create_item_pack', status: 'pending' }, true)).toBe('pending')

    expect(
      progressLabel({
        steps: [
          { step: 'scan_project', status: 'done' },
          { step: 'propose_items', status: 'failed' },
        ],
      }),
    ).toBe('1 of 2 · Propose items failed')
  })

  it('builds agent prompts before and after catalog approval', () => {
    const preApproval = buildAgentPrompt({
      id: 'job_1',
      mode: 'ai',
      status: 'running',
      catalogApproved: false,
      game: { id: 'g1', title: 'Emberloop', status: 'draft' },
      steps: [{ step: 'scan_project', status: 'done' }],
    })
    expect(preApproval).toContain('sverse_propose_items for job job_1')
    expect(preApproval).not.toContain('sverse_scan_project')

    const postApproval = buildAgentPrompt({
      id: 'job_1',
      mode: 'ai',
      status: 'running',
      catalogApproved: true,
      game: { id: 'g1', title: 'Emberloop', status: 'draft' },
      steps: [{ step: 'create_item_pack', status: 'done' }],
    })
    expect(postApproval).toContain('sverse_preview_sdk')
    expect(postApproval).toContain('sverse_publish job_1')
  })

  it('maps publish error codes to creator-facing titles and messages', () => {
    expect(errorTitleFor('catalog_not_approved')).toBe('Catalog not approved.')
    expect(publishErrorMessage({ data: { error: { code: 'bond_required' } } })).toContain('listing bond')
  })
})
