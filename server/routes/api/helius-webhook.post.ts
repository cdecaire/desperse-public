/**
 * Helius Webhook API Route
 *
 * POST /api/helius-webhook
 *
 * Receives transaction confirmation webhooks from Helius.
 * Validates the authorization header before processing.
 *
 * Security: Webhook requests are authenticated using the authHeader
 * configured in Helius, which is sent as the Authorization header.
 */

import { defineEventHandler, readBody, getHeader, createError, type H3Event } from 'h3'
import { timingSafeEqual } from 'crypto'
import { env } from '@/config/env'
import {
  processHeliusWebhookCore,
  heliusWebhookSchema,
} from '@/server/utils/webhook-core'

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain consistent timing
    const dummy = Buffer.from(a)
    timingSafeEqual(dummy, dummy)
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    // 1. Verify webhook secret is configured
    const webhookSecret = env.HELIUS_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Helius Webhook] HELIUS_WEBHOOK_SECRET not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Webhook not configured',
      })
    }

    // 2. Get authorization header from request
    // Helius sends the authHeader value in the Authorization header
    const authHeader = getHeader(event, 'authorization')

    if (!authHeader) {
      console.warn('[Helius Webhook] Missing authorization header')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    // 3. Verify authorization header matches our secret
    // Use timing-safe comparison to prevent timing attacks
    if (!secureCompare(authHeader, webhookSecret)) {
      console.warn('[Helius Webhook] Invalid authorization header')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    // 4. Parse request body
    const rawBody = await readBody(event)

    if (!rawBody) {
      console.warn('[Helius Webhook] Missing request body')
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing body',
      })
    }

    // 5. Validate payload with Zod schema
    const parseResult = heliusWebhookSchema.safeParse(rawBody)
    if (!parseResult.success) {
      console.warn('[Helius Webhook] Invalid payload:', parseResult.error.message)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payload',
      })
    }

    const payload = parseResult.data

    // 6. Log webhook receipt (for debugging, remove sensitive data)
    const isArray = Array.isArray(payload)
    console.log('[Helius Webhook] Received valid webhook:', {
      format: isArray ? 'array' : 'object',
      eventCount: isArray ? payload.length : (payload.events?.length ?? (payload.signature ? 1 : 0)),
    })

    // 7. Process the webhook using core function
    const result = await processHeliusWebhookCore(payload)

    // 8. Return response
    return result
  } catch (error) {
    // Re-throw h3 errors (they have proper status codes)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Log unexpected errors
    console.error('[Helius Webhook] Unexpected error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
})
