/**
 * Direct utility functions for Explore REST API
 * These bypass createServerFn for REST API compatibility
 */

import { db } from '@/server/db'
import { posts, users, follows, collections, purchases, likes, comments, postAssets } from '@/server/db/schema'
import { eq, and, desc, sql, count, gte, notInArray, isNotNull, or, ilike, inArray } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { isModeratorOrAdmin } from '@/server/utils/auth-helpers'

// Types
export interface SuggestedCreator {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  followerCount: number
  isNew: boolean
}

export interface TrendingPost {
  id: string
  type: 'post' | 'collectible' | 'edition'
  caption: string | null
  mediaUrl: string
  coverUrl: string | null
  createdAt: string
  likeCount: number
  commentCount: number
  collectCount: number
  purchaseCount: number
  trendingScore: number
  collectibleAssetId?: string
  assetId?: string
  userNftMint?: string
  isHidden?: boolean
  masterMint?: string | null
  mintWindowStart?: string | null
  mintWindowEnd?: string | null
  assets?: Array<{
    id: string
    url: string
    mimeType: string
    fileSize: number | null
    sortOrder: number
  }>
  user: {
    id: string
    displayName: string | null
    slug: string
    avatarUrl: string | null
  }
}

export interface SearchResultUser {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
}

export interface SearchResultPost {
  id: string
  type: 'post' | 'collectible' | 'edition'
  caption: string | null
  mediaUrl: string
  coverUrl: string | null
  createdAt: string
  likeCount: number
  commentCount: number
  collectCount: number
  assets?: Array<{
    id: string
    url: string
    mimeType: string
    fileSize: number | null
    sortOrder: number
  }>
  user: {
    id: string
    displayName: string | null
    slug: string
    avatarUrl: string | null
  }
}

/**
 * Get suggested creators for the Explore page
 */
export async function getSuggestedCreatorsDirect(
  token?: string,
  limit: number = 8
): Promise<{ success: boolean; creators: SuggestedCreator[]; error?: string }> {
  try {
    // Get current user if authenticated
    let currentUserId: string | undefined
    if (token) {
      const auth = await authenticateWithToken(token)
      currentUserId = auth?.userId
    }

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

    // Query users with scoring
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
        desc(sql`
          (CASE WHEN COALESCE(${recentPostUsers.postCount}, 0) > 0 THEN 20 ELSE 0 END) +
          (LN(COALESCE(${followerCounts.count}, 0) + 1) * 0.5) +
          (CASE WHEN ${users.createdAt} > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END) +
          (RANDOM() * 5)
        `)
      )
      .limit(limit)

    return {
      success: true,
      creators: suggestedUsers.map(u => ({
        id: u.id,
        usernameSlug: u.usernameSlug,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        followerCount: Number(u.followerCount) || 0,
        isNew: u.createdAt > thirtyDaysAgo,
      })),
    }
  } catch (error) {
    console.error('Error in getSuggestedCreatorsDirect:', error)
    return {
      success: false,
      creators: [],
      error: error instanceof Error ? error.message : 'Failed to fetch suggested creators',
    }
  }
}

/**
 * Get trending posts for the Explore page
 */
