/**
 * Collection Status Endpoint
 * GET /api/v1/collections/:id/status
 *
 * Poll for collection (cNFT minting) confirmation status.
 *
 * Authentication: Not required (uses collectionId)
 */

import {
	defineEventHandler,
	getRouterParam,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { checkCollectionStatusDirect } from '@/server/utils/collect'

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Get collection ID from route params
	const collectionId = getRouterParam(event, 'id')

	if (!collectionId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Collection ID is required',
			},
			requestId,
		}
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(collectionId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid collection ID format',
			},
			requestId,
		}
	}

	// Call direct status check function (bypasses createServerFn)
	try {
		const result = await checkCollectionStatusDirect(collectionId)

		if (!result.success) {
			const isNotFound = result.error?.includes('not found')
			setResponseStatus(event, isNotFound ? 404 : 500)
			return {
				success: false,
				error: {
					code: isNotFound ? 'NOT_FOUND' : 'SERVER_ERROR',
					message: result.error || 'Failed to check collection status',
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
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		console.error(`[collection-status][${requestId}] Error:`, error)

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
