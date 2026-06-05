/**
 * Get User Notifications Endpoint
 * GET /api/v1/notifications
 *
 * Get the authenticated user's notifications.
 * Returns follow, like, comment, collect, purchase, and mention notifications.
 *
 * Authentication: Required
 *
 * Query Parameters:
 * - cursor: ISO datetime string for pagination
 * - limit: 1-50 (default: 20)
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getUserNotificationsDirect } from '@/server/utils/notifications'
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

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
		? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50)
		: 20

	// Call the direct utility function
	const result = await getUserNotificationsDirect(userId, cursor, limit)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to fetch notifications',
			},
			requestId,
		}
	}

	// Block filter: drop notifications whose actor is blocked in either
	// direction so blocked users can't generate notifications you see.
	const blockedSet = await getBlockedUserIdSet(userId)
	const filteredNotifications = blockedSet.size > 0
		? (result.notifications ?? []).filter((n) => {
			const actor = n as { actor?: { id?: string }; actorId?: string }
			const actorId = actor.actor?.id ?? actor.actorId
			return !(actorId && blockedSet.has(actorId))
		})
		: result.notifications ?? []

	return {
		success: true,
		data: {
			notifications: filteredNotifications,
		},
		meta: {
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		},
		requestId,
	}
})
