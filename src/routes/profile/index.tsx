import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { useOnboardingState } from '@/hooks/useOnboardingState'
import { isOnboardingV1Enabled } from '@/config/env'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/profile/')({
  component: ProfileIndexPage,
})

function ProfileIndexPage() {
  return (
    <AuthGuard>
      <ProfileRedirect />
    </AuthGuard>
  )
}

/**
 * Redirects to the current user's profile page by slug.
 * If onboarding is active and incomplete, redirect to /onboarding instead.
 *
 * NOTE: We use useEffect (not beforeLoad + throw redirect) because onboarding
 * state is client-derived (Privy + react-query) and not cleanly available
 * in the route loader context.
 */
function ProfileRedirect() {
  const { user, isLoading, error } = useCurrentUser()
  const { walletAddress } = useAuth()
  const navigate = useNavigate()
  const { shouldShowOnboarding } = useOnboardingState()

  // Onboarding takes priority over the slug redirect: a fresh incomplete user
  // has both usernameSlug and shouldShowOnboarding === true, so we must guard
  // the slug redirect so onboarding always wins.
  useEffect(() => {
    if (isOnboardingV1Enabled() && shouldShowOnboarding) {
      navigate({ to: '/onboarding', replace: true })
      return
    }
    if (user?.usernameSlug) {
      navigate({
        to: '/profile/$slug',
        params: { slug: user.usernameSlug },
        replace: true,
      })
    }
  }, [user?.usernameSlug, shouldShowOnboarding, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // User is authenticated but no wallet connected - need to link wallet
  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon name="wallet" variant="regular" className="text-2xl text-muted-foreground" />
        </div>
        <h2 className="text-heading-3 mb-2">Wallet Required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please connect a Solana wallet to complete your profile setup.
        </p>
        <Link to="/">
          <Button variant="outline">Go to Feed</Button>
        </Link>
      </div>
    )
  }

  // User authenticated with wallet but profile creation failed
  if (!user && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Icon name="triangle-exclamation" variant="regular" className="text-2xl text-destructive" />
        </div>
        <h2 className="text-heading-3 mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          We couldn't load your profile. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  // Still loading or about to redirect
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
