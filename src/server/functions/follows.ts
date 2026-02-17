/**
 * Follows server functions
 * Handles follow/unfollow actions and follower counts
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { follows, users, notifications } from '@/server/db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { sendPushNotification, getActorDisplayName } from '@/server/utils/pushDispatch'

// Schema for follow/unfollow (no followerId - derived from auth)
const followSchema = z.object({
  followingId: z.string().uuid(),
})

/**
 * Follow a user
 */
export const followUser = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(followSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[followUser] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { followingId } = data
    const followerId = auth.userId

    // Prevent self-follow
    if (followerId === followingId) {
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
          eq(follows.followerId, followerId),
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

    // Create follow relationship using verified userId
    // Wrapped in try-catch to handle race conditions (double-tap, network retry)
    try {
      await db.insert(follows).values({
        followerId,
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
        actorId: followerId,
        type: 'follow',
      })
    } catch (notifError) {
      console.warn('[followUser] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
    }

    // Dispatch push notification (awaited for serverless compatibility)
    try {
      const actorName = await getActorDisplayName(followerId)
      await sendPushNotification(followingId, {
        type: 'follow',
        title: `${actorName} started following you`,
        body: '',
        deepLink: `https://desperse.com`,
      })
    } catch (pushErr) {
      console.warn('[followUser] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
    }

    return {
      success: true,
      message: 'Successfully followed user.',
      isFollowing: true,
    }
  } catch (error) {
    console.error('Error in followUser:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to follow user.',
    }
  }
})

/**
 * Unfollow a user
 */
export const unfollowUser = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(followSchema, input)
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[unfollowUser] Auth error:', message)
      return { success: false, error: message }
    }

    if (!authResult) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = authResult
    const { followingId } = data
    const followerId = auth.userId

    // Delete follow relationship (if exists) using verified userId
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )

    return {
      success: true,
      message: 'Successfully unfollowed user.',
      isFollowing: false,
    }
  } catch (error) {
    console.error('Error in unfollowUser:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfollow user.',
    }
  }
})

/**
 * Check if current user follows a target user
 */
export const getFollowStatus = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { followerId, followingId } = z.object({
      followerId: z.string().uuid(),
      followingId: z.string().uuid(),
    }).parse(rawData)

    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .limit(1)

    return {
      success: true,
      isFollowing: !!existingFollow,
    }
  } catch (error) {
    console.error('Error in getFollowStatus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check follow status.',
    }
  }
})

/**
 * Get follower count for a user
 */
export const getFollowerCount = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId } = z.object({ userId: z.string().uuid() }).parse(rawData)

    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId))

    return {
      success: true,
      count: result[0]?.count || 0,
    }
  } catch (error) {
    console.error('Error in getFollowerCount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get follower count.',
    }
  }
})

/**
 * Get following count for a user
 */
export const getFollowingCount = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId } = z.object({ userId: z.string().uuid() }).parse(rawData)

    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId))

    return {
      success: true,
      count: result[0]?.count || 0,
    }
  } catch (error) {
    console.error('Error in getFollowingCount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get following count.',
    }
  }
})

/**
 * Get all follow-related stats for a user
 */
export const getFollowStats = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId, currentUserId } = z.object({
      userId: z.string().uuid(),
      currentUserId: z.string().uuid().optional(),
    }).parse(rawData)

    // Get follower count
    const followerResult = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId))

    // Get following count
    const followingResult = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId))

    // Check if current user follows this user
    let isFollowing = false
    if (currentUserId && currentUserId !== userId) {
      const [existingFollow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            eq(follows.followingId, userId)
          )
        )
        .limit(1)
      isFollowing = !!existingFollow
    }

    return {
      success: true,
      followerCount: followerResult[0]?.count || 0,
      followingCount: followingResult[0]?.count || 0,
      isFollowing,
    }
  } catch (error) {
    console.error('Error in getFollowStats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get follow stats.',
    }
  }
})

/**
 * Get list of followers for a user
 */
export const getFollowersList = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId, currentUserId } = z.object({
      userId: z.string().uuid(),
      currentUserId: z.string().uuid().optional(),
    }).parse(rawData)

    // Get all users who follow the profile user
    const followers = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .orderBy(follows.createdAt)

    // If current user is provided, check which followers they follow back
    let followersWithFollowStatus
    if (currentUserId && followers.length > 0) {
      // Get list of follower IDs that current user follows
      const followerIds = followers.map(f => f.id)
      const currentUserFollowsCheck = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            inArray(follows.followingId, followerIds)
          )
        )

      const currentUserFollowsSet = new Set(currentUserFollowsCheck.map(f => f.followingId))

      followersWithFollowStatus = followers.map(follower => ({
        id: follower.id,
        usernameSlug: follower.usernameSlug,
        displayName: follower.displayName,
        avatarUrl: follower.avatarUrl,
        createdAt: follower.createdAt,
        isFollowingBack: currentUserFollowsSet.has(follower.id),
      }))
    } else {
      followersWithFollowStatus = followers.map(follower => ({
        id: follower.id,
        usernameSlug: follower.usernameSlug,
        displayName: follower.displayName,
        avatarUrl: follower.avatarUrl,
        createdAt: follower.createdAt,
        isFollowingBack: false,
      }))
    }

    return {
      success: true,
      followers: followersWithFollowStatus,
    }
  } catch (error) {
    console.error('Error in getFollowersList:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get followers list.',
    }
  }
})

/**
 * Get list of users that a user is following
 */
export const getFollowingList = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId, currentUserId } = z.object({
      userId: z.string().uuid(),
      currentUserId: z.string().uuid().optional(),
    }).parse(rawData)

    // Get all users that the profile user follows
    const following = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .orderBy(follows.createdAt)

    // If current user is provided, check which following users follow back
    let followingWithFollowStatus
    if (currentUserId && following.length > 0) {
      // Get list of following IDs that current user follows
      const followingIds = following.map(f => f.id)
      const currentUserFollowsCheck = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            inArray(follows.followingId, followingIds)
          )
        )

      const currentUserFollowsSet = new Set(currentUserFollowsCheck.map(f => f.followingId))

      followingWithFollowStatus = following.map(followingUser => ({
        id: followingUser.id,
        usernameSlug: followingUser.usernameSlug,
        displayName: followingUser.displayName,
        avatarUrl: followingUser.avatarUrl,
        createdAt: followingUser.createdAt,
        isFollowingBack: currentUserFollowsSet.has(followingUser.id),
      }))
    } else {
      followingWithFollowStatus = following.map(followingUser => ({
        id: followingUser.id,
        usernameSlug: followingUser.usernameSlug,
        displayName: followingUser.displayName,
        avatarUrl: followingUser.avatarUrl,
        createdAt: followingUser.createdAt,
        isFollowingBack: false,
      }))
    }

    return {
      success: true,
      following: followingWithFollowStatus,
    }
  } catch (error) {
    console.error('Error in getFollowingList:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get following list.',
    }
  }
})

