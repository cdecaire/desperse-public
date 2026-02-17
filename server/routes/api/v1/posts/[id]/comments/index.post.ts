/**
 * Create Comment Endpoint
 * POST /api/v1/posts/:id/comments
 *
 * Create a comment on a post.
 *
 * Authentication: Required
 *
 * Request Body:
 * {
 *   "content": "Comment text (1-280 chars)"
 * }
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	readBody,
	setHeaders,
	createError,
} from 'h3'
import { createCommentDirect } from '@/server/utils/comments'

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
		throw createError({
			statusCode: 401,
			data: {
				success: false,
				error: {
					code: 'AUTH_REQUIRED',
					message: 'Authentication required',
				},
				requestId,
			},
		})
	}

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

	// Parse request body
	let body: Record<string, unknown>
	try {
		body = (await readBody(event)) || {}
	} catch {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request body',
				},
				requestId,
			},
		})
	}

	// Validate content
	const content = body.content as string | undefined
	if (!content || typeof content !== 'string') {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'content is required and must be a string',
				},
				requestId,
			},
		})
	}

	if (content.length < 1 || content.length > 280) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'content must be 1-280 characters',
				},
				requestId,
			},
		})
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await createCommentDirect(postId, content, token)

	// Handle errors returned from server function
	if (!result || !result.success) {
		const errorMessage = result?.error || 'Failed to create comment'
		const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
		                    errorMessage.toLowerCase().includes('auth')

		throw createError({
			statusCode: isAuthError ? 401 : 400,
			data: {
				success: false,
				error: {
					code: isAuthError ? 'AUTH_REQUIRED' : 'VALIDATION_ERROR',
					message: errorMessage,
				},
				requestId,
			},
		})
	}

	// Transform user: usernameSlug -> slug for mobile API compatibility
	const comment = result.comment ? {
		id: result.comment.id,
		content: result.comment.content,
		createdAt: result.comment.createdAt,
		user: {
			id: result.comment.user.id,
			slug: result.comment.user.usernameSlug,
			displayName: result.comment.user.displayName,
			avatarUrl: result.comment.user.avatarUrl,
		},
	} : null

	return {
		success: true,
		data: {
			comment,
		},
		requestId,
	}
})
