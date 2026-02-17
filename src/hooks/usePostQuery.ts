/**
 * Post Query Hook
 * Fetches a single post by ID
 */

import { useQuery } from '@tanstack/react-query'
import { getPost } from '@/server/functions/posts'
import { useCurrentUser } from './useCurrentUser'

interface UsePostQueryOptions {
  postId: string
  enabled?: boolean
}

export function usePostQuery({ postId, enabled = true }: UsePostQueryOptions) {
  const { user: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const result = await getPost({
        data: {
          postId,
          currentUserId: currentUser?.id,
        }
      })

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

