/**
 * Reports server functions
 * Handles content reporting functionality
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { contentReports, posts, comments, dmThreads } from '@/server/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'

// Schema for creating a report (no userId - derived from auth)
const createReportSchema = z.object({
  contentType: z.enum(['post', 'comment', 'dm_thread']),
  contentId: z.string().uuid(),
  reasons: z.array(z.string()).min(1, 'At least one reason is required'),
  details: z.string().max(500).nullable().optional(),
})

/**
 * Create a content report
 * Rate limiting: one report per user per content item (enforced by unique constraint)
 */
export const createReport = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    const result = await withAuth(createReportSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }
    
    const { auth, input: data } = result
    const { contentType, contentId, reasons, details } = data
    const reportedByUserId = auth.userId

    // Validate that content exists
    if (contentType === 'post') {
      const [post] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.id, contentId),
            eq(posts.isDeleted, false)
          )
        )
        .limit(1)

      if (!post) {
        return {
          success: false,
          error: 'Post not found or has been deleted.',
        }
      }
    } else if (contentType === 'comment') {
      // Validate comment exists and belongs to a post
      const [comment] = await db
        .select({ 
          id: comments.id,
          postId: comments.postId,
        })
        .from(comments)
        .where(
          and(
            eq(comments.id, contentId),
            eq(comments.isDeleted, false)
          )
        )
        .limit(1)

      if (!comment) {
        return {
          success: false,
          error: 'Comment not found or has been deleted.',
        }
      }

      // Verify the post still exists (for admin context)
      const [post] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, comment.postId))
        .limit(1)

      if (!post) {
        return {
          success: false,
          error: 'The post this comment belongs to no longer exists.',
        }
      }
    } else if (contentType === 'dm_thread') {
      // Validate DM thread exists and user is a participant
      const [thread] = await db
        .select({
          id: dmThreads.id,
          userAId: dmThreads.userAId,
          userBId: dmThreads.userBId,
        })
        .from(dmThreads)
        .where(eq(dmThreads.id, contentId))
        .limit(1)

      if (!thread) {
        return {
          success: false,
          error: 'Conversation not found.',
        }
      }

      // User must be a participant to report the thread
      if (thread.userAId !== reportedByUserId && thread.userBId !== reportedByUserId) {
        return {
          success: false,
          error: 'You are not a participant in this conversation.',
        }
      }
    }

    // Check if user already reported this content (unique constraint will also prevent duplicates)
    const [existingReport] = await db
      .select({ id: contentReports.id })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.contentType, contentType),
          eq(contentReports.contentId, contentId),
          eq(contentReports.reportedByUserId, reportedByUserId)
        )
      )
      .limit(1)

    if (existingReport) {
      return {
        success: false,
        error: 'You have already reported this content.',
      }
    }

    // Create report
    const [report] = await db
      .insert(contentReports)
      .values({
        contentType,
        contentId,
        reportedByUserId,
        reasons,
        details: details || null,
        status: 'open',
      })
      .returning()

    // Increment report count for posts and comments
    if (contentType === 'post') {
      await db
        .update(posts)
        .set({
          reportCount: sql`${posts.reportCount} + 1`,
        })
        .where(eq(posts.id, contentId))
    } else if (contentType === 'comment') {
      await db
        .update(comments)
        .set({
          reportCount: sql`${comments.reportCount} + 1`,
        })
        .where(eq(comments.id, contentId))
    }

    return {
      success: true,
      report,
    }
  } catch (error) {
    console.error('Error in createReport:', error)
    
    // Handle unique constraint violation (user already reported)
    if (error instanceof Error && error.message.includes('unique')) {
      return {
        success: false,
        error: 'You have already reported this content.',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create report.',
    }
  }
})

