/**
 * Explore server functions
 * Handles suggested creators, trending posts, and search
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { posts, users, follows, collections, purchases, postAssets } from '@/server/db/schema'
import { eq, and, desc, sql, count, gte, notInArray, isNotNull, or, ilike, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { withOptionalAuth } from '@/server/auth'
import { excludeDevPostsForUser } from '@/server/utils/dev-posts'
import { getBlockedUserIdSet } from '@/server/utils/blocks'
import { getTrendingPostsData, getNewPostsData, getMintingNowPostsData } from '@/server/utils/explore-feeds'

const explorePostTypeSchema = z.enum(['post', 'collectible', 'edition'])

// Schema for suggested creators query
const suggestedCreatorsSchema = z.object({
  limit: z.number().int().min(1).max(20).default(8),
})

// Schema for featured creators (landing page, browse-by-creator grids)
const featuredCreatorsSchema = z.object({
  limit: z.number().int().min(1).max(24).default(2),
  offset: z.number().int().min(0).default(0),
})

// Schema for trending posts query
const trendingPostsSchema = z.object({
  offset: z.number().int().min(0).default(0), // Offset-based pagination for score ordering
  limit: z.number().int().min(1).max(50).default(20),
  type: explorePostTypeSchema.optional(),
  category: z.string().max(32).optional(), // Optional category filter (slug or name)
})

// Schema for cursor-paginated gallery feeds (New, Minting Now)
const cursorFeedSchema = z.object({
  cursor: z.string().datetime().nullish(), // ISO datetime cursor
  limit: z.number().int().min(1).max(50).default(20),
  type: explorePostTypeSchema.optional(),
  category: z.string().max(32).optional(), // Optional category filter (slug or name)
})

const mintingNowFeedSchema = cursorFeedSchema.extend({
  cursor: z.string().max(512).nullish(),
})

// Schema for search query
const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(['all', 'users', 'posts']).default('all'),
  limit: z.number().int().min(1).max(50).default(20),
})

/**
 * Get suggested creators for the Explore page
 * Scoring based on:
 * - Recency: creator has posted in last 30 days (boost)
 * - Follower count: light boost
 * - New creator boost: accounts < 30 days old
 * - Excludes creators the user already follows (when authenticated)
 */
export const getSuggestedCreators = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(suggestedCreatorsSchema, input)
    const { limit } = authResult.input
    const currentUserId = authResult.auth?.userId

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get list of users the current user follows (to exclude)
    let followedUserIds: string[] = []
    if (currentUserId) {
      const followedUsers = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId))
      followedUserIds = followedUsers.map(f => f.followingId)
    }

    // Build exclusion list (followed users + self + pairwise-blocked)
    const blocked = currentUserId ? await getBlockedUserIdSet(currentUserId) : new Set<string>()
    const excludeUserIds = currentUserId
      ? Array.from(new Set([...followedUserIds, currentUserId, ...blocked]))
      : []

    // Get follower counts per user (subquery)
    const followerCounts = db
      .select({
        userId: follows.followingId,
        count: count().as('follower_count'),
      })
      .from(follows)
      .groupBy(follows.followingId)
      .as('follower_counts')

    // Get users with recent posts (subquery for boost scoring)
    const recentPostUsers = db
      .select({
        userId: posts.userId,
        postCount: count().as('recent_post_count'),
      })
      .from(posts)
      .where(
        and(
          await excludeDevPostsForUser(currentUserId),
          gte(posts.createdAt, thirtyDaysAgo),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false)
        )
      )
      .groupBy(posts.userId)
      .as('recent_post_users')

    // Build where conditions
    const whereConditions = excludeUserIds.length > 0
      ? notInArray(users.id, excludeUserIds)
      : sql`true`

    // Query users with scoring - now using LEFT JOIN so we get users even without recent posts
    const suggestedUsers = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        followerCount: sql<number>`COALESCE(${followerCounts.count}, 0)`.as('follower_count'),
        recentPostCount: sql<number>`COALESCE(${recentPostUsers.postCount}, 0)`.as('recent_post_count'),
      })
      .from(users)
      .leftJoin(followerCounts, eq(users.id, followerCounts.userId))
      .leftJoin(recentPostUsers, eq(users.id, recentPostUsers.userId))
      .where(whereConditions)
      .orderBy(
        // Score: recent posts boost + log(followers + 1) * 0.5 + new creator boost + random
        // Simplified scoring to avoid complex SQL date comparisons
        desc(sql`
          (CASE WHEN COALESCE(${recentPostUsers.postCount}, 0) > 0 THEN 20 ELSE 0 END) +
          (LN(COALESCE(${followerCounts.count}, 0) + 1) * 0.5) +
          (CASE WHEN ${users.createdAt} > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END) +
          (RANDOM() * 5)
        `)
      )
      .limit(limit)

    console.log('[getSuggestedCreators] Found', suggestedUsers.length, 'creators', {
      currentUserId,
      excludeCount: excludeUserIds.length,
    })

    return {
      success: true,
      creators: suggestedUsers.map(u => ({
        id: u.id,
        usernameSlug: u.usernameSlug,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        followerCount: Number(u.followerCount) || 0,
        isNew: u.createdAt > thirtyDaysAgo, // Compare with JS Date
      })),
    }
  } catch (error) {
    console.error('Error in getSuggestedCreators:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch suggested creators.',
      creators: [],
    }
  }
})

