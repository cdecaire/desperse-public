/**
 * Hooks for comments functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createComment, deleteComment, getPostComments, getCommentCount } from '@/server/functions/comments'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

// Character limit for comments
export const MAX_COMMENT_LENGTH = 280

/**
 * Get all comments for a post
 */
export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['postComments', postId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID required')
      
      const result = await (getPostComments as any)({
        data: {
          postId,
          limit: 50,
        },
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comments')
      }
      
      return result.comments
    },
    enabled: !!postId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Get comment count for a post (for feed display)
 */
export function useCommentCount(postId: string | undefined) {
  return useQuery({
    queryKey: ['commentCount', postId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID required')
      
      const result = await (getCommentCount as any)({
        data: { postId },
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comment count')
      }
      
      return result.count
    },
    enabled: !!postId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Create comment mutation with optimistic updates
 */
export function useCreateCommentMutation(postId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (_content: string) => {
      // This will be called with userId from the component
      // For now, we'll need to pass userId from the component
      throw new Error('useCreateCommentMutation requires userId - use createComment directly with userId')
    },
    onSuccess: () => {
      // Invalidate comments and count
      queryClient.invalidateQueries({ queryKey: ['postComments', postId] })
      queryClient.invalidateQueries({ queryKey: ['commentCount', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/**
 * Delete comment mutation with optimistic updates
 */
export function useDeleteCommentMutation(postId: string) {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization || ''
      const result = await (deleteComment as any)({
        data: { commentId, _authorization: authorization },
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete comment')
      }
      
      return result
    },
    onMutate: async ({ commentId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['postComments', postId] })
      
      // Snapshot previous value
      const previousComments = queryClient.getQueryData(['postComments', postId])
      
      // Optimistically remove comment
      queryClient.setQueryData(['postComments', postId], (old: any[] | undefined) => {
        if (!old) return []
        return old.filter((comment) => comment.id !== commentId)
      })
      
      // Optimistically update count
      queryClient.setQueryData(['commentCount', postId], (old: number | undefined) => {
        return Math.max(0, (old || 0) - 1)
      })
      
      return { previousComments }
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(['postComments', postId], context.previousComments)
      }
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: ['postComments', postId] })
      queryClient.invalidateQueries({ queryKey: ['commentCount', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/**
 * Helper function to create a comment (used directly in components)
 * Requires authorization token to be passed
 */
export async function createCommentWithMutation(
  postId: string,
  content: string,
  authorization: string
) {
  const result = await (createComment as any)({
    data: { postId, content, _authorization: authorization },
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create comment')
  }
  
  return result.comment
}

