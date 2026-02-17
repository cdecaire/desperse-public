/**
 * On-Chain Ownership Verification
 *
 * Verifies NFT ownership for gated downloads:
 * - Editions (Core Assets or SPL tokens): Check via DAS API first, fallback to SPL token check
 * - Collectibles (cNFTs): Check ownership via Helius DAS API
 *
 * On-chain is the source of truth for transferable NFTs.
 * DB records may become stale after trades.
 *
 * IMPORTANT: All verification failures DENY access (fail closed).
 *
 * IMPORTANT: This file uses server-only imports (@solana/web3.js, crypto)
 * and should never be imported in client-side code.
 *
 * NOTE: Migrated to use addressUtils for validation in Phase 4a.
 * Connection/PublicKey still used for SPL token fallback until full migration.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { getHeliusRpcUrl, env } from '@/config/env'
import { validateAddress } from '@/server/services/blockchain/addressUtils'
import { db } from '@/server/db'
import { purchases, collections, posts } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

// ============================================================================
// Types
// ============================================================================

export interface OwnershipCheckResult {
  isOwner: boolean
  /** The mint address or asset ID that proves ownership */
  proofMint?: string
  /** Error message if check failed */
  error?: string
}

/** DAS API asset response structure */
interface DasAssetResponse {
  id: string
  ownership: {
    owner: string
    frozen: boolean
  }
  burnt: boolean
}

// ============================================================================
// Edition Ownership (Core Assets or Legacy SPL Tokens)
// ============================================================================

/**
 * Verify that a wallet owns an edition for a given post
 *
 * Supports both:
 * - Metaplex Core Assets (new): Check via Helius DAS API
 * - Token Metadata SPL tokens (legacy): Check via SPL token account balance
 *
 * Strategy:
 * 1. Try DAS API first for each nftMint (works for Core Assets)
 * 2. If DAS finds the asset, verify ownership.owner === wallet
 * 3. If DAS doesn't find it, fall back to SPL token check (legacy)
 *
 * IMPORTANT: All failures deny access (fail closed).
 *
 * @param wallet - Wallet address to check
 * @param postId - Post ID to check ownership for
 */
export async function verifyEditionOwnership(
  wallet: string,
  postId: string,
): Promise<OwnershipCheckResult> {
  try {
    // Validate Helius API key is configured
    const apiKey = env.HELIUS_API_KEY
    if (!apiKey) {
      console.error('[verifyEditionOwnership] Helius API key not configured')
      return {
        isOwner: false,
        error: 'Helius API key not configured',
      }
    }

    // Get all nftMints for this post from confirmed purchases
    const postPurchases = await db
      .select({ nftMint: purchases.nftMint })
      .from(purchases)
      .where(
        and(
          eq(purchases.postId, postId),
          eq(purchases.status, 'confirmed'),
        )
      )

    const nftMints = postPurchases
      .map(p => p.nftMint)
      .filter((mint): mint is string => mint !== null)

    if (nftMints.length === 0) {
      return {
        isOwner: false,
        error: 'No confirmed mints found for this post',
      }
    }

    // Check if wallet owns any of the nftMints
    for (const assetAddress of nftMints) {
      // Try Core Asset check via DAS API first
      const coreResult = await verifyCoreAssetOwnership(wallet, assetAddress, apiKey)

      if (coreResult.isOwner) {
        return coreResult
      }

      // If DAS returned "not a Core asset" (null result), try legacy SPL token check
      if (coreResult.error === 'LEGACY_FALLBACK') {
        const splResult = await verifySplTokenOwnership(wallet, assetAddress)
        if (splResult.isOwner) {
          return splResult
        }
      }

      // If DAS returned an actual error (not just "not found"), log it
      if (coreResult.error && coreResult.error !== 'LEGACY_FALLBACK') {
        console.warn(`[verifyEditionOwnership] DAS check failed for ${assetAddress}: ${coreResult.error}`)
      }
    }

    return { isOwner: false }
  } catch (error) {
    console.error('[verifyEditionOwnership] Error:', error)
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'Ownership check failed',
    }
  }
}

