import { withBase } from 'ufo'
import { describe, expect, it } from 'vitest'
import { ApiError, normalizeApiBase, normalizeAssetUrl, normalizeAssetUrls, toApiError } from '~/composables/useApi'

describe('normalizeApiBase', () => {
  it('trims whitespace, strips trailing slashes, and removes redundant trailing /api', () => {
    expect(normalizeApiBase('https://unihacks.nhieuchuyen.online/api')).toBe('https://unihacks.nhieuchuyen.online')
    expect(normalizeApiBase('https://unihacks.nhieuchuyen.online/api/')).toBe('https://unihacks.nhieuchuyen.online')
    expect(normalizeApiBase('  https://unihacks.nhieuchuyen.online/API/  ')).toBe('https://unihacks.nhieuchuyen.online')
    expect(normalizeApiBase('https://api.nhieuchuyen.online/')).toBe('https://api.nhieuchuyen.online')
    expect(normalizeApiBase('http://127.0.0.1:4000')).toBe('http://127.0.0.1:4000')
  })

  it('prevents duplicate /api/api/v1 paths when combined with ufo withBase', () => {
    expect(withBase('/api/v1/auth/me', normalizeApiBase('https://unihacks.nhieuchuyen.online/api'))).toBe(
      'https://unihacks.nhieuchuyen.online/api/v1/auth/me',
    )
    expect(withBase('/admin/v1/games', normalizeApiBase('https://unihacks.nhieuchuyen.online/api/'))).toBe(
      'https://unihacks.nhieuchuyen.online/admin/v1/games',
    )
  })
})

describe('normalizeAssetUrl', () => {
  const assetBase = 'https://cdn.sverse.example'

  it('rewrites local /assets/ URLs to assetBase preserving path, query, and hash', () => {
    expect(normalizeAssetUrl('http://127.0.0.1:4000/assets/items/sword.png?v=2#top', assetBase)).toBe(
      'https://cdn.sverse.example/assets/items/sword.png?v=2#top',
    )
    expect(normalizeAssetUrl('http://localhost:3000/assets/cover.webp', assetBase)).toBe(
      'https://cdn.sverse.example/assets/cover.webp',
    )
  })

  it('leaves non-local, non-asset, and relative strings untouched', () => {
    expect(normalizeAssetUrl('https://evil.example/assets/sword.png', assetBase)).toBe(
      'https://evil.example/assets/sword.png',
    )
    expect(normalizeAssetUrl('http://localhost:4000/api/v1/games', assetBase)).toBe(
      'http://localhost:4000/api/v1/games',
    )
    expect(normalizeAssetUrl('/assets/local.png', assetBase)).toBe('/assets/local.png')
    expect(normalizeAssetUrl('hello world', assetBase)).toBe('hello world')
  })
})

describe('normalizeAssetUrls', () => {
  it('recursively normalizes asset URLs in nested objects and arrays', () => {
    const input = {
      title: 'Test Game',
      coverArt: { url: 'http://127.0.0.1:4000/assets/cover.png' },
      items: [
        { name: 'Hat', art: { url: 'http://localhost:4000/assets/hat.png' } },
        { name: 'Remote', art: { url: 'https://images.example/hat.png' } },
      ],
      count: 2,
    }
    expect(normalizeAssetUrls(input, 'https://api.sverse.gg')).toEqual({
      title: 'Test Game',
      coverArt: { url: 'https://api.sverse.gg/assets/cover.png' },
      items: [
        { name: 'Hat', art: { url: 'https://api.sverse.gg/assets/hat.png' } },
        { name: 'Remote', art: { url: 'https://images.example/hat.png' } },
      ],
      count: 2,
    })
  })

  it('normalizes assetBase with trailing slash or /api without duplicating /api', () => {
    const input = { coverArt: { url: 'http://127.0.0.1:4000/assets/cover.png' } }
    expect(normalizeAssetUrls(input, 'https://unihacks.nhieuchuyen.online/api/')).toEqual({
      coverArt: { url: 'https://unihacks.nhieuchuyen.online/assets/cover.png' },
    })
  })
})

describe('toApiError', () => {
  it('extracts structured API error payload and retry-after header', () => {
    const headers = new Headers({ 'retry-after': '15' })
    const err = toApiError({
      status: 429,
      data: {
        error: {
          code: 'rate_limited',
          message: 'Too many requests',
          details: [{ field: 'sku', issue: 'duplicate' }],
          requestId: 'req_123',
        },
      },
      response: { headers },
    })

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(429)
    expect(err.code).toBe('rate_limited')
    expect(err.message).toBe('Too many requests')
    expect(err.details).toEqual([{ field: 'sku', issue: 'duplicate' }])
    expect(err.requestId).toBe('req_123')
    expect(err.retryAfter).toBe(15)
  })

  it('maps status 0 to network_error and 5xx without body to internal_error', () => {
    expect(toApiError({}).code).toBe('network_error')
    expect(toApiError({ statusCode: 502, message: 'Bad Gateway' })).toMatchObject({
      status: 502,
      code: 'internal_error',
      message: 'Bad Gateway',
    })
    expect(toApiError({ status: 400 })).toMatchObject({
      status: 400,
      code: 'unknown_error',
    })
  })
})
