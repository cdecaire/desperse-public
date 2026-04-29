/**
 * GET /api/v1/users/me/blocked
 *
 * List the authenticated user's blocked users with profile data joined.
 * Newest blocks first.
 *
 * Authentication: Required.
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	createError,
} from 'h3'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { userBlocks, users } from '@/server/db/schema'
import { authenticateWithToken } from '@/server/auth'

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

	const rows = await db
		.select({
			id: users.id,
			slug: users.usernameSlug,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			blockedAt: userBlocks.createdAt,
		})
		.from(userBlocks)
		.innerJoin(users, eq(userBlocks.blockedId, users.id))
		.where(eq(userBlocks.blockerId, auth.userId))
		.orderBy(desc(userBlocks.createdAt))

	return {
		success: true,
		data: {
			users: rows.map((r) => ({
				id: r.id,
				slug: r.slug,
				displayName: r.displayName,
				avatarUrl: r.avatarUrl,
			})),
		},
		requestId,
	}
})