/**
 * Get trending posts for the Explore page
 * Scoring: collects * 5 + comments * 2 + likes * 1
 * With time decay: score * (1 / (1 + days_old * 0.15))
 * Falls back to recent posts if < 6 trending
 */
export const getTrendingPosts = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(trendingPostsSchema, input)
    const { offset, limit, type, category } = authResult.input

    const result = await getTrendingPostsData(authResult.auth?.userId, offset, limit, type, category)

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('Error in getTrendingPosts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trending posts.',
      posts: [],
      hasMore: false,
      nextOffset: null,
      isFallback: false,
      sectionTitle: 'Trending',
    }
  }
})

/**
 * Get newest posts for gallery surfaces (Home "New" row, Explore "New" tab)
 * Recent posts unfiltered by engagement, always available
 */
export const getNewPosts = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(cursorFeedSchema, input)
    const { cursor, limit, type, category } = authResult.input

    const result = await getNewPostsData(authResult.auth?.userId, cursor ?? null, limit, type, category)

    return {
      success: true,
      sectionTitle: 'New',
      ...result,
    }
  } catch (error) {
    console.error('[getNewPosts] Failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch new posts.',
      posts: [],
      hasMore: false,
      nextCursor: null,
      sectionTitle: 'New',
    }
  }
})

/**
 * Get paid editions that are currently available to mint, including untimed
 * editions and editions with a live mint window.
 */
export const getMintingNowPosts = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(mintingNowFeedSchema, input)
    const { cursor, limit, type, category } = authResult.input

    const result = await getMintingNowPostsData(authResult.auth?.userId, cursor ?? null, limit, type, category)

    return {
      success: true,
      sectionTitle: 'Minting Now',
      ...result,
    }
  } catch (error) {
    console.error('[getMintingNowPosts] Failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch live mints.',
      posts: [],
      hasMore: false,
      nextCursor: null,
      sectionTitle: 'Minting Now',
    }
  }
})

/**
 * Get featured creators for the landing page
 * Returns creators with stats: post count, mint count, follower count
 */
