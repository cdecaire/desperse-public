/**
 * Purchase Status Endpoint
 * GET /api/v1/editions/purchase/:id/status
 *
 * Poll for purchase confirmation status.
 *
 * Authentication: Not required (uses purchaseId for identification)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "confirmed" | "submitted" | "minting" | etc.,
 *     "txSignature": "solana-tx-sig" | null,
 *     "nftMint": "solana-nft-mint-address" | null
 *   }
 * }
 */

import {
	defineEventHandler,
	getRouterParam,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { checkPurchaseStatusDirect } from '@/server/utils/editions'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Get purchase ID from route params
	const purchaseId = getRouterParam(event, 'id')

	if (!purchaseId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Purchase ID is required',
			},
			requestId,
		}
	}

	// Validate UUID format (basic check)
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(purchaseId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid purchase ID format',
			},
			requestId,
		}
	}

	// Call the direct utility function (bypasses createServerFn)
	const result = await checkPurchaseStatusDirect(purchaseId)

	if (!result.success) {
		const isNotFound = result.error?.includes('not found')

		setResponseStatus(event, isNotFound ? 404 : 500)
		return {
			success: false,
			error: {
				code: isNotFound ? 'NOT_FOUND' : 'SERVER_ERROR',
				message: result.error || 'Failed to check purchase status',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			status: result.status,
			txSignature: result.txSignature || null,
			nftMint: result.nftMint || null,
		},
		requestId,
	}
})
