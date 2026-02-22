/**
 * Posts server functions
 * Handles post creation, retrieval, and feed queries
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { posts, users, follows, collections, purchases, postAssets } from '@/server/db/schema'
import { eq, and, desc, lt, inArray, sql, count, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { uploadMetadataJson } from '@/server/storage/blob'
import { validateCategories, stringsToCategories, categoriesToStrings, type Category } from '@/constants/categories'
import { isModeratorOrAdmin } from '@/server/utils/auth-helpers'
import { withAuth, withOptionalAuth } from '@/server/auth'
import { processMentions, deleteMentions } from '@/server/utils/mentions'
import { processHashtags } from '@/server/utils/hashtags'
import { generateNftMetadata } from '@/server/utils/nft-metadata'
import { validateMintWindow } from '@/server/utils/mintWindowStatus'

// Post type enum
const postTypeSchema = z.enum(['post', 'collectible', 'edition'])
const currencySchema = z.enum(['SOL', 'USDC'])

// Minimum edition prices (to ensure profitability)
// SOL: 0.1 SOL = 100_000_000 lamports
// USDC: $15 = 15_000_000 micro-USDC (6 decimals)
const MIN_EDITION_PRICE_SOL = 100_000_000 // 0.1 SOL in lamports
const MIN_EDITION_PRICE_USDC = 15_000_000 // $15 in USDC base units

/**
 * Validate edition price meets minimum threshold
 * Returns error message if invalid, null if valid
 */
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

// Max assets per post (for multi-asset support)
const MAX_ASSETS_PER_POST = 10

// Schema for individual asset in multi-asset posts
const assetSchema = z.object({
  url: z.string().url(),
  mediaType: z.enum(['image', 'video', 'audio', 'document', '3d']),
  fileName: z.string(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0),
})

// Schema for creating a post
const createPostSchema = z.object({
  // Auth token for server-side verification (passed from client)
  _authorization: z.string().optional(),
  mediaUrl: z.string().url(),
  coverUrl: z.string().url().optional().nullable(),
  caption: z.string().max(2000).optional().nullable(),
  categories: z.array(z.string()).max(3).optional().nullable(), // Max 3 categories, validated against presets
  type: postTypeSchema,
  // Multi-asset support (Phase 1: standard posts only)
  // When provided, mediaUrl is ignored and first asset becomes mediaUrl
  assets: z.array(assetSchema).max(MAX_ASSETS_PER_POST).optional().nullable(),
  // Collectible-specific fields
  maxSupply: z.number().int().positive().optional().nullable(), // null = unlimited
  // Edition-specific fields
  price: z.number().int().positive().optional().nullable(), // Required for editions, in base units
  currency: currencySchema.optional().nullable(), // Required for editions
  // NFT metadata fields (edition-specific in UI, but stored on all posts)
  nftName: z.string().max(32).optional().nullable(), // Custom NFT name (max 32 chars on-chain)
  nftSymbol: z.string().max(10).optional().nullable(), // Custom symbol (max 10 chars on-chain)
  nftDescription: z.string().max(5000).optional().nullable(), // Separate from caption for NFT metadata
  sellerFeeBasisPoints: z.number().int().min(0).max(1000).optional().nullable(), // Creator royalties (0-1000 = 0-10%)
  isMutable: z.boolean().optional().default(true), // Metadata mutability (default true)
  collectionAddress: z.string().optional().nullable(), // Optional collection association (future use)
  protectDownload: z.boolean().optional().default(true), // Whether to gate downloads (default true)
  mediaMimeType: z.string().optional().nullable(), // MIME type of uploaded media
  mediaFileSize: z.number().int().positive().optional().nullable(), // File size in bytes
  // Timed edition fields
  mintWindowEnabled: z.boolean().optional(),
  mintWindowStartMode: z.enum(['now', 'scheduled']).optional(),
  mintWindowStartTime: z.string().datetime().optional().nullable(),
  mintWindowDurationHours: z.number().positive().optional().nullable(),
})

// Schema for feed query
const feedQuerySchema = z.object({
  tab: z.enum(['for-you', 'following']).default('for-you'),
  cursor: z.string().datetime().optional(), // ISO date string for cursor-based pagination
  limit: z.number().int().min(1).max(50).default(20),
  userId: z.string().uuid().optional(), // Current user's ID (for following feed)
  categories: z.array(z.string()).optional(), // Filter by categories (optional)
})

// Schema for user posts query
const userPostsQuerySchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

/**
 * Create a new post
 */
