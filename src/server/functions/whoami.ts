/**
 * Server function for checking authentication status
 * Performs OPTIONAL auth and reports whether the server can identify the user
 * 
 * This is useful for:
 * - Debugging authentication issues
 * - Verifying token propagation is working
 * - Checking if the server can identify a logged-in user
 */

import { createServerFn } from '@tanstack/react-start'
import { verifyPrivyToken, getAuthenticatedUser } from '@/server/auth'
import { z } from 'zod'

// Schema that accepts the authorization header directly in the input
const whoamiSchema = z.object({
  authorization: z.string().optional(),
})

/**
 * Check authentication status
 * Call from client: await whoami({ data: { authorization: token } })
 */
export const whoami = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  const result = {
    timestamp: new Date().toISOString(),
    hasAuthorizationHeader: false,
    hasValidToken: false,
    authenticated: false,
    user: null as {
      privyId: string
      userId: string
      email?: string
      walletAddress?: string
    } | null,
    error: null as string | null,
  }

  // Parse input - handle both wrapped and unwrapped formats
  const rawData = input && typeof input === 'object' && 'data' in input
    ? (input as { data: unknown }).data
    : input

  let authHeader: string | undefined
  try {
    const parsed = whoamiSchema.parse(rawData)
    authHeader = parsed.authorization
  } catch {
    // If parsing fails, try to extract from raw input
    if (rawData && typeof rawData === 'object' && 'authorization' in rawData) {
      authHeader = (rawData as { authorization?: string }).authorization
    }
  }

  result.hasAuthorizationHeader = !!authHeader

  // Extract token from Bearer format
  let accessToken: string | null = null
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7)
  } else if (authHeader) {
    // Maybe they passed the token directly
    accessToken = authHeader
  }
  
  if (!accessToken) {
    if (result.hasAuthorizationHeader) {
      result.error = 'Authorization provided but could not extract token'
    }
    return result
  }

  // Try to verify the token
  try {
    const verifiedClaims = await verifyPrivyToken(accessToken)
    result.hasValidToken = true
    
    // Look up user in database
    const user = await getAuthenticatedUser(verifiedClaims.userId)
    
    if (user) {
      result.authenticated = true
      result.user = {
        privyId: user.privyId,
        userId: user.userId,
        email: user.email,
        walletAddress: user.walletAddress,
      }
    } else {
      result.error = `Privy user ${verifiedClaims.userId} not found in database`
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Token verification failed'
  }

  return result
})

