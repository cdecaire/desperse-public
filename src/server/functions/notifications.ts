/**
 * Notifications server functions
 * Unified endpoint for notification counters (new posts, reports, etc.)
 * Polling-based, low-cost notifications system
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { posts, users, follows, contentReports, comments, notifications, betaFeedback, dmThreads } from '@/server/db/schema'
import { eq, and, gt, lt, desc, sql, count, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { isModeratorOrAdmin } from './auth-helpers'

const getNotificationCountersSchema = z.object({
  lastSeenForYouAt: z.string().datetime().optional().nullable(),
  lastSeenFollowingAt: z.string().datetime().optional().nullable(),
  /** IDs of users the current user follows, for prioritizing avatars */
  followingUserIds: z.array(z.string()).optional().nullable(),
})

/** Creator info for new posts toast */
export interface NewPostCreator {
  id: string
  displayName: string | null
  usernameSlug: string
  avatarUrl: string | null
  isFollowed: boolean
}

/**
 * Get unified notification counters
 * Returns counts for:
 * - New posts in For You feed
 * - New posts from followed users
 * - Unreviewed reports (admin/mod only)
 * 
 * Also returns creator info for new posts (up to 3, prioritizing followed users)
 * All counts are capped at 100 server-side
 */
export const getNotificationCounters = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  forYouNewPostsCount: number
  followingNewPostsCount: number
  unreviewedReportsCount: number
  newFeedbackCount: number
  unreadNotificationsCount: number
  forYouNewPostCreators: NewPostCreator[]
  followingNewPostCreators: NewPostCreator[]
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    // Parse input (auth is optional for For You count, but required for Following and Reports)
    const parsed = getNotificationCountersSchema.parse(rawData)
    const { lastSeenForYouAt, lastSeenFollowingAt, followingUserIds } = parsed

    // Try to authenticate (optional for For You, required for Following/Reports)
    const authResult = await withAuth(z.object({}), input, { optional: true })
    const currentUserId = authResult?.auth.userId

    // Initialize counts and creators
    let forYouNewPostsCount = 0
    let followingNewPostsCount = 0
    let unreviewedReportsCount = 0
    let newFeedbackCount = 0
    let unreadNotificationsCount = 0
    let forYouNewPostCreators: NewPostCreator[] = []
    let followingNewPostCreators: NewPostCreator[] = []
    
    // Set of followed user IDs for prioritization
    const followedSet = new Set(followingUserIds || [])

    // 1. For You feed count (works without auth, but respects visibility rules)
    if (lastSeenForYouAt) {
      const lastSeenDate = new Date(lastSeenForYouAt)
      
      // Validate the date is valid
      if (isNaN(lastSeenDate.getTime())) {
        console.warn('Invalid lastSeenForYouAt timestamp:', lastSeenForYouAt)
        forYouNewPostsCount = 0
      } else {
        // Add 100ms buffer to account for timestamp precision differences and ensure
        // we don't count the post that was used to set lastSeen (which might have
        // slight timestamp differences due to serialization/deserialization)
        const lastSeenDateWithBuffer = new Date(lastSeenDate.getTime() + 100)
        
        // Check if user can see hidden posts
        const canSeeHidden = currentUserId ? await isModeratorOrAdmin(currentUserId) : false

        const forYouConditions = [
          eq(posts.isDeleted, false),
          gt(posts.createdAt, lastSeenDateWithBuffer),
          ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
        ]

        const forYouResult = await db
          .select({ count: count() })
          .from(posts)
          .where(and(...forYouConditions))

        forYouNewPostsCount = Math.min(Number(forYouResult[0]?.count || 0), 100)
        
        // Fetch creators for new posts (up to 6, then dedupe and prioritize)
        if (forYouNewPostsCount > 0) {
          const newPostsWithCreators = await db
            .select({
              userId: posts.userId,
              user: {
                id: users.id,
                displayName: users.displayName,
                usernameSlug: users.usernameSlug,
                avatarUrl: users.avatarUrl,
              }
            })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .where(and(...forYouConditions))
            .orderBy(desc(posts.createdAt))
            .limit(10) // Fetch more to allow for deduplication
          
          // Dedupe by user ID and prioritize followed users
          const seenUserIds = new Set<string>()
          const uniqueCreators: NewPostCreator[] = []
          
          for (const post of newPostsWithCreators) {
            if (!seenUserIds.has(post.userId)) {
              seenUserIds.add(post.userId)
              uniqueCreators.push({
                id: post.user.id,
                displayName: post.user.displayName,
                usernameSlug: post.user.usernameSlug,
                avatarUrl: post.user.avatarUrl,
                isFollowed: followedSet.has(post.userId),
              })
            }
          }
          
          // Sort: followed users first, then by original order
          uniqueCreators.sort((a, b) => {
            if (a.isFollowed && !b.isFollowed) return -1
            if (!a.isFollowed && b.isFollowed) return 1
            return 0
          })
          
          forYouNewPostCreators = uniqueCreators.slice(0, 3)
        }
      }
    }

    // 2. Following feed count (requires auth and follows)
    if (currentUserId && lastSeenFollowingAt) {
      // Get list of users that the current user follows
      const followingList = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId))

      const followingIds = followingList.map(f => f.followingId)

      // Only count if user has follows
      if (followingIds.length > 0) {
        const lastSeenDate = new Date(lastSeenFollowingAt)
        
        // Validate the date is valid
        if (isNaN(lastSeenDate.getTime())) {
          console.warn('Invalid lastSeenFollowingAt timestamp:', lastSeenFollowingAt)
          followingNewPostsCount = 0
        } else {
          // Add 100ms buffer to account for timestamp precision differences and ensure
          // we don't count the post that was used to set lastSeen (which might have
          // slight timestamp differences due to serialization/deserialization)
          const lastSeenDateWithBuffer = new Date(lastSeenDate.getTime() + 100)
          
          // Check if user can see hidden posts
          const canSeeHidden = await isModeratorOrAdmin(currentUserId)

          const followingConditions = [
            eq(posts.isDeleted, false),
            gt(posts.createdAt, lastSeenDateWithBuffer),
            inArray(posts.userId, followingIds),
            ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
          ]

          const followingResult = await db
            .select({ count: count() })
            .from(posts)
            .where(and(...followingConditions))

          followingNewPostsCount = Math.min(Number(followingResult[0]?.count || 0), 100)
          
          // Fetch creators for new posts (up to 3, all are followed by definition)
          if (followingNewPostsCount > 0) {
            const newPostsWithCreators = await db
              .select({
                userId: posts.userId,
                user: {
                  id: users.id,
                  displayName: users.displayName,
                  usernameSlug: users.usernameSlug,
                  avatarUrl: users.avatarUrl,
                }
              })
              .from(posts)
              .innerJoin(users, eq(posts.userId, users.id))
              .where(and(...followingConditions))
              .orderBy(desc(posts.createdAt))
              .limit(10) // Fetch more to allow for deduplication
            
            // Dedupe by user ID
            const seenUserIds = new Set<string>()
            const uniqueCreators: NewPostCreator[] = []
            
            for (const post of newPostsWithCreators) {
              if (!seenUserIds.has(post.userId)) {
                seenUserIds.add(post.userId)
                uniqueCreators.push({
                  id: post.user.id,
                  displayName: post.user.displayName,
                  usernameSlug: post.user.usernameSlug,
                  avatarUrl: post.user.avatarUrl,
                  isFollowed: true, // All are followed by definition
                })
              }
            }
            
            followingNewPostCreators = uniqueCreators.slice(0, 3)
          }
        }
      }
    }

    // 3. Unreviewed reports count (admin/mod only)
    if (currentUserId) {
      const isMod = await isModeratorOrAdmin(currentUserId)
      
      if (isMod) {
        // Count distinct posts with open reports that aren't hidden/deleted
        const postsCountResult = await db
          .select({ count: sql<number>`count(distinct ${contentReports.contentId})` })
          .from(contentReports)
          .innerJoin(posts, eq(contentReports.contentId, posts.id))
          .where(
            and(
              eq(contentReports.contentType, 'post'),
              eq(contentReports.status, 'open'),
              eq(posts.isDeleted, false),
              eq(posts.isHidden, false)
            )
          )

        // Count distinct comments with open reports that aren't hidden/deleted
        const commentsCountResult = await db
          .select({ count: sql<number>`count(distinct ${contentReports.contentId})` })
          .from(contentReports)
          .innerJoin(comments, eq(contentReports.contentId, comments.id))
          .where(
            and(
              eq(contentReports.contentType, 'comment'),
              eq(contentReports.status, 'open'),
              eq(comments.isDeleted, false),
              eq(comments.isHidden, false)
            )
          )

        // Count distinct DM threads with open reports
        const dmThreadsCountResult = await db
          .select({ count: sql<number>`count(distinct ${contentReports.contentId})` })
          .from(contentReports)
          .innerJoin(dmThreads, eq(contentReports.contentId, dmThreads.id))
          .where(
            and(
              eq(contentReports.contentType, 'dm_thread'),
              eq(contentReports.status, 'open')
            )
          )

        const postsCount = Number(postsCountResult[0]?.count || 0)
        const commentsCount = Number(commentsCountResult[0]?.count || 0)
        const dmThreadsCount = Number(dmThreadsCountResult[0]?.count || 0)
        unreviewedReportsCount = Math.min(postsCount + commentsCount + dmThreadsCount, 100)

        // 3b. New feedback count (admin/mod only)
        const feedbackCountResult = await db
          .select({ count: count() })
          .from(betaFeedback)
          .where(eq(betaFeedback.status, 'new'))

        newFeedbackCount = Math.min(Number(feedbackCountResult[0]?.count || 0), 100)
      }
    }

    // 4. Unread user notifications count (requires auth)
    if (currentUserId) {
      const unreadResult = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, currentUserId),
          eq(notifications.isRead, false)
        ))

      unreadNotificationsCount = Math.min(Number(unreadResult[0]?.count || 0), 100)
    }

    return {
      success: true,
      forYouNewPostsCount,
      followingNewPostsCount,
      unreviewedReportsCount,
      newFeedbackCount,
      unreadNotificationsCount,
      forYouNewPostCreators,
      followingNewPostCreators,
    }
  } catch (error) {
    console.error('Error in getNotificationCounters:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification counters.',
      forYouNewPostsCount: 0,
      followingNewPostsCount: 0,
      unreviewedReportsCount: 0,
      newFeedbackCount: 0,
      unreadNotificationsCount: 0,
      forYouNewPostCreators: [],
      followingNewPostCreators: [],
    }
  }
})

