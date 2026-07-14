import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createOrRestore: vi.fn(),
  setCookie: vi.fn(),
  query: {} as Record<string, unknown>,
  pathname: '/i/carl/welcome',
}))

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getCookie: vi.fn(() => undefined),
  getHeader: vi.fn(() => 'test-agent'),
  getQuery: vi.fn(() => mocks.query),
  getRequestIP: vi.fn(() => '1.2.3.4'),
  getRequestURL: vi.fn(() => new URL(`https://desperse.com${mocks.pathname}`)),
  setCookie: mocks.setCookie,
}))

vi.mock('@/server/utils/referrals', () => ({
  createOrRestoreReferralAttributionSession: mocks.createOrRestore,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS: 2_592_000,
  REFERRAL_ATTRIBUTION_COOKIE_NAME: 'desperse_referral_attribution',
}))

import handler from './referral-welcome-attribution'

describe('direct invite welcome attribution middleware', () => {
  beforeEach(() => {
    mocks.query = {}
    mocks.pathname = '/i/carl/welcome'
    mocks.createOrRestore.mockReset()
    mocks.setCookie.mockReset()
  })

  it('establishes attribution for a direct valid welcome URL', async () => {
    mocks.createOrRestore.mockResolvedValue({
      success: true,
      cookieValue: 'signed-session',
      restored: false,
      referrer: { id: 'referrer-1', slug: 'carl' },
    })

    await handler({} as never)

    expect(mocks.createOrRestore).toHaveBeenCalledWith({
      inviteCode: 'carl',
      source: 'link',
      existingCookieValue: undefined,
      signupIp: '1.2.3.4',
      signupUserAgent: 'test-agent',
    })
    expect(mocks.setCookie).toHaveBeenCalledWith(
      expect.anything(),
      'desperse_referral_attribution',
      'signed-session',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    )
  })

  it('never creates attribution for an invalid welcome URL', async () => {
    mocks.query = { invalid: '1' }

    await handler({} as never)

    expect(mocks.createOrRestore).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it('does not set a cookie when the code cannot be resolved', async () => {
    mocks.createOrRestore.mockResolvedValue({ success: false, error: 'Invite code not found' })

    await handler({} as never)

    expect(mocks.setCookie).not.toHaveBeenCalled()
  })
})
