/**
 * Admin server functions
 * Handles moderation and admin operations
 * 
 * All functions require authentication via withAuth and role verification.
 * Never trust client-provided moderatorUserId/adminUserId.
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { contentReports, posts, users, comments, dmThreads } from '@/server/db/schema'
import { eq, and, desc, sql, count, inArray, exists, or } from 'drizzle-orm'
import { z } from 'zod'
import { requireModerator, requireAdmin, getUserWithRole } from './auth-helpers'
import { withAuth } from '@/server/auth'

// Schema for getting reports queue (no moderatorUserId - derived from auth)
const getReportsQueueSchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'rejected']).optional(),
  contentType: z.enum(['post', 'comment', 'dm_thread']).optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
})

// Schema for getting report details (no moderatorUserId - derived from auth)
const getReportDetailsSchema = z.object({
  reportId: z.string().uuid(),
})

// Schema for hiding/unhiding posts (no moderatorUserId - derived from auth)
const hidePostSchema = z.object({
  postId: z.string().uuid(),
  reason: z.string().max(500),
})

const unhidePostSchema = z.object({
  postId: z.string().uuid(),
})

// Schema for soft deleting posts (no adminUserId - derived from auth)
const softDeletePostSchema = z.object({
  postId: z.string().uuid(),
  reason: z.string().max(500),
})

// Schema for resolving reports (no moderatorUserId - derived from auth)
const resolveReportsSchema = z.object({
  contentType: z.enum(['post', 'comment', 'dm_thread']),
  contentId: z.string().uuid(),
  resolution: z.enum(['removed', 'no_action']),
})

// Schema for hiding/unhiding comments (no moderatorUserId - derived from auth)
const hideCommentSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().max(500),
})

const unhideCommentSchema = z.object({
  commentId: z.string().uuid(),
})

// Schema for soft deleting comments (no adminUserId - derived from auth)
const softDeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().max(500),
})

// Schema for getting reports by post/comment ID
const getReportsByIdSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
})

// Schema for getting a comment
const getCommentSchema = z.object({
  commentId: z.string().uuid(),
})

/**
 * Get reports queue - list of reported posts and comments sorted by report count (highest first), then newest
 * Supports filtering by contentType (post/comment) or returning both
 */
