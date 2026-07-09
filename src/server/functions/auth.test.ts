import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = []
  const insertQueue: unknown[][] = []

  return {
    selectQueue,
    insertQueue,
    getRequest: vi.fn(),
    verifyPrivyToken: vi.fn(),
    generateUniqueSlug: vi.fn(),
    extractSignupMetadataFromHeaders: vi.fn(),
    extractAuthorizationFromPayload: vi.fn(),
    stripAuthorization: vi.fn(),
    getActiveReferralAttributionSessionFromSignedCookie: vi.fn(),
    bindReferralToUserFromAttributionSession: vi.fn(),
    ensureWalletExists: vi.fn(),
    isUniqueViolation: vi.fn(),
    eq: vi.fn(),
  }
})

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: unknown) => fn,
  }),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: mocks.getRequest,
}))

vi.mock('drizzle-orm', () => ({
  eq: mocks.eq,
}))

vi.mock('@/server/db/schema', () => ({
  users: {
    id: 'id',
    privyId: 'privy_id',
    walletAddress: 'wallet_address',
    usernameSlug: 'username_slug',
    displayName: 'display_name',
    avatarUrl: 'avatar_url',
    signupIp: 'signup_ip',
    signupCountry: 'signup_country',
    signupUserAgent: 'signup_user_agent',
    signupMethod: 'signup_method',
    updatedAt: 'updated_at',
  },
}))

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn(() => {
      const builder: any = {}
      builder.from = vi.fn(() => builder)
      builder.where = vi.fn(() => builder)
      builder.limit = vi.fn(() => Promise.resolve(mocks.selectQueue.shift() ?? []))
      return builder
    }),
    insert: vi.fn(() => {
      const builder: any = {}
      builder.values = vi.fn(() => builder)
      builder.returning = vi.fn(() => Promise.resolve(mocks.insertQueue.shift() ?? []))
      return builder
    }),
    update: vi.fn(() => {
      const builder: any = {}
      builder.set = vi.fn(() => builder)
      builder.where = vi.fn(() => builder)
      builder.returning = vi.fn(() => Promise.resolve([]))
      return builder
    }),
  },
}))

vi.mock('@/server/utils/slug-utils', () => ({
  generateUniqueSlug: mocks.generateUniqueSlug,
  isReservedHandle: vi.fn(),
  isSlugTaken: vi.fn(),
  normalizeSlug: vi.fn((value: string) => value),
}))

vi.mock('@/server/utils/db-errors', () => ({
  isUniqueViolation: mocks.isUniqueViolation,
}))

vi.mock('@/server/utils/signup-metadata', () => ({
  extractSignupMetadataFromHeaders: mocks.extractSignupMetadataFromHeaders,
}))

vi.mock('@/server/auth', () => ({
  extractAuthorizationFromPayload: mocks.extractAuthorizationFromPayload,
  verifyPrivyToken: mocks.verifyPrivyToken,
  stripAuthorization: mocks.stripAuthorization,
}))

vi.mock('@/server/utils/referrals', () => ({
  REFERRAL_ATTRIBUTION_COOKIE_NAME: 'desperse_referral_attribution',
  getActiveReferralAttributionSessionFromSignedCookie:
    mocks.getActiveReferralAttributionSessionFromSignedCookie,
  bindReferralToUserFromAttributionSession: mocks.bindReferralToUserFromAttributionSession,
}))

vi.mock('@/server/utils/wallet-preferences', () => ({
  ensureWalletExists: mocks.ensureWalletExists,
}))

import { initAuth } from './auth'

describe('initAuth web referral binding', () => {
  beforeEach(() => {
    mocks.selectQueue.length = 0
    mocks.insertQueue.length = 0
    vi.clearAllMocks()

    mocks.extractAuthorizationFromPayload.mockReturnValue('Bearer test-token')
    mocks.verifyPrivyToken.mockResolvedValue({ userId: 'privy-user-1' })
    mocks.stripAuthorization.mockImplementation((payload: Record<string, unknown>) => {
      const { _authorization: _ignored, ...rest } = payload
      return rest
    })
    mocks.generateUniqueSlug.mockResolvedValue('new-user')
    mocks.extractSignupMetadataFromHeaders.mockReturnValue({
      ip: '1.2.3.4',
      country: 'US',
      userAgent: 'Vitest',
    })
    mocks.getActiveReferralAttributionSessionFromSignedCookie.mockResolvedValue({ id: 'session-1' })
    mocks.bindReferralToUserFromAttributionSession.mockResolvedValue({ success: true, created: true })
    mocks.ensureWalletExists.mockResolvedValue(undefined)
    mocks.isUniqueViolation.mockReturnValue(false)
    mocks.getRequest.mockReturnValue(
      new Request('https://desperse.app', {
        headers: new Headers({
          cookie: 'desperse_referral_attribution=signed-session',
        }),
      }),
    )
  })

  it('binds referral attribution for a new web Privy signup', async () => {
    mocks.selectQueue.push([])
    mocks.insertQueue.push([
      {
        id: 'user-1',
        privyId: 'privy-user-1',
        walletAddress: 'wallet-1',
        usernameSlug: 'new-user',
        displayName: 'New User',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: new Date('2026-07-09T18:00:00Z'),
      },
    ])

    const result = await initAuth({
      data: {
        _authorization: 'Bearer test-token',
        email: 'new@example.com',
        name: 'New User',
        walletAddress: 'wallet-1',
        avatarUrl: 'https://example.com/avatar.png',
      },
    } as never)

    expect(result).toMatchObject({ success: true, isNewUser: true })
    expect(mocks.getActiveReferralAttributionSessionFromSignedCookie).toHaveBeenCalledWith('signed-session')
    expect(mocks.bindReferralToUserFromAttributionSession).toHaveBeenCalledWith({
      attributionSessionId: 'session-1',
      referredUserId: 'user-1',
    })
  })

  it('does not re-bind referral attribution for an existing user', async () => {
    mocks.selectQueue.push([
      {
        id: 'user-1',
        privyId: 'privy-user-1',
        walletAddress: 'wallet-1',
        avatarUrl: 'https://example.com/avatar.png',
      },
    ])

    const result = await initAuth({
      data: {
        _authorization: 'Bearer test-token',
        email: 'new@example.com',
        name: 'New User',
        walletAddress: 'wallet-1',
        avatarUrl: 'https://example.com/avatar.png',
      },
    } as never)

    expect(result).toMatchObject({ success: true, isNewUser: false })
    expect(mocks.bindReferralToUserFromAttributionSession).not.toHaveBeenCalled()
  })
})
