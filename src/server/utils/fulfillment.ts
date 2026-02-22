/**
 * Fulfillment utilities for REST API endpoints
 *
 * This file contains the fulfillPurchaseDirect function that handles NFT minting
 * for edition purchases. It's extracted from server functions to avoid createServerFn
 * imports which cause postgres to leak to client bundle.
 *
 * IMPORTANT: Do NOT import from @/server/functions/* files that contain createServerFn
 */

import { db } from '@/server/db'
import { purchases, posts, users, postAssets, notifications } from '@/server/db/schema'
import { eq, and, lt, or, isNull, gt } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { uploadMetadataJson } from '@/server/storage/blob'
import { snapshotMintedMetadata } from '@/server/utils/mint-snapshot'
import type { PurchaseStatus } from './editions'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'
import { generateNftMetadata } from '@/server/utils/nft-metadata'

// Stale fulfillment claim threshold - if a claim is older than this, it can be reclaimed
const STALE_CLAIM_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

export interface FulfillPurchaseResult {
  success: boolean
  status: PurchaseStatus
  nftMint?: string
  error?: string
}

/**
 * Decrement post supply on fulfillment failure
 */
async function decrementPostSupply(postId: string) {
  await db
    .update(posts)
    .set({
      currentSupply: sql`${posts.currentSupply} - 1`,
    })
    .where(and(eq(posts.id, postId), gt(posts.currentSupply, 0)))
}

/**
 * Unified fulfillment function that handles the entire minting flow.
 *
 * This is the REST-safe version that does NOT import from @/server/functions/*
 * (except mintSnapshot.ts which is safe - no createServerFn).
 *
 * This function:
 * 1. Claims fulfillment atomically (prevents concurrent minting)
 * 2. Ensures master edition exists (with row lock to prevent duplicates)
 * 3. Mints print edition
 * 4. Finalizes purchase as confirmed
 *
 * IMPORTANT: This is the ONLY function that should perform minting for REST endpoints.
 */
