/**
 * Explore feed queries (Trending / New / Minting Now) shared by the
 * createServerFn wrappers in src/server/functions/explore.ts.
 * DB logic lives here per the server-function boundary rules.
 */

import { db } from '@/server/db'
import { posts, users, collections, purchases, likes, comments, postAssets } from '@/server/db/schema'
import { eq, and, desc, sql, count, gt, lt, lte, gte, notInArray, isNotNull, isNull, or, inArray } from 'drizzle-orm'
import { excludeDevPostsForUser } from '@/server/utils/dev-posts'
import { getBlockedUserIdSet } from '@/server/utils/blocks'
import { PRESET_CATEGORIES, normalizeCategoryKey, categoryToSlug } from '@/constants/categories'

/**
 * Resolve a category slug (or name) to the canonical preset name stored in the
 * posts.categories text[] — same matching as getPostsByCategory.
 */
function resolveCategoryName(category: string): string {
  const normalizedKey = normalizeCategoryKey(category)
  const urlSlug = category.toLowerCase()
  return (
    PRESET_CATEGORIES.find(
      (cat) => normalizeCategoryKey(cat) === normalizedKey || categoryToSlug(cat) === urlSlug
    ) || category
  )
}

type ExploreUser = {
  id: string
  displayName: string | null
  usernameSlug: string
  avatarUrl: string | null
}

type ExploreFeedPostType = 'post' | 'collectible' | 'edition'

export type HydratablePostRow = {
  post: typeof posts.$inferSelect
  user: ExploreUser
  likeCount: number
  commentCount: number
  collectCount: number
  purchaseCount: number
  trendingScore: number
}

export type HydratedExplorePost = typeof posts.$inferSelect & {
  user: ExploreUser
  likeCount: number
  commentCount: number
  collectCount: number
  purchaseCount: number
  trendingScore: number
  collectibleAssetId?: string
  assetId?: string
  userNftMint?: string
  isHidden: boolean
  assets?: Array<{
    id: string
    url: string
    mimeType: string
    fileSize: number | null
    sortOrder: number
  }>
}

export type ExploreFeedPage = {
  posts: HydratedExplorePost[]
  hasMore: boolean
  nextOffset: number | null
}

export type ExploreCursorFeedPage = {
  posts: HydratedExplorePost[]
  hasMore: boolean
  /** Opaque cursor for the next page, null when exhausted */
  nextCursor: string | null
}

type MintingNowCursor = {
  purchases: number
  interactions: number
  createdAt: string
  id: string
}

export function encodeMintingNowCursor(cursor: MintingNowCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeMintingNowCursor(cursor: string): MintingNowCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<MintingNowCursor>
    if (
      !Number.isInteger(parsed.purchases) ||
      !Number.isInteger(parsed.interactions) ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== 'string' ||
      parsed.id.length === 0
    ) {
      return null
    }

    return parsed as MintingNowCursor
  } catch {
    return null
  }
}

/**
 * An edition belongs in Minting Now whenever it can be purchased right now:
 * it is paid, its optional mint window is open, and it still has supply.
 * Untimed editions have null window bounds and remain eligible.
 */
export function buildMintingNowAvailabilityCondition() {
  return and(
    eq(posts.type, 'edition'),
    isNotNull(posts.price),
    isNotNull(posts.currency),
    or(isNull(posts.mintWindowStart), lte(posts.mintWindowStart, sql`now()`)),
    or(isNull(posts.mintWindowEnd), gt(posts.mintWindowEnd, sql`now()`)),
    or(isNull(posts.maxSupply), lt(posts.currentSupply, posts.maxSupply))
  )
}

/** Engagement-count subqueries joined by every explore feed query */
function buildEngagementCountSubqueries() {
  const likeCounts = db
    .select({ postId: likes.postId, count: count().as('like_count') })
    .from(likes)
    .groupBy(likes.postId)
    .as('like_counts')

  const commentCounts = db
    .select({ postId: comments.postId, count: count().as('comment_count') })
    .from(comments)
    .where(eq(comments.isDeleted, false))
    .groupBy(comments.postId)
    .as('comment_counts')

  const collectCounts = db
    .select({ postId: collections.postId, count: count().as('collect_count') })
    .from(collections)
    .where(eq(collections.status, 'confirmed'))
    .groupBy(collections.postId)
    .as('collect_counts')

  const purchaseCounts = db
    .select({ postId: purchases.postId, count: count().as('purchase_count') })
    .from(purchases)
    .where(eq(purchases.status, 'confirmed'))
    .groupBy(purchases.postId)
    .as('purchase_counts')

  return { likeCounts, commentCounts, collectCounts, purchaseCounts }
}

