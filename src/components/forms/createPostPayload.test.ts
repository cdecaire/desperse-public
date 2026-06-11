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

  it('keeps image display media in assets and routes document items to downloadableAssets', () => {
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
    // Document never sits in the display gallery — it is downloadable only.
    expect(payload.assets?.map((asset) => ({ url: asset.url, mediaType: asset.mediaType, sortOrder: asset.sortOrder }))).toEqual([
      { url: 'https://cdn.example.com/cover.jpg', mediaType: 'image', sortOrder: 0 },
    ])
    expect(payload.downloadableAssets).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/archive.zip', mediaType: 'document', sortOrder: 0 }),
    ])
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

  describe('standalone attachment (dedicated AttachmentUpload)', () => {
    const attachment = {
      url: 'https://cdn.example.com/guide.pdf',
      fileName: 'guide.pdf',
      mimeType: 'application/pdf',
      fileSize: 4242,
    }

    it('keeps an image primary in assets and adds the attachment as a downloadable asset', () => {
      const payload = buildCreatePostMediaPayload({
        mediaUrl: 'https://cdn.example.com/art.png',
        coverUrl: null,
        uploadedMediaInfo: { mimeType: 'image/png', fileSize: 500 },
        multiAssetItems: [item({ url: 'https://cdn.example.com/art.png', mediaType: 'image', mimeType: 'image/png', fileSize: 500 })],
        uploadedAttachment: attachment,
      })

      expect(payload.mediaUrl).toBe('https://cdn.example.com/art.png')
      expect(payload.assets).toEqual([
        expect.objectContaining({ url: 'https://cdn.example.com/art.png', mediaType: 'image', sortOrder: 0 }),
      ])
      expect(payload.downloadableAssets).toEqual([
        expect.objectContaining({ url: 'https://cdn.example.com/guide.pdf', mediaType: 'document', sortOrder: 0 }),
      ])
    })

    it('keeps an audio primary on mediaUrl and adds the attachment as a downloadable asset (audio never dropped)', () => {
      const payload = buildCreatePostMediaPayload({
        mediaUrl: 'https://cdn.example.com/song.mp3',
        coverUrl: 'https://cdn.example.com/poster.jpg',
        uploadedMediaInfo: { mimeType: 'audio/mpeg', fileSize: 800 },
        multiAssetItems: [item({ url: 'https://cdn.example.com/song.mp3', mediaType: 'audio', mimeType: 'audio/mpeg', fileSize: 800 })],
        uploadedAttachment: attachment,
      })

      expect(payload.mediaUrl).toBe('https://cdn.example.com/song.mp3')
      expect(payload.mediaMimeType).toBe('audio/mpeg')
      expect(payload.assets).toBeNull()
      expect(payload.downloadableAssets).toEqual([
        expect.objectContaining({ url: 'https://cdn.example.com/guide.pdf', mediaType: 'document', sortOrder: 0 }),
      ])
    })

    it('supports a single MediaUpload primary (no multi-assets) plus an attachment', () => {
      const payload = buildCreatePostMediaPayload({
        mediaUrl: 'https://cdn.example.com/single.png',
        coverUrl: 'https://cdn.example.com/single.png',
        uploadedMediaInfo: { mimeType: 'image/png', fileSize: 321 },
        multiAssetItems: [],
        uploadedAttachment: attachment,
      })

      expect(payload.mediaUrl).toBe('https://cdn.example.com/single.png')
      expect(payload.mediaMimeType).toBe('image/png')
      expect(payload.assets).toBeNull()
      expect(payload.downloadableAssets).toEqual([
        expect.objectContaining({ url: 'https://cdn.example.com/guide.pdf', mediaType: 'document', sortOrder: 0 }),
      ])
    })

    it('orders a multi-asset document before the standalone attachment in downloadableAssets', () => {
      const payload = buildCreatePostMediaPayload({
        mediaUrl: 'https://cdn.example.com/art.png',
        coverUrl: null,
        uploadedMediaInfo: null,
        multiAssetItems: [
          item({ url: 'https://cdn.example.com/art.png', mediaType: 'image', mimeType: 'image/png', sortOrder: 0 }),
          item({ url: 'https://cdn.example.com/extra.zip', mediaType: 'document', mimeType: 'application/zip', sortOrder: 1 }),
        ],
        uploadedAttachment: attachment,
      })

      expect(payload.downloadableAssets?.map((a) => ({ url: a.url, sortOrder: a.sortOrder }))).toEqual([
        { url: 'https://cdn.example.com/extra.zip', sortOrder: 0 },
        { url: 'https://cdn.example.com/guide.pdf', sortOrder: 1 },
      ])
    })
  })
})
