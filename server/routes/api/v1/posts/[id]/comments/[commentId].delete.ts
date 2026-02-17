/**
 * Delete Comment Endpoint
 * DELETE /api/v1/posts/:id/comments/:commentId
 *
 * Delete a comment from a post (only by comment owner).
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
import { deleteCommentDirect } from '@/server/utils/comments'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

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

	// Get post ID and comment ID from route params
	const postId = getRouterParam(event, 'id')
	const commentId = getRouterParam(event, 'commentId')

	if (!postId || !commentId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Post ID and Comment ID are required',
			},
			requestId,
		}
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(postId) || !uuidRegex.test(commentId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid post ID or comment ID format',
			},
			requestId,
		}
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await deleteCommentDirect(postId, commentId, token)

	// Handle errors returned from server function
	if (!result || !result.success) {
		const errorMessage = result?.error || 'Failed to delete comment'
		const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
		                    errorMessage.toLowerCase().includes('auth')
		const isNotFound = errorMessage.toLowerCase().includes('not found')
		const isForbidden = errorMessage.toLowerCase().includes('only delete your own')

		let statusCode = 400
		let errorCode = 'DELETE_FAILED'
		if (isAuthError) {
			statusCode = 401
			errorCode = 'AUTH_REQUIRED'
		} else if (isNotFound) {
			statusCode = 404
			errorCode = 'NOT_FOUND'
		} else if (isForbidden) {
			statusCode = 403
			errorCode = 'FORBIDDEN'
		}

		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: {
				code: errorCode,
				message: errorMessage,
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			deleted: true,
		},
		requestId,
	}
})
