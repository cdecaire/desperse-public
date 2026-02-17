/**
 * Download Auth Server Functions
 *
 * Handles authentication and authorization for gated asset downloads:
 * - Nonce generation for signature verification
 * - Signature verification and token issuance
 * - Token validation for downloads
 *
 * Two-step auth flow:
 * 1. POST getDownloadNonce - Generate nonce for signature
 * 2. POST verifyAndIssueToken - Verify signature + ownership → issue token
 * 3. POST validateDownloadToken - Validate token for download
 *
 * IMPORTANT: This file uses server-only imports (crypto, @solana/addresses)
 * and should never be imported in client-side code.
 *
 * NOTE: Migrated from @solana/web3.js to @solana/addresses in Phase 3.
 * Signature verification uses addressToBytes() which produces identical
 * output to the legacy PublicKey.toBytes() method.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/server/db'
import { postAssets, downloadNonces, downloadTokens } from '@/server/db/schema'
import { eq, and, lt, isNull } from 'drizzle-orm'
import { verifyNftOwnership, isPostCreator } from '@/server/services/blockchain/ownershipCheck'
import { addressToBytes } from '@/server/services/blockchain/addressUtils'
import * as ed25519 from '@noble/ed25519'
import bs58 from 'bs58'
import { randomBytes } from 'node:crypto'

// ============================================================================
// Constants
// ============================================================================

/** Nonce expiry time (5 minutes) */
const NONCE_EXPIRY_MS = 5 * 60 * 1000

/** Download token expiry time (2 minutes) */
const TOKEN_EXPIRY_MS = 2 * 60 * 1000

// ============================================================================
// Schemas
// ============================================================================

const getNonceSchema = z.object({
  assetId: z.string().uuid(),
  wallet: z.string().min(32).max(44),
})

const authRequestSchema = z.object({
  assetId: z.string().uuid(),
  wallet: z.string().min(32).max(44),
  signature: z.string(), // Base58 encoded signature
  message: z.string(), // The signed message
})

const validateTokenSchema = z.object({
  assetId: z.string().uuid(),
  token: z.string(),
})

// ============================================================================
// Nonce Generation
// ============================================================================

/**
 * Generate a nonce for download authentication
 * 
 * The nonce is single-use and expires after 5 minutes.
 * Client should include this in the message they sign.
 */
export const getDownloadNonce = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  nonce?: string
  expiresAt?: string
  message?: string
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { assetId, wallet } = getNonceSchema.parse(rawData)

    // Verify asset exists
    const [asset] = await db
      .select({ id: postAssets.id, postId: postAssets.postId, isGated: postAssets.isGated })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return { success: false, error: 'Asset not found' }
    }

    // If asset is not gated, no nonce needed
    if (!asset.isGated) {
      return { success: false, error: 'Asset is not gated' }
    }

    // Generate random nonce
    const nonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS)

    // Store nonce in database
    await db.insert(downloadNonces).values({
      nonce,
      assetId,
      wallet,
      expiresAt,
    })

    // Build the message the user should sign
    const message = buildDownloadMessage(assetId, wallet, nonce, expiresAt.toISOString())

    return {
      success: true,
      nonce,
      expiresAt: expiresAt.toISOString(),
      message,
    }
  } catch (error) {
    console.error('[getDownloadNonce] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate nonce',
    }
  }
})

/**
 * Build the message format that users must sign for download auth
 */
function buildDownloadMessage(
  assetId: string,
  wallet: string,
  nonce: string,
  expiresAt: string,
): string {
  return `desperse.app wants you to download:
Asset: ${assetId}
Wallet: ${wallet}
Nonce: ${nonce}
Expires: ${expiresAt}`
}

/**
 * Parse a signed message to extract its components
 */
function parseDownloadMessage(message: string): {
  assetId: string
  wallet: string
  nonce: string
  expiresAt: string
} | null {
  try {
    const lines = message.split('\n')
    if (lines.length < 5 || !lines[0].includes('desperse.app wants you to download')) {
      return null
    }

    const assetId = lines[1]?.replace('Asset: ', '').trim()
    const wallet = lines[2]?.replace('Wallet: ', '').trim()
    const nonce = lines[3]?.replace('Nonce: ', '').trim()
    const expiresAt = lines[4]?.replace('Expires: ', '').trim()

    if (!assetId || !wallet || !nonce || !expiresAt) {
      return null
    }

    return { assetId, wallet, nonce, expiresAt }
  } catch {
    return null
  }
}

// ============================================================================
// Signature Verification & Token Issuance
// ============================================================================

/**
 * Verify a wallet signature and issue a download token
 * 
 * This is the main auth endpoint. It:
 * 1. Verifies the message format
 * 2. Verifies the signature matches the message + wallet
 * 3. Verifies the nonce exists, not expired, not used
 * 4. Marks the nonce as used
 * 5. Verifies ON-CHAIN ownership
 * 6. Issues a short-lived download token
 */
