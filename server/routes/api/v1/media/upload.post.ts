/**
 * POST /api/v1/media/upload
 * Upload media file for post creation
 *
 * Accepts base64-encoded file data in JSON body (same pattern as avatar/header upload):
 * { fileData: string, fileName: string, mimeType: string, fileSize: number }
 */

import { defineEventHandler, getHeader, readBody } from 'h3'
import { uploadMediaDirect } from '@/server/utils/media'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			event.node!.res!.statusCode = 401
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		// Parse request body
		const body = await readBody(event) as Record<string, any>

		if (!body.fileData || !body.fileName || !body.mimeType || typeof body.fileSize !== 'number') {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'invalid_request', message: 'Missing required fields: fileData, fileName, mimeType, fileSize' },
				requestId,
			}
		}

		const result = await uploadMediaDirect(token, {
			fileData: body.fileData,
			fileName: body.fileName,
			mimeType: body.mimeType,
			fileSize: body.fileSize,
		})

		if (!result.success) {
			const statusCode = result.status || 400
			event.node!.res!.statusCode = statusCode
			return {
				success: false,
				error: { code: 'upload_failed', message: result.error },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				url: result.url,
				pathname: result.pathname,
				mediaType: result.mediaType,
			},
			requestId,
		}
	} catch (error) {
		console.error('[POST /media/upload] Error:', error)
		event.node!.res!.statusCode = 500
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to upload media' },
			requestId,
		}
	}
})
