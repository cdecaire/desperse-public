/**
 * Mark Thread Read Endpoint
 * POST /api/v1/messages/threads/:threadId/read
 *
 * Mark all messages in a thread as read.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { markThreadReadDirect } from '@/server/utils/messaging-direct'

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

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

	const threadId = getRouterParam(event, 'threadId')
	if (!threadId || !uuidRegex.test(threadId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid thread ID (UUID) is required',
			},
			requestId,
		}
	}

	try {
		const result = await markThreadReadDirect(token, threadId)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to mark thread as read',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				readAt: result.readAt,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(
			`[messages/threads/${threadId}/read][${requestId}] Error:`,
			error
		)

		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: errorMessage,
			},
			requestId,
		}
	}
})
