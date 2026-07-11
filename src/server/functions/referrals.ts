import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { getReferralStatusForReferredUser, getReferrerInvitePreview } from '@/server/utils/referrals'

const inviteCodeSchema = z.object({
  code: z.string().min(1),
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
