import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/server/db'
import { mediaUploads } from '@/server/db/schema'
import { deleteFromBlob, type MediaType } from '@/server/storage/blob'

export interface RecordMediaUploadInput {
  userId: string
  url: string
  pathname?: string | null
  originalName: string
  mimeType: string
  mediaType: MediaType
  fileSize: number
}

export async function recordMediaUpload(input: RecordMediaUploadInput): Promise<void> {
  await db.insert(mediaUploads).values({
    userId: input.userId,
    url: input.url,
    pathname: input.pathname ?? null,
    originalName: input.originalName,
    mimeType: input.mimeType,
    mediaType: input.mediaType,
    fileSize: input.fileSize,
  })
}

export type DeleteOwnedMediaResult =
  | { success: true }
  | { success: false; error: string; code: 'NOT_FOUND_OR_NOT_OWNER' | 'DELETE_FAILED' }

export async function deleteOwnedMedia(url: string, userId: string): Promise<DeleteOwnedMediaResult> {
  const [upload] = await db
    .select({ id: mediaUploads.id })
    .from(mediaUploads)
    .where(and(eq(mediaUploads.url, url), eq(mediaUploads.userId, userId), isNull(mediaUploads.deletedAt)))
    .limit(1)

  if (!upload) {
    return {
      success: false,
      error: 'File not found or you do not have permission to delete it.',
      code: 'NOT_FOUND_OR_NOT_OWNER',
    }
  }

  const deleted = await deleteFromBlob(url)
  if (!deleted) {
    return {
      success: false,
      error: 'Failed to delete file.',
      code: 'DELETE_FAILED',
    }
  }

  await db
    .update(mediaUploads)
    .set({ deletedAt: new Date() })
    .where(eq(mediaUploads.id, upload.id))

  return { success: true }
}
