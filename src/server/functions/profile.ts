/**
 * Profile server functions
 * Fetch profile data, posts, collections, for-sale listings, and handle profile updates
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { users, posts, collections, purchases, follows } from '@/server/db/schema'
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
} from 'drizzle-orm'
import { z } from 'zod'
import { env } from '@/config/env'
import { uploadToBlob, SUPPORTED_IMAGE_TYPES } from '@/server/storage/blob'
import { isModeratorOrAdmin } from '@/server/utils/auth-helpers'
import { withAuth, withOptionalAuth } from '@/server/auth'

// Shared schemas
const cursorSchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

const profileSlugSchema = z.object({
  slug: z.string().min(1),
})

// URL validation helper - ensures secure URLs only
function validateUrl(url: string): string {
  let normalized = url.trim()
  
  // Add https:// if no protocol is specified
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`
  }
  
  // Validate URL format
  try {
    const urlObj = new URL(normalized)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only http and https protocols are allowed')
    }
    
    // Prevent javascript:, data:, and other dangerous schemes
    const protocol = urlObj.protocol.toLowerCase()
    if (['javascript:', 'data:', 'vbscript:', 'file:', 'about:'].includes(protocol)) {
      throw new Error('Invalid URL protocol')
    }
    
    // Limit URL length (2048 chars is a reasonable limit)
    if (normalized.length > 2048) {
      throw new Error('URL is too long (max 2048 characters)')
    }
    
    return normalized
  } catch (error) {
    throw new Error('Invalid URL format')
  }
}

// Schema for updating profile (no userId - derived from auth)
const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .refine(
      (val) => {
        // Allow all printable Unicode characters (letters, numbers, symbols, emojis, punctuation)
        // But exclude control characters (0x00-0x1F, 0x7F-0x9F) and other non-printable characters
        // This allows emojis, accented characters, and most symbols as per project requirements
        return !/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/.test(val)
      },
      { message: 'Display name contains invalid characters' }
    )
    .optional(),
  bio: z.string().trim().max(280).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  headerBgUrl: z.string().url().optional().nullable(),
  link: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (val) => {
        if (!val || val.length === 0) return true // Allow empty strings
        try {
          validateUrl(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'Invalid URL. Must be a valid http or https URL.' }
    )
    .transform((val) => {
      if (!val || val.trim().length === 0) return null
      return validateUrl(val)
    })
    .optional()
    .nullable(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_.]+$/, 'Slug must be lowercase a-z, 0-9, _ or .')
    .optional(),
})

const USERNAME_LIMIT_DAYS = env.PROFILE_USERNAME_CHANGE_LIMIT_DAYS ?? 30
const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2MB limit for avatars
const HEADER_BG_MAX_BYTES = 5 * 1024 * 1024 // 5MB limit for header backgrounds

function getRemainingDays(targetDate: Date, windowDays: number): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const elapsedDays = (Date.now() - targetDate.getTime()) / msPerDay
  const remaining = windowDays - elapsedDays
  return Math.max(0, Math.ceil(remaining))
}

function nextUsernameChangeAtDate(updatedAt: Date, createdAt: Date) {
  const base = updatedAt || createdAt
  const msPerDay = 1000 * 60 * 60 * 24
  return new Date(base.getTime() + USERNAME_LIMIT_DAYS * msPerDay)
}

/**
 * Upload avatar from file data or external URL (server rehosts)
 */
const uploadAvatarSchema = z.object({
  userId: z.string().uuid(),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  url: z.string().url().optional(),
}).refine(
  (data) => (data.fileData && data.fileName && data.mimeType && data.fileSize) || data.url,
  { message: 'Provide either fileData with metadata or a URL.' },
).refine(
  (data) => !(data.fileData && data.url),
  { message: 'Provide only one source: file or URL.' },
)

/**
 * Upload header background from file data or external URL (server rehosts)
 */
const uploadHeaderBgSchema = z.object({
  userId: z.string().uuid(),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  url: z.string().url().optional(),
}).refine(
  (data) => (data.fileData && data.fileName && data.mimeType && data.fileSize) || data.url,
  { message: 'Provide either fileData with metadata or a URL.' },
).refine(
  (data) => !(data.fileData && data.url),
  { message: 'Provide only one source: file or URL.' },
)

