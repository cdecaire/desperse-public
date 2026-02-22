/**
 * Explore server functions
 * Handles suggested creators, trending posts, and search
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { posts, users, follows, collections, purchases, likes, comments, postAssets } from '@/server/db/schema'
import { eq, and, desc, sql, count, gte, notInArray, isNotNull, or, ilike, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { isModeratorOrAdmin } from '@/server/utils/auth-helpers'
import { withOptionalAuth } from '@/server/auth'

// Schema for suggested creators query
const suggestedCreatorsSchema = z.object({
  currentUserId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(20).default(8),
})

// Schema for featured creators (landing page)
const featuredCreatorsSchema = z.object({
  limit: z.number().int().min(1).max(10).default(2),
})

// Schema for trending posts query
const trendingPostsSchema = z.object({
  offset: z.number().int().min(0).default(0), // Offset-based pagination for score ordering
  limit: z.number().int().min(1).max(50).default(20),
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
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { currentUserId, limit } = suggestedCreatorsSchema.parse(rawData)

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

    // Build exclusion list (followed users + self)
    const excludeUserIds = currentUserId
      ? [...followedUserIds, currentUserId]
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
    const { offset, limit } = authResult.input

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get engagement counts for posts in the last 7 days
    // Likes count
    const likeCounts = db
      .select({
        postId: likes.postId,
        count: count().as('like_count'),
      })
      .from(likes)
      .groupBy(likes.postId)
      .as('like_counts')

    // Comments count
    const commentCounts = db
      .select({
        postId: comments.postId,
        count: count().as('comment_count'),
      })
      .from(comments)
      .where(eq(comments.isDeleted, false))
      .groupBy(comments.postId)
      .as('comment_counts')

    // Collects count (confirmed only)
    const collectCounts = db
      .select({
        postId: collections.postId,
        count: count().as('collect_count'),
      })
      .from(collections)
      .where(eq(collections.status, 'confirmed'))
      .groupBy(collections.postId)
      .as('collect_counts')

    // Purchase count (confirmed only)
    const purchaseCounts = db
      .select({
        postId: purchases.postId,
        count: count().as('purchase_count'),
      })
      .from(purchases)
      .where(eq(purchases.status, 'confirmed'))
      .groupBy(purchases.postId)
      .as('purchase_counts')

    // Build base conditions
    const baseConditions = [
      eq(posts.isDeleted, false),
      ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
      gte(posts.createdAt, sevenDaysAgo),
    ]

    // Query trending posts with scoring
    const trendingPosts = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
        likeCount: sql<number>`COALESCE(${likeCounts.count}, 0)`.as('like_count'),
        commentCount: sql<number>`COALESCE(${commentCounts.count}, 0)`.as('comment_count'),
        collectCount: sql<number>`COALESCE(${collectCounts.count}, 0)`.as('collect_count'),
        purchaseCount: sql<number>`COALESCE(${purchaseCounts.count}, 0)`.as('purchase_count'),
        // Calculate trending score with time decay
        trendingScore: sql<number>`
          (
            COALESCE(${collectCounts.count}, 0) * 5 +
            COALESCE(${purchaseCounts.count}, 0) * 5 +
            COALESCE(${commentCounts.count}, 0) * 2 +
            COALESCE(${likeCounts.count}, 0) * 1
          ) * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 86400.0 * 0.15))
        `.as('trending_score'),
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(likeCounts, eq(posts.id, likeCounts.postId))
      .leftJoin(commentCounts, eq(posts.id, commentCounts.postId))
      .leftJoin(collectCounts, eq(posts.id, collectCounts.postId))
      .leftJoin(purchaseCounts, eq(posts.id, purchaseCounts.postId))
      .where(and(...baseConditions))
      .orderBy(desc(sql`trending_score`))
      .offset(offset)
      .limit(limit + 1)

    // Check if we have enough trending posts (min 6)
    const minTrendingCount = 6
    let postsToReturn = trendingPosts
    let isFallback = false

    if (trendingPosts.length < minTrendingCount) {
      // Fall back to recent posts
      isFallback = true
      const recentPosts = await db
        .select({
          post: posts,
          user: {
            id: users.id,
            displayName: users.displayName,
            usernameSlug: users.usernameSlug,
            avatarUrl: users.avatarUrl,
          },
          likeCount: sql<number>`COALESCE(${likeCounts.count}, 0)`.as('like_count'),
          commentCount: sql<number>`COALESCE(${commentCounts.count}, 0)`.as('comment_count'),
          collectCount: sql<number>`COALESCE(${collectCounts.count}, 0)`.as('collect_count'),
          purchaseCount: sql<number>`COALESCE(${purchaseCounts.count}, 0)`.as('purchase_count'),
          trendingScore: sql<number>`0`.as('trending_score'),
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .leftJoin(likeCounts, eq(posts.id, likeCounts.postId))
        .leftJoin(commentCounts, eq(posts.id, commentCounts.postId))
        .leftJoin(collectCounts, eq(posts.id, collectCounts.postId))
        .leftJoin(purchaseCounts, eq(posts.id, purchaseCounts.postId))
        .where(
          and(
            eq(posts.isDeleted, false),
            ...(canSeeHidden ? [] : [eq(posts.isHidden, false)])
          )
        )
        .orderBy(desc(posts.createdAt))
        .offset(offset)
        .limit(limit + 1)

      postsToReturn = recentPosts
    }

    // Check if there are more posts
    const hasMore = postsToReturn.length > limit
    const finalPosts = hasMore ? postsToReturn.slice(0, limit) : postsToReturn

    // Get post asset IDs for protected downloads
    const nftPostIds = finalPosts
      .filter(p => p.post.type === 'edition' || p.post.type === 'collectible')
      .map(p => p.post.id)

    let postAssetIds: Record<string, string> = {}
    if (nftPostIds.length > 0) {
      const assetResults = await db
        .select({
          postId: postAssets.postId,
          id: postAssets.id,
        })
        .from(postAssets)
        .where(inArray(postAssets.postId, nftPostIds))

      postAssetIds = Object.fromEntries(
        assetResults.map(r => [r.postId, r.id])
      )
    }

    // Get collectible asset IDs (first confirmed collection NFT mint)
    const collectiblePostIds = finalPosts
      .filter(p => p.post.type === 'collectible')
      .map(p => p.post.id)

    let collectibleAssetIds: Record<string, string> = {}
    if (collectiblePostIds.length > 0) {
      const assetIdResults = await db
        .select({
          postId: collections.postId,
          nftMint: collections.nftMint,
          createdAt: collections.createdAt,
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectiblePostIds),
            eq(collections.status, 'confirmed'),
            isNotNull(collections.nftMint)
          )
        )
        .orderBy(collections.createdAt)

      const assetIdMap = new Map<string, string>()
      for (const result of assetIdResults) {
        if (result.nftMint && !assetIdMap.has(result.postId)) {
          assetIdMap.set(result.postId, result.nftMint)
        }
      }
      collectibleAssetIds = Object.fromEntries(assetIdMap)
    }

    // Get user's nftMint for editions they own
    const editionPostIds = finalPosts
      .filter(p => p.post.type === 'edition')
      .map(p => p.post.id)

    let userNftMints: Record<string, string> = {}
    if (authResult.auth?.userId && editionPostIds.length > 0) {
      const userPurchases = await db
        .select({
          postId: purchases.postId,
          nftMint: purchases.nftMint,
        })
        .from(purchases)
        .where(
          and(
            inArray(purchases.postId, editionPostIds),
            eq(purchases.userId, authResult.auth.userId),
            eq(purchases.status, 'confirmed'),
            isNotNull(purchases.nftMint)
          )
        )

      userNftMints = Object.fromEntries(
        userPurchases
          .filter(p => p.nftMint)
          .map(p => [p.postId, p.nftMint!])
      )
    }

    // Determine next offset
    const nextOffset = hasMore ? offset + limit : null

    // Batch fetch assets for multi-asset posts (Phase 1)
    const allPostIds = finalPosts.map(p => p.post.id)
    let postAssetsMap: Record<string, Array<{
      id: string
      url: string
      mimeType: string
      fileSize: number | null
      sortOrder: number
    }>> = {}

    if (allPostIds.length > 0) {
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
            inArray(postAssets.postId, allPostIds),
            eq(postAssets.role, 'media'),
            eq(postAssets.isPreviewable, true)
          )
        )
        .orderBy(postAssets.postId, postAssets.sortOrder)

      // Group by postId
      for (const asset of assetResults) {
        if (!postAssetsMap[asset.postId]) {
          postAssetsMap[asset.postId] = []
        }
        postAssetsMap[asset.postId].push({
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
      isFallback,
      sectionTitle: isFallback ? 'Recent' : 'Trending',
      posts: finalPosts.map(p => {
        const isHidden = p.post.isHidden ?? false
        const assets = postAssetsMap[p.post.id]
        return {
          ...p.post,
          user: p.user,
          likeCount: Number(p.likeCount) || 0,
          commentCount: Number(p.commentCount) || 0,
          collectCount: Number(p.collectCount) || 0,
          purchaseCount: Number(p.purchaseCount) || 0,
          trendingScore: Number(p.trendingScore) || 0,
          ...(p.post.type === 'collectible' && collectibleAssetIds[p.post.id]
            ? { collectibleAssetId: collectibleAssetIds[p.post.id] }
            : {}),
          ...(postAssetIds[p.post.id] ? { assetId: postAssetIds[p.post.id] } : {}),
          ...(p.post.type === 'edition' && userNftMints[p.post.id]
            ? { userNftMint: userNftMints[p.post.id] }
            : {}),
          isHidden,
          // Only include assets array if there are multiple assets (for carousel)
          ...(assets && assets.length > 1 ? { assets } : {}),
        }
      }),
      hasMore,
      nextOffset,
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
 * Get featured creators for the landing page
 * Returns creators with stats: post count, mint count, follower count
 */
export const getFeaturedCreators = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { limit } = featuredCreatorsSchema.parse(rawData)

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
      .where(sql`COALESCE(${postCounts.count}, 0) > 0`) // Only creators with posts
      .orderBy(
        // Score: posts + mints + followers
        desc(sql`
          COALESCE(${postCounts.count}, 0) * 2 +
          (COALESCE(${collectsByCreator.count}, 0) + COALESCE(${purchasesByCreator.count}, 0)) * 3 +
          COALESCE(${followerCounts.count}, 0)
        `)
      )
      .limit(limit)

    return {
      success: true,
      creators: featuredUsers.map(u => ({
        id: u.id,
        usernameSlug: u.usernameSlug,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        headerBgUrl: u.headerBgUrl,
        followerCount: Number(u.followerCount) || 0,
        postCount: Number(u.postCount) || 0,
        mintCount: Number(u.mintCount) || 0,
      })),
    }
  } catch (error) {
    console.error('Error in getFeaturedCreators:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch featured creators.',
      creators: [],
    }
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

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    const searchTerm = `%${query}%`

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
          or(
            ilike(users.usernameSlug, searchTerm),
            ilike(users.displayName, searchTerm)
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
        eq(posts.isDeleted, false),
        ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
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
