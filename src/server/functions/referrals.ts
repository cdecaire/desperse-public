import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { withAuth } from '@/server/auth'

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
