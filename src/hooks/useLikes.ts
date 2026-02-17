/**
 * Hooks for likes functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { likePost, unlikePost, getPostLikes } from '@/server/functions/likes'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

/**
 * Get like count and current user's like status for a post
 * Works for both authenticated and unauthenticated users
 */
export function usePostLikes(postId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['postLikes', postId, userId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID required')
      
      const result = await getPostLikes({
        data: {
          postId,
          userId: userId || undefined,
        },
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch post likes')
      }
      
      return {
        likeCount: result.likeCount,
        isLiked: result.isLiked || false,
      }
    },
    enabled: !!postId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Like/unlike mutation with optimistic updates
 */
export function useLikeMutation(postId: string, userId: string | undefined) {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  
  return useMutation({
    mutationFn: async (action: 'like' | 'unlike') => {
      if (!userId) {
        throw new Error('User must be authenticated to like posts')
      }
      
      const authHeaders = await getAuthHeaders()
      const result = action === 'like'
        ? await likePost({ data: { postId, _authorization: authHeaders.Authorization } })
        : await unlikePost({ data: { postId, _authorization: authHeaders.Authorization } })
      
      if (!result.success) {
        throw new Error(result.error || `Failed to ${action} post`)
      }
      
      return result
    },
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['postLikes', postId, userId] })
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['postLikes', postId, userId])
      
      // Optimistically update
      queryClient.setQueryData(['postLikes', postId, userId], (old: { likeCount: number; isLiked: boolean } | undefined) => {
        if (!old) {
          return {
            likeCount: action === 'like' ? 1 : 0,
            isLiked: action === 'like',
          }
        }
        
        return {
          likeCount: action === 'like' ? old.likeCount + 1 : Math.max(0, old.likeCount - 1),
          isLiked: action === 'like',
        }
      })
      
      return { previousData }
    },
    onError: (error, action, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['postLikes', postId, userId], context.previousData)
      }
      toast.error(error instanceof Error ? error.message : `Failed to ${action} post`)
    },
    onSuccess: (result, action) => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: ['postLikes', postId, userId] })
      // Also invalidate feed queries that might show like counts
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

