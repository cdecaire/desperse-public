/**
 * Post Collectors List Endpoint
 * GET /api/v1/posts/:id/collectors
 *
 * Get paginated list of users who have collected or purchased this post.
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
import { getPostCollectorsListDirect } from '@/server/utils/follows'
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

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

	// Parse query parameters
	const query = getQuery(event)
	const cursor = query.cursor as string | undefined
	const limitParam = query.limit as string | undefined
	const limit = limitParam
		? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 50)
		: 50

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

	const result = await getPostCollectorsListDirect(postId, currentUserId, cursor, limit)

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

	const blockedSet = await getBlockedUserIdSet(currentUserId)
	const filteredUsers = blockedSet.size > 0
		? (result.users ?? []).filter((u: { id: string }) => !blockedSet.has(u.id))
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