export const uploadHeaderBg = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const data = uploadHeaderBgSchema.parse(rawData)

    const { Buffer } = await import('node:buffer')
    let fileBuffer: Buffer
    let mimeType: string
    let fileName: string

    if (data.url) {
      const response = await fetch(data.url)
      if (!response.ok) {
        return { success: false, status: 400, error: 'Failed to fetch image from URL.' }
      }
      const contentType = response.headers.get('content-type') || ''
      if (!SUPPORTED_IMAGE_TYPES.includes(contentType)) {
        return { success: false, status: 400, error: 'Unsupported image type for header background.' }
      }
      const contentLength = response.headers.get('content-length')
      if (contentLength && Number.parseInt(contentLength, 10) > HEADER_BG_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 5MB limit.' }
      }
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > HEADER_BG_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 5MB limit.' }
      }
      fileBuffer = Buffer.from(arrayBuffer)
      mimeType = contentType
      const urlParts = data.url.split('/')
      fileName = urlParts[urlParts.length - 1] || 'header-bg'
    } else {
      // File upload path
      if (!data.fileData || !data.mimeType || !data.fileName || !data.fileSize) {
        return { success: false, status: 400, error: 'Missing file data.' }
      }
      if (!SUPPORTED_IMAGE_TYPES.includes(data.mimeType)) {
        return { success: false, status: 400, error: 'Unsupported image type for header background.' }
      }
      if (data.fileSize > HEADER_BG_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 5MB limit.' }
      }
      fileBuffer = Buffer.from(data.fileData, 'base64')
      mimeType = data.mimeType
      fileName = data.fileName
    }

    // Convert Buffer to Uint8Array for Blob construction to satisfy TS
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
    const uploadResult = await uploadToBlob(blob, fileName, mimeType, 'headers')

    if (!uploadResult.success) {
      return { success: false, status: 500, error: uploadResult.error }
    }

    // Persist header background to user
    await db
      .update(users)
      .set({
        headerBgUrl: uploadResult.url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, data.userId))

    return {
      success: true,
      url: uploadResult.url,
    }
  } catch (error) {
    console.error('Error in uploadHeaderBg:', error)
    if (error instanceof z.ZodError) {
      return { success: false, status: 400, error: error.issues.map((i) => i.message).join(', ') }
    }
    return { success: false, status: 500, error: 'Failed to upload header background.' }
  }
})

export const uploadAvatar = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const data = uploadAvatarSchema.parse(rawData)

    const { Buffer } = await import('node:buffer')
    let fileBuffer: Buffer
    let mimeType: string
    let fileName: string

    if (data.url) {
      const response = await fetch(data.url)
      if (!response.ok) {
        return { success: false, status: 400, error: 'Failed to fetch image from URL.' }
      }
      const contentType = response.headers.get('content-type') || ''
      if (!SUPPORTED_IMAGE_TYPES.includes(contentType)) {
        return { success: false, status: 400, error: 'Unsupported image type for avatar.' }
      }
      const contentLength = response.headers.get('content-length')
      if (contentLength && Number.parseInt(contentLength, 10) > AVATAR_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 2MB limit.' }
      }
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > AVATAR_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 2MB limit.' }
      }
      fileBuffer = Buffer.from(arrayBuffer)
      mimeType = contentType
      const urlParts = data.url.split('/')
      fileName = urlParts[urlParts.length - 1] || 'avatar'
    } else {
      // File upload path
      if (!data.fileData || !data.mimeType || !data.fileName || !data.fileSize) {
        return { success: false, status: 400, error: 'Missing file data.' }
      }
      if (!SUPPORTED_IMAGE_TYPES.includes(data.mimeType)) {
        return { success: false, status: 400, error: 'Unsupported image type for avatar.' }
      }
      if (data.fileSize > AVATAR_MAX_BYTES) {
        return { success: false, status: 400, error: 'Image exceeds 2MB limit.' }
      }
      fileBuffer = Buffer.from(data.fileData, 'base64')
      mimeType = data.mimeType
      fileName = data.fileName
    }

    // Convert Buffer to Uint8Array for Blob construction to satisfy TS
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
    const uploadResult = await uploadToBlob(blob, fileName, mimeType, 'avatars')

    if (!uploadResult.success) {
      return { success: false, status: 500, error: uploadResult.error }
    }

    // Persist avatar to user
    await db
      .update(users)
      .set({
        avatarUrl: uploadResult.url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, data.userId))

    return {
      success: true,
      url: uploadResult.url,
    }
  } catch (error) {
    console.error('Error in uploadAvatar:', error)
    if (error instanceof z.ZodError) {
      return { success: false, status: 400, error: error.issues.map((i) => i.message).join(', ') }
    }
    return { success: false, status: 500, error: 'Failed to upload avatar.' }
  }
})

