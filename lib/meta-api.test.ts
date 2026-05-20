import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMetaTokenInfo } from './meta-api'

const ORIGINAL_FETCH = global.fetch

function mockFetchSequence(handlers: Array<() => Response | Promise<Response>>) {
  let i = 0
  global.fetch = vi.fn(async () => {
    const h = handlers[i++]
    if (!h) throw new Error(`Unexpected extra fetch call #${i}`)
    return h()
  }) as typeof fetch
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

beforeEach(() => {
  process.env.META_API_VERSION = process.env.META_API_VERSION ?? 'v22.0'
})

afterEach(() => {
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('fetchMetaTokenInfo', () => {
  it('returns userName, adAccounts and businessId on success', async () => {
    mockFetchSequence([
      () => jsonResponse({ id: '123', name: 'Maria' }),
      () => jsonResponse({
        data: [
          { id: 'act_111', name: 'Conta A', account_status: 1, currency: 'BRL' },
          { id: 'act_222', name: 'Conta B', account_status: 1, currency: 'USD', business: { id: 'biz_1', name: 'Agência X' } },
        ],
      }),
      () => jsonResponse({ data: [{ id: 'biz_1', name: 'Agência X' }] }),
    ])

    const info = await fetchMetaTokenInfo('VALID_TOKEN')

    expect(info.userName).toBe('Maria')
    expect(info.adAccounts.map((a) => a.id)).toEqual(['act_111', 'act_222'])
    expect(info.adAccounts[0]).toMatchObject({ id: 'act_111', name: 'Conta A', accountStatus: 1, currency: 'BRL' })
    expect(info.adAccounts[1].businessName).toBe('Agência X')
    expect(info.businessId).toBe('biz_1')
    expect(info.businessName).toBe('Agência X')
  })

  it('throws when /me returns non-2xx (invalid token)', async () => {
    mockFetchSequence([
      () => new Response('forbidden', { status: 401 }),
    ])

    await expect(fetchMetaTokenInfo('BAD_TOKEN')).rejects.toThrow(/401/)
  })

  it('throws when /me returns error payload', async () => {
    mockFetchSequence([
      () => jsonResponse({ error: { message: 'Invalid OAuth access token' } }),
    ])

    await expect(fetchMetaTokenInfo('EXPIRED_TOKEN')).rejects.toThrow(/Invalid OAuth/)
  })

  it('returns empty adAccounts when user has no ad accounts', async () => {
    mockFetchSequence([
      () => jsonResponse({ id: '1', name: 'Solo' }),
      () => jsonResponse({ data: [] }),
      () => jsonResponse({ data: [] }),
    ])

    const info = await fetchMetaTokenInfo('TOKEN')
    expect(info.adAccounts).toEqual([])
    expect(info.businessId).toBeNull()
    expect(info.businessName).toBeNull()
  })

  it('follows pagination cursor for ad accounts', async () => {
    mockFetchSequence([
      () => jsonResponse({ id: '1', name: 'X' }),
      () =>
        jsonResponse({
          data: [{ id: 'act_a', name: 'A' }, { id: 'act_b', name: 'B' }],
          paging: { next: 'https://graph.facebook.com/page2' },
        }),
      () => jsonResponse({ data: [] }),
      () => jsonResponse({ data: [{ id: 'act_c', name: 'C' }] }),
    ])

    const info = await fetchMetaTokenInfo('TOKEN')
    expect(info.adAccounts.map((a) => a.id)).toEqual(['act_a', 'act_b', 'act_c'])
  })
})
