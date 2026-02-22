/**
 * Upload Token Endpoint
 * POST /api/v1/media/upload-token
 *
 * Generate a Vercel Blob client token for direct uploads from Android.
 * This bypasses the 4.5MB serverless body limit.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { authenticateWithToken } from '@/server/auth'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { SUPPORTED_MEDIA_TYPES, MAX_UPLOAD_MB } from '@/server/storage/blob'

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
			requestId,
		}
	}

	// Authenticate
	const auth = await authenticateWithToken(token)
	if (!auth) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: { code: 'AUTH_REQUIRED', message: 'Invalid or expired token' },
			requestId,
		}
	}

	// Parse body
	let body: { pathname?: string; contentType?: string; fileSize?: number }
	try {
		body = (await readBody(event)) as typeof body ?? {}
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
			requestId,
		}
	}

	const { pathname, contentType, fileSize } = body

	if (!pathname || !contentType) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'pathname and contentType are required' },
			requestId,
		}
	}

	// Validate content type
	if (!SUPPORTED_MEDIA_TYPES.includes(contentType)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Unsupported content type' },
			requestId,
		}
	}

	// Validate file size
	if (fileSize && fileSize > MAX_UPLOAD_BYTES) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB` },
			requestId,
		}
	}

	try {
		const clientToken = await generateClientTokenFromReadWriteToken({
			pathname,
			allowedContentTypes: [contentType],
			maximumSizeInBytes: fileSize || MAX_UPLOAD_BYTES,
		})

		return {
			success: true,
			data: { clientToken },
			requestId,
		}
	} catch (error) {
		console.error(`[upload-token][${requestId}] Error:`, error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Failed to generate upload token' },
			requestId,
		}
	}
})