export const getReportsQueue = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(getReportsQueueSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { status, contentType, limit } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    const contentTypeFilter = contentType || undefined // undefined means both

    // Get posts with reports (we'll sort by latest report date later)
    const reportedPosts = (!contentTypeFilter || contentTypeFilter === 'post')
      ? await db
          .select({
            post: posts,
            creator: {
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
              avatarUrl: users.avatarUrl,
            },
          })
          .from(posts)
          .innerJoin(users, eq(posts.userId, users.id))
          .where(
            sql`${posts.reportCount} > 0`
          )
          .limit(limit * 2) // Fetch more to allow for sorting by report date
      : []

    // Get comments with reports (we'll sort by latest report date later)
    const reportedComments = (!contentTypeFilter || contentTypeFilter === 'comment')
      ? await db
          .select({
            comment: comments,
            commenter: {
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
              avatarUrl: users.avatarUrl,
            },
            post: {
              id: posts.id,
              mediaUrl: posts.mediaUrl,
              coverUrl: posts.coverUrl,
            },
          })
          .from(comments)
          .innerJoin(users, eq(comments.userId, users.id))
          .innerJoin(posts, eq(comments.postId, posts.id))
          .where(
            sql`${comments.reportCount} > 0`
          )
          .limit(limit * 2) // Fetch more to allow for sorting by report date
      : []

    // Get DM threads with reports (we need to join to get report count since threads don't have reportCount column)
    // We use a subquery to find threads that have reports
    const reportedDmThreads = (!contentTypeFilter || contentTypeFilter === 'dm_thread')
      ? await (async () => {
          // First get thread IDs that have reports
          const threadIdsWithReports = await db
            .selectDistinct({ contentId: contentReports.contentId })
            .from(contentReports)
            .where(
              and(
                eq(contentReports.contentType, 'dm_thread'),
                status ? eq(contentReports.status, status) : undefined
              )
            )
            .limit(limit * 2)

          if (threadIdsWithReports.length === 0) return []

          const threadIds = threadIdsWithReports.map(r => r.contentId)

          // Alias for user_a and user_b joins
          const userA = db
            .select({
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .as('user_a')

          const userB = db
            .select({
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .as('user_b')

          // Get thread details with both users
          const threads = await db
            .select({
              thread: dmThreads,
              userA: {
                id: users.id,
                displayName: users.displayName,
                usernameSlug: users.usernameSlug,
                avatarUrl: users.avatarUrl,
              },
            })
            .from(dmThreads)
            .innerJoin(users, eq(dmThreads.userAId, users.id))
            .where(inArray(dmThreads.id, threadIds))

          // Get userB details separately
          const threadsWithUserB = await Promise.all(
            threads.map(async ({ thread, userA }) => {
              const [userBData] = await db
                .select({
                  id: users.id,
                  displayName: users.displayName,
                  usernameSlug: users.usernameSlug,
                  avatarUrl: users.avatarUrl,
                })
                .from(users)
                .where(eq(users.id, thread.userBId))
                .limit(1)

              return { thread, userA, userB: userBData }
            })
          )

          return threadsWithUserB
        })()
      : []

    // Get all reports for posts to calculate top reasons and latest report date
    const postIds = reportedPosts.map(p => p.post.id)
    const postReports = postIds.length > 0
      ? await db
          .select({
            contentId: contentReports.contentId,
            reasons: contentReports.reasons,
            status: contentReports.status,
            createdAt: contentReports.createdAt,
          })
          .from(contentReports)
          .where(
            and(
              eq(contentReports.contentType, 'post'),
              inArray(contentReports.contentId, postIds),
              status ? eq(contentReports.status, status) : undefined
            )
          )
      : []

    // Get all reports for comments to calculate top reasons and latest report date
    const commentIds = reportedComments.map(c => c.comment.id)
    const commentReports = commentIds.length > 0
      ? await db
          .select({
            contentId: contentReports.contentId,
            reasons: contentReports.reasons,
            status: contentReports.status,
            createdAt: contentReports.createdAt,
          })
          .from(contentReports)
          .where(
            and(
              eq(contentReports.contentType, 'comment'),
              inArray(contentReports.contentId, commentIds),
              status ? eq(contentReports.status, status) : undefined
            )
          )
      : []

    // Get all reports for DM threads to calculate top reasons and latest report date
    const dmThreadIds = reportedDmThreads.map(t => t.thread.id)
    const dmThreadReports = dmThreadIds.length > 0
      ? await db
          .select({
            contentId: contentReports.contentId,
            reasons: contentReports.reasons,
            status: contentReports.status,
            createdAt: contentReports.createdAt,
          })
          .from(contentReports)
          .where(
            and(
              eq(contentReports.contentType, 'dm_thread'),
              inArray(contentReports.contentId, dmThreadIds),
              status ? eq(contentReports.status, status) : undefined
            )
          )
      : []

    // Count reason frequency per content item and track latest report date
    const reasonCounts = new Map<string, Map<string, number>>()
    const reportStatuses = new Map<string, { hasResolved: boolean; hasOpen: boolean }>()
    const latestReportDates = new Map<string, Date>() // Track most recent report date per content
    
    // Process post reports
    for (const report of postReports) {
      if (!report.contentId) continue
      if (!reasonCounts.has(report.contentId)) {
        reasonCounts.set(report.contentId, new Map())
      }
      const counts = reasonCounts.get(report.contentId)!
      for (const reason of report.reasons) {
        counts.set(reason, (counts.get(reason) || 0) + 1)
      }
      // Track status
      if (!reportStatuses.has(report.contentId)) {
        reportStatuses.set(report.contentId, { hasResolved: false, hasOpen: false })
      }
      const status = reportStatuses.get(report.contentId)!
      if (report.status === 'resolved') {
        status.hasResolved = true
      }
      if (report.status === 'open' || report.status === 'reviewing') {
        status.hasOpen = true
      }
      // Track latest report date
      const reportDate = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt)
      const existingLatest = latestReportDates.get(report.contentId)
      if (!existingLatest || reportDate > existingLatest) {
        latestReportDates.set(report.contentId, reportDate)
      }
    }

    // Process comment reports
    for (const report of commentReports) {
      if (!report.contentId) continue
      if (!reasonCounts.has(report.contentId)) {
        reasonCounts.set(report.contentId, new Map())
      }
      const counts = reasonCounts.get(report.contentId)!
      for (const reason of report.reasons) {
        counts.set(reason, (counts.get(reason) || 0) + 1)
      }
      // Track status
      if (!reportStatuses.has(report.contentId)) {
        reportStatuses.set(report.contentId, { hasResolved: false, hasOpen: false })
      }
      const status = reportStatuses.get(report.contentId)!
      if (report.status === 'resolved') {
        status.hasResolved = true
      }
      if (report.status === 'open' || report.status === 'reviewing') {
        status.hasOpen = true
      }
      // Track latest report date
      const reportDate = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt)
      const existingLatest = latestReportDates.get(report.contentId)
      if (!existingLatest || reportDate > existingLatest) {
        latestReportDates.set(report.contentId, reportDate)
      }
    }

    // Process DM thread reports
    for (const report of dmThreadReports) {
      if (!report.contentId) continue
      if (!reasonCounts.has(report.contentId)) {
        reasonCounts.set(report.contentId, new Map())
      }
      const counts = reasonCounts.get(report.contentId)!
      for (const reason of report.reasons) {
        counts.set(reason, (counts.get(reason) || 0) + 1)
      }
      // Track status
      if (!reportStatuses.has(report.contentId)) {
        reportStatuses.set(report.contentId, { hasResolved: false, hasOpen: false })
      }
      const statusInfo = reportStatuses.get(report.contentId)!
      if (report.status === 'resolved') {
        statusInfo.hasResolved = true
      }
      if (report.status === 'open' || report.status === 'reviewing') {
        statusInfo.hasOpen = true
      }
      // Track latest report date
      const reportDate = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt)
      const existingLatest = latestReportDates.get(report.contentId)
      if (!existingLatest || reportDate > existingLatest) {
        latestReportDates.set(report.contentId, reportDate)
      }
    }

    // Build response for posts
    const postReportsList = reportedPosts.map(({ post, creator }) => {
      const counts = reasonCounts.get(post.id)
      const topReasons = counts
        ? Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason]) => reason)
        : []

      const reportStatus = reportStatuses.get(post.id) || { hasResolved: false, hasOpen: true }

      return {
        contentType: 'post' as const,
        contentId: post.id,
        postId: post.id,
        commentId: undefined,
        userId: post.userId,
        type: post.type,
        mediaUrl: post.mediaUrl,
        coverUrl: post.coverUrl,
        caption: post.caption,
        contentText: post.caption,
        createdAt: post.createdAt,
        maxSupply: post.maxSupply,
        reportCount: post.reportCount || 0,
        isHidden: post.isHidden,
        isDeleted: post.isDeleted,
        hiddenReason: post.hiddenReason,
        deleteReason: post.deleteReason,
        hasResolvedReports: reportStatus.hasResolved,
        hasOpenReports: reportStatus.hasOpen,
        creator: {
          id: creator.id,
          displayName: creator.displayName,
          usernameSlug: creator.usernameSlug,
          avatarUrl: creator.avatarUrl,
        },
        topReasons,
        // For backward compatibility
        postUserId: post.userId,
        postType: post.type,
        postMediaUrl: post.mediaUrl,
        postCaption: post.caption,
        postCreatedAt: post.createdAt,
        postMaxSupply: post.maxSupply,
      }
    })

    // Build response for comments
    const commentReportsList = reportedComments.map(({ comment, commenter, post: postData }) => {
      const counts = reasonCounts.get(comment.id)
      const topReasons = counts
        ? Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason]) => reason)
        : []

      const reportStatus = reportStatuses.get(comment.id) || { hasResolved: false, hasOpen: true }

      return {
        contentType: 'comment' as const,
        contentId: comment.id,
        postId: comment.postId,
        commentId: comment.id,
        userId: comment.userId,
        type: undefined,
        mediaUrl: postData.mediaUrl,
        caption: undefined,
        contentText: comment.content,
        createdAt: comment.createdAt,
        maxSupply: undefined,
        reportCount: comment.reportCount || 0,
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        hiddenReason: comment.hiddenReason,
        deleteReason: comment.deleteReason,
        hasResolvedReports: reportStatus.hasResolved,
        hasOpenReports: reportStatus.hasOpen,
        creator: {
          id: commenter.id,
          displayName: commenter.displayName,
          usernameSlug: commenter.usernameSlug,
          avatarUrl: commenter.avatarUrl,
        },
        topReasons,
        // For backward compatibility (set to undefined for comments)
        postUserId: undefined,
        postType: undefined,
        postMediaUrl: undefined,
        postCaption: undefined,
        postCreatedAt: undefined,
        postMaxSupply: undefined,
      }
    })

    // Build response for DM threads
    const dmThreadReportsList = reportedDmThreads.map(({ thread, userA, userB }) => {
      const counts = reasonCounts.get(thread.id)
      const topReasons = counts
        ? Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason]) => reason)
        : []

      const reportStatus = reportStatuses.get(thread.id) || { hasResolved: false, hasOpen: true }

      // Count reports for this thread
      const reportCount = dmThreadReports.filter(r => r.contentId === thread.id).length

      return {
        contentType: 'dm_thread' as const,
        contentId: thread.id,
        postId: undefined,
        commentId: undefined,
        userId: undefined, // No single user for threads
        type: undefined,
        mediaUrl: undefined,
        coverUrl: undefined,
        caption: undefined,
        contentText: `Conversation between @${userA.usernameSlug || 'unknown'} and @${userB?.usernameSlug || 'unknown'}`,
        createdAt: thread.createdAt,
        maxSupply: undefined,
        reportCount,
        isHidden: false, // Threads can't be hidden currently
        isDeleted: false, // Threads can't be deleted currently
        hiddenReason: undefined,
        deleteReason: undefined,
        hasResolvedReports: reportStatus.hasResolved,
        hasOpenReports: reportStatus.hasOpen,
        // Both users in the conversation
        creator: userA, // userA as primary
        otherUser: userB, // userB as secondary
        topReasons,
        // For backward compatibility
        postUserId: undefined,
        postType: undefined,
        postMediaUrl: undefined,
        postCaption: undefined,
        postCreatedAt: undefined,
        postMaxSupply: undefined,
      }
    })

    // Combine and sort by latest report date (newest first)
    const allReports = [...postReportsList, ...commentReportsList, ...dmThreadReportsList]
      .map(report => ({
        ...report,
        latestReportDate: latestReportDates.get(report.contentId) || new Date(report.createdAt),
      }))
      .sort((a, b) => {
        // Sort by latest report date (newest first)
        return b.latestReportDate.getTime() - a.latestReportDate.getTime()
      })
      .slice(0, limit)

    const reports = allReports

    return {
      success: true,
      reports,
    }
  } catch (error) {
    console.error('Error in getReportsQueue:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports queue.',
    }
  }
})

