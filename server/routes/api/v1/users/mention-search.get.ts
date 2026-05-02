/**
 * GET /api/v1/users/mention-search
 * Search users for @mention autocomplete
 *
 * Query params:
 * - query: Optional search string (max 32 chars)
 * - limit: Optional number of results (1-20, default 8)
 *
 * Returns:
 * - users: Array of { id, usernameSlug, displayName, avatarUrl }
 */

import { defineEventHandler, getHeader, getQuery, setResponseStatus } from 'h3'
import { searchMentionUsersDirect } from '@/server/utils/mention-search'
import { authenticateWithToken } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		// Parse query params
		const queryParams = getQuery(event)
		const query = typeof queryParams.query === 'string' ? queryParams.query.slice(0, 32) : undefined
		const limit = typeof queryParams.limit === 'string' ? parseInt(queryParams.limit, 10) : 8

		// Validate limit
		if (isNaN(limit) || limit < 1 || limit > 20) {
			setResponseStatus(event, 400)
			return {
				success: false,
				error: { code: 'invalid_limit', message: 'Limit must be between 1 and 20' },
				requestId,
			}
		}

		const result = await searchMentionUsersDirect(token, query, limit)

		if (!result.success) {
			setResponseStatus(event, result.error === 'Authentication required' ? 401 : 400)
			return {
				success: false,
				error: { code: 'error', message: result.error },
				requestId,
			}
		}

		// Block filter: drop users blocked in either direction so the
		// blocker can't @-mention a blocked user (and vice versa).
		let viewerId: string | null = null
		try {
			const auth = await authenticateWithToken(token)
			if (auth?.userId) viewerId = auth.userId
		} catch {
			// continue with empty block set
		}
		const blockedSet = await getBlockedUserIdSet(viewerId)
		const filteredUsers = blockedSet.size > 0
			? (result.users ?? []).filter((u: { id: string }) => !blockedSet.has(u.id))
			: result.users ?? []

		return {
			success: true,
			data: {
				users: filteredUsers,
			},
			requestId,
		}
	} catch (error) {
		console.error('[GET /users/mention-search] Error:', error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to search users' },
			requestId,
		}
	}
})
