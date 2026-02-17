/**
 * Standalone auth functions for REST API endpoints
 *
 * These functions are kept separate from the TanStack server functions
 * to prevent server-only imports (db, drizzle) from leaking into the
 * client bundle when TanStack imports auth.ts for RPC.
 */

import { db } from '@/server/db'
import { users, userWallets } from '@/server/db/schema'
import { eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { generateUniqueSlug } from '@/server/functions/slug-utils'
import { verifyPrivyToken } from '@/server/auth'
import { validateSessionToken } from './siws'

// Schema for Privy user data passed from client
const privyUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  walletAddress: z.string(),
  avatarUrl: z.string().url().optional(),
})

function formatWalletIdentifier(address: string) {
  const trimmed = address?.trim()
  if (!trimmed) {
    return { slugBase: 'user', display: 'user' }
  }
  const prefix = trimmed.slice(0, 4)
  const suffix = trimmed.slice(-4)
  return {
    slugBase: `${prefix}-${suffix}`,
    display: `${prefix}…${suffix}`,
  }
}

/**
 * Transform user for REST API response
 * Converts usernameSlug to slug for consistency with other endpoints
 */
function transformUserForApi(user: typeof users.$inferSelect) {
  const { usernameSlug, ...rest } = user
  return {
    ...rest,
    slug: usernameSlug,
  }
}

// API user type (with slug instead of usernameSlug)
type ApiUser = Omit<typeof users.$inferSelect, 'usernameSlug'> & { slug: string }

/**
 * Get current user by access token - standalone version for REST API
 */
export async function getCurrentUserByToken(accessToken: string | null | undefined): Promise<{
  success: boolean
  user: ApiUser | null
}> {
  if (!accessToken) {
    console.log('[getCurrentUserByToken] No token provided')
    return { success: true, user: null }
  }

  try {
    // Remove Bearer prefix if present
    const token = accessToken.startsWith('Bearer ')
      ? accessToken.substring(7)
      : accessToken

    console.log('[getCurrentUserByToken] Verifying token, length:', token.length)

    // Route SIWS tokens through session validation instead of Privy
    if (token.startsWith('siws_')) {
      console.log('[getCurrentUserByToken] SIWS token detected, validating session')
      const session = validateSessionToken(token)
      if (!session) {
        console.log('[getCurrentUserByToken] SIWS session invalid or expired')
        return { success: true, user: null }
      }
      console.log('[getCurrentUserByToken] SIWS session valid, userId:', session.userId)

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      if (!user) {
        console.log('[getCurrentUserByToken] User not found for SIWS userId:', session.userId)
        return { success: true, user: null }
      }

      console.log('[getCurrentUserByToken] SIWS user found:', user.id, user.usernameSlug)
      return { success: true, user: transformUserForApi(user) }
    }

    const verifiedClaims = await verifyPrivyToken(token)
    const privyId = verifiedClaims.userId
    console.log('[getCurrentUserByToken] Token verified, privyId:', privyId)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1)

    if (!user) {
      console.log('[getCurrentUserByToken] User not found for privyId:', privyId)
      return { success: true, user: null }
    }

    console.log('[getCurrentUserByToken] User found:', user.id, user.usernameSlug)
    return { success: true, user: transformUserForApi(user) }
  } catch (error) {
    console.error('[getCurrentUserByToken] Error:', error instanceof Error ? error.message : error)
    return { success: true, user: null }
  }
}

/**
 * Initialize auth with backend - standalone version for REST API
 */
