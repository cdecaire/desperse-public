/**
 * Category Feed Query Hook
 * Handles fetching posts by category with infinite scroll pagination
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { getPostsByCategory } from '@/server/functions/categories'

interface UseCategoryFeedOptions {
  categorySlug: string
  enabled?: boolean
}

/**
 * Hook for fetching posts by category with infinite scroll
 */
export function useCategoryFeed({ categorySlug, enabled = true }: UseCategoryFeedOptions) {
  return useInfiniteQuery({
    queryKey: ['categoryFeed', categorySlug],
    queryFn: async ({ pageParam }) => {
      const result = await getPostsByCategory({
        data: {
          categorySlug,
          cursor: pageParam || undefined,
          limit: 20,
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
 * Get all posts from paginated category feed data
 */
export function getCategoryFeedPosts(data: ReturnType<typeof useCategoryFeed>['data']) {
  if (!data) return []
  return data.pages.flatMap((page) => page.posts)
}

/**
 * Get the canonical category name from the feed data
 */
export function getCategoryName(data: ReturnType<typeof useCategoryFeed>['data']): string | null {
  if (!data || data.pages.length === 0) return null
  return data.pages[0].categoryName || null
}
