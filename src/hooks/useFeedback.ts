/**
 * Beta Feedback hooks
 * Handles feedback submission and admin operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBetaFeedback,
  getBetaFeedbackList,
  getBetaFeedbackById,
  markBetaFeedbackReviewed,
} from '@/server/functions/feedback'
import { toast } from '@/hooks/use-toast'
import { parseAppError } from '@/lib/errorUtils'
import { useCurrentUser } from './useCurrentUser'
import { useAuth } from './useAuth'

interface CreateBetaFeedbackInput {
  rating?: number | null
  message?: string | null
  imageUrl?: string | null
  pageUrl?: string | null
  appVersion?: string | null
  userAgent?: string | null
}

/**
 * Hook for creating beta feedback
 */
export function useCreateBetaFeedback() {
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateBetaFeedbackInput) => {
      const authHeaders = await getAuthHeaders()
      const result = await createBetaFeedback({
        data: {
          ...input,
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback')
      }

      return result.feedback
    },
    onSuccess: () => {
      toast.success('Feedback sent. Thank you!')
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toast.error(parsed.message)
    },
  })
}

/**
 * Hook for fetching beta feedback list (admin only)
 */
export function useBetaFeedbackList(status?: 'new' | 'reviewed' | null) {
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const isModeratorOrAdmin = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  return useQuery({
    queryKey: ['admin', 'feedback', 'list', status, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const result = await getBetaFeedbackList({
        data: {
          status: status || null,
          limit: 100,
          offset: 0,
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback list')
      }

      return result.feedback
    },
    enabled: !!currentUser?.id && isModeratorOrAdmin,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook for fetching single beta feedback by ID (admin only)
 */
export function useBetaFeedbackById(feedbackId: string | undefined) {
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const isModeratorOrAdmin = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  return useQuery({
    queryKey: ['admin', 'feedback', 'detail', feedbackId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      if (!feedbackId) throw new Error('Feedback ID required')
      const authHeaders = await getAuthHeaders()
      const result = await getBetaFeedbackById({
        data: {
          feedbackId,
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback')
      }

      return result.feedback
    },
    enabled: !!currentUser?.id && !!feedbackId && isModeratorOrAdmin,
    staleTime: 0,
    refetchOnMount: true,
  })
}

/**
 * Hook for marking beta feedback as reviewed (admin only)
 */
export function useMarkBetaFeedbackReviewed() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()

  return useMutation({
    mutationFn: async (feedbackId: string) => {
      const authHeaders = await getAuthHeaders()
      const result = await markBetaFeedbackReviewed({
        data: {
          feedbackId,
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark feedback as reviewed')
      }

      return result
    },
    onSuccess: (_, feedbackId) => {
      toast.success('Feedback marked as reviewed')
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'detail', feedbackId] })
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toast.error(parsed.message)
    },
  })
}
