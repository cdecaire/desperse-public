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
import { snapshotMintedMetadata } from '@/server/functions/mintSnapshot'
import type { PurchaseStatus } from './editions'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'

// Stale fulfillment claim threshold - if a claim is older than this, it can be reclaimed
const STALE_CLAIM_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

export interface FulfillPurchaseResult {
  success: boolean
  status: PurchaseStatus
  nftMint?: string
  error?: string
}

// Type for categories (copied from posts.ts)
interface Category {
  value: string
  display: string
}

/**
 * Generate NFT metadata for a post
 *
 * Copied from @/server/functions/posts.ts to avoid importing createServerFn
 * This is a pure function with no external dependencies
 */
export function generateNftMetadata(post: {
  id: string
  caption: string | null
  mediaUrl: string
  coverUrl: string | null
  type: 'collectible' | 'edition'
  maxSupply: number | null
  price: number | null
  currency: 'SOL' | 'USDC' | null
  nftName?: string | null
  nftSymbol?: string | null
  nftDescription?: string | null
  sellerFeeBasisPoints?: number | null
  isMutable?: boolean | null
  categories?: Category[] | null
  protectDownload?: boolean
  assetId?: string
  // Multi-asset support (Phase 2 & 3)
  // For editions, include assetId and isPreviewable so gated downloads use API endpoints
  assets?: Array<{ id: string; url: string; mimeType: string; isPreviewable: boolean }>
}, creator: {
  displayName: string | null
  usernameSlug: string
  walletAddress: string
}) {
  // Infer MIME type from file extension
  const inferMimeType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      // Videos
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      // 3D Models
      'glb': 'model/gltf-binary',
      'gltf': 'model/gltf+json',
      // Documents
      'pdf': 'application/pdf',
    }
    return typeMap[extension || ''] || 'application/octet-stream'
  }

  // Helper to check if MIME type is image
  const isImageMime = (mime: string) => mime.startsWith('image/')
  // Helper to check if MIME type is video/audio (animation)
  const isAnimationMime = (mime: string) => mime.startsWith('video/') || mime.startsWith('audio/')

  // Derive category from media type
  const deriveCategory = (url: string): string => {
    const mime = inferMimeType(url)
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('model/') || url.endsWith('.glb') || url.endsWith('.gltf')) return 'vr'
    return 'image' // fallback
  }

  // Name: nftName or safe fallback (caption is content-only, not used for metadata)
  const name = post.nftName?.trim() || (post.type === 'collectible' ? `Collectible #${post.id.slice(0, 8)}` : `Edition #${post.id.slice(0, 8)}`)

  // Symbol precedence: nftSymbol -> default
  const symbol = post.nftSymbol?.trim() || 'DSPRS'

  // Description: nftDescription or caption (caption is what's used on-chain)
  const description = post.nftDescription?.trim() || post.caption?.trim() || ''

  // Handle multi-asset vs single-asset
  const hasMultipleAssets = post.assets && post.assets.length > 1

  let imageUrl: string
  let animationUrl: string | undefined
  let files: Array<{ uri: string; type: string }>
  let category: string

  if (hasMultipleAssets && post.assets) {
    // Multi-asset mode: build files from all assets
    // Find first image and first video/audio for image and animation_url
    const firstImage = post.assets.find(a => isImageMime(a.mimeType))
    const firstAnimation = post.assets.find(a => isAnimationMime(a.mimeType))

    // image: first image asset, or coverUrl if provided, or first asset
    imageUrl = post.coverUrl || firstImage?.url || post.assets[0].url

    // animation_url: first video/audio if present
    animationUrl = firstAnimation?.url

    // Build files array from all assets
    // For editions with protectDownload, non-previewable assets use API endpoint URLs
    files = post.assets.map(asset => {
      // For non-previewable assets (downloads) on editions with protectDownload, use API endpoint
      if (post.protectDownload && !asset.isPreviewable && asset.id) {
        return {
          uri: `https://www.desperse.com/api/assets/${asset.id}`,
          type: asset.mimeType,
        }
      }
      // Previewable assets (images, videos) use direct URLs
      return {
        uri: asset.url,
        type: asset.mimeType,
      }
    })

    // Add cover to files if present and not already in assets
    if (post.coverUrl && !post.assets.some(a => a.url === post.coverUrl)) {
      files.push({
        uri: post.coverUrl,
        type: inferMimeType(post.coverUrl),
      })
    }

    // Category from first asset
    category = deriveCategory(post.assets[0].url)
  } else {
    // Single-asset mode (existing behavior)
    // Determine if this is a document type (ZIP, PDF, EPUB)
    const isDocumentType = post.mediaUrl.match(/\.(pdf|zip|epub)$/i)

    // Determine the image URL for NFT metadata
    // For protected documents, cover is REQUIRED (enforced in createPost validation)
    imageUrl = post.coverUrl
      ? post.coverUrl
      : (post.protectDownload && isDocumentType)
        ? post.coverUrl! // Cover is required for protected documents - validation ensures this
        : post.mediaUrl

    const mediaMime = inferMimeType(post.mediaUrl)
    const coverMime = post.coverUrl ? inferMimeType(post.coverUrl) : null
    category = deriveCategory(post.mediaUrl)

    // Build files array: always include media, conditionally include cover
    // For protected downloads (editions only), use protected API endpoint instead of direct blob URL
    const mediaUri = post.protectDownload && post.assetId
      ? `https://www.desperse.com/api/assets/${post.assetId}`
      : post.mediaUrl

    files = [
      {
        uri: mediaUri,
        type: mediaMime,
      },
      ...(post.coverUrl ? [{
        uri: post.coverUrl,
        type: coverMime || 'image/png',
      }] : []),
    ]

    // animation_url: only set if there's a cover (audio/video)
    animationUrl = post.coverUrl
      ? (post.protectDownload && post.assetId
          ? `https://www.desperse.com/api/assets/${post.assetId}`
          : post.mediaUrl)
      : undefined
  }

  const metadata = {
    name,
    symbol,
    description,
    image: imageUrl,
    animation_url: animationUrl,
    external_url: `https://www.desperse.com/post/${post.id}`,
    attributes: [
      {
        trait_type: 'Type',
        value: post.type === 'collectible' ? 'Collectible' : 'Edition',
      },
      {
        trait_type: 'Creator',
        value: creator.displayName || creator.usernameSlug,
      },
      // Only include Max Supply if not null (open edition is implied if omitted)
      ...(post.maxSupply !== null ? [{
        trait_type: 'Max Supply',
        value: post.maxSupply,
      }] : []),
      // Include categories as separate attributes (one per category)
      ...(post.categories && post.categories.length > 0
        ? post.categories.map((cat) => ({
            trait_type: 'Category',
            value: cat.display, // Use display value for on-chain metadata
          }))
        : []),
    ],
    properties: {
      files,
      category,
    },
  }

  return metadata
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

    const buyer = buyerData.walletAddress
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
