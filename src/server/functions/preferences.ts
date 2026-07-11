/**
 * User preferences server functions.
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { withAuth } from "@/server/auth"
import {
	designThemeOptions,
	explorerOptions,
	getPreferencesForUser,
	themeOptions,
	updatePreferencesForUser,
} from "@/server/utils/preferences"

const updatePreferencesSchema = z.object({
	theme: z.enum(themeOptions).optional(),
	designTheme: z.enum(designThemeOptions).optional(),
	explorer: z.enum(explorerOptions).optional(),
	notifications: z
		.object({
			follows: z.boolean().optional(),
			likes: z.boolean().optional(),
			comments: z.boolean().optional(),
			collects: z.boolean().optional(),
			purchases: z.boolean().optional(),
			mentions: z.boolean().optional(),
			messages: z.boolean().optional(),
		})
		.optional(),
	messaging: z
		.object({
			dmEnabled: z.boolean().optional(),
			allowBuyers: z.boolean().optional(),
			allowCollectors: z.boolean().optional(),
			collectorMinCount: z.number().int().min(1).max(100).optional(),
			allowTippers: z.boolean().optional(),
			tipMinAmount: z.number().positive().max(10000).optional(),
		})
		.optional(),
	privacy: z
		.object({
			leaderboardParticipation: z.boolean().optional(),
		})
		.optional(),
})

export const getUserPreferences = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	try {
		const result = await withAuth(z.object({}), input)
		if (!result) {
			return { success: false, error: "Authentication required", status: 401 }
		}

		const preferencesResult = await getPreferencesForUser(result.auth.userId)
		return preferencesResult.success
			? { success: true, preferences: preferencesResult.preferences }
			: { ...preferencesResult, status: 404 }
	} catch (error) {
		console.error(
			"[getUserPreferences] Error fetching user preferences:",
			error instanceof Error ? error.message : "Unknown error",
		)
		return { success: false, error: "Failed to fetch preferences", status: 500 }
	}
})

export const updateUserPreferences = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	try {
		const result = await withAuth(updatePreferencesSchema, input)
		if (!result) {
			return { success: false, error: "Authentication required", status: 401 }
		}

		const preferencesResult = await updatePreferencesForUser(
			result.auth.userId,
			result.input,
		)

		return preferencesResult.success
			? { success: true, preferences: preferencesResult.preferences }
			: { ...preferencesResult, status: 404 }
	} catch (error) {
		console.error(
			"[updateUserPreferences] Error updating user preferences:",
			error instanceof Error ? error.message : "Unknown error",
		)
		return { success: false, error: "Failed to update preferences", status: 500 }
	}
})