export const verifyAndIssueToken = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  token?: string
  expiresAt?: number
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { assetId, wallet, signature, message } = authRequestSchema.parse(rawData)

    // 1. Parse and validate message format
    const parsed = parseDownloadMessage(message)
    if (!parsed) {
      return { success: false, error: 'Invalid message format' }
    }

    // Validate message fields match request
    if (parsed.assetId !== assetId || parsed.wallet !== wallet) {
      return { success: false, error: 'Message fields do not match request' }
    }

    // Check expiry from message
    const messageExpiry = new Date(parsed.expiresAt)
    if (messageExpiry < new Date()) {
      return { success: false, error: 'Message has expired' }
    }

    // 2. Verify signature
    const isValidSignature = await verifyWalletSignature(wallet, message, signature)
    if (!isValidSignature) {
      return { success: false, error: 'Invalid signature' }
    }

    // 3. Verify nonce exists, not expired, not used
    const [nonceRecord] = await db
      .select()
      .from(downloadNonces)
      .where(
        and(
          eq(downloadNonces.nonce, parsed.nonce),
          eq(downloadNonces.assetId, assetId),
          eq(downloadNonces.wallet, wallet),
          isNull(downloadNonces.usedAt),
        )
      )
      .limit(1)

    if (!nonceRecord) {
      return { success: false, error: 'Nonce not found or already used' }
    }

    if (nonceRecord.expiresAt < new Date()) {
      return { success: false, error: 'Nonce has expired' }
    }

    // 4. Mark nonce as used
    await db
      .update(downloadNonces)
      .set({ usedAt: new Date() })
      .where(eq(downloadNonces.id, nonceRecord.id))

    // 5. Get asset and post info
    const [asset] = await db
      .select({
        id: postAssets.id,
        postId: postAssets.postId,
        isGated: postAssets.isGated,
      })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return { success: false, error: 'Asset not found' }
    }

    // If asset is not gated, allow access without ownership check
    if (!asset.isGated) {
      return { success: false, error: 'Asset is not gated - no auth required' }
    }

    // 6. Verify ON-CHAIN ownership (source of truth for transferable NFTs)
    // Also allow creator access for testing
    const ownershipResult = await verifyNftOwnership(wallet, asset.postId)
    const isCreator = await isPostCreator(wallet, asset.postId)

    if (!ownershipResult.isOwner && !isCreator) {
      return {
        success: false,
        error: 'You do not own this NFT. Ownership is verified on-chain.',
      }
    }

    // 7. Issue short-lived download token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)

    await db.insert(downloadTokens).values({
      token,
      assetId,
      wallet,
      expiresAt,
    })

    return {
      success: true,
      token,
      expiresAt: expiresAt.getTime(),
    }
  } catch (error) {
    console.error('[verifyAndIssueToken] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
})

/**
 * Verify a Solana wallet signature
 * 
 * Uses ed25519 signature verification via @noble/ed25519
 */
async function verifyWalletSignature(
  wallet: string,
  message: string,
  signatureBase58: string,
): Promise<boolean> {
  try {
    // Convert wallet address to bytes using @solana/addresses
    // (Migrated from @solana/web3.js PublicKey.toBytes() - Phase 3)
    const publicKeyBytes = addressToBytes(wallet)

    // Decode the signature from base58
    const signatureBytes = bs58.decode(signatureBase58)

    // Encode the message as bytes
    const messageBytes = new TextEncoder().encode(message)

    // Verify the signature using @noble/ed25519
    return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes)
  } catch (error) {
    console.error('[verifyWalletSignature] Error:', error)
    return false
  }
}

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validate a download token
 * 
 * Called by the download endpoint to verify a token is valid before streaming.
 */
export const validateDownloadToken = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  valid?: boolean
  asset?: {
    id: string
    postId: string
    storageProvider: string
    storageKey: string
    mimeType: string
    downloadName: string | null
    fileSize: number | null
  }
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { assetId, token } = validateTokenSchema.parse(rawData)

    // Look up token
    const [tokenRecord] = await db
      .select()
      .from(downloadTokens)
      .where(
        and(
          eq(downloadTokens.token, token),
          eq(downloadTokens.assetId, assetId),
        )
      )
      .limit(1)

    if (!tokenRecord) {
      return { success: true, valid: false, error: 'Token not found' }
    }

    // Check expiry
    if (tokenRecord.expiresAt < new Date()) {
      return { success: true, valid: false, error: 'Token has expired' }
    }

    // Get asset info
    const [asset] = await db
      .select({
        id: postAssets.id,
        postId: postAssets.postId,
        storageProvider: postAssets.storageProvider,
        storageKey: postAssets.storageKey,
        mimeType: postAssets.mimeType,
        downloadName: postAssets.downloadName,
        fileSize: postAssets.fileSize,
      })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return { success: true, valid: false, error: 'Asset not found' }
    }

    // Optionally mark token as used (or allow multiple uses within TTL)
    // For now, we allow multiple uses within the TTL window
    
    return {
      success: true,
      valid: true,
      asset,
    }
  } catch (error) {
    console.error('[validateDownloadToken] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    }
  }
})

/**
 * Check if an asset is gated (requires auth for download)
 */
export const checkAssetGating = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  isGated?: boolean
  asset?: {
    id: string
    postId: string
    mimeType: string
    downloadName: string | null
  }
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { assetId } = z.object({ assetId: z.string().uuid() }).parse(rawData)

    const [asset] = await db
      .select({
        id: postAssets.id,
        postId: postAssets.postId,
        isGated: postAssets.isGated,
        mimeType: postAssets.mimeType,
        downloadName: postAssets.downloadName,
      })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return { success: false, error: 'Asset not found' }
    }

    return {
      success: true,
      isGated: asset.isGated,
      asset: {
        id: asset.id,
        postId: asset.postId,
        mimeType: asset.mimeType,
        downloadName: asset.downloadName,
      },
    }
  } catch (error) {
    console.error('[checkAssetGating] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check asset gating',
    }
  }
})

