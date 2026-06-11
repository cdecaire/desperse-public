import type { MediaType, UploadedMediaItem } from './MultiMediaUpload'

export interface UploadedMediaInfo {
  mimeType: string
  fileSize: number
}

/** A standalone downloadable attachment (PDF/ZIP/EPUB) uploaded via AttachmentUpload. */
export interface UploadedAttachmentInput {
  url: string
  fileName: string
  mimeType: string
  fileSize: number
}

export interface CreatePostAssetPayload {
  url: string
  mediaType: MediaType
  fileName: string
  mimeType?: string
  fileSize?: number
  sortOrder: number
}

interface BuildCreatePostMediaPayloadInput {
  mediaUrl: string | null
  coverUrl: string | null
  uploadedMediaInfo: UploadedMediaInfo | null
  multiAssetItems: UploadedMediaItem[]
  /** Optional standalone document attachment — always emitted as a downloadable asset, never the primary. */
  uploadedAttachment?: UploadedAttachmentInput | null
}

interface CreatePostMediaPayload {
  mediaUrl: string | null
  coverUrl: string | null
  assets: CreatePostAssetPayload[] | null
  downloadableAssets: CreatePostAssetPayload[] | null
  mediaMimeType: string | null
  mediaFileSize: number | null
}

const DISPLAY_ASSET_TYPES = new Set<MediaType>(['image', 'video'])
const BARE_MEDIA_TYPES = new Set<MediaType>(['audio', '3d'])

function toPayloadAsset(item: UploadedMediaItem, sortOrder: number): CreatePostAssetPayload {
  return {
    url: item.url,
    mediaType: item.mediaType,
    fileName: item.fileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    sortOrder,
  }
}

function bySortOrder(a: UploadedMediaItem, b: UploadedMediaItem): number {
  return a.sortOrder - b.sortOrder
}

/**
 * Assemble the create-post media payload from the form's upload state.
 *
 * Documents are never display/primary media: any `document` items in the
 * multi-asset list and the standalone `uploadedAttachment` are collected into
 * `downloadableAssets`. Display media (image/video) become `assets`; a bare
 * audio/3D primary stays on `mediaUrl`. This keeps the document out of
 * `sortOrder: 0` so it can never replace the real primary, and lets the server
 * gate only the downloadable document (not the public preview).
 */
export function buildCreatePostMediaPayload({
  mediaUrl,
  coverUrl,
  uploadedMediaInfo,
  multiAssetItems,
  uploadedAttachment = null,
}: BuildCreatePostMediaPayloadInput): CreatePostMediaPayload {
  const sortedItems = [...multiAssetItems].sort(bySortOrder)

  // Collect every document into downloadableAssets: multi-asset document items first,
  // then the standalone attachment. Display/primary media is handled separately below.
  const documentItems = sortedItems.filter((item) => item.mediaType === 'document')
  const downloadableAssets: CreatePostAssetPayload[] = documentItems.map((item, index) => toPayloadAsset(item, index))
  if (uploadedAttachment) {
    downloadableAssets.push({
      url: uploadedAttachment.url,
      mediaType: 'document',
      fileName: uploadedAttachment.fileName,
      mimeType: uploadedAttachment.mimeType,
      fileSize: uploadedAttachment.fileSize,
      sortOrder: downloadableAssets.length,
    })
  }
  const downloadable = downloadableAssets.length > 0 ? downloadableAssets : null

  // Non-document media only — these drive the primary/display media.
  const nonDocumentItems = sortedItems.filter((item) => item.mediaType !== 'document')

  if (nonDocumentItems.length === 0) {
    // No multi-asset media (single MediaUpload primary, possibly plus an attachment).
    return {
      mediaUrl,
      coverUrl,
      assets: null,
      downloadableAssets: downloadable,
      mediaMimeType: uploadedMediaInfo?.mimeType || null,
      mediaFileSize: uploadedMediaInfo?.fileSize || null,
    }
  }

  const barePrimary = nonDocumentItems.find((item) => BARE_MEDIA_TYPES.has(item.mediaType))
  if (barePrimary) {
    const poster = nonDocumentItems.find((item) => item.mediaType === 'image')

    return {
      mediaUrl: barePrimary.url,
      coverUrl: poster?.url || coverUrl || null,
      assets: null,
      downloadableAssets: downloadable,
      mediaMimeType: barePrimary.mimeType || uploadedMediaInfo?.mimeType || null,
      mediaFileSize: barePrimary.fileSize || uploadedMediaInfo?.fileSize || null,
    }
  }

  const displayAssets = nonDocumentItems.filter((item) => DISPLAY_ASSET_TYPES.has(item.mediaType))
  const normalizedAssets = displayAssets.map((item, index) => toPayloadAsset(item, index))
  const primaryAsset = normalizedAssets[0]

  return {
    mediaUrl: primaryAsset?.url || mediaUrl,
    coverUrl: null,
    assets: normalizedAssets.length > 0 ? normalizedAssets : null,
    downloadableAssets: downloadable,
    mediaMimeType: primaryAsset?.mimeType || uploadedMediaInfo?.mimeType || null,
    mediaFileSize: primaryAsset?.fileSize || uploadedMediaInfo?.fileSize || null,
  }
}