export const createPost = createServerFn({
  method: 'POST',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    // Verify authentication using withAuth helper
    // This extracts _authorization, verifies token, strips it from input, and parses schema
    const result = await withAuth(createPostSchema.omit({ _authorization: true }), input)
    
    if (!result) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      }
    }

    const { auth, input: postData } = result
    const userId = auth.userId

    // Validate and normalize categories
    const validatedCategories = validateCategories(postData.categories)

    // Multi-asset support: Phase 1 (standard posts), Phase 2 (collectibles), Phase 3 (editions)
    // All post types now support multi-asset when enabled via feature flags

    // Determine the primary media URL
    // For multi-asset posts, use the first asset's URL
    const sortedAssets = postData.assets
      ? [...postData.assets].sort((a, b) => a.sortOrder - b.sortOrder)
      : null
    const primaryMediaUrl = sortedAssets && sortedAssets.length > 0
      ? sortedAssets[0].url
      : postData.mediaUrl

    // Validate type-specific fields
    if (postData.type === 'edition') {
      if (!postData.price || !postData.currency) {
        return {
          success: false,
          error: 'Price and currency are required for editions.',
        }
      }
      if (!postData.nftName || postData.nftName.trim() === '') {
        return {
          success: false,
          error: 'NFT name is required for editions.',
        }
      }

      // Require cover image for protected document downloads (ZIP, PDF, EPUB)
      // This prevents exposing the actual asset URL in NFT metadata
      const isDocumentType = primaryMediaUrl.match(/\.(pdf|zip|epub)$/i)
      const protectDownload = postData.protectDownload ?? true
      if (isDocumentType && protectDownload && !postData.coverUrl) {
        return {
          success: false,
          error: 'Cover image is required for protected document downloads.',
        }
      }
      // Validate minimum price
      const priceError = validateEditionPrice(postData.price, postData.currency)
      if (priceError) {
        return {
          success: false,
          error: priceError,
        }
      }
    }

    // Validate mint window for editions
    if (postData.type === 'edition' && postData.mintWindowEnabled) {
      const windowResult = validateMintWindow({
        mintWindowEnabled: postData.mintWindowEnabled,
        mintWindowStartMode: postData.mintWindowStartMode,
        mintWindowStartTime: postData.mintWindowStartTime,
        mintWindowDurationHours: postData.mintWindowDurationHours,
      }, 'create')
      if (!windowResult.valid) {
        return { success: false, error: windowResult.error }
      }
    }

    // Get user for metadata generation
    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        usernameSlug: users.usernameSlug,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      }
    }

    // Compute mint window timestamps
    let mintWindowStart: Date | null = null
    let mintWindowEnd: Date | null = null
    if (postData.type === 'edition' && postData.mintWindowEnabled) {
      const windowResult = validateMintWindow({
        mintWindowEnabled: postData.mintWindowEnabled,
        mintWindowStartMode: postData.mintWindowStartMode,
        mintWindowStartTime: postData.mintWindowStartTime,
        mintWindowDurationHours: postData.mintWindowDurationHours,
      }, 'create')
      if (windowResult.valid) {
        mintWindowStart = windowResult.mintWindowStart ?? null
        mintWindowEnd = windowResult.mintWindowEnd ?? null
      }
    }

    // Insert post (use primaryMediaUrl for backward compatibility)
    const [newPost] = await db
      .insert(posts)
      .values({
        userId,
        type: postData.type,
        mediaUrl: primaryMediaUrl,
        coverUrl: postData.coverUrl || null,
        caption: postData.caption || null,
        categories: validatedCategories.length > 0 ? categoriesToStrings(validatedCategories) : null,
        maxSupply: postData.maxSupply || null,
        price: postData.type === 'edition' ? postData.price : null,
        currency: postData.type === 'edition' ? postData.currency : null,
        // NFT metadata fields
        nftName: postData.nftName || null,
        nftSymbol: postData.nftSymbol || null,
        // Store caption as nftDescription if not provided - preserves what was minted on-chain
        nftDescription: postData.nftDescription || postData.caption || null,
        sellerFeeBasisPoints: postData.sellerFeeBasisPoints || null,
        isMutable: postData.isMutable ?? true,
        collectionAddress: postData.collectionAddress || null,
        // Store creator wallet address (canonical update authority target)
        creatorWallet: user.walletAddress,
        // Timed edition window
        mintWindowStart,
        mintWindowEnd,
      })
      .returning()

    // Helper to determine storage provider from URL
    const getStorageProvider = (url: string): 'vercel-blob' | 'r2' | 's3' => {
      if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
        return 'vercel-blob'
      } else if (url.includes('.r2.cloudflarestorage.com')) {
        return 'r2'
      } else if (url.includes('.s3.') || url.includes('amazonaws.com')) {
        return 's3'
      }
      return 'vercel-blob'
    }

    // Helper to infer MIME type from URL
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

    // Determine if download should be protected (editions only, defaults to TRUE for new editions)
    // Non-edition posts are never gated
    const protectDownload = postData.type === 'edition' ? (postData.protectDownload ?? true) : false

    // Create asset records
    // For multi-asset posts, create one record per asset with proper ordering
    // For single-asset posts (backward compatible), create one record
    let newAsset: typeof postAssets.$inferSelect
    let insertedAssets: typeof postAssets.$inferSelect[] = []

    if (sortedAssets && sortedAssets.length > 0) {
      // Multi-asset flow
      // Previewable types go in carousel, downloadable types are available via menu
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
      newAsset = insertedAssets[0] // First asset for metadata generation
    } else {
      // Single-asset flow (backward compatible)
      const mediaUrl = postData.mediaUrl
      const mimeType = postData.mediaMimeType || inferMimeType(mediaUrl)

      const [singleAsset] = await db.insert(postAssets).values({
        postId: newPost.id,
        storageProvider: getStorageProvider(mediaUrl),
        storageKey: mediaUrl,
        mimeType: mimeType,
        fileSize: postData.mediaFileSize || null,
        isGated: protectDownload,
        sortOrder: 0,
        role: 'media' as const,
        isPreviewable: true,
      }).returning()

      newAsset = singleAsset
      insertedAssets = [singleAsset]
    }

    // Generate and upload metadata for NFT types
    if (postData.type === 'collectible' || postData.type === 'edition') {
      // Prepare assets array for multi-asset metadata
      // For editions, include id and isPreviewable so gated downloads use API endpoints
      const metadataAssets = insertedAssets.length > 1
        ? insertedAssets.map((asset) => ({
            id: asset.id,
            url: asset.storageKey, // storageKey is the URL
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
          type: postData.type,
          maxSupply: newPost.maxSupply,
          price: newPost.price,
          currency: newPost.currency,
          nftName: newPost.nftName,
          nftSymbol: newPost.nftSymbol,
          nftDescription: newPost.nftDescription,
          sellerFeeBasisPoints: newPost.sellerFeeBasisPoints,
          isMutable: newPost.isMutable,
          categories: validatedCategories.length > 0 ? validatedCategories : null,
          protectDownload: protectDownload,
          assetId: newAsset.id,
          assets: metadataAssets,
        },
        user
      )

      const metadataResult = await uploadMetadataJson(metadata, newPost.id)
      
      if (metadataResult.success) {
        // Update post with metadata URL
        await db
          .update(posts)
          .set({ metadataUrl: metadataResult.url })
          .where(eq(posts.id, newPost.id))
        
        newPost.metadataUrl = metadataResult.url
      }
    }

    // Process @mentions in the caption
    if (newPost.caption) {
      await processMentions(newPost.caption, userId, 'post', newPost.id, false)
    }

    // Process #hashtags in the caption (uses diff logic even for creates)
    await processHashtags(newPost.caption || '', newPost.id)

    return {
      success: true,
      post: newPost,
    }
  } catch (error) {
    console.error('Error in createPost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post.',
    }
  }
})

