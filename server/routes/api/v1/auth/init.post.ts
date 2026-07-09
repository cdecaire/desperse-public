/**
 * Auth Init Endpoint
 * POST /api/v1/auth/init
 *
 * Initialize or update user after Privy authentication.
 * Creates user if not exists, updates wallet/avatar if changed.
 *
 * Authentication: Required (Bearer token in Authorization header)
 */

import { defineEventHandler, readBody, getHeader, setHeaders, setResponseStatus, getCookie, deleteCookie } from 'h3'
import { initAuthWithToken } from '@/server/utils/auth-standalone'
import { extractSignupMetadata } from '@/server/utils/signup-metadata'
import {
  bindReferralToUserFromAttributionSession,
  getActiveReferralAttributionSessionFromSignedCookie,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from '@/server/utils/referrals'

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
				message: 'Authentication required. Please provide a valid Bearer token.',
			},
			requestId,
		}
	}

	// Parse request body
	let body: Record<string, unknown>
	try {
		body = (await readBody(event)) || {}
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request body',
			},
			requestId,
		}
	}

	// Debug logging for Android API troubleshooting
	console.log(`[init.post] ${requestId} body=`, JSON.stringify(body), 'tokenLength=', token?.length)

	// Call the standalone auth function (not TanStack server function)
	const result = await initAuthWithToken(
		token,
		body as { walletAddress: string; email?: string; name?: string; avatarUrl?: string },
		extractSignupMetadata(event)
	)

	const referralCookie = getCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME)
	const referralSession = await getActiveReferralAttributionSessionFromSignedCookie(referralCookie)

	// Debug logging
	console.log(`[init.post] ${requestId} result=`, JSON.stringify(result))

	// Transform response to API envelope format
	if (!result || !result.success) {
		const errorMsg = result?.error || 'Failed to initialize user'
		console.log(`[init.post] ${requestId} error: ${errorMsg}`)
		const statusCode = errorMsg.includes('Authentication') ? 401 : 400
		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: {
				code: errorMsg.includes('Authentication')
					? 'AUTH_REQUIRED'
					: 'VALIDATION_ERROR',
				message: errorMsg,
			},
			requestId,
		}
	}

	if (referralSession && result.user?.id && result.isNewUser) {
		try {
			await bindReferralToUserFromAttributionSession({
				attributionSessionId: referralSession.id,
				referredUserId: result.user.id,
			})
		} catch (referralErr) {
			console.warn(`[init.post] ${requestId} Referral binding failed:`, referralErr instanceof Error ? referralErr.message : 'Unknown error')
		}
		deleteCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME, { path: '/' })
	}

	return {
		success: true,
		data: {
			user: result.user,
			isNewUser: result.isNewUser,
		},
		requestId,
	}
})
