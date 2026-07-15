import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { withAuth } from '@/server/auth'
import { requireModerator } from '@/server/utils/auth-helpers'
import {
  getReferralInviteCodesForModeration,
  retireReferralInviteCode,
  searchReferralInviteCodesForModeration,
  searchReferralsForModeration,
  setUserLeaderboardExclusion,
} from '@/server/utils/referrals'

const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

const leaderboardExclusionSchema = z.object({
  targetUserId: z.string().uuid(),
  excluded: z.boolean(),
  reason: z.string().trim().min(3).max(500),
})

const codeListSchema = z.object({ userId: z.string().uuid() })
const retireCodeSchema = z.object({
  codeId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export const searchReferralModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(searchSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required' }
    await requireModerator(result.auth.userId)
    const [referrals, inviteCodes] = await Promise.all([
      searchReferralsForModeration(result.input.query),
      searchReferralInviteCodesForModeration(result.input.query),
    ])
    return { success: true as const, referrals, inviteCodes }
  } catch (error) {
    console.error('[searchReferralModeration] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to search referral moderation records.' }
  }
})

export const setReferralLeaderboardExclusion = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(leaderboardExclusionSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required' }
    await requireModerator(result.auth.userId)
    return await setUserLeaderboardExclusion({ ...result.input, actorUserId: result.auth.userId })
  } catch (error) {
    console.error('[setReferralLeaderboardExclusion] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to update leaderboard exclusion.' }
  }
})

export const listReferralInviteCodesForModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(codeListSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required' }
    await requireModerator(result.auth.userId)
    const codes = await getReferralInviteCodesForModeration(result.input.userId)
    return { success: true as const, codes }
  } catch (error) {
    console.error('[listReferralInviteCodesForModeration] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to load referral invite codes.' }
  }
})

export const retireReferralCodeForModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(retireCodeSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required' }
    await requireModerator(result.auth.userId)
    return await retireReferralInviteCode({ ...result.input, actorUserId: result.auth.userId })
  } catch (error) {
    console.error('[retireReferralCodeForModeration] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to retire referral invite code.' }
  }
})