/**
 * Get a single post by ID
 */
export const getPost = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const getPostSchema = z.object({
      postId: z.string().uuid(),
    })

    const authResult = await withOptionalAuth(getPostSchema, input)
    const { postId } = authResult.input

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.isDeleted, false),
          canSeeHidden ? undefined : eq(posts.isHidden, false)
        )
      )
      .limit(1)

    if (result.length === 0) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // If post is hidden and user is not moderator/admin, return error
    if (result[0].post.isHidden && !canSeeHidden) {
      return {
        success: false,
        error: 'This content is not available.',
      }
    }

    // Get collect count and first assetId for collectibles
    let collectCount = 0
    let collectibleAssetId: string | undefined = undefined
    if (result[0].post.type === 'collectible') {
      const countResult = await db
        .select({ count: count() })
        .from(collections)
        .where(
          and(
            eq(collections.postId, postId),
            eq(collections.status, 'confirmed')
          )
        )
      collectCount = countResult[0]?.count || 0

      // Get first assetId for Orb link
      const assetIdResult = await db
        .select({
          nftMint: collections.nftMint,
        })
        .from(collections)
        .where(
          and(
            eq(collections.postId, postId),
            eq(collections.status, 'confirmed'),
            isNotNull(collections.nftMint)
          )
        )
        .orderBy(collections.createdAt)
        .limit(1)
      
      collectibleAssetId = assetIdResult[0]?.nftMint || undefined
    }

    // Get current supply for editions (count confirmed purchases only)
    let currentSupply = result[0].post.currentSupply || 0
    if (result[0].post.type === 'edition') {
      const purchaseCountResult = await db
        .select({ count: count() })
        .from(purchases)
        .where(
          and(
            eq(purchases.postId, postId),
            eq(purchases.status, 'confirmed')
          )
        )
      currentSupply = purchaseCountResult[0]?.count || 0
    }

    // Get assetId from postAssets for protected downloads (editions and collectibles)
    let assetId: string | undefined = undefined
    if (result[0].post.type === 'edition' || result[0].post.type === 'collectible') {
      const [asset] = await db
        .select({ id: postAssets.id })
        .from(postAssets)
        .where(eq(postAssets.postId, postId))
        .limit(1)
      assetId = asset?.id || undefined
    }

    // Get all media assets ordered by sortOrder for multi-asset posts
    const mediaAssets = await db
      .select({
        id: postAssets.id,
        url: postAssets.storageKey,
        mimeType: postAssets.mimeType,
        fileSize: postAssets.fileSize,
        sortOrder: postAssets.sortOrder,
        role: postAssets.role,
        isPreviewable: postAssets.isPreviewable,
      })
      .from(postAssets)
      .where(
        and(
          eq(postAssets.postId, postId),
          eq(postAssets.role, 'media'),
          eq(postAssets.isPreviewable, true)
        )
      )
      .orderBy(postAssets.sortOrder)

    // Get downloadable assets (non-previewable: audio, documents, 3D)
    const downloadableAssets = await db
      .select({
        id: postAssets.id,
        url: postAssets.storageKey,
        mimeType: postAssets.mimeType,
        fileSize: postAssets.fileSize,
        sortOrder: postAssets.sortOrder,
      })
      .from(postAssets)
      .where(
        and(
          eq(postAssets.postId, postId),
          eq(postAssets.role, 'media'),
          eq(postAssets.isPreviewable, false)
        )
      )
      .orderBy(postAssets.sortOrder)

    // Get current user's nftMint for editions they own (for "View on Orb" link)
    let userNftMint: string | undefined = undefined
    if (authResult.auth?.userId && result[0].post.type === 'edition') {
      const [userPurchase] = await db
        .select({ nftMint: purchases.nftMint })
        .from(purchases)
        .where(
          and(
            eq(purchases.postId, postId),
            eq(purchases.userId, authResult.auth.userId),
            eq(purchases.status, 'confirmed'),
            isNotNull(purchases.nftMint)
          )
        )
        .limit(1)
      userNftMint = userPurchase?.nftMint || undefined
    }

    // Fetch moderator information if present
    let hiddenByUser = null
    let deletedByUser = null

    if (result[0].post.hiddenByUserId) {
      const [moderator] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
        })
        .from(users)
        .where(eq(users.id, result[0].post.hiddenByUserId))
        .limit(1)
      hiddenByUser = moderator || null
    }

    if (result[0].post.deletedByUserId) {
      const [admin] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
        })
        .from(users)
        .where(eq(users.id, result[0].post.deletedByUserId))
        .limit(1)
      deletedByUser = admin || null
    }

    return {
      success: true,
      post: {
        ...result[0].post,
        collectCount,
        currentSupply,
        hiddenByUser,
        deletedByUser,
        // Add first assetId for collectibles (for Orb link)
        ...(result[0].post.type === 'collectible' && collectibleAssetId
          ? { collectibleAssetId }
          : {}),
        // Add assetId for protected downloads
        ...(assetId ? { assetId } : {}),
        // Add user's nftMint for editions they own (for Orb link to their NFT)
        ...(result[0].post.type === 'edition' && userNftMint
          ? { userNftMint }
          : {}),
        // Add ordered media assets for multi-asset carousel
        // Only include if there are multiple assets (single asset uses mediaUrl)
        ...(mediaAssets.length > 1 ? { assets: mediaAssets } : {}),
        // Add downloadable assets for download menu (audio, documents, 3D)
        ...(downloadableAssets.length > 0 ? { downloadableAssets } : {}),
      },
      user: result[0].user,
    }
  } catch (error) {
    console.error('Error in getPost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch post.',
    }
  }
})

