/**
 * Direct feedback utility functions for REST API
 * Following the "Direct" function pattern to avoid client bundle leaks
 */

import { db } from '@/server/db'
import { betaFeedback, users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

export interface CreateFeedbackInput {
  rating?: number | null
  message?: string | null
  imageUrl?: string | null
  pageUrl?: string | null
  appVersion?: string | null
  userAgent?: string | null
}

export interface CreateFeedbackResult {
  success: boolean
  error?: string
  feedbackId?: string
}

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
 * Create beta feedback directly (for REST API)
 * Requires at least one of: rating, message (trimmed), or imageUrl
 */
export async function createFeedbackDirect(
  input: CreateFeedbackInput,
  token: string | undefined
): Promise<CreateFeedbackResult> {
  try {
    // Authenticate
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    const { rating, message, imageUrl, pageUrl, appVersion, userAgent } = input

    // Validate rating if provided
    if (rating !== null && rating !== undefined) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' }
      }
    }

    // Validate message length if provided
    const trimmedMessage = message?.trim() || null
    if (trimmedMessage && trimmedMessage.length > 1000) {
      return { success: false, error: 'Message must be 1000 characters or less' }
    }

    // Validate at least one field is present
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
      .returning({ id: betaFeedback.id })

    return {
      success: true,
      feedbackId: feedback.id,
    }
  } catch (error) {
    console.error('Error in createFeedbackDirect:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback.',
    }
  }
}
