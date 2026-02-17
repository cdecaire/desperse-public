/**
 * Get Post Comments Endpoint
 * GET /api/v1/posts/:id/comments
 *
 * Get paginated comments for a post.
 *
 * Authentication: Not required
 *
 * Query Parameters:
 * - limit: 1-100 (default: 50)
 * - cursor: pagination cursor (not yet implemented)
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	setHeaders,
	createError,
} from 'h3'
import { getPostCommentsDirect } from '@/server/utils/comments'

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

	// Transform user: usernameSlug -> slug for mobile API compatibility
	const comments = (result.comments || []).map((comment) => ({
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
