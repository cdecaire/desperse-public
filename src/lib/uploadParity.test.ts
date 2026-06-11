import { describe, expect, it } from 'vitest'

import { getAttachmentMimeType, normalizeAssetSortOrder } from './uploadParity'

describe('uploadParity helpers', () => {
  it('maps epub attachments and falls back unknown extensions to octet-stream', () => {
    expect(getAttachmentMimeType('book.epub', null)).toBe('application/epub+zip')
    expect(getAttachmentMimeType('archive.bin', null)).toBe('application/octet-stream')
    expect(getAttachmentMimeType('ignored.pdf', 'application/pdf')).toBe('application/pdf')
  })

  it('keeps display assets first and moves document attachments to the end', () => {
    const normalized = normalizeAssetSortOrder([
      { id: 'doc', mediaType: 'document' as const, sortOrder: 0 },
      { id: 'img-2', mediaType: 'image' as const, sortOrder: 2 },
      { id: 'img-1', mediaType: 'image' as const, sortOrder: 1 },
    ])

    expect(normalized).toEqual([
      { id: 'img-1', mediaType: 'image', sortOrder: 0 },
      { id: 'img-2', mediaType: 'image', sortOrder: 1 },
      { id: 'doc', mediaType: 'document', sortOrder: 2 },
    ])
  })
})
