import { describe, expect, it } from 'vitest'

import {
  formatAssetFileSize,
  getDisplayAssets,
  getPrimaryDisplayMedia,
  hasDownloadAccess,
} from './postAssets'

describe('postAssets helpers', () => {
  it('uses only previewable image and video assets for display, sorted by sortOrder', () => {
    const displayAssets = getDisplayAssets([
      { id: 'doc', url: '/file.pdf', mimeType: 'application/pdf', mediaType: 'document', sortOrder: 3 },
      { id: 'video', url: '/clip.mp4', mimeType: 'video/mp4', mediaType: 'video', sortOrder: 2 },
      { id: 'image', url: '/image.jpg', mimeType: 'image/jpeg', mediaType: 'image', sortOrder: 1 },
      { id: 'audio', url: '/song.mp3', mimeType: 'audio/mpeg', mediaType: 'audio', sortOrder: 4 },
    ])

    expect(displayAssets.map((asset) => asset.id)).toEqual(['image', 'video'])
  })

  it('falls back to legacy media and cover when assets has no previewable media', () => {
    const primary = getPrimaryDisplayMedia({
      mediaUrl: '/legacy.glb',
      coverUrl: '/legacy-cover.jpg',
      mediaMimeType: 'model/gltf-binary',
      assets: [
        { id: 'model', url: '/model.glb', mimeType: 'model/gltf-binary', mediaType: '3d', sortOrder: 0 },
      ],
    })

    expect(primary).toEqual({
      mediaUrl: '/legacy.glb',
      coverUrl: '/legacy-cover.jpg',
      mediaType: '3d',
      displayAssets: [],
    })
  })

  it('uses a single previewable asset as the primary display media', () => {
    const primary = getPrimaryDisplayMedia({
      mediaUrl: '/legacy.jpg',
      coverUrl: null,
      assets: [
        { id: 'image', url: '/asset-image.jpg', mimeType: 'image/jpeg', mediaType: 'image', sortOrder: 0 },
      ],
    })

    expect(primary.mediaUrl).toBe('/asset-image.jpg')
    expect(primary.mediaType).toBe('image')
    expect(primary.displayAssets).toEqual([])
  })

  it('formats downloadable file sizes into compact labels', () => {
    expect(formatAssetFileSize(512)).toBe('512 B')
    expect(formatAssetFileSize(1536)).toBe('1.5 KB')
    expect(formatAssetFileSize(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatAssetFileSize(null)).toBeNull()
  })

  it('locks edition downloads until the viewer has collected, but keeps posts and collectibles downloadable', () => {
    expect(hasDownloadAccess('post', false)).toBe(true)
    expect(hasDownloadAccess('collectible', false)).toBe(true)
    expect(hasDownloadAccess('edition', false)).toBe(false)
    expect(hasDownloadAccess('edition', true)).toBe(true)
  })
})