/**
 * Get feed posts with pagination
 * Supports both "for-you" (global) and "following" tabs
 */
export const getFeed = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(feedQuerySchema, input)
    const { tab, cursor, limit, userId, categories } = authResult.input

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    // Build base query conditions
    const baseConditions = [
      eq(posts.isDeleted, false),
      ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
    ]

    // Add cursor condition if provided
    if (cursor) {
      baseConditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      // Validate categories against presets
      const validatedCategories = validateCategories(categories)
      if (validatedCategories.length > 0) {
        // Use array overlap operator (&&) to check if post categories overlap with filter categories
        // PostgreSQL array overlap: categories && filter_categories
        // Convert Category objects to strings for SQL query
        const categoryStrings = categoriesToStrings(validatedCategories)
        baseConditions.push(
          sql`${posts.categories} && ${categoryStrings}`
        )
      }
    }

    // For "following" feed, filter by followed users
    if (tab === 'following' && userId) {
      // Get the list of user IDs that the current user follows
      const followingList = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId))

      const followingIds = followingList.map(f => f.followingId)

      // If not following anyone, return empty
      if (followingIds.length === 0) {
        return {
          success: true,
          posts: [],
          hasMore: false,
          nextCursor: null,
        }
      }

      // Filter posts by followed users
      baseConditions.push(inArray(posts.userId, followingIds))
    }

    // Execute query
    const feedPosts = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(...baseConditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1) // Fetch one extra to determine if there are more

    // Check if there are more posts
    const hasMore = feedPosts.length > limit
    const postsToReturn = hasMore ? feedPosts.slice(0, limit) : feedPosts

    // Get collect counts and first assetId for collectibles
    const collectiblePostIds = postsToReturn
      .filter(p => p.post.type === 'collectible')
      .map(p => p.post.id)

    let collectCounts: Record<string, number> = {}
    let collectibleAssetIds: Record<string, string> = {}
    if (collectiblePostIds.length > 0) {
      const countResults = await db
        .select({
          postId: collections.postId,
          count: count(),
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectiblePostIds),
            eq(collections.status, 'confirmed')
          )
        )
        .groupBy(collections.postId)

      collectCounts = Object.fromEntries(
        countResults.map(r => [r.postId, r.count])
      )

      // Get first assetId for each collectible post (for Orb link)
      // Get all confirmed collections with assetIds, then pick first per post
      const assetIdResults = await db
        .select({
          postId: collections.postId,
          nftMint: collections.nftMint,
          createdAt: collections.createdAt,
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectiblePostIds),
            eq(collections.status, 'confirmed'),
            isNotNull(collections.nftMint)
          )
        )
        .orderBy(collections.createdAt)

      // Get the first assetId for each post (earliest createdAt)
      const assetIdMap = new Map<string, string>()
      for (const result of assetIdResults) {
        if (result.nftMint && !assetIdMap.has(result.postId)) {
          assetIdMap.set(result.postId, result.nftMint)
        }
      }
      collectibleAssetIds = Object.fromEntries(assetIdMap)
    }

    // Get assetIds from postAssets for protected downloads (editions and collectibles)
    const nftPostIds = postsToReturn
      .filter(p => p.post.type === 'edition' || p.post.type === 'collectible')
      .map(p => p.post.id)

    let postAssetIds: Record<string, string> = {}
    if (nftPostIds.length > 0) {
      const assetResults = await db
        .select({
          postId: postAssets.postId,
          id: postAssets.id,
        })
        .from(postAssets)
        .where(inArray(postAssets.postId, nftPostIds))

      postAssetIds = Object.fromEntries(
        assetResults.map(r => [r.postId, r.id])
      )
    }

    // Get current user's nftMint for editions they own (for "View on Orb" link)
    const editionPostIds = postsToReturn
      .filter(p => p.post.type === 'edition')
      .map(p => p.post.id)

    let userNftMints: Record<string, string> = {}
    if (authResult.auth?.userId && editionPostIds.length > 0) {
      const userPurchases = await db
        .select({
          postId: purchases.postId,
          nftMint: purchases.nftMint,
        })
        .from(purchases)
        .where(
          and(
            inArray(purchases.postId, editionPostIds),
            eq(purchases.userId, authResult.auth.userId),
            eq(purchases.status, 'confirmed'),
            isNotNull(purchases.nftMint)
          )
        )

      userNftMints = Object.fromEntries(
        userPurchases
          .filter(p => p.nftMint)
          .map(p => [p.postId, p.nftMint!])
      )
    }

    // Determine next cursor
    const lastPost = postsToReturn[postsToReturn.length - 1]
    const nextCursor = hasMore && lastPost
      ? lastPost.post.createdAt.toISOString()
      : null

    // Get all media assets for multi-asset posts (fetch all at once to avoid N+1)
    const allPostIds = postsToReturn.map(p => p.post.id)
    let allMediaAssets: { postId: string; id: string; url: string; mimeType: string; fileSize: number | null; sortOrder: number }[] = []
    if (allPostIds.length > 0) {
      const assetResults = await db
        .select({
          postId: postAssets.postId,
          id: postAssets.id,
          url: postAssets.storageKey,
          mimeType: postAssets.mimeType,
          fileSize: postAssets.fileSize,
          sortOrder: postAssets.sortOrder,
        })
        .from(postAssets)
        .where(
          and(
            inArray(postAssets.postId, allPostIds),
            eq(postAssets.role, 'media'),
            eq(postAssets.isPreviewable, true)
          )
        )
        .orderBy(postAssets.postId, postAssets.sortOrder)

      allMediaAssets = assetResults
    }

    // Get downloadable assets for download menu (non-previewable: audio, documents, 3D)
    let allDownloadableAssets: { postId: string; id: string; url: string; mimeType: string; fileSize: number | null; sortOrder: number }[] = []
    if (allPostIds.length > 0) {
      const downloadableResults = await db
        .select({
          postId: postAssets.postId,
          id: postAssets.id,
          url: postAssets.storageKey,
          mimeType: postAssets.mimeType,
          fileSize: postAssets.fileSize,
          sortOrder: postAssets.sortOrder,
        })
        .from(postAssets)
        .where(
          and(
            inArray(postAssets.postId, allPostIds),
            eq(postAssets.role, 'media'),
            eq(postAssets.isPreviewable, false)
          )
        )
        .orderBy(postAssets.postId, postAssets.sortOrder)

      allDownloadableAssets = downloadableResults
    }

    // Group assets by postId
    const assetsByPostId: Record<string, typeof allMediaAssets> = {}
    for (const asset of allMediaAssets) {
      if (!assetsByPostId[asset.postId]) {
        assetsByPostId[asset.postId] = []
      }
      assetsByPostId[asset.postId].push(asset)
    }

    // Group downloadable assets by postId
    const downloadablesByPostId: Record<string, typeof allDownloadableAssets> = {}
    for (const asset of allDownloadableAssets) {
      if (!downloadablesByPostId[asset.postId]) {
        downloadablesByPostId[asset.postId] = []
      }
      downloadablesByPostId[asset.postId].push(asset)
    }

    return {
      success: true,
      posts: postsToReturn.map(p => {
        // Extract isHidden before spreading to ensure it's preserved
        const isHidden = p.post.isHidden ?? false
        const postAssetsList = assetsByPostId[p.post.id] || []
        const postDownloadablesList = downloadablesByPostId[p.post.id] || []

        // Build the post object, ensuring isHidden is set last
        return {
          ...p.post,
          user: p.user,
          collectCount: collectCounts[p.post.id] || 0,
          // Add first assetId for collectibles (for Orb link)
          ...(p.post.type === 'collectible' && collectibleAssetIds[p.post.id]
            ? { collectibleAssetId: collectibleAssetIds[p.post.id] }
            : {}),
          // Add assetId for protected downloads
          ...(postAssetIds[p.post.id] ? { assetId: postAssetIds[p.post.id] } : {}),
          // Add user's nftMint for editions they own (for Orb link to their NFT)
          ...(p.post.type === 'edition' && userNftMints[p.post.id]
            ? { userNftMint: userNftMints[p.post.id] }
            : {}),
          // Add ordered media assets for multi-asset carousel (only if multiple)
          ...(postAssetsList.length > 1 ? { assets: postAssetsList } : {}),
          // Add downloadable assets for download menu
          ...(postDownloadablesList.length > 0 ? { downloadableAssets: postDownloadablesList } : {}),
          // Set isHidden LAST to ensure it's definitely included
          isHidden,
        }
      }),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getFeed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feed.',
    }
  }
})