export async function getTrendingPostsDirect(
  token?: string,
  offset: number = 0,
  limit: number = 20
): Promise<{
  success: boolean
  posts: TrendingPost[]
  hasMore: boolean
  nextOffset: number | null
  isFallback: boolean
  sectionTitle: string
  error?: string
}> {
  try {
    // Get current user if authenticated
    let currentUserId: string | undefined
    let canSeeHidden = false
    if (token) {
      const auth = await authenticateWithToken(token)
      currentUserId = auth?.userId
      if (currentUserId) {
        canSeeHidden = await isModeratorOrAdmin(currentUserId)
      }
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get engagement counts subqueries
    const likeCounts = db
      .select({
        postId: likes.postId,
        count: count().as('like_count'),
      })
      .from(likes)
      .groupBy(likes.postId)
      .as('like_counts')

    const commentCounts = db
      .select({
        postId: comments.postId,
        count: count().as('comment_count'),
      })
      .from(comments)
      .where(eq(comments.isDeleted, false))
      .groupBy(comments.postId)
      .as('comment_counts')

    const collectCounts = db
      .select({
        postId: collections.postId,
        count: count().as('collect_count'),
      })
      .from(collections)
      .where(eq(collections.status, 'confirmed'))
      .groupBy(collections.postId)
      .as('collect_counts')

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
          slug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
        likeCount: sql<number>`COALESCE(${likeCounts.count}, 0)`.as('like_count'),
        commentCount: sql<number>`COALESCE(${commentCounts.count}, 0)`.as('comment_count'),
        collectCount: sql<number>`COALESCE(${collectCounts.count}, 0)`.as('collect_count'),
        purchaseCount: sql<number>`COALESCE(${purchaseCounts.count}, 0)`.as('purchase_count'),
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

    if (trendingPosts.length < minTrendingCount && offset === 0) {
      // Fall back to recent posts
      isFallback = true
      const recentPosts = await db
        .select({
          post: posts,
          user: {
            id: users.id,
            displayName: users.displayName,
            slug: users.usernameSlug,
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

    // Get collectible asset IDs
    const collectiblePostIds = finalPosts
      .filter(p => p.post.type === 'collectible')
      .map(p => p.post.id)

    let collectibleAssetIds: Record<string, string> = {}
    if (collectiblePostIds.length > 0) {
      const assetIdResults = await db
        .select({
          postId: collections.postId,
          nftMint: collections.nftMint,
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
    if (currentUserId && editionPostIds.length > 0) {
      const userPurchases = await db
        .select({
          postId: purchases.postId,
          nftMint: purchases.nftMint,
        })
        .from(purchases)
        .where(
          and(
            inArray(purchases.postId, editionPostIds),
            eq(purchases.userId, currentUserId),
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

    // Batch fetch assets for multi-asset posts
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
        const assets = postAssetsMap[p.post.id]
        return {
          id: p.post.id,
          type: p.post.type as 'post' | 'collectible' | 'edition',
          caption: p.post.caption,
          mediaUrl: p.post.mediaUrl,
          coverUrl: p.post.coverUrl,
          createdAt: p.post.createdAt.toISOString(),
          masterMint: p.post.masterMint,
          mintWindowStart: p.post.mintWindowStart?.toISOString() ?? null,
          mintWindowEnd: p.post.mintWindowEnd?.toISOString() ?? null,
          user: p.user,
          likeCount: Number(p.likeCount) || 0,
          commentCount: Number(p.commentCount) || 0,
          collectCount: Number(p.collectCount) || 0,
          purchaseCount: Number(p.purchaseCount) || 0,
          trendingScore: Number(p.trendingScore) || 0,
          ...(p.post.type === 'collectible' && collectibleAssetIds[p.post.id]
            ? { collectibleAssetId: collectibleAssetIds[p.post.id] }
            : {}),
          ...(p.post.type === 'edition' && userNftMints[p.post.id]
            ? { userNftMint: userNftMints[p.post.id] }
            : {}),
          isHidden: p.post.isHidden ?? false,
          ...(assets && assets.length > 1 ? { assets } : {}),
        }
      }),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    }
  } catch (error) {
    console.error('Error in getTrendingPostsDirect:', error)
    return {
      success: false,
      posts: [],
      hasMore: false,
      nextOffset: null,
      isFallback: false,
      sectionTitle: 'Trending',
      error: error instanceof Error ? error.message : 'Failed to fetch trending posts',
    }
  }
}

/**
 * Search users and posts
 */
export async function searchDirect(
  query: string,
  type: 'all' | 'users' | 'posts' = 'all',
  token?: string,
  limit: number = 20
): Promise<{
  success: boolean
  users: SearchResultUser[]
  posts: SearchResultPost[]
  query: string
  error?: string
}> {
  try {
    // Get current user if authenticated
    let canSeeHidden = false
    if (token) {
      const auth = await authenticateWithToken(token)
      if (auth?.userId) {
        canSeeHidden = await isModeratorOrAdmin(auth.userId)
      }
    }

    const searchTerm = `%${query}%`

    let userResults: SearchResultUser[] = []
    let postResults: SearchResultPost[] = []

    // Search users
    if (type === 'all' || type === 'users') {
      const users_result = await db
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
          desc(sql`CASE WHEN LOWER(${users.usernameSlug}) = LOWER(${query}) THEN 1 ELSE 0 END`),
          desc(sql`CASE WHEN LOWER(${users.displayName}) = LOWER(${query}) THEN 1 ELSE 0 END`),
          users.usernameSlug
        )
        .limit(type === 'users' ? limit : Math.floor(limit / 2))

      userResults = users_result
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      // Get engagement counts subqueries
      const likeCounts = db
        .select({
          postId: likes.postId,
          count: count().as('like_count'),
        })
        .from(likes)
        .groupBy(likes.postId)
        .as('like_counts')

      const commentCounts = db
        .select({
          postId: comments.postId,
          count: count().as('comment_count'),
        })
        .from(comments)
        .where(eq(comments.isDeleted, false))
        .groupBy(comments.postId)
        .as('comment_counts')

      const collectCounts = db
        .select({
          postId: collections.postId,
          count: count().as('collect_count'),
        })
        .from(collections)
        .where(eq(collections.status, 'confirmed'))
        .groupBy(collections.postId)
        .as('collect_counts')

      const postConditions = [
        eq(posts.isDeleted, false),
        ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
        or(
          ilike(posts.caption, searchTerm),
          ilike(users.displayName, searchTerm),
          ilike(users.usernameSlug, searchTerm)
        ),
      ]

      const posts_result = await db
        .select({
          id: posts.id,
          caption: posts.caption,
          mediaUrl: posts.mediaUrl,
          coverUrl: posts.coverUrl,
          type: posts.type,
          createdAt: posts.createdAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            slug: users.usernameSlug,
            avatarUrl: users.avatarUrl,
          },
          likeCount: sql<number>`COALESCE(${likeCounts.count}, 0)`.as('like_count'),
          commentCount: sql<number>`COALESCE(${commentCounts.count}, 0)`.as('comment_count'),
          collectCount: sql<number>`COALESCE(${collectCounts.count}, 0)`.as('collect_count'),
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .leftJoin(likeCounts, eq(posts.id, likeCounts.postId))
        .leftJoin(commentCounts, eq(posts.id, commentCounts.postId))
        .leftJoin(collectCounts, eq(posts.id, collectCounts.postId))
        .where(and(...postConditions))
        .orderBy(desc(posts.createdAt))
        .limit(type === 'posts' ? limit : Math.floor(limit / 2))

      // Batch fetch assets for multi-asset posts
      let searchPostAssetsMap: Record<string, Array<{
        id: string
        url: string
        mimeType: string
        fileSize: number | null
        sortOrder: number
      }>> = {}

      if (posts_result.length > 0) {
        const postIds = posts_result.map(p => p.id)
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

      postResults = posts_result.map(p => {
        const assets = searchPostAssetsMap[p.id]
        return {
          id: p.id,
          type: p.type as 'post' | 'collectible' | 'edition',
          caption: p.caption,
          mediaUrl: p.mediaUrl,
          coverUrl: p.coverUrl,
          createdAt: p.createdAt.toISOString(),
          likeCount: Number(p.likeCount) || 0,
          commentCount: Number(p.commentCount) || 0,
          collectCount: Number(p.collectCount) || 0,
          user: p.user,
          ...(assets && assets.length > 1 ? { assets } : {}),
        }
      })
    }

    return {
      success: true,
      users: userResults,
      posts: postResults,
      query,
    }
  } catch (error) {
    console.error('Error in searchDirect:', error)
    return {
      success: false,
      users: [],
      posts: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}
