/**
 * Archive/Unarchive Thread Endpoint
 * POST /api/v1/messages/threads/:threadId/archive
 *
 * Archive or unarchive a message thread.
 *
 * Authentication: Required
 *
 * Body:
 * - archived: boolean
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { archiveThreadDirect } from '@/server/utils/messaging-direct'

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
	if (typeof body?.archived !== 'boolean') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'archived (boolean) is required',
			},
			requestId,
		}
	}

	try {
		const result = await archiveThreadDirect(token, threadId, body.archived)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to update archive status',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				archived: body.archived,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(
			`[messages/threads/${threadId}/archive][${requestId}] Error:`,
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
