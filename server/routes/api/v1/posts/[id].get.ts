/**
 * Post Detail Endpoint
 * GET /api/v1/posts/:id
 *
 * Get single post by ID with full details.
 *
 * Authentication: Optional (affects isLiked/isCollected/isPurchased)
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { getPostDirect } from '@/server/utils/posts'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Get post ID from route params
	const postId = getRouterParam(event, 'id')

	if (!postId) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Post ID is required',
				},
				requestId,
			},
		})
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(postId)) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid post ID format',
				},
				requestId,
			},
		})
	}

	// Extract authorization token from header (optional)
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	// Call the direct utility function (bypasses createServerFn)
	const result = await getPostDirect(postId, token)

	// Handle errors
	if (!result || !result.success) {
		const isNotFound = result?.error?.includes('not found')
		throw createError({
			statusCode: isNotFound ? 404 : 500,
			data: {
				success: false,
				error: {
					code: isNotFound ? 'NOT_FOUND' : 'SERVER_ERROR',
					message: result?.error || 'Failed to fetch post',
				},
				requestId,
			},
		})
	}

	if (!result.post) {
		throw createError({
			statusCode: 404,
			data: {
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Post not found',
				},
				requestId,
			},
		})
	}

	const post = result.post as Record<string, unknown>

	// Transform user: usernameSlug -> slug for mobile API compatibility
	const user = result.user
		? {
				id: result.user.id,
				slug: result.user.usernameSlug,
				displayName: result.user.displayName,
				avatarUrl: result.user.avatarUrl,
			}
		: null

	return {
		success: true,
		data: {
			post: {
				id: post.id,
				type: post.type,
				caption: post.caption,
				mediaUrl: post.mediaUrl,
				coverUrl: post.coverUrl,
				price: post.price,
				currency: post.currency,
				maxSupply: post.maxSupply,
				currentSupply: post.currentSupply,
				nftName: post.nftName,
				nftDescription: post.nftDescription,
				masterMint: post.masterMint, // For explorer links (editions)
				collectibleAssetId: post.collectibleAssetId || null, // For explorer links (collectibles)
				likeCount: post.likeCount || 0,
				commentCount: post.commentCount || 0,
				collectCount: post.collectCount || 0,
				isLiked: post.isLiked || false,
				isCollected: post.isCollected || false,
				isPurchased: !!post.userNftMint,
				user,
				assets: post.assets || [],
				downloadableAssets: post.downloadableAssets || [],
				createdAt: post.createdAt,
			},
		},
		requestId,
	}
})
