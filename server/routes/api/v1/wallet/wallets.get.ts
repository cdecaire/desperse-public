/**
 * Get User Wallets Endpoint
 * GET /api/v1/wallet/wallets
 *
 * Get all wallets for the authenticated user.
 *
 * Authentication: Required
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "wallets": [{ id, address, type, connector, label, isPrimary, createdAt }]
 *   }
 * }
 */

import {
  defineEventHandler,
  getHeader,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { getUserWalletsDirect } from '@/server/utils/wallet-preferences'

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

  const result = await getUserWalletsDirect(token)

  if (!result.success) {
    const errorMessage = result.error || 'Failed to fetch wallets'
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
      wallets: result.wallets,
    },
    requestId,
  }
})
