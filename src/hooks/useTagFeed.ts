/**
 * Tag Feed Query Hook
 * Handles fetching posts by tag with infinite scroll pagination
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getTag, getPostsByTag } from '@/server/functions/hashtag-api'
import { useAuth } from './useAuth'
import { useCurrentUser } from './useCurrentUser'

interface UseTagFeedOptions {
  tagSlug: string
  enabled?: boolean
}

/**
 * Hook for fetching tag info
 */
export function useTag(tagSlug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tag', tagSlug],
    queryFn: async () => {
      const result = await getTag({
        data: { slug: tagSlug },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tag')
      }

      return result.tag
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching posts by tag with infinite scroll
 */
export function useTagFeed({ tagSlug, enabled = true }: UseTagFeedOptions) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  const { user: currentUser } = useCurrentUser()
  return useInfiniteQuery({
    // Viewer included so a blocked-state result never leaks across viewers within staleTime.
    queryKey: ['tagFeed', tagSlug, currentUser?.id ?? 'anon'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getPostsByTag({
        data: {
          tagSlug,
          cursor: pageParam || undefined,
          limit: 20,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch posts')
      }

      return result
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get all posts from paginated tag feed data
 */
export function getTagFeedPosts(data: ReturnType<typeof useTagFeed>['data']) {
  if (!data) return []
  return data.pages.flatMap((page) => page.posts)
}
