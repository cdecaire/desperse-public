/**
 * Hook for searching hashtags for autocomplete
 */

import { useQuery } from '@tanstack/react-query'
import { searchTags } from '@/server/functions/hashtag-api'
import { useAuth } from '@/hooks/useAuth'

export type HashtagTag = {
  id: string
  slug: string
  display: string | null
  usageCount: number
}

/**
 * Search tags for hashtag autocomplete
 * - Empty query returns top tags by usage count
 * - With query, returns prefix matches first, then contains
 * - Debouncing should be handled by the component
 */
export function useHashtagSearch(query: string | undefined, enabled: boolean = true) {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['hashtagSearch', query],
    queryFn: async (): Promise<HashtagTag[]> => {
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization || ''

      const result = await (searchTags as any)({
        data: {
          query: query?.trim() || undefined,
          limit: 8,
          _authorization: authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to search tags')
      }

      return result.tags
    },
    enabled: enabled && isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
