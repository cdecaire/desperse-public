import { describe, expect, it } from 'vitest'

import {
  buildCreatePostAssets,
  hasProtectedDocumentAsset,
  shouldGateAssetDownload,
} from './postAssets'

describe('buildCreatePostAssets', () => {
  it('keeps audio primary media first when appending a document attachment', () => {
    const { assetsForCreate } = buildCreatePostAssets({
      multiAssetItems: [],
      uploadedMedia: {
        url: 'https://cdn.example.com/tracks/demo.mp3',
        mediaType: 'audio',
        fileName: 'demo.mp3',
        mimeType: 'audio/mpeg',
        fileSize: 1234,
      },
      uploadedAttachment: {
        url: 'https://cdn.example.com/books/liner-notes.pdf',
        fileName: 'liner-notes.pdf',
        mimeType: 'application/pdf',
        fileSize: 4567,
      },
    })

    expect(assetsForCreate).toHaveLength(2)
    expect(assetsForCreate[0]).toMatchObject({
      url: 'https://cdn.example.com/tracks/demo.mp3',
      mediaType: 'audio',
      sortOrder: 0,
    })
    expect(assetsForCreate[1]).toMatchObject({
      url: 'https://cdn.example.com/books/liner-notes.pdf',
      mediaType: 'document',
      sortOrder: 1,
    })
  })
})

describe('protected document asset detection', () => {
  const imageAsset = {
    url: 'https://cdn.example.com/covers/edition-cover.jpg',
    mediaType: 'image' as const,
    fileName: 'edition-cover.jpg',
    mimeType: 'image/jpeg',
    fileSize: 100,
    sortOrder: 0,
  }

  const documentAsset = {
    url: 'https://cdn.example.com/downloads/edition.epub',
    mediaType: 'document' as const,
    fileName: 'edition.epub',
    mimeType: 'application/epub+zip',
    fileSize: 200,
    sortOrder: 1,
  }

  it('detects protected document attachments even when the primary media is an image', () => {
    expect(hasProtectedDocumentAsset({
      assets: [imageAsset, documentAsset],
      protectDownload: true,
    })).toBe(true)
  })

  it('gates only document assets when download protection is enabled', () => {
    expect(shouldGateAssetDownload(imageAsset, true)).toBe(false)
    expect(shouldGateAssetDownload(documentAsset, true)).toBe(true)
  })
})
