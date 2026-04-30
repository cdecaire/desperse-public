/**
 * Block hooks
 * Block / unblock another user, list users you've blocked.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blockUser, unblockUser, getBlockedUsers } from '@/server/functions/blocks'
import { toast } from '@/hooks/use-toast'
import { parseAppError } from '@/lib/errorUtils'
import { useAuth } from './useAuth'
import { useCurrentUser } from './useCurrentUser'

const blockedUsersQueryKey = (userId: string | undefined) => ['blocked-users', userId] as const

/**
 * Invalidate every cache surface that depends on the viewer's block set.
 * Both block + unblock change visibility everywhere.
 */
function invalidateBlockAffectedCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
  queryClient.invalidateQueries({ queryKey: ['feed'] })
  queryClient.invalidateQueries({ queryKey: ['post'] })
  queryClient.invalidateQueries({ queryKey: ['profile'] })
  queryClient.invalidateQueries({ queryKey: ['comments'] })
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
  queryClient.invalidateQueries({ queryKey: ['search'] })
  queryClient.invalidateQueries({ queryKey: ['mention-search'] })
  queryClient.invalidateQueries({ queryKey: ['suggested-creators'] })
  queryClient.invalidateQueries({ queryKey: ['trending-posts'] })
  queryClient.invalidateQueries({ queryKey: ['posts-by-tag'] })
  queryClient.invalidateQueries({ queryKey: ['threads'] })
  queryClient.invalidateQueries({ queryKey: ['followers'] })
  queryClient.invalidateQueries({ queryKey: ['following'] })
  queryClient.invalidateQueries({ queryKey: ['collectors'] })
}

export function useBlockUser() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string; displayLabel?: string }) => {
      const authHeaders = await getAuthHeaders()
      const result = await blockUser({
        data: {
          targetUserId,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      if (!result.success) {
        throw new Error(result.error || 'Failed to block user')
      }
      return result
    },
    onSuccess: (_data, variables) => {
      const label = variables.displayLabel ? `Blocked ${variables.displayLabel}` : 'User blocked'
      toast.success(label)
      invalidateBlockAffectedCaches(queryClient)
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toast.error(parsed.message)
    },
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string; displayLabel?: string }) => {
      const authHeaders = await getAuthHeaders()
      const result = await unblockUser({
        data: {
          targetUserId,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      if (!result.success) {
        throw new Error(result.error || 'Failed to unblock user')
      }
      return result
    },
    onSuccess: (_data, variables) => {
      const label = variables.displayLabel ? `Unblocked ${variables.displayLabel}` : 'User unblocked'
      toast.success(label)
      invalidateBlockAffectedCaches(queryClient)
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toast.error(parsed.message)
    },
  })
}

export function useBlockedUsers() {
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: blockedUsersQueryKey(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const result = await getBlockedUsers({
        data: {
          _authorization: authHeaders.Authorization,
        },
      } as never)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load blocked users')
      }
      return result.users
    },
    enabled: !!currentUser?.id,
    staleTime: 30 * 1000,
  })
}
