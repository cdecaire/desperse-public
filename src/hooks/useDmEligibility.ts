/**
 * DM Eligibility Hook
 * Check if current user can message a creator
 */

import { useQuery } from '@tanstack/react-query'
import { canUserMessage } from '@/server/functions/dm-eligibility'
import type { DmEligibilityResult } from '@/server/functions/dm-eligibility'
import { useCurrentUser } from './useCurrentUser'

export type { DmEligibilityResult }

export const dmEligibilityQueryKey = (creatorId: string) => ['dm-eligibility', creatorId] as const

/**
 * Hook to check if current user can message a creator
 */
export function useDmEligibility(creatorId: string | null) {
  const { user } = useCurrentUser()
  const viewerId = user?.id

  return useQuery({
    queryKey: dmEligibilityQueryKey(creatorId || ''),
    queryFn: async () => {
      if (!creatorId || !viewerId) {
        return null
      }

      const result = await canUserMessage({
        data: {
          creatorId,
          viewerId,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to check eligibility')
      }

      return result.data as DmEligibilityResult
    },
    enabled: !!creatorId && !!viewerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
