/**
 * Confirm Tip Endpoint
 * POST /api/v1/tips/confirm
 *
 * Confirm a tip after the transaction has been signed and broadcast.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "tipId": "uuid",
 *   "txSignature": "base58-signature"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { "status": "confirmed" }
 * }
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { authenticateWithToken } from '@/server/auth'
import { confirmTipInternal } from '@/server/utils/tips-internal'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	// Authenticate
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: {
					code: 'AUTH_REQUIRED',
					message: 'Invalid or expired token',
				},
				requestId,
			}
		}
		userId = auth.userId
	} catch {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication failed',
			},
			requestId,
		}
	}

	// Parse request body
	let body: Record<string, unknown>
	try {
		body = (await readBody(event)) || {}
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request body',
			},
			requestId,
		}
	}

	// Validate required fields
	if (!body.tipId || typeof body.tipId !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'tipId is required',
			},
			requestId,
		}
	}

	if (!body.txSignature || typeof body.txSignature !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'txSignature is required',
			},
			requestId,
		}
	}

	// Call the internal confirm function
	const result = await confirmTipInternal(userId, {
		tipId: body.tipId as string,
		txSignature: body.txSignature as string,
	})

	if (!result.success) {
		let statusCode = 400
		if (result.status === 'not_found') statusCode = 404
		if (result.status === 'unauthorized') statusCode = 403

		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: {
				code: result.status === 'unauthorized' ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
				message: result.error || 'Failed to confirm tip',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			status: result.status || 'confirmed',
		},
		requestId,
	}
})
