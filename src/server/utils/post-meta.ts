/**
 * Lightweight post metadata fetcher for SEO/OG tags
 * Used by route loaders to populate head meta tags during SSR
 */

import { db } from "@/server/db"
import { posts, users } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"

export interface PostMeta {
	title: string
	description: string
	imageUrl: string | null
	type: "post" | "collectible" | "edition"
	creatorName: string
	creatorSlug: string
	creatorAvatar: string | null
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"]

function isImageUrl(url: string): boolean {
	const ext = url.split(".").pop()?.toLowerCase()?.split("?")[0]
	return IMAGE_EXTENSIONS.includes(ext || "")
}

/**
 * Fetch minimal post metadata for OG/meta tags.
 * No auth required — only returns public, non-hidden, non-deleted posts.
 */
export async function getPostMeta(
	postId: string,
): Promise<PostMeta | null> {
	try {
		const result = await db
			.select({
				caption: posts.caption,
				type: posts.type,
				mediaUrl: posts.mediaUrl,
				coverUrl: posts.coverUrl,
				nftName: posts.nftName,
				nftDescription: posts.nftDescription,
				displayName: users.displayName,
				usernameSlug: users.usernameSlug,
				avatarUrl: users.avatarUrl,
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(
				and(
					eq(posts.id, postId),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false),
				),
			)
			.limit(1)

		if (result.length === 0) return null

		const row = result[0]
		const creatorName = row.displayName || row.usernameSlug

		// Build title
		let title: string
		if (row.nftName) {
			title = `${row.nftName} by ${creatorName}`
		} else if (row.type === "edition") {
			title = `Edition by ${creatorName}`
		} else if (row.type === "collectible") {
			title = `Collectible by ${creatorName}`
		} else {
			title = `Post by ${creatorName}`
		}

		// Build description
		let description: string
		if (row.nftDescription) {
			description = row.nftDescription.slice(0, 200)
		} else if (row.caption) {
			description = row.caption.slice(0, 200)
		} else {
			description = `Check out this ${row.type} by ${creatorName} on Desperse`
		}

		// Choose best image for OG preview
		// Prefer coverUrl (set for video/audio/doc posts), otherwise use mediaUrl if it's an image
		let imageUrl: string | null = null
		if (row.coverUrl) {
			imageUrl = row.coverUrl
		} else if (row.mediaUrl && isImageUrl(row.mediaUrl)) {
			imageUrl = row.mediaUrl
		}

		return {
			title,
			description,
			imageUrl,
			type: row.type,
			creatorName,
			creatorSlug: row.usernameSlug,
			creatorAvatar: row.avatarUrl,
		}
	} catch (error) {
		console.error("[getPostMeta] Failed to fetch post metadata:", error)
		return null
	}
}