export async function initAuthWithToken(
  accessToken: string,
  data: { walletAddress: string; email?: string; name?: string; avatarUrl?: string }
): Promise<{
  success: boolean
  user?: ApiUser
  isNewUser?: boolean
  error?: string
}> {
  try {
    // Remove Bearer prefix if present
    const token = accessToken.startsWith('Bearer ')
      ? accessToken.substring(7)
      : accessToken

    console.log('[initAuthWithToken] Verifying token, length:', token.length)

    // SIWS tokens: user already exists from siws-verify, just look them up
    if (token.startsWith('siws_')) {
      console.log('[initAuthWithToken] SIWS token detected, looking up existing user')
      const session = validateSessionToken(token)
      if (!session) {
        return { success: false, error: 'SIWS session invalid or expired' }
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      if (existingUser) {
        console.log('[initAuthWithToken] SIWS user found:', existingUser.id, existingUser.usernameSlug)
        return { success: true, user: transformUserForApi(existingUser), isNewUser: false }
      }

      console.log('[initAuthWithToken] SIWS user not found for userId:', session.userId)
      return { success: false, error: 'User not found for SIWS session' }
    }

    const verifiedClaims = await verifyPrivyToken(token)
    const verifiedPrivyId = verifiedClaims.userId
    console.log('[initAuthWithToken] Token verified, privyId:', verifiedPrivyId)

    // Validate input
    const parseResult = privyUserSchema.safeParse(data)
    if (!parseResult.success) {
      console.log('[initAuthWithToken] Validation failed:', parseResult.error.issues)
      return {
        success: false,
        error: `Invalid input: ${parseResult.error.issues.map((e) => e.message).join(', ')}`,
      }
    }

    const { email, name, walletAddress, avatarUrl } = parseResult.data
    console.log('[initAuthWithToken] Parsed data: walletAddress=', walletAddress)

    // Check if user already exists by Privy ID
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.privyId, verifiedPrivyId))
      .limit(1)

    console.log('[initAuthWithToken] Existing user by privyId:', existingUser.length > 0 ? existingUser[0].id : 'not found')

    // Wallet-address fallback: handles existing SIWS users migrating to Privy native SIWS.
    // They previously had synthetic privyId like "siws:ADDRESS" and now get a real Privy ID.
    if (existingUser.length === 0 && walletAddress) {
      console.log('[initAuthWithToken] Trying wallet-address fallback for', walletAddress.slice(0, 8))

      // Check users.walletAddress first
      const [walletUser] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1)

      if (walletUser) {
        console.log('[initAuthWithToken] Found user by walletAddress:', walletUser.id, 'old privyId:', walletUser.privyId)
        // Upgrade privyId from synthetic to real Privy ID
        const [upgraded] = await db
          .update(users)
          .set({
            privyId: verifiedPrivyId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, walletUser.id))
          .returning()
        console.log('[initAuthWithToken] Upgraded privyId to:', verifiedPrivyId)
        return { success: true, user: transformUserForApi(upgraded), isNewUser: false }
      }

      // Check userWallets.address table
      const [walletEntry] = await db
        .select({ userId: userWallets.userId })
        .from(userWallets)
        .where(eq(userWallets.address, walletAddress))
        .limit(1)

      if (walletEntry) {
        const [linkedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, walletEntry.userId))
          .limit(1)

        if (linkedUser) {
          console.log('[initAuthWithToken] Found user via userWallets:', linkedUser.id, 'old privyId:', linkedUser.privyId)
          const [upgraded] = await db
            .update(users)
            .set({
              privyId: verifiedPrivyId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, linkedUser.id))
            .returning()
          console.log('[initAuthWithToken] Upgraded privyId to:', verifiedPrivyId)
          return { success: true, user: transformUserForApi(upgraded), isNewUser: false }
        }
      }

      console.log('[initAuthWithToken] No existing user found by wallet address')
    }

    if (existingUser.length > 0) {
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

        return { success: true, user: transformUserForApi(updatedUser), isNewUser: false }
      }

      return { success: true, user: transformUserForApi(user), isNewUser: false }
    }

    // New user - create entry with generated slug
    const walletLabel = formatWalletIdentifier(walletAddress)
    const baseName = name || email?.split('@')[0] || walletLabel.slugBase
    const usernameSlug = await generateUniqueSlug(baseName)
    const displayName = name || email?.split('@')[0] || walletLabel.display

    try {
      const [newUser] = await db
        .insert(users)
        .values({
          privyId: verifiedPrivyId,
          walletAddress,
          usernameSlug,
          displayName,
          avatarUrl: avatarUrl || null,
        })
        .returning()

      console.log('[initAuthWithToken] Created new user:', newUser.id, newUser.usernameSlug)
      return { success: true, user: transformUserForApi(newUser), isNewUser: true }
    } catch (insertError) {
      // Race condition: another parallel request already created this user.
      // Fall back to fetching the existing user.
      const errMsg = insertError instanceof Error ? insertError.message : ''
      if (errMsg.includes('unique') || errMsg.includes('duplicate') || errMsg.includes('violates')) {
        console.log('[initAuthWithToken] Duplicate insert detected, fetching existing user')
        const [raceUser] = await db
          .select()
          .from(users)
          .where(or(eq(users.privyId, verifiedPrivyId), eq(users.walletAddress, walletAddress)))
          .limit(1)
        if (raceUser) {
          return { success: true, user: transformUserForApi(raceUser), isNewUser: false }
        }
      }
      throw insertError
    }
  } catch (error) {
    console.error('[initAuthWithToken] Error:', error instanceof Error ? error.message : error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize user',
    }
  }
}
