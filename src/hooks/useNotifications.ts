/**
 * Hooks for user notifications functionality
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  type NotificationWithActor,
} from '@/server/functions/notifications'
import { useAuth } from './useAuth'

/**
 * Get paginated user notifications with infinite scroll support
 */
export function useNotifications() {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  return useInfiniteQuery({
    queryKey: ['userNotifications'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = await getAuthHeaders()

      const result = await (getUserNotifications as any)({
        data: {
          cursor: pageParam,
          limit: 20,
          _authorization: authHeaders?.Authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch notifications')
      }

      return {
        notifications: result.notifications as NotificationWithActor[],
        nextCursor: result.nextCursor as string | null,
        hasMore: result.hasMore as boolean,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
  })
}

/**
 * Mark specific notifications as read
 */
export function useMarkNotificationsAsReadMutation() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const authHeaders = await getAuthHeaders()

      const result = await (markNotificationsAsRead as any)({
        data: {
          notificationIds,
          _authorization: authHeaders?.Authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark notifications as read')
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    },
  })
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const authHeaders = await getAuthHeaders()

      const result = await (markAllNotificationsAsRead as any)({
        data: {
          _authorization: authHeaders?.Authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark all notifications as read')
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    },
  })
}

/**
 * Clear all notifications (permanently delete)
 */
export function useClearAllNotificationsMutation() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const authHeaders = await getAuthHeaders()

      const result = await (clearAllNotifications as any)({
        data: {
          _authorization: authHeaders?.Authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear notifications')
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    },
  })
}
