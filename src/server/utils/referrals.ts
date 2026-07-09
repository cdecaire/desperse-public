import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, eq, lt, ne } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/server/db'
import { isUniqueViolation } from '@/server/utils/db-errors'
import {
  posts,
  referralAttributionSessions,
  referralEvents,
  referrals,
  users,
  follows,
} from '@/server/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
const ATTRIBUTION_TTL_DAYS = 30
const PENDING_ACTIVATION_TTL_DAYS = 30

export const REFERRAL_ATTRIBUTION_COOKIE_NAME = 'desperse_referral_attribution'
export const REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = ATTRIBUTION_TTL_DAYS * 24 * 60 * 60

type ReferralSource = 'link' | 'manual'
type ReferralState = 'clicked' | 'signup_started' | 'account_created' | 'pending_activation' | 'activated' | 'rejected' | 'revoked' | 'expired'

function getReferralCookieSecret(): string {
  return process.env.REFERRAL_COOKIE_SECRET || process.env.SIWS_SESSION_SECRET || env.PRIVY_APP_SECRET || 'referral-dev-secret'
}

function signValue(value: string): string {
  return createHmac('sha256', getReferralCookieSecret()).update(value).digest('hex')
}

export function buildSignedReferralCookieValue(sessionId: string): string {
  return `${sessionId}.${signValue(sessionId)}`
}

export function readSignedReferralCookieValue(cookieValue: string | null | undefined): string | null {
  if (!cookieValue) return null
  const [sessionId, signature] = cookieValue.split('.')
  if (!sessionId || !signature) return null
  const expected = signValue(sessionId)
  const actualBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null
  return sessionId
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toLowerCase().replace(/^@+/, '')
}

export function hasCompletedReferralProfile(user: { displayName: string | null; avatarUrl: string | null }): boolean {
  return Boolean(user.displayName?.trim() && user.avatarUrl?.trim())
}

async function emitReferralEvent(input: {
  eventName: string
  referralId?: string | null
  attributionSessionId?: string | null
  referrerUserId?: string | null
  referredUserId?: string | null
  payload?: Record<string, unknown> | null
}) {
  await db.insert(referralEvents).values({
    eventName: input.eventName,
    referralId: input.referralId ?? null,
    attributionSessionId: input.attributionSessionId ?? null,
    referrerUserId: input.referrerUserId ?? null,
    referredUserId: input.referredUserId ?? null,
    payload: input.payload ?? null,
  })
}

async function getReferrerByInviteCode(code: string) {
  const normalized = normalizeInviteCode(code)
  const [referrer] = await db
    .select({
      id: users.id,
      slug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.usernameSlug, normalized))
    .limit(1)

  return referrer ?? null
}

export async function getActiveReferralAttributionSessionFromSignedCookie(cookieValue: string | null | undefined) {
  const sessionId = readSignedReferralCookieValue(cookieValue)
  if (!sessionId) return null

  const [session] = await db
    .select()
    .from(referralAttributionSessions)
    .where(eq(referralAttributionSessions.id, sessionId))
    .limit(1)

  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  return session
}

export async function createOrRestoreReferralAttributionSession(input: {
  inviteCode: string
  source: ReferralSource
  existingCookieValue?: string | null
  signupIp?: string | null
  signupUserAgent?: string | null
}) {
  const normalizedCode = normalizeInviteCode(input.inviteCode)
  const referrer = await getReferrerByInviteCode(normalizedCode)
  if (!referrer) {
    return { success: false as const, error: 'Invite code not found' }
  }

  const existingSession = await getActiveReferralAttributionSessionFromSignedCookie(input.existingCookieValue)
  if (
    existingSession &&
    existingSession.referrerUserId === referrer.id &&
    existingSession.inviteCode === normalizedCode
  ) {
    return {
      success: true as const,
      session: existingSession,
      cookieValue: buildSignedReferralCookieValue(existingSession.id),
      referrer,
      restored: true,
    }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + ATTRIBUTION_TTL_DAYS * DAY_MS)
  const [session] = await db
    .insert(referralAttributionSessions)
    .values({
      referrerUserId: referrer.id,
      inviteCode: normalizedCode,
      source: input.source,
      signupIp: input.signupIp ?? null,
      signupUserAgent: input.signupUserAgent ?? null,
      expiresAt,
      updatedAt: now,
    })
    .returning()

  if (input.source === 'link') {
    await emitReferralEvent({
      eventName: 'referral_link_opened',
      attributionSessionId: session.id,
      referrerUserId: referrer.id,
      payload: { inviteCode: normalizedCode, source: 'link' },
    })
    await emitReferralEvent({
      eventName: 'referral_landing_viewed',
      attributionSessionId: session.id,
      referrerUserId: referrer.id,
      payload: { inviteCode: normalizedCode, source: 'link' },
    })
  } else {
    await emitReferralEvent({
      eventName: 'referral_signup_started',
      attributionSessionId: session.id,
      referrerUserId: referrer.id,
      payload: { inviteCode: normalizedCode, source: 'manual' },
    })
  }

  return {
    success: true as const,
    session,
    cookieValue: buildSignedReferralCookieValue(session.id),
    referrer,
    restored: false,
  }
}

