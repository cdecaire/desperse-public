/**
 * Explore Query Hooks
 * Handles fetching suggested creators, trending posts, and search results
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import {
  getSuggestedCreators,
  getTrendingPosts,
  getNewPosts,
  getEndingSoonPosts,
  getFeaturedCreators,
  search,
} from '@/server/functions/explore'
import type { ExploreFeedPostType } from '@/components/explore/exploreFilters'
import { useAuth } from './useAuth'
import { useCurrentUser } from './useCurrentUser'

/**
 * Fetch suggested creators for the Explore page
 */
export function useSuggestedCreators(currentUserId?: string | null, isAuthReady: boolean = true) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useQuery({
    // currentUserId kept in the query key only for cache separation between
    // viewers — the server derives the trusted id from the auth token itself.
    queryKey: ['suggested-creators', currentUserId || 'public'],
    queryFn: async () => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getSuggestedCreators({
        data: {
          limit: 8,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
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
export function useTrendingPosts(
  currentUserId?: string | null,
  isAuthReady: boolean = true,
  postType?: ExploreFeedPostType,
  category?: string
) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useInfiniteQuery({
    queryKey: ['trending-posts', currentUserId || 'public', postType || 'all', category || 'all-cats'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getTrendingPosts({
        data: {
          offset: pageParam ?? 0,
          limit: 20,
          type: postType,
          category,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
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
 * Fetch newest posts with infinite scroll (gallery "New" tab/row)
 */
export function useNewPosts(
  currentUserId?: string | null,
  isAuthReady: boolean = true,
  postType?: ExploreFeedPostType,
  category?: string
) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useInfiniteQuery({
    queryKey: ['new-posts', currentUserId || 'public', postType || 'all', category || 'all-cats'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getNewPosts({
        data: {
          cursor: pageParam ?? undefined,
          limit: 20,
          type: postType,
          category,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch new posts')
      }

      return result
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch editions minting now with infinite scroll (gallery "Minting Now" tab)
 */
export function useEndingSoonPosts(
  currentUserId?: string | null,
  isAuthReady: boolean = true,
  postType?: ExploreFeedPostType,
  category?: string
) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useInfiniteQuery({
    queryKey: ['ending-soon-posts', currentUserId || 'public', postType || 'all', category || 'all-cats'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getEndingSoonPosts({
        data: {
          cursor: pageParam ?? undefined,
          limit: 20,
          type: postType,
          category,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch live mints')
      }

      return result
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthReady,
    // Mint windows are time-sensitive — refresh more aggressively
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch featured creators (browse-by-creator grids)
 */
export function useFeaturedCreators(limit: number = 12) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  const { user: currentUser } = useCurrentUser()
  return useQuery({
    // Viewer included so a blocked-state result never leaks across viewers within staleTime.
    queryKey: ['featured-creators', limit, currentUser?.id ?? 'anon'],
    queryFn: async () => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getFeaturedCreators({
        data: { limit, ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}) },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch featured creators')
      }

      return result.creators
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Featured creators with infinite scroll (Explore "Creators" view). Offset
 * pagination because the ordering is a computed score, not a cursorable column
 * — same approach as useTrendingPosts.
 */
export function useFeaturedCreatorsInfinite(
  pageSize: number = 24,
  isAuthReady: boolean = true
) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  const { user: currentUser } = useCurrentUser()
  return useInfiniteQuery({
    // Viewer included so a blocked-state result never leaks across viewers within staleTime.
    queryKey: ['featured-creators-infinite', pageSize, currentUser?.id ?? 'anon'],
    queryFn: async ({ pageParam }) => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await getFeaturedCreators({
        data: {
          limit: pageSize,
          offset: pageParam ?? 0,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch featured creators')
      }

      return result
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: isAuthReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Flatten paginated featured-creators data into a single creators list.
 */
export function getInfiniteCreatorsList(
  data: ReturnType<typeof useFeaturedCreatorsInfinite>['data']
) {
  if (!data) return []
  return data.pages.flatMap((page) => page.creators ?? [])
}

/**
 * Search users and posts
 */
export function useSearch(
  query: string,
  type: 'all' | 'users' | 'posts' = 'all',
  currentUserId?: string | null
) {
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['search', query, type, currentUserId || 'public'],
    queryFn: async () => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await search({
        data: {
          query,
          type,
          limit: 20,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
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
 * Post results for the Explore "search takes over the grid" view. Fetches only
 * posts (matching accounts are handled by the SearchBar dropdown), at a higher
 * limit than the dropdown, so the query reads as just another Explore filter.
 */
export function useSearchResults(
  query: string,
  currentUserId?: string | null,
  enabled = true,
) {
  const trimmed = query.trim()
  const { getAuthHeaders, isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['search-results', trimmed, currentUserId || 'public'],
    queryFn: async () => {
      const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
      const result = await search({
        data: {
          query: trimmed,
          type: 'posts',
          limit: 50,
          ...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }

      return {
        posts: result.posts || [],
      }
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  })
}

/**
 * Flatten paginated post data from any explore infinite query
 * Deduplicates by post ID to handle potential race conditions
 */
export function getInfinitePostsList<T extends { id: string }>(
  data: { pages: Array<{ posts: T[] }> } | undefined
): T[] {
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
 * Get all posts from paginated trending data
 */
export function getTrendingPostsList(data: ReturnType<typeof useTrendingPosts>['data']) {
  return getInfinitePostsList(data)
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
