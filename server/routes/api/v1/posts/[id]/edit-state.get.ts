/**
 * Get Post Edit State Endpoint
 * GET /api/v1/posts/:id/edit-state
 *
 * Returns the edit state for a post (field locking based on mint/purchase status).
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
import { db } from '@/server/db'
import { posts, collections, purchases } from '@/server/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

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

	const auth = await authenticateWithToken(token)
	if (!auth) {
		setResponseStatus(event, 401)
		return { success: false, error: { code: 'AUTH_REQUIRED', message: 'Invalid or expired token' }, requestId }
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
		const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1)
		if (!post) {
			setResponseStatus(event, 404)
			return { success: false, error: { code: 'NOT_FOUND', message: 'Post not found' }, requestId }
		}

		// Check ownership
		if (post.userId !== auth.userId) {
			setResponseStatus(event, 403)
			return { success: false, error: { code: 'FORBIDDEN', message: 'Not your post' }, requestId }
		}

		let hasConfirmedCollects = false
		if (post.type === 'collectible') {
			const c = await db.select({ count: count() }).from(collections).where(and(eq(collections.postId, postId), eq(collections.status, 'confirmed')))
			hasConfirmedCollects = (c[0]?.count || 0) > 0
		}

		let hasConfirmedPurchases = false
		if (post.type === 'edition') {
			const p = await db.select({ count: count() }).from(purchases).where(and(eq(purchases.postId, postId), eq(purchases.status, 'confirmed')))
			hasConfirmedPurchases = (p[0]?.count || 0) > 0
		}

		const isMinted = post.type === 'collectible'
			? (hasConfirmedCollects || !!post.mintedAt)
			: !!post.mintedAt
		const mintedIsMutable = post.mintedIsMutable ?? true
		const areNftFieldsLocked = isMinted
		const canUpdateOnChain = false

		return {
			success: true,
			data: {
				hasConfirmedCollects,
				hasConfirmedPurchases,
				isMinted,
				mintedAt: post.mintedAt,
				mintedIsMutable,
				areNftFieldsLocked,
				canUpdateOnChain,
				onchainSyncStatus: post.onchainSyncStatus,
				lastOnchainSyncAt: post.lastOnchainSyncAt,
			},
			requestId,
		}
	} catch (error) {
		console.error(`[edit-state][${requestId}] Error:`, error)
		setResponseStatus(event, 500)
		return { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, requestId }
	}
})
