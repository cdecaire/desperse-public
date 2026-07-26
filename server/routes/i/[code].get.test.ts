import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createOrRestore: vi.fn(),
  query: {} as Record<string, unknown>,
  redirects: [] as Array<{ path: string; status: number }>,
  setCookie: vi.fn(),
}))

vi.mock('h3', () => ({
  createError: vi.fn((input: unknown) => input),
  defineEventHandler: (handler: unknown) => handler,
  getCookie: vi.fn(() => undefined),
  getHeader: vi.fn(() => 'test-agent'),
  getQuery: vi.fn(() => mocks.query),
  getRequestIP: vi.fn(() => '1.2.3.4'),
  getRouterParam: vi.fn(() => 'Carl'),
  sendRedirect: vi.fn((_event: unknown, path: string, status: number) => {
    mocks.redirects.push({ path, status })
    return { path, status }
  }),
  setCookie: mocks.setCookie,
}))

vi.mock('@/server/utils/referrals', () => ({
  createOrRestoreReferralAttributionSession: mocks.createOrRestore,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS: 2_592_000,
  REFERRAL_ATTRIBUTION_COOKIE_NAME: 'desperse_referral_attribution',
}))

import handler from './[code].get'

describe('/i/:code invite attribution route', () => {
  beforeEach(() => {
    mocks.query = {}
    mocks.redirects.length = 0
    mocks.createOrRestore.mockReset()
    mocks.setCookie.mockReset()
  })

  it('preserves the normal invite flow and redirects to welcome after setting attribution', async () => {
    mocks.createOrRestore.mockResolvedValue({
      success: true,
      cookieValue: 'signed-session',
      restored: false,
      referrer: { id: 'referrer-1', slug: 'carl' },
    })

    await handler({} as never)

    expect(mocks.setCookie).toHaveBeenCalledOnce()
    expect(mocks.redirects).toEqual([{ path: '/i/Carl/welcome?ref=carl', status: 302 }])
  })

  it('preserves a safe post deep link after setting attribution', async () => {
    mocks.query = { next: '/post/post_123' }
    mocks.createOrRestore.mockResolvedValue({
      success: true,
      cookieValue: 'signed-session',
      restored: false,
      referrer: { id: 'referrer-1', slug: 'carl' },
    })

    await handler({} as never)

    expect(mocks.redirects).toEqual([{ path: '/post/post_123', status: 302 }])
  })

  it('rejects unsafe next values and keeps invalid codes attribution-free', async () => {
    mocks.query = { next: '//evil.example/post/123' }
    mocks.createOrRestore.mockResolvedValue({ success: false, error: 'Invite code not found' })

    await handler({} as never)

    expect(mocks.setCookie).not.toHaveBeenCalled()
    expect(mocks.redirects).toEqual([{ path: '/i/Carl/welcome?invalid=1', status: 302 }])
  })
})