/**
 * Get posts by a specific user
 */
export const getUserPosts = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(userPostsQuerySchema, input)
    const { userId, cursor, limit } = authResult.input

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    // Build conditions
    const conditions = [
      eq(posts.userId, userId),
      eq(posts.isDeleted, false),
      ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
    ]

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    // Execute query
    const userPosts = await db
      .select()
      .from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = userPosts.length > limit
    const postsToReturn = hasMore ? userPosts.slice(0, limit) : userPosts

    // Get collect counts for collectibles
    const collectiblePostIds = postsToReturn
      .filter(p => p.type === 'collectible')
      .map(p => p.id)

    let collectCounts: Record<string, number> = {}
    if (collectiblePostIds.length > 0) {
      const countResults = await db
        .select({
          postId: collections.postId,
          count: count(),
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectiblePostIds),
            eq(collections.status, 'confirmed')
          )
        )
        .groupBy(collections.postId)

      collectCounts = Object.fromEntries(
        countResults.map(r => [r.postId, r.count])
      )
    }

    const lastPost = postsToReturn[postsToReturn.length - 1]
    const nextCursor = hasMore && lastPost
      ? lastPost.createdAt.toISOString()
      : null

    return {
      success: true,
      posts: postsToReturn.map(p => ({
        ...p,
        collectCount: collectCounts[p.id] || 0,
      })),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getUserPosts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user posts.',
    }
  }
})

/**
 * Get post count for a user
 */
export const getUserPostCount = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { userId } = z.object({ userId: z.string().uuid() }).parse(rawData)

    const result = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false)
        )
      )

    return {
      success: true,
      count: result[0]?.count || 0,
    }
  } catch (error) {
    console.error('Error in getUserPostCount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post count.',
    }
  }
})

/**
 * Regenerate metadata for a post that's missing metadataUrl
 * Useful for fixing posts created before metadata generation was added
 */
export const regeneratePostMetadata = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;

    const { postId } = z.object({
      postId: z.string().uuid(),
    }).parse(rawData);

    // Get post and creator
    const postResult = await db
      .select({
        post: posts,
        creator: {
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          walletAddress: users.walletAddress,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!postResult.length) {
      return {
        success: false,
        error: 'Post not found',
      };
    }

    const { post, creator } = postResult[0];

    if (post.type !== 'collectible' && post.type !== 'edition') {
      return {
        success: false,
        error: 'Post is not an NFT type (collectible or edition)',
      };
    }

    // Generate and upload metadata
    const metadata = generateNftMetadata(
      {
        id: post.id,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
        coverUrl: post.coverUrl,
        type: post.type,
        maxSupply: post.maxSupply,
        price: post.price,
        currency: post.currency,
        nftName: post.nftName,
        nftSymbol: post.nftSymbol,
        nftDescription: post.nftDescription,
        sellerFeeBasisPoints: post.sellerFeeBasisPoints,
        isMutable: post.isMutable,
        categories: post.categories ? stringsToCategories(post.categories as string[]) : null,
      },
      creator
    );

    const metadataResult = await uploadMetadataJson(metadata, post.id);

    if (!metadataResult.success) {
      return {
        success: false,
        error: 'Failed to upload metadata',
      };
    }

    // Update post with metadata URL
    await db
      .update(posts)
      .set({ metadataUrl: metadataResult.url })
      .where(eq(posts.id, postId));

    return {
      success: true,
      metadataUrl: metadataResult.url,
    };
  } catch (error) {
    console.error('Error regenerating post metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate metadata',
    };
  }
});

