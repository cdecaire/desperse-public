/**
 * Send Message Endpoint
 * POST /api/v1/messages/threads/:threadId/messages
 *
 * Send a message in a thread.
 *
 * Authentication: Required
 *
 * Body:
 * - content: string (1-2000 characters)
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { sendMessageDirect } from '@/server/utils/messaging-direct'

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

	const body = await readBody(event)
	const content = body?.content as string | undefined

	if (!content || typeof content !== 'string' || content.trim().length === 0) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Message content is required',
			},
			requestId,
		}
	}

	if (content.length > 2000) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Message content must be 2000 characters or less',
			},
			requestId,
		}
	}

	try {
		const result = await sendMessageDirect(token, threadId, content)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to send message',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				message: result.message,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(
			`[messages/threads/${threadId}/send][${requestId}] Error:`,
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
