/**
 * Delete Message Endpoint
 * DELETE /api/v1/messages/:messageId
 *
 * Delete a message (only the sender can delete their own message).
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
import { deleteMessageDirect } from '@/server/utils/messaging-direct'

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

	const messageId = getRouterParam(event, 'messageId')
	if (!messageId || !uuidRegex.test(messageId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid message ID (UUID) is required',
			},
			requestId,
		}
	}

	try {
		const result = await deleteMessageDirect(token, messageId)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to delete message',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				deleted: true,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[messages/${messageId}/delete][${requestId}] Error:`, error)

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
