/**
 * Post utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { posts, users, collections, purchases, postAssets, likes, comments } from '@/server/db/schema'
import { eq, and, count, isNotNull } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { isModeratorOrAdmin } from '@/server/functions/auth-helpers'

export interface GetPostResult {
	success: boolean
	post?: Record<string, unknown>
	user?: {
		id: string
		displayName: string | null
		usernameSlug: string
		avatarUrl: string | null
	}
	error?: string
}

/**
 * Get a single post by ID (core logic)
 * Supports optional authentication for isLiked/isCollected/isPurchased flags
 */
export async function getPostDirect(
	postId: string,
	token?: string | null
): Promise<GetPostResult> {
	try {
		// Optional authentication
		let userId: string | null = null
		if (token) {
			try {
				const auth = await authenticateWithToken(token)
				userId = auth?.userId || null
			} catch (authError) {
				// Optional auth - continue without user context
				console.warn('[getPostDirect] Auth error (continuing as anonymous):', authError instanceof Error ? authError.message : 'Unknown')
			}
		}

		// Check if current user is moderator/admin (can see hidden posts)
		const canSeeHidden = userId ? await isModeratorOrAdmin(userId) : false

		const result = await db
			.select({
				post: posts,
				user: {
					id: users.id,
					displayName: users.displayName,
					usernameSlug: users.usernameSlug,
					avatarUrl: users.avatarUrl,
				},
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(
				and(
					eq(posts.id, postId),
					eq(posts.isDeleted, false),
					canSeeHidden ? undefined : eq(posts.isHidden, false)
				)
			)
			.limit(1)

		if (result.length === 0) {
			return {
				success: false,
				error: 'Post not found.',
			}
		}

		// If post is hidden and user is not moderator/admin, return error
		if (result[0].post.isHidden && !canSeeHidden) {
			return {
				success: false,
				error: 'This content is not available.',
			}
		}

		// Get like count
		const likeCountResult = await db
			.select({ count: count() })
			.from(likes)
			.where(eq(likes.postId, postId))
		const likeCount = likeCountResult[0]?.count || 0

		// Get comment count
		const commentCountResult = await db
			.select({ count: count() })
			.from(comments)
			.where(eq(comments.postId, postId))
		const commentCount = commentCountResult[0]?.count || 0

		// Check if current user has liked this post
		let isLiked = false
		if (userId) {
			const [userLike] = await db
				.select({ postId: likes.postId })
				.from(likes)
				.where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
				.limit(1)
			isLiked = !!userLike
		}

		// Check if current user has collected this post
		let isCollected = false
		if (userId) {
			const [userCollection] = await db
				.select({ postId: collections.postId })
				.from(collections)
				.where(
					and(
						eq(collections.postId, postId),
						eq(collections.userId, userId),
						eq(collections.status, 'confirmed')
					)
				)
				.limit(1)
			isCollected = !!userCollection
		}

		// Get collect count and first assetId for collectibles
		let collectCount = 0
		let collectibleAssetId: string | undefined = undefined
		if (result[0].post.type === 'collectible') {
			const countResult = await db
				.select({ count: count() })
				.from(collections)
				.where(
					and(
						eq(collections.postId, postId),
						eq(collections.status, 'confirmed')
					)
				)
			collectCount = countResult[0]?.count || 0

			// Get first assetId for Orb link
			const assetIdResult = await db
				.select({
					nftMint: collections.nftMint,
				})
				.from(collections)
				.where(
					and(
						eq(collections.postId, postId),
						eq(collections.status, 'confirmed'),
						isNotNull(collections.nftMint)
					)
				)
				.orderBy(collections.createdAt)
				.limit(1)

			collectibleAssetId = assetIdResult[0]?.nftMint || undefined
		}

		// Get current supply for editions (count confirmed purchases only)
		let currentSupply = result[0].post.currentSupply || 0
		if (result[0].post.type === 'edition') {
			const purchaseCountResult = await db
				.select({ count: count() })
				.from(purchases)
				.where(
					and(
						eq(purchases.postId, postId),
						eq(purchases.status, 'confirmed')
					)
				)
			currentSupply = purchaseCountResult[0]?.count || 0
		}

		// Get assetId from postAssets for protected downloads (editions and collectibles)
		let assetId: string | undefined = undefined
		if (result[0].post.type === 'edition' || result[0].post.type === 'collectible') {
			const [asset] = await db
				.select({ id: postAssets.id })
				.from(postAssets)
				.where(eq(postAssets.postId, postId))
				.limit(1)
			assetId = asset?.id || undefined
		}

		// Get all media assets ordered by sortOrder for multi-asset posts
		const mediaAssets = await db
			.select({
				id: postAssets.id,
				url: postAssets.storageKey,
				mimeType: postAssets.mimeType,
				fileSize: postAssets.fileSize,
				sortOrder: postAssets.sortOrder,
				role: postAssets.role,
				isPreviewable: postAssets.isPreviewable,
			})
			.from(postAssets)
			.where(
				and(
					eq(postAssets.postId, postId),
					eq(postAssets.role, 'media'),
					eq(postAssets.isPreviewable, true)
				)
			)
			.orderBy(postAssets.sortOrder)

		// Get downloadable assets (non-previewable: audio, documents, 3D)
		const downloadableAssets = await db
			.select({
				id: postAssets.id,
				url: postAssets.storageKey,
				mimeType: postAssets.mimeType,
				fileSize: postAssets.fileSize,
				sortOrder: postAssets.sortOrder,
			})
			.from(postAssets)
			.where(
				and(
					eq(postAssets.postId, postId),
					eq(postAssets.role, 'media'),
					eq(postAssets.isPreviewable, false)
				)
			)
			.orderBy(postAssets.sortOrder)

		// Get current user's nftMint for editions they own (for "View on Orb" link)
		// Also set isCollected=true if user owns an edition
		let userNftMint: string | undefined = undefined
		if (userId && result[0].post.type === 'edition') {
			const [userPurchase] = await db
				.select({ nftMint: purchases.nftMint })
				.from(purchases)
				.where(
					and(
						eq(purchases.postId, postId),
						eq(purchases.userId, userId),
						eq(purchases.status, 'confirmed'),
						isNotNull(purchases.nftMint)
					)
				)
				.limit(1)
			userNftMint = userPurchase?.nftMint || undefined
			// Mark as collected if user owns this edition
			if (userNftMint) {
				isCollected = true
			}
		}

		// Fetch moderator information if present
		let hiddenByUser = null
		let deletedByUser = null

		if (result[0].post.hiddenByUserId) {
			const [moderator] = await db
				.select({
					id: users.id,
					displayName: users.displayName,
					usernameSlug: users.usernameSlug,
				})
				.from(users)
				.where(eq(users.id, result[0].post.hiddenByUserId))
				.limit(1)
			hiddenByUser = moderator || null
		}

		if (result[0].post.deletedByUserId) {
			const [admin] = await db
				.select({
					id: users.id,
					displayName: users.displayName,
					usernameSlug: users.usernameSlug,
				})
				.from(users)
				.where(eq(users.id, result[0].post.deletedByUserId))
				.limit(1)
			deletedByUser = admin || null
		}

		return {
			success: true,
			post: {
				...result[0].post,
				likeCount,
				commentCount,
				collectCount,
				isLiked,
				isCollected,
				currentSupply,
				hiddenByUser,
				deletedByUser,
				// Add first assetId for collectibles (for Orb link)
				...(result[0].post.type === 'collectible' && collectibleAssetId
					? { collectibleAssetId }
					: {}),
				// Add assetId for protected downloads
				...(assetId ? { assetId } : {}),
				// Add user's nftMint for editions they own (for Orb link to their NFT)
				...(result[0].post.type === 'edition' && userNftMint
					? { userNftMint }
					: {}),
				// Add ordered media assets for multi-asset carousel
				// Only include if there are multiple assets (single asset uses mediaUrl)
				...(mediaAssets.length > 1 ? { assets: mediaAssets } : {}),
				// Add downloadable assets for download menu (audio, documents, 3D)
				...(downloadableAssets.length > 0 ? { downloadableAssets } : {}),
			},
			user: result[0].user,
		}
	} catch (error) {
		console.error('Error in getPostDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch post.',
		}
	}
}
