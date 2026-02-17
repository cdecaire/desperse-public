/**
 * User Profile Endpoint
 * GET /api/v1/users/:slug
 *
 * Get user profile by slug with stats and follow info.
 *
 * Authentication: Optional (affects isFollowing)
 */

import {
	defineEventHandler,
	getRouterParam,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getUserBySlugDirect } from '@/server/utils/profile'
import { authenticateWithToken } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Get slug from route params
	const slug = getRouterParam(event, 'slug')

	if (!slug) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'User slug is required',
			},
			requestId,
		}
	}

	// Validate slug format (lowercase, alphanumeric, underscore, period, hyphen)
	const slugRegex = /^[a-z0-9_.-]{1,32}$/
	if (!slugRegex.test(slug)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid user slug format',
			},
			requestId,
		}
	}

	// Try to extract current user from auth token (optional - supports both Privy and SIWS tokens)
	let currentUserId: string | null = null
	const authHeader = getHeader(event, 'authorization')
	if (authHeader) {
		try {
			const auth = await authenticateWithToken(authHeader)
			if (auth?.userId) {
				currentUserId = auth.userId
			}
		} catch {
			// Token invalid or expired - continue without auth
		}
	}

	// Call the direct utility function
	const result = await getUserBySlugDirect(slug, currentUserId || undefined)

	if (!result.success || !result.user) {
		setResponseStatus(event, 404)
		return {
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: result.error || 'User not found',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			user: {
				id: result.user.id,
				slug: result.user.slug,
				displayName: result.user.displayName,
				bio: result.user.bio,
				avatarUrl: result.user.avatarUrl,
				headerBgUrl: result.user.headerBgUrl,
				link: result.user.link,
				createdAt: result.user.createdAt,
			},
			stats: result.stats,
			followersCount: result.followersCount,
			followingCount: result.followingCount,
			collectorsCount: result.collectorsCount,
			isFollowing: result.isFollowing,
		},
		requestId,
	}
})
