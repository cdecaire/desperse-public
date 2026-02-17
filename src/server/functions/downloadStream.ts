/**
 * Download Stream Server Functions
 * 
 * Handles the actual file delivery for gated and public asset downloads.
 * 
 * Flow:
 * 1. Check if asset exists
 * 2. If not gated: stream immediately
 * 3. If gated: validate token, then stream
 * 
 * IMPORTANT: This file uses server-only imports and should never be imported
 * in client-side code.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/server/db'
import { postAssets, downloadTokens } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { getGatedAssetStream, type StorageProviderType } from '@/server/storage/blob'

// ============================================================================
// Asset Download
// ============================================================================

/**
 * Get asset download information
 * 
 * For gated assets: validates token and returns download URL
 * For public assets: returns download URL directly
 * 
 * Since server functions can't stream files directly, this returns a URL
 * that the client can use to fetch the file. For Vercel Blob,
 * we return the storage key (which is the Blob URL) after validation.
 */
export const getAssetDownloadInfo = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  downloadUrl?: string
  contentType?: string
  contentLength?: number
  downloadName?: string
  isGated?: boolean
  error?: string
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input

    const { assetId, token } = z.object({
      assetId: z.string().uuid(),
      token: z.string().optional(),
    }).parse(rawData)

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
        isGated: postAssets.isGated,
      })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return {
        success: false,
        error: 'Asset not found',
      }
    }

    // If asset is gated, validate token
    if (asset.isGated) {
      if (!token) {
        return {
          success: false,
          isGated: true,
          error: 'Authentication required. Use getDownloadNonce and verifyAndIssueToken first.',
        }
      }

      // Validate token
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
        return {
          success: false,
          isGated: true,
          error: 'Invalid or expired token',
        }
      }

      if (tokenRecord.expiresAt < new Date()) {
        return {
          success: false,
          isGated: true,
          error: 'Token has expired. Please authenticate again.',
        }
      }
    }

    // For Vercel Blob, the storageKey IS the URL
    // For R2/S3, we would generate a presigned URL here
    const downloadUrl = asset.storageKey

    return {
      success: true,
      downloadUrl,
      contentType: asset.mimeType,
      contentLength: asset.fileSize ?? undefined,
      downloadName: asset.downloadName ?? undefined,
      isGated: asset.isGated,
    }
  } catch (error) {
    console.error('[getAssetDownloadInfo] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    }
  }
})

/**
 * Check if an asset exists and get basic info (no auth required)
 */
export const getAssetPublicInfo = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean
  exists?: boolean
  isGated?: boolean
  mimeType?: string
  downloadName?: string | null
  postId?: string
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
      return {
        success: true,
        exists: false,
      }
    }

    return {
      success: true,
      exists: true,
      isGated: asset.isGated,
      mimeType: asset.mimeType,
      downloadName: asset.downloadName,
      postId: asset.postId,
    }
  } catch (error) {
    console.error('[getAssetPublicInfo] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get asset info',
    }
  }
})

