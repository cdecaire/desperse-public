/**
 * Get Post Comments Endpoint
 * GET /api/v1/posts/:id/comments
 *
 * Get paginated comments for a post.
 *
 * Authentication: Optional (used to filter out comments from users the
 * viewer has blocked or who have blocked the viewer — symmetric).
 *
 * Query Parameters:
 * - limit: 1-100 (default: 50)
 * - cursor: pagination cursor (not yet implemented)
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { getPostCommentsDirect } from '@/server/utils/comments'
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

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

	// Parse query parameters
	const query = getQuery(event)
	const limitParam = query.limit as string | undefined
	const limit = limitParam
		? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
		: 50

	// Optional auth — used only for the block filter. Anonymous viewers
	// see the unfiltered list. Auth failures are non-fatal: bad token =>
	// fall back to anonymous behaviour, don't 401.
	let viewerId: string | null = null
	const authHeader = getHeader(event, 'authorization')
	if (authHeader) {
		try {
			const auth = await authenticateWithToken(authHeader)
			if (auth?.userId) viewerId = auth.userId
		} catch {
			// continue unauthenticated
		}
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await getPostCommentsDirect(postId, limit)

	// Handle errors
	if (!result || !result.success) {
		throw createError({
			statusCode: 500,
			data: {
				success: false,
				error: {
					code: 'SERVER_ERROR',
					message: result?.error || 'Failed to fetch comments',
				},
				requestId,
			},
		})
	}

	// Block filter: drop comments authored by users the viewer has
	// blocked OR who have blocked the viewer. Symmetric — same helper
	// used by the feed. Anonymous viewers get an empty Set so this is
	// a no-op for them.
	const blockedSet = await getBlockedUserIdSet(viewerId)
	const filteredComments = blockedSet.size > 0
		? (result.comments || []).filter((c) => !blockedSet.has(c.user.id))
		: result.comments || []

	// Transform user: usernameSlug -> slug for mobile API compatibility
	const comments = filteredComments.map((comment) => ({
		id: comment.id,
		content: comment.content,
		createdAt: comment.createdAt,
		user: {
			id: comment.user.id,
			slug: comment.user.usernameSlug,
			displayName: comment.user.displayName,
			avatarUrl: comment.user.avatarUrl,
		},
	}))

	return {
		success: true,
		data: {
			comments,
		},
		requestId,
	}
})
