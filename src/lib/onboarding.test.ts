import { describe, expect, it } from 'vitest'

import { deriveOnboardingState } from './onboarding'

const completeUser = {
  id: 'user-1',
  usernameSlug: 'creator',
  displayName: 'Creator Name',
  bio: 'Makes weird internet artifacts.',
  avatarUrl: 'https://example.com/avatar.png',
  link: 'https://example.com',
  twitterUsername: null,
  instagramUsername: null,
}

describe('deriveOnboardingState', () => {
  it('marks authenticated users with no database user as new but does not route while loading', () => {
    expect(
      deriveOnboardingState(null, {
        isAuthenticated: true,
        isAuthInitializing: false,
        isLoading: true,
      })
    ).toEqual({
      isNewUser: true,
      isProfileIncomplete: true,
      shouldShowOnboarding: false,
      missingProfileFields: ['displayName', 'avatarUrl', 'bio', 'socialOrWebsite'],
    })
  })

  it('requires the minimum useful public profile fields', () => {
    expect(
      deriveOnboardingState(
        {
          ...completeUser,
          displayName: ' ',
          avatarUrl: null,
          bio: '',
          link: null,
        },
        {
          isAuthenticated: true,
          isAuthInitializing: false,
          isLoading: false,
        }
      )
    ).toEqual({
      isNewUser: false,
      isProfileIncomplete: true,
      shouldShowOnboarding: true,
      missingProfileFields: ['displayName', 'avatarUrl', 'bio', 'socialOrWebsite'],
    })
  })

  it('accepts a social handle instead of a website link', () => {
    expect(
      deriveOnboardingState(
        {
          ...completeUser,
          link: null,
          twitterUsername: 'desperse',
        },
        {
          isAuthenticated: true,
          isAuthInitializing: false,
          isLoading: false,
        }
      )
    ).toEqual({
      isNewUser: false,
      isProfileIncomplete: false,
      shouldShowOnboarding: false,
      missingProfileFields: [],
    })
  })

  it('does not show onboarding for signed-out or initializing auth states', () => {
    expect(
      deriveOnboardingState(null, {
        isAuthenticated: false,
        isAuthInitializing: false,
        isLoading: false,
      }).shouldShowOnboarding
    ).toBe(false)

    expect(
      deriveOnboardingState(completeUser, {
        isAuthenticated: true,
        isAuthInitializing: true,
        isLoading: false,
      }).shouldShowOnboarding
    ).toBe(false)
  })
})
