/**
 * Vercel Blob storage client wrapper
 * Handles media upload to Vercel Blob storage
 */

import { put, del } from '@vercel/blob'
import { env } from '@/config/env'

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml', // Vector graphics
]
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf', // Comics, books, zines, art prints
  'application/zip', // ZIP archives
]
export const SUPPORTED_3D_TYPES = [
  'model/gltf-binary',    // GLB - 3D models (common for NFTs)
  'model/gltf+json',      // GLTF - 3D models
  'application/octet-stream', // GLB fallback (some browsers report this)
]
export const SUPPORTED_MEDIA_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_3D_TYPES,
]

// File extensions mapping
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'model/gltf-binary': 'glb',
  'model/gltf+json': 'gltf',
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

/**
 * Determine media type from MIME type (with optional filename for extension fallback)
 */
export function getMediaType(mimeType: string, fileName?: string): MediaType | null {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video'
  if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) return 'audio'
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) return 'document'
  if (SUPPORTED_3D_TYPES.includes(mimeType)) return '3d'
  
  // Fallback: check by extension for GLB/GLTF files
  if (fileName && isGlbByExtension(fileName)) {
    return '3d'
  }
  
  return null
}

/**
 * Check if file extension suggests a GLB file (for fallback MIME detection)
 */
export function isGlbByExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop()
  return ext === 'glb' || ext === 'gltf'
}

/**
 * Validate file type
 */
export function isValidMediaType(mimeType: string): boolean {
  return SUPPORTED_MEDIA_TYPES.includes(mimeType)
}

/**
 * Validate file size (in bytes)
 */
// Hard-cap uploads to avoid browser crashes and server limits.
// Even if env is set higher, we won't accept files larger than this cap.
export const MAX_UPLOAD_MB = Math.min(env.MAX_FILE_SIZE_MB, 25)
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes <= MAX_UPLOAD_BYTES
}

/**
 * Generate a unique filename for blob storage
 */
function generateBlobPath(originalName: string, mimeType: string, pathPrefix = 'media'): string {
  const extension = MIME_TO_EXTENSION[mimeType] || 'bin'
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const baseName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Sanitize
    .substring(0, 50) // Limit length
  
  return `${pathPrefix}/${timestamp}-${randomSuffix}-${baseName}.${extension}`
}

export interface UploadResult {
  success: true
  url: string
  pathname: string
  mediaType: MediaType
}

export interface UploadError {
  success: false
  error: string
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED' | 'STORAGE_UNAVAILABLE'
}

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadToBlob(
  file: File | Blob,
  originalName: string,
  mimeType: string,
  pathPrefix = 'media'
): Promise<UploadResult | UploadError> {
  // Check by extension first for GLB/GLTF files (browsers may report incorrect MIME types)
  if (isGlbByExtension(originalName)) {
    // Normalize MIME type for GLB/GLTF files
    if (originalName.toLowerCase().endsWith('.glb')) {
      mimeType = 'model/gltf-binary'
    } else if (originalName.toLowerCase().endsWith('.gltf')) {
      mimeType = 'model/gltf+json'
    }
  }

  // Validate file type (with extension fallback)
  if (!isValidMediaType(mimeType) && !isGlbByExtension(originalName)) {
    return {
      success: false,
      error: 'Unsupported file type. Please upload an image, video, audio, PDF, ZIP, or 3D model (GLB/GLTF).',
      code: 'INVALID_TYPE',
    }
  }

  // Validate file size
  if (!isValidFileSize(file.size)) {
    return {
      success: false,
      error: `File too large. Maximum size is ${env.MAX_FILE_SIZE_MB} MB.`,
      code: 'FILE_TOO_LARGE',
    }
  }

  const mediaType = getMediaType(mimeType, originalName)
  if (!mediaType) {
    return {
      success: false,
      error: 'Unable to determine media type.',
      code: 'INVALID_TYPE',
    }
  }

  try {
    const pathname = generateBlobPath(originalName, mimeType, pathPrefix)
    
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: mimeType,
    })

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      mediaType,
    }
  } catch (error) {
    console.error('Blob upload error:', error)
    
    // Check if it's a network/service error
    if (error instanceof Error && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Storage service unavailable. Please try again later.',
        code: 'STORAGE_UNAVAILABLE',
      }
    }
    
    return {
      success: false,
      error: 'Upload failed. Please try again.',
      code: 'UPLOAD_FAILED',
    }
  }
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFromBlob(url: string): Promise<boolean> {
  try {
    await del(url)
    return true
  } catch (error) {
    console.error('Blob delete error:', error)
    return false
  }
}

/**
 * Upload metadata JSON to blob storage (for NFT metadata)
 * @param allowOverwrite - Set to true when updating existing metadata (e.g., editing a post)
 */
export async function uploadMetadataJson(
  metadata: Record<string, unknown>,
  postId: string,
  allowOverwrite = false
): Promise<UploadResult | UploadError> {
  try {
    const pathname = `metadata/${postId}.json`
    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    })
    
    const blob = await put(pathname, jsonBlob, {
      access: 'public',
      contentType: 'application/json',
      ...(allowOverwrite && { allowOverwrite: true }),
    })

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      mediaType: 'image', // Metadata doesn't have a media type, using placeholder
    }
  } catch (error) {
    console.error('Metadata upload error:', error)
    return {
      success: false,
      error: 'Failed to upload metadata.',
      code: 'UPLOAD_FAILED',
    }
  }
}

// ============================================================================
// Gated Asset Downloads
// ============================================================================

export type StorageProviderType = 'vercel-blob' | 'r2' | 's3'

/**
 * Get a stream for a gated asset from storage
 * 
 * For Vercel Blob, the storageKey is the URL, so we fetch it directly.
 * For other providers (R2/S3), we would generate presigned URLs here.
 * 
 * @param provider - Storage provider type
 * @param storageKey - Storage key or URL
 * @returns Response with stream, or null if failed
 */
export async function getGatedAssetStream(
  provider: StorageProviderType,
  storageKey: string,
): Promise<Response | null> {
  try {
    // For Vercel Blob, the storageKey IS the URL
    if (provider === 'vercel-blob') {
      const response = await fetch(storageKey)
      if (!response.ok) {
        console.error(`[getGatedAssetStream] Failed to fetch from Vercel Blob: ${response.statusText}`)
        return null
      }
      return response
    }

    // For other providers, we would generate presigned URLs here
    // For now, we only support Vercel Blob
    console.error(`[getGatedAssetStream] Unsupported storage provider: ${provider}`)
    return null
  } catch (error) {
    console.error('[getGatedAssetStream] Error:', error)
    return null
  }
}