/**
 * Get post edit state (collects/purchases count for UI field locking)
 */
export const getPostEditState = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input
    
    const { postId } = z.object({ postId: z.string().uuid() }).parse(rawData)

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Check confirmed collects
    let hasConfirmedCollects = false
    if (post.type === 'collectible') {
      const collectCount = await db
        .select({ count: count() })
        .from(collections)
        .where(
          and(
            eq(collections.postId, postId),
            eq(collections.status, 'confirmed')
          )
        )
      hasConfirmedCollects = (collectCount[0]?.count || 0) > 0
    }

    // Check confirmed purchases
    let hasConfirmedPurchases = false
    if (post.type === 'edition') {
      const purchaseCount = await db
        .select({ count: count() })
        .from(purchases)
        .where(
          and(
            eq(purchases.postId, postId),
            eq(purchases.status, 'confirmed')
          )
        )
      hasConfirmedPurchases = (purchaseCount[0]?.count || 0) > 0
    }

    // Determine minted state
    // For collectibles: minted if any confirmed collect OR mintedAt is set
    // For editions: minted if mintedAt is set (master edition created)
    const isMinted = post.type === 'collectible' 
      ? (hasConfirmedCollects || !!post.mintedAt)
      : !!post.mintedAt
    const mintedIsMutable = post.mintedIsMutable ?? true
    
    // NFT fields locking logic:
    // Both editions and collectibles: locked after any mint
    // On-chain metadata updates are not yet implemented (see tasks.md 11.13)
    // When on-chain updates are implemented, mutable editions will allow editing
    const areNftFieldsLocked = isMinted

    // On-chain update would be available for editions that are minted AND mutable
    // Currently NOT implemented - creator must sign update transaction client-side
    // See tasks.md section 11.13 for implementation plan
    const canUpdateOnChain = false // Disabled until on-chain updates are implemented
    // Future: post.type === 'edition' && isMinted && mintedIsMutable

    return {
      success: true,
      hasConfirmedCollects,
      hasConfirmedPurchases,
      // Minted state
      isMinted,
      mintedAt: post.mintedAt,
      mintedIsMutable,
      mintedMetadataJson: post.mintedMetadataJson,
      areNftFieldsLocked,
      // On-chain sync state
      canUpdateOnChain,
      onchainSyncStatus: post.onchainSyncStatus,
      lastOnchainSyncAt: post.lastOnchainSyncAt,
      // Time window state
      mintWindowStart: post.mintWindowStart,
      mintWindowEnd: post.mintWindowEnd,
      areTimeWindowFieldsLocked: hasConfirmedPurchases,
    }
  } catch (error) {
    console.error('Error in getPostEditState:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post edit state.',
    }
  }
})

/**
 * Update post with edit rules validation
 */
const updatePostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid().optional(), // No longer required - using server-side auth
  caption: z.string().max(2000).optional().nullable(),
  categories: z.array(z.string()).max(3).optional().nullable(), // Max 3 categories, validated against presets
  // Edition-only fields (only editable when zero purchases)
  nftName: z.string().max(32).optional().nullable(),
  nftSymbol: z.string().max(10).optional().nullable(),
  nftDescription: z.string().max(5000).optional().nullable(),
  sellerFeeBasisPoints: z.number().int().min(0).max(1000).optional().nullable(),
  isMutable: z.boolean().optional(),
  price: z.number().int().positive().optional().nullable(),
  currency: currencySchema.optional().nullable(),
  maxSupply: z.number().int().positive().optional().nullable(),
  // Timed edition fields
  mintWindowEnabled: z.boolean().optional(),
  mintWindowStartMode: z.enum(['now', 'scheduled']).optional(),
  mintWindowStartTime: z.string().datetime().optional().nullable(),
  mintWindowDurationHours: z.number().positive().optional().nullable(),
})

