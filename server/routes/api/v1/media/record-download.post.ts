/**
 * Record Download Endpoint
 * POST /api/v1/media/record-download
 *
 * Records a unique-per-user download for a downloadable asset (counting only —
 * never gates the download). Requires auth: the count is keyed on the user, so
 * anonymous downloads are simply not counted (and never error the download UX).
 *
 * Header: Authorization: Bearer <token>
 * Body:   { assetId: string }
 * Returns: { success, data: { recorded: boolean } }
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { authenticateWithToken } from '@/server/auth'
import { recordAssetDownload } from '@/server/utils/downloads'

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Parse body
	let body: { assetId?: string }
	try {
		body = ((await readBody(event)) as typeof body) ?? {}
	} catch {
		return { success: true, data: { recorded: false }, requestId }
	}

	const assetId = body.assetId?.trim()
	if (!assetId) {
		return { success: true, data: { recorded: false }, requestId }
	}

	// Auth is required to attribute a unique download. Missing/invalid auth is not
	// an error — the download already happened; we just don't count it.
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
	if (!token) {
		return { success: true, data: { recorded: false }, requestId }
	}

	const auth = await authenticateWithToken(token)
	if (!auth) {
		return { success: true, data: { recorded: false }, requestId }
	}

	try {
		const { recorded } = await recordAssetDownload(assetId, auth.userId)
		return { success: true, data: { recorded }, requestId }
	} catch (error) {
		console.error(`[record-download][${requestId}] Error:`, error)
		// Never surface a failure to the download UX — just don't count.
		return { success: true, data: { recorded: false }, requestId }
	}
})
