/**
 * Like utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { likes, posts, notifications } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'

export interface LikeResult {
	success: boolean
	message?: string
	isLiked?: boolean
	error?: string
}

/**
 * Like a post (core logic)
 */
export async function likePostDirect(
	postId: string,
	token: string
): Promise<LikeResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[likePostDirect] Auth error:', message)
		return { success: false, error: message }
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

	// Check if already liked
	const [existingLike] = await db
		.select()
		.from(likes)
		.where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
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
			console.warn(
				'[likePostDirect] Failed to create notification:',
				notifError instanceof Error ? notifError.message : 'Unknown error'
			)
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
			console.warn('[likes] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
		}
	}

	return {
		success: true,
		message: 'Successfully liked post.',
		isLiked: true,
	}
}

/**
 * Unlike a post (core logic)
 */
export async function unlikePostDirect(
	postId: string,
	token: string
): Promise<LikeResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[unlikePostDirect] Auth error:', message)
		return { success: false, error: message }
	}

	// Delete like (if exists) using verified userId
	await db
		.delete(likes)
		.where(and(eq(likes.userId, userId), eq(likes.postId, postId)))

	return {
		success: true,
		message: 'Successfully unliked post.',
		isLiked: false,
	}
}