function mapPostToCard(post: typeof posts.$inferSelect, user: {
  id: string
  displayName: string | null
  usernameSlug: string
  avatarUrl: string | null
}, flags?: Partial<{ isCollected: boolean; isEdition: boolean; remainingSupply: number | null }>) {
  const isEdition = post.type === 'edition'
  const remainingSupply =
    isEdition && post.maxSupply != null
      ? Math.max(0, post.maxSupply - (post.currentSupply ?? 0))
      : null

  return {
    ...post,
    user,
    isCollected: flags?.isCollected ?? false,
    isEdition: flags?.isEdition ?? isEdition,
    remainingSupply,
  }
}

/**
 * Get user by slug with profile stats
 */
export const getUserBySlug = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { slug } = profileSlugSchema.parse(rawData)

    const [user] = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        headerBgUrl: users.headerBgUrl,
        link: users.link,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        usernameLastChangedAt: users.usernameLastChangedAt,
      })
      .from(users)
      .where(eq(users.usernameSlug, slug))
      .limit(1)

    if (!user) {
      return {
        success: false,
        status: 404,
        error: 'User not found.',
      }
    }

    // Posts count (public, not deleted/hidden)
    const postsResult = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.userId, user.id),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
        ),
      )

    // Collected count (distinct post ids across confirmed collections + purchases)
    const collectedIds = new Set<string>()

    const collectionRows = await db
      .select({ postId: collections.postId })
      .from(collections)
      .where(
        and(
          eq(collections.userId, user.id),
          eq(collections.status, 'confirmed'),
        ),
      )
    collectionRows.forEach((row) => collectedIds.add(row.postId))

    const purchaseRows = await db
      .select({ postId: purchases.postId })
      .from(purchases)
      .where(
        and(
          eq(purchases.userId, user.id),
          eq(purchases.status, 'confirmed'),
        ),
      )
    purchaseRows.forEach((row) => collectedIds.add(row.postId))

    // Filter out deleted posts from collected count
    let validCollectedCount = 0
    if (collectedIds.size > 0) {
      const validPosts = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            inArray(posts.id, Array.from(collectedIds)),
            eq(posts.isDeleted, false),
            eq(posts.isHidden, false),
          ),
        )
      validCollectedCount = validPosts.length
    }

    // For sale count (active editions with remaining supply > 0 or open editions)
    const forSaleResult = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.userId, user.id),
          eq(posts.type, 'edition'),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
          or(
            isNull(posts.maxSupply),
            lt(posts.currentSupply, posts.maxSupply),
          ),
        ),
      )

    // Optional follow stats (best-effort)
    let followersCount: number | undefined
    let followingCount: number | undefined
    let collectorsCount: number | undefined
    try {
      const followerResult = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, user.id))

      const followingResult = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followerId, user.id))

      followersCount = followerResult[0]?.count || 0
      followingCount = followingResult[0]?.count || 0

      // Count unique collectors (users who collected/purchased items created by this user)
      // First get all post IDs created by this user
      const userPostIds = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.userId, user.id),
            eq(posts.isDeleted, false),
            eq(posts.isHidden, false),
          ),
        )

      if (userPostIds.length > 0) {
        const postIdList = userPostIds.map((p) => p.id)
        const collectorIds = new Set<string>()

        // Get collectors from collections table
        const collectionCollectors = await db
          .select({ userId: collections.userId })
          .from(collections)
          .where(
            and(
              inArray(collections.postId, postIdList),
              eq(collections.status, 'confirmed'),
            ),
          )
        collectionCollectors.forEach((row) => collectorIds.add(row.userId))

        // Get collectors from purchases table
        const purchaseCollectors = await db
          .select({ userId: purchases.userId })
          .from(purchases)
          .where(
            and(
              inArray(purchases.postId, postIdList),
              eq(purchases.status, 'confirmed'),
            ),
          )
        purchaseCollectors.forEach((row) => collectorIds.add(row.userId))

        // Exclude the creator themselves from the collectors count
        collectorIds.delete(user.id)

        collectorsCount = collectorIds.size
      } else {
        collectorsCount = 0
      }
    } catch (statsError) {
      console.warn('Follow stats optional error:', statsError)
    }

    // Only return nextUsernameChangeAt if user has already changed their username
    // usernameLastChangedAt is null for new users (first change is free)
    const nextUsernameChangeAt = user.usernameLastChangedAt
      ? nextUsernameChangeAtDate(user.usernameLastChangedAt, user.createdAt)
      : null

    return {
      success: true,
      user: {
        id: user.id,
        slug: user.usernameSlug,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        headerBgUrl: user.headerBgUrl,
        link: user.link,
        createdAt: user.createdAt,
      },
      stats: {
        posts: postsResult[0]?.count || 0,
        collected: validCollectedCount,
        forSale: forSaleResult[0]?.count || 0,
      },
      followersCount,
      followingCount,
      collectorsCount,
      nextUsernameChangeAt,
    }
  } catch (error) {
    console.error('Error in getUserBySlug:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch profile.',
    }
  }
})