/**
 * Get all reports for a specific post
 */
export const getReportsByPostId = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(z.object({ postId: z.string().uuid() }), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { postId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get all reports for this post
    const allReports = await db
      .select({
        report: contentReports,
        reporter: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(contentReports)
      .innerJoin(users, eq(contentReports.reportedByUserId, users.id))
      .where(
        and(
          eq(contentReports.contentType, 'post'),
          eq(contentReports.contentId, postId)
        )
      )
      .orderBy(desc(contentReports.createdAt))

    return {
      success: true,
      allReports: allReports.map(r => ({
        ...r.report,
        reporter: r.reporter,
      })),
    }
  } catch (error) {
    console.error('Error in getReportsByPostId:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports.',
    }
  }
})

/**
 * Get all reports for a specific comment
 */
export const getReportsByCommentId = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(z.object({ commentId: z.string().uuid() }), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { commentId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get all reports for this comment
    const allReports = await db
      .select({
        report: contentReports,
        reporter: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(contentReports)
      .innerJoin(users, eq(contentReports.reportedByUserId, users.id))
      .where(
        and(
          eq(contentReports.contentType, 'comment'),
          eq(contentReports.contentId, commentId)
        )
      )
      .orderBy(desc(contentReports.createdAt))

    return {
      success: true,
      allReports: allReports.map(r => ({
        ...r.report,
        reporter: r.reporter,
      })),
    }
  } catch (error) {
    console.error('Error in getReportsByCommentId:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports.',
    }
  }
})

/**
 * Get all reports for a specific DM thread
 */
export const getReportsByDmThreadId = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(z.object({ threadId: z.string().uuid() }), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { threadId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get all reports for this DM thread
    const allReports = await db
      .select({
        report: contentReports,
        reporter: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(contentReports)
      .innerJoin(users, eq(contentReports.reportedByUserId, users.id))
      .where(
        and(
          eq(contentReports.contentType, 'dm_thread'),
          eq(contentReports.contentId, threadId)
        )
      )
      .orderBy(desc(contentReports.createdAt))

    return {
      success: true,
      allReports: allReports.map(r => ({
        ...r.report,
        reporter: r.reporter,
      })),
    }
  } catch (error) {
    console.error('Error in getReportsByDmThreadId:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports.',
    }
  }
})

/**
 * Get a DM thread with both user details (for moderation)
 */
export const getDmThreadForModeration = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(z.object({ threadId: z.string().uuid() }), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { threadId } = data

    // Check moderator/admin role
    await requireModerator(auth.userId)

    // Get thread
    const [thread] = await db
      .select()
      .from(dmThreads)
      .where(eq(dmThreads.id, threadId))
      .limit(1)

    if (!thread) {
      return {
        success: false,
        error: 'Thread not found',
      }
    }

    // Get both users
    const [userA] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        usernameSlug: users.usernameSlug,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, thread.userAId))
      .limit(1)

    const [userB] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        usernameSlug: users.usernameSlug,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, thread.userBId))
      .limit(1)

    return {
      success: true,
      thread,
      userA,
      userB,
    }
  } catch (error) {
    console.error('Error in getDmThreadForModeration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch thread.',
    }
  }
})

