/**
 * GET /api/v1/feed/latest
 * Public JSON feed of recent posts — no auth required
 * Designed for automation tools, scrapers, and social bots
 *
 * Query params:
 *   limit  — number of posts (1–15, default 15)
 *
 * Returns a flat, clean structure with only public-facing fields.
 */

import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getTrendingPostsDirect } from '@/server/utils/explore'

export default defineEventHandler(async (event) => {
	setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
	setResponseHeader(event, 'Content-Type', 'application/json')

	try {
		const query = getQuery(event)
		const limit = query.limit
			? Math.min(Math.max(parseInt(query.limit as string, 10), 1), 15)
			: 15

		const result = await getTrendingPostsDirect(undefined, 0, limit)

		if (!result.success) {
			return {
				ok: false,
				error: 'Failed to fetch posts',
			}
		}

		const baseUrl = 'https://desperse.app'

		const posts = result.posts.map((p: any) => ({
			id: p.id,
			url: `${baseUrl}/post/${p.id}`,
			type: p.type ?? 'post',
			caption: p.caption ?? null,
			mediaUrl: p.mediaUrl ?? null,
			coverUrl: p.coverUrl ?? null,
			createdAt: p.createdAt,
			creator: p.user
				? {
						name: p.user.displayName ?? p.user.usernameSlug,
						username: p.user.usernameSlug,
						profileUrl: `${baseUrl}/profile/${p.user.usernameSlug}`,
						avatarUrl: p.user.avatarUrl ?? null,
					}
				: null,
			stats: {
				likes: Number(p.likeCount) || 0,
				collects: Number(p.collectCount) || 0,
				editions: Number(p.purchaseCount) || 0,
				comments: Number(p.commentCount) || 0,
			},
		}))

		return {
			ok: true,
			generated: new Date().toISOString(),
			count: posts.length,
			browseUrl: `${baseUrl}/explore`,
			posts,
		}
	} catch (error) {
		console.error('[feed/latest] Error:', error)
		return {
			ok: false,
			error: 'Internal error',
		}
	}
})