/**
 * Get posts created by a user (profile posts tab)
 */
export const getUserPosts = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const authResult = await withOptionalAuth(cursorSchema, input)
    const { userId, cursor, limit } = authResult.input

    // Check if current user is moderator/admin (can see hidden posts)
    // Uses verified userId from token instead of client-provided value
    const canSeeHidden = authResult.auth ? await isModeratorOrAdmin(authResult.auth.userId) : false

    const conditions = [
      eq(posts.userId, userId),
      eq(posts.isDeleted, false),
      ...(canSeeHidden ? [] : [eq(posts.isHidden, false)]),
    ]

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const toReturn = hasMore ? rows.slice(0, limit) : rows
    const collectibleIds = toReturn
      .filter((r) => r.post.type === 'collectible')
      .map((r) => r.post.id)

    let collectCounts: Record<string, number> = {}
    if (collectibleIds.length > 0) {
      const countResults = await db
        .select({
          postId: collections.postId,
          count: count(),
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectibleIds),
            eq(collections.status, 'confirmed'),
          ),
        )
        .groupBy(collections.postId)

      collectCounts = Object.fromEntries(countResults.map((r) => [r.postId, r.count]))
    }

    const last = toReturn[toReturn.length - 1]
    const nextCursor = hasMore && last ? last.post.createdAt.toISOString() : null

    return {
      success: true,
      posts: toReturn.map((row) => ({
        ...mapPostToCard(row.post, row.user),
        collectCount: collectCounts[row.post.id] || 0,
      })),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getUserPosts (profile):', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch user posts.',
    }
  }
})

/**
 * Get collected items for a user (confirmed collections + purchases)
 */
