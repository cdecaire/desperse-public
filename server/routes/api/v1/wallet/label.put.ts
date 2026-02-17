/**
 * Update Wallet Label Endpoint
 * PUT /api/v1/wallet/label
 *
 * Update the label of a wallet by address for the authenticated user.
 * Used when the mobile app identifies the wallet app name.
 *
 * Authentication: Required
 *
 * Request:
 * {
 *   "address": "solana-address",
 *   "label": "Phantom"
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
import { updateWalletLabelDirect } from '@/server/utils/wallet-preferences'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

  setHeaders(event, {
    'X-Request-Id': requestId,
    'X-Api-Version': '1',
    'Cache-Control': 'no-store',
  })

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

  if (!body.address || typeof body.address !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'address is required' },
      requestId,
    }
  }

  if (!body.label || typeof body.label !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'label is required' },
      requestId,
    }
  }

  const result = await updateWalletLabelDirect(
    token,
    body.address as string,
    body.label as string
  )

  if (!result.success) {
    setResponseStatus(event, result.error?.includes('Authentication') ? 401 : 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: result.error },
      requestId,
    }
  }

  return {
    success: true,
    data: { wallet: result.wallet },
    requestId,
  }
})
