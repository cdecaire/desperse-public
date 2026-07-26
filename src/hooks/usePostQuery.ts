/**
 * Post Query Hook
 * Fetches a single post by ID
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  type PostQueryData,
  postQueryKeys,
  publicPostQueryOptions,
  viewerPostQueryOptions,
} from '@/lib/post-query'

interface UsePostQueryOptions {
  postId: string
  enabled?: boolean
}

export function usePostQuery({ postId, enabled = true }: UsePostQueryOptions) {
  const queryClient = useQueryClient()
  const { isAuthenticated, isReady, privyId, getAuthHeaders } = useAuth()
  const isViewerQuery = isReady && isAuthenticated && !!privyId
  const publicData = queryClient.getQueryData<PostQueryData>(postQueryKeys.public(postId))
  const getAuthorization = async () => {
    const headers = await getAuthHeaders()
    return headers.Authorization ?? null
  }
  const options = isViewerQuery
    ? viewerPostQueryOptions(postId, privyId, getAuthorization)
    : publicPostQueryOptions(postId)

  return useQuery({
    ...options,
    placeholderData: isViewerQuery ? publicData : undefined,
    enabled: enabled && !!postId,
  })
}

export default usePostQuery
