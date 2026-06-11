export type MissingProfileField = 'displayName' | 'avatarUrl' | 'bio' | 'socialOrWebsite'

export interface OnboardingAuthState {
  isAuthenticated: boolean
  isAuthInitializing: boolean
  isLoading: boolean
}

export interface OnboardingProfileUser {
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  link: string | null
  twitterUsername: string | null
  instagramUsername: string | null
}

export interface OnboardingState {
  isNewUser: boolean
  isProfileIncomplete: boolean
  shouldShowOnboarding: boolean
  missingProfileFields: MissingProfileField[]
}

export interface FirstPostCtaState {
  isOwnProfile: boolean
  postCount: number
  shouldShowOnboarding: boolean
}

const hasText = (value: string | null | undefined) => Boolean(value?.trim())

export function getMissingProfileFields(
  user: OnboardingProfileUser | null
): MissingProfileField[] {
  const missing: MissingProfileField[] = []

  if (!hasText(user?.displayName)) missing.push('displayName')
  if (!hasText(user?.avatarUrl)) missing.push('avatarUrl')
  if (!hasText(user?.bio)) missing.push('bio')

  const hasSocialOrWebsite =
    hasText(user?.link) || hasText(user?.twitterUsername) || hasText(user?.instagramUsername)

  if (!hasSocialOrWebsite) missing.push('socialOrWebsite')

  return missing
}

export function deriveOnboardingState(
  user: OnboardingProfileUser | null,
  auth: OnboardingAuthState
): OnboardingState {
  const missingProfileFields = getMissingProfileFields(user)
  const isNewUser = auth.isAuthenticated && !user
  const isProfileIncomplete = missingProfileFields.length > 0
  const canRoute = auth.isAuthenticated && !auth.isAuthInitializing && !auth.isLoading

  return {
    isNewUser,
    isProfileIncomplete,
    shouldShowOnboarding: canRoute && isProfileIncomplete,
    missingProfileFields,
  }
}

export function shouldShowFirstPostCta({
  isOwnProfile,
  postCount,
  shouldShowOnboarding,
}: FirstPostCtaState): boolean {
  return isOwnProfile && postCount === 0 && !shouldShowOnboarding
}
