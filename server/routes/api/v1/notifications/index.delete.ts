/**
 * Clear All Notifications Endpoint
 * DELETE /api/v1/notifications
 *
 * Clear all notifications for the authenticated user.
 * This permanently deletes all notifications.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { clearAllNotificationsDirect } from '@/server/utils/notifications'
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

	// Call the direct utility function
	const result = await clearAllNotificationsDirect(userId)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to clear notifications',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {},
		requestId,
	}
})
