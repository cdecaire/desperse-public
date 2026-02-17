/**
 * SIWS Verify Endpoint
 * POST /api/v1/auth/siws-verify
 *
 * Verify a Sign In With Solana signature, find or create the user,
 * and return a session token for subsequent authenticated requests.
 *
 * Authentication: None required (this IS the login)
 *
 * Request body: { walletAddress: string, signature: string, message: string }
 * Response: { success: true, data: { token: string, user: { id, displayName, slug, avatarUrl, walletAddress } } }
 */

import {
  defineEventHandler,
  readBody,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import {
  verifySiwsSignature,
  findOrCreateWalletUser,
  generateSessionToken,
} from '@/server/utils/siws'

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
  const signature = typeof body.signature === 'string'
    ? body.signature.trim()
    : ''
  const message = typeof body.message === 'string'
    ? body.message
    : ''
  const walletName = typeof body.walletName === 'string'
    ? body.walletName.trim()
    : undefined

  // Validate required fields
  if (!walletAddress) {
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

  if (!signature) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'signature is required',
      },
      requestId,
    }
  }

  if (!message) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'message is required',
      },
      requestId,
    }
  }

  // Validate wallet address format
  if (walletAddress.length < 32 || walletAddress.length > 44) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid wallet address format',
      },
      requestId,
    }
  }

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
    // 1. Verify the SIWS signature
    console.log(`[siws-verify][${requestId}] Verifying signature for wallet: ${walletAddress.slice(0, 8)}...`)

    const verifyResult = await verifySiwsSignature({
      walletAddress,
      signature,
      message,
    })

    if (!verifyResult.success || !verifyResult.valid) {
      console.warn(`[siws-verify][${requestId}] Verification failed: ${verifyResult.error}`)
      setResponseStatus(event, 401)
      return {
        success: false,
        error: {
          code: 'SIGNATURE_INVALID',
          message: verifyResult.error || 'Signature verification failed',
        },
        requestId,
      }
    }

    // 2. Find or create the user
    console.log(`[siws-verify][${requestId}] Signature verified, finding/creating user...`)

    const userResult = await findOrCreateWalletUser(walletAddress, walletName)

    if (!userResult.success || !userResult.user) {
      console.error(`[siws-verify][${requestId}] User creation failed: ${userResult.error}`)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: userResult.error || 'Failed to create or find user',
        },
        requestId,
      }
    }

    // 3. Generate session token
    const token = generateSessionToken(userResult.user.id, walletAddress)

    console.log(`[siws-verify][${requestId}] Login successful: userId=${userResult.user.id}, isNew=${userResult.isNew}`)

    return {
      success: true,
      data: {
        token,
        user: userResult.user,
        isNewUser: userResult.isNew ?? false,
      },
      requestId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[siws-verify][${requestId}] Error:`, error)

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
