/**
 * Prepare Storage Credits Top-Up
 * POST /api/v1/arweave/topup/prepare
 *
 * Builds an unsigned SOL transfer to the Turbo deposit address. Client
 * signs, broadcasts (via Solana RPC), then submits the txId directly to
 * Turbo's payment service (https://payment.ardrive.io/account/balance/solana).
 *
 * This endpoint exists to keep iOS aligned with the rest of its
 * server-prepares-unsigned-tx pattern (Send / Tip / Buy). Web and Android
 * clients can keep using the Turbo SDK directly; this endpoint is purely
 * additive.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "walletAddress": "base58...",
 *   "amountSol": "0.05"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "transactionBase64": "...",
 *     "blockhash": "...",
 *     "lastValidBlockHeight": 12345,
 *     "turboAddress": "base58..."
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
import { isArweaveStorageEnabled, env } from '@/config/env'
import { buildTransferTransaction } from '@/server/utils/transfer-transaction'

interface TurboInfoResponse {
	addresses?: Record<string, string>
}

let cachedTurboSolanaAddress: string | null = null
let cachedAt = 0
const TURBO_INFO_CACHE_MS = 60 * 60 * 1000 // 1 hour

async function getTurboSolanaDepositAddress(): Promise<string> {
	const now = Date.now()
	if (cachedTurboSolanaAddress && now - cachedAt < TURBO_INFO_CACHE_MS) {
		return cachedTurboSolanaAddress
	}

	const uploadUrl = env.TURBO_UPLOAD_URL || 'https://upload.ardrive.io'
	const { retryWithBackoff } = await import('@/lib/retryUtils')
	const info = await retryWithBackoff(
		async () => {
			const res = await fetch(`${uploadUrl}/v1/info`, {
				headers: { Accept: 'application/json' },
			})
			if (!res.ok) {
				throw new Error(`Turbo info request failed: HTTP ${res.status}`)
			}
			return (await res.json()) as TurboInfoResponse
		},
		{ maxRetries: 3, baseDelayMs: 500 },
	)
	const address = info.addresses?.solana
	if (!address) {
		throw new Error('Turbo did not return a Solana deposit address')
	}
	cachedTurboSolanaAddress = address
	cachedAt = now
	return address
}

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	if (!isArweaveStorageEnabled()) {
		setResponseStatus(event, 404)
		return {
			success: false,
			error: { code: 'FEATURE_DISABLED', message: 'Arweave storage is not enabled' },
			requestId,
		}
	}

	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader

	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
			requestId,
		}
	}

	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'AUTH_REQUIRED', message: 'Invalid or expired token' },
				requestId,
			}
		}
	} catch {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: { code: 'AUTH_REQUIRED', message: 'Authentication failed' },
			requestId,
		}
	}

	let body: Record<string, unknown>
	try {
		body = (await readBody(event)) || {}
	} catch {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
			requestId,
		}
	}

	if (!body.walletAddress || typeof body.walletAddress !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'walletAddress is required' },
			requestId,
		}
	}

	const amount = body.amountSol
	if (!amount || typeof amount !== 'string') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'amountSol must be a string' },
			requestId,
		}
	}

	if (!/^\d*\.?\d+$/.test(amount.trim())) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid amount format' },
			requestId,
		}
	}

	if (Number(amount) <= 0) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than 0' },
			requestId,
		}
	}

	let turboAddress: string
	try {
		turboAddress = await getTurboSolanaDepositAddress()
	} catch (err) {
		console.error(`[topup/prepare][${requestId}] Failed to fetch Turbo address`, err)
		setResponseStatus(event, 502)
		return {
			success: false,
			error: {
				code: 'TURBO_INFO_UNAVAILABLE',
				message: 'Could not resolve Turbo deposit address',
			},
			requestId,
		}
	}

	const from = (body.walletAddress as string).trim()
	if (from === turboAddress) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: 'SELF_SEND', message: 'walletAddress cannot equal the Turbo deposit address' },
			requestId,
		}
	}

	try {
		const result = await buildTransferTransaction({
			from,
			to: turboAddress,
			amount: amount.trim(),
			asset: 'sol',
		})

		return {
			success: true,
			data: {
				transactionBase64: result.transactionBase64,
				blockhash: result.blockhash,
				lastValidBlockHeight: result.lastValidBlockHeight,
				turboAddress,
			},
			requestId,
		}
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to build transaction'
		console.error(`[topup/prepare][${requestId}] Build failed:`, message)

		let errorCode = 'TRANSACTION_BUILD_FAILED'
		let statusCode = 400

		if (message.includes('Invalid') && message.includes('address')) {
			errorCode = 'INVALID_ADDRESS'
		} else if (message.includes('Insufficient') || message.includes('insufficient')) {
			errorCode = 'INSUFFICIENT_BALANCE'
		} else if (message.includes('RPC')) {
			statusCode = 502
			errorCode = 'RPC_ERROR'
		}

		setResponseStatus(event, statusCode)
		return {
			success: false,
			error: { code: errorCode, message },
			requestId,
		}
	}
})
