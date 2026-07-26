import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Row } from '@cdecaire/sable/layout'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { EmptyState } from '@/components/shared/EmptyState'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
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
    return <ContentLoadingSkeleton className="min-h-[50vh]" label="Loading your profile" />
  }

  // User is authenticated but no wallet connected - need to link wallet
  if (!walletAddress) {
    return (
      <Row justify="center" align="center" className="min-h-[50vh] px-4">
        <EmptyState
          icon={<Icon name="wallet" variant="regular" className="text-2xl" />}
          title="Wallet Required"
          description="Please connect a Solana wallet to complete your profile setup."
          action={{ label: 'Go to Feed', to: '/' }}
        />
      </Row>
    )
  }

  // User authenticated with wallet but profile creation failed
  if (!user && error) {
    return (
      <Row justify="center" align="center" className="min-h-[50vh] px-4">
        <EmptyState
          icon={
            <Icon name="triangle-exclamation" variant="regular" className="text-2xl text-destructive" />
          }
          title="Something went wrong"
          description="We couldn't load your profile. Please try again."
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </Row>
    )
  }

  // Still loading or about to redirect
  return <ContentLoadingSkeleton className="min-h-[50vh]" label="Opening your profile" />
}
