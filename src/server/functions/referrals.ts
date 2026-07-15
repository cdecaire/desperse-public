import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { withAuth } from '@/server/auth'
import {
  getPublicReferralProfileStatus as getPublicReferralProfileStatusInternal,
  getReferralStatusForReferredUser,
  getReferrerInvitePreview,
  setCustomReferralInviteCode,
} from '@/server/utils/referrals'

const inviteCodeSchema = z.object({
  code: z.string().min(1),
})

const publicProfileStatusSchema = z.object({
  userId: z.string().min(1),
})

/**
 * Public preview of the referrer behind an invite code: profile basics plus
 * a few recent posts, used to render the /i/:code landing page.
 */
export const getInviteReferrerPreview = createServerFn({ method: 'GET' }).handler(async (input: unknown) => {
  const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input
  const { code } = inviteCodeSchema.parse(rawData)

  const preview = await getReferrerInvitePreview(code)
  if (!preview) {
    return { success: false as const, error: 'Invite code not found' as const }
  }
  return { success: true as const, ...preview }
})

/**
 * Whether the current authenticated user already has a referral bound to
 * their account (from signing up through an invite link), and its state.
 */
export const getMyReferralStatus = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  const result = await withAuth(z.object({}), input)
  if (!result) {
    return { success: false as const, error: 'Authentication required' as const }
  }
  const referral = await getReferralStatusForReferredUser(result.auth.userId)
  return { success: true as const, referral }
})

/** Public recognition state. Returns null until the first valid activation. */
export const getPublicReferralProfileStatus = createServerFn({ method: 'GET' }).handler(async (input: unknown) => {
  const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input
  const { userId } = publicProfileStatusSchema.parse(rawData)
  return getPublicReferralProfileStatusInternal(userId)
})

export const getReferralOwnerDashboard = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { success: false as const, error: 'Authentication required' }
    }

    // Gated to moderators/admins during the invites rollout. Keep in sync with the
    // RoleGuard on /settings/invites and the nav item in SettingsNav.
    const { isModeratorOrAdmin } = await import('@/server/utils/auth-helpers')
    if (!(await isModeratorOrAdmin(result.auth.userId))) {
      return { success: false as const, error: 'Access denied' }
    }

    const { getReferralOwnerDashboard: getReferralOwnerDashboardInternal } = await import('@/server/utils/referrals')
    const dashboard = await getReferralOwnerDashboardInternal(result.auth.userId)

    if (!dashboard) {
      return { success: false as const, error: 'Referral owner not found' }
    }

    return {
      success: true as const,
      dashboard,
    }
  } catch (error) {
    console.error('[getReferralOwnerDashboard] Error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to load referral dashboard',
    }
  }
})

const customInviteCodeSchema = z.object({
  code: z.string().min(1).max(64),
})

export const updateMyCustomInviteCode = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(customInviteCodeSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required' }
    return await setCustomReferralInviteCode({ userId: result.auth.userId, code: result.input.code })
  } catch (error) {
    console.error('[updateMyCustomInviteCode] Error:', error)
    return { success: false as const, error: error instanceof Error ? error.message : 'Failed to update invite code' }
  }
})
