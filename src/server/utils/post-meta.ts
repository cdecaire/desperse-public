/**
 * Lightweight post metadata fetcher for SEO/OG tags
 * Used by route loaders to populate head meta tags during SSR
 */

import { db } from "@/server/db"
import { posts, users } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"

export interface PostMeta {
	title: string
	/** Short title for OG image (no "by creator" suffix — avatar row handles attribution) */
	shortTitle: string
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

		// Build title (full for og:title meta tag, short for OG image where avatar row shows creator)
		let shortTitle: string
		if (row.nftName) {
			shortTitle = row.nftName
		} else if (row.caption) {
			// Use caption as title for standard posts (truncated)
			shortTitle = row.caption.length > 80 ? `${row.caption.slice(0, 77)}...` : row.caption
		} else if (row.type === "edition") {
			shortTitle = "Edition"
		} else if (row.type === "collectible") {
			shortTitle = "Collectible"
		} else {
			shortTitle = "Post"
		}

		const title = row.nftName
			? `${row.nftName} by ${creatorName}`
			: `${row.type.charAt(0).toUpperCase() + row.type.slice(1)} by ${creatorName}`

		// Build description (avoid duplicating shortTitle when caption is used as both)
		let description: string
		if (row.nftDescription) {
			description = row.nftDescription.slice(0, 200)
		} else if (row.nftName && row.caption) {
			// NFT post: nftName is shortTitle, caption is description
			description = row.caption.slice(0, 200)
		} else if (!row.nftName && row.caption) {
			// Standard post: caption is already the shortTitle — no extra description needed
			description = ""
		} else {
			description = ""
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
			shortTitle,
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
