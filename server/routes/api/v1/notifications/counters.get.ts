/**
 * Get Notification Counters Endpoint
 * GET /api/v1/notifications/counters
 *
 * Returns unified notification counters for feed badges and new posts toast.
 * Used by Android app for polling-based notifications.
 *
 * Authentication: Optional (required for Following counts and unread notifications)
 *
 * Query Parameters:
 * - forYouLastSeen: ISO datetime string - last seen timestamp for For You feed
 * - followingLastSeen: ISO datetime string - last seen timestamp for Following feed
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getNotificationCountersDirect } from '@/server/utils/notifications'
import { authenticateWithToken } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store, max-age=0',
	})

	// Try to authenticate (optional - allows For You counts without auth)
	const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
	let userId: string | null = null

	if (token) {
		try {
			const auth = await authenticateWithToken(token)
			if (auth?.userId) {
				userId = auth.userId
			}
		} catch (error) {
			// Auth failed but we continue - some features work without auth
			console.warn('Auth failed for counters endpoint, continuing without auth:', error)
		}
	}

	// Parse query parameters
	const query = getQuery(event)
	const forYouLastSeen = query.forYouLastSeen as string | null
	const followingLastSeen = query.followingLastSeen as string | null

	// Validate at least one timestamp is provided
	if (!forYouLastSeen && !followingLastSeen && !userId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'BAD_REQUEST',
				message: 'At least one lastSeen timestamp or authentication is required',
			},
			requestId,
		}
	}

	// Call the direct utility function
	const result = await getNotificationCountersDirect(
		userId,
		forYouLastSeen,
		followingLastSeen
	)

	return {
		success: true,
		data: result,
		requestId,
	}
})
