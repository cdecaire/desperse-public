/**
 * Delete Post Endpoint
 * DELETE /api/v1/posts/:id
 *
 * Soft delete a post.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { deletePostDirect } from '@/server/utils/delete-post'

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' }, requestId }
	}

	const postId = getRouterParam(event, 'id')
	if (!postId) {
		setResponseStatus(event, 400)
		return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Post ID is required' }, requestId }
	}

	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(postId)) {
		setResponseStatus(event, 400)
		return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid post ID format' }, requestId }
	}

	try {
		const result = await deletePostDirect(postId, token)

		if (!result.success) {
			const errorLower = (result.error || '').toLowerCase()
			const isAuthError = errorLower.includes('auth') || errorLower.includes('permission')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return { success: false, error: { code: isAuthError ? 'AUTH_REQUIRED' : 'VALIDATION_ERROR', message: result.error || 'Failed to delete post' }, requestId }
		}

		return {
			success: true,
			data: { ...(result.warning ? { warning: result.warning } : {}) },
			requestId,
		}
	} catch (error) {
		console.error(`[delete-post][${requestId}] Error:`, error)
		setResponseStatus(event, 500)
		return { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, requestId }
	}
})