export const getUserCollections = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { userId, cursor, limit } = cursorSchema.parse(rawData)

    const collectedIds = new Set<string>()

    const collectionRows = await db
      .select({ postId: collections.postId })
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.status, 'confirmed'),
        ),
      )
    collectionRows.forEach((row) => collectedIds.add(row.postId))

    const purchaseRows = await db
      .select({ postId: purchases.postId })
      .from(purchases)
      .where(
        and(
          eq(purchases.userId, userId),
          eq(purchases.status, 'confirmed'),
        ),
      )
    purchaseRows.forEach((row) => collectedIds.add(row.postId))

    if (collectedIds.size === 0) {
      return {
        success: true,
        posts: [],
        hasMore: false,
        nextCursor: null,
      }
    }

    const conditions = [
      inArray(posts.id, Array.from(collectedIds)),
      // Filter out deleted and hidden posts
      eq(posts.isDeleted, false),
      eq(posts.isHidden, false),
    ]

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const toReturn = hasMore ? rows.slice(0, limit) : rows
    
    // Get collect counts for collectibles
    const collectibleIds = toReturn
      .filter((r) => r.post.type === 'collectible')
      .map((r) => r.post.id)

    let collectCounts: Record<string, number> = {}
    if (collectibleIds.length > 0) {
      const countResults = await db
        .select({
          postId: collections.postId,
          count: count(),
        })
        .from(collections)
        .where(
          and(
            inArray(collections.postId, collectibleIds),
            eq(collections.status, 'confirmed'),
          ),
        )
        .groupBy(collections.postId)

      collectCounts = Object.fromEntries(countResults.map((r) => [r.postId, r.count]))
    }

    const last = toReturn[toReturn.length - 1]
    const nextCursor = hasMore && last ? last.post.createdAt.toISOString() : null

    return {
      success: true,
      posts: toReturn.map((row) => ({
        ...mapPostToCard(row.post, row.user, {
          isCollected: true,
          isEdition: row.post.type === 'edition',
        }),
        collectCount: row.post.type === 'collectible' ? (collectCounts[row.post.id] || 0) : undefined,
      })),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getUserCollections:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch collections.',
    }
  }
})

/**
 * Get active editions for sale by a user
 */
export const getUserForSale = createServerFn({
  method: 'GET',
// @ts-expect-error -- TanStack Start dual-context type inference
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { userId, cursor, limit } = cursorSchema.parse(rawData)

    const conditions = [
      eq(posts.userId, userId),
      eq(posts.type, 'edition'),
      eq(posts.isDeleted, false),
      eq(posts.isHidden, false),
      or(isNull(posts.maxSupply), lt(posts.currentSupply, posts.maxSupply)),
    ]

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const toReturn = hasMore ? rows.slice(0, limit) : rows
    const last = toReturn[toReturn.length - 1]
    const nextCursor = hasMore && last ? last.post.createdAt.toISOString() : null

    return {
      success: true,
      posts: toReturn.map((row) =>
        mapPostToCard(row.post, row.user, {
          isEdition: true,
        }),
      ),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    console.error('Error in getUserForSale:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch for-sale editions.',
    }
  }
})

/**
 * Get list of unique collectors for a user's creations
 * Returns users who have collected or purchased items created by this user
 */
const collectorsListSchema = z.object({
  userId: z.string().uuid(),
  currentUserId: z.string().uuid().optional(),
})

export const getCollectorsList = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { userId, currentUserId } = collectorsListSchema.parse(rawData)

    // Get all post IDs created by this user
    const userPostIds = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
        ),
      )

    if (userPostIds.length === 0) {
      return {
        success: true,
        collectors: [],
      }
    }

    const postIdList = userPostIds.map((p) => p.id)
    const collectorIds = new Set<string>()

    // Get collectors from collections table
    const collectionCollectors = await db
      .select({ userId: collections.userId })
      .from(collections)
      .where(
        and(
          inArray(collections.postId, postIdList),
          eq(collections.status, 'confirmed'),
        ),
      )
    collectionCollectors.forEach((row) => collectorIds.add(row.userId))

    // Get collectors from purchases table
    const purchaseCollectors = await db
      .select({ userId: purchases.userId })
      .from(purchases)
      .where(
        and(
          inArray(purchases.postId, postIdList),
          eq(purchases.status, 'confirmed'),
        ),
      )
    purchaseCollectors.forEach((row) => collectorIds.add(row.userId))

    // Exclude the creator themselves from the collectors list
    collectorIds.delete(userId)

    if (collectorIds.size === 0) {
      return {
        success: true,
        collectors: [],
      }
    }

    // Fetch user details for all collectors
    const collectorsList = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(collectorIds)))

    // If currentUserId provided, check if current user follows each collector
    let followingMap: Record<string, boolean> = {}
    if (currentUserId) {
      const followingRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            inArray(follows.followingId, Array.from(collectorIds)),
          ),
        )
      followingMap = Object.fromEntries(followingRows.map((r) => [r.followingId, true]))
    }

    return {
      success: true,
      collectors: collectorsList.map((collector) => ({
        id: collector.id,
        usernameSlug: collector.usernameSlug,
        displayName: collector.displayName,
        avatarUrl: collector.avatarUrl,
        isFollowingBack: followingMap[collector.id] || false,
      })),
    }
  } catch (error) {
    console.error('Error in getCollectorsList:', error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch collectors list.',
    }
  }
})

