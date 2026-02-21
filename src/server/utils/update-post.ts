/**
 * Update Post - Direct utility function
 * Extracted from updatePost in posts.ts for REST API usage.
 */

import { db } from '@/server/db'
import { posts, users, collections, purchases, postAssets } from '@/server/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { uploadMetadataJson } from '@/server/storage/blob'
import { validateCategories, categoriesToStrings, stringsToCategories, type Category } from '@/constants/categories'
import { processMentions } from '@/server/utils/mentions'
import { processHashtags } from '@/server/utils/hashtags'
import { generateNftMetadata } from '@/server/utils/nft-metadata'
import { validateMintWindow } from '@/server/utils/mintWindowStatus'

// Minimum edition prices
const MIN_EDITION_PRICE_SOL = 100_000_000
const MIN_EDITION_PRICE_USDC = 15_000_000

function validateEditionPrice(price: number, currency: 'SOL' | 'USDC'): string | null {
  if (currency === 'SOL' && price < MIN_EDITION_PRICE_SOL) {
    return `Minimum edition price is ${MIN_EDITION_PRICE_SOL / 1_000_000_000} SOL`
  }
  if (currency === 'USDC' && price < MIN_EDITION_PRICE_USDC) {
    return `Minimum edition price is $${MIN_EDITION_PRICE_USDC / 1_000_000} USDC`
  }
  return null
}

export interface UpdatePostInput {
  caption?: string | null
  categories?: string[] | null
  nftName?: string | null
  nftSymbol?: string | null
  nftDescription?: string | null
  sellerFeeBasisPoints?: number | null
  isMutable?: boolean
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  maxSupply?: number | null
  mintWindowEnabled?: boolean
  mintWindowStartMode?: 'now' | 'scheduled'
  mintWindowStartTime?: string | Date | null
  mintWindowDurationHours?: number | null
}

export interface UpdatePostResult {
  success: boolean
  post?: Record<string, unknown>
  error?: string
}

