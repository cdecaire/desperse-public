import { createFileRoute } from '@tanstack/react-router'

import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
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
    missingProfileFields,
    error,
  } = useOnboardingState()
  const isResolving = isLoading || isAuthInitializing

  if (error) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">We could not load onboarding yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Refresh and try again. If this keeps happening, continue from profile settings.
          </p>
        </div>
      </main>
    )
  }

  if (isResolving) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoadingSpinner size="lg" />
          <p className="text-sm">Checking your onboarding state...</p>
        </div>
      </main>
    )
  }

  return (
    <OnboardingShell
      isComplete={!shouldShowOnboarding}
      missingProfileFields={missingProfileFields}
    />
  )
}
