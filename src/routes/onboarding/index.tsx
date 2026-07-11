import { Stack } from '@cdecaire/sable/layout'
import { createFileRoute } from '@tanstack/react-router'

import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { useOnboardingState } from '@/hooks/useOnboardingState'

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  )
}

function OnboardingContent() {
  const {
    isLoading,
    isAuthInitializing,
    shouldShowOnboarding,
    error,
  } = useOnboardingState()
  const isResolving = isLoading || isAuthInitializing

  if (error) {
    return (
      <StaticPageLayout maxWidth="64rem">
        <Stack gap={1} className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-heading-3">We could not load onboarding yet</h1>
          <p className="text-body-sm text-muted-foreground">
            Refresh and try again. If this keeps happening, continue from profile settings.
          </p>
        </Stack>
      </StaticPageLayout>
    )
  }

  if (isResolving) {
    return (
      <StaticPageLayout maxWidth="64rem">
        <Stack align="center" className="gap-3 text-muted-foreground">
          <LoadingSpinner size="lg" />
          <p className="text-body-sm">Checking your onboarding state...</p>
        </Stack>
      </StaticPageLayout>
    )
  }

  return (
    <StaticPageLayout maxWidth="64rem">
      <OnboardingShell isComplete={!shouldShowOnboarding} />
    </StaticPageLayout>
  )
}
