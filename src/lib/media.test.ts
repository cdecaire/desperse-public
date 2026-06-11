import { describe, expect, it } from 'vitest'

import { detectMediaType } from './media'

describe('detectMediaType', () => {
  it('treats EPUB files as documents by extension', () => {
    expect(detectMediaType('https://cdn.example.com/books/sample.epub')).toBe('document')
  })

  it('treats EPUB files as documents by mime type fallback', () => {
    expect(detectMediaType('https://cdn.example.com/download?id=123', 'application/epub+zip')).toBe('document')
  })
})