async function markAttributionSessionConsumed(sessionId: string, referredUserId: string) {
  await db
    .update(referralAttributionSessions)
    .set({
      referredUserId,
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(referralAttributionSessions.id, sessionId))
}

async function moveReferralToPendingActivation(referralId: string) {
  const [updated] = await db
    .update(referrals)
    .set({
      state: 'pending_activation',
      updatedAt: new Date(),
    })
    .where(eq(referrals.id, referralId))
    .returning()

  return updated ?? null
}

export async function bindReferralToUserFromAttributionSession(input: {
  attributionSessionId: string
  referredUserId: string
}) {
  const [session] = await db
    .select()
    .from(referralAttributionSessions)
    .where(eq(referralAttributionSessions.id, input.attributionSessionId))
    .limit(1)

  if (!session) {
    return { success: false as const, error: 'Attribution session not found' }
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return { success: false as const, error: 'Attribution session expired' }
  }

  const [referredUser] = await db
    .select({ id: users.id, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, input.referredUserId))
    .limit(1)

  if (!referredUser) {
    return { success: false as const, error: 'Referred user not found' }
  }

  const [existingReferral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, input.referredUserId))
    .limit(1)

  if (existingReferral) {
    await markAttributionSessionConsumed(session.id, input.referredUserId)
    return { success: true as const, referral: existingReferral, created: false }
  }

  const now = new Date()
  const expiresAt = new Date(referredUser.createdAt.getTime() + PENDING_ACTIVATION_TTL_DAYS * DAY_MS)
  const initialState: ReferralState = session.referrerUserId === input.referredUserId ? 'rejected' : 'account_created'
  let createdReferral: typeof referrals.$inferSelect
  try {
    const [inserted] = await db
      .insert(referrals)
      .values({
        referrerUserId: session.referrerUserId,
        referredUserId: input.referredUserId,
        attributionSessionId: session.id,
        inviteCode: session.inviteCode,
        state: initialState,
        stateReason: initialState === 'rejected' ? 'self_referral' : null,
        expiresAt,
        rejectedAt: initialState === 'rejected' ? now : null,
        updatedAt: now,
      })
      .returning()
    createdReferral = inserted
  } catch (insertErr) {
    // A concurrent request already created the referral for this user.
    // Treat it like the existing-referral case rather than failing.
    if (isUniqueViolation(insertErr)) {
      const [raced] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referredUserId, input.referredUserId))
        .limit(1)
      await markAttributionSessionConsumed(session.id, input.referredUserId)
      if (raced) {
        return { success: true as const, referral: raced, created: false }
      }
    }
    throw insertErr
  }

  await markAttributionSessionConsumed(session.id, input.referredUserId)

  if (initialState === 'rejected') {
    await emitReferralEvent({
      eventName: 'referral_rejected',
      referralId: createdReferral.id,
      attributionSessionId: session.id,
      referrerUserId: session.referrerUserId,
      referredUserId: input.referredUserId,
      payload: { reason: 'self_referral' },
    })
    return { success: true as const, referral: createdReferral, created: true }
  }

  await emitReferralEvent({
    eventName: 'referral_signup_started',
    referralId: createdReferral.id,
    attributionSessionId: session.id,
    referrerUserId: session.referrerUserId,
    referredUserId: input.referredUserId,
    payload: { inviteCode: session.inviteCode, source: session.source },
  })
  await emitReferralEvent({
    eventName: 'referral_account_created',
    referralId: createdReferral.id,
    attributionSessionId: session.id,
    referrerUserId: session.referrerUserId,
    referredUserId: input.referredUserId,
    payload: { inviteCode: session.inviteCode },
  })

  const pendingReferral = await moveReferralToPendingActivation(createdReferral.id)
  if (pendingReferral) {
    await emitReferralEvent({
      eventName: 'referral_pending_created',
      referralId: pendingReferral.id,
      attributionSessionId: session.id,
      referrerUserId: session.referrerUserId,
      referredUserId: input.referredUserId,
      payload: { expiresAt: pendingReferral.expiresAt.toISOString() },
    })
  }

  await verifyReferralActivationForUser(input.referredUserId)

  return { success: true as const, referral: pendingReferral ?? createdReferral, created: true }
}

