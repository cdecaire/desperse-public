/**
 * Like utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { likes, posts, notifications } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { sendPushNotification, getActorDisplayName, truncate } from './pushDispatch'
import { isUniqueViolation } from './db-errors'
import { isNotificationTypeEnabled } from './notificationPrefs'

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
		.select({ id: posts.id, userId: posts.userId, mediaUrl: posts.mediaUrl, coverUrl: posts.coverUrl, caption: posts.caption })
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
		if (isUniqueViolation(insertError)) {
			return {
				success: true,
				message: 'Already liked this post.',
				isLiked: true,
			}
		}
		throw insertError
	}

	// Create notification for post owner (if not liking own post AND
	// the recipient hasn't disabled this type in their preferences).
	// The pref check gates BOTH the in-app row and the push dispatch
	// so the iOS Settings → Notifications toggle disables likes
	// everywhere — Notifications screen, bell badge, and push.
	if (post.userId !== userId && await isNotificationTypeEnabled(post.userId, 'like')) {
		try {
			await db.insert(notifications).values({
				userId: post.userId,
				actorId: userId,
				type: 'like',
				referenceType: 'post',
				referenceId: postId,
			})
		} catch (notifError) {
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
				body: post.caption ? truncate(post.caption, 140) : '',
				deepLink: `https://desperse.com/p/${postId}`,
				actorId: userId,
				imageUrl: post.coverUrl ?? post.mediaUrl ?? undefined,
			}, { prefChecked: true })
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
