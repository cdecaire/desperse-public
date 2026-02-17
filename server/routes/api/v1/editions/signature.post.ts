/**
 * Submit Signature Endpoint
 * POST /api/v1/editions/signature
 *
 * Submit signed transaction after client signing.
 * Called after client signs the transaction and broadcasts to the network.
 *
 * Authentication: Required (VULN-10 fix: authenticated user must match purchase userId)
 *
 * Request:
 * {
 *   "purchaseId": "uuid",
 *   "txSignature": "solana-transaction-signature-base58"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "submitted"
 *   }
 * }
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { submitPurchaseSignatureDirect } from '@/server/utils/editions'
import { authenticateWithToken } from '@/server/auth'
import { db } from '@/server/db'
import { purchases } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Authenticate user (VULN-10 fix)
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

	const auth = await authenticateWithToken(token)
	if (!auth?.userId) {
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
	if (!body.purchaseId || typeof body.purchaseId !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'purchaseId is required and must be a string',
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
				message: 'txSignature is required and must be a string',
			},
			requestId,
		}
	}

	// Verify the authenticated user owns this purchase (VULN-10 fix)
	const [purchase] = await db
		.select({ userId: purchases.userId })
		.from(purchases)
		.where(eq(purchases.id, body.purchaseId as string))
		.limit(1)

	if (!purchase) {
		setResponseStatus(event, 404)
		return {
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Purchase not found',
			},
			requestId,
		}
	}

	if (purchase.userId !== auth.userId) {
		setResponseStatus(event, 403)
		return {
			success: false,
			error: {
				code: 'FORBIDDEN',
				message: 'You are not authorized to submit a signature for this purchase',
			},
			requestId,
		}
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await submitPurchaseSignatureDirect(
		body.purchaseId as string,
		body.txSignature as string
	)

	if (!result.success) {
		// Determine error code
		const errorCode = result.error?.includes('expired')
			? 'TX_EXPIRED_BLOCKHASH'
			: result.error?.includes('not found')
				? 'NOT_FOUND'
				: 'VALIDATION_ERROR'

		setResponseStatus(event, errorCode === 'NOT_FOUND' ? 404 : 400)
		return {
			success: false,
			error: {
				code: errorCode,
				message: result.error || 'Failed to submit signature',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			status: 'submitted',
		},
		requestId,
	}
})