/**
 * Verify ownership of a Core Asset via Helius DAS API
 *
 * @returns isOwner: true if wallet owns the asset
 * @returns error: 'LEGACY_FALLBACK' if asset not found in DAS (may be legacy SPL token)
 */
async function verifyCoreAssetOwnership(
  wallet: string,
  assetAddress: string,
  apiKey: string,
): Promise<OwnershipCheckResult> {
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'core-ownership-check',
        method: 'getAsset',
        params: { id: assetAddress },
      }),
    })

    if (!response.ok) {
      console.error(`[verifyCoreAssetOwnership] DAS API request failed: ${response.status} ${response.statusText}`)
      return {
        isOwner: false,
        error: `DAS API request failed: ${response.statusText}`,
      }
    }

    const data = await response.json()

    // Check for RPC error
    if (data.error) {
      // Asset not found - may be a legacy SPL token, allow fallback
      if (data.error.message?.includes('not found') || data.error.code === -32000) {
        return {
          isOwner: false,
          error: 'LEGACY_FALLBACK',
        }
      }
      console.error(`[verifyCoreAssetOwnership] DAS RPC error:`, data.error)
      return {
        isOwner: false,
        error: data.error.message || 'DAS RPC error',
      }
    }

    const asset = data.result as DasAssetResponse | null

    // No result - may be legacy, allow fallback
    if (!asset) {
      return {
        isOwner: false,
        error: 'LEGACY_FALLBACK',
      }
    }

    // Validate ownership field exists
    if (!asset.ownership || !asset.ownership.owner) {
      console.error(`[verifyCoreAssetOwnership] Asset ${assetAddress} has no ownership data`)
      return {
        isOwner: false,
        error: 'Asset ownership data missing',
      }
    }

    // Check if asset is burnt
    if (asset.burnt) {
      return {
        isOwner: false,
        error: 'Asset is burnt',
      }
    }

    // Verify ownership
    if (asset.ownership.owner.toLowerCase() === wallet.toLowerCase()) {
      console.log(`[verifyCoreAssetOwnership] Verified: wallet ${wallet.slice(0, 8)}... owns Core asset ${assetAddress.slice(0, 8)}...`)
      return {
        isOwner: true,
        proofMint: assetAddress,
      }
    }

    // Wallet doesn't own this asset
    return { isOwner: false }
  } catch (error) {
    console.error(`[verifyCoreAssetOwnership] Error checking asset ${assetAddress}:`, error)
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'Core asset check failed',
    }
  }
}

/**
 * Verify ownership of a legacy SPL token (Token Metadata edition)
 *
 * Checks if wallet has a token account with balance > 0 for the given mint.
 *
 * NOTE: Uses @solana/web3.js Connection for getTokenAccountsByOwner.
 * Address validation via addressUtils for early error detection.
 */
async function verifySplTokenOwnership(
  wallet: string,
  mintAddress: string,
): Promise<OwnershipCheckResult> {
  try {
    // Validate addresses before creating PublicKey objects
    if (!validateAddress(wallet)) {
      return {
        isOwner: false,
        error: 'Invalid wallet address',
      }
    }
    if (!validateAddress(mintAddress)) {
      return {
        isOwner: false,
        error: 'Invalid mint address',
      }
    }

    const connection = new Connection(getHeliusRpcUrl(), 'confirmed')
    const walletPubkey = new PublicKey(wallet)
    const mintPubkey = new PublicKey(mintAddress)

    // Get token accounts for this mint owned by the wallet
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey }
    )

    // Check if any account has balance > 0
    for (const { account } of tokenAccounts.value) {
      // Token account data: first 64 bytes are mint + owner, then 8 bytes for amount
      const data = account.data
      const amount = data.readBigUInt64LE(64)

      if (amount > 0n) {
        console.log(`[verifySplTokenOwnership] Verified: wallet ${wallet.slice(0, 8)}... owns SPL token ${mintAddress.slice(0, 8)}...`)
        return {
          isOwner: true,
          proofMint: mintAddress,
        }
      }
    }

    return { isOwner: false }
  } catch (error) {
    console.error(`[verifySplTokenOwnership] Error checking mint ${mintAddress}:`, error)
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'SPL token check failed',
    }
  }
}

