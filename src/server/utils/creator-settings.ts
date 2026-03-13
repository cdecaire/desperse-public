/**
 * Creator Settings utility functions
 * Handles DB operations for creator copyright/licensing preferences
 */

import { db } from '@/server/db'
import { creatorSettings } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export type CreatorRightsForMint = {
	license?: string
	holder?: string
	statement?: string
}

export async function getCreatorSettingsByUserId(userId: string) {
	const [row] = await db
		.select()
		.from(creatorSettings)
		.where(eq(creatorSettings.userId, userId))
		.limit(1)

	return row ?? null
}

export async function upsertCreatorSettings(
	userId: string,
	data: {
		copyrightLicensePreset?: string | null
		copyrightLicenseCustom?: string | null
		copyrightHolder?: string | null
		copyrightRights?: string | null
	},
) {
	const existing = await getCreatorSettingsByUserId(userId)

	if (existing) {
		const [updated] = await db
			.update(creatorSettings)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(creatorSettings.userId, userId))
			.returning()

		return updated
	}

	const [created] = await db
		.insert(creatorSettings)
		.values({
			userId,
			...data,
		})
		.returning()

	return created
}

/**
 * Returns the resolved rights info for NFT metadata stamping.
 * Resolves preset vs custom into a single license string.
 */
export async function getCreatorRightsForMint(
	userId: string,
): Promise<CreatorRightsForMint | null> {
	const settings = await getCreatorSettingsByUserId(userId)
	if (!settings) return null

	const hasLicense = settings.copyrightLicensePreset
	const hasHolder = settings.copyrightHolder
	const hasStatement = settings.copyrightRights

	// If nothing is set, return null
	if (!hasLicense && !hasHolder && !hasStatement) return null

	const license =
		settings.copyrightLicensePreset === 'CUSTOM'
			? settings.copyrightLicenseCustom || undefined
			: settings.copyrightLicensePreset || undefined

	return {
		license,
		holder: settings.copyrightHolder || undefined,
		statement: settings.copyrightRights || undefined,
	}
}
