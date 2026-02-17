/**
 * Profile utility functions for REST API
 * Direct functions that bypass createServerFn for REST endpoints
 */

import { db } from '@/server/db'
import { users, posts, collections, purchases, follows, likes, postAssets, comments } from '@/server/db/schema'
import { and, asc, count, desc, eq, inArray, isNull, lt, ne, or } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { uploadToBlob, SUPPORTED_IMAGE_TYPES } from '@/server/storage/blob'

const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2MB limit for avatars
const HEADER_MAX_BYTES = 5 * 1024 * 1024 // 5MB limit for header backgrounds

export interface ProfileUser {
	id: string
	slug: string
	displayName: string | null
	bio: string | null
	avatarUrl: string | null
	headerBgUrl: string | null
	link: string | null
	createdAt: Date
}

export interface ProfileStats {
	posts: number
	collected: number
	forSale: number
}

export interface ProfileResult {
	success: boolean
	error?: string
	user?: ProfileUser
	stats?: ProfileStats
	followersCount?: number
	followingCount?: number
	collectorsCount?: number
	isFollowing?: boolean
}

export interface UserPostsResult {
	success: boolean
	error?: string
	posts?: Array<{
		id: string
		type: string
		caption: string | null
		mediaUrl: string | null
		coverUrl: string | null
		price: number | null
		currency: string | null
		maxSupply: number | null
		currentSupply: number | null
		nftName: string | null
		masterMint: string | null
		collectibleAssetId: string | null
		likeCount: number
		commentCount: number
		collectCount: number
		isLiked: boolean
		isCollected: boolean
		createdAt: string
		assets?: Array<{
			id: string
			url: string
			mimeType: string
			sortOrder: number
		}>
		user: {
			id: string
			slug: string
			displayName: string | null
			avatarUrl: string | null
		}
	}>
	hasMore?: boolean
	nextCursor?: string | null
}

/**
 * Get user profile by slug (Direct function for REST API)
 */
export async function getUserBySlugDirect(
	slug: string,
	currentUserId?: string
): Promise<ProfileResult> {
	try {
		const [user] = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				bio: users.bio,
				avatarUrl: users.avatarUrl,
				headerBgUrl: users.headerBgUrl,
				link: users.link,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.usernameSlug, slug))
			.limit(1)

		if (!user) {
			return {
				success: false,
				error: 'User not found',
			}
		}

		// Posts count (public, not deleted/hidden)
		const postsResult = await db
			.select({ count: count() })
			.from(posts)
			.where(
				and(
					eq(posts.userId, user.id),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		// Collected count (distinct post ids across confirmed collections + purchases)
		const collectedIds = new Set<string>()

		const collectionRows = await db
			.select({ postId: collections.postId })
			.from(collections)
			.where(
				and(
					eq(collections.userId, user.id),
					eq(collections.status, 'confirmed')
				)
			)
		collectionRows.forEach((row) => collectedIds.add(row.postId))

		const purchaseRows = await db
			.select({ postId: purchases.postId })
			.from(purchases)
			.where(
				and(
					eq(purchases.userId, user.id),
					eq(purchases.status, 'confirmed')
				)
			)
		purchaseRows.forEach((row) => collectedIds.add(row.postId))

		// Filter out deleted posts from collected count
		let validCollectedCount = 0
		if (collectedIds.size > 0) {
			const validPosts = await db
				.select({ id: posts.id })
				.from(posts)
				.where(
					and(
						inArray(posts.id, Array.from(collectedIds)),
						eq(posts.isDeleted, false),
						eq(posts.isHidden, false)
					)
				)
			validCollectedCount = validPosts.length
		}

		// For sale count (active editions with remaining supply > 0 or open editions)
		const forSaleResult = await db
			.select({ count: count() })
			.from(posts)
			.where(
				and(
					eq(posts.userId, user.id),
					eq(posts.type, 'edition'),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false),
					or(
						isNull(posts.maxSupply),
						lt(posts.currentSupply, posts.maxSupply)
					)
				)
			)

		// Follow stats
		const followerResult = await db
			.select({ count: count() })
			.from(follows)
			.where(eq(follows.followingId, user.id))

		const followingResult = await db
			.select({ count: count() })
			.from(follows)
			.where(eq(follows.followerId, user.id))

		const followersCount = followerResult[0]?.count || 0
		const followingCount = followingResult[0]?.count || 0

		// Count unique collectors (users who collected/purchased items created by this user)
		let collectorsCount = 0
		const userPostIds = await db
			.select({ id: posts.id })
			.from(posts)
			.where(
				and(
					eq(posts.userId, user.id),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		if (userPostIds.length > 0) {
			const postIdList = userPostIds.map((p) => p.id)
			const collectorIds = new Set<string>()

			const collectionCollectors = await db
				.select({ userId: collections.userId })
				.from(collections)
				.where(
					and(
						inArray(collections.postId, postIdList),
						eq(collections.status, 'confirmed')
					)
				)
			collectionCollectors.forEach((row) => collectorIds.add(row.userId))

			const purchaseCollectors = await db
				.select({ userId: purchases.userId })
				.from(purchases)
				.where(
					and(
						inArray(purchases.postId, postIdList),
						eq(purchases.status, 'confirmed')
					)
				)
			purchaseCollectors.forEach((row) => collectorIds.add(row.userId))

			// Exclude the creator themselves from the collectors count
			collectorIds.delete(user.id)
			collectorsCount = collectorIds.size
		}

		// Check if current user is following this profile
		let isFollowing = false
		if (currentUserId && currentUserId !== user.id) {
			const followCheck = await db
				.select({ id: follows.followerId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, currentUserId),
						eq(follows.followingId, user.id)
					)
				)
				.limit(1)
			isFollowing = followCheck.length > 0
		}

		return {
			success: true,
			user: {
				id: user.id,
				slug: user.usernameSlug,
				displayName: user.displayName,
				bio: user.bio,
				avatarUrl: user.avatarUrl,
				headerBgUrl: user.headerBgUrl,
				link: user.link,
				createdAt: user.createdAt,
			},
			stats: {
				posts: postsResult[0]?.count || 0,
				collected: validCollectedCount,
				forSale: forSaleResult[0]?.count || 0,
			},
			followersCount,
			followingCount,
			collectorsCount,
			isFollowing,
		}
	} catch (error) {
		console.error('Error in getUserBySlugDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch profile',
		}
	}
}

