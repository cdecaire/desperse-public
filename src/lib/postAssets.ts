import { detectMediaType, type MediaType } from './media'

export interface CreatePostAssetInput {
  url: string
  mediaType: MediaType
  fileName: string
  mimeType?: string | null
  fileSize?: number | null
  sortOrder: number
}

interface UploadedPrimaryMediaInput {
  url: string
  mediaType: MediaType
  fileName: string
  mimeType?: string | null
  fileSize?: number | null
}

interface UploadedAttachmentInput {
  url: string
  fileName: string
  mimeType: string
  fileSize: number
}

interface BuildCreatePostAssetsInput {
  multiAssetItems: CreatePostAssetInput[]
  uploadedMedia?: UploadedPrimaryMediaInput | null
  uploadedAttachment?: UploadedAttachmentInput | null
}

interface HasProtectedDocumentAssetInput {
  assets?: CreatePostAssetInput[] | null
  fallbackMediaUrl?: string | null
  fallbackMediaMimeType?: string | null
  protectDownload: boolean
}

export function sortCreatePostAssets<T extends { sortOrder: number }>(assets: T[] | null | undefined): T[] {
  return assets ? [...assets].sort((a, b) => a.sortOrder - b.sortOrder) : []
}

export function isDocumentAsset(asset: {
  url: string
  mediaType?: MediaType | null
  mimeType?: string | null
}): boolean {
  if (asset.mediaType) {
    return asset.mediaType === 'document'
  }

  return detectMediaType(asset.url, asset.mimeType) === 'document'
}

export function shouldGateAssetDownload(
  asset: {
    url: string
    mediaType?: MediaType | null
    mimeType?: string | null
  },
  protectDownload: boolean,
): boolean {
  return protectDownload && isDocumentAsset(asset)
}

export function hasProtectedDocumentAsset({
  assets,
  fallbackMediaUrl,
  fallbackMediaMimeType,
  protectDownload,
}: HasProtectedDocumentAssetInput): boolean {
  if (!protectDownload) {
    return false
  }

  const sortedAssets = sortCreatePostAssets(assets)
  if (sortedAssets.length > 0) {
    return sortedAssets.some((asset) => isDocumentAsset(asset))
  }

  if (!fallbackMediaUrl) {
    return false
  }

  return isDocumentAsset({ url: fallbackMediaUrl, mimeType: fallbackMediaMimeType })
}

export function buildCreatePostAssets({
  multiAssetItems,
  uploadedMedia,
  uploadedAttachment,
}: BuildCreatePostAssetsInput): { assetsForCreate: CreatePostAssetInput[]; hasDocumentAttachment: boolean } {
  const displayAssets = multiAssetItems.length > 0
    ? multiAssetItems.map((item, index) => ({
        url: item.url,
        mediaType: item.mediaType,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        sortOrder: item.sortOrder ?? index,
      }))
    : uploadedMedia?.url
      ? [{
          url: uploadedMedia.url,
          mediaType: uploadedMedia.mediaType,
          fileName: uploadedMedia.fileName,
          mimeType: uploadedMedia.mimeType,
          fileSize: uploadedMedia.fileSize,
          sortOrder: 0,
        }]
      : []

  const attachmentAsset = uploadedAttachment
    ? {
        url: uploadedAttachment.url,
        mediaType: 'document' as const,
        fileName: uploadedAttachment.fileName,
        mimeType: uploadedAttachment.mimeType,
        fileSize: uploadedAttachment.fileSize,
        sortOrder: displayAssets.length,
      }
    : null

  return {
    assetsForCreate: sortCreatePostAssets([
      ...displayAssets,
      ...(attachmentAsset ? [attachmentAsset] : []),
    ]),
    hasDocumentAttachment: Boolean(uploadedAttachment),
  }
}
