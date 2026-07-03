/**
 * DM Eligibility server functions
 * Checks if a user can message a creator based on purchase/collection history
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import {
  checkDmEligibility,
  type DmEligibilityResult,
} from '@/server/utils/dm-eligibility-internal'

// Re-export type for client use
export type { DmEligibilityResult }

const eligibilitySchema = z.object({
  creatorId: z.string().uuid(),
})

/**
 * Server function wrapper for checkDmEligibility
 * Use this from client-side, use checkDmEligibility directly from other server functions
 *
 * The viewer is always the server-verified auth user — never a client-supplied id.
 * Messaging requires being logged in, so an unauthenticated caller is simply
 * treated as "not eligible" rather than erroring, which lets the UI render
 * cleanly without needing to special-case a 401.
 */
export const canUserMessage = createServerFn({
  method: 'GET',
}).handler(async (input: unknown): Promise<{ success: boolean; data?: DmEligibilityResult; error?: string }> => {
  // { optional: true } is required here — withAuth() throws on unauthenticated
  // callers by default, it does not return null. Without this flag the
  // graceful-degradation branch below is unreachable dead code and an
  // unauthenticated caller gets an unhandled throw instead of "not eligible".
  const result = await withAuth(eligibilitySchema, input, { optional: true })
  if (!result) {
    return {
      success: true,
      data: { allowed: false, eligibleVia: [], unlockPaths: [] },
    }
  }

  const { auth, input: parsed } = result
  // Use server-verified userId as the viewer — not a client-supplied field
  return checkDmEligibility(parsed.creatorId, auth.userId)
})