async function findQualifyingFollowTarget(referral: typeof referrals.$inferSelect, referredUserCreatedAt: Date) {
  const [qualifyingTarget] = await db
    .select({
      followingId: follows.followingId,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .innerJoin(posts, eq(posts.userId, users.id))
    .where(
      and(
        eq(follows.followerId, referral.referredUserId),
        ne(follows.followingId, referral.referredUserId),
        ne(follows.followingId, referral.referrerUserId),
        eq(users.status, 'active'),
        lt(users.createdAt, referredUserCreatedAt),
        eq(posts.isDeleted, false),
        eq(posts.isHidden, false),
        eq(posts.isDev, false),
      ),
    )
    .limit(1)

  return qualifyingTarget ?? null
}

export async function verifyReferralActivationForUser(referredUserId: string) {
  await expireStalePendingReferrals(new Date(), referredUserId)

  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1)

  if (!referral) {
    return { success: true as const, status: 'no_referral' as const }
  }

  if (referral.state === 'activated') {
    return { success: true as const, status: 'activated' as const }
  }

  if (referral.state === 'rejected' || referral.state === 'revoked' || referral.state === 'expired') {
    return { success: true as const, status: referral.state }
  }

  const [referredUser] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, referredUserId))
    .limit(1)

  if (!referredUser) {
    return { success: false as const, error: 'Referred user not found' }
  }

  if (!hasCompletedReferralProfile(referredUser)) {
    return { success: true as const, status: 'pending_activation' as const, reason: 'profile_incomplete' as const }
  }

  const qualifyingTarget = await findQualifyingFollowTarget(referral, referredUser.createdAt)
  if (!qualifyingTarget) {
    return { success: true as const, status: 'pending_activation' as const, reason: 'qualifying_follow_missing' as const }
  }

  const now = new Date()
  const [activatedReferral] = await db
    .update(referrals)
    .set({
      state: 'activated',
      activationSource: 'first_follow',
      activationQualifiedFollowUserId: qualifyingTarget.followingId,
      activationVerifiedAt: now,
      activatedAt: now,
      updatedAt: now,
    })
    .where(eq(referrals.id, referral.id))
    .returning()

  await emitReferralEvent({
    eventName: 'referral_activation_source_completed',
    referralId: referral.id,
    attributionSessionId: referral.attributionSessionId,
    referrerUserId: referral.referrerUserId,
    referredUserId,
    payload: { source: 'first_follow', followingUserId: qualifyingTarget.followingId },
  })
  await emitReferralEvent({
    eventName: 'referral_activation_verified_server',
    referralId: referral.id,
    attributionSessionId: referral.attributionSessionId,
    referrerUserId: referral.referrerUserId,
    referredUserId,
    payload: { source: 'first_follow', followingUserId: qualifyingTarget.followingId },
  })
  await emitReferralEvent({
    eventName: 'referral_activated',
    referralId: referral.id,
    attributionSessionId: referral.attributionSessionId,
    referrerUserId: referral.referrerUserId,
    referredUserId,
    payload: { source: 'first_follow', followingUserId: qualifyingTarget.followingId },
  })

  return { success: true as const, status: 'activated' as const, referral: activatedReferral ?? referral }
}

// Bound the per-call sweep so the unscoped branch never loads an unbounded result set.
// TODO: a scheduled worker should call this in a loop until it returns fewer than
// STALE_REFERRAL_SWEEP_LIMIT to fully drain a large backlog of expired referrals.
const STALE_REFERRAL_SWEEP_LIMIT = 500

export async function expireStalePendingReferrals(now: Date = new Date(), referredUserId?: string) {
  const candidates = (await db
    .select()
    .from(referrals)
    .where(referredUserId ? eq(referrals.referredUserId, referredUserId) : eq(referrals.state, 'pending_activation'))
    .limit(referredUserId ? 1 : STALE_REFERRAL_SWEEP_LIMIT))
    .filter((referral) => referral.state === 'pending_activation' && referral.expiresAt.getTime() <= now.getTime())

  let expiredCount = 0
  for (const referral of candidates) {
    const [expiredReferral] = await db
      .update(referrals)
      .set({
        state: 'expired',
        expiredAt: now,
        updatedAt: now,
      })
      .where(eq(referrals.id, referral.id))
      .returning()

    if (!expiredReferral) continue
    expiredCount += 1
    await emitReferralEvent({
      eventName: 'referral_expired',
      referralId: referral.id,
      attributionSessionId: referral.attributionSessionId,
      referrerUserId: referral.referrerUserId,
      referredUserId: referral.referredUserId,
      payload: { expiredAt: now.toISOString() },
    })
  }

  return expiredCount
}