/**
 * Get a single comment with author details
 */
export const getComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(getCommentSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { commentId } = data

    // Check moderator/admin role (can see hidden/deleted comments)
    await requireModerator(auth.userId)

    // Get comment with author
    const [commentResult] = await db
      .select({
        comment: comments,
        commenter: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, commentId))
      .limit(1)

    if (!commentResult) {
      return {
        success: false,
        error: 'Comment not found.',
      }
    }

    // Get parent post with author
    const [postResult] = await db
      .select({
        post: posts,
        postAuthor: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, commentResult.comment.postId))
      .limit(1)

    if (!postResult) {
      return {
        success: false,
        error: 'Parent post not found.',
      }
    }

    return {
      success: true,
      comment: commentResult.comment,
      commenter: commentResult.commenter,
      post: postResult.post,
      postAuthor: postResult.postAuthor,
    }
  } catch (error) {
    console.error('Error in getComment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comment.',
    }
  }
})

/**
 * Get full report details for a specific post, including all reports
 */
export const getReportDetails = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(getReportDetailsSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { reportId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get the report
    const [report] = await db
      .select()
      .from(contentReports)
      .where(eq(contentReports.id, reportId))
      .limit(1)

    if (!report) {
      return {
        success: false,
        error: 'Report not found.',
      }
    }

    // Get all reports for this content item
    const allReports = await db
      .select({
        report: contentReports,
        reporter: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(contentReports)
      .innerJoin(users, eq(contentReports.reportedByUserId, users.id))
      .where(
        and(
          eq(contentReports.contentType, report.contentType),
          eq(contentReports.contentId, report.contentId)
        )
      )
      .orderBy(desc(contentReports.createdAt))

    // Get post details if it's a post
    let postData = null
    if (report.contentType === 'post') {
      const [post] = await db
        .select({
          post: posts,
          creator: {
            id: users.id,
            displayName: users.displayName,
            usernameSlug: users.usernameSlug,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.id, report.contentId))
        .limit(1)

      if (post) {
        // Fetch moderator information if present
        let hiddenByUser = null
        let deletedByUser = null

        if (post.post.hiddenByUserId) {
          const [moderator] = await db
            .select({
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
            })
            .from(users)
            .where(eq(users.id, post.post.hiddenByUserId))
            .limit(1)
          hiddenByUser = moderator || null
        }

        if (post.post.deletedByUserId) {
          const [admin] = await db
            .select({
              id: users.id,
              displayName: users.displayName,
              usernameSlug: users.usernameSlug,
            })
            .from(users)
            .where(eq(users.id, post.post.deletedByUserId))
            .limit(1)
          deletedByUser = admin || null
        }

        postData = {
          ...post.post,
          creator: post.creator,
          hiddenByUser,
          deletedByUser,
        }
      }
    }

    return {
      success: true,
      report,
      allReports: allReports.map(r => ({
        ...r.report,
        reporter: r.reporter,
      })),
      post: postData,
    }
  } catch (error) {
    console.error('Error in getReportDetails:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch report details.',
    }
  }
})

/**
 * Hide a post (moderator/admin action)
 */
export const hidePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(hidePostSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { postId, reason } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Update post - use verified auth.userId
    const [updatedPost] = await db
      .update(posts)
      .set({
        isHidden: true,
        hiddenReason: reason,
        hiddenAt: new Date(),
        hiddenByUserId: auth.userId,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning()

    return {
      success: true,
      post: updatedPost,
    }
  } catch (error) {
    console.error('Error in hidePost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to hide post.',
    }
  }
})

/**
 * Unhide a post (moderator/admin action)
 */
export const unhidePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(unhidePostSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { postId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Update post
    const [updatedPost] = await db
      .update(posts)
      .set({
        isHidden: false,
        hiddenReason: null,
        hiddenAt: null,
        hiddenByUserId: null,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning()

    return {
      success: true,
      post: updatedPost,
    }
  } catch (error) {
    console.error('Error in unhidePost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unhide post.',
    }
  }
})

/**
 * Soft delete a post (admin only)
 */
export const softDeletePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify admin role
    const result = await withAuth(softDeletePostSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { postId, reason } = data

    // Check admin role using verified userId
    await requireAdmin(auth.userId)

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Update post - use verified auth.userId
    const [updatedPost] = await db
      .update(posts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: auth.userId,
        deleteReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning()

    return {
      success: true,
      post: updatedPost,
    }
  } catch (error) {
    console.error('Error in softDeletePost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post.',
    }
  }
})

/**
 * Resolve all reports for a post (moderator/admin action)
 */
export const resolveReports = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(resolveReportsSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { contentType, contentId, resolution } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Update all open/reviewing reports for this content - use verified auth.userId
    const updatedReports = await db
      .update(contentReports)
      .set({
        status: 'resolved',
        resolution,
        resolvedByUserId: auth.userId,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(contentReports.contentType, contentType),
          eq(contentReports.contentId, contentId),
          inArray(contentReports.status, ['open', 'reviewing'])
        )
      )
      .returning()

    return {
      success: true,
      reports: updatedReports,
    }
  } catch (error) {
    console.error('Error in resolveReports:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve reports.',
    }
  }
})

