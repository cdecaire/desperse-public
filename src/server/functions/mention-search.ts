/**
 * Mention search server function
 * Separated from mentions.ts to avoid bundling db dependencies in client
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { users, follows } from '@/server/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'

// Schema for mention search
const searchMentionUsersSchema = z.object({
  query: z.string().max(32).optional(),
  limit: z.number().int().min(1).max(20).optional().default(8),
})

/**
 * Search users for mention autocomplete
 * - Requires auth (rate limiting protection)
 * - Empty query returns suggested users (followed users first)
 * - With query, searches usernameSlug and displayName
 */
export const searchMentionUsers = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    // Require authentication for mention search
    const result = await withAuth(searchMentionUsersSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { query, limit } = data
    const userId = auth.userId

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
        .limit(limit)

      // If we have enough followed users, return them
      if (followedUsers.length >= limit) {
        return {
          success: true,
          users: followedUsers,
        }
      }

      // Fill remaining slots with recently active users
      const followedIds = followedUsers.map(u => u.id)
      const remainingLimit = limit - followedUsers.length

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
              ? sql` AND ${users.id} NOT IN (${sql.join(followedIds.map(id => sql`${id}`), sql`, `)})`
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
      .limit(limit)

    return {
      success: true,
      users: searchResults,
    }
  } catch (error) {
    console.error('Error in searchMentionUsers:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Invalid input.',
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search users.',
    }
  }
})
