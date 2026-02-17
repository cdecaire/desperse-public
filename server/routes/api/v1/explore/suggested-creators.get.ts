/**
 * GET /api/v1/explore/suggested-creators
 * Returns suggested creators for the Explore page
 */

import { defineEventHandler, getHeader, getQuery, setResponseHeader } from 'h3'
import { getSuggestedCreatorsDirect } from '@/server/utils/explore'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`
  setResponseHeader(event, 'X-Request-Id', requestId)

  try {
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const query = getQuery(event)
    const limit = query.limit ? Math.min(Math.max(parseInt(query.limit as string, 10), 1), 20) : 8

    const result = await getSuggestedCreatorsDirect(token, limit)

    if (!result.success) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: result.error },
        requestId,
      }
    }

    return {
      success: true,
      data: {
        creators: result.creators,
      },
      requestId,
    }
  } catch (error) {
    console.error('[suggested-creators] Error:', error)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch suggested creators',
      },
      requestId,
    }
  }
})
