/**
 * User Collectors List Endpoint
 * GET /api/v1/users/:slug/collectors
 *
 * Get paginated list of users who have collected items created by this user.
 *
 * Authentication: Optional (used to check if current user follows each collector)
 *
 * Query Parameters:
 * - cursor: ISO datetime string for pagination
 * - limit: 1-50 (default: 50)
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getCollectorsListDirect } from '@/server/utils/follows'
import { authenticateWithToken } from '@/server/auth'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Get slug from route params
	const slug = getRouterParam(event, 'slug')

	if (!slug) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'User slug is required',
			},
			requestId,
		}
	}

	// Validate slug format (lowercase, alphanumeric, underscore, period, hyphen)
	const slugRegex = /^[a-z0-9_.-]{1,32}$/
	if (!slugRegex.test(slug)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid user slug format',
			},
			requestId,
		}
	}

	// Parse query parameters
	const query = getQuery(event)
	const cursor = query.cursor as string | undefined
	const limitParam = query.limit as string | undefined
	const limit = limitParam
		? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 50)
		: 50

	// Look up user by slug to get userId
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.usernameSlug, slug))
		.limit(1)

	if (!user) {
		setResponseStatus(event, 404)
		return {
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: 'User not found',
			},
			requestId,
		}
	}

	// Optionally authenticate to get current user ID for follow status
	let currentUserId: string | undefined
	const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
	if (token) {
		try {
			const auth = await authenticateWithToken(token)
			currentUserId = auth?.userId
		} catch {
			// Ignore auth errors - just proceed without current user context
		}
	}

	// Call the direct utility function
	const result = await getCollectorsListDirect(user.id, currentUserId, cursor, limit)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to fetch collectors',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			users: result.users,
		},
		meta: {
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		},
		requestId,
	}
})
