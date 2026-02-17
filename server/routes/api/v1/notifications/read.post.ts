/**
 * Mark Notifications as Read Endpoint
 * POST /api/v1/notifications/read
 *
 * Mark specific notifications as read.
 *
 * Authentication: Required
 *
 * Body:
 * - notificationIds: string[] - Array of notification IDs to mark as read
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { markNotificationsAsReadDirect } from '@/server/utils/notifications'
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

	// Parse request body
	let body: { notificationIds?: string[] }
	try {
		body = await readBody(event)
	} catch (error) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'INVALID_REQUEST',
				message: 'Invalid request body',
			},
			requestId,
		}
	}

	const { notificationIds } = body

	if (!notificationIds || !Array.isArray(notificationIds)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'INVALID_REQUEST',
				message: 'notificationIds array is required',
			},
			requestId,
		}
	}

	// Call the direct utility function
	const result = await markNotificationsAsReadDirect(userId, notificationIds)

	if (!result.success) {
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'SERVER_ERROR',
				message: result.error || 'Failed to mark notifications as read',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			markedCount: notificationIds.length,
		},
		requestId,
	}
})
