/**
 * Likes server functions
 * Handles like/unlike actions and like counts
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { likes, posts, users, collections, notifications } from '@/server/db/schema'
import { eq, and, count, desc, lt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { sendPushNotification, getActorDisplayName } from '@/server/utils/pushDispatch'

// Schema for like/unlike (no userId - derived from auth)
const likeSchema = z.object({
  postId: z.string().uuid(),
})

/**
 * Like a post
 */
export const likePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(likeSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[likePost] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { postId } = data
    const userId = auth.userId

    // Check if post exists and get owner
    const [post] = await db
      .select({ id: posts.id, userId: posts.userId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        )
      )
      .limit(1)

    if (existingLike) {
      return {
        success: true,
        message: 'Already liked this post.',
        isLiked: true,
      }
    }

    // Create like using verified userId
    // Wrapped in try-catch to handle race conditions (double-tap, network retry)
    try {
      await db.insert(likes).values({
        userId,
        postId,
      })
    } catch (insertError) {
      // If duplicate key error, the like already exists - return success
      const errorMsg = insertError instanceof Error ? insertError.message : ''
      if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
        return {
          success: true,
          message: 'Already liked this post.',
          isLiked: true,
        }
      }
      // Re-throw other errors
      throw insertError
    }

    // Create notification for post owner (if not liking own post)
    // Wrapped in try-catch: notification is non-critical, shouldn't fail the like
    if (post.userId !== userId) {
      try {
        await db.insert(notifications).values({
          userId: post.userId,
          actorId: userId,
          type: 'like',
          referenceType: 'post',
          referenceId: postId,
        })
      } catch (notifError) {
        // Log but don't fail the like operation
        console.warn('[likePost] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
      }

      // Dispatch push notification (awaited for serverless compatibility)
      try {
        const actorName = await getActorDisplayName(userId)
        await sendPushNotification(post.userId, {
          type: 'like',
          title: `${actorName} liked your post`,
          body: '',
          deepLink: `https://desperse.com/p/${postId}`,
        })
      } catch (pushErr) {
        console.warn('[likePost] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
      }
    }

    return {
      success: true,
      message: 'Successfully liked post.',
      isLiked: true,
    }
  } catch (error) {
    console.error('Error in likePost:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like post.',
    }
  }
})

/**
 * Unlike a post
 */
export const unlikePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(likeSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[unlikePost] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { postId } = data
    const userId = auth.userId

    // Delete like (if exists) using verified userId
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        )
      )

    return {
      success: true,
      message: 'Successfully unliked post.',
      isLiked: false,
    }
  } catch (error) {
    console.error('Error in unlikePost:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike post.',
    }
  }
})

/**
 * Get like count and current user's like status for a post
 * Returns count visible to everyone, and isLiked only if userId is provided
 */
export const getPostLikes = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const parseResult = z.object({
      postId: z.string().uuid(),
      userId: z.string().uuid().optional(),
    }).safeParse(rawData)

    // If validation fails, return 0 count and false isLiked (invalid postId means no likes)
    if (!parseResult.success) {
      return {
        success: true,
        likeCount: 0,
        isLiked: false,
      }
    }

    const { postId, userId } = parseResult.data

    // Get like count
    const likeCountResult = await db
      .select({ count: count() })
      .from(likes)
      .where(eq(likes.postId, postId))

    const likeCount = likeCountResult[0]?.count || 0

    // Check if current user has liked (if userId provided)
    let isLiked = false
    if (userId) {
      const [existingLike] = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.postId, postId)
          )
        )
        .limit(1)
      isLiked = !!existingLike
    }

    return {
      success: true,
      likeCount,
      isLiked,
    }
  } catch (error) {
    console.error('Error in getPostLikes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post likes.',
    }
  }
})

/**
 * Helper function to map post data to PostCard format
 */
function mapPostToCard(post: typeof posts.$inferSelect, user: {
  id: string
  displayName: string | null
  usernameSlug: string
  avatarUrl: string | null
}, flags?: Partial<{ isCollected: boolean; isEdition: boolean; remainingSupply: number | null }>) {
  const isEdition = post.type === 'edition'
  const remainingSupply =
    isEdition && post.maxSupply != null
      ? Math.max(0, post.maxSupply - (post.currentSupply ?? 0))
      : null

  return {
    ...post,
    user,
    isCollected: flags?.isCollected ?? false,
    isEdition: flags?.isEdition ?? isEdition,
    remainingSupply,
  }
}

/**
 * Get all posts a user has liked (for "Liked" tab on profile)
 * Returns full post data with user information, ordered by when the post was liked (newest first)
 */
export const getUserLikes = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId, cursor, limit = 50 } = z.object({
      userId: z.string().uuid(),
      cursor: z.string().datetime().optional(),
      limit: z.number().int().min(1).max(50).default(50),
    }).parse(rawData)

    // Build conditions for liked posts
    const conditions = [
      eq(likes.userId, userId),
    ]

    // Cursor pagination: filter by likedAt (when the like was created)
    if (cursor) {
      conditions.push(lt(likes.createdAt, new Date(cursor)))
    }

    // Get liked posts with full post and user data
    // Order by when the like was created (newest likes first)
    const rows = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
        likedAt: likes.createdAt,
      })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          ...conditions,
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
        )
      )
      .orderBy(desc(likes.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const toReturn = hasMore ? rows.slice(0, limit) : rows

    // Get collect counts for collectibles
    const collectibleIds = toReturn
      .filter((r) => r.post.type === 'collectible')
      .map((r) => r.post.id)

    let collectCounts: Record<string, number> = {}
    if (collectibleIds.length > 0) {
      const countResults = await db
        .select({
          postId: collections.postId,
          count: count(),
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectibleIds),
            eq(collections.status, 'confirmed'),
          ),
        )
        .groupBy(collections.postId)

      collectCounts = Object.fromEntries(countResults.map((r) => [r.postId, r.count]))
    }

    const last = toReturn[toReturn.length - 1]
    const nextCursor = hasMore && last ? last.likedAt.toISOString() : null

    return {
      success: true,
      posts: toReturn.map((row) => ({
        ...mapPostToCard(row.post, row.user, {
          isEdition: row.post.type === 'edition',
        }),
        collectCount: row.post.type === 'collectible' ? (collectCounts[row.post.id] || 0) : undefined,
      })),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getUserLikes:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to get user likes.',
    }
  }
})

