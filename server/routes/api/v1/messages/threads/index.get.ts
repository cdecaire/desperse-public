/**
 * List Threads Endpoint
 * GET /api/v1/messages/threads
 *
 * Get the authenticated user's message threads.
 *
 * Authentication: Required
 *
 * Query Parameters:
 * - cursor: ISO datetime string for pagination (optional)
 * - limit: 1-50 (default: 20)
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getThreadsDirect } from '@/server/utils/messaging-direct'

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

	const query = getQuery(event)
	const cursor = query.cursor as string | undefined
	const limitParam = query.limit as string | undefined
	const limit = limitParam
		? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50)
		: 20

	try {
		const result = await getThreadsDirect(token, cursor, limit)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 500)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'SERVER_ERROR',
					message: result.error || 'Failed to fetch threads',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				threads: result.threads,
				nextCursor: result.nextCursor ?? null,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[messages/threads][${requestId}] Error:`, error)

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
