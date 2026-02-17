/**
 * Wallet Overview Endpoint
 * GET /api/v1/wallet/overview
 *
 * Get wallet balances, tokens, NFTs, and activity for the authenticated user.
 *
 * Authentication: Required
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getWalletOverviewDirect } from '@/server/utils/wallets'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token from header
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	// Call the direct utility function
	const result = await getWalletOverviewDirect(token)

	if (!result.success) {
		const errorMessage = result.error || 'Failed to load wallet'
		const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
			errorMessage.toLowerCase().includes('auth')

		setResponseStatus(event, isAuthError ? 401 : 500)
		return {
			success: false,
			error: {
				code: isAuthError ? 'AUTH_REQUIRED' : 'WALLET_ERROR',
				message: errorMessage,
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			totalUsd: result.totalUsd,
			solPriceUsd: result.solPriceUsd,
			solChangePct24h: result.solChangePct24h,
			wallets: result.wallets,
			tokens: result.tokens,
			activity: result.activity,
			nfts: result.nfts,
		},
		requestId,
	}
})
