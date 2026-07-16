import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectQueue: unknown[] = []
const updateQueue: unknown[] = []
const updateSetValues: unknown[] = []
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

vi.mock('@/server/db', () => {
  const mockDb: any = {
    select: vi.fn(() => {
      const builder: any = makeAwaitable(nextSelect)
      builder.from = vi.fn(() => builder)
      builder.where = vi.fn(() => builder)
      builder.innerJoin = vi.fn(() => builder)
      builder.groupBy = vi.fn(() => builder)
      builder.orderBy = vi.fn(() => builder)
      builder.limit = vi.fn(() => nextSelect())
      return builder
    }),
    update: vi.fn(() => {
      const builder: any = makeAwaitable(nextUpdate)
      builder.set = vi.fn((value: unknown) => {
        updateSetValues.push(value)
        return builder
      })
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
  }
  return { db: mockDb }
})

describe('referrals utils', () => {
  beforeEach(() => {
    process.env.REFERRAL_COOKIE_SECRET = 'test-referral-secret'
    selectQueue.length = 0
    updateQueue.length = 0
    updateSetValues.length = 0
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

    selectQueue.push([]) // no matching active custom code
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
    selectQueue.push([{ count: 1 }]) // activated referrals after this transition

    const { verifyReferralActivationForUser } = await import('./referrals')
    const result = await verifyReferralActivationForUser('referred-1')

    expect(result.success).toBe(true)
    expect(result.status).toBe('activated')
    expect(insertValues).toHaveLength(4)
    expect(insertValues[0]).toMatchObject({ eventName: 'referral_activation_source_completed' })
    expect(insertValues[1]).toMatchObject({ eventName: 'referral_activation_verified_server' })
    expect(insertValues[2]).toMatchObject({ eventName: 'referral_activated' })
    expect(insertValues[3]).toMatchObject({
      userId: 'referrer-1',
      actorId: 'referred-1',
      type: 'referral_activated',
      metadata: {
        milestoneTarget: 1,
        milestoneMessage: 'Unlocked: First Signal',
      },
    })

    vi.useRealTimers()
  })

  it('does not repeat the Top Connectors milestone after more than 10 activations', async () => {
    const now = new Date('2026-07-08T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const referral = {
      id: 'referral-11',
      referrerUserId: 'referrer-1',
      referredUserId: 'referred-11',
      attributionSessionId: 'session-11',
      inviteCode: 'carl',
      state: 'pending_activation',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    }

    selectQueue.push([referral])
    selectQueue.push([referral])
    selectQueue.push([
      {
        id: 'referred-11',
        displayName: 'New User Eleven',
        avatarUrl: 'https://example.com/avatar-11.png',
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
    selectQueue.push([{ count: 11 }])

    const { verifyReferralActivationForUser } = await import('./referrals')
    const result = await verifyReferralActivationForUser('referred-11')

    expect(result.success).toBe(true)
    expect(result.status).toBe('activated')
    expect(insertValues[3]).toMatchObject({
      userId: 'referrer-1',
      actorId: 'referred-11',
      type: 'referral_activated',
      metadata: null,
    })

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

  it('records the canonical rejected event for a self-referral', async () => {
    const now = new Date('2026-07-16T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const session = {
      id: 'session-self', referrerUserId: 'user-self', inviteCode: 'self', source: 'link',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    }
    selectQueue.push([session])
    selectQueue.push([{ id: 'user-self', createdAt: now }])
    selectQueue.push([])
    insertReturningQueue.push([{
      id: 'referral-self', referrerUserId: 'user-self', referredUserId: 'user-self',
      attributionSessionId: session.id, inviteCode: session.inviteCode, state: 'rejected',
      stateReason: 'self_referral', expiresAt: new Date('2026-08-15T12:00:00.000Z'),
    }])

    const { bindReferralToUserFromAttributionSession } = await import('./referrals')
    const result = await bindReferralToUserFromAttributionSession({
      attributionSessionId: session.id,
      referredUserId: 'user-self',
    })

    expect(result).toMatchObject({ success: true, created: true, referral: { state: 'rejected' } })
    expect(insertValues).toContainEqual(expect.objectContaining({
      eventName: 'referral_rejected', payload: { reason: 'self_referral' },
    }))
    vi.useRealTimers()
  })

  it('covers attribution through binding, activation events, and notification writes', async () => {
    const now = new Date('2026-07-16T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const session = {
      id: 'session-e2e', referrerUserId: 'referrer-1', inviteCode: 'carl', source: 'manual',
      expiresAt: new Date('2026-08-15T12:00:00.000Z'),
    }
    const created = {
      id: 'referral-e2e', referrerUserId: 'referrer-1', referredUserId: 'referred-1',
      attributionSessionId: session.id, inviteCode: 'carl', state: 'account_created',
      expiresAt: new Date('2026-08-15T12:00:00.000Z'),
    }
    const pending = { ...created, state: 'pending_activation' }
    const activated = { ...pending, state: 'activated', activatedAt: now }

    selectQueue.push([])
    selectQueue.push([{ id: 'referrer-1', slug: 'carl', displayName: 'Carl', avatarUrl: null }])
    insertReturningQueue.push([session])
    selectQueue.push([session])
    selectQueue.push([{ id: 'referred-1', createdAt: now }])
    selectQueue.push([])
    insertReturningQueue.push([created])
    updateQueue.push([])
    updateQueue.push([pending])
    selectQueue.push([pending])
    selectQueue.push([pending])
    selectQueue.push([{
      id: 'referred-1', displayName: 'New User', avatarUrl: 'https://example.com/avatar.png', createdAt: now,
    }])
    selectQueue.push([{ followingId: 'creator-1' }])
    updateQueue.push([activated])
    selectQueue.push([{ count: 1 }])

    const { createOrRestoreReferralAttributionSession, bindReferralToUserFromAttributionSession } = await import('./referrals')
    const attribution = await createOrRestoreReferralAttributionSession({ inviteCode: 'carl', source: 'manual' })
    expect(attribution).toMatchObject({ success: true, session: { id: 'session-e2e' } })
    const binding = await bindReferralToUserFromAttributionSession({
      attributionSessionId: session.id,
      referredUserId: 'referred-1',
    })

    expect(binding).toMatchObject({ success: true, created: true })
    expect(insertValues.map((value: any) => value.eventName).filter(Boolean)).toEqual(expect.arrayContaining([
      'referral_signup_started', 'referral_account_created', 'referral_pending_created',
      'referral_activation_verified_server', 'referral_activated',
    ]))
    expect(insertValues).toContainEqual(expect.objectContaining({
      userId: 'referrer-1', actorId: 'referred-1', type: 'referral_activated',
    }))
    vi.useRealTimers()
  })

  it('validates custom invite code format, reserved terms, and profanity', async () => {
    const { validateCustomInviteCode } = await import('./referrals')

    expect(validateCustomInviteCode('My_Code7')).toEqual({ valid: true, code: 'my_code7' })
    expect(validateCustomInviteCode('no')).toMatchObject({ valid: false, reason: 'format' })
    expect(validateCustomInviteCode('support')).toMatchObject({ valid: false, reason: 'reserved' })
    expect(validateCustomInviteCode('coolshit')).toMatchObject({ valid: false, reason: 'profanity' })
  })

  it('creates a custom code after three activated referrals', async () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    selectQueue.push([{ id: 'user-1', usernameSlug: 'default-code' }])
    selectQueue.push([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }])
    selectQueue.push([]) // no current custom code
    selectQueue.push([]) // no historical custom code collision
    selectQueue.push([]) // no username collision
    insertReturningQueue.push([{ id: 'code-1', userId: 'user-1', code: 'fresh_code', createdAt: now }])

    const { setCustomReferralInviteCode } = await import('./referrals')
    const result = await setCustomReferralInviteCode({ userId: 'user-1', code: 'Fresh_Code', now })

    expect(result).toMatchObject({ success: true, code: 'fresh_code', defaultCode: 'default-code' })
    expect(insertValues).toContainEqual(expect.objectContaining({ userId: 'user-1', code: 'fresh_code', status: 'active' }))
  })

  it('returns collision errors and alternatives', async () => {
    selectQueue.push([{ id: 'user-1', usernameSlug: 'default-code' }])
    selectQueue.push([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }])
    selectQueue.push([])
    selectQueue.push([{ id: 'existing-code' }])
    selectQueue.push([])

    const { setCustomReferralInviteCode } = await import('./referrals')
    const result = await setCustomReferralInviteCode({ userId: 'user-1', code: 'taken_code' })

    expect(result).toMatchObject({ success: false, reason: 'collision' })
    expect((result as { alternatives?: string[] }).alternatives ?? []).not.toHaveLength(0)
  })

  it('enforces the seven-day custom code change cooldown', async () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    selectQueue.push([{ id: 'user-1', usernameSlug: 'default-code' }])
    selectQueue.push([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }])
    selectQueue.push([{
      id: 'current-code',
      code: 'old_code',
      createdAt: new Date('2026-07-10T12:00:00.000Z'),
      status: 'active',
    }])

    const { setCustomReferralInviteCode } = await import('./referrals')
    const result = await setCustomReferralInviteCode({ userId: 'user-1', code: 'new_code', now })

    expect(result).toMatchObject({ success: false, reason: 'rate_limited' })
  })

  it('retires the previous custom code when replacing it after cooldown', async () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    selectQueue.push([{ id: 'user-1', usernameSlug: 'default-code' }])
    selectQueue.push([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }])
    selectQueue.push([{
      id: 'current-code',
      code: 'old_code',
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
      status: 'active',
    }])
    selectQueue.push([])
    selectQueue.push([])
    updateQueue.push([{ id: 'current-code' }])
    insertReturningQueue.push([{ id: 'code-2', userId: 'user-1', code: 'new_code', createdAt: now }])

    const { setCustomReferralInviteCode } = await import('./referrals')
    const result = await setCustomReferralInviteCode({ userId: 'user-1', code: 'new_code', now })

    expect(result).toMatchObject({ success: true, code: 'new_code' })
    expect(updateSetValues).toContainEqual(expect.objectContaining({ status: 'retired', retiredAt: now }))
  })

  it('does not insert when another request already retired the current code', async () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    selectQueue.push([{ id: 'user-1', usernameSlug: 'default-code' }])
    selectQueue.push([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }])
    selectQueue.push([{
      id: 'current-code',
      code: 'old_code',
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
      status: 'active',
    }])
    selectQueue.push([])
    selectQueue.push([])
    updateQueue.push([])

    const { setCustomReferralInviteCode } = await import('./referrals')
    const result = await setCustomReferralInviteCode({ userId: 'user-1', code: 'new_code', now })

    expect(result).toMatchObject({ success: false, reason: 'conflict' })
    expect(insertValues).toHaveLength(0)
  })

  it('excludes a user from the leaderboard via a durable event without touching referral state', async () => {
    const { setUserLeaderboardExclusion } = await import('./referrals')
    const result = await setUserLeaderboardExclusion({
      targetUserId: 'referrer-1',
      actorUserId: 'moderator-1',
      excluded: true,
      reason: 'spammed the invite',
    })

    expect(result).toMatchObject({ success: true, excluded: true })
    expect(updateSetValues).toHaveLength(0)
    expect(insertValues).toContainEqual(expect.objectContaining({
      eventName: 'referral_moderation_action',
      referrerUserId: 'referrer-1',
      referralId: null,
      payload: expect.objectContaining({ action: 'exclude_user', actorUserId: 'moderator-1', reason: 'spammed the invite' }),
    }))
  })

  it('requires a reason to change a user leaderboard exclusion', async () => {
    const { setUserLeaderboardExclusion } = await import('./referrals')
    const result = await setUserLeaderboardExclusion({
      targetUserId: 'referrer-1',
      actorUserId: 'moderator-1',
      excluded: true,
      reason: '   ',
    })

    expect(result).toMatchObject({ success: false })
    expect(insertValues).toHaveLength(0)
  })

  it('resolves leaderboard exclusions from the event stream, latest action wins', async () => {
    // Events are returned newest-first (createdAt desc). referrer-1 was excluded
    // then later re-included → not excluded; referrer-2 is currently excluded.
    selectQueue.push([
      { referrerUserId: 'referrer-1', payload: { action: 'include_user' } },
      { referrerUserId: 'referrer-2', payload: { action: 'exclude_user' } },
      { referrerUserId: 'referrer-1', payload: { action: 'exclude_user' } },
      { referrerUserId: 'referrer-3', payload: { action: 'retire_code' } },
    ])

    const { getLeaderboardExcludedUserIds } = await import('./referrals')
    const excluded = await getLeaderboardExcludedUserIds()

    expect([...excluded].sort()).toEqual(['referrer-2'])
  })

  it('builds the weekly board from valid activations and applies moderation exclusions', async () => {
    selectQueue.push([
      { referrerUserId: 'referrer-2', payload: { action: 'exclude_user' } },
    ])
    selectQueue.push([
      { userId: 'referrer-1', usernameSlug: 'alpha', displayName: 'Alpha', avatarUrl: null, totalActivatedCount: 12, weeklyActivatedCount: 4 },
      { userId: 'referrer-2', usernameSlug: 'beta', displayName: 'Beta', avatarUrl: null, totalActivatedCount: 20, weeklyActivatedCount: 8 },
      { userId: 'referrer-3', usernameSlug: 'gamma', displayName: 'Gamma', avatarUrl: null, totalActivatedCount: 9, weeklyActivatedCount: 5 },
    ])

    const { getReferralLeaderboard } = await import('./referrals')
    const result = await getReferralLeaderboard({
      currentUserId: 'referrer-1',
      now: new Date('2026-07-15T12:00:00.000Z'),
    })

    expect(result.weekStartedAt).toBe('2026-07-13T00:00:00.000Z')
    expect(result.entries.map((entry) => entry.userId)).toEqual(['referrer-1'])
    expect(result.currentUserStatus).toEqual({ state: 'ranked', rank: 1 })
  })

  it('retires an active custom code and records the moderation reason', async () => {
    const code = { id: 'code-1', userId: 'referrer-1', code: 'impersonator', status: 'active' }
    selectQueue.push([code])
    updateQueue.push([{ ...code, status: 'retired' }])

    const { retireReferralInviteCode } = await import('./referrals')
    const result = await retireReferralInviteCode({
      codeId: code.id,
      actorUserId: 'moderator-1',
      reason: 'impersonation',
    })

    expect(result).toMatchObject({ success: true, changed: true, code: { status: 'retired' } })
    expect(insertValues).toContainEqual(expect.objectContaining({
      eventName: 'referral_moderation_action',
      payload: expect.objectContaining({ action: 'retire_code', reason: 'impersonation' }),
    }))
  })
})
