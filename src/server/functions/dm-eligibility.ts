/**
 * DM Eligibility server functions
 * Checks if a user can message a creator based on purchase/collection history
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  checkDmEligibility,
  type DmEligibilityResult,
} from '@/server/utils/dm-eligibility-internal'

// Re-export type for client use
export type { DmEligibilityResult }

const eligibilitySchema = z.object({
  creatorId: z.string().uuid(),
  viewerId: z.string().uuid(),
})

/**
 * Server function wrapper for checkDmEligibility
 * Use this from client-side, use checkDmEligibility directly from other server functions
 */
export const canUserMessage = createServerFn({
  method: 'GET',
}).handler(async (input: unknown): Promise<{ success: boolean; data?: DmEligibilityResult; error?: string }> => {
  const rawData = input && typeof input === 'object' && 'data' in input
    ? (input as { data: unknown }).data
    : input

  const { creatorId, viewerId } = eligibilitySchema.parse(rawData)
  return checkDmEligibility(creatorId, viewerId)
})
