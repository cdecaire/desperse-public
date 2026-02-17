/**
 * Category server-side utilities
 * Handles category-based post queries
 *
 * NOTE: Categories are stored as text arrays on posts, not in a separate table.
 * They are structured metadata selected by creators, distinct from hashtags.
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { posts, users } from '@/server/db/schema'
import { eq, and, sql, lt, desc } from 'drizzle-orm'
import { z } from 'zod'
import { withOptionalAuth } from '@/server/auth'
import { PRESET_CATEGORIES, normalizeCategoryKey, categoryToSlug } from '@/constants/categories'

// =============================================================================
// CATEGORY FEED (for /category/:categorySlug page)
// =============================================================================

const getPostsByCategorySchema = z.object({
  categorySlug: z.string().min(1).max(32),
  cursor: z.string().optional(), // ISO datetime string for pagination
  limit: z.number().int().min(1).max(50).optional().default(20),
})

/**
 * Get posts by category slug for the category feed page
 * Uses cursor-based pagination (by post createdAt)
 * Only returns non-deleted, non-hidden posts
 */
export const getPostsByCategory = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const result = await withOptionalAuth(getPostsByCategorySchema, input)
    if (!result) {
      return { success: false, error: 'Invalid input' }
    }

    const { input: data } = result
    const { categorySlug, cursor, limit } = data

    // Find the canonical category name from presets
    // Match by both normalized key ("3d / cg") and URL slug ("3d-cg")
    const normalizedKey = normalizeCategoryKey(categorySlug)
    const urlSlug = categorySlug.toLowerCase()
    const matchingCategory = PRESET_CATEGORIES.find(
      (cat) => normalizeCategoryKey(cat) === normalizedKey || categoryToSlug(cat) === urlSlug
    )

    // Use the canonical name if found, otherwise use the slug as-is
    const categoryToMatch = matchingCategory || categorySlug

    // Query posts that have this category in their categories array
    // PostgreSQL array contains check
    const postsResult = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        type: posts.type,
        mediaUrl: posts.mediaUrl,
        coverUrl: posts.coverUrl,
        caption: posts.caption,
        categories: posts.categories,
        price: posts.price,
        currency: posts.currency,
        maxSupply: posts.maxSupply,
        currentSupply: posts.currentSupply,
        nftName: posts.nftName,
        createdAt: posts.createdAt,
        user: {
          id: users.id,
          usernameSlug: users.usernameSlug,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          // Check if category is in the array (case-insensitive)
          sql`${posts.categories} @> ARRAY[${categoryToMatch}]::text[]`,
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
          cursor ? lt(posts.createdAt, new Date(cursor)) : undefined
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Check if there are more posts
    const hasMore = postsResult.length > limit
    const postsToReturn = hasMore ? postsResult.slice(0, limit) : postsResult
    const nextCursor = hasMore
      ? postsToReturn[postsToReturn.length - 1]?.createdAt?.toISOString()
      : null

    return {
      success: true,
      posts: postsToReturn,
      nextCursor,
      categoryName: matchingCategory || categorySlug,
    }
  } catch (error) {
    console.error('Error in getPostsByCategory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get posts.',
    }
  }
})
