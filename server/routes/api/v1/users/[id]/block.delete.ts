/**
 * DELETE /api/v1/users/:id/block
 *
 * Unblock a previously blocked user. Idempotent — unblocking a user who
 * isn't currently blocked returns 200 without erroring.
 *
 * Authentication: Required.
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
import { userBlocks } from '@/server/db/schema'
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

	await db
		.delete(userBlocks)
		.where(
			and(eq(userBlocks.blockerId, auth.userId), eq(userBlocks.blockedId, blockedId)),
		)

	return {
		success: true,
		data: { isBlocked: false },
		requestId,
	}
})
