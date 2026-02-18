/**
 * Create Post - Direct utility function
 * Extracted from createPost in posts.ts for REST API usage.
 * MUST NOT import from files containing createServerFn.
 */

import { db } from '@/server/db'
import { posts, users, postAssets } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { uploadMetadataJson } from '@/server/storage/blob'
import { validateCategories, categoriesToStrings, type Category } from '@/constants/categories'
import { processMentions } from '@/server/utils/mentions'
import { processHashtags } from '@/server/utils/hashtags'
import { generateNftMetadata } from '@/server/utils/nft-metadata'

// Minimum edition prices
const MIN_EDITION_PRICE_SOL = 100_000_000 // 0.1 SOL in lamports
const MIN_EDITION_PRICE_USDC = 15_000_000 // $15 in USDC base units

function validateEditionPrice(price: number, currency: 'SOL' | 'USDC'): string | null {
  if (currency === 'SOL') {
    if (price < MIN_EDITION_PRICE_SOL) {
      const minSol = MIN_EDITION_PRICE_SOL / 1_000_000_000
      return `Minimum edition price is ${minSol} SOL`
    }
  } else if (currency === 'USDC') {
    if (price < MIN_EDITION_PRICE_USDC) {
      const minUsdc = MIN_EDITION_PRICE_USDC / 1_000_000
      return `Minimum edition price is $${minUsdc} USDC`
    }
  }
  return null
}

const MAX_ASSETS_PER_POST = 10


// Input type for createPostDirect
export interface CreatePostInput {
  mediaUrl: string
  coverUrl?: string | null
  caption?: string | null
  categories?: string[] | null
  type: 'post' | 'collectible' | 'edition'
  assets?: Array<{
    url: string
    mediaType: string
    fileName: string
    mimeType?: string
    fileSize?: number
    sortOrder: number
  }> | null
  maxSupply?: number | null
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  nftName?: string | null
  nftSymbol?: string | null
  nftDescription?: string | null
  sellerFeeBasisPoints?: number | null
  isMutable?: boolean
  protectDownload?: boolean
  mediaMimeType?: string | null
  mediaFileSize?: number | null
}

export interface CreatePostResult {
  success: boolean
  post?: Record<string, unknown>
  error?: string
}