export async function fulfillPurchaseDirect(purchaseId: string): Promise<FulfillPurchaseResult> {
  // TIMED EDITIONS GUARD: Do NOT check mintWindowStart/mintWindowEnd here.
  // Time was validated at buyEdition (reservation time). Valid reservations are honored
  // regardless of whether the window has since closed.
  const fulfillmentKey = crypto.randomUUID()
  const now = new Date()
  const staleCutoff = new Date(Date.now() - STALE_CLAIM_THRESHOLD_MS)

  console.log(`[fulfillPurchaseDirect] Starting fulfillment for purchase ${purchaseId}, key=${fulfillmentKey.slice(0, 8)}`)

  // Step 1: Atomically claim fulfillment
  // Only succeeds if no active claim exists (or existing claim is stale)
  const claimResult = await db
    .update(purchases)
    .set({
      fulfillmentKey,
      fulfillmentClaimedAt: now,
      mintingStartedAt: now,
      status: 'minting',
    })
    .where(
      and(
        eq(purchases.id, purchaseId),
        or(
          // No existing claim
          isNull(purchases.fulfillmentKey),
          // Or existing claim is stale
          lt(purchases.fulfillmentClaimedAt, staleCutoff)
        ),
        // Only claim if in a state that allows fulfillment
        or(
          eq(purchases.status, 'awaiting_fulfillment'),
          eq(purchases.status, 'master_created'),
          // Allow reclaiming stale minting
          and(
            eq(purchases.status, 'minting'),
            lt(purchases.fulfillmentClaimedAt, staleCutoff)
          ),
          // Allow recovering orphaned 'confirmed' status with no nftMint
          and(
            eq(purchases.status, 'confirmed'),
            isNull(purchases.nftMint)
          )
        )
      )
    )
    .returning({ id: purchases.id })

  if (claimResult.length === 0) {
    // Failed to acquire claim - either another process has it, or purchase is in wrong state
    console.log(`[fulfillPurchaseDirect] Failed to acquire claim for ${purchaseId}, checking current state`)

    const [currentPurchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1)

    if (!currentPurchase) {
      return { success: false, status: 'failed', error: 'Purchase not found' }
    }

    // If already confirmed with nftMint, return success
    if (currentPurchase.status === 'confirmed' && currentPurchase.nftMint) {
      return { success: true, status: 'confirmed', nftMint: currentPurchase.nftMint }
    }

    // If confirmed but no nftMint (orphaned state), reset to awaiting_fulfillment and retry
    if (currentPurchase.status === 'confirmed' && !currentPurchase.nftMint) {
      console.log(`[fulfillPurchaseDirect] Found orphaned confirmed status for ${purchaseId}, resetting to awaiting_fulfillment`)
      await db
        .update(purchases)
        .set({
          status: 'awaiting_fulfillment',
          fulfillmentKey: null,
          fulfillmentClaimedAt: null,
        })
        .where(eq(purchases.id, purchaseId))
      // Return a retryable status
      return { success: false, status: 'awaiting_fulfillment', error: 'Purchase state recovered, please retry' }
    }

    // If minting is in progress (not stale), let caller know
    if (currentPurchase.status === 'minting') {
      return { success: false, status: 'minting', error: 'Minting already in progress' }
    }

    // Otherwise, return current status
    return { success: false, status: currentPurchase.status as PurchaseStatus, error: 'Could not acquire fulfillment lock' }
  }

  console.log(`[fulfillPurchaseDirect] Claim acquired for ${purchaseId}`)

  // Step 2: Get purchase and post details
  const [purchaseData] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, purchaseId))
    .limit(1)

  if (!purchaseData) {
    return { success: false, status: 'failed', error: 'Purchase not found after claim' }
  }

  try {
    // Get post and user data
    const [postData] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1)

    if (!postData) {
      throw new Error('Post not found')
    }

    const [buyerData] = await db
      .select()
      .from(users)
      .where(eq(users.id, purchaseData.userId))
      .limit(1)

    if (!buyerData || !buyerData.walletAddress) {
      throw new Error('Buyer wallet not found')
    }

    const [creatorData] = await db
      .select()
      .from(users)
      .where(eq(users.id, postData.userId))
      .limit(1)

    // Use the wallet that actually paid (stored at purchase time), fallback to legacy field
    const buyer = purchaseData.buyerWalletAddress || buyerData.walletAddress
    const creatorWallet = postData.creatorWallet || creatorData?.walletAddress

    if (!creatorWallet) {
      throw new Error('Creator wallet not found')
    }

    // Get asset info for protected download URL
    const [assetResult] = await db
      .select({ id: postAssets.id, isGated: postAssets.isGated })
      .from(postAssets)
      .where(eq(postAssets.postId, purchaseData.postId))
      .limit(1)

    // Resolve metadata URI
    let resolvedMetadataUri = postData.metadataUrl
    if (!resolvedMetadataUri && creatorData) {
      const metadata = generateNftMetadata(
        {
          id: postData.id,
          caption: postData.caption,
          mediaUrl: postData.mediaUrl,
          coverUrl: postData.coverUrl,
          type: postData.type as 'collectible' | 'edition',
          maxSupply: postData.maxSupply,
          price: postData.price,
          currency: postData.currency,
          nftName: postData.nftName,
          nftSymbol: postData.nftSymbol,
          nftDescription: postData.nftDescription,
          sellerFeeBasisPoints: postData.sellerFeeBasisPoints,
          isMutable: postData.isMutable,
          protectDownload: assetResult?.isGated ?? false,
          assetId: assetResult?.id,
        },
        creatorData
      )

      const metadataUpload = await uploadMetadataJson(metadata, postData.id)
      if (!metadataUpload.success) {
        throw new Error('Failed to upload metadata')
      }
      resolvedMetadataUri = metadataUpload.url

      await db
        .update(posts)
        .set({ metadataUrl: metadataUpload.url })
        .where(eq(posts.id, postData.id))
    }

    if (!resolvedMetadataUri) {
      throw new Error('Missing metadata URL')
    }

    const name = postData.nftName?.trim() || `Edition #${postData.id.slice(0, 8)}`

    // =========================================================================
    // METAPLEX CORE MINTING (cheaper than Token Metadata)
    // - Collection with MasterEdition plugin = "master"
    // - Asset with Edition plugin = "print"
    // Cost: ~0.0029 SOL per mint vs ~0.022 SOL with Token Metadata
    // =========================================================================

    // Dynamic import to avoid pulling Umi/mpl-core into client bundle
    const { createCoreCollection, createCoreEdition } = await import(
      '@/server/services/blockchain/editions/coreFulfillmentBuilder'
    )

    // Step 3: Ensure collection exists (first purchase creates it)
    // masterMint column now stores the Core collection address
    let collectionAddress: string | null = null

    // Check if collection already exists
    const [postCheck] = await db
      .select({ masterMint: posts.masterMint, currentSupply: posts.currentSupply })
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1)

    if (postCheck?.masterMint) {
      // Collection exists, use it
      collectionAddress = postCheck.masterMint
      console.log(`[fulfillPurchaseDirect] Using existing Core collection: ${collectionAddress}`)
    } else {
      // Collection doesn't exist - create it (first purchase)
      console.log(`[fulfillPurchaseDirect] No collection found, creating Core collection`)

      try {
        const collectionResult = await createCoreCollection({
          creator: creatorWallet,
          metadataUri: resolvedMetadataUri,
          name,
          maxSupply: postData.maxSupply ?? null,
          sellerFeeBasisPoints: postData.sellerFeeBasisPoints ?? 0,
        })

        console.log(`[fulfillPurchaseDirect] Core collection created: ${collectionResult.collectionAddress}`)

        // Atomically persist collection address - only succeeds if still null
        const persistResult = await db
          .update(posts)
          .set({ masterMint: collectionResult.collectionAddress })
          .where(
            and(
              eq(posts.id, purchaseData.postId),
              isNull(posts.masterMint)
            )
          )
          .returning({ masterMint: posts.masterMint })

        if (persistResult.length > 0) {
          // We won the race - use our collection
          collectionAddress = collectionResult.collectionAddress
          console.log(`[fulfillPurchaseDirect] Collection persisted: ${collectionAddress}`)

          // Update purchase with collection creation details
          await db
            .update(purchases)
            .set({
              status: 'master_created',
              masterTxSignature: collectionResult.signature,
            })
            .where(eq(purchases.id, purchaseId))
        } else {
          // Another process already persisted a collection
          const [updatedPost] = await db
            .select({ masterMint: posts.masterMint })
            .from(posts)
            .where(eq(posts.id, purchaseData.postId))
            .limit(1)

          if (updatedPost?.masterMint) {
            console.log(`[fulfillPurchaseDirect] Collection was created by another process: ${updatedPost.masterMint}`)
            collectionAddress = updatedPost.masterMint
          } else {
            throw new Error('Failed to persist collection and no collection found')
          }
        }
      } catch (collectionError) {
        console.error(`[fulfillPurchaseDirect] Error creating collection:`, collectionError)
        throw collectionError
      }
    }

    // Step 4: Create edition asset
    if (!collectionAddress) {
      throw new Error('Collection address not available')
    }

    // Edition number = currentSupply + 1 (before this purchase incremented it)
    // Note: currentSupply was incremented in buyEdition, so we use it directly
    const editionNumber = (postCheck?.currentSupply ?? 0)

    console.log(`[fulfillPurchaseDirect] Creating Core edition #${editionNumber} from collection ${collectionAddress}`)

    const editionResult = await createCoreEdition({
      buyer,
      creator: creatorWallet,
      collectionAddress,
      metadataUri: resolvedMetadataUri,
      name,
      editionNumber,
    })

    console.log(`[fulfillPurchaseDirect] Core edition created: ${editionResult.assetAddress}`)

    // Step 5: Finalize purchase
    await db
      .update(purchases)
      .set({
        status: 'confirmed',
        nftMint: editionResult.assetAddress,
        printTxSignature: editionResult.signature,
        mintConfirmedAt: new Date(),
        // Clear fulfillment claim
        fulfillmentKey: null,
        fulfillmentClaimedAt: null,
      })
      .where(eq(purchases.id, purchaseId))

    // Snapshot minted metadata (non-critical)
    try {
      await snapshotMintedMetadata({
        postId: purchaseData.postId,
        txSignature: editionResult.signature,
      })
    } catch (snapshotError) {
      console.warn('[fulfillPurchaseDirect] Failed to snapshot metadata:', snapshotError instanceof Error ? snapshotError.message : 'Unknown error')
    }

    // Create notification for post owner (if buyer is not the owner) (non-critical)
    if (postData.userId !== purchaseData.userId) {
      try {
        await db.insert(notifications).values({
          userId: postData.userId,
          actorId: purchaseData.userId,
          type: 'purchase',
          referenceType: 'post',
          referenceId: purchaseData.postId,
        })
      } catch (notifError) {
        console.warn('[fulfillPurchaseDirect] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error')
      }

      // Dispatch push notification (awaited for serverless compatibility)
      try {
        const actorName = await getActorDisplayName(purchaseData.userId)
        await sendPushNotification(postData.userId, {
          type: 'purchase',
          title: `${actorName} purchased your edition`,
          body: '',
          deepLink: `https://desperse.com/p/${purchaseData.postId}`,
        })
      } catch (pushErr) {
        console.warn('[fulfillment] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
      }
    }

    console.log(`[fulfillPurchaseDirect] Purchase ${purchaseId} fulfilled successfully, asset: ${editionResult.assetAddress}`)

    return {
      success: true,
      status: 'confirmed',
      nftMint: editionResult.assetAddress,
    }

  } catch (error) {
    console.error(`[fulfillPurchaseDirect] Error fulfilling purchase ${purchaseId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if this is a retryable error
    const isRetryable =
      errorMessage.includes('expired') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('block height') ||
      errorMessage.includes('not found') || // RPC propagation delay
      errorMessage.includes('AccountNotFoundError') // Collection not found yet

    // Check if master was created
    const [postCheck] = await db
      .select({ masterMint: posts.masterMint })
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1)

    if (isRetryable) {
      // Reset to appropriate status for retry
      const retryStatus = postCheck?.masterMint ? 'master_created' : 'awaiting_fulfillment'
      await db
        .update(purchases)
        .set({
          status: retryStatus,
          fulfillmentKey: null,
          fulfillmentClaimedAt: null,
        })
        .where(eq(purchases.id, purchaseId))

      return {
        success: false,
        status: retryStatus,
        error: `Retryable error: ${errorMessage}`,
      }
    }

    // Non-retryable error - mark as failed
    await db
      .update(purchases)
      .set({
        status: 'failed',
        failedAt: new Date(),
        fulfillmentKey: null,
        fulfillmentClaimedAt: null,
      })
      .where(eq(purchases.id, purchaseId))

    // Release reserved supply
    await decrementPostSupply(purchaseData.postId)

    return {
      success: false,
      status: 'failed',
      error: errorMessage,
    }
  }
}
