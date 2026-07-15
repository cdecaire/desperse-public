import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { withAuth } from '@/server/auth'
import { requireModerator } from '@/server/utils/auth-helpers'
import {
  getReferralInviteCodesForModeration,
  moderateReferral,
  retireReferralInviteCode,
  searchReferralInviteCodesForModeration,
  searchReferralsForModeration,
} from '@/server/utils/referrals'

const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

const moderationSchema = z.object({
  referralId: z.string().uuid(),
  action: z.enum(['reject', 'revoke', 'restore', 'correct', 'exclude', 'include']),
  reason: z.string().trim().min(3).max(500),
  correctedReferrerUserId: z.string().uuid().optional(),
  correctedInviteCode: z.string().trim().min(1).max(64).optional(),
})

const codeListSchema = z.object({ userId: z.string().uuid() })
const retireCodeSchema = z.object({
  codeId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export const searchReferralModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  const result = await withAuth(searchSchema, input)
  if (!result) return { success: false as const, error: 'Authentication required' }
  await requireModerator(result.auth.userId)
  const [referrals, inviteCodes] = await Promise.all([
    searchReferralsForModeration(result.input.query),
    searchReferralInviteCodesForModeration(result.input.query),
  ])
  return { success: true as const, referrals, inviteCodes }
})

export const applyReferralModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  const result = await withAuth(moderationSchema, input)
  if (!result) return { success: false as const, error: 'Authentication required' }
  await requireModerator(result.auth.userId)
  return moderateReferral({ ...result.input, actorUserId: result.auth.userId })
})

export const listReferralInviteCodesForModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  const result = await withAuth(codeListSchema, input)
  if (!result) return { success: false as const, error: 'Authentication required' }
  await requireModerator(result.auth.userId)
  const codes = await getReferralInviteCodesForModeration(result.input.userId)
  return { success: true as const, codes }
})

export const retireReferralCodeForModeration = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  const result = await withAuth(retireCodeSchema, input)
  if (!result) return { success: false as const, error: 'Authentication required' }
  await requireModerator(result.auth.userId)
  return retireReferralInviteCode({ ...result.input, actorUserId: result.auth.userId })
})