export const getFeaturedCreators = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(featuredCreatorsSchema, input)
    const { limit, offset } = authResult.input
    const blocked = await getBlockedUserIdSet(authResult.auth?.userId)

    // Get follower counts per user (subquery)
    const followerCounts = db
      .select({
        userId: follows.followingId,
        count: count().as('follower_count'),
      })
      .from(follows)
      .groupBy(follows.followingId)
      .as('follower_counts')

    // Get post counts per user (non-deleted, non-hidden)
    const postCounts = db
      .select({
        userId: posts.userId,
        count: count().as('post_count'),
      })
      .from(posts)
      .where(
        and(
          await excludeDevPostsForUser(undefined),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false)
        )
      )
      .groupBy(posts.userId)
      .as('post_counts')

    // Get mint counts (collects + purchases) per creator
    const collectsByCreator = db
      .select({
        creatorId: posts.userId,
        count: count().as('collect_count'),
      })
      .from(collections)
      .innerJoin(posts, eq(collections.postId, posts.id))
      .where(eq(collections.status, 'confirmed'))
      .groupBy(posts.userId)
      .as('collects_by_creator')

    const purchasesByCreator = db
      .select({
        creatorId: posts.userId,
        count: count().as('purchase_count'),
      })
      .from(purchases)
      .innerJoin(posts, eq(purchases.postId, posts.id))
      .where(eq(purchases.status, 'confirmed'))
      .groupBy(posts.userId)
      .as('purchases_by_creator')

    // Query users with all stats - prioritize users with posts
    const featuredUsers = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        headerBgUrl: users.headerBgUrl,
        followerCount: sql<number>`COALESCE(${followerCounts.count}, 0)`.as('follower_count'),
        postCount: sql<number>`COALESCE(${postCounts.count}, 0)`.as('post_count'),
        mintCount: sql<number>`COALESCE(${collectsByCreator.count}, 0) + COALESCE(${purchasesByCreator.count}, 0)`.as('mint_count'),
      })
      .from(users)
      .leftJoin(followerCounts, eq(users.id, followerCounts.userId))
      .leftJoin(postCounts, eq(users.id, postCounts.userId))
      .leftJoin(collectsByCreator, eq(users.id, collectsByCreator.creatorId))
      .leftJoin(purchasesByCreator, eq(users.id, purchasesByCreator.creatorId))
      .where(
        and(
          sql`COALESCE(${postCounts.count}, 0) > 0`, // Only creators with posts
          blocked.size > 0 ? notInArray(users.id, Array.from(blocked)) : undefined
        )
      )
      .orderBy(
        // Score: posts + mints + followers
        desc(sql`
          COALESCE(${postCounts.count}, 0) * 2 +
          (COALESCE(${collectsByCreator.count}, 0) + COALESCE(${purchasesByCreator.count}, 0)) * 3 +
          COALESCE(${followerCounts.count}, 0)
        `),
        // Stable tiebreaker so offset pagination doesn't skip/duplicate on ties
        users.id
      )
      .limit(limit + 1) // one extra to detect a next page
      .offset(offset)

    const hasMore = featuredUsers.length > limit
    const pageUsers = hasMore ? featuredUsers.slice(0, limit) : featuredUsers

    return {
      success: true,
      creators: pageUsers.map(u => ({
        id: u.id,
        usernameSlug: u.usernameSlug,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        headerBgUrl: u.headerBgUrl,
        followerCount: Number(u.followerCount) || 0,
        postCount: Number(u.postCount) || 0,
        mintCount: Number(u.mintCount) || 0,
      })),
      nextOffset: hasMore ? offset + limit : null,
    }
  } catch (error) {
    console.error('Error in getFeaturedCreators:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch featured creators.',
      creators: [],
      nextOffset: null,
    }
  }
})

/**
 * Get a featured creator profile preview for the landing page
 * Returns one creator (with >= minPosts) plus their recent post thumbnails
 */
