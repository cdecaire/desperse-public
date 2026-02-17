/**
 * Get or Create Thread Endpoint
 * POST /api/v1/messages/threads
 *
 * Get an existing thread with the specified user, or create a new one.
 *
 * Authentication: Required
 *
 * Body:
 * - otherUserId: string (UUID) - The other participant's user ID
 * - contextCreatorId: string (UUID) - The creator context for DM eligibility
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getOrCreateThreadDirect } from '@/server/utils/messaging-direct'

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

	const body = await readBody(event)
	const { otherUserId, contextCreatorId } = body || {}

	if (!otherUserId || !uuidRegex.test(otherUserId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid otherUserId (UUID) is required',
			},
			requestId,
		}
	}

	if (!contextCreatorId || !uuidRegex.test(contextCreatorId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid contextCreatorId (UUID) is required',
			},
			requestId,
		}
	}

	try {
		const result = await getOrCreateThreadDirect(
			token,
			otherUserId,
			contextCreatorId
		)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to get or create thread',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				thread: result.thread,
				otherUser: result.otherUser,
				created: result.created ?? false,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[messages/threads/create][${requestId}] Error:`, error)

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
