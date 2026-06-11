import { describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  env: {
    MAX_FILE_SIZE_MB: 50,
  },
}))

import { getMediaType, isValidMediaType, MIME_TO_EXTENSION, MAX_UPLOAD_MB } from './blob'

describe('blob media validation', () => {
  it('accepts EPUB mime types as downloadable documents', () => {
    expect(isValidMediaType('application/epub+zip')).toBe(true)
    expect(getMediaType('application/epub+zip', 'issue-01.epub')).toBe('document')
  })

  it('maps EPUB uploads to the epub extension', () => {
    expect(MIME_TO_EXTENSION['application/epub+zip']).toBe('epub')
  })

  it('keeps the upload cap clamped at 25 MB', () => {
    expect(MAX_UPLOAD_MB).toBe(25)
  })
})
