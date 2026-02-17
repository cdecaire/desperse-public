/**
 * Unlike Post Endpoint
 * DELETE /api/v1/posts/:id/like
 *
 * Unlike a post.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { unlikePostDirect } from '@/server/utils/likes'

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token from header
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	// Get post ID from route params
	const postId = getRouterParam(event, 'id')

	if (!postId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Post ID is required',
			},
			requestId,
		}
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(postId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid post ID format',
			},
			requestId,
		}
	}

	// Call direct unlike function (bypasses createServerFn)
	try {
		const result = await unlikePostDirect(postId, token)

		if (!result.success) {
			const isAuthError = result.error
				?.toLowerCase()
				.includes('auth')

			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'AUTH_REQUIRED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to unlike post',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				isLiked: false,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		console.error(`[unlike][${requestId}] Error:`, error)

		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: errorMessage,
			},
			requestId,
		}
	}
})
