/**
 * Authentication server functions
 * Handles user initialization and session management with Privy
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateUniqueSlug } from './slug-utils'
import {
  extractAuthorizationFromPayload,
  verifyPrivyToken,
  stripAuthorization,
} from '@/server/auth'

function formatWalletIdentifier(address: string) {
  const trimmed = address?.trim()
  if (!trimmed) {
    return { slugBase: 'user', display: 'user' }
  }
  const prefix = trimmed.slice(0, 4)
  const suffix = trimmed.slice(-4)
  return {
    // Hyphenated to remain slug-safe after normalization
    slugBase: `${prefix}-${suffix}`,
    // Keep nice display format with ellipsis
    display: `${prefix}…${suffix}`,
  }
}

// Schema for Privy user data passed from client
// Note: privyId is now derived from the verified token, not trusted from client
const privyUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  walletAddress: z.string(), // Solana wallet address
  avatarUrl: z.string().url().optional(),
})

export type PrivyUserInput = z.infer<typeof privyUserSchema>

/**
 * Initialize or fetch user from database based on Privy session
 * Called after successful Privy authentication on the client
 *
 * SECURITY: The privyId is extracted from the verified Privy token,
 * NOT from client-provided data. This prevents users from claiming
 * arbitrary privyIds.
 */
export const initAuth = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Step 1: Extract raw data from TanStack Start wrapper
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    if (!rawData || typeof rawData !== 'object') {
      return {
        success: false,
        error: 'Invalid input',
      }
    }

    const dataObj = rawData as Record<string, unknown>

    // Step 2: Extract and verify authorization token
    const authorization = extractAuthorizationFromPayload(dataObj)

    if (!authorization) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      }
    }

    // Verify the token with Privy - this is the source of truth for privyId
    let verifiedPrivyId: string
    try {
      const accessToken = authorization.startsWith('Bearer ')
        ? authorization.substring(7)
        : authorization
      console.log('[initAuth] Verifying token, length:', accessToken.length)
      const verifiedClaims = await verifyPrivyToken(accessToken)
      verifiedPrivyId = verifiedClaims.userId
      console.log('[initAuth] Token verified, privyId:', verifiedPrivyId)
    } catch (error) {
      console.error('[initAuth] Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
      return {
        success: false,
        error: 'Invalid or expired authentication token',
      }
    }

    // Step 3: Parse the rest of the input (strip _authorization first)
    const cleanedData = stripAuthorization(dataObj)
    console.log('[initAuth] Cleaned data:', JSON.stringify(cleanedData))
    const parseResult = privyUserSchema.safeParse(cleanedData)

    if (!parseResult.success) {
      console.log('[initAuth] Schema validation failed:', parseResult.error.issues)
      return {
        success: false,
        error: `Invalid input: ${parseResult.error.issues.map((e) => e.message).join(', ')}`,
      }
    }

    const { email, name, walletAddress, avatarUrl } = parseResult.data
    console.log('[initAuth] Parsed data: walletAddress=', walletAddress)

    // Step 4: Check if user already exists by verified privyId
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.privyId, verifiedPrivyId))
      .limit(1)

    console.log('[initAuth] Existing user query result:', existingUser.length > 0 ? existingUser[0].id : 'not found')

    if (existingUser.length > 0) {
      // User exists - update wallet address and avatar if changed
      const user = existingUser[0]

      // Check if we need to update anything
      const needsUpdate =
        user.walletAddress !== walletAddress ||
        (avatarUrl && user.avatarUrl !== avatarUrl)

      if (needsUpdate) {
        const [updatedUser] = await db
          .update(users)
          .set({
            walletAddress,
            avatarUrl: avatarUrl || user.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning()

        // Ensure embedded wallet row exists in userWallets
        try {
          const { ensureWalletExists } = await import('@/server/utils/wallet-preferences')
          await ensureWalletExists(updatedUser.id, walletAddress, 'embedded', { connector: 'privy', label: 'Desperse Wallet' })
        } catch (e) {
          console.warn('[initAuth] Non-critical: failed to ensure wallet row:', e instanceof Error ? e.message : e)
        }

        return {
          success: true,
          user: updatedUser,
          isNewUser: false,
        }
      }

      // Ensure embedded wallet row exists in userWallets (even if no user update needed)
      try {
        const { ensureWalletExists } = await import('@/server/utils/wallet-preferences')
        await ensureWalletExists(user.id, walletAddress, 'embedded', { connector: 'privy', label: 'Desperse Wallet' })
      } catch (e) {
        console.warn('[initAuth] Non-critical: failed to ensure wallet row:', e instanceof Error ? e.message : e)
      }

      return {
        success: true,
        user,
        isNewUser: false,
      }
    }

    // Step 5: New user - create entry with generated slug
    // Generate initial slug from email, name, or linked wallet
    const walletLabel = formatWalletIdentifier(walletAddress)
    const baseName = name || email?.split('@')[0] || walletLabel.slugBase
    const usernameSlug = await generateUniqueSlug(baseName)

    // Generate display name from email, name, or linked wallet
    const displayName = name || email?.split('@')[0] || walletLabel.display

    const [newUser] = await db
      .insert(users)
      .values({
        privyId: verifiedPrivyId, // Use verified privyId, not client-provided
        walletAddress,
        usernameSlug,
        displayName,
        avatarUrl: avatarUrl || null,
      })
      .returning()

    // Create embedded wallet row in userWallets
    try {
      const { ensureWalletExists } = await import('@/server/utils/wallet-preferences')
      await ensureWalletExists(newUser.id, walletAddress, 'embedded', { connector: 'privy', label: 'Desperse Wallet' })
    } catch (e) {
      console.warn('[initAuth] Non-critical: failed to create wallet row:', e instanceof Error ? e.message : e)
    }

    return {
      success: true,
      user: newUser,
      isNewUser: true,
    }
  } catch (error) {
    console.error('Error in initAuth:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize user',
    }
  }
})

