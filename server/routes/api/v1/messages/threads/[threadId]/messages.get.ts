/**
 * Get Thread Messages Endpoint
 * GET /api/v1/messages/threads/:threadId/messages
 *
 * Get messages for a specific thread.
 *
 * Authentication: Required
 *
 * Query Parameters:
 * - cursor: message ID for pagination (optional)
 * - limit: 1-100 (default: 50)
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getMessagesDirect } from '@/server/utils/messaging-direct'

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

	const query = getQuery(event)
	const cursor = query.cursor as string | undefined
	const limitParam = query.limit as string | undefined
	const limit = limitParam
		? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
		: 50

	try {
		const result = await getMessagesDirect(token, threadId, cursor, limit)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to fetch messages',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				messages: result.messages,
				otherLastReadAt: result.otherLastReadAt ?? null,
				nextCursor: result.nextCursor ?? null,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(
			`[messages/threads/${threadId}/messages][${requestId}] Error:`,
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
