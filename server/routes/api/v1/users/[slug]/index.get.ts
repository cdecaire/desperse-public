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
import { getDirectedBlockState } from '@/server/utils/blocks'

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

	// Directional block check:
	//  - If the target has blocked the viewer → 404 (privacy guarantee;
	//    blocked users can't probe blockers).
	//  - If the viewer has blocked the target → return the profile shell
	//    with `isBlocked: true` so the client can render an unblock UI.
	//    Strip bio / link / social fields and zero out counts so the
	//    blocked relationship doesn't leak engagement data.
	let isBlockedByViewer = false
	if (currentUserId && result.user.id !== currentUserId) {
		const { iBlocked, blockedMe } = await getDirectedBlockState(currentUserId)
		if (blockedMe.has(result.user.id)) {
			setResponseStatus(event, 404)
			return {
				success: false,
				error: { code: 'NOT_FOUND', message: 'User not found' },
				requestId,
			}
		}
		isBlockedByViewer = iBlocked.has(result.user.id)
	}

	return {
		success: true,
		data: {
			user: {
				id: result.user.id,
				slug: result.user.slug,
				displayName: result.user.displayName,
				bio: isBlockedByViewer ? null : result.user.bio,
				avatarUrl: result.user.avatarUrl,
				role: result.user.role,
				headerBgUrl: isBlockedByViewer ? null : result.user.headerBgUrl,
				link: isBlockedByViewer ? null : result.user.link,
				twitterUsername: isBlockedByViewer ? null : result.user.twitterUsername,
				instagramUsername: isBlockedByViewer ? null : result.user.instagramUsername,
				createdAt: result.user.createdAt,
			},
			stats: isBlockedByViewer
				? { posts: 0, collected: 0, forSale: 0 }
				: result.stats,
			followersCount: isBlockedByViewer ? 0 : result.followersCount,
			followingCount: isBlockedByViewer ? 0 : result.followingCount,
			collectorsCount: isBlockedByViewer ? 0 : result.collectorsCount,
			isFollowing: isBlockedByViewer ? false : result.isFollowing,
			isBlocked: isBlockedByViewer,
		},
		requestId,
	}
})
