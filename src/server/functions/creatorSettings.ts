/**
 * Creator Settings server functions
 * Handles reading and updating creator copyright/licensing preferences
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'

const updateCreatorSettingsSchema = z.object({
	copyrightLicensePreset: z
		.enum([
			'All Rights Reserved',
			'CC0',
			'CC-BY-4.0',
			'CC-BY-SA-4.0',
			'CC-BY-NC-4.0',
			'CUSTOM',
		])
		.nullable()
		.optional(),
	copyrightLicenseCustom: z.string().max(100).nullable().optional(),
	copyrightHolder: z.string().max(200).nullable().optional(),
	copyrightRights: z.string().max(1000).nullable().optional(),
})

export type CreatorSettingsInput = z.infer<typeof updateCreatorSettingsSchema>

export const LICENSE_PRESETS = [
	'All Rights Reserved',
	'CC0',
	'CC-BY-4.0',
	'CC-BY-SA-4.0',
	'CC-BY-NC-4.0',
	'CUSTOM',
] as const

export type LicensePreset = (typeof LICENSE_PRESETS)[number]

export const getCreatorSettings = createServerFn({
	method: 'POST',
}).handler(async (input: unknown) => {
	try {
		const result = await withAuth(z.object({}), input)
		if (!result) {
			return { success: false as const, error: 'Authentication required' }
		}

		const { auth } = result
		// Dynamic import to avoid leaking DB into client bundle
		const { getCreatorSettingsByUserId } = await import(
			'@/server/utils/creator-settings'
		)
		const settings = await getCreatorSettingsByUserId(auth.userId)

		return {
			success: true as const,
			settings: settings
				? {
						copyrightLicensePreset: settings.copyrightLicensePreset,
						copyrightLicenseCustom: settings.copyrightLicenseCustom,
						copyrightHolder: settings.copyrightHolder,
						copyrightRights: settings.copyrightRights,
					}
				: null,
		}
	} catch (error) {
		console.error('[getCreatorSettings] Error:', error)
		return {
			success: false as const,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
})

export const updateCreatorSettingsFn = createServerFn({
	method: 'POST',
}).handler(async (input: unknown) => {
	try {
		const result = await withAuth(updateCreatorSettingsSchema, input)
		if (!result) {
			return { success: false as const, error: 'Authentication required' }
		}

		const { auth, input: data } = result

		// Dynamic import to avoid leaking DB into client bundle
		const { upsertCreatorSettings } = await import(
			'@/server/utils/creator-settings'
		)
		const updated = await upsertCreatorSettings(auth.userId, data)

		return {
			success: true as const,
			settings: {
				copyrightLicensePreset: updated.copyrightLicensePreset,
				copyrightLicenseCustom: updated.copyrightLicenseCustom,
				copyrightHolder: updated.copyrightHolder,
				copyrightRights: updated.copyrightRights,
			},
		}
	} catch (error) {
		console.error('[updateCreatorSettings] Error:', error)
		return {
			success: false as const,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
})
