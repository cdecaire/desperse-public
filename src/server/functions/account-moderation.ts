import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import { requireModerator } from '@/server/utils/auth-helpers'
import {
  getAccountModerationContext,
  updateAccountModerationStatus,
  USER_STATUSES,
} from '@/server/utils/account-moderation'

const contextSchema = z.object({ subjectUserId: z.string().uuid() })
const updateSchema = z.object({
  subjectUserId: z.string().uuid(),
  expectedStatus: z.enum(USER_STATUSES),
  nextStatus: z.enum(USER_STATUSES),
  reason: z.string().trim().min(3).max(500),
  linkedReportId: z.string().uuid().nullable().optional(),
})

export const getModeratedAccount = createServerFn({ method: 'GET' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(contextSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required.' }
    await requireModerator(result.auth.userId)
    const context = await getAccountModerationContext(result.input.subjectUserId)
    return context
      ? { success: true as const, context }
      : { success: false as const, error: 'Account not found.' }
  } catch (error) {
    console.error('[getModeratedAccount] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to load account moderation details.' }
  }
})

export const changeModeratedAccountStatus = createServerFn({ method: 'POST' }).handler(async (input: unknown) => {
  try {
    const result = await withAuth(updateSchema, input)
    if (!result) return { success: false as const, error: 'Authentication required.' }
    await requireModerator(result.auth.userId)
    return await updateAccountModerationStatus({
      actorUserId: result.auth.userId,
      ...result.input,
    })
  } catch (error) {
    console.error('[changeModeratedAccountStatus] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false as const, error: 'Failed to update account status.' }
  }
})
