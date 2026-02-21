/**
 * Post mutation hooks
 * Handles updating and deleting posts
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePost, deletePost } from '@/server/functions/posts'
import { toastSuccess, toastError } from '@/lib/toast'
import { parseAppError } from '@/lib/errorUtils'
import { useAuth } from '@/hooks/useAuth'

import { type Category } from '@/constants/categories'

interface UpdatePostInput {
  postId: string
  caption?: string | null
  categories?: Category[] | null
  nftName?: string | null
  nftSymbol?: string | null
  nftDescription?: string | null
  sellerFeeBasisPoints?: number | null
  isMutable?: boolean
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  maxSupply?: number | null
  // Timed edition fields
  mintWindowEnabled?: boolean
  mintWindowStartMode?: 'now' | 'scheduled'
  mintWindowStartTime?: string | null
  mintWindowDurationHours?: number | null
}

/**
 * Hook for updating posts
 */
export function useUpdatePost() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (input: UpdatePostInput) => {
      // Get auth token and include in request
      const authHeaders = await getAuthHeaders()
      const result = await updatePost({
        data: {
          ...input,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update post')
      }
      
      return result.post
    },
    onSuccess: (updatedPost) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['post', updatedPost.id] })
      queryClient.invalidateQueries({ queryKey: ['postEditState', updatedPost.id] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['userPosts'] })
      
      toastSuccess('Post updated successfully')
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toastError(parsed.message)
    },
  })
}

interface DeletePostInput {
  postId: string
}

/**
 * Hook for deleting posts
 */
export function useDeletePost() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (input: DeletePostInput) => {
      // Get auth token and include in request
      const authHeaders = await getAuthHeaders()
      const result = await deletePost({
        data: {
          ...input,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete post')
      }
      
      return { postId: input.postId, warning: result.warning }
    },
    onSuccess: ({ postId, warning }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['userPosts'] })
      
      if (warning) {
        toastSuccess(warning)
      } else {
        toastSuccess('Post deleted successfully')
      }
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toastError(parsed.message)
    },
  })
}