/**
 * Hide a comment (moderator/admin action)
 */
export const hideComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(hideCommentSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { commentId, reason } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get comment
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1)

    if (!comment) {
      return {
        success: false,
        error: 'Comment not found.',
      }
    }

    // Update comment - use verified auth.userId
    const [updatedComment] = await db
      .update(comments)
      .set({
        isHidden: true,
        hiddenReason: reason,
        hiddenAt: new Date(),
        hiddenByUserId: auth.userId,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning()

    return {
      success: true,
      comment: updatedComment,
    }
  } catch (error) {
    console.error('Error in hideComment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to hide comment.',
    }
  }
})

/**
 * Unhide a comment (moderator/admin action)
 */
export const unhideComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(unhideCommentSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { commentId } = data

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

    // Get comment
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1)

    if (!comment) {
      return {
        success: false,
        error: 'Comment not found.',
      }
    }

    // Update comment
    const [updatedComment] = await db
      .update(comments)
      .set({
        isHidden: false,
        hiddenReason: null,
        hiddenAt: null,
        hiddenByUserId: null,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning()

    return {
      success: true,
      comment: updatedComment,
    }
  } catch (error) {
    console.error('Error in unhideComment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unhide comment.',
    }
  }
})

/**
 * Soft delete a comment (admin only)
 */
export const softDeleteComment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify admin role
    const result = await withAuth(softDeleteCommentSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { commentId, reason } = data

    // Check admin role using verified userId
    await requireAdmin(auth.userId)

    // Get comment
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1)

    if (!comment) {
      return {
        success: false,
        error: 'Comment not found.',
      }
    }

    // Update comment - use verified auth.userId
    const [updatedComment] = await db
      .update(comments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: auth.userId,
        deleteReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning()

    return {
      success: true,
      comment: updatedComment,
    }
  } catch (error) {
    console.error('Error in softDeleteComment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment.',
    }
  }
})

/**
 * Get count of unreviewed reports (distinct content items with open reports that aren't actioned)
 * Counts posts and comments separately, returns total distinct content items
 */
export const getUnreviewedReportsCount = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    // Empty schema since no input needed besides auth
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { success: false, error: 'Authentication required', count: 0 }
    }
    
    const { auth } = result

    // Check moderator/admin role using verified userId
    await requireModerator(auth.userId)

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
    const count = postsCount + commentsCount + dmThreadsCount

    return {
      success: true,
      count,
    }
  } catch (error) {
    console.error('Error in getUnreviewedReportsCount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get unreviewed reports count.',
      count: 0,
    }
  }
})

