/**
 * Download Nonce Endpoint
 * POST /api/v1/downloads/nonce
 *
 * Generate a nonce + message for wallet signature verification.
 * Step 1 of gated download auth flow.
 *
 * Authentication: Required (bearer token)
 *
 * Request Body:
 * - assetId: UUID of the asset to download
 *
 * Response:
 * - nonce: The generated nonce
 * - message: The message the wallet should sign
 * - expiresAt: ISO datetime when nonce expires
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getDownloadNonceDirect } from '@/server/utils/downloadAuth'
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
		const body = await readBody(event)
		const assetId = body?.assetId as string | undefined

		if (!assetId) {
			setResponseStatus(event, 400)
			return {
				success: false,
				error: { code: 'VALIDATION_ERROR', message: 'assetId is required' },
				requestId,
			}
		}

		// Generate nonce using the user's wallet address
		const result = await getDownloadNonceDirect(assetId, walletAddress)

		if (!result.success) {
			setResponseStatus(event, 400)
			return {
				success: false,
				error: { code: 'NONCE_ERROR', message: result.error || 'Failed to generate nonce' },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				nonce: result.nonce,
				message: result.message,
				expiresAt: result.expiresAt,
			},
			requestId,
		}
	} catch (error) {
		console.error('[POST /api/v1/downloads/nonce] Error:', error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'SERVER_ERROR', message: 'Failed to generate download nonce' },
			requestId,
		}
	}
})
