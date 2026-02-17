/**
 * Buy Edition Endpoint
 * POST /api/v1/editions/buy
 *
 * Initiate edition purchase. Returns unsigned transaction for client to sign.
 *
 * Authentication: Required (Bearer token in Authorization header)
 *
 * Request:
 * {
 *   "postId": "uuid",
 *   "walletAddress": "optional-connected-wallet-address"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "purchaseId": "uuid",
 *     "status": "reserved",
 *     "unsignedTxBase64": "...",
 *     "priceDisplay": "0.5 SOL",
 *     "expiresAt": "2026-01-31T12:01:00Z"
 *   }
 * }
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { buyEditionDirect } from '@/server/utils/editions'

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

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication required. Please provide a valid Bearer token.',
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
	if (!body.postId || typeof body.postId !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'postId is required and must be a string',
			},
			requestId,
		}
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await buyEditionDirect(
		body.postId as string,
		body.walletAddress as string | undefined,
		token
	)

	// Handle different response types
	if (!result.success) {
		// Determine status code based on error type
		let statusCode = 400

		if (result.error === 'auth_required') {
			statusCode = 401
		} else if (result.status === 'sold_out') {
			statusCode = 400
		} else if (result.status === 'insufficient_funds') {
			statusCode = 400
		}

		const errorCode =
			result.error === 'auth_required'
				? 'AUTH_REQUIRED'
				: result.status === 'sold_out'
					? 'SOLD_OUT'
					: result.status === 'insufficient_funds'
						? 'INSUFFICIENT_FUNDS'
						: 'VALIDATION_ERROR'

		setResponseStatus(event, statusCode)
		return {
			success: false,
			data: result.status ? { status: result.status } : undefined,
			error: {
				code: errorCode,
				message: result.message || result.error || 'Failed to initiate purchase',
			},
			requestId,
		}
	}

	// Calculate expiry time (~60 seconds from now for blockhash)
	const expiresAt = new Date(Date.now() + 60 * 1000).toISOString()

	// Format price for display
	const priceDisplay = result.transaction ? 'See transaction' : undefined

	return {
		success: true,
		data: {
			purchaseId: result.purchaseId,
			status: result.status,
			unsignedTxBase64: result.transaction,
			priceDisplay,
			expiresAt,
		},
		requestId,
	}
})
