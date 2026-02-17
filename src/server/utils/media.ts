/**
 * Media upload utility functions for REST API
 * Direct functions that bypass createServerFn for REST endpoints
 */

import { authenticateWithToken } from '@/server/auth'
import { uploadToBlob, SUPPORTED_MEDIA_TYPES, MAX_UPLOAD_MB } from '@/server/storage/blob'

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export interface MediaUploadInput {
	fileData: string // base64-encoded file data
	fileName: string
	mimeType: string
	fileSize: number
}

export interface MediaUploadResult {
	success: true
	url: string
	pathname: string
	mediaType: string
}

export interface MediaUploadError {
	success: false
	error: string
	status?: number
}

/**
 * Upload media file for authenticated user (Direct function for REST API)
 * Follows the same pattern as uploadAvatarDirect / uploadHeaderDirect
 */
export async function uploadMediaDirect(
	token: string,
	input: MediaUploadInput
): Promise<MediaUploadResult | MediaUploadError> {
	try {
		// Authenticate user
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required', status: 401 }
		}

		const { fileData, fileName, mimeType, fileSize } = input

		// Validate mime type
		if (!SUPPORTED_MEDIA_TYPES.includes(mimeType)) {
			return {
				success: false,
				error: `Unsupported file type: ${mimeType}`,
				status: 400,
			}
		}

		// Validate file size
		if (fileSize > MAX_UPLOAD_BYTES) {
			return {
				success: false,
				error: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
				status: 400,
			}
		}

		// Decode base64
		const fileBuffer = Buffer.from(fileData, 'base64')

		// Double-check actual size after decoding
		if (fileBuffer.length > MAX_UPLOAD_BYTES) {
			return {
				success: false,
				error: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
				status: 400,
			}
		}

		// Upload to blob storage
		const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
		const uploadResult = await uploadToBlob(blob, fileName, mimeType, 'media')

		if (!uploadResult.success) {
			return { success: false, error: uploadResult.error, status: 500 }
		}

		return {
			success: true,
			url: uploadResult.url,
			pathname: uploadResult.pathname,
			mediaType: uploadResult.mediaType,
		}
	} catch (error) {
		console.error('[uploadMediaDirect] Error:', error)
		return {
			success: false,
			error: 'Failed to upload media.',
			status: 500,
		}
	}
}
