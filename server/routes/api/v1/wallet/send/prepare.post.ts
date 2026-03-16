/**
 * Prepare Send Endpoint
 * POST /api/v1/wallet/send/prepare
 *
 * Build an unsigned transfer transaction for SOL, USDC, or SKR.
 * Client signs and broadcasts; no server-side confirm step needed.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "toAddress": "base58...",
 *   "amount": "1.5",
 *   "asset": "sol" | "usdc" | "skr",
 *   "walletAddress": "base58..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "transactionBase64": "...",
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
import {
	buildTransferTransaction,
	type SendableAsset,
} from '@/server/utils/transfer-transaction'

const VALID_ASSETS = new Set<string>(['sol', 'usdc', 'skr'])

const ASSET_DECIMALS: Record<string, number> = {
	sol: 9,
	usdc: 6,
	skr: 6,
}

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

	// Validate toAddress
	if (!body.toAddress || typeof body.toAddress !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'toAddress is required',
			},
			requestId,
		}
	}

	// Validate walletAddress (sender)
	if (!body.walletAddress || typeof body.walletAddress !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'walletAddress is required',
			},
			requestId,
		}
	}

	// Validate asset
	const asset = body.asset as string
	if (!asset || !VALID_ASSETS.has(asset)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'asset must be "sol", "usdc", or "skr"',
			},
			requestId,
		}
	}

	// Validate amount
	const amount = body.amount as string
	if (!amount || typeof amount !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'amount must be a string',
			},
			requestId,
		}
	}

	// Basic amount format check
	if (!/^\d*\.?\d+$/.test(amount.trim())) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid amount format',
			},
			requestId,
		}
	}

	if (Number(amount) <= 0) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Amount must be greater than 0',
			},
			requestId,
		}
	}

	// Check decimal places
	const decimals = ASSET_DECIMALS[asset]
	const fracPart = amount.split('.')[1] || ''
	const significantFrac = fracPart.replace(/0+$/, '')
	if (significantFrac.length > decimals) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: `Too many decimal places. Maximum ${decimals} allowed for ${asset.toUpperCase()}.`,
			},
			requestId,
		}
	}

	// Reject self-send
	const from = (body.walletAddress as string).trim()
	const to = (body.toAddress as string).trim()
	if (from === to) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'SELF_SEND',
				message: 'Cannot send to yourself',
			},
			requestId,
		}
	}

	// Build the unsigned transaction
	try {
		const result = await buildTransferTransaction({
			from,
			to,
			amount: amount.trim(),
			asset: asset as SendableAsset,
		})

		return {
			success: true,
			data: result,
			requestId,
		}
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : 'Failed to build transaction'

		// Map known error messages to structured codes
		let errorCode = 'TRANSACTION_BUILD_FAILED'
		let statusCode = 400

		if (message.includes('Invalid') && message.includes('address')) {
			errorCode = 'INVALID_ADDRESS'
		} else if (message.includes('Cannot send to yourself')) {
			errorCode = 'SELF_SEND'
		} else if (message.includes('Insufficient') || message.includes('insufficient')) {
			if (message.toLowerCase().includes('fee') || message.toLowerCase().includes('rent')) {
				errorCode = 'INSUFFICIENT_SOL_FOR_FEES'
			} else {
				errorCode = 'INSUFFICIENT_BALANCE'
			}
		} else if (message.includes('RPC')) {
			statusCode = 502
			errorCode = 'RPC_ERROR'
		}

		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: {
				code: errorCode,
				message,
			},
			requestId,
		}
	}
})
