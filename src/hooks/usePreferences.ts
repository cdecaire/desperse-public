/**
 * User Preferences Hook
 * Provides access to database-synced user preferences (JSONB on users table)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserPreferences, updateUserPreferences, defaultPreferences } from '@/server/functions/preferences'
import type { UserPreferencesJson } from '@/server/db/schema'
import type { ExplorerOption, ThemeOption } from '@/server/functions/preferences'
import { useAuth } from './useAuth'

export type { UserPreferencesJson, ExplorerOption, ThemeOption }

export const preferencesQueryKey = ['userPreferences']

/**
 * Hook to access and update user preferences
 */
export function usePreferences() {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  // Fetch preferences from server
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: preferencesQueryKey,
    queryFn: async () => {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders.Authorization) {
        // Token expired or unavailable — return cached data or defaults silently
        return queryClient.getQueryData<UserPreferencesJson>(preferencesQueryKey) ?? defaultPreferences
      }
      const result = await getUserPreferences({
        data: { _authorization: authHeaders.Authorization },
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch preferences')
      }

      return result.preferences as UserPreferencesJson
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry auth failures
  })

  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferencesJson>) => {
      const authHeaders = await getAuthHeaders()
      const result = await updateUserPreferences({
        data: {
          ...updates,
          _authorization: authHeaders.Authorization,
        },
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update preferences')
      }

      return result.preferences as UserPreferencesJson
    },
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: preferencesQueryKey })

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<UserPreferencesJson>(preferencesQueryKey)

      // Optimistically update
      queryClient.setQueryData<UserPreferencesJson>(preferencesQueryKey, (old) => {
        const current = old || defaultPreferences
        return {
          ...current,
          ...updates,
          notifications: {
            ...current.notifications,
            ...updates.notifications,
          },
        }
      })

      return { previousPreferences }
    },
    onError: (_err, _updates, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(preferencesQueryKey, context.previousPreferences)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: preferencesQueryKey })
    },
  })

  const preferences = data ?? defaultPreferences

  // Convenience methods for updating preferences
  const setTheme = (theme: ThemeOption) => updateMutation.mutate({ theme })
  const setExplorer = (explorer: ExplorerOption) => updateMutation.mutate({ explorer })

  // Notification preference setters
  const setNotifyFollows = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { follows: enabled } })
  const setNotifyLikes = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { likes: enabled } })
  const setNotifyComments = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { comments: enabled } })
  const setNotifyCollects = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { collects: enabled } })
  const setNotifyPurchases = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { purchases: enabled } })
  const setNotifyMentions = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { mentions: enabled } })
  const setNotifyMessages = (enabled: boolean) =>
    updateMutation.mutate({ notifications: { messages: enabled } })

  return {
    preferences,
    isLoading,
    error,
    isUpdating: updateMutation.isPending,
    updatePreferences: updateMutation.mutate,
    // Theme
    setTheme,
    // Explorer
    setExplorer,
    // Notifications
    setNotifyFollows,
    setNotifyLikes,
    setNotifyComments,
    setNotifyCollects,
    setNotifyPurchases,
    setNotifyMentions,
    setNotifyMessages,
  }
}
