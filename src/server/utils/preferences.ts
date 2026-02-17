/**
 * User preferences utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { users, type UserPreferencesJson } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

// Explorer options
export const explorerOptions = ['orb', 'solscan', 'solana-explorer', 'solanafm'] as const
export type ExplorerOption = (typeof explorerOptions)[number]

// Theme options
export const themeOptions = ['light', 'dark', 'system'] as const
export type ThemeOption = (typeof themeOptions)[number]

// Default preferences
export const defaultPreferences: UserPreferencesJson = {
	theme: 'system',
	explorer: 'orb',
	notifications: {
		follows: true,
		likes: true,
		comments: true,
		collects: true,
		purchases: true,
		mentions: true,
		messages: true,
	},
	messaging: {
		dmEnabled: true,
		allowBuyers: true,
		allowCollectors: true,
		collectorMinCount: 3,
	},
}

// Merge preferences with defaults
function mergeWithDefaults(prefs: UserPreferencesJson | null | undefined): UserPreferencesJson {
	const stored = prefs || {}
	return {
		theme: stored.theme ?? defaultPreferences.theme,
		explorer: stored.explorer ?? defaultPreferences.explorer,
		notifications: {
			follows: stored.notifications?.follows ?? defaultPreferences.notifications?.follows,
			likes: stored.notifications?.likes ?? defaultPreferences.notifications?.likes,
			comments: stored.notifications?.comments ?? defaultPreferences.notifications?.comments,
			collects: stored.notifications?.collects ?? defaultPreferences.notifications?.collects,
			purchases: stored.notifications?.purchases ?? defaultPreferences.notifications?.purchases,
			mentions: stored.notifications?.mentions ?? defaultPreferences.notifications?.mentions,
			messages: stored.notifications?.messages ?? defaultPreferences.notifications?.messages,
		},
		messaging: {
			dmEnabled: stored.messaging?.dmEnabled ?? defaultPreferences.messaging?.dmEnabled,
			allowBuyers: stored.messaging?.allowBuyers ?? defaultPreferences.messaging?.allowBuyers,
			allowCollectors: stored.messaging?.allowCollectors ?? defaultPreferences.messaging?.allowCollectors,
			collectorMinCount: stored.messaging?.collectorMinCount ?? defaultPreferences.messaging?.collectorMinCount,
		},
	}
}

export interface PreferencesResult {
	success: boolean
	preferences?: UserPreferencesJson
	error?: string
}

/**
 * Get user preferences (core logic)
 */
export async function getPreferencesDirect(token: string): Promise<PreferencesResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message = authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[getPreferencesDirect] Auth error:', message)
		return { success: false, error: message }
	}

	// Fetch user with preferences
	const [user] = await db
		.select({ preferences: users.preferences })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (!user) {
		return { success: false, error: 'User not found' }
	}

	// Merge with defaults and return
	const preferences = mergeWithDefaults(user.preferences as UserPreferencesJson)

	return {
		success: true,
		preferences,
	}
}

export interface UpdatePreferencesInput {
	theme?: ThemeOption
	explorer?: ExplorerOption
	notifications?: {
		follows?: boolean
		likes?: boolean
		comments?: boolean
		collects?: boolean
		purchases?: boolean
		mentions?: boolean
		messages?: boolean
	}
	messaging?: {
		dmEnabled?: boolean
		allowBuyers?: boolean
		allowCollectors?: boolean
		collectorMinCount?: number
	}
}

/**
 * Update user preferences (core logic)
 * Performs a partial/merge update on the preferences JSONB
 */
export async function updatePreferencesDirect(
	token: string,
	updates: UpdatePreferencesInput
): Promise<PreferencesResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message = authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[updatePreferencesDirect] Auth error:', message)
		return { success: false, error: message }
	}

	// Fetch current preferences
	const [user] = await db
		.select({ preferences: users.preferences })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (!user) {
		return { success: false, error: 'User not found' }
	}

	// Merge updates with current preferences
	const currentPrefs = (user.preferences as UserPreferencesJson) || {}
	const newPrefs: UserPreferencesJson = {
		...currentPrefs,
	}

	// Apply top-level updates
	if (updates.theme !== undefined) {
		newPrefs.theme = updates.theme
	}
	if (updates.explorer !== undefined) {
		newPrefs.explorer = updates.explorer
	}

	// Merge notification preferences
	if (updates.notifications) {
		newPrefs.notifications = {
			...currentPrefs.notifications,
			...updates.notifications,
		}
	}

	// Merge messaging preferences
	if (updates.messaging) {
		newPrefs.messaging = {
			...currentPrefs.messaging,
			...updates.messaging,
		}
	}

	// Update user record
	const [updated] = await db
		.update(users)
		.set({
			preferences: newPrefs,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))
		.returning({ preferences: users.preferences })

	// Return merged with defaults
	const preferences = mergeWithDefaults(updated.preferences as UserPreferencesJson)

	return {
		success: true,
		preferences,
	}
}
