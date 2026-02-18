/**
 * Beta Feedback server functions
 * Lightweight feedback inbox for beta users
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { betaFeedback, users } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { requireModerator } from '@/server/utils/auth-helpers'
import { withAuth } from '@/server/auth'

// Schema for creating feedback - all optional except auth
const createBetaFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  pageUrl: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
})

// Schema for listing feedback (admin)
const getBetaFeedbackListSchema = z.object({
  status: z.enum(['new', 'reviewed']).nullable().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
})

// Schema for getting single feedback (admin)
const getBetaFeedbackByIdSchema = z.object({
  feedbackId: z.string().uuid(),
})

// Schema for marking feedback reviewed (admin)
const markBetaFeedbackReviewedSchema = z.object({
  feedbackId: z.string().uuid(),
})

/**
 * Strip query params from URL to avoid leaking tokens
 */
function stripQueryParams(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url // Return as-is if not a valid URL
  }
}

/**
 * Create beta feedback
 * Requires at least one of: rating, message (trimmed), or imageUrl
 */
export const createBetaFeedback = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    const result = await withAuth(createBetaFeedbackSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { rating, message, imageUrl, pageUrl, appVersion, userAgent } = data

    // Validate at least one field is present
    const trimmedMessage = message?.trim() || null
    if (!rating && !trimmedMessage && !imageUrl) {
      return {
        success: false,
        error: 'Please provide at least a rating, message, or screenshot.',
      }
    }

    // Get user display name
    const [user] = await db
      .select({ displayName: users.displayName, usernameSlug: users.usernameSlug })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    const displayName = user?.displayName || user?.usernameSlug || null

    // Create feedback
    const [feedback] = await db
      .insert(betaFeedback)
      .values({
        userId: auth.userId,
        displayName,
        rating: rating || null,
        message: trimmedMessage,
        imageUrl: imageUrl || null,
        pageUrl: stripQueryParams(pageUrl),
        appVersion: appVersion || null,
        userAgent: userAgent || null,
        status: 'new',
      })
      .returning()

    return {
      success: true,
      feedback,
    }
  } catch (error) {
    console.error('Error in createBetaFeedback:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback.',
    }
  }
})

/**
 * Get beta feedback list (admin only)
 * Sorted by createdAt desc
 */
export const getBetaFeedbackList = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(getBetaFeedbackListSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { status, limit, offset } = data

    // Check moderator/admin role
    await requireModerator(auth.userId)

    // Build query
    let query = db
      .select({
        id: betaFeedback.id,
        userId: betaFeedback.userId,
        displayName: betaFeedback.displayName,
        rating: betaFeedback.rating,
        message: betaFeedback.message,
        imageUrl: betaFeedback.imageUrl,
        pageUrl: betaFeedback.pageUrl,
        appVersion: betaFeedback.appVersion,
        userAgent: betaFeedback.userAgent,
        status: betaFeedback.status,
        reviewedAt: betaFeedback.reviewedAt,
        createdAt: betaFeedback.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(betaFeedback)
      .leftJoin(users, eq(betaFeedback.userId, users.id))
      .orderBy(desc(betaFeedback.createdAt))
      .limit(limit)
      .offset(offset)

    // Apply status filter if provided
    if (status) {
      query = query.where(eq(betaFeedback.status, status)) as typeof query
    }

    const feedbackList = await query

    return {
      success: true,
      feedback: feedbackList,
    }
  } catch (error) {
    console.error('Error in getBetaFeedbackList:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback list.',
    }
  }
})

/**
 * Get single beta feedback by ID (admin only)
 */
export const getBetaFeedbackById = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(getBetaFeedbackByIdSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { feedbackId } = data

    // Check moderator/admin role
    await requireModerator(auth.userId)

    const [feedback] = await db
      .select({
        id: betaFeedback.id,
        userId: betaFeedback.userId,
        displayName: betaFeedback.displayName,
        rating: betaFeedback.rating,
        message: betaFeedback.message,
        imageUrl: betaFeedback.imageUrl,
        pageUrl: betaFeedback.pageUrl,
        appVersion: betaFeedback.appVersion,
        userAgent: betaFeedback.userAgent,
        status: betaFeedback.status,
        reviewedAt: betaFeedback.reviewedAt,
        reviewedByUserId: betaFeedback.reviewedByUserId,
        createdAt: betaFeedback.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(betaFeedback)
      .leftJoin(users, eq(betaFeedback.userId, users.id))
      .where(eq(betaFeedback.id, feedbackId))
      .limit(1)

    if (!feedback) {
      return {
        success: false,
        error: 'Feedback not found.',
      }
    }

    return {
      success: true,
      feedback,
    }
  } catch (error) {
    console.error('Error in getBetaFeedbackById:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback.',
    }
  }
})

/**
 * Mark beta feedback as reviewed (admin only)
 * Idempotent - no error if already reviewed
 */
export const markBetaFeedbackReviewed = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate and verify moderator role
    const result = await withAuth(markBetaFeedbackReviewedSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const { feedbackId } = data

    // Check moderator/admin role
    await requireModerator(auth.userId)

    // Check if feedback exists
    const [existing] = await db
      .select({ id: betaFeedback.id, status: betaFeedback.status })
      .from(betaFeedback)
      .where(eq(betaFeedback.id, feedbackId))
      .limit(1)

    if (!existing) {
      return {
        success: false,
        error: 'Feedback not found.',
      }
    }

    // Idempotent - if already reviewed, just return success
    if (existing.status === 'reviewed') {
      return {
        success: true,
        message: 'Feedback already reviewed.',
      }
    }

    // Update to reviewed
    await db
      .update(betaFeedback)
      .set({
        status: 'reviewed',
        reviewedAt: new Date(),
        reviewedByUserId: auth.userId,
      })
      .where(eq(betaFeedback.id, feedbackId))

    return {
      success: true,
      message: 'Feedback marked as reviewed.',
    }
  } catch (error) {
    console.error('Error in markBetaFeedbackReviewed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feedback.',
    }
  }
})