// Types for user notifications
export type NotificationType = 'follow' | 'like' | 'comment' | 'collect' | 'purchase'
export type NotificationReferenceType = 'post' | 'comment'

export interface NotificationWithActor {
  id: string
  type: NotificationType
  referenceType: NotificationReferenceType | null
  referenceId: string | null
  isRead: boolean
  createdAt: Date
  actor: {
    id: string
    displayName: string | null
    usernameSlug: string
    avatarUrl: string | null
  }
  reference?: {
    mediaUrl?: string
    coverUrl?: string | null
    caption?: string | null
    content?: string
    postId?: string
  }
}

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { count: 0 }
    }
    const { auth } = result
    const [countResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, auth.userId),
        eq(notifications.isRead, false)
      ))
    return { count: countResult?.count ?? 0 }
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error)
    return { count: 0 }
  }
})

/**
 * Mark specific notifications as read
 */
export const markNotificationsAsRead = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({
      notificationIds: z.array(z.string().uuid()),
    }), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    const { auth, input: data } = result
    if (data.notificationIds.length === 0) {
      return { success: true }
    }
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, auth.userId),
        inArray(notifications.id, data.notificationIds)
      ))
    return { success: true }
  } catch (error) {
    console.error('Error in markNotificationsAsRead:', error)
    return { success: false, error: 'Failed to mark notifications as read' }
  }
})

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, result.auth.userId))
    return { success: true }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error)
    return { success: false, error: 'Failed to mark all notifications as read' }
  }
})

