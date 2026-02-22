/**
 * Download Verify Endpoint
 * POST /api/v1/downloads/verify
 *
 * Verify wallet signature + on-chain ownership → issue short-lived download token.
 * Step 2 of gated download auth flow.
 *
 * Authentication: Required (bearer token)
 *
 * Request Body:
 * - assetId: UUID of the asset to download
 * - signature: Base58-encoded wallet signature
 * - message: The signed message (from nonce step)
 *
 * Response:
 * - token: Short-lived download token (2 min expiry)
 * - expiresAt: Unix timestamp when token expires
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { verifyAndIssueTokenDirect } from '@/server/utils/downloadAuth'
import { authenticateWithToken } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	try {
		// Require authentication
		const authHeader = getHeader(event, 'authorization')
		if (!authHeader) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
				requestId,
			}
		}

		// Verify token and get user (supports both Privy and SIWS tokens)
		const auth = await authenticateWithToken(authHeader)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
				requestId,
			}
		}

		const walletAddress = auth.walletAddress || null

		if (!walletAddress) {
			setResponseStatus(event, 400)
			return {
				success: false,
				error: { code: 'NO_WALLET', message: 'No wallet address associated with account' },
				requestId,
			}
		}

		// Parse request body
		const body = await readBody(event) as Record<string, any>
		const assetId = body?.assetId as string | undefined
		const signature = body?.signature as string | undefined
		const message = body?.message as string | undefined

		if (!assetId || !signature || !message) {
			setResponseStatus(event, 400)
			return {
				success: false,
				error: { code: 'VALIDATION_ERROR', message: 'assetId, signature, and message are required' },
				requestId,
			}
		}

		// Verify signature and issue token
		const result = await verifyAndIssueTokenDirect(assetId, walletAddress, signature, message)

		if (!result.success) {
			setResponseStatus(event, 403)
			return {
				success: false,
				error: { code: 'VERIFY_ERROR', message: result.error || 'Verification failed' },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				token: result.token,
				expiresAt: result.expiresAt,
			},
			requestId,
		}
	} catch (error) {
		console.error('[POST /api/v1/downloads/verify] Error:', error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'SERVER_ERROR', message: 'Failed to verify download' },
			requestId,
		}
	}
})
