import { describe, expect, it } from 'vitest'

import { filterUsernameInput, isValidUrl, normalizeUrl, shouldAdvanceProfileSetup, slugifyName } from './ProfileSetupStep'

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

  it('does not advance onboarding when saved profile is still missing required fields', () => {
    expect(
      shouldAdvanceProfileSetup({
        displayName: 'Creator',
        avatarUrl: null,
        bio: 'Still missing a photo and social link.',
        link: null,
        twitterUsername: null,
        instagramUsername: null,
      })
    ).toBe(false)
  })

  it('advances onboarding when saved profile satisfies the onboarding requirements', () => {
    expect(
      shouldAdvanceProfileSetup({
        displayName: 'Creator',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Makes weird internet artifacts.',
        link: 'https://example.com',
        twitterUsername: null,
        instagramUsername: null,
      })
    ).toBe(true)
  })
})

describe('username slug helpers', () => {
  it('slugifies a display name to the allowed charset', () => {
    expect(slugifyName('Alice Wonder')).toBe('alicewonder')
  })

  it('lowercases and strips disallowed characters, keeping _ and .', () => {
    expect(slugifyName('Cool_Artist.42!')).toBe('cool_artist.42')
  })

  it('truncates a generated slug to 24 characters', () => {
    expect(slugifyName('a'.repeat(40)).length).toBe(24)
  })

  it('returns empty for a name with no slug-safe characters', () => {
    expect(slugifyName('★☆✦')).toBe('')
  })

  it('filters raw keystrokes the same way, capped at 24', () => {
    expect(filterUsernameInput('My Handle')).toBe('myhandle')
    expect(filterUsernameInput('x'.repeat(30)).length).toBe(24)
  })
})
