/**
 * Reports utility functions for REST API
 * Direct functions that can be called from REST endpoints
 */

import { db } from '@/server/db'
import { contentReports, posts, comments, dmThreads } from '@/server/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

export interface CreateReportInput {
	contentType: 'post' | 'comment' | 'dm_thread'
	contentId: string
	reasons: string[]
	details?: string | null
}

export interface CreateReportResult {
	success: boolean
	error?: string
	reportId?: string
}

/**
 * Create a content report (Direct function for REST API)
 * Rate limiting: one report per user per content item
 */
export async function createReportDirect(
	token: string,
	input: CreateReportInput
): Promise<CreateReportResult> {
	try {
		// Authenticate using token
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}

		const { contentType, contentId, reasons, details } = input
		const reportedByUserId = auth.userId

		// Validate reasons
		if (!reasons || reasons.length === 0) {
			return { success: false, error: 'At least one reason is required' }
		}

		// Validate contentId is a valid UUID
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		if (!uuidRegex.test(contentId)) {
			return { success: false, error: 'Invalid content ID' }
		}

		// Validate that content exists
		if (contentType === 'post') {
			const [post] = await db
				.select({ id: posts.id, userId: posts.userId })
				.from(posts)
				.where(and(eq(posts.id, contentId), eq(posts.isDeleted, false)))
				.limit(1)

			if (!post) {
				return { success: false, error: 'Post not found or has been deleted.' }
			}

			// Can't report your own content
			if (post.userId === reportedByUserId) {
				return { success: false, error: 'You cannot report your own content.' }
			}
		} else if (contentType === 'comment') {
			const [comment] = await db
				.select({
					id: comments.id,
					postId: comments.postId,
					userId: comments.userId,
				})
				.from(comments)
				.where(and(eq(comments.id, contentId), eq(comments.isDeleted, false)))
				.limit(1)

			if (!comment) {
				return { success: false, error: 'Comment not found or has been deleted.' }
			}

			// Can't report your own content
			if (comment.userId === reportedByUserId) {
				return { success: false, error: 'You cannot report your own content.' }
			}

			// Verify the post still exists
			const [post] = await db
				.select({ id: posts.id })
				.from(posts)
				.where(eq(posts.id, comment.postId))
				.limit(1)

			if (!post) {
				return { success: false, error: 'The post this comment belongs to no longer exists.' }
			}
		} else if (contentType === 'dm_thread') {
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
				return { success: false, error: 'Conversation not found.' }
			}

			// User must be a participant to report the thread
			if (thread.userAId !== reportedByUserId && thread.userBId !== reportedByUserId) {
				return { success: false, error: 'You are not a participant in this conversation.' }
			}
		} else {
			return { success: false, error: 'Invalid content type' }
		}

		// Check if user already reported this content
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
			return { success: false, error: 'You have already reported this content.' }
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
			.returning({ id: contentReports.id })

		// Increment report count for posts and comments
		if (contentType === 'post') {
			await db
				.update(posts)
				.set({ reportCount: sql`${posts.reportCount} + 1` })
				.where(eq(posts.id, contentId))
		} else if (contentType === 'comment') {
			await db
				.update(comments)
				.set({ reportCount: sql`${comments.reportCount} + 1` })
				.where(eq(comments.id, contentId))
		}

		return { success: true, reportId: report.id }
	} catch (error) {
		console.error('[createReportDirect] Error:', error)

		// Handle unique constraint violation
		if (error instanceof Error && error.message.includes('unique')) {
			return { success: false, error: 'You have already reported this content.' }
		}

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create report.',
		}
	}
}
