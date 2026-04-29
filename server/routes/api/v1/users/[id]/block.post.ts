/**
 * POST /api/v1/users/:id/block
 *
 * Block another user. Idempotent — a duplicate block attempt returns 200
 * without inserting (relies on the unique index on (blocker_id, blocked_id)).
 *
 * Block semantics: if EITHER party has blocked the other, content is
 * hidden symmetrically across feed, profile, post detail, comments, DMs,
 * notifications, and search. See `src/server/utils/blocks.ts`.
 *
 * Authentication: Required (the blocker is the authenticated user).
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { and, eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { userBlocks, users } from '@/server/db/schema'
import { authenticateWithToken } from '@/server/auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

	if (!token) {
		throw createError({
			statusCode: 401,
			data: {
				success: false,
				error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
				requestId,
			},
		})
	}

	const auth = await authenticateWithToken(token)
	if (!auth?.userId) {
		throw createError({
			statusCode: 401,
			data: {
				success: false,
				error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
				requestId,
			},
		})
	}

	const blockedId = getRouterParam(event, 'id')
	if (!blockedId || !UUID_REGEX.test(blockedId)) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
				requestId,
			},
		})
	}

	if (blockedId === auth.userId) {
		throw createError({
			statusCode: 400,
			data: {
				success: false,
				error: { code: 'VALIDATION_ERROR', message: "You can't block yourself" },
				requestId,
			},
		})
	}

	// Confirm the target user exists. Returning 404 on a missing user keeps
	// the API honest; otherwise an attacker could probe wallet addresses by
	// observing 200 vs 404 from /follow vs /block.
	const target = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, blockedId))
		.limit(1)
	if (target.length === 0) {
		throw createError({
			statusCode: 404,
			data: {
				success: false,
				error: { code: 'NOT_FOUND', message: 'User not found' },
				requestId,
			},
		})
	}

	// onConflictDoNothing keeps this idempotent — repeated blocks return
	// 200 without writing a duplicate row.
	await db
		.insert(userBlocks)
		.values({ blockerId: auth.userId, blockedId })
		.onConflictDoNothing({ target: [userBlocks.blockerId, userBlocks.blockedId] })

	return {
		success: true,
		data: { isBlocked: true },
		requestId,
	}
})
