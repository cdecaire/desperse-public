/**
 * Notification Counters Hook
 * Unified polling hook for all notification types
 * Polls every 60 seconds, refetches on window focus
 */

import { useQuery } from '@tanstack/react-query'
import { getNotificationCounters, type NewPostCreator } from '@/server/functions/notifications'
import { useCurrentUser } from './useCurrentUser'
import { useAuth } from './useAuth'
import { getLastSeen } from '@/lib/utils'

export interface NotificationCounters {
  forYouNewPostsCount: number
  followingNewPostsCount: number
  unreviewedReportsCount: number
  newFeedbackCount: number
  unreadNotificationsCount: number
  forYouNewPostCreators: NewPostCreator[]
  followingNewPostCreators: NewPostCreator[]
}

export interface UseNotificationCountersOptions {
  /** Pause polling when feed is actively fetching */
  paused?: boolean
  /** IDs of users the current user follows, for prioritizing avatars */
  followingUserIds?: string[]
}

export type { NewPostCreator }

/**
 * Hook to get unified notification counters
 * Polls every 60 seconds, refetches on window focus
 * Only polls when:
 * - User is authenticated (for Following and Reports)
 * - App is in foreground
 * - lastSeen timestamps exist (for For You and Following)
 * - Not paused (feed is not actively fetching)
 */
export function useNotificationCounters(options: UseNotificationCountersOptions = {}) {
  const { paused = false, followingUserIds = [] } = options
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders, isAuthenticated } = useAuth()

  // Get last seen timestamps from localStorage
  const lastSeenForYouAt = getLastSeen('forYou')
  const lastSeenFollowingAt = getLastSeen('following')

  // Determine if we should poll
  // For You: can work without auth, but need lastSeen timestamp
  // Following: need auth + lastSeen timestamp
  // Reports: need auth + moderator/admin role
  const shouldPollForYou = !!lastSeenForYouAt
  const shouldPollFollowing = isAuthenticated && !!currentUser?.id && !!lastSeenFollowingAt
  const shouldPollReports = isAuthenticated && !!currentUser?.id && 
    (currentUser.role === 'moderator' || currentUser.role === 'admin')

  // Only poll when not paused and at least one counter should be polled
  const shouldPoll = !paused && (shouldPollForYou || shouldPollFollowing || shouldPollReports)

  return useQuery({
    queryKey: ['notification-counters', currentUser?.id, lastSeenForYouAt, lastSeenFollowingAt, followingUserIds.join(',')],
    queryFn: async (): Promise<NotificationCounters> => {
      const authHeaders = isAuthenticated ? await getAuthHeaders() : undefined

      const result = await getNotificationCounters({
        data: {
          lastSeenForYouAt: lastSeenForYouAt || undefined,
          lastSeenFollowingAt: lastSeenFollowingAt || undefined,
          followingUserIds: followingUserIds.length > 0 ? followingUserIds : undefined,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch notification counters')
      }

      return {
        forYouNewPostsCount: result.forYouNewPostsCount,
        followingNewPostsCount: result.followingNewPostsCount,
        unreviewedReportsCount: result.unreviewedReportsCount,
        newFeedbackCount: result.newFeedbackCount,
        unreadNotificationsCount: result.unreadNotificationsCount,
        forYouNewPostCreators: result.forYouNewPostCreators,
        followingNewPostCreators: result.followingNewPostCreators,
      }
    },
    enabled: shouldPoll,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: false, // Only poll when app is in foreground
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Always consider stale to ensure fresh data
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
  })
}

