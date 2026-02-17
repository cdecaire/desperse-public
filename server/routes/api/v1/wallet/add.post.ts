/**
 * Add Wallet Endpoint
 * POST /api/v1/wallet/add
 *
 * Add a new wallet for the authenticated user.
 *
 * Authentication: Required
 *
 * Request:
 * {
 *   "address": "solana-address",
 *   "type": "embedded" | "external",
 *   "connector": "mwa" | "privy" (optional),
 *   "label": "My Wallet" (optional, max 50 chars)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "wallet": { id, address, type, connector, label, isPrimary, createdAt }
 *   }
 * }
 */

import {
  defineEventHandler,
  getHeader,
  readBody,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { addWalletDirect } from '@/server/utils/wallet-preferences'

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
  if (!body.address || typeof body.address !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'address is required and must be a string',
      },
      requestId,
    }
  }

  if (!body.type || typeof body.type !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'type is required and must be a string',
      },
      requestId,
    }
  }

  const result = await addWalletDirect(
    token,
    body.address as string,
    body.type as string,
    body.connector as string | undefined,
    body.label as string | undefined
  )

  if (!result.success) {
    const errorMessage = result.error || 'Failed to add wallet'
    const isAuthError = errorMessage.toLowerCase().includes('authentication')
    const isDuplicate = errorMessage.toLowerCase().includes('already')

    setResponseStatus(event, isAuthError ? 401 : isDuplicate ? 409 : 400)
    return {
      success: false,
      error: {
        code: isAuthError ? 'AUTH_REQUIRED' : isDuplicate ? 'DUPLICATE_WALLET' : 'VALIDATION_ERROR',
        message: errorMessage,
      },
      requestId,
    }
  }

  return {
    success: true,
    data: {
      wallet: result.wallet,
    },
    requestId,
  }
})
