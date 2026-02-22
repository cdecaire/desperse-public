/**
 * Create Post Endpoint
 * POST /api/v1/posts
 *
 * Create a new post (standard, collectible, or edition).
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
import { createPostDirect } from '@/server/utils/create-post'

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

	let body: Record<string, unknown>
	try {
		body = (await readBody(event)) as Record<string, unknown>
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
			requestId,
		}
	}

	if (!body.mediaUrl || !body.type) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'mediaUrl and type are required' },
			requestId,
		}
	}

	const validTypes = ['post', 'collectible', 'edition']
	if (!validTypes.includes(body.type as string)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'type must be post, collectible, or edition' },
			requestId,
		}
	}

	try {
		const result = await createPostDirect(body as any, token)

		if (!result.success) {
			const errorLower = (result.error || '').toLowerCase()
			const isAuthError = errorLower.includes('auth')

			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'AUTH_REQUIRED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to create post',
				},
				requestId,
			}
		}

		setResponseStatus(event, 201)
		return {
			success: true,
			data: { post: result.post },
			requestId,
		}
	} catch (error) {
		console.error(`[create-post][${requestId}] Error:`, error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
			requestId,
		}
	}
})
