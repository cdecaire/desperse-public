/**
 * Internal Ably token generation logic.
 * Uses Ably SDK for proper token request signing.
 * This file is server-only and should never be imported by client code.
 */

import * as Ably from 'ably'
import { env } from '@/config/env'

/**
 * Generate an Ably token request for a user.
 * The token allows subscribing to the user's personal channel only.
 */
export async function generateAblyTokenRequest(userId: string): Promise<Ably.TokenRequest> {
  const apiKey = env.ABLY_API_KEY
  if (!apiKey) {
    throw new Error('ABLY_API_KEY not configured')
  }

  // Create a REST client (not realtime) for token generation
  const ably = new Ably.Rest({ key: apiKey })

  // Generate token request with capabilities
  // User can only subscribe to their own channel
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: userId,
    capability: {
      [`user:${userId}`]: ['subscribe'],
    },
  })

  return tokenRequest
}
