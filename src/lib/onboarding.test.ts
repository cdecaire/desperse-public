import { describe, expect, it } from 'vitest'

import { deriveOnboardingState, shouldShowFirstPostCta } from './onboarding'

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
      missingProfileFields: ['displayName', 'avatarUrl'],
    })
  })

  it('requires only a display name and a photo', () => {
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
      missingProfileFields: ['displayName', 'avatarUrl'],
    })
  })

  it('does not require a bio or a website/social link', () => {
    expect(
      deriveOnboardingState(
        {
          ...completeUser,
          bio: '',
          link: null,
          twitterUsername: null,
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

describe('shouldShowFirstPostCta', () => {
  it('shows the create CTA for an empty own profile after onboarding is complete', () => {
    expect(
      shouldShowFirstPostCta({
        isOwnProfile: true,
        postCount: 0,
        shouldShowOnboarding: false,
      })
    ).toBe(true)
  })

  it('hides the create CTA while onboarding still needs profile completion', () => {
    expect(
      shouldShowFirstPostCta({
        isOwnProfile: true,
        postCount: 0,
        shouldShowOnboarding: true,
      })
    ).toBe(false)
  })

  it('hides the create CTA once the creator already has posts', () => {
    expect(
      shouldShowFirstPostCta({
        isOwnProfile: true,
        postCount: 3,
        shouldShowOnboarding: false,
      })
    ).toBe(false)
  })

  it('hides the create CTA on someone else\'s profile', () => {
    expect(
      shouldShowFirstPostCta({
        isOwnProfile: false,
        postCount: 0,
        shouldShowOnboarding: false,
      })
    ).toBe(false)
  })
})
