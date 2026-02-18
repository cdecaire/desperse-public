/**
 * Comments utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { comments, posts, users, notifications } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { processMentions, deleteMentions } from '@/server/utils/mentions'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'

export interface Comment {
	id: string
	userId: string
	postId: string
	content: string
	createdAt: Date
	updatedAt: Date | null
	user: {
		id: string
		usernameSlug: string
		displayName: string | null
		avatarUrl: string | null
	}
}

export interface GetPostCommentsResult {
	success: boolean
	comments?: Comment[]
	error?: string
}

/**
 * Get all comments for a post (core logic)
 * Public endpoint - no authentication required
 */
export async function getPostCommentsDirect(
	postId: string,
	limit: number = 50
): Promise<GetPostCommentsResult> {
	try {
		// Validate limit
		const safeLimit = Math.min(Math.max(limit, 1), 100)

		// Get comments with user data
		const postComments = await db
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
			.limit(safeLimit)

		return {
			success: true,
			comments: postComments,
		}
	} catch (error) {
		console.error('Error in getPostCommentsDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to get post comments.',
		}
	}
}

// Max comment length
const MAX_COMMENT_LENGTH = 280

export interface CreateCommentResult {
	success: boolean
	comment?: Comment
	error?: string
}

/**
 * Create a comment on a post (core logic)
 * Requires authentication
 */
export async function createCommentDirect(
	postId: string,
	content: string,
	token: string
): Promise<CreateCommentResult> {
	try {
		// Authenticate user
		let userId: string
		try {
			const auth = await authenticateWithToken(token)
			if (!auth?.userId) {
				return { success: false, error: 'Authentication required' }
			}
			userId = auth.userId
		} catch (authError) {
			const message = authError instanceof Error ? authError.message : 'Authentication failed'
			console.warn('[createCommentDirect] Auth error:', message)
			return { success: false, error: message }
		}

		// Validate content
		const trimmedContent = content.trim()
		if (trimmedContent.length < 1 || trimmedContent.length > MAX_COMMENT_LENGTH) {
			return {
				success: false,
				error: `Comment must be 1-${MAX_COMMENT_LENGTH} characters.`,
			}
		}

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

		// Create comment
		const [newComment] = await db
			.insert(comments)
			.values({
				userId,
				postId,
				content: trimmedContent,
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
		// Non-critical - shouldn't fail the comment
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
				console.warn('[createCommentDirect] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
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
				console.warn('[comments] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
			}
		}

		// Process @mentions in the comment (non-critical)
		try {
			await processMentions(content, userId, 'comment', newComment.id, false)
		} catch (mentionError) {
			console.warn('[createCommentDirect] Failed to process mentions:', mentionError instanceof Error ? mentionError.message : 'Unknown error')
		}

		return {
			success: true,
			comment: commentWithUser,
		}
	} catch (error) {
		console.error('Error in createCommentDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create comment.',
		}
	}
}

export interface DeleteCommentResult {
	success: boolean
	deleted?: boolean
	error?: string
}

/**
 * Delete a comment (core logic)
 * Requires authentication - only comment owner can delete
 */
export async function deleteCommentDirect(
	postId: string,
	commentId: string,
	token: string
): Promise<DeleteCommentResult> {
	try {
		// Authenticate user
		let userId: string
		try {
			const auth = await authenticateWithToken(token)
			if (!auth?.userId) {
				return { success: false, error: 'Authentication required' }
			}
			userId = auth.userId
		} catch (authError) {
			const message = authError instanceof Error ? authError.message : 'Authentication failed'
			console.warn('[deleteCommentDirect] Auth error:', message)
			return { success: false, error: message }
		}

		// Check if comment exists and belongs to the specified post
		const [comment] = await db
			.select({ id: comments.id, userId: comments.userId, postId: comments.postId })
			.from(comments)
			.where(eq(comments.id, commentId))
			.limit(1)

		if (!comment) {
			return {
				success: false,
				error: 'Comment not found.',
			}
		}

		// Verify the comment belongs to the specified post
		if (comment.postId !== postId) {
			return {
				success: false,
				error: 'Comment not found on this post.',
			}
		}

		// Verify ownership - only comment owner can delete
		if (comment.userId !== userId) {
			return {
				success: false,
				error: 'You can only delete your own comments.',
			}
		}

		// Delete mentions associated with this comment (non-critical)
		try {
			await deleteMentions('comment', commentId)
		} catch (mentionError) {
			console.warn('[deleteCommentDirect] Failed to delete mentions:', mentionError instanceof Error ? mentionError.message : 'Unknown error')
		}

		// Delete the comment
		await db
			.delete(comments)
			.where(eq(comments.id, commentId))

		return {
			success: true,
			deleted: true,
		}
	} catch (error) {
		console.error('Error in deleteCommentDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete comment.',
		}
	}
}
