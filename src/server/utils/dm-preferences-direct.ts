/**
 * DM Preferences Direct utility functions for REST API endpoints.
 * Extracted from server functions to avoid createServerFn return issues.
 */

import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import type { UserPreferencesJson } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

// Default DM preferences
const DM_DEFAULTS = {
	dmEnabled: true,
	allowBuyers: true,
	allowCollectors: true,
	collectorMinCount: 3,
	allowTippers: true,
	tipMinAmount: 50,
} as const

export interface DmPreferences {
	dmEnabled: boolean
	allowBuyers: boolean
	allowCollectors: boolean
	collectorMinCount: number
	allowTippers: boolean
	tipMinAmount: number
}

export interface GetPreferencesResult {
	success: boolean
	preferences?: DmPreferences
	error?: string
}

/**
 * Get current user's DM preferences with defaults applied
 */
export async function getDmPreferencesDirect(
	token: string
): Promise<GetPreferencesResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [user] = await db
			.select({ preferences: users.preferences })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!user) {
			return { success: false, error: 'User not found' }
		}

		const messaging = user.preferences?.messaging

		return {
			success: true,
			preferences: {
				dmEnabled: messaging?.dmEnabled ?? DM_DEFAULTS.dmEnabled,
				allowBuyers: messaging?.allowBuyers ?? DM_DEFAULTS.allowBuyers,
				allowCollectors:
					messaging?.allowCollectors ?? DM_DEFAULTS.allowCollectors,
				collectorMinCount:
					messaging?.collectorMinCount ?? DM_DEFAULTS.collectorMinCount,
				allowTippers:
					messaging?.allowTippers ?? DM_DEFAULTS.allowTippers,
				tipMinAmount:
					messaging?.tipMinAmount ?? DM_DEFAULTS.tipMinAmount,
			},
		}
	} catch (error) {
		console.error(
			'Error in getDmPreferencesDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to get DM preferences' }
	}
}

export interface UpdatePreferencesResult {
	success: boolean
	preferences?: DmPreferences
	error?: string
}

/**
 * Update current user's DM preferences (partial update, merge with existing)
 */
export async function updateDmPreferencesDirect(
	token: string,
	updates: {
		dmEnabled?: boolean
		allowBuyers?: boolean
		allowCollectors?: boolean
		collectorMinCount?: number
		allowTippers?: boolean
		tipMinAmount?: number
	}
): Promise<UpdatePreferencesResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [user] = await db
			.select({ preferences: users.preferences })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!user) {
			return { success: false, error: 'User not found' }
		}

		// Merge with existing preferences
		const currentPrefs = user.preferences ?? {}
		const currentMessaging = currentPrefs.messaging ?? {}

		const newMessaging = {
			...currentMessaging,
			...(updates.dmEnabled !== undefined && {
				dmEnabled: updates.dmEnabled,
			}),
			...(updates.allowBuyers !== undefined && {
				allowBuyers: updates.allowBuyers,
			}),
			...(updates.allowCollectors !== undefined && {
				allowCollectors: updates.allowCollectors,
			}),
			...(updates.collectorMinCount !== undefined && {
				collectorMinCount: updates.collectorMinCount,
			}),
			...(updates.allowTippers !== undefined && {
				allowTippers: updates.allowTippers,
			}),
			...(updates.tipMinAmount !== undefined && {
				tipMinAmount: updates.tipMinAmount,
			}),
		}

		const newPrefs: UserPreferencesJson = {
			...currentPrefs,
			messaging: newMessaging,
		}

		await db
			.update(users)
			.set({
				preferences: newPrefs,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))

		return {
			success: true,
			preferences: {
				dmEnabled: newMessaging.dmEnabled ?? DM_DEFAULTS.dmEnabled,
				allowBuyers:
					newMessaging.allowBuyers ?? DM_DEFAULTS.allowBuyers,
				allowCollectors:
					newMessaging.allowCollectors ?? DM_DEFAULTS.allowCollectors,
				collectorMinCount:
					newMessaging.collectorMinCount ??
					DM_DEFAULTS.collectorMinCount,
				allowTippers:
					newMessaging.allowTippers ?? DM_DEFAULTS.allowTippers,
				tipMinAmount:
					newMessaging.tipMinAmount ?? DM_DEFAULTS.tipMinAmount,
			},
		}
	} catch (error) {
		console.error(
			'Error in updateDmPreferencesDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to update DM preferences' }
	}
}
