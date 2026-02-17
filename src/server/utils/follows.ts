/**
 * Follow utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { follows, users, notifications, collections, purchases, posts, likes, comments, tips } from '@/server/db/schema'
import { eq, and, desc, inArray, lt } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'

export interface FollowResult {
	success: boolean
	message?: string
	isFollowing?: boolean
	error?: string
}

/**
 * Follow a user (core logic)
 */
export async function followUserDirect(
	followingId: string,
	token: string
): Promise<FollowResult> {
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
			console.warn('[followUserDirect] Auth error:', message)
			return { success: false, error: message }
		}

		// Prevent self-follow
		if (userId === followingId) {
			return {
				success: false,
				error: 'You cannot follow yourself.',
			}
		}

		// Check if target user exists
		const [targetUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, followingId))
			.limit(1)

		if (!targetUser) {
			return {
				success: false,
				error: 'User not found.',
			}
		}

		// Check if already following
		const [existingFollow] = await db
			.select()
			.from(follows)
			.where(
				and(
					eq(follows.followerId, userId),
					eq(follows.followingId, followingId)
				)
			)
			.limit(1)

		if (existingFollow) {
			return {
				success: true,
				message: 'Already following this user.',
				isFollowing: true,
			}
		}

		// Create follow relationship
		// Wrapped in try-catch to handle race conditions (double-tap, network retry)
		try {
			await db.insert(follows).values({
				followerId: userId,
				followingId,
			})
		} catch (insertError) {
			// If duplicate key error, the follow already exists - return success
			const errorMsg = insertError instanceof Error ? insertError.message : ''
			if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
				return {
					success: true,
					message: 'Already following this user.',
					isFollowing: true,
				}
			}
			// Re-throw other errors
			throw insertError
		}

		// Create notification for the followed user (non-critical)
		try {
			await db.insert(notifications).values({
				userId: followingId,
				actorId: userId,
				type: 'follow',
			})
		} catch (notifError) {
			console.warn('[followUserDirect] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
		}

		// Dispatch push notification (awaited for serverless compatibility)
		try {
			const actorName = await getActorDisplayName(userId)
			await sendPushNotification(followingId, {
				type: 'follow',
				title: `${actorName} started following you`,
				body: '',
				deepLink: `https://desperse.com`,
			})
		} catch (pushErr) {
			console.warn('[follows] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
		}

		return {
			success: true,
			message: 'Successfully followed user.',
			isFollowing: true,
		}
	} catch (error) {
		console.error('Error in followUserDirect:', error instanceof Error ? error.message : 'Unknown error')
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to follow user.',
		}
	}
}

/**
 * Unfollow a user (core logic)
 */
export async function unfollowUserDirect(
	followingId: string,
	token: string
): Promise<FollowResult> {
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
			console.warn('[unfollowUserDirect] Auth error:', message)
			return { success: false, error: message }
		}

		// Delete follow relationship (if exists)
		await db
			.delete(follows)
			.where(
				and(
					eq(follows.followerId, userId),
					eq(follows.followingId, followingId)
				)
			)

		return {
			success: true,
			message: 'Successfully unfollowed user.',
			isFollowing: false,
		}
	} catch (error) {
		console.error('Error in unfollowUserDirect:', error instanceof Error ? error.message : 'Unknown error')
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to unfollow user.',
		}
	}
}

// ============================================
// List endpoints for followers/following/collectors
// ============================================

export interface FollowUser {
	id: string
	slug: string
	displayName: string | null
	avatarUrl: string | null
	isFollowing: boolean // Whether the current user follows this user
}

export interface FollowListResult {
	success: boolean
	error?: string
	users?: FollowUser[]
	hasMore?: boolean
	nextCursor?: string | null
}

/**
 * Get followers list for a user (Direct function for REST API)
 */
export async function getFollowersListDirect(
	userId: string,
	currentUserId?: string,
	cursor?: string,
	limit: number = 50
): Promise<FollowListResult> {
	try {
		const conditions = [eq(follows.followingId, userId)]

		if (cursor) {
			conditions.push(lt(follows.createdAt, new Date(cursor)))
		}

		// Get followers with user data
		const rows = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				followedAt: follows.createdAt,
			})
			.from(follows)
			.innerJoin(users, eq(follows.followerId, users.id))
			.where(and(...conditions))
			.orderBy(desc(follows.createdAt))
			.limit(limit + 1)

		const hasMore = rows.length > limit
		const toReturn = hasMore ? rows.slice(0, limit) : rows

		// Check if current user follows each follower
		const followerIds = toReturn.map((f) => f.id)
		const followingSet = new Set<string>()

		if (currentUserId && followerIds.length > 0) {
			const currentUserFollows = await db
				.select({ followingId: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, currentUserId),
						inArray(follows.followingId, followerIds)
					)
				)

			currentUserFollows.forEach((f) => followingSet.add(f.followingId))
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.followedAt.toISOString() : null

		return {
			success: true,
			users: toReturn.map((row) => ({
				id: row.id,
				slug: row.usernameSlug,
				displayName: row.displayName,
				avatarUrl: row.avatarUrl,
				isFollowing: followingSet.has(row.id),
			})),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getFollowersListDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch followers',
		}
	}
}

