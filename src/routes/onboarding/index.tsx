import { Stack } from '@cdecaire/sable/layout'
import { createFileRoute } from '@tanstack/react-router'

import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
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
      <OnboardingLayout>
        <Stack gap={1} className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-heading-3">We could not load onboarding yet</h1>
          <p className="text-body-sm text-muted-foreground">
            Refresh and try again. If this keeps happening, continue from profile settings.
          </p>
        </Stack>
      </OnboardingLayout>
    )
  }

  if (isResolving) {
    return (
      <OnboardingLayout>
        <ContentLoadingSkeleton label="Loading onboarding" rows={3} variant="form" />
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout>
      <OnboardingShell isComplete={!shouldShowOnboarding} />
    </OnboardingLayout>
  )
}