/** Shared base conditions: dev/deleted/hidden filtering + blocked-author exclusion + optional type/category */
async function buildBaseConditions(
  authUserId: string | undefined,
  postType?: ExploreFeedPostType,
  category?: string
) {
  const blocked = await getBlockedUserIdSet(authUserId)
  const categoryName = category ? resolveCategoryName(category) : null
  return [
    await excludeDevPostsForUser(authUserId),
    eq(posts.isDeleted, false),
    eq(posts.isHidden, false),
    ...(postType ? [eq(posts.type, postType)] : []),
    ...(categoryName ? [sql`${posts.categories} @> ARRAY[${categoryName}]::text[]`] : []),
    ...(blocked.size > 0 ? [notInArray(posts.userId, Array.from(blocked))] : []),
  ]
}

/**
 * Batch-hydrate raw feed rows with asset IDs (protected downloads), first
 * collectible mints, the viewer's own edition mints, and multi-asset carousel
 * arrays. One implementation for Trending / New / Minting Now.
 */
export async function hydratePostsWithAssetData(
  finalPosts: HydratablePostRow[],
  authUserId: string | undefined
): Promise<HydratedExplorePost[]> {
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
  if (authUserId && editionPostIds.length > 0) {
    const userPurchases = await db
      .select({
        postId: purchases.postId,
        nftMint: purchases.nftMint,
      })
      .from(purchases)
      .where(
        and(
          inArray(purchases.postId, editionPostIds),
          eq(purchases.userId, authUserId),
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
  const postAssetsMap: Record<string, Array<{
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

  return finalPosts.map(p => {
    const isHidden = p.post.isHidden ?? false
    const assets = postAssetsMap[p.post.id]
    const purchaseCount = Number(p.purchaseCount) || 0
    return {
      ...p.post,
      user: p.user,
      // posts.currentSupply reserves capacity before fulfillment and can include
      // in-flight purchases. Gallery supply should match the detail page's
      // confirmed-mint count; availability checks still use the reservation value.
      currentSupply: p.post.type === 'edition' ? purchaseCount : p.post.currentSupply,
      likeCount: Number(p.likeCount) || 0,
      commentCount: Number(p.commentCount) || 0,
      collectCount: Number(p.collectCount) || 0,
      purchaseCount,
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
  })
}

/**
 * Trending posts: engagement-scored with time decay over the last 7 days,
 * falling back to recent posts when fewer than 6 qualify.
 */
export async function getTrendingPostsData(
  authUserId: string | undefined,
  offset: number,
  limit: number,
  postType?: ExploreFeedPostType,
  category?: string
): Promise<ExploreFeedPage & { isFallback: boolean; sectionTitle: string }> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { likeCounts, commentCounts, collectCounts, purchaseCounts } = buildEngagementCountSubqueries()
  const baseConditions = await buildBaseConditions(authUserId, postType, category)

  const rowSelection = {
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
  }

  const trendingPosts = await db
    .select({
      ...rowSelection,
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
    .where(and(...baseConditions, gte(posts.createdAt, sevenDaysAgo)))
    .orderBy(desc(sql`trending_score`))
    .offset(offset)
    .limit(limit + 1)

  // Check if we have enough trending posts (min 6); fall back to recent
  const minTrendingCount = 6
  let postsToReturn: HydratablePostRow[] = trendingPosts
  let isFallback = false

  if (trendingPosts.length < minTrendingCount) {
    isFallback = true
    postsToReturn = await db
      .select({
        ...rowSelection,
        trendingScore: sql<number>`0`.as('trending_score'),
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(likeCounts, eq(posts.id, likeCounts.postId))
      .leftJoin(commentCounts, eq(posts.id, commentCounts.postId))
      .leftJoin(collectCounts, eq(posts.id, collectCounts.postId))
      .leftJoin(purchaseCounts, eq(posts.id, purchaseCounts.postId))
      .where(and(...baseConditions))
      .orderBy(desc(posts.createdAt))
      .offset(offset)
      .limit(limit + 1)
  }

  const hasMore = postsToReturn.length > limit
  const finalPosts = hasMore ? postsToReturn.slice(0, limit) : postsToReturn
  const hydrated = await hydratePostsWithAssetData(finalPosts, authUserId)

  return {
    posts: hydrated,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    isFallback,
    sectionTitle: isFallback ? 'Recent' : 'Trending',
  }
}

/**
 * New posts: recent, unfiltered by engagement, always available.
 * Cursor-paginated on createdAt (ISO datetime, descending).
 */
export async function getNewPostsData(
  authUserId: string | undefined,
  cursor: string | null,
  limit: number,
  postType?: ExploreFeedPostType,
  category?: string
): Promise<ExploreCursorFeedPage> {
  const { likeCounts, commentCounts, collectCounts, purchaseCounts } = buildEngagementCountSubqueries()
  const baseConditions = await buildBaseConditions(authUserId, postType, category)

  const rows = await db
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
        ...baseConditions,
        ...(cursor ? [lt(posts.createdAt, new Date(cursor))] : [])
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const finalPosts = hasMore ? rows.slice(0, limit) : rows
  const hydrated = await hydratePostsWithAssetData(finalPosts, authUserId)
  const lastRow = finalPosts[finalPosts.length - 1]

  return {
    posts: hydrated,
    hasMore,
    nextCursor: hasMore && lastRow ? lastRow.post.createdAt.toISOString() : null,
  }
}

/**
 * Minting Now: paid editions that are currently available to purchase,
 * including both untimed editions and editions with a live mint window.
 * Editions with more confirmed purchases rank first, then editions with more
 * likes and comments. Creation time and post ID provide stable tie-breakers.
 */
export async function getMintingNowPostsData(
  authUserId: string | undefined,
  cursor: string | null,
  limit: number,
  postType?: ExploreFeedPostType,
  category?: string
): Promise<ExploreCursorFeedPage> {
  if (postType && postType !== 'edition') {
    return {
      posts: [],
      hasMore: false,
      nextCursor: null,
    }
  }

  const { likeCounts, commentCounts, collectCounts, purchaseCounts } = buildEngagementCountSubqueries()
  const baseConditions = await buildBaseConditions(authUserId, undefined, category)
  const purchaseRank = sql<number>`COALESCE(${purchaseCounts.count}, 0)`
  const interactionRank = sql<number>`COALESCE(${likeCounts.count}, 0) + COALESCE(${commentCounts.count}, 0)`
  const decodedCursor = cursor ? decodeMintingNowCursor(cursor) : null

  if (cursor && !decodedCursor) {
    throw new Error('Invalid Minting Now cursor.')
  }

  const cursorCondition = decodedCursor
    ? or(
        lt(purchaseRank, decodedCursor.purchases),
        and(
          eq(purchaseRank, decodedCursor.purchases),
          lt(interactionRank, decodedCursor.interactions)
        ),
        and(
          eq(purchaseRank, decodedCursor.purchases),
          eq(interactionRank, decodedCursor.interactions),
          lt(posts.createdAt, new Date(decodedCursor.createdAt))
        ),
        and(
          eq(purchaseRank, decodedCursor.purchases),
          eq(interactionRank, decodedCursor.interactions),
          eq(posts.createdAt, new Date(decodedCursor.createdAt)),
          lt(posts.id, decodedCursor.id)
        )
      )
    : undefined

  const rows = await db
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
      purchaseCount: purchaseRank.as('purchase_count'),
      trendingScore: sql<number>`0`.as('trending_score'),
      interactionCount: interactionRank.as('interaction_count'),
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(likeCounts, eq(posts.id, likeCounts.postId))
    .leftJoin(commentCounts, eq(posts.id, commentCounts.postId))
    .leftJoin(collectCounts, eq(posts.id, collectCounts.postId))
    .leftJoin(purchaseCounts, eq(posts.id, purchaseCounts.postId))
    .where(
      and(
        ...baseConditions,
        buildMintingNowAvailabilityCondition(),
        cursorCondition
      )
    )
    .orderBy(
      desc(purchaseRank),
      desc(interactionRank),
      desc(posts.createdAt),
      desc(posts.id)
    )
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const finalPosts = hasMore ? rows.slice(0, limit) : rows
  const hydrated = await hydratePostsWithAssetData(finalPosts, authUserId)
  const lastRow = finalPosts[finalPosts.length - 1]

  return {
    posts: hydrated,
    hasMore,
    nextCursor: hasMore && lastRow
      ? encodeMintingNowCursor({
          purchases: Number(lastRow.purchaseCount),
          interactions: Number(lastRow.interactionCount),
          createdAt: lastRow.post.createdAt.toISOString(),
          id: lastRow.post.id,
        })
      : null,
  }
}
