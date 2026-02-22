/**
 * POST /api/v1/feedback
 * Create beta feedback
 */

import { defineEventHandler, readBody, getHeader, setResponseStatus } from 'h3'
import { createFeedbackDirect } from '@/server/utils/feedback'

export default defineEventHandler(async (event) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  try {
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const body = await readBody(event) as Record<string, any>

    const result = await createFeedbackDirect(
      {
        rating: body.rating,
        message: body.message,
        imageUrl: body.imageUrl,
        pageUrl: body.pageUrl,
        appVersion: body.appVersion,
        userAgent: body.userAgent,
      },
      token
    )

    if (!result.success) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: {
          code: 'FEEDBACK_FAILED',
          message: result.error || 'Failed to submit feedback',
        },
        requestId,
      }
    }

    return {
      success: true,
      data: {
        id: result.feedbackId,
      },
      requestId,
    }
  } catch (error) {
    console.error('Error in POST /api/v1/feedback:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      requestId,
    }
  }
})
