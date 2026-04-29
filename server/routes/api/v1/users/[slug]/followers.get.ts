/**
 * User Followers List Endpoint
 * GET /api/v1/users/:slug/followers
 *
 * Get paginated list of followers for a user.
 *
 * Authentication: Optional (used to check if current user follows each follower)
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
import { getFollowersListDirect } from '@/server/utils/follows'
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'
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

	// Block filter: if the slug user is in the viewer's blocked set
	// (either direction), the profile root already 404s; serve a
	// consistent empty list here as defense-in-depth. Also filter
	// individual list items whose users are blocked.
	const blockedSet = await getBlockedUserIdSet(currentUserId)
	if (blockedSet.has(user.id)) {
		return {
			success: true,
			data: { users: [] },
			meta: { hasMore: false, nextCursor: null },
			requestId,
		}
	}

	// Call the direct utility function
	const result = await getFollowersListDirect(user.id, currentUserId, cursor, limit)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to fetch followers',
			},
			requestId,
		}
	}

	const filteredUsers = blockedSet.size > 0
		? (result.users ?? []).filter((u) => !blockedSet.has(u.id))
		: result.users ?? []

	return {
		success: true,
		data: {
			users: filteredUsers,
		},
		meta: {
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		},
		requestId,
	}
})
