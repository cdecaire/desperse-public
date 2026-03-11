/**
 * Lightweight profile metadata fetcher for SEO/OG tags
 */

import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export interface ProfileMeta {
	displayName: string
	slug: string
	bio: string | null
	avatarUrl: string | null
	headerUrl: string | null
}

/**
 * Fetch minimal profile metadata for OG/meta tags.
 */
export async function getProfileMeta(
	slug: string,
): Promise<ProfileMeta | null> {
	try {
		const result = await db
			.select({
				displayName: users.displayName,
				usernameSlug: users.usernameSlug,
				bio: users.bio,
				avatarUrl: users.avatarUrl,
				headerBgUrl: users.headerBgUrl,
			})
			.from(users)
			.where(eq(users.usernameSlug, slug))
			.limit(1)

		if (result.length === 0) return null

		const row = result[0]
		return {
			displayName: row.displayName || row.usernameSlug,
			slug: row.usernameSlug,
			bio: row.bio,
			avatarUrl: row.avatarUrl,
			headerUrl: row.headerBgUrl,
		}
	} catch (error) {
		console.error("[getProfileMeta] Failed to fetch profile metadata:", error)
		return null
	}
}
