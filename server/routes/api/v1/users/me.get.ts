/**
 * Current User Endpoint
 * GET /api/v1/users/me
 *
 * Returns the currently authenticated user.
 * Returns null user if not authenticated (not an error).
 *
 * Authentication: Required (Bearer token in Authorization header)
 */

import { defineEventHandler, getHeader, setHeaders } from 'h3'
import { getCurrentUserByToken } from '@/server/utils/auth-standalone'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token from header
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	console.log(`[me.get] ${requestId} authHeader=${authHeader ? 'present' : 'missing'} tokenLength=${token?.length || 0}`)

	// Use standalone function instead of TanStack server function
	const result = await getCurrentUserByToken(token)

	console.log(`[me.get] ${requestId} result: user=${result.user?.usernameSlug || 'null'}`)

	return {
		success: true,
		data: {
			user: result.user || null,
		},
		requestId,
	}
})
