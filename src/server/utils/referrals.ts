import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, ilike, inArray, lt, ne, or, sql } from 'drizzle-orm'

import { env } from '@/config/env'
import {
  getPublicReferralStatus,
  getReferralLeaderboardStatus,
  rankReferralLeaderboardEntries,
  REFERRAL_SLOT_LIMIT,
  type ReferralLeaderboardCandidate,
} from '@/lib/referrals'
import { db } from '@/server/db'
import { isUniqueViolation } from '@/server/utils/db-errors'
import {
  posts,
  referralAttributionSessions,
  referralEvents,
  referralInviteCodes,
  referrals,
  users,
  follows,
} from '@/server/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
const ATTRIBUTION_TTL_DAYS = 30
const PENDING_ACTIVATION_TTL_DAYS = 30
const CUSTOM_CODE_UNLOCK_COUNT = 3
const CUSTOM_CODE_CHANGE_COOLDOWN_DAYS = 7
const CUSTOM_CODE_PATTERN = /^[a-z0-9_]{3,20}$/
const BLOCKED_CUSTOM_CODE_TERMS = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard'] as const

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

export type CustomInviteCodeValidation =
  | { valid: true; code: string }
  | { valid: false; error: string; reason: 'format' | 'reserved' | 'profanity' }

export function validateCustomInviteCode(rawCode: string): CustomInviteCodeValidation {
  const code = normalizeInviteCode(rawCode)
  if (!CUSTOM_CODE_PATTERN.test(code)) {
    return { valid: false, reason: 'format', error: 'Use 3-20 letters, numbers, or underscores.' }
  }

  const reserved = new Set([
    'desperse', 'desperseapp', 'admin', 'support', 'staff', 'moderator',
    'official', 'security', 'help', 'api', 'auth', 'login', 'signup',
    'settings', 'profile', 'invite', 'referral', 'system', 'root', 'test',
    'solana', 'phantom', 'privy', 'vercel', 'github', 'discord',
  ])
  if (reserved.has(code)) return { valid: false, reason: 'reserved', error: 'That code is reserved.' }
  if (BLOCKED_CUSTOM_CODE_TERMS.some((term) => code.includes(term))) {
    return { valid: false, reason: 'profanity', error: 'That code is not allowed.' }
  }
  return { valid: true, code }
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
  const [customCodeOwner] = await db
    .select({
      id: users.id,
      slug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    })
    .from(referralInviteCodes)
    .innerJoin(users, eq(referralInviteCodes.userId, users.id))
    .where(and(sql`lower(${referralInviteCodes.code}) = ${normalized}`, eq(referralInviteCodes.status, 'active')))
    .limit(1)

  if (customCodeOwner) return customCodeOwner

  const [referrer] = await db
    .select({
      id: users.id,
      slug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    })
    .from(users)
    .where(eq(users.usernameSlug, normalized))
    .limit(1)

  return referrer ?? null
}

function customCodeAlternatives(code: string, userId: string): string[] {
  const suffix = userId.replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase() || '1'
  const base = code.slice(0, Math.max(3, 20 - suffix.length - 1))
  return [`${base}_${suffix}`, `${code.slice(0, 18)}_1`].filter((value, index, values) => values.indexOf(value) === index)
}

