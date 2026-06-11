import { detectMediaType, type MediaType } from '@/lib/media'
import type { CarouselAsset } from './MediaCarousel'

export interface PostAsset {
  id: string
  url: string
  mimeType?: string | null
  mediaType?: string | null
  fileSize?: number | null
  sortOrder?: number | null
  isPreviewable?: boolean | null
  isGated?: boolean | null
  downloadCount?: number | null
}

export interface DownloadableAsset extends PostAsset {
  mimeType: string | null
  fileSize: number | null
  sortOrder: number
}

export interface PrimaryDisplayMediaInput {
  mediaUrl: string
  coverUrl?: string | null
  mediaMimeType?: string | null
  assets?: PostAsset[] | null
}

export interface PrimaryDisplayMedia {
  mediaUrl: string
  coverUrl?: string | null
  mediaType: MediaType
  displayAssets: CarouselAsset[]
}

const PREVIEWABLE_MEDIA_TYPES = new Set(['image', 'video'])

function assetMediaKind(asset: PostAsset): 'image' | 'video' | null {
  const mediaType = asset.mediaType?.toLowerCase()
  if (mediaType && PREVIEWABLE_MEDIA_TYPES.has(mediaType)) {
    return mediaType as 'image' | 'video'
  }

  const mimeType = asset.mimeType?.toLowerCase()
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'

  return null
}

function toCarouselAsset(asset: PostAsset, fallbackSortOrder: number): CarouselAsset {
  const kind = assetMediaKind(asset)
  return {
    id: asset.id,
    url: asset.url,
    mimeType: asset.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    fileSize: asset.fileSize ?? null,
    sortOrder: asset.sortOrder ?? fallbackSortOrder,
  }
}

export function getDisplayAssets(assets?: PostAsset[] | null): CarouselAsset[] {
  if (!assets?.length) return []

  return assets
    .map((asset, index) => ({ asset, index }))
    .filter(({ asset }) => assetMediaKind(asset) !== null && asset.isPreviewable !== false)
    .sort((a, b) => (a.asset.sortOrder ?? a.index) - (b.asset.sortOrder ?? b.index))
    .map(({ asset, index }) => toCarouselAsset(asset, index))
}

export function getPrimaryDisplayMedia({
  mediaUrl,
  coverUrl,
  mediaMimeType,
  assets,
}: PrimaryDisplayMediaInput): PrimaryDisplayMedia {
  const displayAssets = getDisplayAssets(assets)

  if (displayAssets.length === 1) {
    const asset = displayAssets[0]
    return {
      mediaUrl: asset.url,
      coverUrl: coverUrl ?? null,
      mediaType: detectMediaType(asset.url, asset.mimeType),
      displayAssets: [],
    }
  }

  if (displayAssets.length > 1) {
    const firstAsset = displayAssets[0]
    return {
      mediaUrl: firstAsset.url,
      coverUrl: coverUrl ?? null,
      mediaType: detectMediaType(firstAsset.url, firstAsset.mimeType),
      displayAssets,
    }
  }

  return {
    mediaUrl,
    coverUrl: coverUrl ?? null,
    mediaType: detectMediaType(mediaUrl, mediaMimeType),
    displayAssets: [],
  }
}

export function formatAssetFileSize(bytes?: number | null): string | null {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return null
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}

export function getAssetTypeLabel(asset: Pick<PostAsset, 'mimeType' | 'url'>): string {
  const mimeType = asset.mimeType?.toLowerCase()
  if (mimeType?.startsWith('audio/')) return 'Audio'
  if (mimeType?.startsWith('video/')) return 'Video'
  if (mimeType?.startsWith('image/')) return 'Image'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'application/epub+zip') return 'EPUB'
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed' || mimeType === 'application/x-zip') return 'ZIP'
  if (mimeType?.includes('gltf') || mimeType?.includes('model')) return '3D Model'

  const extension = asset.url.split('.').pop()?.toLowerCase()?.split('?')[0]
  if (extension === 'pdf') return 'PDF'
  if (extension === 'zip') return 'ZIP'
  if (extension === 'epub') return 'EPUB'
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'Audio'
  if (['glb', 'gltf', 'usdz'].includes(extension || '')) return '3D Model'
  return 'File'
}

export function hasDownloadAccess(postType: 'post' | 'collectible' | 'edition', isCollected: boolean): boolean {
  return postType === 'post' || postType === 'collectible' || isCollected
}

/** Registered icon name (see src/lib/icons.ts) for a downloadable asset's file type. */
export function getAssetIconName(asset: Pick<PostAsset, 'mimeType' | 'url'>): string {
  const label = getAssetTypeLabel(asset)
  switch (label) {
    case 'PDF':
      return 'file-pdf'
    case 'ZIP':
      return 'file-zipper'
    case 'EPUB':
      return 'book'
    case 'Audio':
      return 'music'
    case '3D Model':
      return 'cube'
    case 'Image':
      return 'image'
    case 'Video':
      return 'video'
    default:
      return 'file'
  }
}

/** Total recorded downloads across a post's downloadable assets. */
export function getTotalDownloadCount(assets?: Array<{ downloadCount?: number | null }> | null): number {
  if (!assets?.length) return 0
  return assets.reduce((sum, asset) => sum + (asset.downloadCount ?? 0), 0)
}