// ============================================================================
// Collectible Ownership (cNFTs via DAS API)
// ============================================================================

/**
 * Verify that a wallet owns a cNFT collectible for a given post
 * 
 * Uses Helius DAS API to check current ownership of the compressed NFT.
 * 
 * @param wallet - Wallet address to check
 * @param postId - Post ID to check ownership for
 */
export async function verifyCnftOwnership(
  wallet: string,
  postId: string,
): Promise<OwnershipCheckResult> {
  try {
    // Get asset IDs from confirmed collections for this post
    const postCollections = await db
      .select({ nftMint: collections.nftMint })
      .from(collections)
      .where(
        and(
          eq(collections.postId, postId),
          eq(collections.status, 'confirmed'),
        )
      )

    const assetIds = postCollections
      .map(c => c.nftMint)
      .filter((id): id is string => id !== null)

    if (assetIds.length === 0) {
      return {
        isOwner: false,
        error: 'No confirmed assets found for this post',
      }
    }

    // Use Helius DAS API to check ownership
    const apiKey = env.HELIUS_API_KEY
    if (!apiKey) {
      return {
        isOwner: false,
        error: 'Helius API key not configured',
      }
    }

    // Check if wallet owns any of the assets
    for (const assetId of assetIds) {
      try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'ownership-check',
            method: 'getAsset',
            params: { id: assetId },
          }),
        })

        if (!response.ok) {
          console.warn(`[verifyCnftOwnership] DAS API request failed for asset ${assetId}:`, response.statusText)
          continue
        }

        const data = await response.json()
        const asset = data.result as DasAssetResponse | null

        if (!asset) {
          continue
        }

        // Check if asset is owned by wallet and not burnt
        if (
          asset.ownership.owner.toLowerCase() === wallet.toLowerCase() &&
          !asset.burnt
        ) {
          return {
            isOwner: true,
            proofMint: assetId,
          }
        }
      } catch (error) {
        console.warn(`[verifyCnftOwnership] Failed to check asset ${assetId}:`, error)
      }
    }

    return { isOwner: false }
  } catch (error) {
    console.error('[verifyCnftOwnership] Error:', error)
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'Ownership check failed',
    }
  }
}

// ============================================================================
// Unified Ownership Check
// ============================================================================

/**
 * Verify ownership of any NFT type for a post
 * 
 * Automatically determines the post type and checks ownership accordingly:
 * - Edition: Check SPL token ownership
 * - Collectible: Check cNFT ownership via DAS API
 * 
 * @param wallet - Wallet address to check
 * @param postId - Post ID to check ownership for
 */
export async function verifyNftOwnership(
  wallet: string,
  postId: string,
): Promise<OwnershipCheckResult> {
  try {
    // Get post type
    const [post] = await db
      .select({ type: posts.type })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        isOwner: false,
        error: 'Post not found',
      }
    }

    // Check ownership based on type
    if (post.type === 'edition') {
      return verifyEditionOwnership(wallet, postId)
    }
    
    if (post.type === 'collectible') {
      return verifyCnftOwnership(wallet, postId)
    }

    // Regular posts don't have NFT ownership
    return {
      isOwner: false,
      error: 'Post type does not support NFT ownership',
    }
  } catch (error) {
    console.error('[verifyNftOwnership] Error:', error)
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'Ownership check failed',
    }
  }
}

/**
 * Check if creator owns the post (for testing/admin access)
 */
export async function isPostCreator(
  wallet: string,
  postId: string,
): Promise<boolean> {
  try {
    const [result] = await db
      .select({ creatorWallet: posts.creatorWallet })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!result) {
      return false
    }

    return result.creatorWallet?.toLowerCase() === wallet.toLowerCase()
  } catch (error) {
    console.error('[isPostCreator] Error:', error)
    return false
  }
}

