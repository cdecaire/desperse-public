/**
 * Follow User Endpoint
 * POST /api/v1/users/:id/follow
 *
 * Follow a user.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { followUserDirect } from '@/server/utils/follows'

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

	// Get user ID from route params
	const userId = getRouterParam(event, 'id')

	if (!userId) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'User ID is required',
				},
				requestId,
			},
		})
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(userId)) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid user ID format',
				},
				requestId,
			},
		})
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await followUserDirect(userId, token)

	// Handle errors returned from server function
	if (!result || !result.success) {
		const errorMessage = result?.error || 'Failed to follow user'
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

	return {
		success: true,
		data: {
			isFollowing: true,
		},
		requestId,
	}
})
