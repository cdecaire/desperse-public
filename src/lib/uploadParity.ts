import type { MediaType } from '@/lib/media'

export const MAX_UPLOAD_MB = 25
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const FILE_TOO_LARGE_MESSAGE = `File too large. Maximum is ${MAX_UPLOAD_MB} MB.`

export const MAX_ASSETS_PER_POST = 10

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/zip',
  'application/octet-stream',
] as const

export type AcceptedAttachmentMimeType = typeof ACCEPTED_ATTACHMENT_MIME_TYPES[number]

const EXTENSION_TO_ATTACHMENT_MIME_TYPE: Record<string, AcceptedAttachmentMimeType> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  zip: 'application/zip',
}

const DISPLAY_MEDIA_TYPES = new Set<MediaType>(['image', 'video'])

export function getAttachmentMimeType(fileName: string, browserMimeType?: string | null): AcceptedAttachmentMimeType {
  if (browserMimeType && ACCEPTED_ATTACHMENT_MIME_TYPES.includes(browserMimeType as AcceptedAttachmentMimeType)) {
    return browserMimeType as AcceptedAttachmentMimeType
  }

  const ext = fileName.toLowerCase().split('.').pop() || ''
  return EXTENSION_TO_ATTACHMENT_MIME_TYPE[ext] ?? 'application/octet-stream'
}

export function normalizeAssetSortOrder<T extends { mediaType: MediaType; sortOrder?: number }>(items: T[]): Array<T & { sortOrder: number }> {
  const ordered = [...items]
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const aDisplay = DISPLAY_MEDIA_TYPES.has(a.item.mediaType)
      const bDisplay = DISPLAY_MEDIA_TYPES.has(b.item.mediaType)

      if (aDisplay !== bDisplay) return aDisplay ? -1 : 1
      return (a.item.sortOrder ?? a.originalIndex) - (b.item.sortOrder ?? b.originalIndex)
    })

  return ordered.map(({ item }, sortOrder) => ({ ...item, sortOrder }))
}
