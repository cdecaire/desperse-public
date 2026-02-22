/**
 * Authentication middleware for TanStack Start server functions
 * Extracts and verifies Privy access tokens from request headers
 */

import { createMiddleware } from '@tanstack/react-start'
import { PrivyClient } from '@privy-io/server-auth'
import { env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export interface AuthUser {
  privyId: string
  userId: string
  email?: string
  walletAddress?: string
}

export interface AuthContext {
  user: AuthUser | null
  isAuthenticated: boolean
}

// Initialize Privy server client
let privyClient: PrivyClient | null = null

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    if (!env.PRIVY_APP_SECRET) {
      throw new Error('PRIVY_APP_SECRET is required for server-side authentication')
    }
    privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET)
  }
  return privyClient
}

/**
 * Extract access token from Authorization header
 */
function extractAccessToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Verify Privy access token
 */
async function verifyPrivyToken(accessToken: string): Promise<{ userId: string } | null> {
  try {
    const client = getPrivyClient()
    const verifiedClaims = await client.verifyAuthToken(accessToken)
    return verifiedClaims
  } catch (error) {
    console.error('[authMiddleware] Token verification failed:', error)
    return null
  }
}

/**
 * Get user from database by Privy ID
 */
async function getUserByPrivyId(privyId: string): Promise<AuthUser | null> {
  try {
    const [user] = await db
      .select({
        id: users.id,
        privyId: users.privyId,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1)

    if (!user) {
      return null
    }

    return {
      privyId: user.privyId,
      userId: user.id,
      walletAddress: user.walletAddress || undefined,
    }
  } catch (error) {
    console.error('[authMiddleware] Database lookup failed:', error)
    return null
  }
}

/**
 * Auth middleware for server functions
 * Performs OPTIONAL authentication - adds user to context if valid token provided
 * Does not reject requests without auth
 */
export const authMiddleware = createMiddleware().server(async ({ next, context }: { next: any; context: any }) => {
  // Server middleware - verify token and get user
  const authHeader = context?.headers?.get?.('authorization') ||
                     (context?.authorization as string | undefined) ||
                     null
  
  let authContext: AuthContext = {
    user: null,
    isAuthenticated: false,
  }

  const token = extractAccessToken(authHeader)
  
  if (token) {
    const verifiedClaims = await verifyPrivyToken(token)
    
    if (verifiedClaims) {
      const user = await getUserByPrivyId(verifiedClaims.userId)
      
      if (user) {
        authContext = {
          user,
          isAuthenticated: true,
        }
        console.log('[authMiddleware] User authenticated:', user.userId)
      } else {
        console.warn('[authMiddleware] User not found in database for privyId:', verifiedClaims.userId)
      }
    }
  }

  return next({
    context: {
      auth: authContext,
    },
  })
})

export type AuthMiddleware = typeof authMiddleware

