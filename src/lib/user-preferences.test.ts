import { describe, expect, it } from 'vitest'
import { mergePreferencesWithDefaults } from './user-preferences'

describe('leaderboard privacy preferences', () => {
  it('defaults leaderboard participation to on', () => {
    expect(mergePreferencesWithDefaults({}).privacy?.leaderboardParticipation).toBe(true)
  })

  it('preserves an explicit leaderboard opt-out', () => {
    expect(
      mergePreferencesWithDefaults({ privacy: { leaderboardParticipation: false } })
        .privacy?.leaderboardParticipation,
    ).toBe(false)
  })

  it('deep-merges privacy without changing unrelated preferences', () => {
    const merged = mergePreferencesWithDefaults({
      theme: 'dark',
      notifications: { follows: false },
      privacy: { leaderboardParticipation: false },
    })
    expect(merged.theme).toBe('dark')
    expect(merged.notifications?.follows).toBe(false)
    expect(merged.notifications?.likes).toBe(true)
    expect(merged.privacy?.leaderboardParticipation).toBe(false)
  })
})

describe('design theme preferences', () => {
  it.each([
    ['dossier', 'meridian'],
    ['cove', 'prism'],
  ])('maps the retired %s theme to %s', (legacyTheme, currentTheme) => {
    const preferences = mergePreferencesWithDefaults({
      designTheme: legacyTheme as never,
    })

    expect(preferences.designTheme).toBe(currentTheme)
  })

  it('keeps a currently supported theme', () => {
    expect(mergePreferencesWithDefaults({ designTheme: 'verdant' }).designTheme).toBe('verdant')
  })
})
