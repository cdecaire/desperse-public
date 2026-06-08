import { describe, expect, it } from 'vitest'

import { getOnboardingSteps } from './OnboardingShell'

describe('getOnboardingSteps', () => {
  it('marks profile setup as current until onboarding is complete', () => {
    expect(getOnboardingSteps({ isComplete: false }).map((step) => step.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('moves first-post creation to current after profile onboarding is complete', () => {
    expect(getOnboardingSteps({ isComplete: true }).map((step) => step.status)).toEqual([
      'complete',
      'current',
      'upcoming',
    ])
  })
})
