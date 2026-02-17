/**
 * Vercel Blob Client Upload API Route
 *
 * Handles client-side direct uploads to Vercel Blob storage.
 * This bypasses the 4.5MB serverless function body limit.
 *
 * Flow:
 * 1. Client calls `upload()` from @vercel/blob/client
 * 2. That function calls this route to get an upload token
 * 3. Client uploads directly to Vercel Blob
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { authenticateWithToken } from '@/server/auth'
import { env } from '@/config/env'

// Max file size in bytes (25MB to match client-side limit)
const MAX_UPLOAD_BYTES = Math.min(env.MAX_FILE_SIZE_MB, 25) * 1024 * 1024

// Supported file types
const SUPPORTED_CONTENT_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Video
  'video/mp4',
  'video/webm',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  // Documents
  'application/pdf',
  'application/zip',
  'application/epub+zip',
  // 3D models
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream', // GLB fallback
]

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as HandleUploadBody

    // Get authorization header for auth check
    const authHeader = getHeader(event, 'authorization')

    const jsonResponse = await handleUpload({
      body,
      request: {
        headers: new Headers({
          ...(authHeader ? { authorization: authHeader } : {}),
        }),
      } as Request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Verify user is authenticated via Bearer token in clientPayload
        if (!clientPayload) {
          throw createError({
            statusCode: 401,
            message: 'Authentication required',
          })
        }

        let payload: { token?: string }
        try {
          payload = JSON.parse(clientPayload)
        } catch {
          throw createError({
            statusCode: 400,
            message: 'Invalid client payload',
          })
        }

        // Verify the actual auth token server-side
        const token = payload.token || authHeader?.replace('Bearer ', '')
        if (!token) {
          throw createError({
            statusCode: 401,
            message: 'Authentication required',
          })
        }

        const auth = await authenticateWithToken(token)
        if (!auth) {
          throw createError({
            statusCode: 401,
            message: 'Invalid or expired token',
          })
        }

        return {
          allowedContentTypes: SUPPORTED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            // Store any metadata you want to retrieve later
            uploadedAt: Date.now(),
          }),
        }
      },
      // Removed onUploadCompleted to avoid callback URL requirement
      // Vercel Blob uploads work fine without it - the client receives the blob URL directly
    })

    return jsonResponse
  } catch (error) {
    console.error('[upload] Error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Upload failed',
    })
  }
})