export const updatePost = createServerFn({
  method: 'POST',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    // Verify authentication using withAuth helper
    // This extracts _authorization, verifies token, strips it from input, and parses schema
    const result = await withAuth(updatePostSchema, input)
    
    if (!result) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      }
    }

    const { auth, input: parsed } = result
    const { postId, ...updates } = parsed

    // Use server-verified user ID
    const userId = auth.userId

    // Validate and normalize categories if provided
    let validatedCategories: Category[] | null = null
    if (updates.categories !== undefined) {
      validatedCategories = validateCategories(updates.categories)
      // Convert empty array to null for DB storage
      if (validatedCategories.length === 0) {
        validatedCategories = null
      }
    }

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Check ownership
    if (post.userId !== userId) {
      return {
        success: false,
        error: 'You do not have permission to edit this post.',
      }
    }

    // Check for confirmed collects/purchases
    let hasConfirmedCollects = false
    let hasConfirmedPurchases = false

    if (post.type === 'collectible') {
      const collectCount = await db
        .select({ count: count() })
        .from(collections)
        .where(
          and(
            eq(collections.postId, postId),
            eq(collections.status, 'confirmed')
          )
        )
      hasConfirmedCollects = (collectCount[0]?.count || 0) > 0
    }

    if (post.type === 'edition') {
      const purchaseCount = await db
        .select({ count: count() })
        .from(purchases)
        .where(
          and(
            eq(purchases.postId, postId),
            eq(purchases.status, 'confirmed')
          )
        )
      hasConfirmedPurchases = (purchaseCount[0]?.count || 0) > 0
    }

    // Apply edit rules
    const allowedUpdates: Partial<typeof posts.$inferInsert> = {}

    // Caption is always editable
    if (updates.caption !== undefined) {
      allowedUpdates.caption = updates.caption
    }

    // All posts can edit categories
    if (validatedCategories !== null || (updates.categories !== undefined && validatedCategories === null)) {
      allowedUpdates.categories = validatedCategories ? categoriesToStrings(validatedCategories) : null
    }

    // Standard posts: only caption
    if (post.type === 'post') {
      if (updates.nftName !== undefined || updates.nftSymbol !== undefined || 
          updates.nftDescription !== undefined || updates.sellerFeeBasisPoints !== undefined ||
          updates.isMutable !== undefined || updates.price !== undefined ||
          updates.currency !== undefined || updates.maxSupply !== undefined) {
        return {
          success: false,
          error: 'Standard posts can only have their caption edited.',
        }
      }
    }

    // Collectibles: NFT metadata editable before first mint, locked after
    // No on-chain update support for cNFTs (Bubblegum), so lock metadata after minting
    if (post.type === 'collectible') {
      // Commerce fields never apply to collectibles (always free)
      if (updates.price !== undefined || updates.currency !== undefined || updates.maxSupply !== undefined) {
        return {
          success: false,
          error: 'Collectibles are always free. Pricing fields cannot be set.',
        }
      }
      
      // Check if minted (any confirmed collect)
      const isMinted = hasConfirmedCollects || !!post.mintedAt
      
      // NFT metadata fields are locked after minting for collectibles
      // (no Bubblegum update support)
      if (isMinted) {
        if (updates.nftName !== undefined || updates.nftSymbol !== undefined || 
            updates.nftDescription !== undefined || updates.sellerFeeBasisPoints !== undefined ||
            updates.isMutable !== undefined) {
          return {
            success: false,
            error: 'This collectible has been minted. NFT metadata cannot be changed.',
          }
        }
        // Also lock categories after minting (they're on-chain traits)
        if (updates.categories !== undefined) {
          return {
            success: false,
            error: 'This collectible has been minted. Categories cannot be changed.',
          }
        }
      } else {
        // Pre-mint: allow all NFT metadata field updates
        if (updates.nftName !== undefined) {
          allowedUpdates.nftName = updates.nftName
        }
        if (updates.nftSymbol !== undefined) {
          allowedUpdates.nftSymbol = updates.nftSymbol
        }
        if (updates.nftDescription !== undefined) {
          allowedUpdates.nftDescription = updates.nftDescription
        }
        if (updates.sellerFeeBasisPoints !== undefined) {
          allowedUpdates.sellerFeeBasisPoints = updates.sellerFeeBasisPoints
        }
        if (updates.isMutable !== undefined) {
          allowedUpdates.isMutable = updates.isMutable
        }
      }
    }

    // Editions: Edit rules based on minting and mutability status
    if (post.type === 'edition') {
      // Determine edit state
      const isMinted = !!post.mintedAt
      const mintedIsMutable = post.mintedIsMutable ?? true
      
      // NFT metadata fields are locked if: minted AND immutable
      const areNftFieldsLocked = isMinted && !mintedIsMutable
      
      // Pricing fields (price, currency, maxSupply) are locked after any confirmed purchase
      const arePricingFieldsLocked = hasConfirmedPurchases

      // Check pricing field updates
      if (arePricingFieldsLocked) {
        if (updates.price !== undefined || updates.currency !== undefined || updates.maxSupply !== undefined) {
          return {
            success: false,
            error: 'This edition has been purchased. Price and supply cannot be edited.',
          }
        }
      }

      // Check NFT metadata field updates
      if (areNftFieldsLocked) {
        if (updates.nftName !== undefined || updates.nftSymbol !== undefined || 
            updates.nftDescription !== undefined || updates.sellerFeeBasisPoints !== undefined ||
            updates.isMutable !== undefined) {
          return {
            success: false,
            error: 'This edition was minted as immutable. NFT metadata cannot be edited.',
          }
        }
      }

      // Apply allowed updates based on state
      
      // NFT metadata fields: editable if not locked
      if (!areNftFieldsLocked) {
        if (updates.nftName !== undefined) {
          allowedUpdates.nftName = updates.nftName
        }
        if (updates.nftSymbol !== undefined) {
          allowedUpdates.nftSymbol = updates.nftSymbol
        }
        if (updates.nftDescription !== undefined) {
          allowedUpdates.nftDescription = updates.nftDescription
        }
        if (updates.sellerFeeBasisPoints !== undefined) {
          allowedUpdates.sellerFeeBasisPoints = updates.sellerFeeBasisPoints
        }
        // isMutable can only be changed pre-mint
        if (updates.isMutable !== undefined && !isMinted) {
          allowedUpdates.isMutable = updates.isMutable
        }
      }

      // Pricing fields: editable if no purchases yet
      if (!arePricingFieldsLocked) {
        if (updates.price !== undefined) {
          allowedUpdates.price = updates.price
        }
        if (updates.currency !== undefined) {
          allowedUpdates.currency = updates.currency
        }
        if (updates.maxSupply !== undefined) {
          allowedUpdates.maxSupply = updates.maxSupply
        }

        // Validate minimum price if price or currency is being updated
        if (updates.price !== undefined || updates.currency !== undefined) {
          const finalPrice = updates.price ?? post.price
          const finalCurrency = updates.currency ?? post.currency
          if (finalPrice && finalCurrency) {
            const priceError = validateEditionPrice(finalPrice, finalCurrency)
            if (priceError) {
              return {
                success: false,
                error: priceError,
              }
            }
          }
        }
      }

      // Time window: locked after first purchase (same as pricing fields)
      if (updates.mintWindowEnabled !== undefined) {
        if (arePricingFieldsLocked) {
          return {
            success: false,
            error: 'This edition has been purchased. Time window cannot be edited.',
          }
        }
        const windowResult = validateMintWindow({
          mintWindowEnabled: updates.mintWindowEnabled,
          mintWindowStartMode: updates.mintWindowStartMode,
          mintWindowStartTime: updates.mintWindowStartTime,
          mintWindowDurationHours: updates.mintWindowDurationHours,
        }, 'update')
        if (!windowResult.valid) {
          return { success: false, error: windowResult.error }
        }
        allowedUpdates.mintWindowStart = windowResult.mintWindowStart ?? null
        allowedUpdates.mintWindowEnd = windowResult.mintWindowEnd ?? null
      }
    }

    // Check if any updates to apply
    if (Object.keys(allowedUpdates).length === 0) {
      return {
        success: false,
        error: 'No valid updates provided.',
      }
    }

    // Check if metadata needs regeneration (NFT metadata fields changed)
    const metadataAffectingFields: (keyof typeof posts.$inferInsert)[] = [
      'nftName', 'nftSymbol', 'nftDescription', 'sellerFeeBasisPoints', 'isMutable', 'mediaUrl', 'coverUrl', 'categories'
    ]
    const needsMetadataRegen = (post.type === 'collectible' || post.type === 'edition') &&
      metadataAffectingFields.some(field => allowedUpdates[field] !== undefined && allowedUpdates[field] !== post[field as keyof typeof post])

    // Set timestamps
    allowedUpdates.updatedAt = new Date()
    if (!post.editedAt) {
      allowedUpdates.editedAt = new Date()
    }

    // Update post
    const [updatedPost] = await db
      .update(posts)
      .set(allowedUpdates)
      .where(eq(posts.id, postId))
      .returning()

    // Regenerate metadata if needed
    if (needsMetadataRegen && updatedPost.metadataUrl) {
      // Get creator info
      const [creator] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .where(eq(users.id, updatedPost.userId))
        .limit(1)

      if (creator) {
        const metadata = generateNftMetadata(
          {
            id: updatedPost.id,
            caption: updatedPost.caption,
            mediaUrl: updatedPost.mediaUrl,
            coverUrl: updatedPost.coverUrl,
            type: updatedPost.type as 'collectible' | 'edition',
            maxSupply: updatedPost.maxSupply,
            price: updatedPost.price,
            currency: updatedPost.currency as 'SOL' | 'USDC' | null,
            nftName: updatedPost.nftName,
            nftSymbol: updatedPost.nftSymbol,
            nftDescription: updatedPost.nftDescription,
            sellerFeeBasisPoints: updatedPost.sellerFeeBasisPoints,
            isMutable: updatedPost.isMutable,
            categories: updatedPost.categories ? stringsToCategories(updatedPost.categories as string[]) : null,
          },
          creator
        )

        const metadataResult = await uploadMetadataJson(metadata, updatedPost.id, true) // allowOverwrite = true for edits
        
        if (metadataResult.success) {
          await db
            .update(posts)
            .set({ metadataUrl: metadataResult.url })
            .where(eq(posts.id, postId))

          updatedPost.metadataUrl = metadataResult.url
        }
      }
    }

    // Process @mentions in the caption (with diff logic for updates)
    // Always process if caption field was in the update, even if null (to remove old mentions)
    if (updates.caption !== undefined) {
      await processMentions(updatedPost.caption || '', userId, 'post', postId, true)
    }

    // Process #hashtags in the caption (always uses diff logic)
    // Always process if caption field was in the update, even if null (to remove old hashtags)
    if (updates.caption !== undefined) {
      await processHashtags(updatedPost.caption || '', postId)
    }

    return {
      success: true,
      post: updatedPost,
    }
  } catch (error) {
    // Never log sensitive fields
    console.error('Error in updatePost:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post.',
    }
  }
})

