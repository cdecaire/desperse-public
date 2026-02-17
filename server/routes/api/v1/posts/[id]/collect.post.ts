/**
 * Collect Post Endpoint
 * POST /api/v1/posts/:id/collect
 *
 * Collect a free collectible post (cNFT).
 * Server signs and broadcasts the transaction.
 *
 * Authentication: Required
 *
 * Rate Limits:
 * - Daily per user: 10 collects
 * - Daily per IP: 30 collects
 * - Per minute burst: 2 collects
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { prepareCollectDirect } from '@/server/utils/collect'

/**
 * Extract client IP address from request headers
 * Checks multiple headers in order of preference (handles proxies like Vercel, Cloudflare)
 */
function getClientIp(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never): string | null {
	// Order of preference for IP headers
	const ipHeaders = [
		'x-vercel-forwarded-for', // Vercel
		'x-real-ip',              // Nginx
		'x-forwarded-for',        // Standard proxy header (may contain multiple IPs)
		'cf-connecting-ip',       // Cloudflare
	]

	for (const header of ipHeaders) {
		const value = getHeader(event, header)
		if (value) {
			// x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
			// Take the first (leftmost) which is the original client
			const firstIp = value.split(',')[0].trim()
			if (firstIp) return firstIp
		}
	}

	return null
}

export default defineEventHandler(async (event) => {
	const requestId = `req_${randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token from header
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	// Get post ID from route params
	const postId = getRouterParam(event, 'id')

	if (!postId) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Post ID is required',
			},
			requestId,
		}
	}

	// Validate UUID format
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	if (!uuidRegex.test(postId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid post ID format',
			},
			requestId,
		}
	}

	// Get client IP for rate limiting
	const clientIp = getClientIp(event)

	// Read optional wallet address from body
	let walletAddress: string | undefined
	try {
		const body = (await readBody(event)) || {}
		if (body.walletAddress && typeof body.walletAddress === 'string') {
			walletAddress = body.walletAddress
		}
	} catch {
		// Body is optional for collect — ignore parse errors
	}

	// Call direct collect function (bypasses createServerFn)
	try {
		const result = await prepareCollectDirect(postId, token, clientIp, walletAddress)

		if (!result.success) {
			const errorLower = (result.error || '').toLowerCase()
			const isAuthError = errorLower.includes('auth')
			const isRateLimited = errorLower.includes('rate')

			setResponseStatus(event, isAuthError ? 401 : isRateLimited ? 429 : 400)
			return {
				success: false,
				error: {
					code: isAuthError
						? 'AUTH_REQUIRED'
						: isRateLimited
							? 'RATE_LIMITED'
							: 'VALIDATION_ERROR',
					message: result.message || result.error || 'Failed to collect post',
				},
				requestId,
			}
		}

		// Handle "already collected" case
		if (result.status === 'already_collected') {
			return {
				success: true,
				data: {
					status: 'already_collected',
					collectionId: result.collectionId,
					message: result.message || 'You have already collected this post',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				collectionId: result.collectionId,
				status: result.status || 'pending',
				txSignature: result.txSignature || null,
				assetId: result.assetId || null,
			},
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		console.error(`[collect][${requestId}] Error:`, error)

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
