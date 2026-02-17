/**
 * Ably token Direct utility function for REST API endpoints.
 */

import { authenticateWithToken } from '@/server/auth'
import { generateAblyTokenRequest } from '@/server/utils/ably-token-internal'

export interface AblyTokenResult {
	success: boolean
	tokenRequest?: any
	error?: string
}

/**
 * Get an Ably token request for the authenticated user
 */
export async function getAblyTokenDirect(
	token: string
): Promise<AblyTokenResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const tokenRequest = await generateAblyTokenRequest(userId)
		return { success: true, tokenRequest }
	} catch (error) {
		console.error(
			'Error in getAblyTokenDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to generate Ably token' }
	}
}
