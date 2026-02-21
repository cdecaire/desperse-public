/**
 * Posts Feed Endpoint
 * GET /api/v1/posts
 *
 * Get paginated feed of posts with optional tab filter.
 *
 * Authentication: Optional (affects isLiked/isCollected and 'following' tab)
 *
 * Query Parameters:
 * - tab: 'for-you' | 'following' (default: 'for-you')
 * - cursor: ISO datetime string for pagination
 * - limit: 1-50 (default: 20)
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { db } from '@/server/db'
import { posts, users, postAssets, likes, collections, comments, purchases } from '@/server/db/schema'
import { eq, and, desc, lt, inArray, asc, count } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Parse query parameters
	const query = getQuery(event)
	const tab = (query.tab as string) || 'for-you'
	const cursor = query.cursor as string | undefined
	const limitParam = query.limit as string | undefined
	const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20

	// Validate tab parameter
	if (tab !== 'for-you' && tab !== 'following') {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'tab must be "for-you" or "following"',
				},
				requestId,
			},
		})
	}

	// Try to extract user from auth token (optional - supports both Privy and SIWS tokens)
	let currentUserId: string | null = null
	const authHeader = getHeader(event, 'authorization')
	if (authHeader) {
		try {
			const auth = await authenticateWithToken(authHeader)
			if (auth?.userId) {
				currentUserId = auth.userId
			}
		} catch {
			// Token invalid or expired - continue without auth
		}
	}

	try {
		// Build conditions
		const conditions = [
			eq(posts.isDeleted, false),
			eq(posts.isHidden, false),
		]

		// Add cursor condition if provided
		if (cursor) {
			conditions.push(lt(posts.createdAt, new Date(cursor)))
		}

		// Query posts with user data (flat selection, transform after)
		const feedPosts = await db
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
				mintWindowStart: posts.mintWindowStart,
				mintWindowEnd: posts.mintWindowEnd,
				createdAt: posts.createdAt,
				userId: users.id,
				userSlug: users.usernameSlug,
				userDisplayName: users.displayName,
				userAvatarUrl: users.avatarUrl,
				userBio: users.bio,
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(and(...conditions))
			.orderBy(desc(posts.createdAt))
			.limit(limit + 1) // Fetch one extra to check if there's more

		// Check if there are more results
		const hasMore = feedPosts.length > limit
		const resultPosts = hasMore ? feedPosts.slice(0, limit) : feedPosts

		// Get next cursor from last post
		const nextCursor = hasMore && resultPosts.length > 0
			? resultPosts[resultPosts.length - 1].createdAt?.toISOString()
			: null

		// Fetch assets for all posts in a single query
		const postIds = resultPosts.map((p) => p.id)
		const allAssets = postIds.length > 0
			? await db
					.select({
						id: postAssets.id,
						postId: postAssets.postId,
						url: postAssets.storageKey, // storageKey is the URL for vercel-blob
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
			: []

		// Group assets by postId
		const assetsByPostId = new Map<string, typeof allAssets>()
		for (const asset of allAssets) {
			const existing = assetsByPostId.get(asset.postId) || []
			existing.push(asset)
			assetsByPostId.set(asset.postId, existing)
		}

		// Fetch downloadable assets (non-previewable: audio, documents, 3D)
		const allDownloadableAssets = postIds.length > 0
			? await db
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
			: []

		// Group downloadable assets by postId
		const downloadableByPostId = new Map<string, typeof allDownloadableAssets>()
		for (const asset of allDownloadableAssets) {
			const existing = downloadableByPostId.get(asset.postId) || []
			existing.push(asset)
			downloadableByPostId.set(asset.postId, existing)
		}

		// Query counts for likes, comments, collections, and purchases
		const likeCounts = new Map<string, number>()
		const commentCounts = new Map<string, number>()
		const collectCounts = new Map<string, number>()
		const purchaseCounts = new Map<string, number>() // For edition currentSupply
		const collectibleAssetIds = new Map<string, string>()

		// Get collectible post IDs for asset ID lookup
		const collectiblePostIds = resultPosts
			.filter((p) => p.type === 'collectible')
			.map((p) => p.id)

		// Get edition post IDs for purchase count lookup
		const editionPostIds = resultPosts
			.filter((p) => p.type === 'edition')
			.map((p) => p.id)

		if (postIds.length > 0) {
			// Get like counts
			const likeCountResults = await db
				.select({
					postId: likes.postId,
					count: count(),
				})
				.from(likes)
				.where(inArray(likes.postId, postIds))
				.groupBy(likes.postId)

			for (const row of likeCountResults) {
				likeCounts.set(row.postId, row.count)
			}

			// Get comment counts
			const commentCountResults = await db
				.select({
					postId: comments.postId,
					count: count(),
				})
				.from(comments)
				.where(inArray(comments.postId, postIds))
				.groupBy(comments.postId)

			for (const row of commentCountResults) {
				commentCounts.set(row.postId, row.count)
			}

			// Get collect counts (only confirmed collections)
			const collectCountResults = await db
				.select({
					postId: collections.postId,
					count: count(),
				})
				.from(collections)
				.where(
					and(
						inArray(collections.postId, postIds),
						eq(collections.status, 'confirmed')
					)
				)
				.groupBy(collections.postId)

			for (const row of collectCountResults) {
				collectCounts.set(row.postId, row.count)
			}

			// Get purchase counts for editions (currentSupply)
			if (editionPostIds.length > 0) {
				const purchaseCountResults = await db
					.select({
						postId: purchases.postId,
						count: count(),
					})
					.from(purchases)
					.where(
						and(
							inArray(purchases.postId, editionPostIds),
							eq(purchases.status, 'confirmed')
						)
					)
					.groupBy(purchases.postId)

				for (const row of purchaseCountResults) {
					purchaseCounts.set(row.postId, row.count)
				}
			}

			// Get first nftMint for collectibles (for explorer links)
			if (collectiblePostIds.length > 0) {
				const assetIdResults = await db
					.select({
						postId: collections.postId,
						nftMint: collections.nftMint,
					})
					.from(collections)
					.where(
						and(
							inArray(collections.postId, collectiblePostIds),
							eq(collections.status, 'confirmed')
						)
					)
					.orderBy(asc(collections.createdAt))

				// Keep only the first nftMint per post
				for (const row of assetIdResults) {
					if (row.nftMint && !collectibleAssetIds.has(row.postId)) {
						collectibleAssetIds.set(row.postId, row.nftMint)
					}
				}
			}
		}

		// Query user's likes and collections if authenticated
		const likedPostIds = new Set<string>()
		const collectedPostIds = new Set<string>()

		if (currentUserId && postIds.length > 0) {
			// Get user's likes for these posts
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

			// Get user's collections for these posts (only confirmed)
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

			// Get user's purchases for these posts (editions use purchases table)
			const userPurchases = await db
				.select({ postId: purchases.postId })
				.from(purchases)
				.where(
					and(
						eq(purchases.userId, currentUserId),
						inArray(purchases.postId, postIds),
						eq(purchases.status, 'confirmed')
					)
				)
			for (const purchase of userPurchases) {
				collectedPostIds.add(purchase.postId)
			}
		}

		// Transform posts for API response
		const transformedPosts = resultPosts.map((post) => {
			const postAssetsForPost = assetsByPostId.get(post.id) || []
			// Only include assets array if there are multiple assets
			const assets = postAssetsForPost.length > 1
				? postAssetsForPost.map((a) => ({
						id: a.id,
						url: a.url,
						mimeType: a.mimeType,
						sortOrder: a.sortOrder,
					}))
				: undefined

			return {
				id: post.id,
				type: post.type,
				caption: post.caption,
				mediaUrl: post.mediaUrl,
				coverUrl: post.coverUrl,
				price: post.price ? Number(post.price) : null,
				currency: post.currency,
				maxSupply: post.maxSupply,
				// For editions, use dynamic count from purchases table
				currentSupply: post.type === 'edition'
					? purchaseCounts.get(post.id) || 0
					: post.currentSupply,
				nftName: post.nftName,
				masterMint: post.masterMint, // For explorer links (editions)
				mintWindowStart: post.mintWindowStart?.toISOString() ?? null,
				mintWindowEnd: post.mintWindowEnd?.toISOString() ?? null,
				collectibleAssetId: collectibleAssetIds.get(post.id) || null, // For explorer links (collectibles)
				likeCount: likeCounts.get(post.id) || 0,
				commentCount: commentCounts.get(post.id) || 0,
				collectCount: collectCounts.get(post.id) || 0,
				isLiked: likedPostIds.has(post.id),
				isCollected: collectedPostIds.has(post.id),
				createdAt: post.createdAt?.toISOString(),
				assets, // Only present for multi-asset posts
				// Downloadable assets for download menu (audio, documents, 3D)
				...(downloadableByPostId.has(post.id)
					? { downloadableAssets: downloadableByPostId.get(post.id)!.map((a) => ({
							id: a.id,
							url: a.url,
							mimeType: a.mimeType,
							fileSize: a.fileSize,
							sortOrder: a.sortOrder,
						})) }
					: {}),
				user: {
					id: post.userId,
					slug: post.userSlug,
					displayName: post.userDisplayName,
					avatarUrl: post.userAvatarUrl,
					bio: post.userBio,
					isVerified: false, // Not stored in DB currently
				},
			}
		})

		return {
			success: true,
			data: {
				posts: transformedPosts,
			},
			meta: {
				hasMore,
				nextCursor,
			},
			requestId,
		}
	} catch (error) {
		const errorDetails = error instanceof Error
			? { message: error.message, stack: error.stack, name: error.name }
			: { raw: String(error) }
		console.error('Feed error details:', JSON.stringify(errorDetails, null, 2))
		throw createError({
			statusCode: 500,
			data: {
				success: false,
				error: {
					code: 'SERVER_ERROR',
					message: 'Failed to fetch feed',
				},
				requestId,
			},
		})
	}
})
