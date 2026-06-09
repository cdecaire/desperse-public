import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProfileSetupStep } from './ProfileSetupStep'

export interface OnboardingStep {
  id: 'profile' | 'firstPost' | 'advanced'
  title: string
  description: string
  status: 'current' | 'upcoming' | 'complete'
}

interface OnboardingShellProps {
  isLoading?: boolean
  isComplete?: boolean
}

export function getOnboardingSteps({
  isComplete = false,
}: Pick<OnboardingShellProps, 'isComplete'> = {}): OnboardingStep[] {
  return [
    {
      id: 'profile',
      title: 'Set up your public profile',
      description: 'Add the minimum identity details people need before they follow or collect from you.',
      status: isComplete ? 'complete' : 'current',
    },
    {
      id: 'firstPost',
      title: 'Make your first Standard post',
      description: 'Start with a simple post before adding Collectible or Edition decisions.',
      status: isComplete ? 'current' : 'upcoming',
    },
    {
      id: 'advanced',
      title: 'Unlock advanced post types later',
      description: 'Collectibles and editions stay available, but they do not block your first-run setup.',
      status: 'upcoming',
    },
  ]
}

function StepBadge({ status }: { status: OnboardingStep['status'] }) {
  if (status === 'complete') {
    return <Badge variant="success">Complete</Badge>
  }

  if (status === 'current') {
    return <Badge>Current</Badge>
  }

  return <Badge variant="secondary">Next</Badge>
}

export function OnboardingShell({
  isLoading = false,
  isComplete = false,
}: OnboardingShellProps) {
  const steps = getOnboardingSteps({ isComplete })

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="outline">First-run setup</Badge>
              <div className="space-y-2">
                <h1 className="text-heading-1">
                  Get your Desperse creator profile ready
                </h1>
                <p className="max-w-2xl text-body-md text-muted-foreground">
                  A short path from sign-in to a usable public profile and first post. No advanced minting choices required yet.
                </p>
              </div>
            </div>

            <Button asChild size="cta">
              <Link to={isComplete ? '/create' : '/settings/profile'}>
                {isComplete ? 'Create first post' : 'Finish profile'}
              </Link>
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading your onboarding state</CardTitle>
              <CardDescription>Checking your profile before showing the next step.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.id} className={step.status === 'current' ? 'border-primary/60 shadow-md' : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-label-lg">
                      {index + 1}
                    </span>
                    <StepBadge status={step.status} />
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !isComplete ? (
          <ProfileSetupStep />
        ) : null}
      </div>
    </main>
  )
}

export default OnboardingShell
