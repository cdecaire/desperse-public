/**
 * Creator Settings Hook
 * Provides access to creator copyright/licensing settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	getCreatorSettings,
	updateCreatorSettingsFn,
	type CreatorSettingsInput,
} from '@/server/functions/creatorSettings'
import { useAuth } from './useAuth'

export type CreatorSettingsData = {
	copyrightLicensePreset?: string | null
	copyrightLicenseCustom?: string | null
	copyrightHolder?: string | null
	copyrightRights?: string | null
}

export const creatorSettingsQueryKey = ['creator-settings']

export function useCreatorSettings() {
	const { isAuthenticated, getAuthHeaders } = useAuth()
	const queryClient = useQueryClient()

	const { data, isLoading, error } = useQuery({
		queryKey: creatorSettingsQueryKey,
		queryFn: async () => {
			const authHeaders = await getAuthHeaders()
			if (!authHeaders.Authorization) {
				return null
			}
			const result = await getCreatorSettings({
				data: { _authorization: authHeaders.Authorization },
			} as any)

			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch creator settings')
			}

			return result.settings as CreatorSettingsData | null
		},
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000,
		retry: false,
	})

	const updateMutation = useMutation({
		mutationFn: async (updates: CreatorSettingsInput) => {
			const authHeaders = await getAuthHeaders()
			const result = await updateCreatorSettingsFn({
				data: {
					...updates,
					_authorization: authHeaders.Authorization,
				},
			} as any)

			if (!result.success) {
				throw new Error(result.error || 'Failed to update settings')
			}

			return result.settings as CreatorSettingsData
		},
		onMutate: async (updates) => {
			await queryClient.cancelQueries({ queryKey: creatorSettingsQueryKey })
			const previous =
				queryClient.getQueryData<CreatorSettingsData | null>(
					creatorSettingsQueryKey,
				)

			queryClient.setQueryData<CreatorSettingsData | null>(
				creatorSettingsQueryKey,
				(old) => ({
					...(old || {}),
					...updates,
				}),
			)

			return { previous }
		},
		onSuccess: (data) => {
			queryClient.setQueryData(creatorSettingsQueryKey, data)
		},
		onError: (_err, _updates, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(creatorSettingsQueryKey, context.previous)
			}
		},
	})

	return {
		settings: data ?? null,
		isLoading,
		error,
		isUpdating: updateMutation.isPending,
		updateSettings: updateMutation.mutate,
	}
}
