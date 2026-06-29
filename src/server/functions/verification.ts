/**
 * Discord verification — public API layer (createServerFn wrappers only).
 *
 * Per the server-function boundary rules, this file exports ONLY createServerFn
 * wrappers and delegates all DB/Node logic to src/server/utils/verification/*.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import {
	processVerification,
	loadVerificationSessionPublic,
} from '@/server/utils/verification/verify'

const submitVerificationSchema = z.object({
	sessionId: z.string().uuid(),
	walletAddress: z.string().min(32).max(64),
	signature: z.string().min(1),
	message: z.string().min(1),
})

/**
 * Submit a signed verification. Requires an authenticated Desperse session
 * (created automatically on Privy connect). Links the proven wallet to the
 * account and grants the Echoes Holder + faction roles.
 */
export const submitVerification = createServerFn({ method: 'POST' }).handler(
	async (input: unknown) => {
		const result = await withAuth(submitVerificationSchema, input)
		if (!result) {
			return { success: false, error: 'Authentication required. Please sign in first.' }
		}
		const { auth, input: data } = result
		return processVerification({
			desperseUserId: auth.userId,
			sessionId: data.sessionId,
			walletAddress: data.walletAddress,
			signature: data.signature,
			message: data.message,
		})
	},
)

const loadSessionSchema = z.object({ sessionId: z.string().uuid() })

/**
 * Public session lookup for the verify page (no auth — the session id is the
 * secret). Returns the message to sign and the expiry, or { valid: false }.
 */
export const loadVerificationSession = createServerFn({ method: 'GET' }).handler(
	async (input: unknown) => {
		const raw =
			input && typeof input === 'object' && 'data' in input
				? (input as { data: unknown }).data
				: input
		const { sessionId } = loadSessionSchema.parse(raw)
		return loadVerificationSessionPublic(sessionId)
	},
)
