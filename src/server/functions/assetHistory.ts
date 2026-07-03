/**
 * Asset History server functions
 * Provides transfer history and provenance data for minted posts
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withOptionalAuth } from '@/server/auth'
import { getBlockedUserIdSet } from '@/server/utils/blocks'

const getPostTransferHistorySchema = z.object({
	postId: z.string().uuid(),
})

export const getPostTransferHistory = createServerFn({
	method: 'POST',
}).handler(async (input: unknown) => {
	try {
		const result = await withOptionalAuth(getPostTransferHistorySchema, input)
		if (!result) {
			return { success: false as const, error: 'Invalid input' }
		}

		const { input: data } = result
		const { postId } = data
		const blocked = await getBlockedUserIdSet(result.auth?.userId)

		// Dynamic import to avoid leaking DB into client bundle
		const { getPostTransferHistoryDirect } = await import(
			'@/server/utils/post-transfer-history'
		)
		const historyResult = await getPostTransferHistoryDirect(postId, blocked)

		if (!historyResult.found) {
			return { success: false as const, error: 'Post not found' }
		}

		return {
			success: true as const,
			summary: historyResult.summary,
			transfers: historyResult.transfers,
		}
	} catch (error) {
		console.error('[getPostTransferHistory] Error:', error)
		return {
			success: false as const,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
})