/**
 * Get following list for a user (Direct function for REST API)
 */
export async function getFollowingListDirect(
	userId: string,
	currentUserId?: string,
	cursor?: string,
	limit: number = 50
): Promise<FollowListResult> {
	try {
		const conditions = [eq(follows.followerId, userId)]

		if (cursor) {
			conditions.push(lt(follows.createdAt, new Date(cursor)))
		}

		// Get following users with user data
		const rows = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				followedAt: follows.createdAt,
			})
			.from(follows)
			.innerJoin(users, eq(follows.followingId, users.id))
			.where(and(...conditions))
			.orderBy(desc(follows.createdAt))
			.limit(limit + 1)

		const hasMore = rows.length > limit
		const toReturn = hasMore ? rows.slice(0, limit) : rows

		// Check if current user follows each user (for consistency)
		const followingIds = toReturn.map((f) => f.id)
		const followingSet = new Set<string>()

		if (currentUserId && followingIds.length > 0) {
			const currentUserFollows = await db
				.select({ followingId: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, currentUserId),
						inArray(follows.followingId, followingIds)
					)
				)

			currentUserFollows.forEach((f) => followingSet.add(f.followingId))
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.followedAt.toISOString() : null

		return {
			success: true,
			users: toReturn.map((row) => ({
				id: row.id,
				slug: row.usernameSlug,
				displayName: row.displayName,
				avatarUrl: row.avatarUrl,
				isFollowing: followingSet.has(row.id),
			})),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getFollowingListDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch following',
		}
	}
}

/**
 * Get collectors list for a user's creations (Direct function for REST API)
 * Returns users who have collected or purchased items created by this user
 */
export async function getCollectorsListDirect(
	userId: string,
	currentUserId?: string,
	cursor?: string,
	limit: number = 50
): Promise<FollowListResult> {
	try {
		// Get all post IDs created by this user
		const userPostIds = await db
			.select({ id: posts.id })
			.from(posts)
			.where(
				and(
					eq(posts.userId, userId),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		if (userPostIds.length === 0) {
			return {
				success: true,
				users: [],
				hasMore: false,
				nextCursor: null,
			}
		}

		const postIdList = userPostIds.map((p) => p.id)

		// Get all unique collector IDs with their most recent collection date
		const collectorMap = new Map<string, Date>()

		// From collections table
		const collectionRows = await db
			.select({
				userId: collections.userId,
				createdAt: collections.createdAt,
			})
			.from(collections)
			.where(
				and(
					inArray(collections.postId, postIdList),
					eq(collections.status, 'confirmed')
				)
			)

		for (const row of collectionRows) {
			if (row.userId !== userId) { // Exclude creator
				const existing = collectorMap.get(row.userId)
				if (!existing || row.createdAt > existing) {
					collectorMap.set(row.userId, row.createdAt)
				}
			}
		}

		// From purchases table
		const purchaseRows = await db
			.select({
				userId: purchases.userId,
				createdAt: purchases.createdAt,
			})
			.from(purchases)
			.where(
				and(
					inArray(purchases.postId, postIdList),
					eq(purchases.status, 'confirmed')
				)
			)

		for (const row of purchaseRows) {
			if (row.userId !== userId) { // Exclude creator
				const existing = collectorMap.get(row.userId)
				if (!existing || row.createdAt > existing) {
					collectorMap.set(row.userId, row.createdAt)
				}
			}
		}

		if (collectorMap.size === 0) {
			return {
				success: true,
				users: [],
				hasMore: false,
				nextCursor: null,
			}
		}

		// Sort collectors by most recent collection
		const sortedCollectors = Array.from(collectorMap.entries())
			.sort((a, b) => b[1].getTime() - a[1].getTime())

		// Apply cursor pagination
		let filteredCollectors = sortedCollectors
		if (cursor) {
			const cursorDate = new Date(cursor)
			filteredCollectors = sortedCollectors.filter(([_, date]) => date < cursorDate)
		}

		const hasMore = filteredCollectors.length > limit
		const toReturn = filteredCollectors.slice(0, limit)

		// Fetch user details
		const collectorIds = toReturn.map(([id]) => id)
		const collectorUsers = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
			})
			.from(users)
			.where(inArray(users.id, collectorIds))

		// Create lookup map
		const userLookup = new Map(collectorUsers.map((u) => [u.id, u]))

		// Check if current user follows each collector
		const followingSet = new Set<string>()
		if (currentUserId && collectorIds.length > 0) {
			const currentUserFollows = await db
				.select({ followingId: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, currentUserId),
						inArray(follows.followingId, collectorIds)
					)
				)

			currentUserFollows.forEach((f) => followingSet.add(f.followingId))
		}

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last[1].toISOString() : null

		return {
			success: true,
			users: toReturn
				.map(([id]) => {
					const user = userLookup.get(id)
					if (!user) return null
					return {
						id: user.id,
						slug: user.usernameSlug,
						displayName: user.displayName,
						avatarUrl: user.avatarUrl,
						isFollowing: followingSet.has(user.id),
					}
				})
				.filter((u): u is FollowUser => u !== null),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getCollectorsListDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch collectors',
		}
	}
}

