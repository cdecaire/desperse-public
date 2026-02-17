/**
 * GET /api/v1/explore/trending
 * Returns trending posts for the Explore page
 * Falls back to recent posts if not enough trending content
 */

import { defineEventHandler, getHeader, getQuery, setResponseHeader } from 'h3'
import { getTrendingPostsDirect } from '@/server/utils/explore'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`
  setResponseHeader(event, 'X-Request-Id', requestId)

  try {
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const query = getQuery(event)

    const offset = query.offset ? Math.max(parseInt(query.offset as string, 10), 0) : 0
    const limit = query.limit ? Math.min(Math.max(parseInt(query.limit as string, 10), 1), 50) : 20

    const result = await getTrendingPostsDirect(token, offset, limit)

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
        posts: result.posts,
        hasMore: result.hasMore,
        nextOffset: result.nextOffset,
        isFallback: result.isFallback,
        sectionTitle: result.sectionTitle,
      },
      requestId,
    }
  } catch (error) {
    console.error('[trending] Error:', error)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch trending posts',
      },
      requestId,
    }
  }
})
