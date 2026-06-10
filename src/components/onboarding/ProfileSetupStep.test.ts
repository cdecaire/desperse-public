import { describe, expect, it } from 'vitest'

import { isValidUrl, normalizeUrl } from './ProfileSetupStep'

describe('ProfileSetupStep validation', () => {
  it('normalizes URL without protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  it('preserves existing protocol when normalizing', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('returns empty string when normalizing blank input', () => {
    expect(normalizeUrl('   ')).toBe('')
  })

  it('accepts empty link as optional', () => {
    expect(isValidUrl('')).toBe(true)
  })

  it('accepts valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('accepts URL without protocol (adds https)', () => {
    expect(isValidUrl('example.com')).toBe(true)
  })

  it('rejects invalid URL', () => {
    expect(isValidUrl('not a url')).toBe(false)
  })

  it('rejects URL with only protocol', () => {
    expect(isValidUrl('https://')).toBe(false)
  })
})
