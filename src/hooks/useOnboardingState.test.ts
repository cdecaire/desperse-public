/** @vitest-environment jsdom */

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { OnboardingState } from '@/lib/onboarding'
import { useCurrentUser, type UseCurrentUserReturn } from './useCurrentUser'
import { useOnboardingState } from './useOnboardingState'

vi.mock('./useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

const baseOnboardingState: OnboardingState = {
  isNewUser: false,
  isProfileIncomplete: false,
  shouldShowOnboarding: false,
  missingProfileFields: [],
}

function mockCurrentUser(overrides: Partial<UseCurrentUserReturn>) {
  vi.mocked(useCurrentUser).mockReturnValue({
    user: null,
    isLoading: false,
    isAuthInitializing: false,
    isInitializing: false,
    isFetching: false,
    error: null,
    onboardingState: baseOnboardingState,
    isNewUser: baseOnboardingState.isNewUser,
    isProfileIncomplete: baseOnboardingState.isProfileIncomplete,
    shouldShowOnboarding: baseOnboardingState.shouldShowOnboarding,
    missingProfileFields: baseOnboardingState.missingProfileFields,
    refetch: vi.fn(),
    ...overrides,
  })
}

describe('useOnboardingState', () => {
  it('exposes only stable onboarding/loading/error state from useCurrentUser', () => {
    const onboardingState: OnboardingState = {
      isNewUser: false,
      isProfileIncomplete: true,
      shouldShowOnboarding: true,
      missingProfileFields: ['bio', 'socialOrWebsite'],
    }
    const error = new Error('current user failed')

    mockCurrentUser({
      onboardingState,
      isProfileIncomplete: true,
      shouldShowOnboarding: true,
      missingProfileFields: onboardingState.missingProfileFields,
      error,
    })

    const { result } = renderHook(() => useOnboardingState())

    expect(result.current).toEqual({
      onboardingState,
      isNewUser: false,
      isProfileIncomplete: true,
      shouldShowOnboarding: true,
      missingProfileFields: ['bio', 'socialOrWebsite'],
      isLoading: false,
      isAuthInitializing: false,
      error,
    })
  })

  it('preserves auth-initializing/loading state so consumers avoid redirect loops', () => {
    const onboardingState: OnboardingState = {
      isNewUser: false,
      isProfileIncomplete: true,
      shouldShowOnboarding: false,
      missingProfileFields: ['displayName', 'avatarUrl', 'bio', 'socialOrWebsite'],
    }

    mockCurrentUser({
      onboardingState,
      isProfileIncomplete: true,
      missingProfileFields: onboardingState.missingProfileFields,
      isLoading: true,
      isAuthInitializing: true,
    })

    const { result } = renderHook(() => useOnboardingState())

    expect(result.current.shouldShowOnboarding).toBe(false)
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthInitializing).toBe(true)
    expect(result.current.missingProfileFields).toEqual([
      'displayName',
      'avatarUrl',
      'bio',
      'socialOrWebsite',
    ])
  })
})