/**
 * Get current user from database
 *
 * SECURITY: The privyId is extracted from the verified Privy token,
 * NOT from client-provided data. This prevents users from fetching
 * arbitrary user profiles by guessing privyIds.
 *
 * Returns null if not authenticated or user not found
 */
export const getCurrentUser = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Step 1: Extract raw data from TanStack Start wrapper
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    if (!rawData || typeof rawData !== 'object') {
      return {
        success: true,
        user: null,
      }
    }

    const dataObj = rawData as Record<string, unknown>

    // Step 2: Extract and verify authorization token
    const authorization = extractAuthorizationFromPayload(dataObj)

    if (!authorization) {
      // Not authenticated - return null (not an error)
      console.log('[getCurrentUser] No authorization token provided')
      return {
        success: true,
        user: null,
      }
    }

    console.log('[getCurrentUser] Authorization token present, length:', authorization.length)

    // Verify the token with Privy - this is the source of truth for privyId
    let verifiedPrivyId: string
    try {
      const accessToken = authorization.startsWith('Bearer ')
        ? authorization.substring(7)
        : authorization
      const verifiedClaims = await verifyPrivyToken(accessToken)
      verifiedPrivyId = verifiedClaims.userId
      console.log('[getCurrentUser] Token verified, privyId:', verifiedPrivyId)
    } catch (error) {
      console.warn('[getCurrentUser] Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
      return {
        success: true,
        user: null,
      }
    }

    // Step 3: Get user by verified privyId
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.privyId, verifiedPrivyId))
      .limit(1)

    if (!user) {
      // User authenticated with Privy but not in our DB yet
      // This is normal for new users before initAuth is called
      console.log('[getCurrentUser] User not found in DB for privyId:', verifiedPrivyId)
      return {
        success: true,
        user: null,
      }
    }

    console.log('[getCurrentUser] User found:', user.id, user.usernameSlug)

    return {
      success: true,
      user,
    }
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return {
      success: true,
      user: null,
    }
  }
})

/**
 * Get user by username slug (for public profile pages)
 */
export const getUserBySlug = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    // Parse input - might be the data directly or wrapped in { data: ... }
    const rawData = input && typeof input === 'object' && 'data' in input 
      ? (input as { data: unknown }).data 
      : input
    const { slug } = z.object({ slug: z.string() }).parse(rawData)

    const [user] = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.usernameSlug, slug))
      .limit(1)

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    return {
      success: true,
      user,
    }
  } catch (error) {
    console.error('Error in getUserBySlug:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    }
  }
})

