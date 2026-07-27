import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getPublicReferralProfileStatus,
  getReferralLeaderboard,
  getReferralOwnerDashboard,
  updateMyCustomInviteCode,
} from '@/server/functions/referrals'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export const referralOwnerDashboardQueryKey = ['referral-owner-dashboard'] as const

export function useReferralOwnerDashboard() {
  const { isAuthenticated, getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: referralOwnerDashboardQueryKey,
    queryFn: async () => {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders.Authorization) {
        return null
      }

      const result = await getReferralOwnerDashboard({
        data: {
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to load invites')
      }

      return result.dashboard
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function useUpdateCustomInviteCode() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders.Authorization) return { success: false as const, error: 'Authentication required' }

      return updateMyCustomInviteCode({
        data: { code, _authorization: authHeaders.Authorization },
      } as never)
    },
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: referralOwnerDashboardQueryKey })
      }
    },
  })
}

export function usePublicReferralProfileStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-referral-profile-status', userId],
    queryFn: () => getPublicReferralProfileStatus({ data: { userId: userId! } } as never),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function useReferralLeaderboard() {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['referral-leaderboard', 'weekly', user?.id ?? 'public'],
    queryFn: async () => {
      const authorization = isAuthenticated
        ? (await getAuthHeaders().catch(() => ({} as Record<string, string>))).Authorization
        : undefined
      return getReferralLeaderboard({
        data: authorization ? { _authorization: authorization } : {},
      } as never)
    },
    staleTime: 60 * 1000,
    retry: false,
  })
}
