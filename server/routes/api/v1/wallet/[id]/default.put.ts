/**
 * Set Default Wallet Endpoint
 * PUT /api/v1/wallet/:id/default
 *
 * Set a wallet as the primary (default) wallet for the authenticated user.
 *
 * Authentication: Required
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { "updated": true }
 * }
 */

import {
  defineEventHandler,
  getHeader,
  getRouterParam,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { setDefaultWalletDirect } from '@/server/utils/wallet-preferences'

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

  // Get wallet ID from route params
  const walletId = getRouterParam(event, 'id')

  if (!walletId) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Wallet ID is required',
      },
      requestId,
    }
  }

  const result = await setDefaultWalletDirect(token, walletId)

  if (!result.success) {
    const errorMessage = result.error || 'Failed to set default wallet'
    const isAuthError = errorMessage.toLowerCase().includes('authentication')
    const isNotFound = errorMessage.toLowerCase().includes('not found')

    setResponseStatus(event, isAuthError ? 401 : isNotFound ? 404 : 400)
    return {
      success: false,
      error: {
        code: isAuthError ? 'AUTH_REQUIRED' : isNotFound ? 'NOT_FOUND' : 'VALIDATION_ERROR',
        message: errorMessage,
      },
      requestId,
    }
  }

  return {
    success: true,
    data: {
      updated: true,
    },
    requestId,
  }
})