export async function updatePostDirect(
  postId: string,
  data: UpdatePostInput,
  token: string
): Promise<UpdatePostResult> {
  const auth = await authenticateWithToken(token)
  if (!auth?.userId) {
    return { success: false, error: 'Authentication required' }
  }

  const userId = auth.userId

  // Validate categories if provided
  let validatedCategories: Category[] | null = null
  if (data.categories !== undefined) {
    validatedCategories = validateCategories(data.categories)
    if (validatedCategories.length === 0) validatedCategories = null
  }

  // Get post
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1)
  if (!post) return { success: false, error: 'Post not found.' }
  if (post.userId !== userId) return { success: false, error: 'You do not have permission to edit this post.' }

  // Check collects/purchases
  let hasConfirmedCollects = false
  let hasConfirmedPurchases = false

  if (post.type === 'collectible') {
    const c = await db.select({ count: count() }).from(collections).where(and(eq(collections.postId, postId), eq(collections.status, 'confirmed')))
    hasConfirmedCollects = (c[0]?.count || 0) > 0
  }
  if (post.type === 'edition') {
    const p = await db.select({ count: count() }).from(purchases).where(and(eq(purchases.postId, postId), eq(purchases.status, 'confirmed')))
    hasConfirmedPurchases = (p[0]?.count || 0) > 0
  }

  const allowedUpdates: Record<string, unknown> = {}

  // Caption always editable
  if (data.caption !== undefined) allowedUpdates.caption = data.caption

  // Categories always editable (unless collectible post-mint)
  if (data.categories !== undefined) {
    if (post.type === 'collectible' && (hasConfirmedCollects || !!post.mintedAt)) {
      return { success: false, error: 'This collectible has been minted. Categories cannot be changed.' }
    }
    allowedUpdates.categories = validatedCategories ? categoriesToStrings(validatedCategories) : null
  }

  // Standard posts: only caption + categories
  if (post.type === 'post') {
    if (data.nftName !== undefined || data.nftSymbol !== undefined || data.nftDescription !== undefined ||
        data.sellerFeeBasisPoints !== undefined || data.isMutable !== undefined ||
        data.price !== undefined || data.currency !== undefined || data.maxSupply !== undefined) {
      return { success: false, error: 'Standard posts can only have their caption edited.' }
    }
  }

  // Collectibles
  if (post.type === 'collectible') {
    if (data.price !== undefined || data.currency !== undefined || data.maxSupply !== undefined) {
      return { success: false, error: 'Collectibles are always free. Pricing fields cannot be set.' }
    }
    const isMinted = hasConfirmedCollects || !!post.mintedAt
    if (isMinted) {
      if (data.nftName !== undefined || data.nftSymbol !== undefined || data.nftDescription !== undefined ||
          data.sellerFeeBasisPoints !== undefined || data.isMutable !== undefined) {
        return { success: false, error: 'This collectible has been minted. NFT metadata cannot be changed.' }
      }
    } else {
      if (data.nftName !== undefined) allowedUpdates.nftName = data.nftName
      if (data.nftSymbol !== undefined) allowedUpdates.nftSymbol = data.nftSymbol
      if (data.nftDescription !== undefined) allowedUpdates.nftDescription = data.nftDescription
      if (data.sellerFeeBasisPoints !== undefined) allowedUpdates.sellerFeeBasisPoints = data.sellerFeeBasisPoints
      if (data.isMutable !== undefined) allowedUpdates.isMutable = data.isMutable
    }
  }

  // Editions
  if (post.type === 'edition') {
    const isMinted = !!post.mintedAt
    const mintedIsMutable = post.mintedIsMutable ?? true
    const areNftFieldsLocked = isMinted && !mintedIsMutable
    const arePricingFieldsLocked = hasConfirmedPurchases

    if (arePricingFieldsLocked && (data.price !== undefined || data.currency !== undefined || data.maxSupply !== undefined)) {
      return { success: false, error: 'This edition has been purchased. Price and supply cannot be edited.' }
    }
    if (areNftFieldsLocked && (data.nftName !== undefined || data.nftSymbol !== undefined || data.nftDescription !== undefined ||
        data.sellerFeeBasisPoints !== undefined || data.isMutable !== undefined)) {
      return { success: false, error: 'This edition was minted as immutable. NFT metadata cannot be edited.' }
    }

    if (!areNftFieldsLocked) {
      if (data.nftName !== undefined) allowedUpdates.nftName = data.nftName
      if (data.nftSymbol !== undefined) allowedUpdates.nftSymbol = data.nftSymbol
      if (data.nftDescription !== undefined) allowedUpdates.nftDescription = data.nftDescription
      if (data.sellerFeeBasisPoints !== undefined) allowedUpdates.sellerFeeBasisPoints = data.sellerFeeBasisPoints
      if (data.isMutable !== undefined && !isMinted) allowedUpdates.isMutable = data.isMutable
    }
    if (!arePricingFieldsLocked) {
      if (data.price !== undefined) allowedUpdates.price = data.price
      if (data.currency !== undefined) allowedUpdates.currency = data.currency
      if (data.maxSupply !== undefined) allowedUpdates.maxSupply = data.maxSupply
      if (data.price !== undefined || data.currency !== undefined) {
        const finalPrice = (data.price ?? post.price) as number
        const finalCurrency = (data.currency ?? post.currency) as 'SOL' | 'USDC'
        if (finalPrice && finalCurrency) {
          const priceError = validateEditionPrice(finalPrice, finalCurrency)
          if (priceError) return { success: false, error: priceError }
        }
      }
    }
    // Time window: locked after first purchase (same as pricing fields)
    if (data.mintWindowEnabled !== undefined) {
      if (arePricingFieldsLocked) {
        return { success: false, error: 'This edition has been purchased. Time window cannot be edited.' }
      }
      const windowResult = validateMintWindow({
        mintWindowEnabled: data.mintWindowEnabled,
        mintWindowStartMode: data.mintWindowStartMode,
        mintWindowStartTime: data.mintWindowStartTime,
        mintWindowDurationHours: data.mintWindowDurationHours,
      }, 'update')
      if (!windowResult.valid) {
        return { success: false, error: windowResult.error }
      }
      allowedUpdates.mintWindowStart = windowResult.mintWindowStart ?? null
      allowedUpdates.mintWindowEnd = windowResult.mintWindowEnd ?? null
    }
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return { success: false, error: 'No valid updates provided.' }
  }

  // Metadata regeneration check
  const metadataAffectingFields = ['nftName', 'nftSymbol', 'nftDescription', 'sellerFeeBasisPoints', 'isMutable', 'mediaUrl', 'coverUrl', 'categories']
  const needsMetadataRegen = (post.type === 'collectible' || post.type === 'edition') &&
    metadataAffectingFields.some(field => allowedUpdates[field] !== undefined && allowedUpdates[field] !== (post as Record<string, unknown>)[field])

  allowedUpdates.updatedAt = new Date()
  if (!post.editedAt) allowedUpdates.editedAt = new Date()

  const [updatedPost] = await db.update(posts).set(allowedUpdates as any).where(eq(posts.id, postId)).returning()

  // Regenerate metadata if needed
  if (needsMetadataRegen && updatedPost.metadataUrl) {
    const [creator] = await db.select({ id: users.id, displayName: users.displayName, usernameSlug: users.usernameSlug, walletAddress: users.walletAddress })
      .from(users).where(eq(users.id, updatedPost.userId)).limit(1)

    if (creator) {
      const metadata = generateNftMetadata({
        id: updatedPost.id, caption: updatedPost.caption, mediaUrl: updatedPost.mediaUrl,
        coverUrl: updatedPost.coverUrl, type: updatedPost.type as 'collectible' | 'edition',
        maxSupply: updatedPost.maxSupply, price: updatedPost.price,
        currency: updatedPost.currency as 'SOL' | 'USDC' | null,
        nftName: updatedPost.nftName, nftSymbol: updatedPost.nftSymbol,
        nftDescription: updatedPost.nftDescription, sellerFeeBasisPoints: updatedPost.sellerFeeBasisPoints,
        isMutable: updatedPost.isMutable,
        categories: updatedPost.categories ? stringsToCategories(updatedPost.categories as string[]) : null,
      }, creator)

      const metadataResult = await uploadMetadataJson(metadata, updatedPost.id, true)
      if (metadataResult.success) {
        await db.update(posts).set({ metadataUrl: metadataResult.url }).where(eq(posts.id, postId))
        updatedPost.metadataUrl = metadataResult.url
      }
    }
  }

  // Process mentions/hashtags (non-critical — post update already succeeded)
  if (data.caption !== undefined) {
    try {
      await processMentions(updatedPost.caption || '', userId, 'post', postId, true)
      await processHashtags(updatedPost.caption || '', postId)
    } catch (mentionError) {
      console.warn('[updatePostDirect] Failed to process mentions/hashtags:', mentionError instanceof Error ? mentionError.message : 'Unknown error')
    }
  }

  // Get user for response
  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      usernameSlug: users.usernameSlug,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return {
    success: true,
    post: {
      ...updatedPost,
      likeCount: 0,
      commentCount: 0,
      collectCount: 0,
      isLiked: false,
      isCollected: false,
      collectibleAssetId: null,
      user: user ? {
        id: user.id,
        slug: user.usernameSlug,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      } : null,
    } as Record<string, unknown>,
  }
}