export async function createPostDirect(
  data: CreatePostInput,
  token: string
): Promise<CreatePostResult> {
  // Authenticate
  const auth = await authenticateWithToken(token)
  if (!auth?.userId) {
    return { success: false, error: 'Authentication required' }
  }

  const userId = auth.userId

  // Validate categories
  const validatedCategories = validateCategories(data.categories)

  // Determine primary media URL
  const sortedAssets = data.assets
    ? [...data.assets].sort((a, b) => a.sortOrder - b.sortOrder)
    : null
  const primaryMediaUrl = sortedAssets && sortedAssets.length > 0
    ? sortedAssets[0].url
    : data.mediaUrl

  // Validate type-specific fields
  if (data.type === 'edition') {
    if (!data.price || !data.currency) {
      return { success: false, error: 'Price and currency are required for editions.' }
    }
    if (!data.nftName || data.nftName.trim() === '') {
      return { success: false, error: 'NFT name is required for editions.' }
    }
    const isDocumentType = primaryMediaUrl.match(/\.(pdf|zip|epub)$/i)
    const protectDownload = data.protectDownload ?? true
    if (isDocumentType && protectDownload && !data.coverUrl) {
      return { success: false, error: 'Cover image is required for protected document downloads.' }
    }
    const priceError = validateEditionPrice(data.price, data.currency)
    if (priceError) {
      return { success: false, error: priceError }
    }
  }

  // Validate assets count
  if (sortedAssets && sortedAssets.length > MAX_ASSETS_PER_POST) {
    return { success: false, error: `Maximum ${MAX_ASSETS_PER_POST} assets per post.` }
  }

  // Get user
  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      usernameSlug: users.usernameSlug,
      avatarUrl: users.avatarUrl,
      walletAddress: users.walletAddress,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return { success: false, error: 'User not found.' }
  }

  // Insert post
  const [newPost] = await db
    .insert(posts)
    .values({
      userId,
      type: data.type,
      mediaUrl: primaryMediaUrl,
      coverUrl: data.coverUrl || null,
      caption: data.caption || null,
      categories: validatedCategories.length > 0 ? categoriesToStrings(validatedCategories) : null,
      maxSupply: data.maxSupply || null,
      price: data.type === 'edition' ? data.price : null,
      currency: data.type === 'edition' ? data.currency : null,
      nftName: data.nftName || null,
      nftSymbol: data.nftSymbol || null,
      nftDescription: data.nftDescription || data.caption || null,
      sellerFeeBasisPoints: data.sellerFeeBasisPoints || null,
      isMutable: data.isMutable ?? true,
      creatorWallet: user.walletAddress,
    })
    .returning()

  // Helper functions
  const getStorageProvider = (url: string): 'vercel-blob' | 'r2' | 's3' => {
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) return 'vercel-blob'
    if (url.includes('.r2.cloudflarestorage.com')) return 'r2'
    if (url.includes('.s3.') || url.includes('amazonaws.com')) return 's3'
    return 'vercel-blob'
  }

  const inferMimeType = (url: string): string => {
    const urlLower = url.toLowerCase()
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'image/jpeg'
    if (urlLower.includes('.png')) return 'image/png'
    if (urlLower.includes('.webp')) return 'image/webp'
    if (urlLower.includes('.gif')) return 'image/gif'
    if (urlLower.includes('.svg')) return 'image/svg+xml'
    if (urlLower.includes('.mp4')) return 'video/mp4'
    if (urlLower.includes('.webm')) return 'video/webm'
    if (urlLower.includes('.mp3')) return 'audio/mpeg'
    if (urlLower.includes('.wav')) return 'audio/wav'
    if (urlLower.includes('.ogg')) return 'audio/ogg'
    if (urlLower.includes('.pdf')) return 'application/pdf'
    if (urlLower.includes('.zip')) return 'application/zip'
    if (urlLower.includes('.glb')) return 'model/gltf-binary'
    if (urlLower.includes('.gltf')) return 'model/gltf+json'
    return 'application/octet-stream'
  }

  const protectDownload = data.type === 'edition' ? (data.protectDownload ?? true) : false

  // Create assets
  let insertedAssets: Array<typeof postAssets.$inferSelect> = []

  if (sortedAssets && sortedAssets.length > 0) {
    const PREVIEWABLE_TYPES = ['image', 'video']
    const assetValues = sortedAssets.map((asset, index) => ({
      postId: newPost.id,
      storageProvider: getStorageProvider(asset.url),
      storageKey: asset.url,
      mimeType: asset.mimeType || inferMimeType(asset.url),
      fileSize: asset.fileSize || null,
      isGated: protectDownload,
      sortOrder: index,
      role: 'media' as const,
      isPreviewable: PREVIEWABLE_TYPES.includes(asset.mediaType),
    }))
    insertedAssets = await db.insert(postAssets).values(assetValues).returning()
  } else {
    const mimeType = data.mediaMimeType || inferMimeType(data.mediaUrl)
    const [singleAsset] = await db.insert(postAssets).values({
      postId: newPost.id,
      storageProvider: getStorageProvider(data.mediaUrl),
      storageKey: data.mediaUrl,
      mimeType,
      fileSize: data.mediaFileSize || null,
      isGated: protectDownload,
      sortOrder: 0,
      role: 'media' as const,
      isPreviewable: true,
    }).returning()
    insertedAssets = [singleAsset]
  }

  // Generate NFT metadata for collectible/edition
  if (data.type === 'collectible' || data.type === 'edition') {
    const metadataAssets = insertedAssets.length > 1
      ? insertedAssets.map((asset) => ({
          id: asset.id,
          url: asset.storageKey,
          mimeType: asset.mimeType,
          isPreviewable: asset.isPreviewable,
        }))
      : undefined

    const metadata = generateNftMetadata(
      {
        id: newPost.id,
        caption: newPost.caption,
        mediaUrl: newPost.mediaUrl,
        coverUrl: newPost.coverUrl,
        type: data.type as 'collectible' | 'edition',
        maxSupply: newPost.maxSupply,
        price: newPost.price,
        currency: newPost.currency as 'SOL' | 'USDC' | null,
        nftName: newPost.nftName,
        nftSymbol: newPost.nftSymbol,
        nftDescription: newPost.nftDescription,
        sellerFeeBasisPoints: newPost.sellerFeeBasisPoints,
        isMutable: newPost.isMutable,
        categories: validatedCategories.length > 0 ? validatedCategories : null,
        protectDownload,
        assetId: insertedAssets[0]?.id,
        assets: metadataAssets,
      },
      user
    )

    const metadataResult = await uploadMetadataJson(metadata, newPost.id)
    if (metadataResult.success) {
      await db.update(posts).set({ metadataUrl: metadataResult.url }).where(eq(posts.id, newPost.id))
      newPost.metadataUrl = metadataResult.url
    }
  }

  // Process mentions and hashtags (non-critical — post already created)
  try {
    if (newPost.caption) {
      await processMentions(newPost.caption, userId, 'post', newPost.id, false)
    }
    await processHashtags(newPost.caption || '', newPost.id)
  } catch (mentionError) {
    console.warn('[createPostDirect] Failed to process mentions/hashtags:', mentionError instanceof Error ? mentionError.message : 'Unknown error')
  }

  return {
    success: true,
    post: {
      ...newPost,
      likeCount: 0,
      commentCount: 0,
      collectCount: 0,
      isLiked: false,
      isCollected: false,
      collectibleAssetId: null,
      user: {
        id: user.id,
        slug: user.usernameSlug,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    } as Record<string, unknown>,
  }
}
