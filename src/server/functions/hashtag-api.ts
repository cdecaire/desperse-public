/**
 * Hashtag API - Client-callable server functions
 * Handles hashtag search and tag feed queries
 *
 * NOTE: This file is safe to import from client code.
 * Internal processing functions are in hashtags.ts
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { tags, postTags, posts, users } from '@/server/db/schema'
import { eq, and, desc, sql, lt } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth, withOptionalAuth } from '@/server/auth'

// =============================================================================
// SEARCH (for autocomplete)
// =============================================================================

const searchTagsSchema = z.object({
  query: z.string().max(32).optional(),
  limit: z.number().int().min(1).max(20).optional().default(8),
})

/**
 * Search tags for hashtag autocomplete
 * - Requires auth (rate limiting protection)
 * - Empty query returns top tags by usageCount
 * - With query, returns prefix matches first, then contains
 */
export const searchTags = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    // Require authentication for tag search
    const result = await withAuth(searchTagsSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { input: data } = result
    const { query, limit } = data

    // If no query, return top tags by usage count
    if (!query || query.trim() === '') {
      const topTags = await db
        .select({
          id: tags.id,
          slug: tags.slug,
          display: tags.display,
          usageCount: tags.usageCount,
        })
        .from(tags)
        .where(sql`${tags.usageCount} > 0`)
        .orderBy(desc(tags.usageCount))
        .limit(limit)

      return {
        success: true,
        tags: topTags,
      }
    }

    // Search with query - prefix match first, then contains
    const searchQuery = query.trim().toLowerCase()

    const searchResults = await db
      .select({
        id: tags.id,
        slug: tags.slug,
        display: tags.display,
        usageCount: tags.usageCount,
      })
      .from(tags)
      .where(sql`${tags.slug} LIKE ${'%' + searchQuery + '%'}`)
      .orderBy(
        // Prioritize prefix matches, then by usage count
        sql`CASE
          WHEN ${tags.slug} = ${searchQuery} THEN 0
          WHEN ${tags.slug} LIKE ${searchQuery + '%'} THEN 1
          ELSE 2
        END`,
        desc(tags.usageCount)
      )
      .limit(limit)

    return {
      success: true,
      tags: searchResults,
    }
  } catch (error) {
    console.error('Error in searchTags:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Invalid input.',
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search tags.',
    }
  }
})

// =============================================================================
// TAG FEED (for /tag/:tagSlug page)
// =============================================================================

const getTagSchema = z.object({
  slug: z.string().min(1).max(32),
})

/**
 * Get tag info by slug
 * Returns tag details or null if not found
 */
export const getTag = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const result = await withOptionalAuth(getTagSchema, input)
    if (!result) {
      return { success: false, error: 'Invalid input' }
    }

    const { input: data } = result
    const { slug } = data

    const [tag] = await db
      .select({
        id: tags.id,
        slug: tags.slug,
        display: tags.display,
        usageCount: tags.usageCount,
      })
      .from(tags)
      .where(eq(tags.slug, slug.toLowerCase()))
      .limit(1)

    return {
      success: true,
      tag: tag || null,
    }
  } catch (error) {
    console.error('Error in getTag:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tag.',
    }
  }
})

const getPostsByTagSchema = z.object({
  tagSlug: z.string().min(1).max(32),
  cursor: z.string().optional(), // ISO datetime string for pagination
  limit: z.number().int().min(1).max(50).optional().default(20),
})

/**
 * Get posts by tag slug for the tag feed page
 * Uses cursor-based pagination (by post createdAt)
 * Only returns non-deleted, non-hidden posts
 */
export const getPostsByTag = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const result = await withOptionalAuth(getPostsByTagSchema, input)
    if (!result) {
      return { success: false, error: 'Invalid input' }
    }

    const { input: data } = result
    const { tagSlug, cursor, limit } = data

    // First, find the tag
    const [tag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, tagSlug.toLowerCase()))
      .limit(1)

    if (!tag) {
      // Tag doesn't exist - return empty feed (not an error)
      return {
        success: true,
        posts: [],
        nextCursor: null,
      }
    }

    // Build the query for posts with this tag
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
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(postTags.tagId, tag.id),
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
    }
  } catch (error) {
    console.error('Error in getPostsByTag:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get posts.',
    }
  }
})
