import { useMemo } from 'react'

import { useCurrentUser } from './useCurrentUser'
import type { OnboardingState } from '@/lib/onboarding'

export interface UseOnboardingStateReturn extends OnboardingState {
  onboardingState: OnboardingState
  isLoading: boolean
  isAuthInitializing: boolean
  error: Error | null
}

/**
 * Focused hook for routes/components that only need first-run onboarding state.
 * Keeps onboarding consumers from duplicating useCurrentUser loading/derivation logic.
 */
export function useOnboardingState(): UseOnboardingStateReturn {
  const {
    onboardingState,
    isNewUser,
    isProfileIncomplete,
    shouldShowOnboarding,
    missingProfileFields,
    isLoading,
    isAuthInitializing,
    error,
  } = useCurrentUser()

  return useMemo(
    () => ({
      onboardingState,
      isNewUser,
      isProfileIncomplete,
      shouldShowOnboarding,
      missingProfileFields,
      isLoading,
      isAuthInitializing,
      error,
    }),
    [
      onboardingState,
      isNewUser,
      isProfileIncomplete,
      shouldShowOnboarding,
      missingProfileFields,
      isLoading,
      isAuthInitializing,
      error,
    ]
  )
}

export default useOnboardingState
