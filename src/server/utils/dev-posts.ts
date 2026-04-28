/**
 * Dev posts helper
 *
 * When DEV_POSTS=true (set in .env.local), new posts are tagged isDev=true.
 * In production (DEV_POSTS is not set), feed queries exclude isDev posts.
 */

import { eq } from 'drizzle-orm'
import { posts } from '@/server/db/schema'
import { env } from '@/config/env'
import { isAdmin } from '@/server/utils/auth-helpers'

/**
 * Returns a Drizzle condition that excludes dev posts.
 * - In production: returns `eq(posts.isDev, false)` to filter them out.
 * - In dev (DEV_POSTS=true): returns `undefined` so all posts are visible.
 *
 * Usage: spread into condition arrays — `and()` ignores undefined.
 */
export function excludeDevPosts() {
	if (env.DEV_POSTS) return undefined
	return eq(posts.isDev, false)
}

/**
 * Like excludeDevPosts(), but admins (role='admin') see dev posts.
 * Pass null/undefined userId for unauthenticated requests — same
 * behavior as excludeDevPosts().
 */
export async function excludeDevPostsForUser(userId: string | null | undefined) {
	if (env.DEV_POSTS) return undefined
	if (userId && (await isAdmin(userId))) return undefined
	return eq(posts.isDev, false)
}
