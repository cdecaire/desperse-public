/**
 * Mention search utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { users, follows } from '@/server/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

export interface MentionUser {
	id: string
	usernameSlug: string
	displayName: string | null
	avatarUrl: string | null
}

export interface MentionSearchResult {
	success: boolean
	users?: MentionUser[]
	error?: string
}

/**
 * Search users for mention autocomplete (core logic)
 * - Empty query returns suggested users (followed users first)
 * - With query, searches usernameSlug and displayName
 */
export async function searchMentionUsersDirect(
	token: string,
	query?: string,
	limit: number = 8
): Promise<MentionSearchResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message = authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[searchMentionUsersDirect] Auth error:', message)
		return { success: false, error: message }
	}

	// Clamp limit
	const safeLimit = Math.min(Math.max(1, limit), 20)

	try {
		// If no query, return suggested users (followed users first)
		if (!query || query.trim() === '') {
			// Get followed users first
			const followedUsers = await db
				.select({
					id: users.id,
					usernameSlug: users.usernameSlug,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
				})
				.from(follows)
				.innerJoin(users, eq(follows.followingId, users.id))
				.where(eq(follows.followerId, userId))
				.orderBy(desc(follows.createdAt))
				.limit(safeLimit)

			// If we have enough followed users, return them
			if (followedUsers.length >= safeLimit) {
				return {
					success: true,
					users: followedUsers,
				}
			}

			// Fill remaining slots with recently active users
			const followedIds = followedUsers.map((u) => u.id)
			const remainingLimit = safeLimit - followedUsers.length

			const recentUsers = await db
				.select({
					id: users.id,
					usernameSlug: users.usernameSlug,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
				})
				.from(users)
				.where(
					sql`${users.id} != ${userId}${
						followedIds.length > 0
							? sql` AND ${users.id} NOT IN (${sql.join(
									followedIds.map((id) => sql`${id}`),
									sql`, `
								)})`
							: sql``
					}`
				)
				.orderBy(desc(users.createdAt))
				.limit(remainingLimit)

			return {
				success: true,
				users: [...followedUsers, ...recentUsers],
			}
		}

		// Search with query - case-insensitive search on usernameSlug and displayName
		const searchQuery = query.trim().toLowerCase()

		const searchResults = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
			})
			.from(users)
			.where(
				sql`${users.id} != ${userId} AND (
          ${users.usernameSlug} ILIKE ${'%' + searchQuery + '%'} OR
          ${users.displayName} ILIKE ${'%' + searchQuery + '%'}
        )`
			)
			.orderBy(
				// Prioritize exact matches, then prefix matches
				sql`CASE
          WHEN LOWER(${users.usernameSlug}) = ${searchQuery} THEN 0
          WHEN LOWER(${users.usernameSlug}) LIKE ${searchQuery + '%'} THEN 1
          WHEN LOWER(${users.displayName}) = ${searchQuery} THEN 2
          WHEN LOWER(${users.displayName}) LIKE ${searchQuery + '%'} THEN 3
          ELSE 4
        END`,
				users.usernameSlug
			)
			.limit(safeLimit)

		return {
			success: true,
			users: searchResults,
		}
	} catch (error) {
		console.error('[searchMentionUsersDirect] Error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to search users',
		}
	}
}
