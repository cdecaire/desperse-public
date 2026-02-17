/**
 * User Activity Feed Endpoint
 * GET /api/v1/users/me/activity
 *
 * Get the authenticated user's activity feed.
 * Shows posts created, likes, comments, collections, and purchases.
 *
 * Authentication: Required (this is private activity data)
 *
 * Query Parameters:
 * - cursor: ISO datetime string for pagination
 * - limit: 1-50 (default: 50)
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getUserActivityDirect } from '@/server/utils/follows'
import { authenticateWithToken } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Authenticate - required for this endpoint
	const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'UNAUTHORIZED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Invalid or expired token',
				},
				requestId,
			}
		}
		userId = auth.userId
	} catch (error) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'UNAUTHORIZED',
				message: 'Authentication failed',
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

	// Call the direct utility function
	const result = await getUserActivityDirect(userId, cursor, limit)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to fetch activity',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			activities: result.activities,
		},
		meta: {
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		},
		requestId,
	}
})