export async function setCustomReferralInviteCode(input: { userId: string; code: string; now?: Date }) {
  const validation = validateCustomInviteCode(input.code)
  if (!validation.valid) return { success: false as const, ...validation }

  const code = validation.code
  const now = input.now ?? new Date()
  const cooldownStart = new Date(now.getTime() - CUSTOM_CODE_CHANGE_COOLDOWN_DAYS * DAY_MS)

  const [owner] = await db
    .select({ id: users.id, usernameSlug: users.usernameSlug })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
  if (!owner) return { success: false as const, reason: 'not_found' as const, error: 'User not found.' }

  const activated = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(and(eq(referrals.referrerUserId, input.userId), eq(referrals.state, 'activated')))
    .limit(CUSTOM_CODE_UNLOCK_COUNT)
  if (activated.length < CUSTOM_CODE_UNLOCK_COUNT) {
    return {
      success: false as const,
      reason: 'locked' as const,
      error: `Custom invite codes unlock at ${CUSTOM_CODE_UNLOCK_COUNT} activated referrals.`,
      activatedCount: activated.length,
      requiredCount: CUSTOM_CODE_UNLOCK_COUNT,
    }
  }

  const [activeCode] = await db
    .select()
    .from(referralInviteCodes)
    .where(and(eq(referralInviteCodes.userId, input.userId), eq(referralInviteCodes.status, 'active')))
    .limit(1)
  if (activeCode?.createdAt && activeCode.createdAt > cooldownStart) {
    const nextChangeAt = new Date(activeCode.createdAt.getTime() + CUSTOM_CODE_CHANGE_COOLDOWN_DAYS * DAY_MS)
    return {
      success: false as const,
      reason: 'rate_limited' as const,
      error: `You can change your custom code again on ${nextChangeAt.toISOString()}.`,
      nextChangeAt,
    }
  }

  if (code === owner.usernameSlug.toLowerCase()) {
    return { success: false as const, reason: 'collision' as const, error: 'That is already your default invite code.' }
  }

  const [codeCollision] = await db
    .select({ id: referralInviteCodes.id })
    .from(referralInviteCodes)
    .where(sql`lower(${referralInviteCodes.code}) = ${code}`)
    .limit(1)
  const [usernameCollision] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameSlug, code))
    .limit(1)
  if (codeCollision || usernameCollision) {
    return {
      success: false as const,
      reason: 'collision' as const,
      error: 'That invite code is already in use.',
      alternatives: customCodeAlternatives(code, input.userId),
    }
  }

  try {
    if (activeCode) {
      const retired = await db
        .update(referralInviteCodes)
        .set({ status: 'retired', retiredAt: now, updatedAt: now })
        .where(and(eq(referralInviteCodes.id, activeCode.id), eq(referralInviteCodes.status, 'active')))
        .returning({ id: referralInviteCodes.id })
      if (retired.length === 0) {
        return {
          success: false as const,
          reason: 'conflict' as const,
          error: 'Your invite code changed in another request. Refresh and try again.',
        }
      }
    }

    const [created] = await db
      .insert(referralInviteCodes)
      .values({ userId: input.userId, code, status: 'active', updatedAt: now })
      .returning()

    await emitReferralEvent({
      eventName: activeCode ? 'referral_custom_code_changed' : 'referral_custom_code_created',
      referrerUserId: input.userId,
      payload: { code, retiredCode: activeCode?.code ?? null },
    })
    return { success: true as const, code: created.code, defaultCode: owner.usernameSlug, changedAt: created.createdAt }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false as const,
        reason: 'collision' as const,
        error: 'That invite code was just claimed. Try another.',
        alternatives: customCodeAlternatives(code, input.userId),
      }
    }
    throw error
  }
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
  if (session.consumedAt) return null
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

