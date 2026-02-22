/**
 * Comments server functions
 * Handles comment creation, deletion, and retrieval
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { comments, posts, users, collections, notifications } from '@/server/db/schema'
import { eq, desc, count, and, lt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { processMentions, deleteMentions } from '@/server/utils/mentions'
import { sendPushNotification, getActorDisplayName } from '@/server/utils/pushDispatch'

// Character limit for comments
const MAX_COMMENT_LENGTH = 280

// Schema for creating a comment (no userId - derived from auth)
const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(MAX_COMMENT_LENGTH),
})

// Schema for deleting a comment (no userId - derived from auth)
const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

/**
 * Create a comment on a post
 */
export const createComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(createCommentSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[createComment] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { postId, content } = data
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

    // Create comment using verified userId
    const [newComment] = await db
      .insert(comments)
      .values({
        userId,
        postId,
        content: content.trim(),
      })
      .returning()

    // Fetch comment with user data for response
    const [commentWithUser] = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        postId: comments.postId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        user: {
          id: users.id,
          usernameSlug: users.usernameSlug,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, newComment.id))
      .limit(1)

    // Create notification for post owner (if not commenting on own post)
    // Wrapped in try-catch: notification is non-critical, shouldn't fail the comment
    if (post.userId !== userId) {
      try {
        await db.insert(notifications).values({
          userId: post.userId,
          actorId: userId,
          type: 'comment',
          referenceType: 'post',
          referenceId: postId,
        })
      } catch (notifError) {
        console.warn('[createComment] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
      }

      // Dispatch push notification (awaited for serverless compatibility)
      try {
        const actorName = await getActorDisplayName(userId)
        await sendPushNotification(post.userId, {
          type: 'comment',
          title: `${actorName} commented on your post`,
          body: '',
          deepLink: `https://desperse.com/p/${postId}`,
        })
      } catch (pushErr) {
        console.warn('[createComment] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
      }
    }

    // Process @mentions in the comment (non-critical)
    try {
      await processMentions(content, userId, 'comment', newComment.id, false)
    } catch (mentionError) {
      console.warn('[createComment] Failed to process mentions:', mentionError instanceof Error ? mentionError.message : 'Unknown error')
    }

    return {
      success: true,
      comment: commentWithUser,
    }
  } catch (error) {
    console.error('Error in createComment:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Invalid input.',
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment.',
    }
  }
})

/**
 * Delete a comment (only by the comment owner)
 */
export const deleteComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(deleteCommentSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[deleteComment] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { commentId } = data
    const userId = auth.userId

    // Check if comment exists and belongs to user
    const [comment] = await db
      .select({ id: comments.id, userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1)

    if (!comment) {
      return {
        success: false,
        error: 'Comment not found.',
      }
    }

    if (comment.userId !== userId) {
      return {
        success: false,
        error: 'You can only delete your own comments.',
      }
    }

    // Delete mentions associated with this comment
    await deleteMentions('comment', commentId)

    // Delete comment
    await db
      .delete(comments)
      .where(eq(comments.id, commentId))

    return {
      success: true,
      message: 'Comment deleted successfully.',
    }
  } catch (error) {
    console.error('Error in deleteComment:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment.',
    }
  }
})

/**
 * Get all comments for a post (flat list, ordered by created_at)
 */
export const getPostComments = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { postId, cursor: _cursor, limit = 50 } = z.object({
      postId: z.string().uuid(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().max(100).optional(),
    }).parse(rawData)

    // Get comments with user data
    let query = db
      .select({
        id: comments.id,
        userId: comments.userId,
        postId: comments.postId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        user: {
          id: users.id,
          usernameSlug: users.usernameSlug,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(limit)

    // TODO: Add cursor pagination if needed in future
    // For now, we'll just return the most recent comments

    const postComments = await query

    return {
      success: true,
      comments: postComments,
    }
  } catch (error) {
    console.error('Error in getPostComments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post comments.',
    }
  }
})

/**
 * Get comment count for a post (for feed display)
 */
export const getCommentCount = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const parseResult = z.object({
      postId: z.string().uuid(),
    }).safeParse(rawData)

    // If validation fails, return 0 count (invalid postId means no comments)
    if (!parseResult.success) {
      return {
        success: true,
        count: 0,
      }
    }

    const { postId } = parseResult.data

    // Count comments for this post
    const result = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.postId, postId))

    return {
      success: true,
      count: result[0]?.count || 0,
    }
  } catch (error) {
    console.error('Error in getCommentCount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get comment count.',
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
  const remainingSupply = isEdition && post.maxSupply
    ? Math.max(0, post.maxSupply - (post.currentSupply || 0))
    : null

  return {
    id: post.id,
    type: post.type,
    mediaUrl: post.mediaUrl,
    coverUrl: post.coverUrl,
    caption: post.caption,
    price: post.price,
    currency: post.currency,
    maxSupply: post.maxSupply,
    currentSupply: post.currentSupply,
    collectCount: undefined, // Will be set separately
    createdAt: post.createdAt,
    user,
    isCollected: flags?.isCollected ?? false,
    isEdition: flags?.isEdition ?? isEdition,
    remainingSupply,
  }
}

/**
 * Get all posts a user has commented on (for Activity modal)
 * Returns full post data with user information, ordered by when the comment was created (newest first)
 */
export const getUserComments = createServerFn({
  method: 'GET',
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

    // Build conditions for commented posts
    const conditions = [
      eq(comments.userId, userId),
    ]

    // Cursor pagination: filter by commentedAt (when the comment was created)
    if (cursor) {
      conditions.push(lt(comments.createdAt, new Date(cursor)))
    }

    // Get commented posts with full post and user data
    // Order by when the comment was created (newest comments first)
    const rows = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
        commentedAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          ...conditions,
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
        )
      )
      .orderBy(desc(comments.createdAt))
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
    const nextCursor = hasMore && last ? last.commentedAt.toISOString() : null

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
    console.error('Error in getUserComments:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to get user comments.',
    }
  }
})

