/**
 * Sign In With Solana (SIWS) Authentication Utilities
 *
 * Provides challenge generation, signature verification, user management,
 * and session token handling for wallet-based authentication via MWA.
 *
 * IMPORTANT: Do NOT import from files containing createServerFn.
 * Safe imports: @/server/db, @/server/auth, @/server/services/blockchain/*
 */

import { db } from '@/server/db'
import { users, userWallets } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes, createHmac } from 'node:crypto'
import * as ed25519 from '@noble/ed25519'
import { addressToBytes, validateAddress } from '@/server/services/blockchain/addressUtils'
import { generateUniqueSlug } from '@/server/utils/slug-utils'
import { getPrivyClient, type AuthenticatedUser } from '@/server/auth'

// ============================================================================
// Constants
// ============================================================================

/** Nonce expiry time (5 minutes) */
const NONCE_EXPIRY_MS = 5 * 60 * 1000

/** Session token expiry time (7 days) */
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/** HMAC secret for signing session tokens. Required — no fallback. */
const SESSION_SECRET = (() => {
  const secret = process.env.SIWS_SESSION_SECRET
  if (!secret) {
    throw new Error('SIWS_SESSION_SECRET environment variable is required. Generate one with: openssl rand -hex 32')
  }
  return secret
})()

/** Nonce cleanup interval (60 seconds) */
const NONCE_CLEANUP_INTERVAL_MS = 60 * 1000

// ============================================================================
// Types
// ============================================================================

interface StoredNonce {
  nonce: string
  walletAddress: string
  expiresAt: number
}

export interface SiwsChallengeResult {
  success: boolean
  message?: string
  nonce?: string
  error?: string
}

export interface SiwsVerifyResult {
  success: boolean
  valid?: boolean
  error?: string
}

export interface FindOrCreateUserResult {
  success: boolean
  user?: {
    id: string
    displayName: string | null
    slug: string
    avatarUrl: string | null
    walletAddress: string
  }
  isNew?: boolean
  error?: string
}

export interface SessionTokenResult {
  success: boolean
  token?: string
  error?: string
}

// ============================================================================
// In-Memory Stores
// ============================================================================

/** In-memory nonce store: walletAddress -> StoredNonce */
const nonceStore = new Map<string, StoredNonce>()

// Periodic cleanup of expired nonces
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of nonceStore) {
    if (val.expiresAt < now) {
      nonceStore.delete(key)
    }
  }
}, NONCE_CLEANUP_INTERVAL_MS)

// ============================================================================
// Challenge Generation
// ============================================================================

/**
 * Generate a SIWS challenge message and nonce for the given wallet address.
 *
 * The message follows a human-readable format similar to SIWE (Sign In With Ethereum):
 * - Domain identification
 * - Wallet address
 * - Nonce for replay protection
 * - Issued-at timestamp
 *
 * Nonces are stored in memory with a 5 minute TTL, keyed by wallet address.
 * Only one active challenge per wallet address at a time.
 */
