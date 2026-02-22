/**
 * DM Preferences Hook
 * Provides access to messaging preferences stored in users.preferences.messaging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDmPreferences, updateDmPreferences } from '@/server/functions/dm-preferences'
import type { DmPreferences } from '@/server/functions/dm-preferences'
import { useAuth } from './useAuth'

export type { DmPreferences }

export const dmPreferencesQueryKey = ['dm-preferences']

const defaultDmPreferences: DmPreferences = {
  dmEnabled: true,
  allowBuyers: true,
  allowCollectors: true,
  collectorMinCount: 3,
  allowTippers: true,
  tipMinAmount: 50,
}

/**
 * Hook to access and update DM preferences
 */
export function useDmPreferences() {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  // Fetch DM preferences from server
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: dmPreferencesQueryKey,
    queryFn: async () => {
      const authHeaders = await getAuthHeaders()
      const result = await getDmPreferences({
        data: { _authorization: authHeaders.Authorization },
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch DM preferences')
      }

      return result.data as DmPreferences
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DmPreferences>) => {
      const authHeaders = await getAuthHeaders()
      const result = await updateDmPreferences({
        data: {
          ...updates,
          _authorization: authHeaders.Authorization,
        },
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update DM preferences')
      }

      return result.data as DmPreferences
    },
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: dmPreferencesQueryKey })

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<DmPreferences>(dmPreferencesQueryKey)

      // Optimistically update
      queryClient.setQueryData<DmPreferences>(dmPreferencesQueryKey, (old) => {
        const current = old || defaultDmPreferences
        return {
          ...current,
          ...updates,
        }
      })

      return { previousPreferences }
    },
    onError: (_err, _updates, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(dmPreferencesQueryKey, context.previousPreferences)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: dmPreferencesQueryKey })
    },
  })

  const preferences = data ?? defaultDmPreferences

  // Helper to check if all messaging sub-options would be off
  const wouldAllBeOff = (overrides: Partial<DmPreferences>) => {
    const buyers = overrides.allowBuyers ?? preferences.allowBuyers
    const collectors = overrides.allowCollectors ?? preferences.allowCollectors
    const tippers = overrides.allowTippers ?? preferences.allowTippers
    return !buyers && !collectors && !tippers
  }

  // Convenience methods for updating preferences
  const setDmEnabled = (enabled: boolean) => {
    if (enabled && wouldAllBeOff({})) {
      // Re-enabling DMs with all sub-options off, enable all
      updateMutation.mutate({ dmEnabled: true, allowBuyers: true, allowCollectors: true, allowTippers: true })
    } else {
      updateMutation.mutate({ dmEnabled: enabled })
    }
  }

  // Auto-disable dmEnabled when all sub-options are off
  const setAllowBuyers = (enabled: boolean) => {
    if (wouldAllBeOff({ allowBuyers: enabled })) {
      updateMutation.mutate({ allowBuyers: enabled, dmEnabled: false })
    } else {
      updateMutation.mutate({ allowBuyers: enabled })
    }
  }

  const setAllowCollectors = (enabled: boolean) => {
    if (wouldAllBeOff({ allowCollectors: enabled })) {
      updateMutation.mutate({ allowCollectors: enabled, dmEnabled: false })
    } else {
      updateMutation.mutate({ allowCollectors: enabled })
    }
  }

  const setAllowTippers = (enabled: boolean) => {
    if (wouldAllBeOff({ allowTippers: enabled })) {
      updateMutation.mutate({ allowTippers: enabled, dmEnabled: false })
    } else {
      updateMutation.mutate({ allowTippers: enabled })
    }
  }

  const setCollectorMinCount = (count: number) => {
    updateMutation.mutate({ collectorMinCount: Math.max(1, Math.min(100, Math.round(count))) })
  }

  const setTipMinAmount = (amount: number) => {
    updateMutation.mutate({ tipMinAmount: Math.max(0.01, Math.min(10000, amount)) })
  }

  return {
    preferences,
    isLoading,
    error,
    isUpdating: updateMutation.isPending,
    updatePreferences: updateMutation.mutate,
    setDmEnabled,
    setAllowBuyers,
    setAllowCollectors,
    setAllowTippers,
    setCollectorMinCount,
    setTipMinAmount,
  }
}
