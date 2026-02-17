/**
 * Report hooks
 * Handles content reporting functionality
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReport } from '@/server/functions/reports'
import { getUnreviewedReportsCount } from '@/server/functions/admin'
import { toast } from '@/hooks/use-toast'
import { parseAppError } from '@/lib/errorUtils'
import { useCurrentUser } from './useCurrentUser'
import { useAuth } from './useAuth'

interface CreateReportInput {
  contentType: 'post' | 'comment' | 'dm_thread'
  contentId: string
  reasons: string[]
  details: string | null
}

/**
 * Hook for creating content reports
 */
export function useCreateReport() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  
  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const authHeaders = await getAuthHeaders()
      const result = await createReport({
        data: {
          ...input,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create report')
      }
      
      return result.report
    },
    onSuccess: () => {
      toast.success('Report submitted. Thanks for helping keep the community safe.')
      // Invalidate notification counters (includes unreviewed reports count)
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    },
    onError: (error) => {
      const parsed = parseAppError(error)
      toast.error(parsed.message)
    },
  })
}

/**
 * Hook to get count of unreviewed reports for moderators/admins
 * Polls every 60 seconds and refetches on window focus
 */
export function useUnreviewedReportsCount() {
  const { user: currentUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const isModeratorOrAdmin = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  return useQuery({
    queryKey: ['admin', 'unreviewed-count', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const result = await getUnreviewedReportsCount({
        data: {
          _authorization: authHeaders.Authorization,
        },
      } as never)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch unreviewed reports count')
      }
      return result.count
    },
    enabled: !!currentUser?.id && isModeratorOrAdmin,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale to ensure fresh data
  })
}

