import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectQueue: unknown[] = []
const updateQueue: unknown[] = []
const insertReturningQueue: unknown[] = []
const insertValues: unknown[] = []

function nextSelect() {
  return Promise.resolve(selectQueue.shift() ?? [])
}

function nextUpdate() {
  return Promise.resolve(updateQueue.shift() ?? [])
}

function nextInsertReturning() {
  return Promise.resolve(insertReturningQueue.shift() ?? [])
}

function makeAwaitable(resultFactory: () => Promise<unknown>, extra: Record<string, unknown> = {}) {
  return {
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => resultFactory().then(resolve, reject),
    ...extra,
  }
}

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn(() => {
      const builder: any = makeAwaitable(nextSelect)
      builder.from = vi.fn(() => builder)
      builder.where = vi.fn(() => builder)
      builder.innerJoin = vi.fn(() => builder)
      builder.limit = vi.fn(() => nextSelect())
      return builder
    }),
    update: vi.fn(() => {
      const builder: any = makeAwaitable(nextUpdate)
      builder.set = vi.fn(() => builder)
      builder.where = vi.fn(() => builder)
      builder.returning = vi.fn(() => nextUpdate())
      return builder
    }),
    insert: vi.fn(() => {
      const builder: any = makeAwaitable(async () => undefined)
      builder.values = vi.fn((value: unknown) => {
        insertValues.push(value)
        return builder
      })
      builder.returning = vi.fn(() => nextInsertReturning())
      return builder
    }),
  },
}))

describe('referrals utils', () => {
  beforeEach(() => {
    process.env.REFERRAL_COOKIE_SECRET = 'test-referral-secret'
    selectQueue.length = 0
    updateQueue.length = 0
    insertReturningQueue.length = 0
    insertValues.length = 0
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('signs and validates attribution cookies', async () => {
    const { buildSignedReferralCookieValue, readSignedReferralCookieValue } = await import('./referrals')

    const cookie = buildSignedReferralCookieValue('session-123')
    expect(readSignedReferralCookieValue(cookie)).toBe('session-123')
    expect(readSignedReferralCookieValue(`${cookie}x`)).toBeNull()
  })

  it('does not treat an already-consumed attribution session as active', async () => {
    const { buildSignedReferralCookieValue, getActiveReferralAttributionSessionFromSignedCookie } = await import(
      './referrals'
    )

    selectQueue.push([
      {
        id: 'session-1',
        referrerUserId: 'referrer-1',
        inviteCode: 'carl',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        consumedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ])

    const cookie = buildSignedReferralCookieValue('session-1')
    const session = await getActiveReferralAttributionSessionFromSignedCookie(cookie)

    expect(session).toBeNull()
  })

  it('creates a manual attribution session for a valid invite code', async () => {
    const now = new Date('2026-07-08T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    selectQueue.push([
      {
        id: 'referrer-1',
        slug: 'carl',
        displayName: 'Carl',
        avatarUrl: 'https://example.com/carl.png',
      },
    ])

    insertReturningQueue.push([
      {
        id: 'session-1',
        referrerUserId: 'referrer-1',
        inviteCode: 'carl',
        source: 'manual',
        expiresAt: new Date('2026-08-07T12:00:00.000Z'),
      },
    ])

    const { createOrRestoreReferralAttributionSession } = await import('./referrals')
    const result = await createOrRestoreReferralAttributionSession({
      inviteCode: 'Carl',
      source: 'manual',
      signupIp: '1.2.3.4',
      signupUserAgent: 'test-agent',
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('expected success')
    expect(result.restored).toBe(false)
    expect(result.referrer.slug).toBe('carl')
    expect(result.session.id).toBe('session-1')
    expect(result.cookieValue.startsWith('session-1.')).toBe(true)
    expect(insertValues).toHaveLength(2)

    vi.useRealTimers()
  })

  it('activates a pending referral after profile completion and qualifying follow', async () => {
    const now = new Date('2026-07-08T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const referral = {
      id: 'referral-1',
      referrerUserId: 'referrer-1',
      referredUserId: 'referred-1',
      attributionSessionId: 'session-1',
      inviteCode: 'carl',
      state: 'pending_activation',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    }

    selectQueue.push([referral])
    selectQueue.push([referral])
    selectQueue.push([
      {
        id: 'referred-1',
        displayName: 'New User',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: new Date('2026-07-08T11:00:00.000Z'),
      },
    ])
    selectQueue.push([{ followingId: 'creator-1' }])

    updateQueue.push([
      {
        ...referral,
        state: 'activated',
        activationSource: 'first_follow',
        activationQualifiedFollowUserId: 'creator-1',
      },
    ])

    const { verifyReferralActivationForUser } = await import('./referrals')
    const result = await verifyReferralActivationForUser('referred-1')

    expect(result.success).toBe(true)
    expect(result.status).toBe('activated')
    expect(insertValues).toHaveLength(3)
    expect(insertValues[0]).toMatchObject({ eventName: 'referral_activation_source_completed' })
    expect(insertValues[1]).toMatchObject({ eventName: 'referral_activation_verified_server' })
    expect(insertValues[2]).toMatchObject({ eventName: 'referral_activated' })

    vi.useRealTimers()
  })

  it('expires stale pending referrals after 30 days', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    const expiredReferral = {
      id: 'referral-1',
      referrerUserId: 'referrer-1',
      referredUserId: 'referred-1',
      attributionSessionId: 'session-1',
      state: 'pending_activation',
      expiresAt: new Date('2026-08-08T12:00:00.000Z'),
    }

    selectQueue.push([expiredReferral])
    updateQueue.push([
      {
        ...expiredReferral,
        state: 'expired',
        expiredAt: now,
      },
    ])

    const { expireStalePendingReferrals } = await import('./referrals')
    const expiredCount = await expireStalePendingReferrals(now)

    expect(expiredCount).toBe(1)
    expect(insertValues).toHaveLength(1)
    expect(insertValues[0]).toMatchObject({ eventName: 'referral_expired' })
  })
})
