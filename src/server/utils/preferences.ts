/**
 * User preferences utilities for server functions and REST API endpoints.
 */

import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { authenticateWithToken } from "@/server/auth"
import { eq } from "drizzle-orm"
import {
	mergePreferencesWithDefaults,
	type DesignThemeOption,
	type ExplorerOption,
	type ThemeOption,
	type UserPreferencesJson,
} from "@/lib/user-preferences"

export {
	defaultPreferences,
	designThemeOptions,
	explorerOptions,
	getExplorerUrl,
	themeOptions,
} from "@/lib/user-preferences"
export type {
	DesignThemeOption,
	ExplorerOption,
	ThemeOption,
	UserPreferencesJson,
} from "@/lib/user-preferences"

export interface PreferencesResult {
	success: boolean
	preferences?: UserPreferencesJson
	error?: string
}

export interface UpdatePreferencesInput {
	theme?: ThemeOption
	designTheme?: DesignThemeOption
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
		allowTippers?: boolean
		tipMinAmount?: number
	}
}

export async function getPreferencesForUser(
	userId: string,
): Promise<PreferencesResult> {
	const [user] = await db
		.select({ preferences: users.preferences })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (!user) {
		return { success: false, error: "User not found" }
	}

	return {
		success: true,
		preferences: mergePreferencesWithDefaults(user.preferences as UserPreferencesJson),
	}
}

export async function updatePreferencesForUser(
	userId: string,
	updates: UpdatePreferencesInput,
): Promise<PreferencesResult> {
	const [user] = await db
		.select({ preferences: users.preferences })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (!user) {
		return { success: false, error: "User not found" }
	}

	const currentPrefs = (user.preferences as UserPreferencesJson) || {}
	const newPrefs: UserPreferencesJson = {
		...currentPrefs,
	}

	if (updates.theme !== undefined) {
		newPrefs.theme = updates.theme
	}
	if (updates.designTheme !== undefined) {
		newPrefs.designTheme = updates.designTheme
	}
	if (updates.explorer !== undefined) {
		newPrefs.explorer = updates.explorer
	}

	if (updates.notifications) {
		newPrefs.notifications = {
			...currentPrefs.notifications,
			...updates.notifications,
		}
	}

	if (updates.messaging) {
		newPrefs.messaging = {
			...currentPrefs.messaging,
			...updates.messaging,
		}
	}

	const [updated] = await db
		.update(users)
		.set({
			preferences: newPrefs,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))
		.returning({ preferences: users.preferences })

	return {
		success: true,
		preferences: mergePreferencesWithDefaults(
			updated?.preferences as UserPreferencesJson,
		),
	}
}

export async function getPreferencesDirect(
	token: string,
): Promise<PreferencesResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: "Authentication required" }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : "Authentication failed"
		console.warn("[getPreferencesDirect] Auth error:", message)
		return { success: false, error: message }
	}

	return getPreferencesForUser(userId)
}

export async function updatePreferencesDirect(
	token: string,
	updates: UpdatePreferencesInput,
): Promise<PreferencesResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: "Authentication required" }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : "Authentication failed"
		console.warn("[updatePreferencesDirect] Auth error:", message)
		return { success: false, error: message }
	}

	return updatePreferencesForUser(userId, updates)
}
