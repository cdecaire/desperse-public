/**
 * Prepare Tip Endpoint
 * POST /api/v1/tips/prepare
 *
 * Prepare a SKR tip transaction. Returns unsigned transaction for client to sign.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "toUserId": "uuid",
 *   "amount": 50,
 *   "context": "profile" | "message_unlock",
 *   "walletAddress": "optional-sender-wallet"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tipId": "uuid",
 *     "transaction": "base64...",
 *     "blockhash": "...",
 *     "lastValidBlockHeight": 12345
 *   }
 * }
 */

import {
	defineEventHandler,
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { authenticateWithToken } from '@/server/auth'
import { prepareTipInternal } from '@/server/utils/tips-internal'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	// Extract authorization token
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

	// Authenticate
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: {
					code: 'AUTH_REQUIRED',
					message: 'Invalid or expired token',
				},
				requestId,
			}
		}
		userId = auth.userId
	} catch {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'AUTH_REQUIRED',
				message: 'Authentication failed',
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

	// Validate required fields
	if (!body.toUserId || typeof body.toUserId !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'toUserId is required',
			},
			requestId,
		}
	}

	if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'amount must be a positive number',
			},
			requestId,
		}
	}

	const context = (body.context as string) || 'profile'
	if (context !== 'profile' && context !== 'message_unlock') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'context must be "profile" or "message_unlock"',
			},
			requestId,
		}
	}

	// Resolve sender wallet address
	const walletAddress = body.walletAddress as string | undefined
	let senderWallet: string

	if (walletAddress) {
		senderWallet = walletAddress
	} else {
		// Fall back to user's primary wallet
		const { getPrimaryWalletAddress } = await import(
			'@/server/utils/wallet-compat'
		)
		const { db } = await import('@/server/db')
		const { users } = await import('@/server/db/schema')
		const { eq } = await import('drizzle-orm')

		const primary = await getPrimaryWalletAddress(userId)
		if (primary) {
			senderWallet = primary
		} else {
			const [user] = await db
				.select({ walletAddress: users.walletAddress })
				.from(users)
				.where(eq(users.id, userId))
				.limit(1)

			if (!user?.walletAddress) {
				setResponseStatus(event, 400)
				return {
					success: false,
					error: {
						code: 'NO_WALLET',
						message: 'No wallet address found. Please connect a wallet.',
					},
					requestId,
				}
			}
			senderWallet = user.walletAddress
		}
	}

	// Call the internal prepare function
	const result = await prepareTipInternal(userId, senderWallet, {
		toUserId: body.toUserId as string,
		amount: body.amount as number,
		context: context as 'profile' | 'message_unlock',
	})

	if (!result.success) {
		let statusCode = 400
		let errorCode = 'VALIDATION_ERROR'

		if (result.status === 'rate_limited') {
			statusCode = 429
			errorCode = 'RATE_LIMITED'
		} else if (result.status === 'self_tip') {
			errorCode = 'SELF_TIP'
		} else if (result.status === 'not_found') {
			statusCode = 404
			errorCode = 'NOT_FOUND'
		}

		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: {
				code: errorCode,
				message: result.error || 'Failed to prepare tip',
			},
			requestId,
		}
	}

	return {
		success: true,
		data: {
			tipId: result.tipId,
			transaction: result.transaction,
			blockhash: result.blockhash,
			lastValidBlockHeight: result.lastValidBlockHeight,
		},
		requestId,
	}
})
