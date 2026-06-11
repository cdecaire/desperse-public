import type { MediaType, UploadedMediaItem } from './MultiMediaUpload'

export interface UploadedMediaInfo {
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

export function buildCreatePostMediaPayload({
  mediaUrl,
  coverUrl,
  uploadedMediaInfo,
  multiAssetItems,
}: BuildCreatePostMediaPayloadInput): CreatePostMediaPayload {
  const sortedItems = [...multiAssetItems].sort(bySortOrder)

  if (sortedItems.length === 0) {
    return {
      mediaUrl,
      coverUrl,
      assets: null,
      downloadableAssets: null,
      mediaMimeType: uploadedMediaInfo?.mimeType || null,
      mediaFileSize: uploadedMediaInfo?.fileSize || null,
    }
  }

  const barePrimary = sortedItems.find((item) => BARE_MEDIA_TYPES.has(item.mediaType))
  if (barePrimary) {
    const poster = sortedItems.find((item) => item.mediaType === 'image')
    const downloadableAssets = sortedItems
      .filter((item) => item.mediaType === 'document')
      .map(toPayloadAsset)

    return {
      mediaUrl: barePrimary.url,
      coverUrl: poster?.url || coverUrl || null,
      assets: null,
      downloadableAssets: downloadableAssets.length > 0 ? downloadableAssets : null,
      mediaMimeType: barePrimary.mimeType || uploadedMediaInfo?.mimeType || null,
      mediaFileSize: barePrimary.fileSize || uploadedMediaInfo?.fileSize || null,
    }
  }

  const displayAssets = sortedItems.filter((item) => DISPLAY_ASSET_TYPES.has(item.mediaType))
  const documentAssets = sortedItems.filter((item) => item.mediaType === 'document')
  const normalizedAssets = [...displayAssets, ...documentAssets].map(toPayloadAsset)
  const primaryAsset = displayAssets[0] || normalizedAssets[0]

  return {
    mediaUrl: primaryAsset?.url || mediaUrl,
    coverUrl: null,
    assets: normalizedAssets.length > 0 ? normalizedAssets : null,
    downloadableAssets: null,
    mediaMimeType: primaryAsset?.mimeType || uploadedMediaInfo?.mimeType || null,
    mediaFileSize: primaryAsset?.fileSize || uploadedMediaInfo?.fileSize || null,
  }
}
