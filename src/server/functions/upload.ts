/**
 * Upload server functions
 * Handles media file uploads to Vercel Blob storage
 *
 * SECURITY: All upload/delete operations require authentication.
 * This prevents unauthenticated users from uploading files or
 * deleting other users' files.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  uploadToBlob,
  deleteFromBlob,
  isValidMediaType,
  isValidFileSize,
  isGlbByExtension,
  SUPPORTED_MEDIA_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_3D_TYPES,
  MAX_UPLOAD_MB,
  type MediaType,
} from '@/server/storage/blob'
import { env } from '@/config/env'
import { withAuth } from '@/server/auth'

// Schema for upload request
const uploadMediaSchema = z.object({
  // File data as base64 string (from client)
  fileData: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
})

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>

export interface UploadMediaResult {
  success: true
  url: string
  mediaType: MediaType
}

export interface UploadMediaError {
  success: false
  error: string
  code: 'AUTH_REQUIRED' | 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED' | 'STORAGE_UNAVAILABLE' | 'VALIDATION_ERROR'
}

/**
 * Upload media file to Vercel Blob storage
 * Accepts base64-encoded file data from client
 *
 * SECURITY: Requires authentication to prevent unauthenticated uploads.
 */
export const uploadMedia = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<UploadMediaResult | UploadMediaError> => {
  try {
    // Verify authentication and parse input
    let authResult
    try {
      authResult = await withAuth(uploadMediaSchema, input)
    } catch {
      return {
        success: false,
        error: 'Authentication required. Please log in to upload files.',
        code: 'AUTH_REQUIRED',
      }
    }

    if (!authResult) {
      return {
        success: false,
        error: 'Authentication required. Please log in to upload files.',
        code: 'AUTH_REQUIRED',
      }
    }

    const { fileData, fileName, fileSize } = authResult.input
    let { mimeType } = authResult.input

    // Check by extension first for GLB/GLTF files (browsers may report incorrect MIME types)
    if (isGlbByExtension(fileName)) {
      // Normalize MIME type for GLB/GLTF files
      if (fileName.toLowerCase().endsWith('.glb')) {
        mimeType = 'model/gltf-binary'
      } else if (fileName.toLowerCase().endsWith('.gltf')) {
        mimeType = 'model/gltf+json'
      }
    }

    // Validate file type (with extension fallback)
    if (!isValidMediaType(mimeType) && !isGlbByExtension(fileName)) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload an image, video, audio, PDF, or 3D model (GLB/GLTF).',
        code: 'INVALID_TYPE',
      }
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_UPLOAD_MB} MB.`,
        code: 'FILE_TOO_LARGE',
      }
    }

    // Convert base64 to Blob (dynamic import to avoid leaking Buffer into client bundle)
    const { Buffer } = await import('node:buffer')
    const binaryData = Buffer.from(fileData, 'base64')
    const blob = new Blob([binaryData], { type: mimeType })

    // Upload to Vercel Blob
    const result = await uploadToBlob(blob, fileName, mimeType)

    if (!result.success) {
      return result
    }

    return {
      success: true,
      url: result.url,
      mediaType: result.mediaType,
    }
  } catch (error) {
    console.error('Error in uploadMedia:', error)
    return {
      success: false,
      error: 'Upload failed. Please try again.',
      code: 'UPLOAD_FAILED',
    }
  }
})

// Schema for delete request
const deleteMediaSchema = z.object({
  url: z.string().url(),
})

/**
 * Delete media file from Vercel Blob storage
 * Used when user cancels upload or replaces media
 *
 * SECURITY: Requires authentication. Currently does not verify file ownership
 * because files are not tracked in the database with owner information.
 * Full ownership verification would require a file tracking table.
 *
 * TODO: For complete security, implement file ownership tracking:
 * - Option A: Add a 'media' table with userId foreign key
 * - Option B: Check if URL is referenced in user's posts
 */
export const deleteMedia = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verify authentication and parse input
    let authResult
    try {
      authResult = await withAuth(deleteMediaSchema, input)
    } catch {
      return {
        success: false,
        error: 'Authentication required. Please log in to delete files.',
      }
    }

    if (!authResult) {
      return {
        success: false,
        error: 'Authentication required. Please log in to delete files.',
      }
    }

    const { url } = authResult.input

    // TODO: Add ownership verification once file tracking is implemented
    // For now, only authenticated users can delete files
    // The auth user ID is available as authResult.auth.userId

    const deleted = await deleteFromBlob(url)

    return {
      success: deleted,
      error: deleted ? undefined : 'Failed to delete file.',
    }
  } catch (error) {
    console.error('Error in deleteMedia:', error)
    return {
      success: false,
      error: 'Failed to delete file.',
    }
  }
})

/**
 * Get validation info for client-side checks
 * This allows the client to validate before uploading
 */
export const getUploadConfig = createServerFn({
  method: 'GET',
}).handler(async () => {
  return {
    maxFileSizeMB: env.MAX_FILE_SIZE_MB,
    maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    supportedTypes: SUPPORTED_MEDIA_TYPES,
    supportedImageTypes: SUPPORTED_IMAGE_TYPES,
    supportedVideoTypes: SUPPORTED_VIDEO_TYPES,
    supportedAudioTypes: SUPPORTED_AUDIO_TYPES,
    supportedDocumentTypes: SUPPORTED_DOCUMENT_TYPES,
    supported3dTypes: SUPPORTED_3D_TYPES,
  }
})

