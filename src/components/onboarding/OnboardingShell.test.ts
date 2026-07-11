import { describe, expect, it } from 'vitest'

import { getOnboardingSteps } from './OnboardingShell'

describe('getOnboardingSteps', () => {
  it('marks profile setup as current at the start', () => {
    expect(getOnboardingSteps('profile').map((step) => step.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('moves first-post creation to current after profile setup is complete', () => {
    expect(getOnboardingSteps('firstPost').map((step) => step.status)).toEqual([
      'complete',
      'current',
      'upcoming',
    ])
  })

  it('marks all steps complete except the summary once the first post stage is done', () => {
    expect(getOnboardingSteps('summary').map((step) => step.status)).toEqual([
      'complete',
      'complete',
      'current',
    ])
  })
})
