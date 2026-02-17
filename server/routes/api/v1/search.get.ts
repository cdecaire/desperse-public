/**
 * GET /api/v1/search
 * Search users and posts
 * Query params:
 *   - q: search query (required)
 *   - type: 'all' | 'users' | 'posts' (default: 'all')
 *   - limit: max results (default: 20, max: 50)
 */

import { defineEventHandler, getHeader, getQuery, setResponseStatus, setResponseHeader } from 'h3'
import { searchDirect } from '@/server/utils/explore'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`
  setResponseHeader(event, 'X-Request-Id', requestId)

  try {
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const query = getQuery(event)

    const searchQuery = query.q as string
    if (!searchQuery || searchQuery.trim().length === 0) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: { code: 'MISSING_QUERY', message: 'Search query is required' },
        requestId,
      }
    }

    if (searchQuery.length > 100) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: { code: 'QUERY_TOO_LONG', message: 'Search query must be 100 characters or less' },
        requestId,
      }
    }

    const type = (query.type as 'all' | 'users' | 'posts') || 'all'
    if (!['all', 'users', 'posts'].includes(type)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Type must be one of: all, users, posts' },
        requestId,
      }
    }

    const limit = query.limit ? Math.min(Math.max(parseInt(query.limit as string, 10), 1), 50) : 20

    const result = await searchDirect(searchQuery.trim(), type, token, limit)

    if (!result.success) {
      return {
        success: false,
        error: { code: 'SEARCH_FAILED', message: result.error },
        requestId,
      }
    }

    return {
      success: true,
      data: {
        users: result.users,
        posts: result.posts,
        query: result.query,
      },
      requestId,
    }
  } catch (error) {
    console.error('[search] Error:', error)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Search failed',
      },
      requestId,
    }
  }
})
