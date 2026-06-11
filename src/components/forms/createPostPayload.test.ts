import { describe, expect, it } from 'vitest'
import { buildCreatePostMediaPayload } from './createPostPayload'
import type { UploadedMediaItem } from './MultiMediaUpload'

const item = (overrides: Partial<UploadedMediaItem> & Pick<UploadedMediaItem, 'url' | 'mediaType'>): UploadedMediaItem => ({
  id: overrides.id ?? overrides.url,
  url: overrides.url,
  mediaType: overrides.mediaType,
  fileName: overrides.fileName ?? overrides.url.split('/').pop() ?? 'file',
  mimeType: overrides.mimeType,
  fileSize: overrides.fileSize,
  sortOrder: overrides.sortOrder ?? 0,
})

describe('buildCreatePostMediaPayload', () => {
  it('puts a single image in assets and points mediaUrl/mediaMimeType at that image', () => {
    const payload = buildCreatePostMediaPayload({
      mediaUrl: 'https://cdn.example.com/fallback.zip',
      coverUrl: 'https://cdn.example.com/cover.png',
      uploadedMediaInfo: { mimeType: 'application/zip', fileSize: 999 },
      multiAssetItems: [item({ url: 'https://cdn.example.com/image.png', mediaType: 'image', mimeType: 'image/png', fileSize: 123 })],
    })

    expect(payload.mediaUrl).toBe('https://cdn.example.com/image.png')
    expect(payload.coverUrl).toBeNull()
    expect(payload.mediaMimeType).toBe('image/png')
    expect(payload.mediaFileSize).toBe(123)
    expect(payload.assets).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/image.png', mediaType: 'image', sortOrder: 0 }),
    ])
    expect(payload.downloadableAssets).toBeNull()
  })

  it('sorts multiple images into assets with contiguous sortOrder values', () => {
    const payload = buildCreatePostMediaPayload({
      mediaUrl: 'https://cdn.example.com/second.png',
      coverUrl: null,
      uploadedMediaInfo: null,
      multiAssetItems: [
        item({ url: 'https://cdn.example.com/second.png', mediaType: 'image', mimeType: 'image/png', sortOrder: 2 }),
        item({ url: 'https://cdn.example.com/first.jpg', mediaType: 'image', mimeType: 'image/jpeg', sortOrder: 1 }),
      ],
    })

    expect(payload.mediaUrl).toBe('https://cdn.example.com/first.jpg')
    expect(payload.mediaMimeType).toBe('image/jpeg')
    expect(payload.assets?.map((asset) => ({ url: asset.url, mediaType: asset.mediaType, sortOrder: asset.sortOrder }))).toEqual([
      { url: 'https://cdn.example.com/first.jpg', mediaType: 'image', sortOrder: 0 },
      { url: 'https://cdn.example.com/second.png', mediaType: 'image', sortOrder: 1 },
    ])
  })

  it('keeps image display assets before document attachments', () => {
    const payload = buildCreatePostMediaPayload({
      mediaUrl: 'https://cdn.example.com/archive.zip',
      coverUrl: 'https://cdn.example.com/cover.jpg',
      uploadedMediaInfo: { mimeType: 'application/zip', fileSize: 1000 },
      multiAssetItems: [
        item({ url: 'https://cdn.example.com/archive.zip', mediaType: 'document', mimeType: 'application/zip', fileSize: 1000, sortOrder: 0 }),
        item({ url: 'https://cdn.example.com/cover.jpg', mediaType: 'image', mimeType: 'image/jpeg', fileSize: 200, sortOrder: 1 }),
      ],
    })

    expect(payload.mediaUrl).toBe('https://cdn.example.com/cover.jpg')
    expect(payload.coverUrl).toBeNull()
    expect(payload.mediaMimeType).toBe('image/jpeg')
    expect(payload.assets?.map((asset) => ({ url: asset.url, mediaType: asset.mediaType, sortOrder: asset.sortOrder }))).toEqual([
      { url: 'https://cdn.example.com/cover.jpg', mediaType: 'image', sortOrder: 0 },
      { url: 'https://cdn.example.com/archive.zip', mediaType: 'document', sortOrder: 1 },
    ])
    expect(payload.downloadableAssets).toBeNull()
  })

  it('keeps audio and 3D primaries on the bare mediaUrl/coverUrl path and moves document attachments to downloadableAssets', () => {
    const payload = buildCreatePostMediaPayload({
      mediaUrl: 'https://cdn.example.com/book.zip',
      coverUrl: 'https://cdn.example.com/poster.jpg',
      uploadedMediaInfo: { mimeType: 'application/zip', fileSize: 900 },
      multiAssetItems: [
        item({ url: 'https://cdn.example.com/book.zip', mediaType: 'document', mimeType: 'application/zip', fileSize: 900, sortOrder: 0 }),
        item({ url: 'https://cdn.example.com/audio.mp3', mediaType: 'audio', mimeType: 'audio/mpeg', fileSize: 700, sortOrder: 1 }),
        item({ url: 'https://cdn.example.com/poster.jpg', mediaType: 'image', mimeType: 'image/jpeg', fileSize: 100, sortOrder: 2 }),
      ],
    })

    expect(payload.mediaUrl).toBe('https://cdn.example.com/audio.mp3')
    expect(payload.coverUrl).toBe('https://cdn.example.com/poster.jpg')
    expect(payload.mediaMimeType).toBe('audio/mpeg')
    expect(payload.mediaFileSize).toBe(700)
    expect(payload.assets).toBeNull()
    expect(payload.downloadableAssets).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/book.zip', mediaType: 'document', sortOrder: 0 }),
    ])
  })
})