// Schema for deletePost input
const deletePostSchema = z.object({
  postId: z.string().uuid(),
})

/**
 * Delete post (soft delete)
 */
export const deletePost = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Verify authentication using withAuth helper
    const result = await withAuth(deletePostSchema, input)
    
    if (!result) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      }
    }

    const { auth, input: parsed } = result
    const { postId } = parsed

    // Use server-verified user ID
    const userId = auth.userId

    // Get post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return {
        success: false,
        error: 'Post not found.',
      }
    }

    // Check ownership
    if (post.userId !== userId) {
      return {
        success: false,
        error: 'You do not have permission to delete this post.',
      }
    }

    // Check for confirmed collects/purchases
    let hasCollects = false
    let hasPurchases = false

    if (post.type === 'collectible') {
      const collectCount = await db
        .select({ count: count() })
        .from(collections)
        .where(
          and(
            eq(collections.postId, postId),
            eq(collections.status, 'confirmed')
          )
        )
      hasCollects = (collectCount[0]?.count || 0) > 0
    }

    if (post.type === 'edition') {
      const purchaseCount = await db
        .select({ count: count() })
        .from(purchases)
        .where(
          and(
            eq(purchases.postId, postId),
            eq(purchases.status, 'confirmed')
          )
        )
      hasPurchases = (purchaseCount[0]?.count || 0) > 0
    }

    // Delete mentions associated with this post
    await deleteMentions('post', postId)

    // Soft delete
    await db
      .update(posts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))

    return {
      success: true,
      warning: (hasCollects || hasPurchases)
        ? `${hasCollects ? 'Collectibles' : 'Editions'} already exist on-chain. Deleting only hides the post in Desperse.`
        : undefined,
    }
  } catch (error) {
    // Never log sensitive fields
    console.error('Error in deletePost:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post.',
    }
  }
})

