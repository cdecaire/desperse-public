/**
 * User Collected Items Endpoint
 * GET /api/v1/users/:slug/collected
 *
 * Get paginated items collected by a user.
 *
 * Authentication: Optional
 *
 * Query Parameters:
 * - cursor: ISO datetime string for pagination
 * - limit: 1-50 (default: 20)
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getUserCollectedDirect } from '@/server/utils/profile'
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
		? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50)
		: 20

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

	// Optional auth for the block filter.
	let currentUserId: string | null = null
	const authHeader = getHeader(event, 'authorization')
	if (authHeader) {
		try {
			const auth = await authenticateWithToken(authHeader)
			if (auth?.userId) currentUserId = auth.userId
		} catch {
			// continue unauthenticated
		}
	}

	const blockedSet = await getBlockedUserIdSet(currentUserId)
	if (blockedSet.has(user.id)) {
		return {
			success: true,
			data: { posts: [] },
			meta: { hasMore: false, nextCursor: null },
			requestId,
		}
	}

	// Call the direct utility function
	const result = await getUserCollectedDirect(user.id, cursor, limit)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to fetch collected items',
			},
			requestId,
		}
	}

	// Drop posts whose author is blocked — collected items can be by
	// any author, not just the slug user.
	const filteredPosts = blockedSet.size > 0
		? (result.posts ?? []).filter((p: { user?: { id?: string } } & Record<string, unknown>) => {
			const authorId = (p.user?.id as string | undefined) ?? (p as { userId?: string }).userId
			return !(authorId && blockedSet.has(authorId))
		})
		: result.posts ?? []

	return {
		success: true,
		data: {
			posts: filteredPosts,
		},
		meta: {
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		},
		requestId,
	}
})
