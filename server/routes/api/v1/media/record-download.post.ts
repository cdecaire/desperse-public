/**
 * Record Download Endpoint
 * POST /api/v1/media/record-download
 *
 * Increments the net-new download tally for a downloadable asset. Called as a
 * fire-and-forget beacon by the web client after a successful download (both
 * free and gated). Intentionally unauthenticated — free downloads are anonymous
 * — and scoped server-side to real downloadable assets.
 *
 * Body: { assetId: string }
 */

import {
	defineEventHandler,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { recordAssetDownload } from '@/server/utils/downloads'

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	let body: { assetId?: string }
	try {
		body = ((await readBody(event)) as typeof body) ?? {}
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
			requestId,
		}
	}

	const assetId = body.assetId?.trim()
	if (!assetId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'assetId is required' },
			requestId,
		}
	}

	try {
		const recorded = await recordAssetDownload(assetId)
		return {
			success: true,
			data: { recorded },
			requestId,
		}
	} catch (error) {
		console.error(`[record-download][${requestId}] Error:`, error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Failed to record download' },
			requestId,
		}
	}
})