export const getLandingProfilePreview = createServerFn({
  method: 'GET',
}).handler(async () => {
  try {
    const minPosts = 3

    // Find top creator with enough posts
    const postCounts = db
      .select({
        userId: posts.userId,
        count: count().as('post_count'),
      })
      .from(posts)
      .where(
        and(
          await excludeDevPostsForUser(undefined),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false)
        )
      )
      .groupBy(posts.userId)
      .as('post_counts')

    const followerCounts = db
      .select({
        userId: follows.followingId,
        count: count().as('follower_count'),
      })
      .from(follows)
      .groupBy(follows.followingId)
      .as('follower_counts')

    const collectsByCreator = db
      .select({
        creatorId: posts.userId,
        count: count().as('collect_count'),
      })
      .from(collections)
      .innerJoin(posts, eq(collections.postId, posts.id))
      .where(eq(collections.status, 'confirmed'))
      .groupBy(posts.userId)
      .as('collects_by_creator')

    const topCreators = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        headerBgUrl: users.headerBgUrl,
        bio: users.bio,
        followerCount: sql<number>`COALESCE(${followerCounts.count}, 0)`.as('follower_count'),
        postCount: sql<number>`COALESCE(${postCounts.count}, 0)`.as('post_count'),
        mintCount: sql<number>`COALESCE(${collectsByCreator.count}, 0)`.as('mint_count'),
      })
      .from(users)
      .leftJoin(postCounts, eq(users.id, postCounts.userId))
      .leftJoin(followerCounts, eq(users.id, followerCounts.userId))
      .leftJoin(collectsByCreator, eq(users.id, collectsByCreator.creatorId))
      .where(
        and(
          sql`COALESCE(${postCounts.count}, 0) >= ${minPosts}`,
          isNotNull(users.avatarUrl),
        )
      )
      .orderBy(
        // Engagement quality: mints-per-post ratio + followers, not raw volume
        desc(sql`
          CASE WHEN COALESCE(${postCounts.count}, 0) > 0
            THEN COALESCE(${collectsByCreator.count}, 0)::float / COALESCE(${postCounts.count}, 0)
            ELSE 0
          END * 10 +
          COALESCE(${followerCounts.count}, 0) +
          COALESCE(${collectsByCreator.count}, 0)
        `)
      )
      .limit(5)

    if (topCreators.length === 0) {
      return { success: false, creator: null, posts: [] }
    }

    // Pick a random creator from the top pool
    const creator = topCreators[Math.floor(Math.random() * topCreators.length)]!

    // Get their 9 most recent posts (for a 3x3 grid)
    const recentPosts = await db
      .select({
        id: posts.id,
        mediaUrl: posts.mediaUrl,
        coverUrl: posts.coverUrl,
        caption: posts.caption,
      })
      .from(posts)
      .where(
        and(
          eq(posts.userId, creator.id),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
          isNotNull(posts.mediaUrl),
          await excludeDevPostsForUser(undefined)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(9)

    return {
      success: true,
      creator: {
        id: creator.id,
        usernameSlug: creator.usernameSlug,
        displayName: creator.displayName,
        avatarUrl: creator.avatarUrl,
        headerBgUrl: creator.headerBgUrl,
        bio: creator.bio,
        followerCount: Number(creator.followerCount) || 0,
        postCount: Number(creator.postCount) || 0,
        mintCount: Number(creator.mintCount) || 0,
      },
      posts: recentPosts.map(p => ({
        id: p.id,
        mediaUrl: p.mediaUrl!,
        coverUrl: p.coverUrl,
        caption: p.caption,
      })),
    }
  } catch (error) {
    console.error('Error in getLandingProfilePreview:', error)
    return { success: false, creator: null, posts: [] }
  }
})

/**
 * Search users and posts
 * Users: searches username_slug and display_name
 * Posts: searches caption and creator name
 */
