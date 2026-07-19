/**
 * Dev preview of the first-run onboarding flow.
 *
 * Runs the REAL OnboardingShell (profile → first collectible → share) in
 * `previewMode`, which seeds sample content and stubs every write: no profile
 * PATCH, no avatar/media blob uploads, no createPost. Username availability is
 * the only network call and it's a read-only GET. Nothing is created or updated.
 *
 * Reach it at /dev/onboarding-preview — no new user required.
 */

import { createFileRoute } from '@tanstack/react-router'

import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'

export const Route = createFileRoute('/dev/onboarding-preview')({
  component: OnboardingPreviewRoute,
})

function OnboardingPreviewRoute() {
  return (
    <OnboardingLayout>
      <div className="w-full space-y-6">
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-body-sm text-muted-foreground">
          <strong className="text-foreground">Preview mode.</strong> Sample profile data is pre-filled; publishing and
          profile saves are stubbed, so no post or account change is written. Click through all three stages to
          spot-check the UI.
        </div>
        <OnboardingShell previewMode />
      </div>
    </OnboardingLayout>
  )
}
