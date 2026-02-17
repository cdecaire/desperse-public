/**
 * Hook for searching users for @mention autocomplete
 */

import { useQuery } from '@tanstack/react-query'
import { searchMentionUsers } from '@/server/functions/mention-search'
import { useAuth } from '@/hooks/useAuth'

export type MentionUser = {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
}

/**
 * Search users for mention autocomplete
 * - Empty query returns suggested users (followed users first)
 * - With query, searches usernameSlug and displayName
 * - Debouncing should be handled by the component
 */
export function useMentionSearch(query: string | undefined, enabled: boolean = true) {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['mentionSearch', query],
    queryFn: async (): Promise<MentionUser[]> => {
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization || ''

      const result = await (searchMentionUsers as any)({
        data: {
          query: query?.trim() || undefined,
          limit: 8,
          _authorization: authorization,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to search users')
      }

      return result.users
    },
    enabled: enabled && isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  })
}
