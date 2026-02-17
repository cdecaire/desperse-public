/**
 * Get Ably Token Endpoint
 * POST /api/v1/ably/token
 *
 * Get an Ably token request for real-time messaging.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getAblyTokenDirect } from '@/server/utils/ably-token-direct'

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

	try {
		const result = await getAblyTokenDirect(token)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 500)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'SERVER_ERROR',
					message: result.error || 'Failed to get Ably token',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: result.tokenRequest,
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[ably/token][${requestId}] Error:`, error)

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