export async function getReferralOwnerDashboard(userId: string) {
  const [owner] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      headerBgUrl: users.headerBgUrl,
      bio: users.bio,
      usernameSlug: users.usernameSlug,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!owner) {
    return null
  }

  const [activeCustomCode] = await db
    .select({ code: referralInviteCodes.code, createdAt: referralInviteCodes.createdAt })
    .from(referralInviteCodes)
    .where(and(eq(referralInviteCodes.userId, userId), eq(referralInviteCodes.status, 'active')))
    .limit(1)

  const fetchReferrals = () => db
    .select({
      id: referrals.id,
      state: referrals.state,
      stateReason: referrals.stateReason,
      inviteCode: referrals.inviteCode,
      createdAt: referrals.createdAt,
      expiresAt: referrals.expiresAt,
      activatedAt: referrals.activatedAt,
      expiredAt: referrals.expiredAt,
      rejectedAt: referrals.rejectedAt,
      revokedAt: referrals.revokedAt,
      referredUserId: referrals.referredUserId,
      usernameSlug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.referredUserId, users.id))
    .where(eq(referrals.referrerUserId, userId))
    .orderBy(desc(referrals.createdAt))

  const rawReferrals = await fetchReferrals()
  const now = new Date()
  const stalePendingIds = rawReferrals
    .filter((referral) => referral.state === 'pending_activation' && referral.expiresAt.getTime() <= now.getTime())
    .map((referral) => referral.referredUserId)

  for (const referredUserId of stalePendingIds) {
    await expireStalePendingReferrals(now, referredUserId)
  }

  const normalizedReferrals = stalePendingIds.length > 0 ? await fetchReferrals() : rawReferrals

  const activatedCount = normalizedReferrals.filter((referral) => referral.state === 'activated').length
  const pendingCount = normalizedReferrals.filter((referral) => (
    referral.state === 'clicked'
    || referral.state === 'signup_started'
    || referral.state === 'account_created'
    || referral.state === 'pending_activation'
  )).length
  // Only in-flight referrals occupy a slot. Activated referrals are a terminal success
  // state and must not permanently consume capacity, or the 5/10-invite milestones
  // (which require more than REFERRAL_SLOT_LIMIT activations) would be unreachable.
  const consumedSlots = normalizedReferrals.filter((referral) => (
    referral.state === 'account_created'
    || referral.state === 'pending_activation'
  )).length

  return {
    owner: {
      displayName: owner.displayName || owner.usernameSlug,
      avatarUrl: owner.avatarUrl,
      headerBgUrl: owner.headerBgUrl,
      bio: owner.bio,
      usernameSlug: owner.usernameSlug,
    },
    inviteCode: activeCustomCode?.code ?? owner.usernameSlug,
    invitePath: `/i/${activeCustomCode?.code ?? owner.usernameSlug}`,
    defaultInviteCode: owner.usernameSlug,
    customInviteCode: activeCustomCode?.code ?? null,
    customCodeUnlocked: activatedCount >= CUSTOM_CODE_UNLOCK_COUNT,
    activatedCount,
    pendingCount,
    totalSlots: REFERRAL_SLOT_LIMIT,
    remainingSlots: Math.max(0, REFERRAL_SLOT_LIMIT - consumedSlots),
    referrals: normalizedReferrals,
  }
}

export async function getPublicReferralProfileStatus(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referrals)
    .where(and(eq(referrals.referrerUserId, userId), eq(referrals.state, 'activated')))

  return getPublicReferralStatus(result?.count ?? 0)
}

function getUtcWeekStart(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  return start
}