/**
 * Get user posts with pagination (Direct function for REST API)
 */
export async function getUserPostsDirect(
	userId: string,
	cursor?: string,
	limit: number = 20,
	currentUserId?: string
): Promise<UserPostsResult> {
	try {
		const conditions = [
			eq(posts.userId, userId),
			eq(posts.isDeleted, false),
			eq(posts.isHidden, false),
		]

		if (cursor) {
			conditions.push(lt(posts.createdAt, new Date(cursor)))
		}

		const rows = await db
			.select({
				id: posts.id,
				type: posts.type,
				caption: posts.caption,
				mediaUrl: posts.mediaUrl,
				coverUrl: posts.coverUrl,
				price: posts.price,
				currency: posts.currency,
				maxSupply: posts.maxSupply,
				currentSupply: posts.currentSupply,
				nftName: posts.nftName,
				masterMint: posts.masterMint,
				createdAt: posts.createdAt,
				userId: users.id,
				userSlug: users.usernameSlug,
				userDisplayName: users.displayName,
				userAvatarUrl: users.avatarUrl,
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(and(...conditions))
			.orderBy(desc(posts.createdAt))
			.limit(limit + 1)

		const hasMore = rows.length > limit
		const toReturn = hasMore ? rows.slice(0, limit) : rows

		// Get post IDs for batch queries
		const postIds = toReturn.map((p) => p.id)
		const likeCountsMap = new Map<string, number>()
		const commentCountsMap = new Map<string, number>()
		const collectCountsMap = new Map<string, number>()
		const collectibleAssetIdsMap = new Map<string, string>()
		const likedPostIds = new Set<string>()
		const collectedPostIds = new Set<string>()
		const assetsByPostId = new Map<string, Array<{ id: string; url: string; mimeType: string; sortOrder: number }>>()
		const downloadableByPostId = new Map<string, Array<{ id: string; postId: string; url: string; mimeType: string; fileSize: number | null; sortOrder: number }>>()

		if (postIds.length > 0) {
			// Like counts using Drizzle query builder
			const likeCountResults = await db
				.select({
					postId: likes.postId,
					count: count(),
				})
				.from(likes)
				.where(inArray(likes.postId, postIds))
				.groupBy(likes.postId)

			for (const row of likeCountResults) {
				likeCountsMap.set(row.postId, row.count)
			}

			// Comment counts using Drizzle query builder
			const commentCountResults = await db
				.select({
					postId: comments.postId,
					count: count(),
				})
				.from(comments)
				.where(inArray(comments.postId, postIds))
				.groupBy(comments.postId)

			for (const row of commentCountResults) {
				commentCountsMap.set(row.postId, row.count)
			}

			// Collect counts for collectibles
			const collectibleIds = toReturn
				.filter((r) => r.type === 'collectible')
				.map((r) => r.id)

			if (collectibleIds.length > 0) {
				const collectCountResults = await db
					.select({
						postId: collections.postId,
						count: count(),
					})
					.from(collections)
					.where(
						and(
							inArray(collections.postId, collectibleIds),
							eq(collections.status, 'confirmed')
						)
					)
					.groupBy(collections.postId)

				for (const row of collectCountResults) {
					collectCountsMap.set(row.postId, row.count)
				}

				// Get first nftMint for collectibles (for explorer links)
				const assetIdResults = await db
					.select({
						postId: collections.postId,
						nftMint: collections.nftMint,
					})
					.from(collections)
					.where(
						and(
							inArray(collections.postId, collectibleIds),
							eq(collections.status, 'confirmed')
						)
					)
					.orderBy(asc(collections.createdAt))

				// Keep only the first nftMint per post
				for (const row of assetIdResults) {
					if (row.nftMint && !collectibleAssetIdsMap.has(row.postId)) {
						collectibleAssetIdsMap.set(row.postId, row.nftMint)
					}
				}
			}

			// Fetch assets for multi-asset posts
			const allAssets = await db
				.select({
					id: postAssets.id,
					postId: postAssets.postId,
					url: postAssets.storageKey,
					mimeType: postAssets.mimeType,
					sortOrder: postAssets.sortOrder,
				})
				.from(postAssets)
				.where(
					and(
						inArray(postAssets.postId, postIds),
						eq(postAssets.role, 'media'),
						eq(postAssets.isPreviewable, true)
					)
				)
				.orderBy(asc(postAssets.sortOrder))

			for (const asset of allAssets) {
				const existing = assetsByPostId.get(asset.postId) || []
				existing.push({
					id: asset.id,
					url: asset.url,
					mimeType: asset.mimeType,
					sortOrder: asset.sortOrder,
				})
				assetsByPostId.set(asset.postId, existing)
			}

			// Fetch downloadable assets (non-previewable: audio, documents, 3D)
			const allDownloadableAssets = await db
				.select({
					id: postAssets.id,
					postId: postAssets.postId,
					url: postAssets.storageKey,
					mimeType: postAssets.mimeType,
					fileSize: postAssets.fileSize,
					sortOrder: postAssets.sortOrder,
				})
				.from(postAssets)
				.where(
					and(
						inArray(postAssets.postId, postIds),
						eq(postAssets.role, 'media'),
						eq(postAssets.isPreviewable, false)
					)
				)
				.orderBy(asc(postAssets.sortOrder))

			for (const asset of allDownloadableAssets) {
				const existing = downloadableByPostId.get(asset.postId) || []
				existing.push(asset)
				downloadableByPostId.set(asset.postId, existing)
			}

			// Query user's likes and collections if authenticated
			if (currentUserId) {
				const userLikes = await db
					.select({ postId: likes.postId })
					.from(likes)
					.where(
						and(
							eq(likes.userId, currentUserId),
							inArray(likes.postId, postIds)
						)
					)
				for (const like of userLikes) {
					likedPostIds.add(like.postId)
				}

				const userCollections = await db
					.select({ postId: collections.postId })
					.from(collections)
					.where(
						and(
							eq(collections.userId, currentUserId),
							inArray(collections.postId, postIds),
							eq(collections.status, 'confirmed')
						)
					)
				for (const collection of userCollections) {
					collectedPostIds.add(collection.postId)
				}
			}
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.createdAt.toISOString() : null

		return {
			success: true,
			posts: toReturn.map((row) => {
				const postAssetsForPost = assetsByPostId.get(row.id) || []
				// Only include assets array if there are multiple assets
				const assets = postAssetsForPost.length > 1 ? postAssetsForPost : undefined

				return {
					id: row.id,
					type: row.type,
					caption: row.caption,
					mediaUrl: row.mediaUrl,
					coverUrl: row.coverUrl,
					price: row.price ? Number(row.price) : null,
					currency: row.currency,
					maxSupply: row.maxSupply,
					currentSupply: row.currentSupply,
					nftName: row.nftName,
					masterMint: row.masterMint,
					collectibleAssetId: collectibleAssetIdsMap.get(row.id) || null,
					likeCount: likeCountsMap.get(row.id) || 0,
					commentCount: commentCountsMap.get(row.id) || 0,
					collectCount: collectCountsMap.get(row.id) || 0,
					isLiked: likedPostIds.has(row.id),
					isCollected: collectedPostIds.has(row.id),
					createdAt: row.createdAt.toISOString(),
					assets,
					// Downloadable assets for download menu
					...(downloadableByPostId.has(row.id)
						? { downloadableAssets: downloadableByPostId.get(row.id)!.map((a) => ({
								id: a.id,
								url: a.url,
								mimeType: a.mimeType,
								fileSize: a.fileSize,
								sortOrder: a.sortOrder,
							})) }
						: {}),
					user: {
						id: row.userId,
						slug: row.userSlug,
						displayName: row.userDisplayName,
						avatarUrl: row.userAvatarUrl,
					},
				}
			}),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getUserPostsDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch user posts',
		}
	}
}

/**
 * Get collected items for a user (confirmed collections + purchases)
 * Direct function for REST API
 */
export async function getUserCollectedDirect(
	userId: string,
	cursor?: string,
	limit: number = 20
): Promise<UserPostsResult> {
	try {
		// Get all collected post IDs (from both collections and purchases)
		const collectedIds = new Set<string>()

		const collectionRows = await db
			.select({ postId: collections.postId })
			.from(collections)
			.where(
				and(
					eq(collections.userId, userId),
					eq(collections.status, 'confirmed')
				)
			)
		collectionRows.forEach((row) => collectedIds.add(row.postId))

		const purchaseRows = await db
			.select({ postId: purchases.postId })
			.from(purchases)
			.where(
				and(
					eq(purchases.userId, userId),
					eq(purchases.status, 'confirmed')
				)
			)
		purchaseRows.forEach((row) => collectedIds.add(row.postId))

		if (collectedIds.size === 0) {
			return {
				success: true,
				posts: [],
				hasMore: false,
				nextCursor: null,
			}
		}

		const conditions = [
			inArray(posts.id, Array.from(collectedIds)),
			eq(posts.isDeleted, false),
			eq(posts.isHidden, false),
		]

		if (cursor) {
			conditions.push(lt(posts.createdAt, new Date(cursor)))
		}

		const rows = await db
			.select({
				id: posts.id,
				type: posts.type,
				caption: posts.caption,
				mediaUrl: posts.mediaUrl,
				coverUrl: posts.coverUrl,
				price: posts.price,
				currency: posts.currency,
				maxSupply: posts.maxSupply,
				currentSupply: posts.currentSupply,
				nftName: posts.nftName,
				masterMint: posts.masterMint,
				createdAt: posts.createdAt,
				userId: users.id,
				userSlug: users.usernameSlug,
				userDisplayName: users.displayName,
				userAvatarUrl: users.avatarUrl,
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(and(...conditions))
			.orderBy(desc(posts.createdAt))
			.limit(limit + 1)

		const hasMore = rows.length > limit
		const toReturn = hasMore ? rows.slice(0, limit) : rows

		// Get counts for these posts
		const postIds = toReturn.map((p) => p.id)
		const likeCountsMap = new Map<string, number>()
		const commentCountsMap = new Map<string, number>()
		const collectCountsMap = new Map<string, number>()
		const collectibleAssetIdsMap = new Map<string, string>()

		if (postIds.length > 0) {
			const likeCountResults = await db
				.select({ postId: likes.postId, count: count() })
				.from(likes)
				.where(inArray(likes.postId, postIds))
				.groupBy(likes.postId)

			for (const row of likeCountResults) {
				likeCountsMap.set(row.postId, row.count)
			}

			const commentCountResults = await db
				.select({ postId: comments.postId, count: count() })
				.from(comments)
				.where(inArray(comments.postId, postIds))
				.groupBy(comments.postId)

			for (const row of commentCountResults) {
				commentCountsMap.set(row.postId, row.count)
			}

			const collectibleIds = toReturn.filter((r) => r.type === 'collectible').map((r) => r.id)
			if (collectibleIds.length > 0) {
				const collectCountResults = await db
					.select({ postId: collections.postId, count: count() })
					.from(collections)
					.where(and(inArray(collections.postId, collectibleIds), eq(collections.status, 'confirmed')))
					.groupBy(collections.postId)

				for (const row of collectCountResults) {
					collectCountsMap.set(row.postId, row.count)
				}

				const assetIdResults = await db
					.select({ postId: collections.postId, nftMint: collections.nftMint })
					.from(collections)
					.where(and(inArray(collections.postId, collectibleIds), eq(collections.status, 'confirmed')))
					.orderBy(asc(collections.createdAt))

				for (const row of assetIdResults) {
					if (row.nftMint && !collectibleAssetIdsMap.has(row.postId)) {
						collectibleAssetIdsMap.set(row.postId, row.nftMint)
					}
				}
			}
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.createdAt.toISOString() : null

		return {
			success: true,
			posts: toReturn.map((row) => ({
				id: row.id,
				type: row.type,
				caption: row.caption,
				mediaUrl: row.mediaUrl,
				coverUrl: row.coverUrl,
				price: row.price ? Number(row.price) : null,
				currency: row.currency,
				maxSupply: row.maxSupply,
				currentSupply: row.currentSupply,
				nftName: row.nftName,
				masterMint: row.masterMint,
				collectibleAssetId: collectibleAssetIdsMap.get(row.id) || null,
				likeCount: likeCountsMap.get(row.id) || 0,
				commentCount: commentCountsMap.get(row.id) || 0,
				collectCount: collectCountsMap.get(row.id) || 0,
				isLiked: false,
				isCollected: true, // All items in this list are collected by definition
				createdAt: row.createdAt.toISOString(),
				user: {
					id: row.userId,
					slug: row.userSlug,
					displayName: row.userDisplayName,
					avatarUrl: row.userAvatarUrl,
				},
			})),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getUserCollectedDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch collected items',
		}
	}
}

/**
 * Get for-sale editions by a user (editions with remaining supply)
 * Direct function for REST API
 */
export async function getUserForSaleDirect(
	userId: string,
	cursor?: string,
	limit: number = 20
): Promise<UserPostsResult> {
	try {
		const conditions = [
			eq(posts.userId, userId),
			eq(posts.type, 'edition'),
			eq(posts.isDeleted, false),
			eq(posts.isHidden, false),
			or(isNull(posts.maxSupply), lt(posts.currentSupply, posts.maxSupply)),
		]

		if (cursor) {
			conditions.push(lt(posts.createdAt, new Date(cursor)))
		}

		const rows = await db
			.select({
				id: posts.id,
				type: posts.type,
				caption: posts.caption,
				mediaUrl: posts.mediaUrl,
				coverUrl: posts.coverUrl,
				price: posts.price,
				currency: posts.currency,
				maxSupply: posts.maxSupply,
				currentSupply: posts.currentSupply,
				nftName: posts.nftName,
				masterMint: posts.masterMint,
				createdAt: posts.createdAt,
				userId: users.id,
				userSlug: users.usernameSlug,
				userDisplayName: users.displayName,
				userAvatarUrl: users.avatarUrl,
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(and(...conditions))
			.orderBy(desc(posts.createdAt))
			.limit(limit + 1)

		const hasMore = rows.length > limit
		const toReturn = hasMore ? rows.slice(0, limit) : rows

		// Get like/comment counts
		const postIds = toReturn.map((p) => p.id)
		const likeCountsMap = new Map<string, number>()
		const commentCountsMap = new Map<string, number>()

		if (postIds.length > 0) {
			const likeCountResults = await db
				.select({ postId: likes.postId, count: count() })
				.from(likes)
				.where(inArray(likes.postId, postIds))
				.groupBy(likes.postId)

			for (const row of likeCountResults) {
				likeCountsMap.set(row.postId, row.count)
			}

			const commentCountResults = await db
				.select({ postId: comments.postId, count: count() })
				.from(comments)
				.where(inArray(comments.postId, postIds))
				.groupBy(comments.postId)

			for (const row of commentCountResults) {
				commentCountsMap.set(row.postId, row.count)
			}
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.createdAt.toISOString() : null

		return {
			success: true,
			posts: toReturn.map((row) => ({
				id: row.id,
				type: row.type,
				caption: row.caption,
				mediaUrl: row.mediaUrl,
				coverUrl: row.coverUrl,
				price: row.price ? Number(row.price) : null,
				currency: row.currency,
				maxSupply: row.maxSupply,
				currentSupply: row.currentSupply,
				nftName: row.nftName,
				masterMint: row.masterMint,
				collectibleAssetId: null, // Editions don't have collectible asset IDs
				likeCount: likeCountsMap.get(row.id) || 0,
				commentCount: commentCountsMap.get(row.id) || 0,
				collectCount: 0, // Editions track purchases, not collections
				isLiked: false,
				isCollected: false,
				createdAt: row.createdAt.toISOString(),
				user: {
					id: row.userId,
					slug: row.userSlug,
					displayName: row.userDisplayName,
					avatarUrl: row.userAvatarUrl,
				},
			})),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getUserForSaleDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch for-sale editions',
		}
	}
}

export interface UpdateProfileInput {
	displayName?: string | null
	bio?: string | null
	usernameSlug?: string
	website?: string | null
	avatarUrl?: string | null
	headerUrl?: string | null
}

export interface UpdateProfileResult {
	success: boolean
	error?: string
	user?: {
		id: string
		slug: string
		displayName: string | null
		bio: string | null
		avatarUrl: string | null
		headerBgUrl: string | null
		link: string | null
		walletAddress: string | null
	}
}

/**
 * Update current user's profile (Direct function for REST API)
 */
export async function updateProfileDirect(
	token: string,
	updates: UpdateProfileInput
): Promise<UpdateProfileResult> {
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
		console.warn('[updateProfileDirect] Auth error:', message)
		return { success: false, error: message }
	}

	try {
		// Get current user
		const [currentUser] = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				usernameLastChangedAt: users.usernameLastChangedAt,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!currentUser) {
			return { success: false, error: 'User not found' }
		}

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		// Handle displayName
		if (updates.displayName !== undefined) {
			const trimmed = updates.displayName?.trim()
			if (trimmed && trimmed.length > 50) {
				return { success: false, error: 'Display name must be 50 characters or less' }
			}
			updateData.displayName = trimmed || null
		}

		// Handle bio
		if (updates.bio !== undefined) {
			const trimmed = updates.bio?.trim()
			if (trimmed && trimmed.length > 500) {
				return { success: false, error: 'Bio must be 500 characters or less' }
			}
			updateData.bio = trimmed || null
		}

		// Handle website (link)
		if (updates.website !== undefined) {
			const trimmed = updates.website?.trim()
			if (trimmed && trimmed.length > 200) {
				return { success: false, error: 'Website must be 200 characters or less' }
			}
			updateData.link = trimmed || null
		}

		// Handle avatarUrl
		if (updates.avatarUrl !== undefined) {
			updateData.avatarUrl = updates.avatarUrl?.trim() || null
		}

		// Handle headerUrl
		if (updates.headerUrl !== undefined) {
			updateData.headerBgUrl = updates.headerUrl?.trim() || null
		}

		// Handle username change with restrictions
		if (updates.usernameSlug !== undefined) {
			const newSlug = updates.usernameSlug.trim().toLowerCase()

			// Validate format: alphanumeric and underscores only, 3-30 chars
			if (!/^[a-z0-9_]{3,30}$/.test(newSlug)) {
				return {
					success: false,
					error: 'Username must be 3-30 characters, letters, numbers, and underscores only',
				}
			}

			// Check if different from current
			if (newSlug !== currentUser.usernameSlug) {
				// Check if username is already taken
				const [existing] = await db
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.usernameSlug, newSlug), ne(users.id, userId)))
					.limit(1)

				if (existing) {
					return { success: false, error: 'Username is already taken' }
				}

				// Check cooldown: can only change username once per 30 days (after first change)
				if (currentUser.usernameLastChangedAt) {
					const daysSinceLastChange =
						(Date.now() - currentUser.usernameLastChangedAt.getTime()) / (1000 * 60 * 60 * 24)
					if (daysSinceLastChange < 30) {
						const daysRemaining = Math.ceil(30 - daysSinceLastChange)
						return {
							success: false,
							error: `You can change your username again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
						}
					}
				}

				updateData.usernameSlug = newSlug
				updateData.usernameLastChangedAt = new Date()
			}
		}

		// Perform update
		const [updated] = await db
			.update(users)
			.set(updateData)
			.where(eq(users.id, userId))
			.returning({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				bio: users.bio,
				avatarUrl: users.avatarUrl,
				headerBgUrl: users.headerBgUrl,
				link: users.link,
				walletAddress: users.walletAddress,
			})

		return {
			success: true,
			user: {
				id: updated.id,
				slug: updated.usernameSlug,
				displayName: updated.displayName,
				bio: updated.bio,
				avatarUrl: updated.avatarUrl,
				headerBgUrl: updated.headerBgUrl,
				link: updated.link,
				walletAddress: updated.walletAddress,
			},
		}
	} catch (error) {
		console.error('Error in updateProfileDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update profile',
		}
	}
}

// ============================================================================
// Image Upload Functions (for REST API endpoints)
// ============================================================================

export interface ImageUploadInput {
	fileData: string // base64-encoded file data
	fileName: string
	mimeType: string
	fileSize: number
}

export interface ImageUploadResult {
	success: true
	url: string
}

export interface ImageUploadError {
	success: false
	error: string
	status?: number
}

/**
 * Upload avatar image for authenticated user
 */
export async function uploadAvatarDirect(
	token: string,
	input: ImageUploadInput
): Promise<ImageUploadResult | ImageUploadError> {
	try {
		// Authenticate user
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required', status: 401 }
		}

		const { fileData, fileName, mimeType, fileSize } = input

		// Validate mime type
		if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
			return {
				success: false,
				error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.',
				status: 400,
			}
		}

		// Validate file size
		if (fileSize > AVATAR_MAX_BYTES) {
			return {
				success: false,
				error: 'Avatar must be 2MB or smaller.',
				status: 400,
			}
		}

		// Decode base64
		const fileBuffer = Buffer.from(fileData, 'base64')

		// Double-check actual size after decoding
		if (fileBuffer.length > AVATAR_MAX_BYTES) {
			return {
				success: false,
				error: 'Avatar must be 2MB or smaller.',
				status: 400,
			}
		}

		// Upload to blob storage
		const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
		const uploadResult = await uploadToBlob(blob, fileName, mimeType, 'avatars')

		if (!uploadResult.success) {
			return { success: false, error: uploadResult.error, status: 500 }
		}

		// Update user's avatar URL in database
		await db
			.update(users)
			.set({
				avatarUrl: uploadResult.url,
				updatedAt: new Date(),
			})
			.where(eq(users.id, auth.userId))

		return {
			success: true,
			url: uploadResult.url,
		}
	} catch (error) {
		console.error('[uploadAvatarDirect] Error:', error)
		return {
			success: false,
			error: 'Failed to upload avatar.',
			status: 500,
		}
	}
}

/**
 * Upload header background image for authenticated user
 */
export async function uploadHeaderDirect(
	token: string,
	input: ImageUploadInput
): Promise<ImageUploadResult | ImageUploadError> {
	try {
		// Authenticate user
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required', status: 401 }
		}

		const { fileData, fileName, mimeType, fileSize } = input

		// Validate mime type
		if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
			return {
				success: false,
				error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.',
				status: 400,
			}
		}

		// Validate file size
		if (fileSize > HEADER_MAX_BYTES) {
			return {
				success: false,
				error: 'Header image must be 5MB or smaller.',
				status: 400,
			}
		}

		// Decode base64
		const fileBuffer = Buffer.from(fileData, 'base64')

		// Double-check actual size after decoding
		if (fileBuffer.length > HEADER_MAX_BYTES) {
			return {
				success: false,
				error: 'Header image must be 5MB or smaller.',
				status: 400,
			}
		}

		// Upload to blob storage
		const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
		const uploadResult = await uploadToBlob(blob, fileName, mimeType, 'headers')

		if (!uploadResult.success) {
			return { success: false, error: uploadResult.error, status: 500 }
		}

		// Update user's header URL in database
		await db
			.update(users)
			.set({
				headerBgUrl: uploadResult.url,
				updatedAt: new Date(),
			})
			.where(eq(users.id, auth.userId))

		return {
			success: true,
			url: uploadResult.url,
		}
	} catch (error) {
		console.error('[uploadHeaderDirect] Error:', error)
		return {
			success: false,
			error: 'Failed to upload header image.',
			status: 500,
		}
	}
}
