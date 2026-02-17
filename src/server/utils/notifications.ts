/**
 * Notifications Direct Utility Functions
 * For use by REST API endpoints (avoiding createServerFn)
 */

import { db } from '@/server/db'
import { notifications, users, posts, comments } from '@/server/db/schema'
import { eq, and, gt, lt, desc, count, inArray } from 'drizzle-orm'

// Types for user notifications
export type NotificationType = 'follow' | 'like' | 'comment' | 'collect' | 'purchase' | 'mention'
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

// Notification retention period (30 days)
const NOTIFICATION_RETENTION_DAYS = 30

/**
 * Get paginated user notifications (Direct function for REST API)
 * Only returns notifications from the last 30 days
 * Also opportunistically cleans up old notifications
 */
export async function getUserNotificationsDirect(
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean
  notifications: NotificationWithActor[]
  nextCursor: string | null
  hasMore: boolean
  error?: string
}> {
  try {
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
    console.error('Error in getUserNotificationsDirect:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notifications',
      notifications: [],
      nextCursor: null,
      hasMore: false,
    }
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCountDirect(
  userId: string
): Promise<{ count: number }> {
  try {
    const [countResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
    return { count: countResult?.count ?? 0 }
  } catch (error) {
    console.error('Error in getUnreadNotificationCountDirect:', error)
    return { count: 0 }
  }
}

/**
 * Mark specific notifications as read
 */
export async function markNotificationsAsReadDirect(
  userId: string,
  notificationIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (notificationIds.length === 0) {
      return { success: true }
    }
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        inArray(notifications.id, notificationIds)
      ))
    return { success: true }
  } catch (error) {
    console.error('Error in markNotificationsAsReadDirect:', error)
    return { success: false, error: 'Failed to mark notifications as read' }
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsReadDirect(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId))
    return { success: true }
  } catch (error) {
    console.error('Error in markAllNotificationsAsReadDirect:', error)
    return { success: false, error: 'Failed to mark all notifications as read' }
  }
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotificationsDirect(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId))
    return { success: true }
  } catch (error) {
    console.error('Error in clearAllNotificationsDirect:', error)
    return { success: false, error: 'Failed to clear notifications' }
  }
}

/** Creator info for new posts toast */
export interface NewPostCreator {
  id: string
  displayName: string | null
  slug: string  // Maps to usernameSlug in DB
  avatarUrl: string | null
}

export interface FeedCounters {
  newPostsCount: number
  creators: NewPostCreator[]
}

export interface NotificationCountersResult {
  unreadNotifications: number
  forYou: FeedCounters | null
  following: FeedCounters | null
}

/**
 * Get notification counters for feed badges and new posts toast
 * (Direct function for REST API - Android app)
 */
export async function getNotificationCountersDirect(
  userId: string | null,
  forYouLastSeen: string | null,
  followingLastSeen: string | null
): Promise<NotificationCountersResult> {
  // Import follows dynamically to avoid potential circular dependencies
  const { follows } = await import('@/server/db/schema')

  let unreadNotifications = 0
  let forYou: FeedCounters | null = null
  let following: FeedCounters | null = null

  try {
    // 1. Unread notifications count (requires auth)
    if (userId) {
      const [countResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
      unreadNotifications = Math.min(Number(countResult?.count ?? 0), 100)
    }

    // 2. For You feed count
    if (forYouLastSeen) {
      const lastSeenDate = new Date(forYouLastSeen)

      if (!isNaN(lastSeenDate.getTime())) {
        // Add 100ms buffer for timestamp precision
        const lastSeenDateWithBuffer = new Date(lastSeenDate.getTime() + 100)

        const forYouConditions = [
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
          gt(posts.createdAt, lastSeenDateWithBuffer),
        ]

        const forYouResult = await db
          .select({ count: count() })
          .from(posts)
          .where(and(...forYouConditions))

        const forYouNewPostsCount = Math.min(Number(forYouResult[0]?.count || 0), 100)

        let forYouCreators: NewPostCreator[] = []
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
            .limit(10)

          // Dedupe by user ID
          const seenUserIds = new Set<string>()
          for (const post of newPostsWithCreators) {
            if (!seenUserIds.has(post.userId) && seenUserIds.size < 3) {
              seenUserIds.add(post.userId)
              forYouCreators.push({
                id: post.user.id,
                displayName: post.user.displayName,
                slug: post.user.usernameSlug,
                avatarUrl: post.user.avatarUrl,
              })
            }
          }
        }

        forYou = {
          newPostsCount: forYouNewPostsCount,
          creators: forYouCreators,
        }
      }
    }

    // 3. Following feed count (requires auth)
    if (userId && followingLastSeen) {
      // Get list of users that the current user follows
      const followingList = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId))

      const followingIds = followingList.map(f => f.followingId)

      if (followingIds.length > 0) {
        const lastSeenDate = new Date(followingLastSeen)

        if (!isNaN(lastSeenDate.getTime())) {
          const lastSeenDateWithBuffer = new Date(lastSeenDate.getTime() + 100)

          const followingConditions = [
            eq(posts.isDeleted, false),
            eq(posts.isHidden, false),
            gt(posts.createdAt, lastSeenDateWithBuffer),
            inArray(posts.userId, followingIds),
          ]

          const followingResult = await db
            .select({ count: count() })
            .from(posts)
            .where(and(...followingConditions))

          const followingNewPostsCount = Math.min(Number(followingResult[0]?.count || 0), 100)

          let followingCreators: NewPostCreator[] = []
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
              .limit(10)

            // Dedupe by user ID
            const seenUserIds = new Set<string>()
            for (const post of newPostsWithCreators) {
              if (!seenUserIds.has(post.userId) && seenUserIds.size < 3) {
                seenUserIds.add(post.userId)
                followingCreators.push({
                  id: post.user.id,
                  displayName: post.user.displayName,
                  slug: post.user.usernameSlug,
                  avatarUrl: post.user.avatarUrl,
                })
              }
            }
          }

          following = {
            newPostsCount: followingNewPostsCount,
            creators: followingCreators,
          }
        }
      } else {
        // User follows no one, return empty following counts
        following = {
          newPostsCount: 0,
          creators: [],
        }
      }
    }

    return {
      unreadNotifications,
      forYou,
      following,
    }
  } catch (error) {
    console.error('Error in getNotificationCountersDirect:', error)
    return {
      unreadNotifications: 0,
      forYou: null,
      following: null,
    }
  }
}
