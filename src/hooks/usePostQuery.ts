/**
 * Post Query Hook
 * Fetches a single post by ID
 */

import { useQuery } from '@tanstack/react-query'
import { getPost } from '@/server/functions/posts'
import { useCurrentUser } from './useCurrentUser'
import { useAuth } from './useAuth'

interface UsePostQueryOptions {
  postId: string
  enabled?: boolean
}

export function usePostQuery({ postId, enabled = true }: UsePostQueryOptions) {
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders()
      const result = await getPost({
        data: {
          postId,
          currentUserId: currentUser?.id,
          ...(authHeaders.Authorization ? { _authorization: authHeaders.Authorization } : {}),
        }
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Post not found')
      }

      return {
        post: result.post,
        user: result.user,
      }
    },
    enabled: enabled && !!postId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export default usePostQuery
