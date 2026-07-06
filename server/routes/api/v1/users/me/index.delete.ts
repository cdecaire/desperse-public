// TODO: Apple SIWA token revocation requires capturing authorizationCode during native sign-in (currently abstracted by Privy SDK). Track in follow-up.
/**
 * DELETE /api/v1/users/me
 * Permanently delete the authenticated user's account.
 *
 * Behavior:
 *  1. Verify Privy bearer token via authenticateWithToken().
 *  2. Within a single Drizzle transaction:
 *     a. Delete DM messages sent by the user (RESTRICT FK).
 *     b. Delete DM threads the user participates in or created (RESTRICT FK).
 *     c. Delete the users row — cascade FKs handle posts, comments, follows,
 *        likes, push_tokens, mentions, user_wallets, tips, collections,
 *        purchases, notifications, content_reports, beta_feedback,
 *        creator_storage_balances, creator_settings, pfp_mints. SET NULL FKs
 *        for moderator audit fields also clear automatically.
 *  3. Best-effort call privyClient.deleteUser(privyId). Failure is logged but
 *     does not fail the request — the local DB record is already gone.
 */

import { defineEventHandler, getHeader, setResponseStatus } from 'h3'
import { eq, or } from 'drizzle-orm'
import { db } from '@/server/db'
import { users, dmMessages, dmThreads } from '@/server/db/schema'
import { authenticateWithToken, getPrivyClient } from '@/server/auth'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		const userId = auth.userId
		const privyId = auth.privyId

		// Atomic: clear RESTRICT-FK rows then delete the user.
		// Cascade FKs handle the rest of the graph automatically.
		await db.transaction(async (tx) => {
			// 1. DM messages authored by user (senders are RESTRICT)
			await tx.delete(dmMessages).where(eq(dmMessages.senderId, userId))

			// 2. DM threads referencing the user (userAId/userBId/createdByUserId
			//    are RESTRICT; deleting the threads cascades remaining messages)
			await tx
				.delete(dmThreads)
				.where(
					or(
						eq(dmThreads.userAId, userId),
						eq(dmThreads.userBId, userId),
						eq(dmThreads.createdByUserId, userId),
					),
				)

			// 3. The user — cascades to posts, comments, follows, likes,
			//    push_tokens, mentions, user_wallets, tips, collections,
			//    purchases, notifications, content_reports, beta_feedback,
			//    creator_storage_balances, creator_settings, pfp_mints. SET
			//    NULL FKs for moderator audit fields clear automatically.
			await tx.delete(users).where(eq(users.id, userId))
		})

		// Best-effort: revoke Privy account. Local DB is already gone, so we
		// log but do not fail the request on Privy errors.
		try {
			const privy = getPrivyClient()
			await privy.deleteUser(privyId)
		} catch (privyError) {
			console.warn(
				'[DELETE /users/me] Privy deleteUser failed (DB already deleted):',
				privyError instanceof Error ? privyError.message : privyError,
			)
		}

		return {
			success: true,
			data: { deleted: true },
			requestId,
		}
	} catch (error) {
		console.error('[DELETE /users/me] Error:', error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'internal_error',
				message: error instanceof Error ? error.message : 'Failed to delete account',
			},
			requestId,
		}
	}
})