export const search = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(searchSchema, input)
    const { query, type, limit } = authResult.input

    const searchTerm = `%${query}%`
    const blocked = await getBlockedUserIdSet(authResult.auth?.userId)

    let userResults: Array<{
      id: string
      usernameSlug: string
      displayName: string | null
      avatarUrl: string | null
    }> = []

    let postResults: Array<{
      id: string
      caption: string | null
      mediaUrl: string
      coverUrl: string | null
      type: 'post' | 'collectible' | 'edition'
      price: number | null
      currency: 'SOL' | 'USDC' | null
      maxSupply: number | null
      currentSupply: number
      mintWindowStart: Date | null
      mintWindowEnd: Date | null
      createdAt: Date
      user: {
        id: string
        displayName: string | null
        usernameSlug: string
        avatarUrl: string | null
      }
    }> = []

    // Search users
    if (type === 'all' || type === 'users') {
      userResults = await db
        .select({
          id: users.id,
          usernameSlug: users.usernameSlug,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          and(
            or(
              ilike(users.usernameSlug, searchTerm),
              ilike(users.displayName, searchTerm)
            ),
            ...(blocked.size > 0 ? [notInArray(users.id, Array.from(blocked))] : []),
          )
        )
        .orderBy(
          // Prioritize exact matches
          desc(sql`CASE WHEN LOWER(${users.usernameSlug}) = LOWER(${query}) THEN 1 ELSE 0 END`),
          desc(sql`CASE WHEN LOWER(${users.displayName}) = LOWER(${query}) THEN 1 ELSE 0 END`),
          users.usernameSlug
        )
        .limit(type === 'users' ? limit : Math.floor(limit / 2))
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postConditions = [
        await excludeDevPostsForUser(authResult.auth?.userId),
        eq(posts.isDeleted, false),
        eq(posts.isHidden, false),
        ...(blocked.size > 0 ? [notInArray(posts.userId, Array.from(blocked))] : []),
        or(
          ilike(posts.caption, searchTerm),
          ilike(users.displayName, searchTerm),
          ilike(users.usernameSlug, searchTerm)
        ),
      ]

      postResults = await db
        .select({
          id: posts.id,
          caption: posts.caption,
          mediaUrl: posts.mediaUrl,
          coverUrl: posts.coverUrl,
          type: posts.type,
          price: posts.price,
          currency: posts.currency,
          maxSupply: posts.maxSupply,
          currentSupply: posts.currentSupply,
          mintWindowStart: posts.mintWindowStart,
          mintWindowEnd: posts.mintWindowEnd,
          createdAt: posts.createdAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            usernameSlug: users.usernameSlug,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(and(...postConditions))
        .orderBy(desc(posts.createdAt))
        .limit(type === 'posts' ? limit : Math.floor(limit / 2))
    }

    // Batch fetch assets for multi-asset posts in search results
    let searchPostAssetsMap: Record<string, Array<{
      id: string
      url: string
      mimeType: string
      fileSize: number | null
      sortOrder: number
    }>> = {}

    if (postResults.length > 0) {
      const postIds = postResults.map(p => p.id)
      const assetResults = await db
        .select({
          id: postAssets.id,
          postId: postAssets.postId,
          storageKey: postAssets.storageKey,
          mimeType: postAssets.mimeType,
          fileSize: postAssets.fileSize,
          sortOrder: postAssets.sortOrder,
        })
        .from(postAssets)
        .where(
          and(
            inArray(postAssets.postId, postIds),
            eq(postAssets.role, 'media'),
            eq(postAssets.isPreviewable, true)
          )
        )
        .orderBy(postAssets.postId, postAssets.sortOrder)

      // Group by postId
      for (const asset of assetResults) {
        if (!searchPostAssetsMap[asset.postId]) {
          searchPostAssetsMap[asset.postId] = []
        }
        searchPostAssetsMap[asset.postId].push({
          id: asset.id,
          url: asset.storageKey,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          sortOrder: asset.sortOrder,
        })
      }
    }

    return {
      success: true,
      users: userResults,
      posts: postResults.map(p => {
        const assets = searchPostAssetsMap[p.id]
        return {
          ...p,
          // Only include assets array if there are multiple assets (for carousel)
          ...(assets && assets.length > 1 ? { assets } : {}),
        }
      }),
      query,
    }
  } catch (error) {
    console.error('Error in search:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed.',
      users: [],
      posts: [],
      query: '',
    }
  }
})
