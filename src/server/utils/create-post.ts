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
import { processMentions } from '@/server/functions/mentions'
import { processHashtags } from '@/server/functions/hashtags'

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

// Copy of generateNftMetadata from posts.ts (cannot import due to createServerFn)
function generateNftMetadata(post: {
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
  assets?: Array<{ id: string; url: string; mimeType: string; isPreviewable: boolean }>
}, creator: {
  displayName: string | null
  usernameSlug: string
  walletAddress: string
}) {
  const inferMimeType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'gif': 'image/gif', 'webp': 'image/webp', 'mp4': 'video/mp4',
      'webm': 'video/webm', 'mp3': 'audio/mpeg', 'wav': 'audio/wav',
      'ogg': 'audio/ogg', 'glb': 'model/gltf-binary', 'gltf': 'model/gltf+json',
      'pdf': 'application/pdf',
    }
    return typeMap[extension || ''] || 'application/octet-stream'
  }

  const isImageMime = (mime: string) => mime.startsWith('image/')
  const isAnimationMime = (mime: string) => mime.startsWith('video/') || mime.startsWith('audio/')

  const deriveCategory = (url: string): string => {
    const mime = inferMimeType(url)
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('model/') || url.endsWith('.glb') || url.endsWith('.gltf')) return 'vr'
    return 'image'
  }

  const name = post.nftName?.trim() || (post.type === 'collectible' ? `Collectible #${post.id.slice(0, 8)}` : `Edition #${post.id.slice(0, 8)}`)
  const symbol = post.nftSymbol?.trim() || 'DSPRS'
  const description = post.nftDescription?.trim() || post.caption?.trim() || ''

  const hasMultipleAssets = post.assets && post.assets.length > 1

  let imageUrl: string
  let animationUrl: string | undefined
  let files: Array<{ uri: string; type: string }>
  let category: string

  if (hasMultipleAssets && post.assets) {
    const firstImage = post.assets.find(a => isImageMime(a.mimeType))
    const firstAnimation = post.assets.find(a => isAnimationMime(a.mimeType))
    imageUrl = post.coverUrl || firstImage?.url || post.assets[0].url
    animationUrl = firstAnimation?.url
    files = post.assets.map(asset => {
      if (post.protectDownload && !asset.isPreviewable && asset.id) {
        return { uri: `https://www.desperse.com/api/assets/${asset.id}`, type: asset.mimeType }
      }
      return { uri: asset.url, type: asset.mimeType }
    })
    if (post.coverUrl && !post.assets.some(a => a.url === post.coverUrl)) {
      files.push({ uri: post.coverUrl, type: inferMimeType(post.coverUrl) })
    }
    category = deriveCategory(post.assets[0].url)
  } else {
    const isDocumentType = post.mediaUrl.match(/\.(pdf|zip|epub)$/i)
    imageUrl = post.coverUrl
      ? post.coverUrl
      : (post.protectDownload && isDocumentType)
        ? post.coverUrl!
        : post.mediaUrl

    const mediaMime = inferMimeType(post.mediaUrl)
    const coverMime = post.coverUrl ? inferMimeType(post.coverUrl) : null
    category = deriveCategory(post.mediaUrl)

    const mediaUri = post.protectDownload && post.assetId
      ? `https://www.desperse.com/api/assets/${post.assetId}`
      : post.mediaUrl

    files = [
      { uri: mediaUri, type: mediaMime },
      ...(post.coverUrl ? [{ uri: post.coverUrl, type: coverMime || 'image/png' }] : []),
    ]

    animationUrl = post.coverUrl
      ? (post.protectDownload && post.assetId
          ? `https://www.desperse.com/api/assets/${post.assetId}`
          : post.mediaUrl)
      : undefined
  }

  return {
    name, symbol, description,
    image: imageUrl,
    animation_url: animationUrl,
    external_url: `https://www.desperse.com/post/${post.id}`,
    attributes: [
      { trait_type: 'Type', value: post.type === 'collectible' ? 'Collectible' : 'Edition' },
      { trait_type: 'Creator', value: creator.displayName || creator.usernameSlug },
      ...(post.maxSupply !== null ? [{ trait_type: 'Max Supply', value: post.maxSupply }] : []),
      ...(post.categories && post.categories.length > 0
        ? post.categories.map((cat) => ({ trait_type: 'Category', value: cat.display }))
        : []),
    ],
    properties: { files, category },
  }
}

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
