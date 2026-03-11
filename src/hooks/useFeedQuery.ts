/**
 * Feed Query Hook
 * Handles fetching feed data with infinite scroll pagination
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { getFeed } from '@/server/functions/posts'
import { useAuth } from '@/hooks/useAuth'
import type { FeedTab } from '@/components/feed/FeedTabs'

interface UseFeedQueryOptions {
  tab: FeedTab
  userId?: string | null
  currentUserId?: string | null
  enabled?: boolean
}

export function useFeedQuery({ tab, userId, currentUserId, enabled = true }: UseFeedQueryOptions) {
  const { isAuthenticated, getAuthHeaders } = useAuth()

  return useInfiniteQuery({
    // Use 'public' as a stable key when not authenticated to prevent key changes on logout
    queryKey: ['feed', tab, currentUserId || 'public'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders() : undefined

      const result = await getFeed({
        data: {
          tab,
          cursor: pageParam || undefined,
          limit: 20,
          userId: tab === 'following' ? userId : undefined,
          currentUserId: currentUserId || undefined,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feed')
      }

      return result
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && (tab === 'for-you' || !!userId),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get all posts from paginated feed data
 */
export function getFeedPosts(data: ReturnType<typeof useFeedQuery>['data']) {
  if (!data) return []
  return data.pages.flatMap((page) => page.posts)
}

export default useFeedQuery