export async function getReferralLeaderboard(input?: { currentUserId?: string | null; now?: Date }) {
  const generatedAt = input?.now ?? new Date()
  const weekStartedAt = getUtcWeekStart(generatedAt)
  const [rows, excludedUserIds] = await Promise.all([
    db
      .select({
        userId: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        totalActivatedCount: sql<number>`count(*)::int`,
        weeklyActivatedCount: sql<number>`count(*) filter (where ${referrals.activatedAt} >= ${weekStartedAt})::int`,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerUserId, users.id))
      .where(eq(referrals.state, 'activated'))
      .groupBy(users.id, users.usernameSlug, users.displayName, users.avatarUrl),
    getLeaderboardExcludedUserIds(),
  ])

  const candidates: ReferralLeaderboardCandidate[] = rows.map((row) => ({
    ...row,
    totalActivatedCount: Number(row.totalActivatedCount),
    weeklyActivatedCount: Number(row.weeklyActivatedCount),
    excluded: excludedUserIds.has(row.userId),
  }))
  const entries = rankReferralLeaderboardEntries(candidates)
  const currentUser = input?.currentUserId
    ? candidates.find((candidate) => candidate.userId === input.currentUserId) ?? {
      userId: input.currentUserId,
      usernameSlug: '',
      displayName: null,
      avatarUrl: null,
      totalActivatedCount: 0,
      weeklyActivatedCount: 0,
      excluded: excludedUserIds.has(input.currentUserId),
    }
    : null
  const currentRank = currentUser
    ? entries.find((entry) => entry.userId === currentUser.userId)?.rank ?? null
    : null

  return {
    entries: entries.slice(0, 100),
    currentUserStatus: currentUser
      ? getReferralLeaderboardStatus({ ...currentUser, rank: currentRank })
      : null,
    generatedAt: generatedAt.toISOString(),
    weekStartedAt: weekStartedAt.toISOString(),
  }
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

const REFERRER_PREVIEW_POST_LIMIT = 6

export async function getReferrerInvitePreview(code: string) {
  const referrer = await getReferrerByInviteCode(code)
  if (!referrer) return null

  const samplePosts = await db
    .select({
      id: posts.id,
      mediaUrl: posts.mediaUrl,
      coverUrl: posts.coverUrl,
      caption: posts.caption,
    })
    .from(posts)
    .where(and(eq(posts.userId, referrer.id), eq(posts.isDeleted, false), eq(posts.isHidden, false), eq(posts.isDev, false)))
    .orderBy(desc(posts.createdAt))
    .limit(REFERRER_PREVIEW_POST_LIMIT)

  return { referrer, samplePosts }
}

export async function getReferralStatusForReferredUser(referredUserId: string) {
  const [referral] = await db
    .select({
      state: referrals.state,
      referrerUserId: referrals.referrerUserId,
      inviteCode: referrals.inviteCode,
    })
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1)

  return referral ?? null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REFERRAL_MODERATION_EVENT = 'referral_moderation_action'

export async function searchReferralsForModeration(rawQuery: string, limit = 50) {
  const query = rawQuery.trim()
  if (!query) return []
  const normalized = normalizeInviteCode(query)
  const userConditions = [
    ilike(users.usernameSlug, `%${normalized}%`),
    ilike(users.displayName, `%${query}%`),
  ]
  if (UUID_PATTERN.test(query)) userConditions.push(eq(users.id, query))

  const matchingUsers = await db
    .select({ id: users.id, usernameSlug: users.usernameSlug, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(or(...userConditions))
    .limit(50)
  const matchingUserIds = matchingUsers.map((user) => user.id)

  const referralConditions = [ilike(referrals.inviteCode, `%${normalized}%`)]
  if (UUID_PATTERN.test(query)) referralConditions.push(eq(referrals.id, query))
  if (matchingUserIds.length > 0) {
    referralConditions.push(inArray(referrals.referrerUserId, matchingUserIds))
    referralConditions.push(inArray(referrals.referredUserId, matchingUserIds))
  }

  const rows = await db
    .select()
    .from(referrals)
    .where(or(...referralConditions))
    .orderBy(desc(referrals.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100))

  const involvedUserIds = [...new Set(rows.flatMap((row) => [row.referrerUserId, row.referredUserId]))]
  const involvedUsers = involvedUserIds.length > 0
    ? await db
      .select({ id: users.id, usernameSlug: users.usernameSlug, displayName: users.displayName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, involvedUserIds))
    : []
  const userById = new Map(involvedUsers.map((user) => [user.id, user]))
  const excludedUserIds = await getLeaderboardExcludedUserIds()

  return rows.map((row) => ({
    ...row,
    referrer: userById.get(row.referrerUserId) ?? null,
    referredUser: userById.get(row.referredUserId) ?? null,
    referrerExcluded: excludedUserIds.has(row.referrerUserId),
  }))
}

/**
 * Set (or clear) a user's leaderboard exclusion. Recorded as a durable
 * moderation event keyed on the referrer — the user's referrals, profile
 * credit, and the invitees are all left untouched; only leaderboard ranking is
 * affected. Reversible: the latest exclude_user/include_user event wins.
 */
export async function setUserLeaderboardExclusion(input: {
  targetUserId: string
  actorUserId: string
  excluded: boolean
  reason: string
}) {
  const reason = input.reason.trim()
  if (!reason) return { success: false as const, error: 'A moderation reason is required' }

  await emitReferralEvent({
    eventName: REFERRAL_MODERATION_EVENT,
    referrerUserId: input.targetUserId,
    payload: {
      action: input.excluded ? 'exclude_user' : 'include_user',
      reason,
      actorUserId: input.actorUserId,
    },
  })
  return { success: true as const, excluded: input.excluded }
}

/**
 * Resolve the set of users currently excluded from the leaderboard by replaying
 * the durable moderation event stream (latest exclude_user/include_user per user
 * wins). This is the canonical filter the leaderboard applies:
 * `referrerUserId NOT IN (excluded)`. Profile credit/state stays untouched.
 */
export async function getLeaderboardExcludedUserIds() {
  const events = await db
    .select({ referrerUserId: referralEvents.referrerUserId, payload: referralEvents.payload })
    .from(referralEvents)
    .where(eq(referralEvents.eventName, REFERRAL_MODERATION_EVENT))
    .orderBy(desc(referralEvents.createdAt))

  const excluded = new Set<string>()
  const resolved = new Set<string>()
  for (const event of events) {
    const userId = event.referrerUserId
    const action = event.payload?.action
    if (!userId || (action !== 'exclude_user' && action !== 'include_user')) continue
    if (resolved.has(userId)) continue
    resolved.add(userId)
    if (action === 'exclude_user') excluded.add(userId)
  }
  return excluded
}

export async function retireReferralInviteCode(input: {
  codeId: string
  actorUserId: string
  reason: string
}) {
  const [code] = await db
    .select()
    .from(referralInviteCodes)
    .where(eq(referralInviteCodes.id, input.codeId))
    .limit(1)
  if (!code) return { success: false as const, error: 'Invite code not found' }
  if (code.status === 'retired') return { success: true as const, code, changed: false }
  if (!input.reason.trim()) return { success: false as const, error: 'A moderation reason is required' }

  const now = new Date()
  const [retired] = await db
    .update(referralInviteCodes)
    .set({ status: 'retired', retiredAt: now, updatedAt: now })
    .where(and(eq(referralInviteCodes.id, code.id), eq(referralInviteCodes.status, 'active')))
    .returning()
  if (!retired) return { success: false as const, error: 'Invite code changed before it could be retired' }

  await emitReferralEvent({
    eventName: REFERRAL_MODERATION_EVENT,
    referrerUserId: code.userId,
    payload: {
      action: 'retire_code',
      reason: input.reason.trim(),
      actorUserId: input.actorUserId,
      codeId: code.id,
      code: code.code,
    },
  })
  return { success: true as const, code: retired, changed: true }
}

export async function getReferralInviteCodesForModeration(userId: string) {
  return db
    .select()
    .from(referralInviteCodes)
    .where(eq(referralInviteCodes.userId, userId))
    .orderBy(desc(referralInviteCodes.createdAt))
}

export async function searchReferralInviteCodesForModeration(rawQuery: string) {
  const query = rawQuery.trim()
  if (!query) return []
  const conditions = [ilike(referralInviteCodes.code, `%${normalizeInviteCode(query)}%`)]
  if (UUID_PATTERN.test(query)) conditions.push(eq(referralInviteCodes.id, query))
  const codes = await db
    .select()
    .from(referralInviteCodes)
    .where(or(...conditions))
    .orderBy(desc(referralInviteCodes.createdAt))
    .limit(50)
  const ownerIds = [...new Set(codes.map((code) => code.userId))]
  const owners = ownerIds.length > 0
    ? await db
      .select({ id: users.id, usernameSlug: users.usernameSlug, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, ownerIds))
    : []
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]))
  return codes.map((code) => ({ ...code, owner: ownerById.get(code.userId) ?? null }))
}