/**
 * Update profile fields with validation and rate limiting for slug changes
 */
export const updateProfile = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user using withAuth helper
    const result = await withAuth(updateProfileSchema, input)
    if (!result) {
      return {
        success: false,
        status: 401,
        error: 'Authentication required. Please log in.',
      }
    }

    const { auth, input: parsed } = result
    const { slug, ...rest } = parsed

    // Use server-verified userId
    const userId = auth.userId

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return {
        success: false,
        status: 404,
        error: 'User not found.',
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {}

    if (rest.displayName !== undefined) {
      updates.displayName = rest.displayName
    }

    if (rest.bio !== undefined) {
      updates.bio = rest.bio
    }

    if (rest.avatarUrl !== undefined) {
      updates.avatarUrl = rest.avatarUrl
    }

    if (rest.headerBgUrl !== undefined) {
      updates.headerBgUrl = rest.headerBgUrl
    }

    if (rest.link !== undefined) {
      updates.link = rest.link
    }

    if (slug !== undefined && slug !== user.usernameSlug) {
      const normalized = slug.toLowerCase().replace(/[^a-z0-9_.]/g, '')

      if (normalized.length < 3 || normalized.length > 24 || !/^[a-z0-9_.]+$/.test(normalized)) {
        return {
          success: false,
          status: 400,
          error: 'Invalid username format.',
        }
      }

      // Rate limit username changes using dedicated tracking field
      // First change is always free (usernameLastChangedAt is null for new users)
      if (user.usernameLastChangedAt) {
        const daysRemaining = getRemainingDays(user.usernameLastChangedAt, USERNAME_LIMIT_DAYS)
        if (daysRemaining > 0) {
          const nextUsernameChangeAt = nextUsernameChangeAtDate(user.usernameLastChangedAt, user.createdAt)
          console.info('[updateProfile] username change rate limited', {
            userId,
            currentSlug: user.usernameSlug,
            requestedSlug: normalized,
            usernameLastChangedAt: user.usernameLastChangedAt,
            daysRemaining,
          })
          return {
            success: false,
            status: 429,
            error: `You can update your username again in ${daysRemaining} days.`,
            nextUsernameChangeAt,
          }
        }
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.usernameSlug, normalized))
        .limit(1)

      if (existing.length > 0 && existing[0].id !== user.id) {
        return {
          success: false,
          status: 409,
          error: 'Username already taken.',
        }
      }

      updates.usernameSlug = normalized
      // Track when username was changed for rate limiting
      updates.usernameLastChangedAt = new Date()
    }

    if (Object.keys(updates).length === 0) {
      // No changes - return current user with existing rate limit info
      const nextUsernameChangeAt = user.usernameLastChangedAt
        ? nextUsernameChangeAtDate(user.usernameLastChangedAt, user.createdAt)
        : null
      return {
        success: true,
        user: {
          id: user.id,
          slug: user.usernameSlug,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          headerBgUrl: user.headerBgUrl,
          link: user.link,
          createdAt: user.createdAt,
        },
        nextUsernameChangeAt,
      }
    }

    updates.updatedAt = new Date()

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        headerBgUrl: users.headerBgUrl,
        link: users.link,
        createdAt: users.createdAt,
        usernameLastChangedAt: users.usernameLastChangedAt,
      })

    // Only show rate limit if username has been changed
    const nextUsernameChangeAt = updated.usernameLastChangedAt
      ? nextUsernameChangeAtDate(updated.usernameLastChangedAt, updated.createdAt)
      : null

    return {
      success: true,
      user: {
        id: updated.id,
        slug: updated.usernameSlug,
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        headerBgUrl: updated.headerBgUrl,
        link: updated.link,
        createdAt: updated.createdAt,
      },
      nextUsernameChangeAt,
    }
  } catch (error) {
    console.error('Error in updateProfile:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        status: 400,
        error: error.issues.map((i) => i.message).join(', '),
      }
    }

    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to update profile.',
    }
  }
})