// ============================================
// Activity feed
// ============================================

export interface ActivityItem {
	id: string
	type: 'post' | 'like' | 'commented' | 'collected' | 'bought' | 'tipped'
	timestamp: string
	post?: {
		id: string
		type: string
		caption: string | null
		mediaUrl: string | null
		coverUrl: string | null
		user: {
			id: string
			slug: string
			displayName: string | null
			avatarUrl: string | null
		}
	}
	tip?: {
		amount: number
		token: string
		recipient: {
			id: string
			slug: string
			displayName: string | null
			avatarUrl: string | null
		}
	}
}

export interface ActivityResult {
	success: boolean
	error?: string
	activities?: ActivityItem[]
	hasMore?: boolean
	nextCursor?: string | null
}

/**
 * Get user activity feed (Direct function for REST API)
 * Shows posts created, likes, comments, collections, and purchases
 * Only for the authenticated user (private activity)
 */
export async function getUserActivityDirect(
	userId: string,
	cursor?: string,
	limit: number = 50
): Promise<ActivityResult> {
	try {
		const activities: Array<{
			id: string
			type: 'post' | 'like' | 'commented' | 'collected' | 'bought' | 'tipped'
			timestamp: Date
			postId?: string
			tipData?: {
				amount: number
				token: string
				recipientId: string
			}
		}> = []

		// 1. Get user's posts
		const userPosts = await db
			.select({
				id: posts.id,
				createdAt: posts.createdAt,
			})
			.from(posts)
			.where(
				and(
					eq(posts.userId, userId),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		for (const post of userPosts) {
			activities.push({
				id: `post-${post.id}`,
				type: 'post',
				timestamp: post.createdAt,
				postId: post.id,
			})
		}

		// 2. Get user's likes
		const userLikes = await db
			.select({
				postId: likes.postId,
				createdAt: likes.createdAt,
			})
			.from(likes)
			.innerJoin(posts, eq(likes.postId, posts.id))
			.where(
				and(
					eq(likes.userId, userId),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		for (const like of userLikes) {
			activities.push({
				id: `like-${like.postId}`,
				type: 'like',
				timestamp: like.createdAt,
				postId: like.postId,
			})
		}

		// 3. Get user's comments (unique posts)
		const userComments = await db
			.select({
				postId: comments.postId,
				createdAt: comments.createdAt,
			})
			.from(comments)
			.innerJoin(posts, eq(comments.postId, posts.id))
			.where(
				and(
					eq(comments.userId, userId),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)
			.orderBy(desc(comments.createdAt))

		// Only keep the most recent comment per post
		const commentedPosts = new Set<string>()
		for (const comment of userComments) {
			if (!commentedPosts.has(comment.postId)) {
				commentedPosts.add(comment.postId)
				activities.push({
					id: `comment-${comment.postId}`,
					type: 'commented',
					timestamp: comment.createdAt,
					postId: comment.postId,
				})
			}
		}

		// 4. Get user's collections (free collectibles)
		const userCollections = await db
			.select({
				postId: collections.postId,
				createdAt: collections.createdAt,
				postType: posts.type,
			})
			.from(collections)
			.innerJoin(posts, eq(collections.postId, posts.id))
			.where(
				and(
					eq(collections.userId, userId),
					eq(collections.status, 'confirmed'),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		for (const collection of userCollections) {
			activities.push({
				id: `collected-${collection.postId}`,
				type: 'collected',
				timestamp: collection.createdAt,
				postId: collection.postId,
			})
		}

		// 5. Get user's purchases (paid editions)
		const userPurchases = await db
			.select({
				postId: purchases.postId,
				createdAt: purchases.createdAt,
			})
			.from(purchases)
			.innerJoin(posts, eq(purchases.postId, posts.id))
			.where(
				and(
					eq(purchases.userId, userId),
					eq(purchases.status, 'confirmed'),
					eq(posts.isDeleted, false),
					eq(posts.isHidden, false)
				)
			)

		for (const purchase of userPurchases) {
			activities.push({
				id: `bought-${purchase.postId}`,
				type: 'bought',
				timestamp: purchase.createdAt,
				postId: purchase.postId,
			})
		}

		// 6. Get user's sent tips
		const userTips = await db
			.select({
				tipId: tips.id,
				amount: tips.amount,
				tokenMint: tips.tokenMint,
				toUserId: tips.toUserId,
				createdAt: tips.createdAt,
			})
			.from(tips)
			.where(
				and(
					eq(tips.fromUserId, userId),
					eq(tips.status, 'confirmed')
				)
			)

		for (const tip of userTips) {
			activities.push({
				id: `tipped-${tip.tipId}`,
				type: 'tipped',
				timestamp: tip.createdAt,
				tipData: {
					amount: Number(tip.amount) / 1e6, // SKR has 6 decimals
					token: 'SKR',
					recipientId: tip.toUserId,
				},
			})
		}

		// Sort by timestamp (newest first)
		activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

		// Apply cursor pagination
		let filteredActivities = activities
		if (cursor) {
			const cursorDate = new Date(cursor)
			filteredActivities = activities.filter((a) => a.timestamp < cursorDate)
		}

		const hasMore = filteredActivities.length > limit
		const toReturn = filteredActivities.slice(0, limit)

		// Fetch post data for post-based activities
		const postIds = [...new Set(toReturn.filter((a) => a.postId).map((a) => a.postId!))]

		const postData = postIds.length > 0
			? await db
					.select({
						id: posts.id,
						type: posts.type,
						caption: posts.caption,
						mediaUrl: posts.mediaUrl,
						coverUrl: posts.coverUrl,
						userId: users.id,
						userSlug: users.usernameSlug,
						userDisplayName: users.displayName,
						userAvatarUrl: users.avatarUrl,
					})
					.from(posts)
					.innerJoin(users, eq(posts.userId, users.id))
					.where(inArray(posts.id, postIds))
			: []

		const postLookup = new Map(postData.map((p) => [p.id, p]))

		// Fetch tip recipient user data
		const tipRecipientIds = [...new Set(toReturn.filter((a) => a.tipData).map((a) => a.tipData!.recipientId))]

		const tipRecipients = tipRecipientIds.length > 0
			? await db
					.select({
						id: users.id,
						slug: users.usernameSlug,
						displayName: users.displayName,
						avatarUrl: users.avatarUrl,
					})
					.from(users)
					.where(inArray(users.id, tipRecipientIds))
			: []

		const recipientLookup = new Map(tipRecipients.map((u) => [u.id, u]))

		const last = toReturn[toReturn.length - 1]
		const nextCursor = hasMore && last ? last.timestamp.toISOString() : null

		return {
			success: true,
			activities: toReturn
				.map((activity): ActivityItem | null => {
					// Tip activities
					if (activity.type === 'tipped' && activity.tipData) {
						const recipient = recipientLookup.get(activity.tipData.recipientId)
						if (!recipient) return null
						return {
							id: activity.id,
							type: activity.type,
							timestamp: activity.timestamp.toISOString(),
							tip: {
								amount: activity.tipData.amount,
								token: activity.tipData.token,
								recipient: {
									id: recipient.id,
									slug: recipient.slug,
									displayName: recipient.displayName,
									avatarUrl: recipient.avatarUrl,
								},
							},
						}
					}

					// Post-based activities
					const post = activity.postId ? postLookup.get(activity.postId) : undefined
					if (!post) return null
					return {
						id: activity.id,
						type: activity.type,
						timestamp: activity.timestamp.toISOString(),
						post: {
							id: post.id,
							type: post.type,
							caption: post.caption,
							mediaUrl: post.mediaUrl,
							coverUrl: post.coverUrl,
							user: {
								id: post.userId,
								slug: post.userSlug,
								displayName: post.userDisplayName,
								avatarUrl: post.userAvatarUrl,
							},
						},
					}
				})
				.filter((a): a is ActivityItem => a !== null),
			hasMore,
			nextCursor,
		}
	} catch (error) {
		console.error('Error in getUserActivityDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch activity',
		}
	}
}
