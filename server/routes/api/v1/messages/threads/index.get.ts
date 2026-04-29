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
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

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

		// Block filter: drop threads where the other party is blocked in
		// either direction. Pre-existing thread-level block remains a
		// separate finer-grained tool but user-level block is stricter.
		let viewerId: string | null = null
		try {
			const auth = await authenticateWithToken(token)
			if (auth?.userId) viewerId = auth.userId
		} catch {
			// keep empty set
		}
		const blockedSet = await getBlockedUserIdSet(viewerId)
		const filteredThreads = blockedSet.size > 0
			? (result.threads ?? []).filter((t: { otherUser?: { id?: string } } & Record<string, unknown>) => {
				const otherId = t.otherUser?.id
				return !(otherId && blockedSet.has(otherId))
			})
			: result.threads ?? []

		return {
			success: true,
			data: {
				threads: filteredThreads,
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