export function generateSiwsChallenge(walletAddress: string): SiwsChallengeResult {
  try {
    if (!walletAddress || !validateAddress(walletAddress)) {
      return { success: false, error: 'Invalid wallet address' }
    }

    const nonce = randomBytes(32).toString('hex')
    const issuedAt = new Date().toISOString()

    const message = [
      'Desperse wants you to sign in with your Solana account:',
      walletAddress,
      '',
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n')

    // Store nonce (overwrites any previous challenge for this wallet)
    nonceStore.set(walletAddress, {
      nonce,
      walletAddress,
      expiresAt: Date.now() + NONCE_EXPIRY_MS,
    })

    return { success: true, message, nonce }
  } catch (error) {
    console.error('[generateSiwsChallenge] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate challenge',
    }
  }
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify a SIWS signature.
 *
 * Steps:
 * 1. Extract nonce from the signed message
 * 2. Validate nonce exists in store and hasn't expired
 * 3. Verify ed25519 signature against the message using the wallet's public key
 * 4. Delete nonce from store (single-use)
 *
 * Accepts signatures in Base64 (Android MWA) or Base58 (web) encoding.
 */
export async function verifySiwsSignature(params: {
  walletAddress: string
  signature: string
  message: string
}): Promise<SiwsVerifyResult> {
  const { walletAddress, signature, message } = params

  try {
    // 1. Validate wallet address
    if (!walletAddress || !validateAddress(walletAddress)) {
      return { success: false, valid: false, error: 'Invalid wallet address' }
    }

    // 2. Extract nonce from the message
    const nonce = extractNonceFromMessage(message)
    if (!nonce) {
      return { success: false, valid: false, error: 'Could not extract nonce from message' }
    }

    // 3. Check nonce exists and hasn't expired
    const storedNonce = nonceStore.get(walletAddress)
    if (!storedNonce) {
      return { success: false, valid: false, error: 'No pending challenge for this wallet. Request a new challenge.' }
    }

    if (storedNonce.nonce !== nonce) {
      return { success: false, valid: false, error: 'Nonce mismatch. Request a new challenge.' }
    }

    if (storedNonce.expiresAt < Date.now()) {
      nonceStore.delete(walletAddress)
      return { success: false, valid: false, error: 'Challenge expired. Request a new challenge.' }
    }

    // 4. Verify the ed25519 signature
    const isValid = await verifyWalletSignature(walletAddress, message, signature)
    if (!isValid) {
      return { success: false, valid: false, error: 'Invalid signature' }
    }

    // 5. Delete nonce (single-use)
    nonceStore.delete(walletAddress)

    return { success: true, valid: true }
  } catch (error) {
    console.error('[verifySiwsSignature] Error:', error)
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Signature verification failed',
    }
  }
}

// ============================================================================
// User Management
// ============================================================================

interface EnsurePrivyUserResult {
  privyId: string
  embeddedWalletAddress: string | null
}

/**
 * Extract the Privy-managed embedded Solana wallet address from a Privy user's linked accounts.
 */
function extractEmbeddedSolanaWallet(linkedAccounts: Array<{ type: string; walletClientType?: string; chainType?: string; address?: string }>): string | null {
  const embedded = linkedAccounts.find(
    (a) => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'solana' && a.address,
  )
  return embedded?.address ?? null
}

/**
 * Ensure a Privy user exists for this wallet address.
 *
 * Checks if Privy already has a user with this wallet, and if not,
 * imports one via the server API. Returns the real Privy user ID
 * and the embedded Solana wallet address (if Privy created one).
 *
 * This runs as a best-effort operation - if it fails, we fall back
 * to the synthetic privyId so login isn't blocked.
 */
async function ensurePrivyUser(walletAddress: string): Promise<EnsurePrivyUserResult | null> {
  try {
    const privy = getPrivyClient()

    // Check if Privy already has a user with this wallet
    const existingUser = await privy.getUserByWalletAddress(walletAddress)
    if (existingUser) {
      console.log(`[ensurePrivyUser] Found existing Privy user: ${existingUser.id}`)
      const embeddedWalletAddress = extractEmbeddedSolanaWallet(existingUser.linkedAccounts as any[])
      return { privyId: existingUser.id, embeddedWalletAddress }
    }

    // Create a new Privy user with this Solana wallet linked + embedded wallet
    const newUser = await privy.importUser({
      linkedAccounts: [
        {
          type: 'wallet',
          address: walletAddress,
          chainType: 'solana',
        },
      ],
      createSolanaWallet: true,
      createEthereumWallet: false,
      createEthereumSmartWallet: false,
    })

    const embeddedWalletAddress = extractEmbeddedSolanaWallet(newUser.linkedAccounts as any[])
    console.log(`[ensurePrivyUser] Created Privy user: ${newUser.id} for wallet ${walletAddress.slice(0, 8)}... embedded=${embeddedWalletAddress?.slice(0, 8) ?? 'none'}`)
    return { privyId: newUser.id, embeddedWalletAddress }
  } catch (error) {
    console.warn('[ensurePrivyUser] Failed (non-blocking):', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Upgrade a user's synthetic privyId to a real one if needed,
 * and register the embedded wallet if it exists.
 */
async function upgradeSyntheticPrivyId(userId: string, walletAddress: string): Promise<void> {
  try {
    // Check if current privyId is synthetic
    const [user] = await db
      .select({ privyId: users.privyId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || !user.privyId.startsWith('siws:')) {
      return // Already has a real privyId
    }

    const result = await ensurePrivyUser(walletAddress)
    if (result) {
      await db
        .update(users)
        .set({ privyId: result.privyId, updatedAt: new Date() })
        .where(eq(users.id, userId))
      console.log(`[upgradeSyntheticPrivyId] Upgraded user ${userId} from synthetic to real privyId: ${result.privyId}`)

      // Register embedded wallet if Privy created one
      if (result.embeddedWalletAddress) {
        await insertEmbeddedWallet(userId, result.embeddedWalletAddress)
      }
    }
  } catch (error) {
    console.warn('[upgradeSyntheticPrivyId] Failed (non-blocking):', error instanceof Error ? error.message : error)
  }
}

/**
 * Find an existing user by wallet address or create a new one.
 *
 * Lookup order:
 * 1. Check userWallets table for this address
 * 2. Check users table walletAddress field (legacy/Privy users)
 * 3. If not found, create new user (with real Privy ID if possible)
 *
 * Also upgrades existing users from synthetic privyId to real Privy ID
 * as a background operation.
 */
export async function findOrCreateWalletUser(walletAddress: string, walletName?: string): Promise<FindOrCreateUserResult> {
  try {
    // 1. Check userWallets table
    const [walletRecord] = await db
      .select({
        userId: userWallets.userId,
        id: userWallets.id,
        label: userWallets.label,
      })
      .from(userWallets)
      .where(eq(userWallets.address, walletAddress))
      .limit(1)

    if (walletRecord) {
      // Update label if we now know the wallet name and it wasn't set before
      if (walletName && !walletRecord.label) {
        try {
          await db.update(userWallets)
            .set({ label: walletName })
            .where(eq(userWallets.id, walletRecord.id))
          console.log(`[findOrCreateWalletUser] Updated wallet label to "${walletName}" for wallet ${walletRecord.id}`)
        } catch (e) {
          console.warn('[findOrCreateWalletUser] Failed to update wallet label:', e instanceof Error ? e.message : e)
        }
      }

      const [user] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .where(eq(users.id, walletRecord.userId))
        .limit(1)

      if (user) {
        // Best-effort: upgrade synthetic privyId and backfill embedded wallet
        upgradeSyntheticPrivyId(user.id, walletAddress).catch(() => {})
        ensureEmbeddedWalletRegistered(user.id, walletAddress).catch(() => {})

        return {
          success: true,
          user: {
            id: user.id,
            displayName: user.displayName,
            slug: user.usernameSlug,
            avatarUrl: user.avatarUrl,
            walletAddress: user.walletAddress,
          },
          isNew: false,
        }
      }
    }

    // 2. Check users table walletAddress field (legacy Privy users)
    const [legacyUser] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        usernameSlug: users.usernameSlug,
        avatarUrl: users.avatarUrl,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1)

    if (legacyUser) {
      // Add to userWallets table for future lookups
      try {
        await db.insert(userWallets).values({
          userId: legacyUser.id,
          address: walletAddress,
          type: 'external',
          connector: 'mwa',
          label: walletName || 'External Wallet',
          isPrimary: false,
        })
      } catch (insertError) {
        // Ignore duplicate key errors - wallet may already be in userWallets
        const errMsg = insertError instanceof Error ? insertError.message : ''
        if (!errMsg.includes('unique') && !errMsg.includes('duplicate')) {
          console.warn('[findOrCreateWalletUser] Failed to add legacy wallet to userWallets:', errMsg)
        }
      }

      // Best-effort: upgrade synthetic privyId and backfill embedded wallet
      upgradeSyntheticPrivyId(legacyUser.id, walletAddress).catch(() => {})
      ensureEmbeddedWalletRegistered(legacyUser.id, walletAddress).catch(() => {})

      return {
        success: true,
        user: {
          id: legacyUser.id,
          displayName: legacyUser.displayName,
          slug: legacyUser.usernameSlug,
          avatarUrl: legacyUser.avatarUrl,
          walletAddress: legacyUser.walletAddress,
        },
        isNew: false,
      }
    }

    // 3. Not found - create new user
    const prefix = walletAddress.slice(0, 4)
    const suffix = walletAddress.slice(-4)
    const abbreviated = `${prefix}...${suffix}`
    const slugBase = `${prefix}-${suffix}`.toLowerCase()

    const usernameSlug = await generateUniqueSlug(slugBase)

    // Try to create a real Privy user, fall back to synthetic if it fails
    const privyResult = await ensurePrivyUser(walletAddress)
    const privyId = privyResult?.privyId ?? `siws:${walletAddress}`

    const [newUser] = await db
      .insert(users)
      .values({
        privyId,
        walletAddress,
        usernameSlug,
        displayName: abbreviated,
      })
      .returning({
        id: users.id,
        displayName: users.displayName,
        usernameSlug: users.usernameSlug,
        avatarUrl: users.avatarUrl,
        walletAddress: users.walletAddress,
      })

    if (!newUser) {
      return { success: false, error: 'Failed to create user' }
    }

    // Add MWA wallet to userWallets table
    try {
      await db.insert(userWallets).values({
        userId: newUser.id,
        address: walletAddress,
        type: 'external',
        connector: 'mwa',
        label: walletName || 'External Wallet',
        isPrimary: true,
      })
    } catch (walletInsertError) {
      const errMsg = walletInsertError instanceof Error ? walletInsertError.message : ''
      if (!errMsg.includes('unique') && !errMsg.includes('duplicate')) {
        console.warn('[findOrCreateWalletUser] Failed to create userWallet entry:', errMsg)
      }
    }

    // Add Privy embedded wallet if one was created
    if (privyResult?.embeddedWalletAddress) {
      await insertEmbeddedWallet(newUser.id, privyResult.embeddedWalletAddress)
    }

    console.log(`[findOrCreateWalletUser] Created new SIWS user: ${newUser.id} (${usernameSlug}) privyId=${privyId.startsWith('did:') ? privyId : 'synthetic'}`)

    return {
      success: true,
      user: {
        id: newUser.id,
        displayName: newUser.displayName,
        slug: newUser.usernameSlug,
        avatarUrl: newUser.avatarUrl,
        walletAddress: newUser.walletAddress,
      },
      isNew: true,
    }
  } catch (error) {
    console.error('[findOrCreateWalletUser] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find or create user',
    }
  }
}

/**
 * Ensure an existing user has their Privy embedded wallet registered.
 * Checks userWallets for an existing embedded entry; if missing, looks up
 * the Privy user and registers the embedded wallet.
 */
async function ensureEmbeddedWalletRegistered(userId: string, mwaWalletAddress: string): Promise<void> {
  try {
    // Check if user already has an embedded wallet registered
    const [existing] = await db
      .select({ id: userWallets.id })
      .from(userWallets)
      .where(and(eq(userWallets.userId, userId), eq(userWallets.type, 'embedded')))
      .limit(1)

    if (existing) return // Already registered

    // Look up Privy user to find embedded wallet
    const privy = getPrivyClient()
    const privyUser = await privy.getUserByWalletAddress(mwaWalletAddress)
    if (!privyUser) return

    const embeddedAddress = extractEmbeddedSolanaWallet(privyUser.linkedAccounts as any[])
    if (embeddedAddress) {
      await insertEmbeddedWallet(userId, embeddedAddress)
    }
  } catch (error) {
    console.warn('[ensureEmbeddedWalletRegistered] Failed (non-blocking):', error instanceof Error ? error.message : error)
  }
}

/**
 * Insert a Privy embedded wallet into the userWallets table.
 * Silently ignores duplicates.
 */
async function insertEmbeddedWallet(userId: string, embeddedAddress: string): Promise<void> {
  try {
    await db.insert(userWallets).values({
      userId,
      address: embeddedAddress,
      type: 'embedded',
      connector: 'privy',
      label: 'Desperse Wallet',
      isPrimary: false,
    })
    console.log(`[insertEmbeddedWallet] Registered embedded wallet ${embeddedAddress.slice(0, 8)}... for user ${userId}`)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : ''
    if (!errMsg.includes('unique') && !errMsg.includes('duplicate')) {
      console.warn('[insertEmbeddedWallet] Failed:', errMsg)
    }
  }
}

// ============================================================================
// Session Token Management
// ============================================================================

/**
 * Generate a session token for authenticated SIWS users.
 *
 * Creates a self-contained HMAC-signed token that encodes the userId,
 * walletAddress, and expiry. No server-side storage required, so tokens
 * work across Vercel serverless function instances.
 *
 * Format: siws_<base64url(payload)>.<hmac-hex>
 */
export function generateSessionToken(userId: string, walletAddress: string): string {
  const payload = JSON.stringify({
    userId,
    walletAddress,
    exp: Date.now() + SESSION_EXPIRY_MS,
  })
  const encoded = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
  return `siws_${encoded}.${sig}`
}

/**
 * Validate a SIWS session token.
 *
 * Verifies the HMAC signature and checks expiry. Self-contained validation
 * with no server-side state lookup required.
 *
 * Returns the associated userId and walletAddress if valid, or null if
 * the token is invalid, tampered, or expired.
 */
export function validateSessionToken(token: string): { userId: string; walletAddress: string } | null {
  try {
    // Strip siws_ prefix
    const stripped = token.startsWith('siws_') ? token.slice(5) : token
    const dotIndex = stripped.lastIndexOf('.')
    if (dotIndex === -1) return null

    const encoded = stripped.slice(0, dotIndex)
    const sig = stripped.slice(dotIndex + 1)
    if (!encoded || !sig) return null

    // Decode and verify signature
    const payload = Buffer.from(encoded, 'base64url').toString()
    const expectedSig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')

    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expectedSig.length) return null
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (!sigBuf.equals(expectedBuf)) return null

    const data = JSON.parse(payload)
    if (!data.userId || !data.walletAddress || !data.exp) return null
    if (data.exp < Date.now()) return null

    return { userId: data.userId, walletAddress: data.walletAddress }
  } catch {
    return null
  }
}

/**
 * Authenticate a SIWS session token and return an AuthenticatedUser.
 *
 * This is called by the updated authenticateWithToken() in auth.ts
 * as a fallback when Privy token verification fails.
 */
export async function authenticateWithSiwsToken(token: string): Promise<AuthenticatedUser | null> {
  const session = validateSessionToken(token)
  if (!session) {
    return null
  }

  // Look up the user to get their privyId
  const [user] = await db
    .select({
      id: users.id,
      privyId: users.privyId,
      walletAddress: users.walletAddress,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  if (!user) {
    return null
  }

  return {
    privyId: user.privyId,
    userId: user.id,
    walletAddress: user.walletAddress || session.walletAddress,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract the nonce from a SIWS message.
 */
function extractNonceFromMessage(message: string): string | null {
  try {
    const lines = message.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('Nonce: ')) {
        return trimmed.replace('Nonce: ', '').trim()
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Verify a Solana wallet signature using ed25519.
 *
 * Accepts signatures in either Base58 (web) or Base64 (Android MWA) encoding.
 * Detection: Base64 contains +, /, or = which are not valid Base58 characters.
 */
async function verifyWalletSignature(
  wallet: string,
  message: string,
  signatureEncoded: string,
): Promise<boolean> {
  try {
    const publicKeyBytes = addressToBytes(wallet)

    // Detect encoding: Base64 uses +, /, = which are not in the Base58 alphabet
    const isBase64 = /[+/=]/.test(signatureEncoded)

    let signatureBytes: Uint8Array
    if (isBase64) {
      signatureBytes = new Uint8Array(Buffer.from(signatureEncoded, 'base64'))
    } else {
      // Dynamically import bs58 to keep import clean
      const bs58 = await import('bs58')
      signatureBytes = bs58.default.decode(signatureEncoded)
    }

    const messageBytes = new TextEncoder().encode(message)
    return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes)
  } catch (error) {
    console.error('[verifyWalletSignature] Error:', error)
    return false
  }
}
