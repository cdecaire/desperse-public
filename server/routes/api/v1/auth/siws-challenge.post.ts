/**
 * SIWS Challenge Endpoint
 * POST /api/v1/auth/siws-challenge
 *
 * Generate a Sign In With Solana challenge message for wallet authentication.
 * The client signs this message with their wallet and submits to /siws-verify.
 *
 * Authentication: None required (this is pre-login)
 *
 * Request body: { walletAddress: string }
 * Response: { success: true, data: { message: string, nonce: string } }
 */

import {
  defineEventHandler,
  readBody,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { generateSiwsChallenge } from '@/server/utils/siws'

export default defineEventHandler(async (event) => {
  const requestId = `req_${randomUUID().slice(0, 12)}`

  setHeaders(event, {
    'X-Request-Id': requestId,
    'X-Api-Version': '1',
    'Cache-Control': 'no-store',
  })

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

  const walletAddress = typeof body.walletAddress === 'string'
    ? body.walletAddress.trim()
    : ''

  // Validate wallet address format: base58, 32-44 chars
  if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid wallet address. Must be a valid Solana address (32-44 characters).',
      },
      requestId,
    }
  }

  // Validate base58 characters only
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
  if (!base58Regex.test(walletAddress)) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid wallet address. Contains non-base58 characters.',
      },
      requestId,
    }
  }

  try {
    const result = generateSiwsChallenge(walletAddress)

    if (!result.success || !result.message || !result.nonce) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: {
          code: 'CHALLENGE_FAILED',
          message: result.error || 'Failed to generate challenge',
        },
        requestId,
      }
    }

    return {
      success: true,
      data: {
        message: result.message,
        nonce: result.nonce,
      },
      requestId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[siws-challenge][${requestId}] Error:`, error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      requestId,
    }
  }
})
