/**
 * Explore Query Hooks
 * Handles fetching suggested creators, trending posts, and search results
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getSuggestedCreators, getTrendingPosts, search } from '@/server/functions/explore'

/**
 * Fetch suggested creators for the Explore page
 */
export function useSuggestedCreators(currentUserId?: string | null, isAuthReady: boolean = true) {
  return useQuery({
    queryKey: ['suggested-creators', currentUserId || 'public'],
    queryFn: async () => {
      const result = await getSuggestedCreators({
        data: {
          currentUserId: currentUserId || undefined,
          limit: 8,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch suggested creators')
      }

      return result.creators
    },
    // Don't fetch until auth state is ready to prevent flash
    enabled: isAuthReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch trending posts with infinite scroll
 */
export function useTrendingPosts(currentUserId?: string | null, isAuthReady: boolean = true) {
  return useInfiniteQuery({
    queryKey: ['trending-posts', currentUserId || 'public'],
    queryFn: async ({ pageParam }) => {
      const result = await getTrendingPosts({
        data: {
          currentUserId: currentUserId || undefined,
          offset: pageParam ?? 0,
          limit: 20,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trending posts')
      }

      return result
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    // Don't fetch until auth state is ready to prevent double-fetch
    enabled: isAuthReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Search users and posts
 */
export function useSearch(
  query: string,
  type: 'all' | 'users' | 'posts' = 'all',
  currentUserId?: string | null
) {
  return useQuery({
    queryKey: ['search', query, type, currentUserId || 'public'],
    queryFn: async () => {
      const result = await search({
        data: {
          query,
          type,
          currentUserId: currentUserId || undefined,
          limit: 20,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }

      return {
        users: result.users,
        posts: result.posts,
      }
    },
    enabled: query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get all posts from paginated trending data
 * Deduplicates by post ID to handle potential race conditions
 */
export function getTrendingPostsList(data: ReturnType<typeof useTrendingPosts>['data']) {
  if (!data) return []
  const posts = data.pages.flatMap((page) => page.posts)
  // Deduplicate by post ID to prevent React key warnings
  const seen = new Set<string>()
  return posts.filter(post => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

/**
 * Get section title from trending data (Trending or Recent)
 */
export function getTrendingSectionTitle(data: ReturnType<typeof useTrendingPosts>['data']) {
  if (!data || data.pages.length === 0) return 'Trending'
  return data.pages[0].sectionTitle
}

/**
 * Check if trending is using fallback (Recent posts)
 */
export function isTrendingFallback(data: ReturnType<typeof useTrendingPosts>['data']) {
  if (!data || data.pages.length === 0) return false
  return data.pages[0].isFallback
}

export default useTrendingPosts