/**
 * Clear all notifications for the current user
 * Permanently deletes all notifications from the database
 */
export const clearAllNotifications = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    await db
      .delete(notifications)
      .where(eq(notifications.userId, result.auth.userId))
    return { success: true }
  } catch (error) {
    console.error('Error in clearAllNotifications:', error)
    return { success: false, error: 'Failed to clear notifications' }
  }
})

// Notification retention period (30 days)
const NOTIFICATION_RETENTION_DAYS = 30

/**
 * Get paginated user notifications
 * Only returns notifications from the last 30 days
 * Also opportunistically cleans up old notifications
 */
export const getUserNotifications = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(z.object({
      cursor: z.string().datetime().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }), input)

    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { cursor, limit } = data
    const userId = auth.userId

    // Calculate cutoff date for retention
    const retentionCutoff = new Date()
    retentionCutoff.setDate(retentionCutoff.getDate() - NOTIFICATION_RETENTION_DAYS)

    // Opportunistically clean up old notifications for this user
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.userId, userId),
        lt(notifications.createdAt, retentionCutoff)
      ))

    const conditions = [
      eq(notifications.userId, userId),
      gt(notifications.createdAt, retentionCutoff),
    ]
    if (cursor) {
      conditions.push(lt(notifications.createdAt, new Date(cursor)))
    }

    const rows = await db
      .select({
        notification: notifications,
        actor: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const notificationRows = hasMore ? rows.slice(0, limit) : rows

    const postReferenceIds = notificationRows
      .filter(r => r.notification.referenceType === 'post' && r.notification.referenceId)
      .map(r => r.notification.referenceId!)

    const commentReferenceIds = notificationRows
      .filter(r => r.notification.referenceType === 'comment' && r.notification.referenceId)
      .map(r => r.notification.referenceId!)

    let postReferences: Record<string, { mediaUrl: string; coverUrl: string | null; caption: string | null }> = {}
    if (postReferenceIds.length > 0) {
      const postRows = await db
        .select({
          id: posts.id,
          mediaUrl: posts.mediaUrl,
          coverUrl: posts.coverUrl,
          caption: posts.caption,
        })
        .from(posts)
        .where(and(
          inArray(posts.id, postReferenceIds),
          eq(posts.isDeleted, false)
        ))

      postReferences = Object.fromEntries(
        postRows.map(p => [p.id, { mediaUrl: p.mediaUrl, coverUrl: p.coverUrl, caption: p.caption }])
      )
    }

    // Track which post IDs actually exist (not deleted)
    const existingPostIds = new Set(Object.keys(postReferences))

    let commentReferences: Record<string, { content: string; postId: string }> = {}
    if (commentReferenceIds.length > 0) {
      // Join with posts to only get comments whose parent post still exists
      const commentRows = await db
        .select({
          id: comments.id,
          content: comments.content,
          postId: comments.postId,
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(and(
          inArray(comments.id, commentReferenceIds),
          eq(comments.isDeleted, false),
          eq(posts.isDeleted, false)
        ))

      commentReferences = Object.fromEntries(
        commentRows.map(c => [c.id, { content: c.content, postId: c.postId }])
      )
    }

    // Track which comment IDs have valid parent posts
    const existingCommentIds = new Set(Object.keys(commentReferences))

    const notificationsWithActors: NotificationWithActor[] = notificationRows
      // Filter out notifications where the referenced post/comment was deleted
      .filter(row => {
        const n = row.notification
        // If it references a post that no longer exists, filter it out
        if (n.referenceType === 'post' && n.referenceId && !existingPostIds.has(n.referenceId)) {
          return false
        }
        // If it references a comment that no longer exists (or whose parent post is deleted), filter it out
        if (n.referenceType === 'comment' && n.referenceId && !existingCommentIds.has(n.referenceId)) {
          return false
        }
        return true
      })
      .map(row => {
        const n = row.notification
        let reference: NotificationWithActor['reference'] = undefined

        if (n.referenceType === 'post' && n.referenceId && postReferences[n.referenceId]) {
          reference = postReferences[n.referenceId]
        } else if (n.referenceType === 'comment' && n.referenceId && commentReferences[n.referenceId]) {
          reference = commentReferences[n.referenceId]
        }

        return {
          id: n.id,
          type: n.type as NotificationType,
          referenceType: n.referenceType as NotificationReferenceType | null,
          referenceId: n.referenceId,
          isRead: n.isRead,
          createdAt: n.createdAt,
          actor: row.actor,
          reference,
        }
      })

    const nextCursor = hasMore && notificationRows.length > 0
      ? notificationRows[notificationRows.length - 1].notification.createdAt.toISOString()
      : null

    return {
      success: true,
      notifications: notificationsWithActors,
      nextCursor,
      hasMore,
    }
  } catch (error) {
    console.error('Error in getUserNotifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notifications',
      notifications: [],
      nextCursor: null,
      hasMore: false,
    }
  }
})

