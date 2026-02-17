/**
 * Ably authentication server function
 * Returns a token request for the authenticated user
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { generateAblyTokenRequest } from '@/server/utils/ably-token-internal'

const getAblyTokenSchema = z.object({})

/**
 * Get an Ably token request for real-time messaging.
 * Requires authentication - token is scoped to user's channel.
 */
export const getAblyToken = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(getAblyTokenSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth } = result
    const tokenRequest = await generateAblyTokenRequest(auth.userId)

    return {
      success: true,
      tokenRequest,
    }
  } catch (error) {
    console.error('Error generating Ably token:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to generate token' }
  }
})
