/**
 * Post transfer history utility
 * Queries DB for provenance/collector data for minted posts
 */

import { db } from '@/server/db'
import { posts, purchases, collections, users } from '@/server/db/schema'
import { eq, and, count, desc, notInArray } from 'drizzle-orm'

export async function getPostTransferHistoryDirect(postId: string, blockedUserIds: Set<string> = new Set()) {
	// Fetch post to determine asset type
	const [post] = await db
		.select({
			id: posts.id,
			type: posts.type,
			masterMint: posts.masterMint,
			currentSupply: posts.currentSupply,
			maxSupply: posts.maxSupply,
			mintedAt: posts.mintedAt,
		})
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1)

	if (!post) {
		return { found: false as const }
	}

	const isEdition = post.type === 'edition'
	const isCollectible = post.type === 'collectible'

	if (!isEdition && !isCollectible) {
		return { found: true as const, transfers: [], summary: null }
	}

	// Build summary from DB (avoids expensive on-chain calls)
	let collectorCount = 0
	let recentCollectors: Array<{
		usernameSlug: string
		displayName: string | null
		createdAt: Date
		txSignature: string | null
	}> = []

	const excludeBlocked = blockedUserIds.size > 0

	if (isEdition) {
		const [countResult] = await db
			.select({ count: count() })
			.from(purchases)
			.where(
				and(
					eq(purchases.postId, postId),
					eq(purchases.status, 'confirmed'),
					excludeBlocked ? notInArray(purchases.userId, Array.from(blockedUserIds)) : undefined,
				),
			)
		collectorCount = countResult?.count || 0

		recentCollectors = await db
			.select({
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				createdAt: purchases.createdAt,
				txSignature: purchases.txSignature,
			})
			.from(purchases)
			.innerJoin(users, eq(purchases.userId, users.id))
			.where(
				and(
					eq(purchases.postId, postId),
					eq(purchases.status, 'confirmed'),
					excludeBlocked ? notInArray(purchases.userId, Array.from(blockedUserIds)) : undefined,
				),
			)
			.orderBy(desc(purchases.createdAt))
			.limit(10)
	} else {
		const [countResult] = await db
			.select({ count: count() })
			.from(collections)
			.where(
				and(
					eq(collections.postId, postId),
					eq(collections.status, 'confirmed'),
					excludeBlocked ? notInArray(collections.userId, Array.from(blockedUserIds)) : undefined,
				),
			)
		collectorCount = countResult?.count || 0

		recentCollectors = await db
			.select({
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				createdAt: collections.createdAt,
				txSignature: collections.txSignature,
			})
			.from(collections)
			.innerJoin(users, eq(collections.userId, users.id))
			.where(
				and(
					eq(collections.postId, postId),
					eq(collections.status, 'confirmed'),
					excludeBlocked ? notInArray(collections.userId, Array.from(blockedUserIds)) : undefined,
				),
			)
			.orderBy(desc(collections.createdAt))
			.limit(10)
	}

	const summary = {
		totalMinted: post.currentSupply || 0,
		maxSupply: post.maxSupply,
		collectorCount,
		mintedAt: post.mintedAt?.toISOString() || null,
		latestActivity:
			recentCollectors.length > 0
				? recentCollectors[0].createdAt.toISOString()
				: null,
	}

	const transfers = recentCollectors.map((c) => ({
		user: {
			usernameSlug: c.usernameSlug,
			displayName: c.displayName,
		},
		type: 'collected' as const,
		timestamp: c.createdAt.toISOString(),
		txSignature: c.txSignature,
	}))

	return { found: true as const, summary, transfers }
}
